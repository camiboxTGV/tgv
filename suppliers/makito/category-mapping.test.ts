import assert from "node:assert/strict"
import test from "node:test"
import {
  decodeMakitoCategories,
  encodeMakitoCategories,
  mapMakitoCategory,
} from "./category-mapping.ts"

test("Makito categories preserve exact supplier labels in a stable payload", () => {
  const encoded = encodeMakitoCategories([
    "Bags",
    " Shopping bags ",
    "bags",
    "RPET & recycled",
  ])
  assert.deepEqual(decodeMakitoCategories(encoded), [
    "Bags",
    "Shopping bags",
    "RPET & recycled",
  ])
})

test("Makito category mapping uses supplier context plus product detail", () => {
  assert.equal(
    mapMakitoCategory({
      categories: ["Bags", "Shopping bags"],
      name: "Foldable RPET shopping bag",
      material: ["Recycled PET"],
    }),
    "bags/shopping-bags/foldable-bags",
  )
  assert.equal(
    mapMakitoCategory({
      categories: ["Technology", "Charging"],
      name: "Bamboo wireless charger",
    }),
    "electronics/power-and-charging/wireless-chargers",
  )
  assert.equal(
    mapMakitoCategory({
      categories: ["Textile"],
      name: "Unisex hooded sweatshirt",
    }),
    "apparel-and-wearables/sweaters-and-fleece",
  )
  assert.equal(
    mapMakitoCategory({
      categories: ["Writing"],
      name: "Touch stylus pen",
    }),
    "office-and-writing/writing-instruments/stylus-pens",
  )
})

test("Makito category mapping fails closed for unseen products", () => {
  assert.equal(
    mapMakitoCategory({
      categories: ["Unreviewed supplier family"],
      name: "Novel promotional object",
    }),
    null,
  )
  assert.equal(
    mapMakitoCategory({ categories: ["Bags"], name: "Promotional tote bag" }),
    null,
  )
  assert.equal(
    mapMakitoCategory({ categories: ["Drinkware"], name: "Promotional mug" }),
    null,
  )
  assert.throws(
    () => decodeMakitoCategories('{"categories":"Bags"}'),
    /invalid category payload/,
  )
})
