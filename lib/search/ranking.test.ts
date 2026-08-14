import assert from "node:assert/strict"
import test from "node:test"
import {
  compareSearchCandidates,
  normalizeSearchText,
  searchQueryTokens,
  searchRelevanceScore,
  searchPriority,
  type SearchRankFields,
} from "./ranking.ts"

function item(overrides: Partial<SearchRankFields>): SearchRankFields {
  return {
    name: "Canvas shopping bag",
    supplierSku: "60058",
    brand: "Macma",
    categoryLabel: "Bags / Shopping bags / Cotton and canvas",
    stockLevel: "in-stock",
    ...overrides,
  }
}

test("search normalization is case, punctuation, and diacritic insensitive", () => {
  assert.equal(normalizeSearchText("  Șapcă–ROȘIE  "), "sapca rosie")
})

test("multi-word search tokens ignore filler words and remove duplicates", () => {
  assert.deepEqual(searchQueryTokens("Pen with LED pen"), ["pen", "led"])
  assert.deepEqual(searchQueryTokens("de cu"), ["de", "cu"])
})

test("exact SKU and exact name matches outrank prefixes and fuzzy matches", () => {
  assert.equal(searchPriority(item({ supplierSku: "60058" }), "60058"), 0)
  assert.equal(searchPriority(item({ name: "Canvas shopping bag" }), "canvas shopping bag"), 1)
  assert.equal(searchPriority(item({ supplierSku: "60058-A" }), "60058"), 2)
  assert.equal(searchPriority(item({ name: "Canvas shopping bag" }), "canvas"), 3)
})

test("multi-word searches match name words regardless of query order", () => {
  assert.equal(searchPriority(item({}), "bag canvas"), 4)
})

test("typo relevance prefers canvas over a similarly spelled cans match", () => {
  const canvas = item({
    name: "Canvas weekender",
    categoryLabel: "Bags / Travel bags",
  })
  const cans = item({
    name: "Polyester cooler bag, 6 cans",
    categoryLabel: "Bags / Cooler bags",
  })
  assert.ok(searchRelevanceScore(canvas, "canvs bag") < searchRelevanceScore(cans, "canvs bag"))
})

test("Fuse relevance sorts before stock when semantic priority is equal", () => {
  const betterFuzzy = { item: item({ stockLevel: "out-of-stock" }), score: 0.05 }
  const weakerFuzzy = {
    item: item({ name: "Canvas shopper", stockLevel: "in-stock" }),
    score: 0.2,
  }
  assert.ok(compareSearchCandidates(betterFuzzy, weakerFuzzy, "canvs") < 0)
})

test("stock breaks ties without hiding unavailable matching products", () => {
  const available = { item: item({ stockLevel: "in-stock" }), score: 0.1 }
  const unavailable = { item: item({ stockLevel: "out-of-stock" }), score: 0.1 }
  assert.ok(compareSearchCandidates(available, unavailable, "canvas") < 0)
})
