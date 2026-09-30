import assert from "node:assert/strict"
import test from "node:test"
import { normalize } from "../_shared/normalize.ts"
import {
  adapter,
  buildMakitoInventorySnapshot,
  buildMakitoProducts,
  isTrustedMakitoCatalogAssetUrl,
  makitoIdentifier,
  parseMakitoDecimal,
  resolveUnambiguousMakitoPrice,
  type MakitoBuildOptions,
  type MakitoPriceResolver,
} from "./adapter.ts"
import type {
  MakitoCatalogFeeds,
  MakitoCatalogProduct,
  MakitoInventoryFeeds,
  MakitoPriceEntry,
} from "./types.ts"

const FETCHED_AT = "2026-09-30T12:00:00.000Z"

const VARIANT_PRICE_RESOLVER: MakitoPriceResolver = (entry) => {
  const resolved = resolveUnambiguousMakitoPrice(entry)
  return resolved ? { ...resolved, binding: "variant" } : null
}

function asset(path: string): string {
  return `https://apis.makito.es/catalog/assets/${path}`
}

function price(
  material: string,
  amount: string,
  overrides: Partial<MakitoPriceEntry> = {},
): MakitoPriceEntry {
  return {
    material,
    currency: "EUR",
    baseQuantity: "1",
    scales: [{ quantity: "1", amount }],
    ...overrides,
  }
}

function product(
  overrides: Partial<MakitoCatalogProduct> = {},
): MakitoCatalogProduct {
  return {
    ref: "P-100",
    web_reference: 100,
    name: "Recycled tote bag",
    description: "A <strong>durable</strong><br>recycled &amp; reusable tote.",
    brand: "Makito",
    custom_code: "CUSTOM-100",
    length: "40",
    width: "35.5",
    height: "2",
    weight: "180",
    batteries: false,
    categories: [
      { id_category: 7, category: "Bags" },
      { id_category: 9, category: "Recycled shopping bags" },
    ],
    material: ["Recycled cotton"],
    materialDescription: ["rPET"],
    variants: [
      {
        material: 10001,
        colorCode: "BL",
        colorTitle: { en: "Blue", es: "Azul" },
        colorHex: "0057B8",
        sizeCode: "S",
        sizeTitle: { en: "S" },
        image: asset("P-100/variant/10001-blue.jpg"),
      },
      {
        material: "10002",
        color: { code: "RD", title: { en: "Red" }, hex: "#c8102e" },
        size: { code: "M", title: { en: "M" } },
        image: asset("P-100/variant/10002-red.jpg"),
      },
    ],
    image: [
      { url: asset("P-100/product/main.jpg") },
      { url: "https://attacker.example/catalog/assets/stolen.jpg" },
    ],
    variant_image: [
      {
        material: "10002",
        img_max: asset("P-100/variant/10002-detail.jpg"),
      },
    ],
    ...overrides,
  }
}

function buildProducts(
  catalog: MakitoCatalogFeeds,
  options: MakitoBuildOptions = {},
) {
  return buildMakitoProducts(catalog, {
    priceResolver: VARIANT_PRICE_RESOLVER,
    ...options,
  })
}

function feeds(
  overrides: Partial<MakitoCatalogFeeds> = {},
): MakitoCatalogFeeds {
  return {
    catalog: { products: [product()] },
    stock: {
      stocks: [
        { material: 10001, quantity: "3", storageId: 1000 },
        { material: "10001", quantity: 2, storageId: 2000 },
        { material: "10002", quantity: "7", storageId: 1000 },
        {
          material: "10002",
          quantity: "40",
          storageId: 1000,
          availableDate: "2026-10-10T00:00:00Z",
        },
      ],
    },
    priceList: {
      generatedAt: FETCHED_AT,
      priceList: [price("10001", "2.50"), price("10002", "3.75")],
    },
    printConfig: {
      generatedAt: FETCHED_AT,
      lang: "en",
      products: [
        {
          productReference: "P-100",
          areas: [
            {
              techniqueId: "NOT-LINKED",
              width: "100",
              height: "50",
            },
          ],
          positions: [],
          techniques: [
            {
              id: "SC1",
              description: "Screen printing",
              maximumColors: "4",
              printSizes: ["100 x 50 mm"],
            },
            { id: "CUSTOM", description: "Supplier special finish" },
          ],
        },
      ],
    },
    fetchedAt: FETCHED_AT,
    ...overrides,
  }
}

test("Makito builds stable product and material bindings without Cartesian print data", () => {
  const products = buildProducts(feeds())
  assert.equal(products.length, 1)
  const raw = products[0]!
  assert.equal(raw.supplierId, "makito")
  assert.equal(raw.supplierSku, "P-100")
  assert.deepEqual(raw.supplierVariantIds, ["10001", "10002"])
  assert.equal(raw.supplierPriceEur, 2.5)
  assert.equal(raw.supplierPriceEurMax, 3.75)
  assert.equal(raw.originalCurrency, "EUR")
  assert.equal(raw.description, "A durable recycled & reusable tote.")
  assert.equal(raw.stock, 12)
  assert.equal(raw.moq, 1)
  assert.deepEqual(raw.colors, ["Blue", "Red"])
  assert.deepEqual(raw.sizes, ["S", "M"])
  assert.deepEqual(raw.material, ["Recycled cotton", "rPET"])
  assert.equal(raw.images.includes(asset("P-100/product/main.jpg")), true)
  assert.equal(raw.images.some((url) => url.includes("attacker.example")), false)
  assert.deepEqual(
    raw.variants?.map((variant) => ({
      id: variant.supplierVariantId,
      price: variant.priceEur,
      stock: variant.stock,
      color: variant.colorName,
      hex: variant.colorHex,
      size: variant.size,
      images: variant.images,
    })),
    [
      {
        id: "10001",
        price: 2.5,
        stock: 5,
        color: "Blue",
        hex: "#0057B8",
        size: "S",
        images: [asset("P-100/variant/10001-blue.jpg")],
      },
      {
        id: "10002",
        price: 3.75,
        stock: 7,
        color: "Red",
        hex: "#C8102E",
        size: "M",
        images: [
          asset("P-100/variant/10002-red.jpg"),
          asset("P-100/variant/10002-detail.jpg"),
        ],
      },
    ],
  )
  assert.deepEqual(raw.rawPersonalizationCodes, ["CUSTOM", "SC1"])
  assert.equal(
    raw.supplierPersonalizations?.find((method) => method.code === "SC1")?.printSizes?.includes(
      "100 x 50 mm",
    ),
    true,
  )
  assert.equal(
    raw.supplierPersonalizations?.some((method) => method.code === "NOT-LINKED"),
    false,
  )
  assert.equal(
    raw.specifications?.find((specification) => specification.key === "dimensions")?.value,
    "Length: 40 · Width: 35.5 · Height: 2",
  )
  assert.equal(
    raw.specifications?.find((specification) => specification.key === "supplier-weight")?.value,
    "180",
  )

  const normalized = normalize(raw, adapter)
  assert.equal(normalized.product?.category, "bags/shopping-bags/rpet-and-recycled-bags")
  assert.deepEqual(normalized.product?.personalizations, ["pad-screen"])
  assert.deepEqual(normalized.unknownPersonalizationCodes, ["CUSTOM"])
})

test("Makito inventory sums current storage records and ignores future availability", () => {
  const full = feeds()
  const inventory: MakitoInventoryFeeds = {
    stock: full.stock,
    priceList: full.priceList,
    fetchedAt: full.fetchedAt,
  }
  const snapshot = buildMakitoInventorySnapshot(inventory, {
    priceResolver: VARIANT_PRICE_RESOLVER,
  })
  assert.deepEqual([...snapshot.prices], [["10001", 2.5], ["10002", 3.75]])
  assert.deepEqual([...snapshot.stock], [["10001", 5], ["10002", 7]])
})

test("Makito refuses to guess amount/baseQuantity price semantics", () => {
  const ambiguous = price("10001", "1000.00", {
    baseQuantity: "5000",
    scales: [{ quantity: "1", amount: "1000.00" }],
  })
  assert.equal(resolveUnambiguousMakitoPrice(ambiguous), null)
  assert.throws(
    () => buildProducts(feeds({
      priceList: {
        priceList: [ambiguous, price("10002", "3.75")],
      },
    })),
    /no verified EUR unit price/,
  )
})

test("Makito requires a verified price unit and binding contract", () => {
  assert.throws(
    () => buildMakitoProducts(feeds()),
    /price semantics are not verified/,
  )
})

test("Makito accepts an explicitly supplied verified price resolver", () => {
  const catalog = feeds({
    priceList: {
      priceList: [
        price("10001", "1000", { baseQuantity: "500" }),
        price("10002", "1500", { baseQuantity: "500" }),
      ],
    },
  })
  const products = buildMakitoProducts(catalog, {
    priceResolver(entry) {
      const amount = parseMakitoDecimal(entry.scales[0]?.amount)
      const base = parseMakitoDecimal(entry.baseQuantity)
      return {
        unitPriceEur: amount / base,
        minimumQuantity: 1,
        binding: "variant",
      }
    },
  })
  assert.equal(products[0]?.supplierPriceEur, 2)
  assert.equal(products[0]?.supplierPriceEurMax, 3)
})

test("Makito supports explicitly verified product-bound prices", () => {
  const catalog = feeds({
    priceList: {
      priceList: [price("P-100", "2.90")],
    },
  })
  const productPriceResolver: MakitoPriceResolver = (entry) => {
    const resolved = resolveUnambiguousMakitoPrice(entry)
    return resolved ? { ...resolved, binding: "product" } : null
  }
  const products = buildMakitoProducts(catalog, {
    priceResolver: productPriceResolver,
  })
  assert.deepEqual(
    products[0]?.variants?.map((variant) => variant.priceEur),
    [2.9, 2.9],
  )

  const inventory = buildMakitoInventorySnapshot({
    stock: catalog.stock,
    priceList: catalog.priceList,
    fetchedAt: catalog.fetchedAt,
  }, {
    priceResolver: productPriceResolver,
    productVariantIds: new Map([["P-100", ["10001", "10002"]]]),
  })
  assert.deepEqual([...inventory.prices], [["10001", 2.9], ["10002", 2.9]])
  assert.throws(
    () => buildMakitoInventorySnapshot({
      stock: catalog.stock,
      priceList: catalog.priceList,
      fetchedAt: catalog.fetchedAt,
    }, { priceResolver: productPriceResolver }),
    /cannot be expanded without verified product\/variant bindings/,
  )
})

test("Makito never treats product composition or a generic object id as a variant", () => {
  assert.throws(
    () => buildProducts(feeds({
      catalog: {
        products: [product({ variants: undefined, material: ["Cotton", "rPET"] })],
      },
    })),
    /no safely publishable products/,
  )
  assert.throws(
    () => buildProducts(feeds({
      catalog: {
        products: [product({ variants: [{ id: "10001" }] })],
      },
    })),
    /product P-100 material is invalid/,
  )
})

test("Makito ignores unknown color and size object fields", () => {
  const catalog = feeds({
    catalog: {
      products: [product({
        variants: [
          {
            material: "10001",
            color: { unknown: "Blue" },
            size: { unknown: "S" },
            image: asset("P-100/variant/10001-blue.jpg"),
          },
          {
            material: "10002",
            image: asset("P-100/variant/10002-red.jpg"),
          },
        ],
      })],
    },
  })
  const first = buildProducts(catalog)[0]?.variants?.[0]
  assert.equal(first?.colorName, undefined)
  assert.equal(first?.size, undefined)
})

test("Makito detects duplicate conflicts before publishing", () => {
  const duplicatePrice = feeds({
    priceList: {
      priceList: [
        price("10001", "2.50"),
        price("10001", "2.60"),
        price("10002", "3.75"),
      ],
    },
  })
  assert.throws(() => buildProducts(duplicatePrice), /conflicting EUR prices/)

  const conflictingStock = feeds()
  conflictingStock.stock.stocks.push({
    material: 10001,
    quantity: "99",
    storageId: 1000,
  })
  assert.throws(() => buildProducts(conflictingStock), /conflicting stock records/)

  const duplicateMaterial = feeds({
    catalog: {
      products: [
        product(),
        product({
          ref: "P-200",
          name: "Another bag",
          variants: [{ material: "10001", image: asset("P-200/main.jpg") }],
        }),
      ],
    },
  })
  assert.throws(() => buildProducts(duplicateMaterial), /assigned to products/)
})

test("Makito catalog assets are restricted to the exact protected HTTPS namespace", () => {
  assert.equal(isTrustedMakitoCatalogAssetUrl(asset("P-100/main.jpg")), true)
  assert.equal(
    isTrustedMakitoCatalogAssetUrl("http://apis.makito.es/catalog/assets/P-100/main.jpg"),
    false,
  )
  assert.equal(
    isTrustedMakitoCatalogAssetUrl("https://apis.makito.es.evil.test/catalog/assets/x.jpg"),
    false,
  )
  assert.equal(
    isTrustedMakitoCatalogAssetUrl("https://apis.makito.es/print-config/assets/x.jpg"),
    false,
  )
  assert.equal(
    isTrustedMakitoCatalogAssetUrl("https://apis.makito.es/catalog/assets/../secret"),
    false,
  )
  assert.equal(
    isTrustedMakitoCatalogAssetUrl("https://apis.makito.es/catalog/assets/x.jpg?token=leak"),
    false,
  )
})

test("Makito identifiers and decimals reject lossy or locale-dependent input", () => {
  assert.equal(makitoIdentifier(123), "123")
  assert.equal(parseMakitoDecimal("12.50"), 12.5)
  assert.equal(Number.isNaN(parseMakitoDecimal("12,50")), true)
  assert.throws(() => makitoIdentifier(Number.MAX_SAFE_INTEGER + 1), /invalid/)
})
