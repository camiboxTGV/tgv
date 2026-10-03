import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_DECORATION_OPTIONS } from "./calculator.ts"
import { summarizeDecorationSelection } from "./decoration-selection.ts"

test("summarizes saved personalization choices and their recalculated price", () => {
  const summary = summarizeDecorationSelection({
    quantity: 2,
    priceSnapshot: 12.5,
    decorationOptions: {
      ...DEFAULT_DECORATION_OPTIONS,
      method: "uv-print",
      uvFormat: "large-a4",
      difficultShape: true,
      sample: true,
      handlingRate: 0.1,
      artworkHours: 0.5,
    },
  })

  assert.equal(summary?.method, "Direct UV print")
  assert.ok(summary?.options.includes("Printed area: Large object · up to A4"))
  assert.ok(summary?.options.some((option) => option.includes("difficult shape")))
  assert.equal(summary?.decorationPrice, "€64.70")
  assert.equal(summary?.lineTotal, "€89.70")
})

test("omits a personalization summary when no calculator choice was saved", () => {
  assert.equal(summarizeDecorationSelection({ quantity: 10 }), null)
})

test("localizes the saved personalization summary for Romanian review", () => {
  const summary = summarizeDecorationSelection(
    {
      quantity: 2,
      decorationOptions: {
        ...DEFAULT_DECORATION_OPTIONS,
        method: "uv-print",
        uvFormat: "large-a4",
        sample: true,
      },
    },
    "ro",
  )

  assert.equal(summary?.method, "Print UV direct")
  assert.ok(summary?.options.includes("Suprafață imprimată: Obiect mare · până la A4"))
  assert.ok(summary?.options.some((option) => option.includes("mostră de producție")))
})
