import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { categoryTree, flattenTree } from "../../lib/content/categories.ts"
import {
  MIDOCEAN_CATEGORY_MAP,
  mapMidoceanCategory,
  midoceanCategoryKey,
} from "./category-mapping.ts"
import {
  adapter,
  buildMidoceanInventorySnapshot,
  buildMidoceanProducts,
  parseMidoceanDecimal,
} from "./adapter.ts"
import type {
  MidoceanCatalogFeeds,
  MidoceanInventoryFeeds,
  MidoceanProduct,
  MidoceanVariant,
} from "./types.ts"

const FETCHED_AT = "2026-08-15T10:00:00.000Z"
const CATEGORY = {
  category_level1: "Technology",
  category_level2: "Power banks",
  category_level3: "Low capacity ≥2.000",
} as const

function fixtureVariant(
  overrides: Partial<MidoceanVariant> & Pick<MidoceanVariant, "variant_id" | "sku">,
): MidoceanVariant {
  return {
    ...CATEGORY,
    product_proposition_category: "Technology",
    color_description: "Red",
    color_group: "Red",
    plc_status: "A",
    plc_status_description: "Active",
    color_code: "05",
    ...overrides,
  }
}

function fixtureProduct(variants: MidoceanVariant[]): MidoceanProduct {
  return {
    master_code: "MO-FIXTURE",
    master_id: "101",
    type_of_products: "stock",
    country_of_origin: "CN",
    brand: "midocean",
    product_name: "Alias power bank",
    category_code: "MOBOFF_POW",
    product_class: "Powerbanks",
    short_description: "Compact metal power bank",
    long_description: "Fixture product used without network access.",
    dimensions: "10 × 5 × 2 cm",
    material: "Stainless steel",
    liquid_volume: "500",
    liquid_volume_unit: "ml",
    net_weight: "0,125",
    net_weight_unit: "kg",
    commodity_code: "85076000",
    inner_carton_quantity: "10",
    outer_carton_quantity: "40",
    packaging_after_printing: "Paper sleeve",
    printable: "yes",
    timestamp: FETCHED_AT,
    variants,
  }
}

function fixtureCatalogFeeds(): MidoceanCatalogFeeds {
  const red = fixtureVariant({
    variant_id: "VAR-RED",
    sku: "RAW-RED",
    size_textile: "L",
    digital_assets: [
      {
        type: "image",
        subtype: "item_picture_front",
        url: "https://cdn1.midocean.com/image/700X700/mo-fixture-red.jpg",
      },
      {
        type: "image",
        subtype: "item_picture_detail",
        url: "https://cdn1.midocean.com/image/700X700/mo-fixture-detail.jpg",
      },
      {
        type: "image",
        subtype: "item_picture_detail",
        url: "http://cdn1.midocean.com/image/unsafe.jpg",
      },
    ],
  })
  const blue = fixtureVariant({
    variant_id: "VAR-BLUE",
    sku: "RAW-BLUE",
    color_description: "Blue",
    color_group: "Blue",
    color_code: "04",
    size_textile: "S",
    digital_assets: [
      {
        type: "image",
        subtype: "item_picture_front",
        url: "https://cdn1.midocean.com/image/700X700/mo-fixture-blue.jpg",
      },
    ],
  })

  return {
    products: [fixtureProduct([red, blue])],
    pricelist: {
      currency: "EUR",
      date: "2026-08-15",
      price: [
        {
          sku: "BOUND-RED",
          variant_id: "VAR-RED",
          price: "12,50",
          valid_until: "2026-12-31",
        },
        {
          sku: "RAW-BLUE",
          variant_id: "VAR-BLUE",
          price: "15,75",
          valid_until: "2026-12-31",
        },
      ],
    },
    stock: {
      modified_at: FETCHED_AT,
      stock: [
        { sku: "BOUND-RED", qty: 7 },
        { sku: "RAW-BLUE", qty: 3 },
      ],
    },
    printdata: {
      printing_technique_descriptions: [
        { id: "L2", name: [{ en: "Laser engraving", ro: "Gravură laser" }] },
        { id: "P2", name: [{ en: "Pad printing", ro: "Tampografie" }] },
      ],
      products: [
        {
          master_code: "MO-FIXTURE",
          master_id: "101",
          item_color_numbers: ["04", "05"],
          print_manipulation: null,
          print_template: "fixture.pdf",
          printing_positions: [
            {
              position_id: "FRONT",
              print_size_unit: "mm",
              max_print_size_height: 20,
              max_print_size_width: 30,
              rotation: 0,
              print_position_type: "front",
              printing_techniques: [
                { default: true, id: "L2", max_colours: "1" },
                { default: false, id: "P2", max_colours: "4" },
                { default: false, id: "X9", max_colours: "1" },
              ],
              points: [],
              images: [],
              category: "Technology",
            },
          ],
        },
      ],
    },
    fetchedAt: FETCHED_AT,
  }
}

test("midocean category tuples normalize exactly and unknown values fail closed", () => {
  assert.equal(
    mapMidoceanCategory("  technology ", " POWER BANKS ", " low capacity ≥2.000 "),
    "electronics/power-and-charging/power-banks",
  )
  assert.equal(
    mapMidoceanCategory({
      categoryLevel1: "Bags & travel",
      categoryLevel2: "Drawstring bags",
    }),
    "bags/backpacks/drawstring-bags",
  )
  assert.throws(
    () => mapMidoceanCategory("Technology", "Future category", "Unreviewed"),
    /Unknown MidOcean category tuple/,
  )
})

test("midocean decimal parsing accepts EU feed values without changing decimal points", () => {
  assert.equal(parseMidoceanDecimal("1.234,56"), 1234.56)
  assert.equal(parseMidoceanDecimal(" 1 234,50 "), 1234.5)
  assert.equal(parseMidoceanDecimal("12,50"), 12.5)
  assert.equal(parseMidoceanDecimal("12.50"), 12.5)
  assert.equal(Number.isNaN(parseMidoceanDecimal("")), true)
  assert.equal(Number.isNaN(parseMidoceanDecimal(null)), true)
})

test("midocean transformation preserves alias bindings, identity, media, and methods", () => {
  const [product] = buildMidoceanProducts(fixtureCatalogFeeds())
  assert.ok(product)

  assert.equal(product.supplierId, "midocean")
  assert.equal(product.supplierSku, "MO-FIXTURE")
  assert.equal(product.name, "Alias power bank")
  assert.equal(product.supplierPriceEur, 12.5)
  assert.equal(product.supplierPriceEurMax, 15.75)
  assert.equal(product.originalCurrency, "EUR")
  assert.equal(product.stock, 10)
  assert.equal(product.variantCount, 2)
  assert.deepEqual(product.supplierVariantIds, ["BOUND-RED", "RAW-BLUE"])
  assert.deepEqual(
    product.variants?.map((variant) => ({
      id: variant.supplierVariantId,
      price: variant.priceEur,
      stock: variant.stock,
    })),
    [
      { id: "BOUND-RED", price: 12.5, stock: 7 },
      { id: "RAW-BLUE", price: 15.75, stock: 3 },
    ],
  )
  assert.deepEqual(product.colors, ["Blue", "Red"])
  assert.deepEqual(product.sizes, ["S", "L"])
  assert.deepEqual(product.material, ["Stainless steel"])
  assert.equal(product.capacity, "500 ml")
  assert.equal(product.weightGrams, 125)
  assert.deepEqual(product.attributes, {
    masterId: "101",
    size: "10 × 5 × 2 cm",
    material: "Stainless steel",
  })
  assert.deepEqual(product.images, [
    "https://cdn1.midocean.com/image/700X700/mo-fixture-red.jpg",
    "https://cdn1.midocean.com/image/700X700/mo-fixture-blue.jpg",
    "https://cdn1.midocean.com/image/700X700/mo-fixture-detail.jpg",
  ])
  assert.equal(
    adapter.mapCategory(product),
    "electronics/power-and-charging/power-banks",
  )
  assert.deepEqual(product.rawPersonalizationCodes, ["L2", "P2", "X9"])
  assert.deepEqual(product.supplierPersonalizations, [
    {
      code: "L2",
      label: "Laser engraving",
      labelRo: "Gravură laser",
      printSizes: ["30 × 20 mm"],
      recognized: true,
    },
    {
      code: "P2",
      label: "Pad printing",
      labelRo: "Tampografie",
      printSizes: ["30 × 20 mm"],
      recognized: true,
    },
    {
      code: "X9",
      label: "midocean method X9",
      printSizes: ["30 × 20 mm"],
      recognized: false,
    },
  ])
  assert.deepEqual(adapter.mapPersonalizations(product), ["fiber-laser", "pad-screen"])
})

test("midocean inventory keeps supplier price aliases and stock keys intact", () => {
  const catalog = fixtureCatalogFeeds()
  const feeds: MidoceanInventoryFeeds = {
    pricelist: catalog.pricelist,
    stock: catalog.stock,
    fetchedAt: catalog.fetchedAt,
  }
  const snapshot = buildMidoceanInventorySnapshot(feeds)

  assert.equal(snapshot.fetchedAt, FETCHED_AT)
  assert.deepEqual(snapshot.prices, new Map([
    ["BOUND-RED", 12.5],
    ["RAW-BLUE", 15.75],
  ]))
  assert.deepEqual(snapshot.stock, new Map([
    ["BOUND-RED", 7],
    ["RAW-BLUE", 3],
  ]))
})

test("midocean refuses an empty or dangerously incomplete first catalog price feed", () => {
  const feeds = fixtureCatalogFeeds()
  feeds.pricelist.price = []
  assert.throws(
    () => buildMidoceanProducts(feeds),
    /catalog price coverage is unsafe: 0\/2 \(0\.0%\); required 90%/,
  )

  const emptyFeeds = fixtureCatalogFeeds()
  emptyFeeds.products = []
  assert.throws(
    () => buildMidoceanProducts(emptyFeeds),
    /product feed is empty/,
  )
})

test("midocean taxonomy TSV exhaustively matches the fail-closed product-leaf map", async () => {
  const contents = await readFile(new URL("./categories-seen.tsv", import.meta.url), "utf8")
  const [header, ...rows] = contents.trimEnd().split("\n")
  assert.equal(
    header,
    "category_level1\tcategory_level2\tcategory_level3\tmaster_count\tvariant_count\ttgv_leaf",
  )

  const productLeaves = new Set(
    flattenTree(categoryTree)
      .filter(({ node }) => !node.children?.length && node.contentType !== "project")
      .map(({ slugPath }) => slugPath),
  )
  const seenKeys = new Set<string>()
  let variants = 0
  for (const row of rows) {
    const [level1, level2, level3, masterCount, variantCount, leaf] = row.split("\t")
    assert.ok(level1 && level2 && masterCount && variantCount && leaf, row)
    const key = midoceanCategoryKey(level1, level2, level3)
    assert.equal(MIDOCEAN_CATEGORY_MAP[key], leaf, row)
    assert.equal(productLeaves.has(leaf), true, `${leaf} is not a TGV product leaf`)
    assert.equal(seenKeys.has(key), false, `duplicate category tuple ${key}`)
    seenKeys.add(key)
    variants += Number(variantCount)
  }

  assert.equal(rows.length, 240)
  assert.equal(variants, 15_290)
  assert.deepEqual(seenKeys, new Set(Object.keys(MIDOCEAN_CATEGORY_MAP)))
})
