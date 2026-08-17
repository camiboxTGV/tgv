import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import test from "node:test"
import type { CatalogProduct } from "./catalog.ts"
import { validateGeneratedCatalog } from "./catalog-sync-validation.ts"

const NOW = new Date("2026-08-14T15:00:00.000Z")
const RAN_AT = "2026-08-14T14:59:00.000Z"

test("full catalog validation accepts exact F38 methods and matching reports", async () => {
  const root = await fixtureRoot([f38Product()])
  try {
    const result = await validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW })
    assert.deepEqual(result.f38Codes, ["DC", "DT", "DW", "S2"])
    assert.equal(result.macmaMethods, 4)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("full catalog validation rejects legacy Macma data before it can be published", async () => {
  const product = f38Product()
  product.personalizations = ["uv-print"]
  product.supplierPersonalizations = undefined
  const root = await fixtureRoot([product])
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /no exact Macma personalization data/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("inventory validation allows an older catalog until the next full bootstrap", async () => {
  const product = f38Product()
  product.supplierSku = "LEGACY"
  product.slug = "macma-legacy"
  product.supplierPersonalizations = undefined
  const root = await fixtureRoot([product])
  try {
    const result = await validateGeneratedCatalog({ repoRoot: root, mode: "inventory", now: NOW })
    assert.equal(result.products, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("catalog validation rejects products without a numeric stock total", async () => {
  const product: Partial<CatalogProduct> = f38Product()
  delete product.stock
  const root = await fixtureRoot([product as CatalogProduct])
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /invalid numeric stock/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("catalog validation rejects stock labels that disagree with the numeric total", async () => {
  const product = f38Product()
  product.stock = 0
  const root = await fixtureRoot([product])
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /stock level does not match/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("catalog validation rejects duplicate product specification keys", async () => {
  const product = f38Product()
  product.specifications = [
    { key: "materials", label: "Materials", value: "Cotton" },
    { key: "materials", label: "Materials", value: "Polyester" },
  ]
  const root = await fixtureRoot([product])
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /duplicate specification key/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("catalog validation rejects non-leaf and project categories", async () => {
  for (const category of [
    "bags",
    "bespoke-and-custom-fabrication/signage-display",
  ]) {
    const product = f38Product()
    product.category = category
    const root = await fixtureRoot([product])
    try {
      await assert.rejects(
        validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
        /is not an existing product leaf/,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test("full catalog validation reconciles every generated supplier", async () => {
  const root = await fixtureRoot([f38Product(), midoceanProduct()])
  try {
    const result = await validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW })
    assert.equal(result.products, 2)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("full catalog validation requires every generated supplier report to succeed", async () => {
  for (const options of [
    { omitReportSuppliers: ["midocean"] },
    { reportSupplierOverrides: { midocean: { ok: false } } },
  ]) {
    const root = await fixtureRoot([f38Product(), midoceanProduct()], options)
    try {
      await assert.rejects(
        validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
        /Supplier "midocean" is missing or unsuccessful/,
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
})

test("full catalog validation rejects per-supplier report count mismatches", async () => {
  const root = await fixtureRoot([f38Product(), midoceanProduct()], {
    reportSupplierOverrides: { midocean: { normalized: 0 } },
  })
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /Supplier "midocean" report total does not match generated products/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("full catalog validation rejects per-supplier last-sync count mismatches", async () => {
  const root = await fixtureRoot([f38Product(), midoceanProduct()], {
    lastSupplierOverrides: { midocean: 0 },
  })
  try {
    await assert.rejects(
      validateGeneratedCatalog({ repoRoot: root, mode: "full", now: NOW }),
      /Last-sync supplier "midocean" total does not match generated products/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

function f38Product(): CatalogProduct {
  return {
    slug: "macma-f38",
    name: "KIDS 65/35 POLO",
    category: "apparel-and-wearables/polo-shirts",
    summary: "Polo shirt",
    accent: "#000",
    personalizations: ["pad-screen", "textile-transfer"],
    supplierPersonalizations: [
      { code: "S2", label: "Transfer screen printing", printSizes: ["21 × 29 cm"] },
      { code: "DC", label: "Digital printing on coloured textiles", printSizes: ["21 × 29 cm"] },
      { code: "DT", label: "Digital transfer", printSizes: ["21 × 29 cm"] },
      { code: "DW", label: "Digital printing on white textiles", printSizes: ["21 × 29 cm"] },
    ],
    supplierId: "macma",
    supplierSku: "F38",
    price: 4.68,
    priceFrom: false,
    stock: 508,
    stockLevel: "in-stock",
    images: ["https://macma.ro/products/f38.jpg"],
    fetchedAt: RAN_AT,
    variantCount: 1,
    colorCount: 1,
    sizeCount: 1,
    hasVariantDetail: false,
  }
}

function midoceanProduct(): CatalogProduct {
  return {
    ...f38Product(),
    slug: "midocean-ar1249",
    name: "TARGET",
    supplierId: "midocean",
    supplierSku: "AR1249",
    personalizations: [],
    supplierPersonalizations: [],
    images: ["https://cdn1.midocean.com/image/700X700/ar1249-16.jpg"],
  }
}

interface SyncSupplierFixture {
  ok: boolean
  normalized: number
  unknownPersonalizationCodes?: { code: string; count: number }[]
}

interface FixtureOptions {
  omitReportSuppliers?: string[]
  reportSupplierOverrides?: Record<string, Partial<SyncSupplierFixture>>
  lastSupplierOverrides?: Record<string, number>
}

async function fixtureRoot(
  products: CatalogProduct[],
  options: FixtureOptions = {},
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tgv-catalog-validation-"))
  const generated = join(root, "lib/content/generated")
  const productDir = join(generated, "products/apparel-and-wearables")
  const supplierCounts = new Map<string, number>()
  for (const product of products) {
    supplierCounts.set(
      product.supplierId,
      (supplierCounts.get(product.supplierId) ?? 0) + 1,
    )
  }
  const reportSuppliers: Record<string, SyncSupplierFixture> = Object.fromEntries(
    [...supplierCounts].map(([supplierId, normalized]) => [
      supplierId,
      { ok: true, normalized, unknownPersonalizationCodes: [] },
    ]),
  )
  for (const [supplierId, override] of Object.entries(
    options.reportSupplierOverrides ?? {},
  )) {
    reportSuppliers[supplierId] = {
      ...(reportSuppliers[supplierId] ?? { ok: true, normalized: 0 }),
      ...override,
    }
  }
  for (const supplierId of options.omitReportSuppliers ?? []) {
    delete reportSuppliers[supplierId]
  }
  const lastSuppliers: Record<string, number> = Object.fromEntries(supplierCounts)
  Object.assign(lastSuppliers, options.lastSupplierOverrides)

  await mkdir(productDir, { recursive: true })
  await writeFile(join(productDir, "polo-shirts.json"), JSON.stringify(products), "utf8")
  await writeFile(
    join(generated, "index.json"),
    JSON.stringify({ generatedAt: RAN_AT, counts: { "apparel-and-wearables/polo-shirts": products.length } }),
    "utf8",
  )
  await writeFile(
    join(generated, "sync-report.json"),
    JSON.stringify({
      ranAt: RAN_AT,
      success: true,
      totalProducts: products.length,
      suppliers: reportSuppliers,
    }),
    "utf8",
  )
  await writeFile(
    join(generated, "last-sync.json"),
    JSON.stringify({
      ranAt: RAN_AT,
      totalProducts: products.length,
      suppliers: lastSuppliers,
    }),
    "utf8",
  )
  return root
}
