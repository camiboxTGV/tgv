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
  const product = f38Product() as CatalogProduct & { stock?: number }
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

async function fixtureRoot(products: CatalogProduct[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tgv-catalog-validation-"))
  const generated = join(root, "lib/content/generated")
  const productDir = join(generated, "products/apparel-and-wearables")
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
      suppliers: {
        macma: {
          ok: true,
          normalized: products.length,
          unknownPersonalizationCodes: [],
        },
      },
    }),
    "utf8",
  )
  await writeFile(
    join(generated, "last-sync.json"),
    JSON.stringify({
      ranAt: RAN_AT,
      totalProducts: products.length,
      suppliers: { macma: products.length },
    }),
    "utf8",
  )
  return root
}
