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
import { normalize } from "./normalize.ts"
import {
  describeMacmaPersonalizations,
  macmaPersonalizationDefinitions,
  personalizationMap,
} from "../macma/mapping.ts"
import {
  macmaProductSpecifications,
  totalAvailableStock,
} from "../macma/adapter.ts"

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
    {
      protocol: "https",
      hostname: "cdn1.midocean.com",
      port: "",
      pathname: "/image/**",
    },
  ])
  assert.equal(isSupplierImageUrlAllowed("macma", "https://macma.ro/products/a.jpg"), true)
  assert.equal(isSupplierImageUrlAllowed("macma", "http://macma.ro/products/a.jpg"), false)
  assert.equal(isSupplierImageUrlAllowed("macma", "https://other.test/products/a.jpg"), false)
  assert.equal(isSupplierImageUrlAllowed("macma", "https://macma.ro/private/a.jpg"), false)
  assert.equal(
    isSupplierImageUrlAllowed(
      "midocean",
      "https://cdn1.midocean.com/image/700X700/ar1249-16.jpg",
    ),
    true,
  )
  assert.equal(
    isSupplierImageUrlAllowed(
      "midocean",
      "https://cdn1.midocean.com/document/ar1249-green.pdf",
    ),
    false,
  )
})

test("Macma Romania codes keep exact supplier methods separate from calculator families", () => {
  assert.deepEqual(personalizationMap.UV, ["uv-print"])
  assert.deepEqual(personalizationMap["UV-PL"], ["uv-print"])
  assert.deepEqual(personalizationMap.S1, ["pad-screen"])
  assert.deepEqual(personalizationMap.S2, ["pad-screen"])
  assert.deepEqual(personalizationMap.T1, ["pad-screen"])
  assert.deepEqual(personalizationMap.T2, ["pad-screen"])
  assert.deepEqual(personalizationMap.T3, ["pad-screen"])
  assert.deepEqual(personalizationMap.T4, ["pad-screen"])
  assert.deepEqual(personalizationMap.DT, ["textile-transfer"])
  assert.deepEqual(personalizationMap.DC, [])
  assert.deepEqual(personalizationMap.DW, [])
  assert.equal(macmaPersonalizationDefinitions.DC?.labelRo, "Imprimare digitală pe textile colorate")
  assert.equal(macmaPersonalizationDefinitions.DW?.labelRo, "Imprimare digitală pe textile albe")
})

test("Macma stock totals central, regional, and international availability", () => {
  assert.equal(
    totalAvailableStock({
      id: "2110003",
      name: "Office golf set",
      local: 64,
      regional: 0,
      international: 444,
    }),
    508,
  )
  assert.equal(
    totalAvailableStock({
      id: "REGIONAL",
      name: "Regional stock",
      local: 1,
      regional: 7,
      international: 2,
    }),
    10,
  )
})

test("Macma characteristics preserve physical dimensions and logistics data", () => {
  const specifications = macmaProductSpecifications(
    [
      {
        id: "2110003",
        catalogcode: "21100",
        name: "Office golf set",
        size: "31 × 4,8 × 14,2 cm",
        origin: "CN",
        tariff: "95063990",
        innercarton: 20,
        exportcarton: 20,
      },
    ],
    ["PLASTIC", "WOOD"],
  )

  assert.deepEqual(specifications, [
    {
      key: "dimensions",
      label: "Dimensions",
      labelRo: "Dimensiuni",
      value: "31 × 4,8 × 14,2 cm",
    },
    {
      key: "materials",
      label: "Materials",
      labelRo: "Materiale",
      value: "Plastic, Wood",
    },
    {
      key: "country-of-origin",
      label: "Country of origin",
      labelRo: "Țara de origine",
      value: "CN",
    },
    {
      key: "customs-tariff",
      label: "Customs tariff code",
      labelRo: "Cod tarifar vamal",
      value: "95063990",
    },
    {
      key: "inner-carton",
      label: "Inner carton",
      labelRo: "Cutie interioară",
      value: "20 pcs",
      valueRo: "20 buc.",
    },
    {
      key: "export-carton",
      label: "Export carton",
      labelRo: "Cutie export",
      value: "20 pcs",
      valueRo: "20 buc.",
    },
  ])
})

test("Macma F38 methods and print size survive normalization without becoming UV", () => {
  const raw = product("macma", "F38", "apparel-and-wearables/polo-shirts")
  raw.rawPersonalizationCodes = ["S2", "DC", "DT", "DW"]
  raw.sizes = ["3/4", "5/6"]
  raw.specifications = [
    { key: "materials", label: "Materials", labelRo: "Materiale", value: "Cotton" },
  ]
  const sizes = new Map(
    raw.rawPersonalizationCodes.map((code) => [code, new Set(["21 × 29"])]),
  )
  raw.supplierPersonalizations = describeMacmaPersonalizations(
    raw.rawPersonalizationCodes,
    sizes,
  )
  const macma: SupplierAdapter = {
    id: "macma",
    displayName: "Macma",
    fetchAll: async () => [raw],
    mapCategory: (item) => item.supplierCategory,
    mapPersonalizations: (item) =>
      (item.rawPersonalizationCodes ?? []).flatMap(
        (code) => personalizationMap[code] ?? [],
      ),
  }
  const result = normalize(raw, macma)
  assert.equal(result.product?.stock, 10)
  assert.deepEqual(result.product?.availableSizes, ["3/4", "5/6"])
  assert.deepEqual(result.product?.specifications, raw.specifications)
  assert.deepEqual(result.product?.personalizations, ["pad-screen", "textile-transfer"])
  assert.deepEqual(
    result.product?.supplierPersonalizations?.map((method) => method.code),
    ["S2", "DC", "DT", "DW"],
  )
  assert.equal(result.product?.supplierPersonalizations?.[1]?.label, "Digital printing on coloured textiles")
  assert.deepEqual(result.product?.supplierPersonalizations?.[1]?.printSizes, ["21 × 29"])
  assert.equal(result.product?.personalizations.includes("uv-print"), false)
  assert.deepEqual(result.unknownPersonalizationCodes, [])
})

test("unknown supplier method codes remain visible and enter the sync report", async () => {
  await withTempRepo(async (repoRoot) => {
    const raw = product("macma", "UNKNOWN-METHOD")
    raw.rawPersonalizationCodes = ["X9"]
    raw.supplierPersonalizations = describeMacmaPersonalizations(
      raw.rawPersonalizationCodes,
      new Map(),
    )
    const report = await runSync({
      repoRoot,
      adapters: [adapter("macma", [raw])],
      skipImages: true,
      force: true,
    })
    assert.deepEqual(report.suppliers.macma?.unknownPersonalizationCodes, [
      { code: "X9", count: 1 },
    ])
    const generated = JSON.parse(
      await readFile(
        join(repoRoot, `lib/content/generated/products/${CATEGORY_A}.json`),
        "utf8",
      ),
    ) as Array<{ supplierPersonalizations?: Array<{ code: string; label: string }> }>
    assert.deepEqual(generated[0]?.supplierPersonalizations, [
      {
        code: "X9",
        label: "Macma method X9",
        labelRo: "Metodă Macma X9",
        printSizes: [],
      },
    ])
  })
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
      stock: number
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
    assert.equal(updated.stock, 5)
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
