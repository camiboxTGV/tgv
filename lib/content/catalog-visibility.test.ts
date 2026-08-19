import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { CatalogProduct, ProductVariant } from "./catalog.ts"
import { filterCatalogStock, hasCatalogStock } from "./catalog-stock.ts"

test("catalog stock visibility accepts only positive finite quantities", () => {
  assert.equal(hasCatalogStock({ stock: 1 }), true)
  assert.equal(hasCatalogStock({ stock: 0 }), false)
  assert.equal(hasCatalogStock({ stock: -1 }), false)
  assert.equal(hasCatalogStock({ stock: Number.NaN }), false)
})

test("website stock filtering removes zero-stock generated products and variants", () => {
  const category = "accommodation-and-travel/travel-accessories"
  const rawProducts = JSON.parse(
    readFileSync(`lib/content/generated/products/${category}.json`, "utf8"),
  ) as CatalogProduct[]
  const unavailable = rawProducts.find((product) => product.stock === 0)
  assert.ok(unavailable, "tracked catalog fixture must contain a zero-stock product")

  const visible = filterCatalogStock(rawProducts)
  assert.equal(visible.every(hasCatalogStock), true)
  assert.equal(visible.some((product) => product.slug === unavailable.slug), false)

  const productWithUnavailableVariant = visible.find((product) => {
    if (!product.hasVariantDetail) return false
    const variants = JSON.parse(
      readFileSync(`lib/content/generated/variants/${product.slug}.json`, "utf8"),
    ) as Array<{ stock: number }>
    return variants.some((variant) => variant.stock === 0)
  })
  assert.ok(productWithUnavailableVariant, "tracked catalog fixture must contain a mixed-stock product")
  const rawVariants = JSON.parse(
    readFileSync(`lib/content/generated/variants/${productWithUnavailableVariant.slug}.json`, "utf8"),
  ) as ProductVariant[]
  assert.equal(rawVariants.some((variant) => variant.stock === 0), true)
  assert.equal(filterCatalogStock(rawVariants).every(hasCatalogStock), true)
})
