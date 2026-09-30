import assert from "node:assert/strict"
import test from "node:test"
import { normalize } from "../_shared/normalize.ts"
import {
  adapter,
  buildXdConnectsInventorySnapshot,
  buildXdConnectsProducts,
  parseXdConnectsDecimal,
  parseXdConnectsStock,
  type XdConnectsBuildOptions,
} from "./adapter.ts"
import type { XdConnectsFeed, XdConnectsRow } from "./types.ts"

const RATE = 5.2786
const SAFETY: XdConnectsBuildOptions = {
  minimumRows: 1,
  minimumModels: 1,
  minimumPublishedProducts: 1,
  minimumPriceCoverage: 1,
  minimumStockCoverage: 1,
  minimumImageCoverage: 1,
}

function image(name: string): string {
  return `https://static.xdconnects.com/ProductImages/Large/${name}.jpg`
}

function row(overrides: Partial<XdConnectsRow> = {}): XdConnectsRow {
  const mainImage = image("p100-black")
  return {
    FeedCreatedDateTime: "2026-09-29T18:19:31",
    Currency: "RON",
    ModelCode: "P100",
    ItemCode: "P100-001",
    ProductLifeCycle: "Current",
    IntroDate: "2026-01-15",
    ItemName: "Aware recycled tote",
    LongDescription: "A durable &amp; recycled tote.",
    Brand: "XD Collection",
    MainCategory: "Bags & Travel",
    SubCategory: "Carry shopping bags",
    Material: "rPET,rPET",
    Color: "black",
    HexColor1: "3D332B",
    TextileSize: "",
    ItemDimensions: "41 x 36.5 x 13 cm",
    ItemWeightNetGr: "250",
    CountryOfOrigin: "CN",
    CommodityCode: "42029298",
    PackagingTypeItem: "Polybag",
    InnerboxQty: "5",
    OuterCartonQty: "20",
    Compliance: "REACH",
    Certifications: "GRS",
    Eco: "Recycled content",
    "Recycled Content Percent": "70",
    ContentVolumeLiters: "",
    PowerbankCapacity: "",
    MainImage: mainImage,
    AllImages: `${mainImage}, ${image("p100-detail")}`,
    PrintCodeDefault: "Screen Transfer OS",
    PrintTechniqueDefault: "Screen transfer",
    PrintPositionDefault: "item front",
    MaxPrintAreaDefault: "150 x 150 mm",
    MaxPrintWidthDefaultMM: "150",
    MaxPrintHeightDefaultMM: "150",
    Qty1: "1",
    ItemPriceNet_Qty1: String(RATE * 10),
    MOQBlankOrder: "1",
    CurrentStock: "5",
    ...overrides,
  } as XdConnectsRow
}

function feed(rows: XdConnectsRow[]): XdConnectsFeed {
  return {
    headers: [],
    rows,
    feedCreatedDateTime: "2026-09-29T18:19:31",
    currency: "RON",
    fetchedAt: "2026-09-29T18:20:00.000Z",
    fromCache: false,
  }
}

test("XD Connects groups ModelCode families while retaining ItemCode inventory bindings", () => {
  const rows = [
    row({
      ItemCode: "P100-BLUE-S",
      Color: "blue",
      HexColor1: "0057B8",
      TextileSize: "S",
      ItemPriceNet_Qty1: String(RATE * 20),
      CurrentStock: "0",
      MainImage: image("p100-blue-s"),
      "MainImage Neutral": image("p100-blue-neutral"),
      AllImages: image("p100-blue-s"),
    }),
    row({
      ItemCode: "P100-RED-M",
      Color: "red",
      HexColor1: "C8102E",
      TextileSize: "M",
      CurrentStock: "7",
      MainImage: image("p100-red-m"),
      "MainImage Neutral": image("p100-red-neutral"),
      AllImages: `${image("p100-red-m")}, ${image("p100-detail")}`,
    }),
    row({
      ItemCode: "P100-RED-S",
      Color: "red",
      HexColor1: "C8102E",
      TextileSize: "S",
      MainImage: image("p100-red-s"),
      "MainImage Neutral": image("p100-red-neutral"),
      AllImages: image("p100-red-s"),
    }),
  ]

  const products = buildXdConnectsProducts(feed(rows), RATE, SAFETY)
  assert.equal(products.length, 1)
  const product = products[0]!
  assert.equal(product.supplierSku, "P100")
  assert.deepEqual(product.supplierVariantIds, ["P100-BLUE-S", "P100-RED-M", "P100-RED-S"])
  assert.equal(product.supplierPriceEur, 10)
  assert.equal(product.supplierPriceEurMax, 20)
  assert.equal(product.stock, 12)
  assert.equal(product.originalCurrency, "RON")
  assert.equal(product.variantCount, 3)
  assert.deepEqual(product.colors, ["blue", "red"])
  assert.deepEqual(product.sizes, ["S", "M"])
  assert.deepEqual(product.material, ["rPET"])
  assert.equal(product.brand, "XD Collection")
  assert.equal(product.weightGrams, 250)
  assert.equal(product.images.includes(image("p100-blue-neutral")), true)
  assert.equal(product.images.includes(image("p100-red-neutral")), true)
  assert.equal(product.images.includes(image("p100-blue-s")), false)
  assert.equal(product.images.includes(image("p100-red-m")), true)
  assert.equal(product.images.includes(image("p100-red-s")), false)
  assert.deepEqual(
    product.variants?.map((variant) => [variant.supplierVariantId, variant.priceEur, variant.stock]),
    [
      ["P100-BLUE-S", 20, 0],
      ["P100-RED-M", 10, 7],
      ["P100-RED-S", 10, 5],
    ],
  )
  assert.equal(product.variants?.[1]?.images?.[0], product.variants?.[2]?.images?.[0])
  assert.equal(product.variants?.[1]?.images?.[0], image("p100-red-neutral"))
  assert.deepEqual(product.rawPersonalizationCodes, ["Screen Transfer OS"])
  assert.deepEqual(product.supplierPersonalizations?.[0]?.printSizes, [
    "150 × 150 mm · item front",
  ])
  assert.equal(adapter.mapCategory(product), "bags/shopping-bags/rpet-and-recycled-bags")
  assert.deepEqual(adapter.mapPersonalizations(product), ["textile-transfer"])

  const normalized = normalize(product, adapter)
  assert.equal(normalized.product?.price, 13)
  assert.equal(normalized.product?.priceFrom, true)
  assert.equal(normalized.product?.stock, 12)
  assert.equal(normalized.product?.supplierVariantIds?.length, 3)
})

test("XD Connects inventory uses ItemCode, current stock only, and converted net item price", () => {
  const rows = [
    row({
      ItemCode: "P100-001",
      CurrentStock: "0",
      FutureIncomingStockDate1: "2026-10-23",
      FutureIncomingStockQty1: "2016",
    }),
    row({
      ItemCode: "P100-002",
      Color: "blue",
      MainImage: image("p100-blue"),
      ItemPriceNet_Qty1: String(RATE * 12.5),
      CurrentStock: "9",
    }),
  ]
  const snapshot = buildXdConnectsInventorySnapshot(feed(rows), RATE, SAFETY)
  assert.equal(snapshot.prices.get("P100-001"), 10)
  assert.equal(snapshot.prices.get("P100-002"), 12.5)
  assert.equal(snapshot.stock.get("P100-001"), 0)
  assert.equal(snapshot.stock.get("P100-002"), 9)
})

test("XD Connects keeps outlet zero-stock products and blank print metadata honest", () => {
  const [product] = buildXdConnectsProducts(
    feed([
      row({
        ProductLifeCycle: "Outlet",
        CurrentStock: "0",
        PrintCodeDefault: "",
        PrintTechniqueDefault: "",
        PrintPositionDefault: "",
        MaxPrintAreaDefault: "",
        PrintPriceDefaultNet_Qty1: "11.19",
      }),
    ]),
    RATE,
    SAFETY,
  )
  assert.equal(product?.stock, 0)
  assert.deepEqual(product?.rawPersonalizationCodes, [])
  assert.deepEqual(product?.supplierPersonalizations, [])
  assert.deepEqual(adapter.mapPersonalizations(product!), [])
  assert.equal(
    product?.specifications?.find((specification) => specification.key === "lifecycle")?.value,
    "Outlet",
  )
})

test("XD Connects fails closed for family drift and critical feed coverage loss", () => {
  assert.throws(
    () => buildXdConnectsProducts(
      feed([row(), row({ ItemCode: "P100-002", MainCategory: "Outdoor" })]),
      RATE,
      SAFETY,
    ),
    /inconsistent MainCategory/,
  )
  assert.throws(
    () => buildXdConnectsProducts(
      feed([row({ MainImage: "https://untrusted.invalid/image.jpg" })]),
      RATE,
      SAFETY,
    ),
    /image coverage is unsafe/,
  )
  assert.throws(
    () => buildXdConnectsInventorySnapshot(
      feed([row({ ItemPriceNet_Qty1: "" })]),
      RATE,
      SAFETY,
    ),
    /price coverage is unsafe/,
  )
})

test("XD Connects prefers each variant's neutral image and falls back to MainImage", () => {
  const [product] = buildXdConnectsProducts(
    feed([
      row({
        ItemCode: "P100-SMALL",
        TextileSize: "S-M",
        MainImage: image("p100-small-sized"),
        "MainImage Neutral": image("p100-small-neutral"),
      }),
      row({
        ItemCode: "P100-LARGE",
        TextileSize: "L-XL",
        MainImage: image("p100-large-sized"),
        "MainImage Neutral": image("p100-large-neutral"),
      }),
      row({
        ItemCode: "P100-PLAIN",
        Color: "white",
        TextileSize: "",
        MainImage: image("p100-plain"),
        "MainImage Neutral": "",
      }),
      row({
        ItemCode: "P100-UNTRUSTED",
        Color: "green",
        MainImage: image("p100-untrusted-fallback"),
        "MainImage Neutral": "https://untrusted.invalid/neutral.jpg",
      }),
    ]),
    RATE,
    SAFETY,
  )

  assert.deepEqual(
    product?.variants?.map((variant) => variant.images?.[0]),
    [
      image("p100-large-neutral"),
      image("p100-plain"),
      image("p100-small-neutral"),
      image("p100-untrusted-fallback"),
    ],
  )
})

test("XD Connects decimal and stock parsing is strict", () => {
  assert.equal(parseXdConnectsDecimal("1.234,50"), 1234.5)
  assert.equal(parseXdConnectsDecimal("1234.50"), 1234.5)
  assert.equal(parseXdConnectsStock("0"), 0)
  assert.ok(Number.isNaN(parseXdConnectsStock("2.5")))
  assert.ok(Number.isNaN(parseXdConnectsStock("unknown")))
})
