import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { RawProduct, SupplierAdapter } from "./adapter.ts"
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
