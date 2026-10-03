import assert from "node:assert/strict"
import test from "node:test"
import type {
  CatalogProduct,
  ProductVariant,
} from "../content/catalog.ts"
import type { OfferItem } from "../offer/storage.ts"
import { DEFAULT_DECORATION_OPTIONS } from "../pricing/calculator.ts"
import {
  resolveSelectedProductsAgainstCatalog,
  type AuthoritativeCatalogLookup,
} from "./authoritative-selected-products.ts"

function product(
  overrides: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    slug: "server-product",
    name: "Server product",
    category: "server/category",
    summary: "Catalog summary",
    accent: "#000000",
    personalizations: ["uv-print", "co2"],
    supplierPersonalizations: [{ code: "UV", label: "UV print" }],
    supplierId: "server-supplier",
    supplierSku: "SERVER-SKU",
    price: 12.5,
    priceFrom: false,
    stock: 10,
    stockLevel: "in-stock",
    images: [],
    fetchedAt: "2026-10-03T00:00:00.000Z",
    variantCount: 1,
    colorCount: 1,
    sizeCount: 1,
    hasVariantDetail: true,
    ...overrides,
  }
}

function variant(
  overrides: Partial<ProductVariant> = {},
): ProductVariant {
  return {
    contentKey: "server-variant",
    supplierVariantId: "SERVER-VARIANT-ID",
    color: { name: "Server blue", hex: "#123456" },
    size: "XL",
    stock: 5,
    stockLevel: "in-stock",
    price: 15.75,
    ...overrides,
  }
}

function lookup(
  catalogProduct: CatalogProduct | undefined = product(),
  variants: ProductVariant[] = [variant()],
): AuthoritativeCatalogLookup {
  return {
    getProductBySlug: (slug) =>
      catalogProduct?.slug === slug ? catalogProduct : undefined,
    getProductVariants: (slug) =>
      catalogProduct?.slug === slug ? variants : [],
  }
}

test("catalog metadata, variant details and prices replace client-authored values", () => {
  const submitted: OfferItem = {
    slug: "server-product",
    name: "Forged name",
    category: "forged/category",
    quantity: 3,
    supplierId: "forged-supplier",
    supplierSku: "FORGED-SKU",
    variantKey: "server-variant",
    colorName: "Forged red",
    sizeLabel: "FORGED",
    thumbnailUrl: "https://attacker.example/tracker.png",
    priceSnapshot: 999_999,
    personalizations: ["fiber-laser"],
  }

  assert.deepEqual(resolveSelectedProductsAgainstCatalog([submitted], lookup()), [
    {
      slug: "server-product",
      name: "Server product",
      category: "server/category",
      quantity: 3,
      supplierId: "server-supplier",
      supplierSku: "SERVER-SKU",
      variantKey: "server-variant",
      colorName: "Server blue",
      sizeLabel: "XL",
      priceSnapshot: 15.75,
      personalizations: ["uv-print", "co2"],
    },
  ])
})

test("a product without a selected variant uses the authoritative base product", () => {
  const submitted: OfferItem = {
    slug: "server-product",
    name: "Old product name",
    category: "old/category",
    quantity: 2,
    colorName: "Client-only colour",
    sizeLabel: "Client-only size",
    priceSnapshot: 1,
  }

  const [resolved] = resolveSelectedProductsAgainstCatalog(
    [submitted],
    lookup(),
  ) ?? []

  assert.equal(resolved.priceSnapshot, 12.5)
  assert.equal(resolved.colorName, undefined)
  assert.equal(resolved.sizeLabel, undefined)
  assert.equal(resolved.variantKey, undefined)
})

test("authorized personalization options survive catalog resolution", () => {
  const decorationOptions = {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "uv-print" as const,
    uvFormat: "large-a4" as const,
    varnish: true,
  }
  const submitted: OfferItem = {
    slug: "server-product",
    name: "Server product",
    category: "server/category",
    quantity: 4,
    personalizations: ["uv-print"],
    decorationOptions,
  }

  const [resolved] = resolveSelectedProductsAgainstCatalog(
    [submitted],
    lookup(),
  ) ?? []

  assert.deepEqual(resolved.decorationOptions, decorationOptions)
  assert.deepEqual(resolved.personalizations, ["uv-print", "co2"])
})

test("a client cannot enable a personalization method missing from the catalog", () => {
  const submitted: OfferItem = {
    slug: "server-product",
    name: "Server product",
    category: "server/category",
    quantity: 1,
    personalizations: ["fiber-laser"],
    decorationOptions: {
      ...DEFAULT_DECORATION_OPTIONS,
      method: "fiber-laser",
    },
  }

  assert.equal(
    resolveSelectedProductsAgainstCatalog([submitted], lookup()),
    null,
  )
})

test("unknown products and unavailable variants are rejected", () => {
  const base: OfferItem = {
    slug: "server-product",
    name: "Server product",
    category: "server/category",
    quantity: 1,
  }

  assert.equal(
    resolveSelectedProductsAgainstCatalog(
      [base],
      lookup(product({ slug: "different-product" })),
    ),
    null,
  )
  assert.equal(
    resolveSelectedProductsAgainstCatalog(
      [{ ...base, variantKey: "missing-variant" }],
      lookup(),
    ),
    null,
  )
})

test("Macma products without fresh supplier methods cannot use stale calculator methods", () => {
  const staleMacma = product({
    supplierId: "macma",
    supplierPersonalizations: [],
    personalizations: ["uv-print"],
  })
  const base: OfferItem = {
    slug: staleMacma.slug,
    name: staleMacma.name,
    category: staleMacma.category,
    quantity: 1,
    personalizations: ["uv-print"],
  }

  assert.deepEqual(
    resolveSelectedProductsAgainstCatalog([base], lookup(staleMacma)),
    [
      {
        slug: staleMacma.slug,
        name: staleMacma.name,
        category: staleMacma.category,
        quantity: 1,
        supplierId: staleMacma.supplierId,
        supplierSku: staleMacma.supplierSku,
        priceSnapshot: staleMacma.price,
        personalizations: [],
      },
    ],
  )
  assert.equal(
    resolveSelectedProductsAgainstCatalog(
      [
        {
          ...base,
          decorationOptions: {
            ...DEFAULT_DECORATION_OPTIONS,
            method: "uv-print",
          },
        },
      ],
      lookup(staleMacma),
    ),
    null,
  )
})
