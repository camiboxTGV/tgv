import assert from "node:assert/strict"
import test from "node:test"
import { productCardColourSummary } from "./product-card-colours.ts"

test("product cards keep a single available colour visible", () => {
  const black = { name: "Black", hex: "#000000" }

  assert.deepEqual(productCardColourSummary([black]), {
    visibleSwatches: [black],
    extraCount: 0,
  })
})

test("product cards limit colour bubbles and report the remaining count", () => {
  const swatches = Array.from({ length: 10 }, (_, index) => ({
    name: `Colour ${index + 1}`,
  }))

  assert.deepEqual(productCardColourSummary(swatches), {
    visibleSwatches: swatches.slice(0, 8),
    extraCount: 2,
  })
})

test("product cards handle products without colour information", () => {
  assert.deepEqual(productCardColourSummary(undefined), {
    visibleSwatches: [],
    extraCount: 0,
  })
})
