import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_DECORATION_OPTIONS } from "./calculator.ts"
import {
  MAX_ARTWORK_HOURS,
  clampArtworkHours,
  normalizeDecorationOptions,
  parseDecorationOptions,
} from "./decoration-options.ts"

test("artwork hours are clamped to the parser's accepted range", () => {
  assert.equal(clampArtworkHours(1.25), 1.25)
  assert.equal(clampArtworkHours(-1), 0)
  assert.equal(clampArtworkHours(Number.NaN), 0)
  assert.equal(clampArtworkHours(MAX_ARTWORK_HOURS + 1), MAX_ARTWORK_HOURS)
})

test("textile transfer drops hidden options and normalizes unsupported handling", () => {
  const stale = {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer" as const,
    textileFormat: "20x30" as const,
    printColors: 4 as const,
    artworkHours: 1.5,
    handlingRate: 0.05 as const,
    named: true,
    difficultShape: true,
    varnish: true,
    luxuryObject: true,
    largeEngraving: true,
    sample: true,
  }

  assert.deepEqual(normalizeDecorationOptions(stale), {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "20x30",
    printColors: 4,
    artworkHours: 1.5,
    handlingRate: 0,
  })
  assert.equal(stale.handlingRate, 0.05)
})

test("normalization preserves only options that apply to the selected method", () => {
  assert.deepEqual(
    normalizeDecorationOptions({
      ...DEFAULT_DECORATION_OPTIONS,
      method: "co2",
      laserSize: "large",
      co2Material: "silicone",
      uvFormat: "large-a4",
      named: true,
      difficultShape: true,
      varnish: true,
      luxuryObject: true,
      largeEngraving: true,
      sample: true,
      printColors: 5,
      textileFormat: "20x30",
      handlingRate: 0.05,
    }),
    {
      ...DEFAULT_DECORATION_OPTIONS,
      method: "co2",
      laserSize: "large",
      co2Material: "silicone",
      named: true,
      luxuryObject: true,
      largeEngraving: true,
      sample: true,
      handlingRate: 0.05,
    },
  )
})

test("parsing applies the same method invariants at storage and request boundaries", () => {
  const parsed = parseDecorationOptions({
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "20x30",
    printColors: 2,
    handlingRate: 0.05,
    named: true,
    sample: true,
    unknown: "discard me",
  })

  assert.deepEqual(parsed, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "20x30",
    printColors: 2,
    handlingRate: 0,
  })
  assert.equal(
    parseDecorationOptions({
      ...DEFAULT_DECORATION_OPTIONS,
      handlingRate: 0.07,
    }),
    null,
  )
})
