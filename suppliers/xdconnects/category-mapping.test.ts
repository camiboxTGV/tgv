import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { categoryTree, flattenTree } from "../../lib/content/categories.ts"
import {
  XD_CONNECTS_CATEGORY_MAP,
  decodeXdConnectsCategory,
  encodeXdConnectsCategory,
  mapXdConnectsCategory,
  xdConnectsCategoryLookupKey,
} from "./category-mapping.ts"

test("XD Connects category tuples preserve trimmed supplier labels and round-trip", () => {
  const encoded = encodeXdConnectsCategory({
    mainCategory: "  Bags &  Travel  ",
    subCategory: "  Travel Accessories  ",
  })

  assert.equal(
    encoded,
    '{"mainCategory":"Bags &  Travel","subCategory":"Travel Accessories"}',
  )
  assert.deepEqual(decodeXdConnectsCategory(encoded), {
    mainCategory: "Bags &  Travel",
    subCategory: "Travel Accessories",
  })
  assert.equal(
    encodeXdConnectsCategory(" Audio ", " True wireless "),
    '{"mainCategory":"Audio","subCategory":"True wireless"}',
  )
  assert.throws(
    () => decodeXdConnectsCategory("not-json"),
    /xdconnects product has an invalid category tuple/,
  )
  assert.throws(
    () => decodeXdConnectsCategory('{"mainCategory":"Audio"}'),
    /xdconnects product has an invalid category tuple/,
  )
})

test("all 124 observed XD Connects category pairs map to current product leaves", async () => {
  const tsv = await readFile(new URL("./categories-seen.tsv", import.meta.url), "utf8")
  const [header, ...rows] = tsv.trimEnd().split("\n")
  assert.equal(header, "main_category\tsub_category\tsku_count\tmodel_count\ttgv_leaf")
  assert.equal(rows.length, 124)
  assert.equal(Object.keys(XD_CONNECTS_CATEGORY_MAP).length, 124)

  const validLeaves = new Set(
    flattenTree(categoryTree)
      .filter(({ node }) => !node.children?.length && node.contentType !== "project")
      .map(({ slugPath }) => slugPath),
  )
  const seenKeys = new Set<string>()
  const refinedOnly = new Set([
    xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Mobile Gadgets"),
    xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Post-PC accessories"),
    xdConnectsCategoryLookupKey("Home & Living", "Wellness &Personal care"),
    xdConnectsCategoryLookupKey("Bags & Travel", "Carry shopping bags"),
    xdConnectsCategoryLookupKey("Bags & Travel", "Carry beach bags"),
    xdConnectsCategoryLookupKey("Bags & Travel", "Crossbody bags"),
    xdConnectsCategoryLookupKey("Home & Living", "Bathrobes"),
    xdConnectsCategoryLookupKey("Home & Living", "Table accessories"),
    xdConnectsCategoryLookupKey("Phone & Tablet accessories", "Hubs"),
    xdConnectsCategoryLookupKey("Tools & Torches", "Rulers & cutters"),
    xdConnectsCategoryLookupKey("Tools & Torches", "Tool sets"),
  ])
  let totalSkus = 0
  let totalModels = 0
  for (const [index, row] of rows.entries()) {
    const fields = row.split("\t")
    assert.equal(fields.length, 5, `row ${index + 2} must have five TSV fields`)
    const [mainCategory, subCategory, skuCount, modelCount, expectedLeaf] = fields
    assert.ok(mainCategory)
    assert.ok(subCategory)
    assert.ok(expectedLeaf)
    assert.ok(Number(skuCount) > 0)
    assert.ok(Number(modelCount) > 0)
    assert.ok(validLeaves.has(expectedLeaf), `${expectedLeaf} is not a current category leaf`)
    const key = xdConnectsCategoryLookupKey(mainCategory, subCategory)
    assert.equal(seenKeys.has(key), false, `duplicate supplier category ${mainCategory} / ${subCategory}`)
    assert.equal(XD_CONNECTS_CATEGORY_MAP[key], expectedLeaf)
    seenKeys.add(key)
    totalSkus += Number(skuCount)
    totalModels += Number(modelCount)
    assert.equal(
      mapXdConnectsCategory({ mainCategory, subCategory }),
      refinedOnly.has(key) ? null : expectedLeaf,
      `${mainCategory} / ${subCategory}`,
    )
  }
  assert.equal(totalSkus, 6_488)
  assert.equal(totalModels, 1_432)
  assert.deepEqual([...seenKeys].sort(), Object.keys(XD_CONNECTS_CATEGORY_MAP).sort())
})

test("XD Connects lookup normalizes only Unicode, case, and whitespace and fails closed", () => {
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "  BAGS & TRAVEL ",
      subCategory: " travel   accessories ",
    }),
    "accommodation-and-travel/travel-accessories",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Ｕｍｂｒｅｌｌａｓ",
      subCategory: "Ｆｏｌｄａｂｌｅ ｕｍｂｒｅｌｌａｓ",
    }),
    "umbrellas-and-rainwear/umbrellas/folding-umbrellas",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Bags & Travel",
      subCategory: "Travel Accessory",
    }),
    null,
  )
  assert.equal(mapXdConnectsCategory({ mainCategory: "Audio", subCategory: "" }), null)
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Future category",
      subCategory: "Future subcategory",
      name: "Wireless charger power bank",
    }),
    null,
  )
})

test("XD Connects reviewed name and material refinements split ambiguous supplier categories", () => {
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Bags & Travel",
      subCategory: "Carry shopping bags",
      name: "Recycled tote",
      material: ["100% recycled PET"],
    }),
    "bags/shopping-bags/rpet-and-recycled-bags",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Drinkware",
      subCategory: "Coffee mugs & tumblers",
      name: "Porcelain coffee mug",
    }),
    "drinkware/mugs-and-cups/ceramic-mugs",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Car & Safety",
      subCategory: "Car accessories",
      name: "Magnetic car phone holder",
    }),
    "tools-and-keyrings/car-accessories/car-phone-holders",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Home & Living",
      subCategory: "Kitchen accessories",
      name: "Bamboo cutting board",
    }),
    "home-and-living/kitchen-and-dining/cutting-boards",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Home & Living",
      subCategory: "Wellness &Personal care",
      name: "Pocket mirror",
    }),
    "home-and-living/personal-care-and-wellness/mirrors",
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Tools & Torches",
      subCategory: "Rulers & cutters",
      name: "30 cm recycled ruler",
    }),
    null,
  )

  const reviewedModels = [
    [
      "Phone & Tablet accessories",
      "Post-PC accessories",
      "Terra Magnetic RCS rplastic magnetic phone holder with ring",
      "electronics/computer-and-mobile-accessories/phone-holders-and-stands",
    ],
    [
      "Phone & Tablet accessories",
      "Post-PC accessories",
      "CarryLoop RCS recycled PET adjustable phone holder lanyard",
      "lanyards-and-events/lanyards",
    ],
    [
      "Phone & Tablet accessories",
      "Mobile Gadgets",
      "Nordic Drift Titan Portable Air pump camping light",
      "outdoor-and-leisure/outdoor-gear/camping-gear",
    ],
    [
      "Phone & Tablet accessories",
      "Mobile Gadgets",
      "Swiss Peak 5-in-1 luggage scale powerbank torch",
      "accommodation-and-travel/travel-accessories",
    ],
    [
      "Phone & Tablet accessories",
      "Mobile Gadgets",
      "Cliq it RCS recycled Keychain Camera",
      "tools-and-keyrings/keyrings/multifunctional-keyrings",
    ],
    [
      "Phone & Tablet accessories",
      "Mobile Gadgets",
      "Safio RCS re-chargeable emergency alarm with SOS function",
      "tools-and-keyrings/keyrings/smart-key-finders",
    ],
    [
      "Home & Living",
      "Wellness &Personal care",
      "Revix RCS recycled plastic massage gun",
      "outdoor-and-leisure/sports-and-fitness/fitness-and-yoga-accessories",
    ],
    [
      "Home & Living",
      "Wellness &Personal care",
      "TrimBlade re-chargeable Travel Shaver IPX7",
      "accommodation-and-travel/travel-accessories",
    ],
    [
      "Drinkware",
      "Drinkware sets",
      "Double wall borosilicate glass with bamboo lid 350ml 2pc set",
      "drinkware/mugs-and-cups/glass-mugs",
    ],
    [
      "Tools & Torches",
      "Table lamp",
      "VINGA Narni RCS recycled ABS lantern",
      "outdoor-and-leisure/outdoor-gear/camping-gear",
    ],
    [
      "Phone & Tablet accessories",
      "Desk accessories",
      "Utah RCS recycled plastic and bamboo LED clock",
      "home-and-living/home-decor/clocks-and-weather-stations",
    ],
    [
      "Home & Living",
      "Kitchen accessories",
      "Reusable stainless steel 3 pcs straw set",
      "drinkware/bar-and-wine-accessories/reusable-straws",
    ],
    [
      "Outdoor",
      "Outdoor accessories",
      "VINGA Lagoa GRS beach chair",
      "outdoor-and-leisure/travel-and-beach/beach-items",
    ],
    [
      "Tools & Torches",
      "Tool pens",
      "Eon bamboo infinity multitasking pen",
      "office-and-writing/writing-instruments/pencils",
    ],
    [
      "Car & Safety",
      "First aid & Home safety",
      "Reusable 2-ply cotton face mask",
      "apparel-and-wearables/workwear-and-safety",
    ],
    [
      "Phone & Tablet accessories",
      "Holders & Casings",
      "Swiss Peak 15W magnetic charging laptop sleeve 14-15,6'",
      "bags/specialty-bags/document-and-laptop-bags",
    ],
  ] as const

  for (const [mainCategory, subCategory, name, expected] of reviewedModels) {
    assert.equal(
      mapXdConnectsCategory({ mainCategory, subCategory, name }),
      expected,
      name,
    )
  }

  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Phone & Tablet accessories",
      subCategory: "Mobile Gadgets",
      name: "Future uncategorized electronic",
    }),
    null,
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Phone & Tablet accessories",
      subCategory: "Hubs",
      name: "RCS recycled plastic USB hub with dual input",
    }),
    null,
  )
  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Home & Living",
      subCategory: "Interior",
      name: "VINGA Montgomery premium cotton bed linen, 4 pcs set",
    }),
    null,
  )
})

test("XD Connects keeps reviewed edge products out of broad fallback leaves", () => {
  const correctedModels = [
    [
      "Car & Safety",
      "First aid & Home safety",
      "Keychain CPR mask",
      "home-and-living/personal-care-and-wellness/first-aid-kits",
    ],
    [
      "Home & Living",
      "Kitchen accessories",
      "VINGA Asado oven mitt",
      "home-and-living/kitchen-and-dining/aprons-and-gloves",
    ],
    [
      "Home & Living",
      "Kitchen accessories",
      "Chef tablet stand with touchpen",
      "electronics/computer-and-mobile-accessories/phone-holders-and-stands",
    ],
  ] as const

  for (const [mainCategory, subCategory, name, expected] of correctedModels) {
    assert.equal(
      mapXdConnectsCategory({ mainCategory, subCategory, name }),
      expected,
      name,
    )
  }

  const deliberatelyUnclassified = [
    ["Home & Living", "Table accessories", "Ukiyo recycled cotton table cloth"],
    ["Home & Living", "Table accessories", "Ukiyo recycled cotton table napkins"],
    ["Tools & Torches", "Rulers & cutters", "Extra thick bamboo ruler"],
    ["Tools & Torches", "Rulers & cutters", "Magnetic level ruler medium"],
    ["Tools & Torches", "Rulers & cutters", "Mini folding rule"],
  ] as const

  for (const [mainCategory, subCategory, name] of deliberatelyUnclassified) {
    assert.equal(
      mapXdConnectsCategory({ mainCategory, subCategory, name }),
      null,
      name,
    )
  }

  assert.equal(
    mapXdConnectsCategory({
      mainCategory: "Tools & Torches",
      subCategory: "Rulers & cutters",
      name: "Refillable snap-off knife",
    }),
    "office-and-writing/office-accessories/paper-cutters",
  )
})
