import assert from "node:assert/strict"
import test from "node:test"
import {
  highlightSearchName,
  parseSearchQuery,
  SearchIndex,
  type SearchIndexSource,
} from "./searchIndex.ts"

interface FixtureItem {
  id: string
  name: string
  stockLevel: "in-stock" | "low" | "out-of-stock"
}

function source(
  id: string,
  name: string,
  overrides: Partial<SearchIndexSource<FixtureItem>> = {},
): SearchIndexSource<FixtureItem> {
  const item: FixtureItem = { id, name, stockLevel: "in-stock" }
  return {
    item,
    name,
    codes: [],
    brand: "",
    category: "",
    summary: "",
    keywords: [],
    stockLevel: item.stockLevel,
    ...overrides,
  }
}

function fixtureIndex(): SearchIndex<FixtureItem> {
  return new SearchIndex([
    source("canvas", "Canvas shopping bag", {
      codes: ["60058", "60058-03"],
      category: "Bags / Shopping bags / Cotton and canvas",
      keywords: ["blue", "cotton"],
    }),
    source("cans", "Polyester cooler bag, 6 cans", {
      codes: ["BAG-6"],
      category: "Bags / Cooler bags",
    }),
    source("pen", "Metal pen", {
      codes: ["PEN-1", "PENONLY"],
      category: "Office / Ball pens",
      keywords: ["metal"],
    }),
    source("pixel", "Pixel trousers", {
      codes: ["PIXEL-1"],
      category: "Apparel / Trousers",
    }),
    source("power-bank", "Recycled power bank", {
      codes: ["POWER-1"],
      category: "Electronics / Power banks",
    }),
    source("bottle", "Blue water bottle", {
      codes: ["BOTTLE-1"],
      category: "Drinkware / Water bottles",
    }),
    source("shirt", "Cotton T-shirt", {
      codes: ["SHIRT-1"],
      category: "Apparel / T-shirts",
      keywords: ["red", "cotton"],
    }),
    source("hanger", "Hanger REF-SHIRT", {
      codes: ["HANGER.RED"],
      category: "Apparel / Workwear",
    }),
    source("variant-code-color", "Starworld Performance Raglan T", {
      codes: ["SW300.RED-L"],
      category: "Apparel / T-shirts",
    }),
    source("notebook", "Recycled notebook", {
      codes: ["NOTE-1"],
      category: "Office / Notebooks",
    }),
    source("notebok-typo", "Notebok Dale", {
      codes: ["NOTE-2"],
      category: "Office / Notebooks",
    }),
    source("summary-only", "Desk organiser", {
      codes: ["DESK-1"],
      summary: "Includes a pen holder",
    }),
    source("duplicate-macma", "Mark Twain ball pen", {
      codes: ["10612"],
      keywords: ["macma"],
    }),
    source("duplicate-cifra", "Santa hat headband", {
      codes: ["10612"],
      keywords: ["cifra"],
    }),
  ])
}

test("exact supplier and variant codes bypass fuzzy neighbors", () => {
  const index = fixtureIndex()
  assert.deepEqual(index.search("60058").map((hit) => hit.item.id), ["canvas"])
  assert.deepEqual(index.search("60058-03").map((hit) => hit.item.id), ["canvas"])
  assert.deepEqual(index.search("PENONLY").map((hit) => hit.item.id), ["pen"])
})

test("colliding supplier codes retain every product and can be disambiguated", () => {
  const index = fixtureIndex()
  assert.deepEqual(
    new Set(index.search("10612").map((hit) => hit.item.id)),
    new Set(["duplicate-macma", "duplicate-cifra"]),
  )
  assert.equal(index.search("10612 macma")[0]?.item.id, "duplicate-macma")
  assert.equal(index.search("10612 cifra")[0]?.item.id, "duplicate-cifra")
})

test("multi-word retrieval is order independent and typo tolerant", () => {
  const index = fixtureIndex()
  assert.equal(index.search("bag canvas")[0]?.item.id, "canvas")
  assert.equal(index.search("canvs bag")[0]?.item.id, "canvas")
  assert.deepEqual(
    new Set(index.search("notebok").map((hit) => hit.item.id)),
    new Set(["notebook", "notebok-typo"]),
  )
  assert.equal(index.search("pne").some((hit) => hit.item.id === "pen"), true)
})

test("Romanian concepts, colors, and product phrases map to English catalog text", () => {
  const index = fixtureIndex()
  assert.match(index.search("pix")[0]?.item.name ?? "", /pen/i)
  assert.equal(index.search("pix metalic")[0]?.item.id, "pen")
  assert.equal(index.search("baterie externa")[0]?.item.id, "power-bank")
  assert.equal(index.search("sticlă apă")[0]?.item.id, "bottle")
  assert.equal(index.search("tricou roșu")[0]?.item.id, "shirt")
  assert.equal(index.search("red tshirt")[0]?.item.id, "shirt")
})

test("translated single words outrank accidental raw-language prefixes", () => {
  const index = new SearchIndex([
    source("pen", "Metal pen"),
    source("pixel", "Pixel trousers"),
    source("mug", "Ceramic mug"),
    source("canary", "Canary item"),
  ])
  assert.equal(index.search("pix")[0]?.item.id, "pen")
  assert.equal(index.search("cană")[0]?.item.id, "mug")
})

test("name matches outrank the same word found only in a summary", () => {
  const index = fixtureIndex()
  const results = index.search("pen")
  assert.match(results[0]?.item.name ?? "", /pen/i)
  assert.ok(results.findIndex((hit) => hit.item.id === "summary-only") > 0)
})

test("an unknown extra word degrades with a penalty instead of erasing useful results", () => {
  const index = fixtureIndex()
  assert.equal(index.search("canvas unknownword")[0]?.item.id, "canvas")
})

test("a known word on another product does not disable partial fallback", () => {
  const index = new SearchIndex([
    source("canvas", "Canvas bag"),
    source("unicorn", "Unicorn toy"),
  ])
  assert.equal(index.search("canvas unicorn")[0]?.item.id, "canvas")

  const indexWithStrictMatch = new SearchIndex([
    source("canvas", "Canvas bag"),
    source("unicorn", "Unicorn toy"),
    source("strict", "Canvas unicorn ornament"),
  ])
  assert.deepEqual(
    indexWithStrictMatch.search("canvas unicorn").map((hit) => hit.item.id),
    ["strict"],
  )
})

test("exact attributes outrank unrelated fuzzy name neighbors", () => {
  const index = new SearchIndex([
    source("fuzzy-name", "Bed linen"),
    source("exact-color", "Blue bottle", { keywords: ["red"] }),
  ])
  assert.equal(index.search("red")[0]?.item.id, "exact-color")
})

test("fuzzy name evidence cannot erase exact attributes on the same product", () => {
  const index = new SearchIndex([
    source("exact-color", "Bed bottle", { keywords: ["red"] }),
    source("summary-only", "Desk item", { summary: "red" }),
  ])
  assert.equal(index.search("red")[0]?.item.id, "exact-color")
})

test("multiple exact attributes outrank multiple fuzzy name neighbors", () => {
  const index = new SearchIndex([
    source("fuzzy-name", "Bed cotten"),
    source("exact-attributes", "Blue bottle", { keywords: ["red", "cotton"] }),
  ])
  assert.equal(index.search("red cotton")[0]?.item.id, "exact-attributes")
})

test("name highlights use source-string offsets after typo correction", () => {
  const index = fixtureIndex()
  const result = index.search("canvs bag")[0]
  assert.equal(result?.item.id, "canvas")
  assert.deepEqual(
    highlightSearchName(result?.item.name ?? "", result?.nameMatchTokens ?? []),
    [[0, 5], [16, 18]],
  )
})

test("query analysis folds accents and prefers translated intent", () => {
  const parsed = parseSearchQuery("  ȘAPCĂ roșie  ")
  assert.equal(parsed.normalized, "cap red")
  assert.equal(parsed.originalNormalized, "sapca rosie")
  assert.deepEqual(parsed.terms.map((term) => term.token), ["cap", "red"])
  assert.deepEqual(
    parseSearchQuery("bags bag bags bag bags bag bags bag red").terms.map(
      (term) => term.token,
    ),
    ["bag", "red"],
  )
})

test("literal full names outrank canonicalized plural and stop-word variants", () => {
  const index = new SearchIndex([
    source("plural", "Water bottles"),
    source("singular", "Water bottle"),
    source("with-stop-word", "Bottle with strap"),
    source("without-stop-word", "Bottle strap"),
  ])
  assert.equal(index.search("Water bottles")[0]?.item.id, "plural")
  assert.equal(index.search("Bottle with strap")[0]?.item.id, "with-stop-word")
})

test("a weak all-summary match does not suppress a stronger partial name match", () => {
  const index = new SearchIndex([
    source("strong-partial", "Canvas bag"),
    source("weak-strict", "Desk organiser", {
      summary: "A canvas bag for carrying the included unicorn ornament",
    }),
  ])
  assert.equal(index.search("canvas bag unicorn")[0]?.item.id, "strong-partial")
})

test("a weak two-term summary match does not suppress a stronger name partial", () => {
  const index = new SearchIndex([
    source("strong-partial", "Canvas bag"),
    source("weak-strict", "Desk organiser", {
      summary: "A canvas unicorn ornament",
    }),
  ])
  assert.equal(index.search("canvas unicorn")[0]?.item.id, "strong-partial")
})

test("short alphabetic codes do not monopolize ordinary typeahead", () => {
  const sources = [
    source("exact-code", "Badge holder", { codes: ["CT"] }),
    source("text-result", "CT document bag", { codes: ["BAG-1"] }),
  ]
  const uppercaseFirst = new SearchIndex(sources)
  assert.deepEqual(uppercaseFirst.search("CT").map((hit) => hit.item.id), ["exact-code"])
  const lowercaseAfter = uppercaseFirst.search("ct")
  assert.equal(lowercaseAfter[0]?.item.id, "exact-code")
  assert.equal(lowercaseAfter.some((hit) => hit.item.id === "text-result"), true)

  const lowercaseFirst = new SearchIndex(sources)
  assert.equal(lowercaseFirst.search("ct").some((hit) => hit.item.id === "text-result"), true)
  assert.deepEqual(lowercaseFirst.search("CT").map((hit) => hit.item.id), ["exact-code"])
})

test("short punctuated codes survive empty text tokenization", () => {
  const index = new SearchIndex([
    source("punctuated-code", "Cable tie", { codes: ["C-T"] }),
  ])
  assert.deepEqual(index.search("c-t").map((hit) => hit.item.id), ["punctuated-code"])
})

test("alphabetic code prefixes receive case-insensitive code-prefix priority", () => {
  const index = new SearchIndex([
    source("code-prefix", "Unrelated product", { codes: ["PAVA123"] }),
    source("text-prefix", "Pavane gift", { codes: ["GIFT-1"] }),
  ])
  assert.equal(index.search("PAVA")[0]?.item.id, "code-prefix")
  assert.equal(index.search("pava")[0]?.item.id, "code-prefix")
})
