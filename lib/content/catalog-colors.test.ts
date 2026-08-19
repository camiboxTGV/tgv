import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { catalogColourBackground } from "./catalog-colors.ts"

test("catalog colour backgrounds preserve exact supplier values", () => {
  assert.equal(catalogColourBackground("Red", "#123456"), "#123456")
})

test("catalog colour backgrounds make midocean colour names visually distinct", () => {
  const colours = ["Black", "Blue", "Red", "Beige"].map((name) =>
    catalogColourBackground(name)
  )
  assert.equal(new Set(colours).size, colours.length)
  assert.equal(catalogColourBackground("Royal Blue"), "#1D4ED8")
  assert.match(catalogColourBackground("White/Black"), /^linear-gradient\(/)
  assert.match(catalogColourBackground("Multicolour"), /^conic-gradient\(/)
})

test("catalog colour backgrounds never collapse unknown supplier colours to grey", () => {
  const first = catalogColourBackground("Future supplier colour")
  assert.match(first, /^hsl\(/)
  assert.equal(catalogColourBackground("Future supplier colour"), first)
  assert.notEqual(first, catalogColourBackground("Another supplier colour"))
})

test("every tracked midocean colour has a reviewed semantic background", () => {
  const names = new Set<string>()
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(path)
        continue
      }
      if (!entry.name.endsWith(".json")) continue
      const products = JSON.parse(readFileSync(path, "utf8")) as Array<{
        supplierId: string
        colorSwatches?: Array<{ name: string }>
      }>
      for (const product of products) {
        if (product.supplierId !== "midocean") continue
        for (const colour of product.colorSwatches ?? []) names.add(colour.name)
      }
    }
  }
  walk("lib/content/generated/products")

  const fallbackNames = [...names].filter((name) =>
    catalogColourBackground(name).startsWith("hsl("),
  )
  assert.ok(names.size > 0)
  assert.deepEqual(fallbackNames, [])
})
