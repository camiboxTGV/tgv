import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { flattenTree, categoryTree } from "../../lib/content/categories.ts"
import {
  adapter,
  blueCollectionFamilyIdentity,
  buildBlueCollectionInventorySnapshot,
  buildBlueCollectionProducts,
} from "./adapter.ts"
import {
  blueCollectionCategoryMap,
  mapBlueCollectionCategory,
} from "./category-mapping.ts"
import type {
  BlueCollectionCatalogFeeds,
  BlueCollectionProduct,
} from "./types.ts"

const FETCHED_AT = "2026-09-29T12:00:00.000Z"
const TEST_SAFETY = {
  minimumRawProducts: 0,
  minimumStockEntries: 0,
  minimumMerchandiseVariants: 0,
  minimumPublishedProducts: 0,
  minimumMarkingNames: 0,
  minimumCoverage: 0.5,
} as const

function apiProduct(
  index: string,
  overrides: Partial<BlueCollectionProduct> = {},
): BlueCollectionProduct {
  return {
    id: Number(index.replace(/\D/g, "")) || 1,
    index,
    quantity: 99,
    active: true,
    catalogue: true,
    names: [
      { language: "pl", title: "Notes testowy" },
      { language: "en", title: "Test Notebook" },
    ],
    descriptions: [{ language: "en", text: "A useful test notebook." }],
    prices: [{ eur: "2.00", pln: "8.00" }],
    madeof: [],
    category: 1,
    subcategory: 80,
    additional_category: null,
    additional_subcategory: null,
    additional: [
      { item: "material_en", value: "recycled metal*" },
      { item: "color_code", value: "12" },
      { item: "unit_weight", value: "0.2000" },
      { item: "dimensions", value: "140 x 210 x 12" },
      { item: "qty_package", value: "24" },
      { item: "guarantee", value: "12" },
    ],
    marking_data: [
      {
        marking_place: [
          {
            code: "M01",
            marking_option: [
              {
                option_label: 1,
                option_code: "G1",
                option_info: "40.00 x 20.00 mm",
                max_colors: 0,
              },
            ],
          },
        ],
      },
    ],
    image: [{ url: `https://bluecollection.eu/assets/img/${index}.jpg` }],
    ...overrides,
  }
}

function fixtureFeeds(): BlueCollectionCatalogFeeds {
  const products = [
    apiProduct("12345-01"),
    apiProduct("12345-02", {
      prices: [{ eur: "3.00" }],
      additional: [
        { item: "material_en", value: "recycled metal*" },
        { item: "color_code", value: "13" },
        { item: "unit_weight", value: "3000.2720" },
        { item: "dimensions", value: "140 x 210 x 12" },
      ],
    }),
    apiProduct("12345-03A", {
      names: [{ language: "en", title: "Test Notebook - II quality" }],
      prices: [{ eur: "1.00" }],
      sale: true,
      end_of_series: true,
    }),
    apiProduct("99999-00", {
      quantity: 0,
      image: [],
    }),
    apiProduct("CATALOG-1", {
      category: 12,
      subcategory: 154,
      catalogue: false,
      names: [{ language: "pl", title: "Katalog" }],
      descriptions: [],
      image: [],
    }),
  ]
  return {
    fetchedAt: FETCHED_AT,
    products,
    stock: [
      { index: "12345-01", quantity: 5 },
      { index: "12345-02", quantity: 7 },
      { index: "12345-03A", quantity: 1 },
      { index: "99999-00", quantity: 0 },
      { index: "CATALOG-1", quantity: 0 },
    ],
    categories: [
      { id: 1, en: "Work and office", pl: "Biuro i praca" },
      { id: 12, en: null, pl: "Materiały promocyjne" },
    ],
    subcategories: [
      { id: 80, category: 1, en: "Notebooks", pl: "Notesy" },
      { id: 154, category: 12, en: null, pl: "Katalogi" },
    ],
    markingNames: [{ id: 1, name_en: "Laser engraving", name_pl: "Grawerowanie" }],
  }
}

test("Blue Collection transformation groups variants and isolates terminal quality markers", () => {
  const products = buildBlueCollectionProducts(fixtureFeeds(), TEST_SAFETY)

  assert.equal(products.length, 2)
  const regular = products.find((product) => product.supplierSku === "12345")
  const quality = products.find((product) => product.supplierSku === "12345A")
  assert.ok(regular)
  assert.ok(quality)
  assert.deepEqual(regular.supplierVariantIds, ["12345-01", "12345-02"])
  assert.equal(regular.supplierPriceEur, 2)
  assert.equal(regular.supplierPriceEurMax, 3)
  assert.equal(regular.stock, 12)
  assert.equal(regular.weightGrams, 200)
  assert.deepEqual(regular.colors, ["Black", "Blue"])
  assert.deepEqual(
    regular.variants?.map((variant) => ({
      id: variant.supplierVariantId,
      color: variant.colorName,
      price: variant.priceEur,
      stock: variant.stock,
    })),
    [
      { id: "12345-01", color: "Black", price: 2, stock: 5 },
      { id: "12345-02", color: "Blue", price: 3, stock: 7 },
    ],
  )
  assert.equal(adapter.mapCategory(regular), "office-and-writing/notebooks-and-planners/notebooks")
  assert.deepEqual(adapter.mapPersonalizations(regular), ["fiber-laser"])
  assert.deepEqual(regular.supplierPersonalizations, [
    {
      code: "G1",
      label: "Laser engraving",
      labelRo: "Gravură laser",
      printSizes: ["40.00 x 20.00 mm"],
      recognized: true,
    },
  ])
  assert.ok(regular.specifications?.some((specification) => specification.key === "dimensions"))
  assert.ok(regular.specifications?.some((specification) => specification.key === "materials"))
  assert.deepEqual(blueCollectionFamilyIdentity("09122-02S"), {
    key: "09122:S",
    supplierSku: "09122S",
    sourceCode: "09122-02S",
  })
  assert.deepEqual(blueCollectionFamilyIdentity("16262-05"), {
    key: "16262",
    supplierSku: "16262",
    sourceCode: "16262",
  })
  assert.deepEqual(blueCollectionFamilyIdentity("123456-05"), {
    key: "123456",
    supplierSku: "123456",
    sourceCode: "123456",
  })
})

test("Blue Collection excludes promotional records and only skips image-less zero-stock families", () => {
  const feeds = fixtureFeeds()
  const products = buildBlueCollectionProducts(feeds, TEST_SAFETY)
  assert.equal(products.some((product) => product.supplierSku.includes("CATALOG")), false)
  assert.equal(products.some((product) => product.supplierSku === "99999"), false)

  feeds.stock.find((entry) => entry.index === "99999-00")!.quantity = 2
  assert.throws(
    () => buildBlueCollectionProducts(feeds, TEST_SAFETY),
    /family 99999 is in stock but has no approved images/,
  )
})

test("Blue Collection category mapping applies reviewed overrides and fails closed", () => {
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 3,
      category: "Stationery and other",
      subcategoryId: 90,
      subcategory: "Metal pens",
      name: "ALTO touch pen",
    }),
    "office-and-writing/writing-instruments/stylus-pens",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 5,
      category: "Food and drinks",
      subcategoryId: 112,
      subcategory: "Bottles",
      name: "Vacuum bottle 500 ml",
    }),
    "drinkware/bottles/thermal-and-vacuum-flasks",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 9,
      category: "Bags and umbrellas",
      subcategoryId: 131,
      subcategory: "Shopping bags",
      name: "Tote bag",
      material: ["Organic cotton"],
    }),
    "bags/shopping-bags/cotton-and-canvas",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 99,
      category: "Future",
      subcategoryId: 999,
      subcategory: "Unknown",
    }),
    null,
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 12,
      category: "Promotional materials",
      subcategoryId: 154,
      subcategory: "Catalogues",
    }),
    null,
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 5,
      category: "Food and drinks",
      subcategoryId: 111,
      subcategory: "Sport bottles",
      name: "Thermal bottle MEKO 350 ml",
    }),
    "drinkware/bottles/thermal-and-vacuum-flasks",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 7,
      category: "Christmas offer",
      subcategoryId: 153,
      subcategory: "Christmas offer",
      name: "Set of pendants for scraping",
    }),
    "home-and-living/seasonal-and-event-items/christmas-decorations",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 8,
      category: "Sport and leisure",
      subcategoryId: 147,
      subcategory: "For animals",
      name: "Pet bottle MAX 500 ml",
    }),
    null,
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 8,
      category: "Sport and leisure",
      subcategoryId: 151,
      subcategory: "Home SPA",
      name: "Massager MASU",
    }),
    null,
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 11,
      category: "Technology",
      subcategoryId: 104,
      subcategory: "Lamps",
      name: "USB-C desk lamp YELLE",
    }),
    "office-and-writing/office-accessories/desk-accessories",
  )
  assert.equal(
    mapBlueCollectionCategory({
      categoryId: 11,
      category: "Technology",
      subcategoryId: 109,
      subcategory: "Accessories",
      name: "Battery AA",
    }),
    null,
  )
})

test("Blue Collection prefers structured capacity and normalizes title whitespace", () => {
  const feeds = fixtureFeeds()
  feeds.categories.push({ id: 11, en: "Technology" })
  feeds.subcategories.push({ id: 100, category: 11, en: "Power banks" })
  feeds.products = [
    apiProduct("45001", {
      category: 11,
      subcategory: 100,
      names: [{ language: "en", title: "Power bank 10 000 mAh\n POWER" }],
      additional: [
        { item: "material_en", value: "plastic" },
        { item: "capacity_mah", value: "10000" },
      ],
    }),
  ]
  feeds.stock = [{ index: "45001", quantity: 4 }]

  const [product] = buildBlueCollectionProducts(feeds, TEST_SAFETY)
  assert.ok(product)
  assert.equal(product.name, "Power bank 10 000 mAh POWER")
  assert.equal(product.capacity, "10000 mAh")
})

test("Blue Collection inventory uses exact variant prices and dedicated stock", () => {
  const feeds = fixtureFeeds()
  const snapshot = buildBlueCollectionInventorySnapshot(
    { products: feeds.products, stock: feeds.stock, fetchedAt: feeds.fetchedAt },
    TEST_SAFETY,
  )
  assert.equal(snapshot.fetchedAt, FETCHED_AT)
  assert.equal(snapshot.prices.get("12345-01"), 2)
  assert.equal(snapshot.prices.get("12345-02"), 3)
  assert.equal(snapshot.prices.has("CATALOG-1"), false)
  assert.equal(snapshot.stock.get("12345-01"), 5)
  assert.equal(snapshot.stock.get("12345-02"), 7)
})

test("Blue Collection quarantines tied family category tuples", () => {
  const feeds = fixtureFeeds()
  feeds.categories.push({ id: 3, en: "Stationery and other" })
  feeds.subcategories.push({ id: 90, category: 3, en: "Metal pens" })
  feeds.products = [
    apiProduct("54321-01"),
    apiProduct("54321-02", { category: 3, subcategory: 90 }),
  ]
  feeds.stock = feeds.products.map((product) => ({ index: product.index, quantity: 1 }))

  const [product] = buildBlueCollectionProducts(feeds, TEST_SAFETY)
  assert.ok(product)
  assert.equal(adapter.mapCategory(product), null)
})

test("Blue Collection taxonomy snapshot covers every reviewed tuple and valid product leaf", async () => {
  const contents = await readFile(new URL("./categories-seen.tsv", import.meta.url), "utf8")
  const [header, ...rows] = contents.trimEnd().split("\n")
  assert.equal(
    header,
    "category_id\tcategory\tsubcategory_id\tsubcategory\tvariant_count\ttgv_leaf",
  )
  const productLeaves = new Set(
    flattenTree(categoryTree)
      .filter(({ node }) => !node.children?.length && node.contentType !== "project")
      .map(({ slugPath }) => slugPath),
  )
  let observedVariants = 0
  for (const row of rows) {
    const [categoryId, category, subcategoryId, subcategory, variantCount, leaf] = row.split("\t")
    const key = `${categoryId}/${subcategoryId}`
    if (leaf === "EXCLUDE" || leaf === "UNMAPPED") {
      assert.equal(blueCollectionCategoryMap[key], null, row)
    } else {
      assert.equal(blueCollectionCategoryMap[key], leaf, row)
    }
    assert.equal(
      mapBlueCollectionCategory({
        categoryId: Number(categoryId),
        category,
        subcategoryId: Number(subcategoryId),
        subcategory,
      }),
      leaf === "EXCLUDE" || leaf === "UNMAPPED" ? null : leaf,
      row,
    )
    if (leaf !== "EXCLUDE" && leaf !== "UNMAPPED") {
      assert.equal(productLeaves.has(leaf), true, `${leaf} is not a leaf`)
    }
    observedVariants += Number(variantCount)
  }
  assert.equal(rows.length, 71)
  assert.equal(observedVariants, 1_917)
})
