import assert from "node:assert/strict"
import test from "node:test"
import {
  compareCatalogSort,
  normalizeSearchSort,
  type SearchSort,
} from "./sorting.ts"

const available = { name: "Bravo 2", price: 5, stockLevel: "in-stock" as const }
const unavailable = { name: "Alpha 10", price: 10, stockLevel: "out-of-stock" as const }

test("unknown search sorts fall back to relevance", () => {
  assert.equal(normalizeSearchSort(undefined), "relevance")
  assert.equal(normalizeSearchSort("unknown"), "relevance")
  assert.equal(normalizeSearchSort("price-asc"), "price-asc")
})

test("price sorting works in both directions", () => {
  assert.ok(compareCatalogSort(available, unavailable, "price-asc") < 0)
  assert.ok(compareCatalogSort(available, unavailable, "price-desc") > 0)
})

test("name sorting is numeric and case insensitive", () => {
  const later = { ...available, name: "item 10" }
  const earlier = { ...available, name: "Item 2" }
  assert.ok(compareCatalogSort(earlier, later, "name-asc") < 0)
})

test("availability sorting puts in-stock products first", () => {
  assert.ok(compareCatalogSort(available, unavailable, "availability") < 0)
})

test("relevance leaves ordering to the relevance comparator", () => {
  const sort: SearchSort = "relevance"
  assert.equal(compareCatalogSort(available, unavailable, sort), 0)
})
