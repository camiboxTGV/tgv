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
  resolveMakitoProductPrice,
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
    baseQuantity: "1000",
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
        variant_reference: "WEB-BL-S",
        variant_colorcode: "BL",
        variant_name: "Blue",
        variant_size: "S",
        colorHex: "0057B8",
        variant_image: asset("P-100/10001000001/principal/10001-blue.jpg"),
        variant_thumbnail: asset("P-100/10001000001/thumbnail/10001-blue.jpg"),
      },
      {
        variant_reference: "WEB-RD-M",
        variant_colorcode: "RD",
        variant_name: "Red",
        variant_size: "M",
        colorHex: "#c8102e",
        variant_image: asset("P-100/10001000002/principal/10002-red.jpg"),
        variant_thumbnail: asset("P-100/10001000002/thumbnail/10002-red.jpg"),
      },
    ],
    image: [
      { url: asset("P-100/product/main.jpg") },
      { url: "https://attacker.example/catalog/assets/stolen.jpg" },
    ],
    ...overrides,
  }
}

function buildProducts(
  catalog: MakitoCatalogFeeds,
  options: MakitoBuildOptions = {},
) {
  return buildMakitoProducts(catalog, options)
}

function feeds(
  overrides: Partial<MakitoCatalogFeeds> = {},
): MakitoCatalogFeeds {
  return {
    catalog: { products: [product()] },
    stock: {
      stocks: [
        { material: 10001000001, quantity: "3", storageId: 1000 },
        { material: "10001000001", quantity: 2, storageId: 2000 },
        { material: "10001000002", quantity: "7", storageId: 1000 },
        {
          material: "10001000002",
          quantity: "40",
          storageId: 1000,
          availableDate: "2026-10-10T00:00:00Z",
        },
      ],
    },
    priceList: {
      generatedAt: FETCHED_AT,
      priceList: [price("P-100", "2500")],
    },
    printConfig: {
      generatedAt: FETCHED_AT,
      lang: "en",
      products: [
        {
          id: "P-100",
          areas: [
            {
              id: "A1",
              position: "Front",
              width: "100",
              height: "50",
              techniques: "Screen printing",
            },
            {
              id: "A2",
              position: "Back",
              width: "80",
              height: "40",
              techniques: "Supplier special finish",
            },
          ],
          positions: [],
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
  assert.deepEqual(raw.supplierVariantIds, ["10001000001", "10001000002"])
  assert.equal(raw.supplierPriceEur, 2.5)
  assert.equal(raw.supplierPriceEurMax, 2.5)
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
        id: "10001000001",
        price: 2.5,
        stock: 5,
        color: "Blue",
        hex: "#0057B8",
        size: "S",
        images: undefined,
      },
      {
        id: "10001000002",
        price: 2.5,
        stock: 7,
        color: "Red",
        hex: "#C8102E",
        size: "M",
        images: undefined,
      },
    ],
  )
  assert.deepEqual(raw.rawPersonalizationCodes, [
    "Screen printing",
    "Supplier special finish",
  ])
  assert.equal(
    raw.supplierPersonalizations?.find((method) => method.code === "Screen printing")
      ?.printSizes?.includes(
      "100 × 50 mm · Front",
    ),
    true,
  )
  assert.equal(
    raw.supplierPersonalizations?.find((method) =>
      method.code === "Supplier special finish"
    )?.printSizes?.includes("80 × 40 mm · Back"),
    true,
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
  assert.deepEqual(normalized.unknownPersonalizationCodes, ["Supplier special finish"])
})

test("Makito inventory sums current storage records and ignores future availability", () => {
  const full = feeds()
  const inventory: MakitoInventoryFeeds = {
    catalog: full.catalog,
    stock: full.stock,
    priceList: full.priceList,
    fetchedAt: full.fetchedAt,
  }
  const snapshot = buildMakitoInventorySnapshot(inventory)
  assert.deepEqual([...snapshot.prices], [
    ["10001000001", 2.5],
    ["10001000002", 2.5],
  ])
  assert.deepEqual([...snapshot.stock], [
    ["10001000001", 5],
    ["10001000002", 7],
  ])
})

test("Makito production prices are product-bound EUR amount/baseQuantity values", () => {
  const entry = price("P-100", "2500", { baseQuantity: "1000" })
  assert.deepEqual(resolveUnambiguousMakitoPrice(entry), {
    unitPriceEur: 2.5,
    minimumQuantity: 1,
  })
  assert.deepEqual(resolveMakitoProductPrice(entry), {
    unitPriceEur: 2.5,
    minimumQuantity: 1,
    binding: "product",
  })
  assert.equal(resolveUnambiguousMakitoPrice(price("P-100", "2500", {
    baseQuantity: "0",
  })), null)
  assert.equal(resolveUnambiguousMakitoPrice(price("P-100", "2500", {
    scales: [{ quantity: "2", amount: "2500" }],
  })), null)
  assert.equal(resolveUnambiguousMakitoPrice(price("P-100", "2500", {
    scales: [
      { quantity: "1", amount: "2500" },
      { quantity: "10", amount: "2400" },
    ],
  })), null)
})

test("Makito skips products with no product price and ignores unrelated prices", () => {
  const second = product({
    ref: "P-200",
    name: "Unpriced bag",
    variants: [{
      variant_reference: "WEB-200",
      variant_image: asset("P-200/20001000001/principal/20001.jpg"),
      variant_thumbnail: asset("P-200/20001000001/thumbnail/20001.jpg"),
    }],
    image: asset("P-200/product/main.jpg"),
  })
  const catalog = feeds({
    catalog: { products: [product(), second] },
    priceList: {
      priceList: [price("P-100", "2500"), price("UNRELATED", "9999")],
    },
  })
  assert.deepEqual(buildMakitoProducts(catalog).map((item) => item.supplierSku), ["P-100"])

  const inventory = buildMakitoInventorySnapshot({
    catalog: catalog.catalog,
    stock: catalog.stock,
    priceList: catalog.priceList,
    fetchedAt: catalog.fetchedAt,
  })
  assert.deepEqual([...inventory.prices], [
    ["10001000001", 2.5],
    ["10001000002", 2.5],
  ])
})

test("Makito rejects partial and mixed custom price bindings", () => {
  const variantResolver: MakitoPriceResolver = (entry) => ({
    unitPriceEur: parseMakitoDecimal(entry.scales[0]?.amount),
    minimumQuantity: 1,
    binding: "variant",
  })
  const partial = feeds({
    priceList: { priceList: [price("10001000001", "2.5", { baseQuantity: "1" })] },
  })
  assert.throws(
    () => buildMakitoProducts(partial, { priceResolver: variantResolver }),
    /partial price binding/,
  )

  let call = 0
  assert.throws(
    () => buildMakitoProducts(feeds({
      priceList: {
        priceList: [price("P-100", "2500"), price("10001000001", "2.5")],
      },
    }), {
      priceResolver(entry) {
        call++
        const resolved = resolveUnambiguousMakitoPrice(entry)
        return resolved
          ? { ...resolved, binding: call === 1 ? "product" : "variant" }
          : null
      },
    }),
    /mixes product and variant binding scopes/,
  )

  assert.throws(
    () => buildMakitoProducts(feeds({
      priceList: {
        priceList: [price("P-100", "2500"), price("10001000001", "2500")],
      },
    })),
    /mixed or variant material keys/,
  )
})

test("Makito never treats composition, generic ids, or variant_reference as stock material", () => {
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
        products: [product({
          variants: [{ id: "10001", variant_reference: "WEB-10001" }],
        })],
      },
    })),
    /no safely publishable products/,
  )
})

test("Makito ignores unknown color and size object fields", () => {
  const catalog = feeds({
    catalog: {
      products: [product({
        variants: [
          {
            color: { unknown: "Blue" },
            size: { unknown: "S" },
            variant_image: asset("P-100/10001000001/principal/10001-blue.jpg"),
          },
          {
            variant_image: asset("P-100/10001000002/principal/10002-red.jpg"),
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
        price("P-100", "2500"),
        price("P-100", "2600"),
      ],
    },
  })
  assert.throws(() => buildProducts(duplicatePrice), /conflicting EUR prices/)

  const conflictingStock = feeds()
  conflictingStock.stock.stocks.push({
    material: 10001000001,
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
          variants: [{
            variant_reference: "WEB-OTHER",
            variant_image: asset("P-200/10001000001/principal/duplicate.jpg"),
          }],
        }),
      ],
    },
  })
  assert.throws(() => buildProducts(duplicateMaterial), /assigned to products/)
})

test("Makito validates variant asset ownership and mirrors one protected product image", () => {
  assert.throws(
    () => buildProducts(feeds({
      catalog: {
        products: [product({
          variants: [{
            variant_image: asset("P-OTHER/10001000001/principal/wrong.jpg"),
          }],
        })],
      },
    })),
    /belongs to another product/,
  )
  assert.equal(adapter.imageMirror?.enabledWhenImagesSkipped, true)
  assert.equal(adapter.imageMirror?.maxProductImages, 1)
  assert.equal(typeof adapter.imageMirror?.fetch, "function")
  assert.equal(buildProducts(feeds())[0]?.images.length, 1)
  assert.equal(buildProducts(feeds())[0]?.variants?.every((variant) => !variant.images), true)
})

test("Makito ignores directory asset URLs and falls back to a concrete variant image", () => {
  const directoryUrl = asset("P-100/principal/")
  const products = buildProducts(feeds({
    catalog: {
      products: [product({ image: directoryUrl })],
    },
  }))

  assert.equal(isTrustedMakitoCatalogAssetUrl(directoryUrl), false)
  assert.equal(
    products[0]?.images[0],
    asset("P-100/10001000001/principal/10001-blue.jpg"),
  )
})

test("Makito catalog assets are restricted to the exact protected HTTPS namespace", () => {
  assert.equal(isTrustedMakitoCatalogAssetUrl(asset("P-100/main.jpg")), true)
  assert.equal(isTrustedMakitoCatalogAssetUrl(asset("P-100/principal%2F")), false)
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
