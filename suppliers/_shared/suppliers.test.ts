import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { RawProduct, SupplierAdapter } from "./adapter.ts"
import {
  InventoryBootstrapRequiredError,
  runInventorySync,
} from "./inventory.ts"
import { runSync } from "./orchestrator.ts"
import {
  assertSupplierDefinitions,
  isSupplierImageUrlAllowed,
  supplierImageRemotePatterns,
} from "../suppliers.ts"

const CATEGORY_A = "bags/shopping-bags/cotton-and-canvas"
const CATEGORY_B = "drinkware/mugs-and-cups/ceramic-mugs"

function product(supplierId: "macma" | "fixtures", sku: string, category = CATEGORY_A): RawProduct {
  return {
    supplierId,
    supplierSku: sku,
    name: `${supplierId} ${sku}`,
    supplierCategory: category,
    supplierPriceEur: 10,
    originalCurrency: "EUR",
    stock: 10,
    images: supplierId === "macma" ? [`https://macma.ro/products/${sku}.jpg`] : [],
    fetchedAt: "2026-08-14T00:00:00.000Z",
  }
}

function adapter(
  id: "macma" | "fixtures",
  products: RawProduct[] | (() => Promise<RawProduct[]>),
): SupplierAdapter {
  return {
    id,
    displayName: id === "macma" ? "Macma" : "Fixtures (pipeline proof)",
    fetchAll: typeof products === "function" ? products : async () => products,
    mapCategory: (raw) => raw.supplierCategory,
    mapPersonalizations: () => [],
  }
}

async function withTempRepo(run: (repoRoot: string) => Promise<void>): Promise<void> {
  const repoRoot = await mkdtemp(join(tmpdir(), "tgv-suppliers-"))
  try {
    await run(repoRoot)
  } finally {
    await rm(repoRoot, { recursive: true, force: true })
  }
}

test("supplier definitions generate the same strict image allowlist used by Next.js", () => {
  assertSupplierDefinitions()
  assert.deepEqual(supplierImageRemotePatterns, [
    {
      protocol: "https",
      hostname: "macma.ro",
      port: "",
      pathname: "/products/**",
    },
  ])
  assert.equal(isSupplierImageUrlAllowed("macma", "https://macma.ro/products/a.jpg"), true)
  assert.equal(isSupplierImageUrlAllowed("macma", "http://macma.ro/products/a.jpg"), false)
  assert.equal(isSupplierImageUrlAllowed("macma", "https://other.test/products/a.jpg"), false)
  assert.equal(isSupplierImageUrlAllowed("macma", "https://macma.ro/private/a.jpg"), false)
})

test("a failed supplier cannot overwrite catalog data from healthy suppliers", async () => {
  await withTempRepo(async (repoRoot) => {
    const marker = join(repoRoot, "lib/content/generated/products/existing.json")
    await mkdir(join(repoRoot, "lib/content/generated/products"), { recursive: true })
    await writeFile(marker, "existing", "utf8")

    await assert.rejects(
      runSync({
        repoRoot,
        adapters: [
          adapter("macma", [product("macma", "OK")]),
          adapter("fixtures", async () => {
            throw new Error("supplier unavailable")
          }),
        ],
        skipImages: true,
      }),
      /Supplier sync failed; catalog data was not written.*fixtures: supplier unavailable/,
    )

    assert.equal(await readFile(marker, "utf8"), "existing")
  })
})

test("partial supplier writes are refused but partial dry-runs are allowed", async () => {
  await withTempRepo(async (repoRoot) => {
    let fetches = 0
    const macma = adapter("macma", async () => {
      fetches++
      return [product("macma", "A")]
    })

    await assert.rejects(
      runSync({ repoRoot, adapters: [macma], supplierFilter: "macma", skipImages: true }),
      /filtered supplier sync cannot write catalog files/,
    )
    assert.equal(fetches, 0)

    const report = await runSync({
      repoRoot,
      adapters: [macma],
      supplierFilter: "macma",
      skipImages: true,
      dryRun: true,
    })
    assert.equal(report.totalProducts, 1)
    assert.equal(fetches, 1)
  })
})

test("supplier image URLs and duplicate SKUs are validated before publishing", async () => {
  await withTempRepo(async (repoRoot) => {
    const invalid = product("macma", "DUP")
    invalid.images = ["https://unapproved.test/image.jpg"]

    await assert.rejects(
      runSync({ repoRoot, adapters: [adapter("macma", [invalid])], skipImages: true }),
      /unapproved image URL/,
    )

    await assert.rejects(
      runSync({
        repoRoot,
        adapters: [adapter("macma", [product("macma", "DUP"), product("macma", "DUP")])],
        skipImages: true,
      }),
      /duplicate SKU "DUP"/,
    )
  })
})

test("full syncs prune stale product files and guard supplier-level drops", async () => {
  await withTempRepo(async (repoRoot) => {
    const macmaA = product("macma", "A", CATEGORY_A)
    const macmaB = product("macma", "B", CATEGORY_B)
    const fixtures = product("fixtures", "F", CATEGORY_A)

    await runSync({
      repoRoot,
      adapters: [adapter("macma", [macmaA, macmaB]), adapter("fixtures", [fixtures])],
      skipImages: true,
      force: true,
    })

    const staleFile = join(repoRoot, `lib/content/generated/products/${CATEGORY_B}.json`)
    assert.match(await readFile(staleFile, "utf8"), /macma-b/)

    await assert.rejects(
      runSync({
        repoRoot,
        adapters: [adapter("macma", []), adapter("fixtures", [fixtures])],
        skipImages: true,
      }),
      /Catastrophic supplier drop for "macma"/,
    )

    await runSync({
      repoRoot,
      adapters: [adapter("macma", [macmaA]), adapter("fixtures", [fixtures])],
      skipImages: true,
      force: true,
    })
    await assert.rejects(readFile(staleFile, "utf8"), /ENOENT/)
  })
})

test("inventory sync updates only price and stock and becomes a no-op when unchanged", async () => {
  await withTempRepo(async (repoRoot) => {
    const grouped = product("macma", "GROUP", CATEGORY_A)
    grouped.supplierPriceEur = 10
    grouped.supplierPriceEurMax = 20
    grouped.stock = 25
    grouped.variantCount = 2
    grouped.supplierVariantIds = ["SKU-A", "SKU-B"]
    grouped.variants = [
      {
        supplierVariantId: "SKU-A",
        colorName: "Orange",
        priceEur: 10,
        stock: 10,
        images: grouped.images,
      },
      {
        supplierVariantId: "SKU-B",
        colorName: "Black",
        priceEur: 20,
        stock: 15,
        images: grouped.images,
      },
    ]

    await runSync({
      repoRoot,
      adapters: [adapter("macma", [grouped])],
      skipImages: true,
      force: true,
    })

    const fetchedAt = "2026-08-15T03:17:00.000Z"
    const inventoryAdapter: SupplierAdapter = {
      ...adapter("macma", []),
      fetchInventory: async () => ({
        fetchedAt,
        prices: new Map([
          ["SKU-A", 5],
          ["SKU-B", 25],
        ]),
        stock: new Map([
          ["SKU-A", 5],
          ["SKU-B", 0],
        ]),
      }),
    }

    const report = await runInventorySync({ repoRoot, adapters: [inventoryAdapter] })
    assert.equal(report.changedFiles, 2)
    assert.equal(report.suppliers.macma.productsUpdated, 1)
    assert.equal(report.suppliers.macma.variantsUpdated, 2)

    const productFile = join(repoRoot, `lib/content/generated/products/${CATEGORY_A}.json`)
    const products = JSON.parse(await readFile(productFile, "utf8")) as RawProduct[]
    const updated = products[0] as unknown as {
      name: string
      category: string
      images: string[]
      price: number
      priceFrom: boolean
      stockLevel: string
      fetchedAt: string
      supplierVariantIds: string[]
    }
    assert.equal(updated.name, "macma GROUP")
    assert.equal(updated.category, CATEGORY_A)
    assert.deepEqual(updated.images, grouped.images)
    assert.deepEqual(updated.supplierVariantIds, ["SKU-A", "SKU-B"])
    assert.equal(updated.price, 6.5)
    assert.equal(updated.priceFrom, true)
    assert.equal(updated.stockLevel, "low")
    assert.equal(updated.fetchedAt, fetchedAt)

    const variants = JSON.parse(
      await readFile(join(repoRoot, "lib/content/generated/variants/macma-group.json"), "utf8"),
    ) as Array<{ supplierVariantId: string; price: number; stock: number; stockLevel: string }>
    assert.deepEqual(
      variants
        .map((variant) => ({
          id: variant.supplierVariantId,
          price: variant.price,
          stock: variant.stock,
          stockLevel: variant.stockLevel,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      [
        { id: "SKU-A", price: 6.5, stock: 5, stockLevel: "low" },
        { id: "SKU-B", price: 32.5, stock: 0, stockLevel: "out-of-stock" },
      ],
    )

    const unchanged = await runInventorySync({ repoRoot, adapters: [inventoryAdapter] })
    assert.equal(unchanged.changedFiles, 0)
    assert.equal(unchanged.suppliers.macma.productsUpdated, 0)
    assert.equal(unchanged.suppliers.macma.variantsUpdated, 0)
  })
})

test("inventory sync requires bindings and rejects suspiciously incomplete feeds", async () => {
  await withTempRepo(async (repoRoot) => {
    await runSync({
      repoRoot,
      adapters: [adapter("macma", [product("macma", "LEGACY")])],
      skipImages: true,
      force: true,
    })

    const unboundInventory: SupplierAdapter = {
      ...adapter("macma", []),
      fetchInventory: async () => ({
        fetchedAt: "2026-08-15T03:17:00.000Z",
        prices: new Map([["LEGACY", 10]]),
        stock: new Map([["LEGACY", 10]]),
      }),
    }
    await assert.rejects(
      runInventorySync({ repoRoot, adapters: [unboundInventory] }),
      (error) => error instanceof InventoryBootstrapRequiredError,
    )

    const bound = product("macma", "BOUND")
    bound.supplierVariantIds = ["BOUND-A", "BOUND-B"]
    bound.variantCount = 2
    bound.supplierPriceEurMax = 12
    bound.variants = [
      { supplierVariantId: "BOUND-A", priceEur: 10, stock: 10 },
      { supplierVariantId: "BOUND-B", priceEur: 12, stock: 10 },
    ]
    await runSync({
      repoRoot,
      adapters: [adapter("macma", [bound])],
      skipImages: true,
      force: true,
    })

    const partialInventory: SupplierAdapter = {
      ...adapter("macma", []),
      fetchInventory: async () => ({
        fetchedAt: "2026-08-15T03:17:00.000Z",
        prices: new Map([["BOUND-A", 10]]),
        stock: new Map([["BOUND-A", 10]]),
      }),
    }
    await assert.rejects(
      runInventorySync({ repoRoot, adapters: [partialInventory] }),
      /inventory coverage is unsafe/,
    )
  })
})
