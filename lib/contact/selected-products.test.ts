import assert from "node:assert/strict"
import test from "node:test"
import {
  MAX_SELECTED_PRODUCTS,
  parseSelectedProducts,
} from "./selected-products.ts"
import { DEFAULT_DECORATION_OPTIONS } from "../pricing/calculator.ts"

test("selected products are rebuilt from bounded known fields", () => {
  const parsed = parseSelectedProducts(
    JSON.stringify([
      {
        slug: " product-1 ",
        name: " Product one ",
        category: "catalog/leaf",
        quantity: 2,
        supplierSku: " SKU-1 ",
        priceSnapshot: 12.5,
        personalizations: ["uv-print", "uv-print"],
        decorationOptions: {
          ...DEFAULT_DECORATION_OPTIONS,
          method: "uv-print",
          uvFormat: "large-a4",
          difficultShape: true,
          unknown: "discard me",
        },
        thumbnailUrl: "https://attacker.example/tracker.png",
        unknown: "discard me",
      },
    ]),
  )

  assert.deepEqual(parsed, [
    {
      slug: "product-1",
      name: "Product one",
      category: "catalog/leaf",
      quantity: 2,
      supplierSku: "SKU-1",
      priceSnapshot: 12.5,
      personalizations: ["uv-print"],
      decorationOptions: {
        ...DEFAULT_DECORATION_OPTIONS,
        method: "uv-print",
        uvFormat: "large-a4",
        difficultShape: true,
      },
    },
  ])
})

test("selected products reject malformed optional fields and unsafe quantities", () => {
  const base = {
    slug: "product-1",
    name: "Product one",
    category: "catalog/leaf",
    quantity: 1,
  }

  assert.equal(
    parseSelectedProducts(JSON.stringify([{ ...base, supplierSku: {} }])),
    null,
  )
  assert.equal(
    parseSelectedProducts(JSON.stringify([{ ...base, quantity: 1.5 }])),
    null,
  )
  assert.equal(
    parseSelectedProducts(JSON.stringify([{ ...base, priceSnapshot: Infinity }])),
    null,
  )
  assert.equal(
    parseSelectedProducts(
      JSON.stringify([
        {
          ...base,
          personalizations: ["uv-print"],
          decorationOptions: {
            ...DEFAULT_DECORATION_OPTIONS,
            method: "co2",
          },
        },
      ]),
    ),
    null,
  )
  assert.equal(
    parseSelectedProducts(
      JSON.stringify([
        {
          ...base,
          personalizations: ["uv-print"],
          decorationOptions: {
            ...DEFAULT_DECORATION_OPTIONS,
            artworkHours: -1,
          },
        },
      ]),
    ),
    null,
  )
})

test("selected products reject oversized lists and malformed JSON", () => {
  const item = {
    slug: "product-1",
    name: "Product one",
    category: "catalog/leaf",
    quantity: 1,
  }
  assert.equal(parseSelectedProducts("{"), null)
  assert.equal(
    parseSelectedProducts(
      JSON.stringify(Array.from({ length: MAX_SELECTED_PRODUCTS + 1 }, () => item)),
    ),
    null,
  )
})

test("selected products reject duplicate logical lines", () => {
  const duplicate = {
    slug: "duplicate-product",
    name: "Duplicate product",
    category: "bags",
    quantity: 1,
    variantKey: "same-variant",
  }

  assert.equal(
    parseSelectedProducts(
      JSON.stringify([duplicate, { ...duplicate, quantity: 2 }]),
    ),
    null,
  )
})
