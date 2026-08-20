import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { categoryTree, flattenTree } from "../../lib/content/categories.ts"
import {
  adapter,
  buildCifraInventorySnapshot,
  buildCifraProducts,
  parseCifraDecimal,
  parseCifraStock,
} from "./adapter.ts"
import { mapCifraCategory } from "./category-mapping.ts"
import type { CifraCatalogFeeds } from "./types.ts"

const FETCHED_AT = "2026-08-19T10:00:00.000Z"

function fixtureFeeds(): CifraCatalogFeeds {
  return {
    fetchedAt: FETCHED_AT,
    tariff: [
      {
        model: "10030-MA-L",
        rootmodel: "10030",
        name: "Bag Arona",
        description: "<p>Organic cotton bag</p>",
        parent_category: "Bags",
        category: "Bolsas de algodón",
        image: "https://www.publicatalogue.com/image/cache/data/10030-MA-500x500.jpg",
        images: [
          "https://www.publicatalogue.com/image/cache/data/details/10030-MA-01-500x500.jpg",
        ],
        quantity: "1.200",
        confidential_price: "2.90",
        multiples: 10,
        color: { id: "MA", name: "Marine", rgb_hex: "00008B" },
        weight: "0.130000",
        length: "53.00",
        width: "37.00",
        height: "0.00",
        unacaja: 50,
        units_per_pale: 2100,
        material: "100% ORGANIC COTTON 180G",
        tgrabacion: "F,DTF",
        mgrabacion: "200x300 mm",
        attributes: [{ id: "clothing_size", value: "L" }],
      },
      {
        model: "10030-NE-M",
        rootmodel: "10030",
        name: "Bag Arona",
        description: "Organic cotton bag",
        parent_category: "Bags",
        category: "Bolsas de algodón",
        image: "https://www.publicatalogue.com/image/cache/data/10030-NE-500x500.jpg",
        images: [],
        quantity: 3,
        confidential_price: "3.10",
        multiples: 10,
        color: { id: "NE", name: "Black", rgb_hex: "000000" },
        weight: "0.130000",
        length: "53.00",
        width: "37.00",
        height: "0.00",
        unacaja: 50,
        units_per_pale: 2100,
        material: "100% ORGANIC COTTON 180G",
        tgrabacion: "F,DTF",
        mgrabacion: "200x300 mm",
        attributes: [{ id: "clothing_size", value: "M" }],
      },
    ],
    prices: [
      {
        model: "10030-MA-L",
        rootmodel: "10030",
        p_disc: [
          { quantity: 500, price: "2.50" },
          { quantity: 1, price: "2.80" },
        ],
      },
      {
        model: "10030-NE-M",
        rootmodel: "10030",
        p_disc: [{ quantity: 1, price: "3.00" }],
      },
    ],
  }
}

test("Cifra transformation groups variants and preserves tariff detail", () => {
  const [product] = buildCifraProducts(fixtureFeeds())
  assert.ok(product)
  assert.equal(product.supplierId, "cifra")
  assert.equal(product.supplierSku, "10030")
  assert.equal(product.name, "Bag Arona")
  assert.equal(product.description, "Organic cotton bag")
  assert.equal(product.supplierPriceEur, 2.8)
  assert.equal(product.supplierPriceEurMax, 3)
  assert.equal(product.originalCurrency, "EUR")
  assert.equal(product.stock, 1203)
  assert.equal(product.moq, 10)
  assert.equal(product.weightGrams, 130)
  assert.deepEqual(product.colors, ["Black", "Marine"])
  assert.deepEqual(product.sizes, ["M", "L"])
  assert.deepEqual(product.supplierVariantIds, ["10030-MA-L", "10030-NE-M"])
  assert.deepEqual(
    product.variants?.map((variant) => ({
      id: variant.supplierVariantId,
      color: variant.colorName,
      hex: variant.colorHex,
      price: variant.priceEur,
      stock: variant.stock,
    })),
    [
      { id: "10030-MA-L", color: "Marine", hex: "#00008B", price: 2.8, stock: 1200 },
      { id: "10030-NE-M", color: "Black", hex: "#000000", price: 3, stock: 3 },
    ],
  )
  assert.deepEqual(product.images, [
    "https://www.publicatalogue.com/image/cache/data/10030-MA-500x500.jpg",
    "https://www.publicatalogue.com/image/cache/data/details/10030-MA-01-500x500.jpg",
    "https://www.publicatalogue.com/image/cache/data/10030-NE-500x500.jpg",
  ])
  assert.deepEqual(product.rawPersonalizationCodes, ["F", "DTF"])
  assert.deepEqual(product.supplierPersonalizations, [
    {
      code: "F",
      label: "Cifra decoration code F",
      labelRo: "Cod personalizare Cifra F",
      printSizes: ["200x300 mm"],
      recognized: true,
    },
    {
      code: "DTF",
      label: "Direct-to-film transfer",
      labelRo: "Transfer DTF",
      printSizes: ["200x300 mm"],
      recognized: true,
    },
  ])
  assert.equal(adapter.mapCategory(product), "bags/shopping-bags/cotton-and-canvas")
  assert.deepEqual(adapter.mapPersonalizations(product), ["pad-screen", "textile-transfer"])
  assert.ok(product.specifications?.some((spec) => spec.key === "dimensions"))
  assert.ok(product.specifications?.some((spec) => spec.key === "units-per-carton"))
})

test("Cifra inventory uses the first quantity tier and exact model bindings", () => {
  const snapshot = buildCifraInventorySnapshot(fixtureFeeds())
  assert.equal(snapshot.fetchedAt, FETCHED_AT)
  assert.deepEqual(snapshot.prices, new Map([
    ["10030-MA-L", 2.8],
    ["10030-NE-M", 3],
  ]))
  assert.deepEqual(snapshot.stock, new Map([
    ["10030-MA-L", 1200],
    ["10030-NE-M", 3],
  ]))
})

test("Cifra parsing handles API decimal and formatted stock values", () => {
  assert.equal(parseCifraDecimal("1.234,56"), 1234.56)
  assert.equal(parseCifraDecimal("12.50"), 12.5)
  assert.equal(parseCifraStock("+ 10.000"), 10000)
  assert.equal(parseCifraStock("1,200"), 1200)
})

test("Cifra category mapping covers supplier aliases and fails closed", () => {
  assert.equal(
    mapCifraCategory({ parentCategory: "Bags", category: "Bolsas de algodón" }),
    "bags/shopping-bags/cotton-and-canvas",
  )
  assert.equal(
    mapCifraCategory({ parentCategory: "", category: "", name: "WOODEN FAN SEVILLA" }),
    "lanyards-and-events/event-accessories/fans",
  )
  assert.equal(
    mapCifraCategory({ parentCategory: "Future", category: "Unknown" }),
    null,
  )
})

test("Cifra refuses an empty or dangerously incomplete quantity-price feed", () => {
  const empty = fixtureFeeds()
  empty.tariff = []
  assert.throws(() => buildCifraProducts(empty), /product tariff is empty/)

  const partial = fixtureFeeds()
  partial.prices = [partial.prices[0]!]
  assert.throws(
    () => buildCifraProducts(partial),
    /price coverage is unsafe: 1\/2 \(50\.0%\); required 90%/,
  )
})

test("Cifra merges supplier root aliases that differ only by a trailing separator", () => {
  const feeds = fixtureFeeds()
  feeds.tariff[0]!.rootmodel = "10030-"
  const [product] = buildCifraProducts(feeds)
  assert.ok(product)
  assert.equal(product.supplierSku, "10030")
  assert.equal(product.variantCount, 2)
})

test("Cifra taxonomy snapshot exhaustively maps every observed category to a product leaf", async () => {
  const contents = await readFile(new URL("./categories-seen.tsv", import.meta.url), "utf8")
  const [header, ...rows] = contents.trimEnd().split("\n")
  assert.equal(
    header,
    "parent_category\tcategory\tfallback_name\tmaster_count\tvariant_count\ttgv_leaf",
  )
  const productLeaves = new Set(
    flattenTree(categoryTree)
      .filter(({ node }) => !node.children?.length && node.contentType !== "project")
      .map(({ slugPath }) => slugPath),
  )
  let variants = 0
  for (const row of rows) {
    const [parentCategory, category, name, masterCount, variantCount, leaf] = row.split("\t")
    assert.ok(masterCount && variantCount && leaf, row)
    assert.equal(
      mapCifraCategory({ parentCategory, category, name }),
      leaf,
      row,
    )
    assert.equal(productLeaves.has(leaf), true, `${leaf} is not a TGV product leaf`)
    variants += Number(variantCount)
  }
  assert.equal(rows.length, 422)
  assert.equal(variants, 5_930)
})
