import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_DECORATION_OPTIONS,
  UV_FORMAT_LABELS,
  calculateDecoration,
  type UvFormat,
} from "./calculator.ts"

const UV_FORMATS = Object.keys(UV_FORMAT_LABELS) as UvFormat[]
const UV_ROWS: Array<{
  quantity: number
  rates: Array<number | null>
}> = [
  { quantity: 20, rates: [null, null, null, null, 2, 4] },
  { quantity: 50, rates: [null, null, 0.8, 1.2, 1.87, 3.75] },
  { quantity: 100, rates: [null, 0.55, 0.75, 1.1, 1.8, 3.6] },
  { quantity: 200, rates: [0.28, 0.37, 0.65, 0.95, 1.7, 3.4] },
  { quantity: 500, rates: [0.23, 0.29, 0.6, 0.85, 1.6, 3.2] },
  { quantity: 1000, rates: [0.18, 0.26, 0.55, 0.8, 1.55, 3.1] },
  { quantity: 2000, rates: [0.16, 0.25, 0.5, 0.75, 1.5, 3] },
  { quantity: 2001, rates: [0.15, 0.22, 0.4, 0.7, 1.3, 2.8] },
]

test("direct UV exposes the six source-tariff columns without dropping A3", () => {
  assert.deepEqual(UV_FORMATS, [
    "small",
    "card",
    "medium-a6",
    "large-a5",
    "large-a4",
    "large-a3",
  ])
  assert.match(UV_FORMAT_LABELS["medium-a6"], /A6/)
  assert.match(UV_FORMAT_LABELS["large-a3"], /A3/)
})

for (const row of UV_ROWS) {
  test(`direct UV reproduces every tariff cell at quantity ${row.quantity}`, () => {
    for (const [index, format] of UV_FORMATS.entries()) {
      const result = calculateDecoration(row.quantity, {
        ...DEFAULT_DECORATION_OPTIONS,
        uvFormat: format,
      })
      const rate = row.rates[index]
      const rawExpected = rate === null ? 30 : Math.max(30, rate * row.quantity)
      const expected = Math.round((rawExpected + Number.EPSILON) * 100) / 100
      assert.equal(result.supported, true, format)
      assert.equal(result.unitRate, rate, format)
      assert.equal(result.productionSubtotal, expected, format)
    }
  })
}

test("direct UV keeps the A4 and A3 prices in their correct columns", () => {
  const a4 = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    uvFormat: "large-a4",
  })
  const a3 = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    uvFormat: "large-a3",
  })
  assert.equal(a4.productionSubtotal, 30)
  assert.equal(a3.productionSubtotal, 40)
})

test("direct UV modifiers apply to the flat €30 job price, not a fake unit rate", () => {
  const named = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    named: true,
  })
  const combined = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    named: true,
    difficultShape: true,
    varnish: true,
  })
  assert.equal(named.productionSubtotal, 45)
  assert.equal(combined.productionSubtotal, 135)
})

test("direct UV quantity boundaries select the next tariff row only after the boundary", () => {
  const at100 = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    uvFormat: "card",
  })
  const at101 = calculateDecoration(101, {
    ...DEFAULT_DECORATION_OPTIONS,
    uvFormat: "card",
  })
  assert.equal(at100.unitRate, 0.55)
  assert.equal(at101.unitRate, 0.37)
})

test("fiber laser quantity bands and relevant modifiers are applied", () => {
  const standard = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "fiber-laser",
    laserSize: "medium",
  })
  const namedLuxury = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "fiber-laser",
    laserSize: "medium",
    named: true,
    luxuryObject: true,
  })
  assert.equal(standard.productionSubtotal, 100)
  assert.equal(namedLuxury.productionSubtotal, 300)
})

test("laser modifiers apply after the documented €10 minimum", () => {
  const result = calculateDecoration(1, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "fiber-laser",
    named: true,
  })
  assert.equal(result.productionSubtotal, 15)
})

test("CO2 unsupported combinations and quantities are routed to manual review", () => {
  const largeSilicone = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "co2",
    co2Material: "silicone",
    laserSize: "large",
  })
  const highQuantity = calculateDecoration(501, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "co2",
  })
  assert.equal(largeSilicone.reason, "unsupported-combination")
  assert.equal(highQuantity.reason, "co2-high-quantity")
})

test("pad/screen printing reproduces both ink tables and uses the completed tier", () => {
  const mono = calculateDecoration(75, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "pad-screen",
    printColors: 1,
  })
  const twoComponent = calculateDecoration(10000, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "pad-screen",
    padInkSystem: "two-component",
    printColors: 6,
  })
  assert.equal(mono.unitRate, 0.764)
  assert.equal(mono.productionSubtotal, 57.3)
  assert.equal(twoComponent.unitRate, 0.865)
  assert.equal(twoComponent.productionSubtotal, 8650)
})

test("pad/screen quantities outside the supplied table require review", () => {
  assert.equal(calculateDecoration(49, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "pad-screen",
  }).reason, "pad-low-quantity")
  assert.equal(calculateDecoration(10001, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "pad-screen",
  }).reason, "pad-high-quantity")
})

test("textile transfer bills at least 120 units and keeps the two format tables separate", () => {
  const small = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "10x10",
    printColors: 1,
  })
  const large = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "20x30",
    printColors: 1,
  })
  assert.equal(small.billableQuantity, 120)
  assert.equal(small.productionSubtotal, 63)
  assert.equal(large.productionSubtotal, 100.8)
})

test("textile transfer uses every high-volume endpoint and reviews quantities above it", () => {
  const result = calculateDecoration(10500, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
    textileFormat: "10x10",
    printColors: 6,
  })
  const tooHigh = calculateDecoration(10501, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "textile-transfer",
  })
  assert.equal(result.unitRate, 1.022)
  assert.equal(result.productionSubtotal, 10731)
  assert.equal(tooHigh.reason, "textile-high-quantity")
})

test("method-specific modifiers do not leak after switching techniques", () => {
  const result = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "pad-screen",
    named: true,
    varnish: true,
    difficultShape: true,
    sample: true,
  })
  assert.equal(result.productionSubtotal, 46.5)
  assert.equal(result.sampleSubtotal, 0)
})

test("handling, samples, and artwork processing remain separate transparent subtotals", () => {
  const result = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    handlingRate: 0.1,
    sample: true,
    artworkHours: 1.5,
  })
  assert.equal(result.handlingSubtotal, 10)
  assert.equal(result.sampleSubtotal, 7)
  assert.equal(result.artworkSubtotal, 37.5)
  assert.equal(result.decorationTotal, 84.5)
})

test("legacy UV-transfer data never borrows the direct-UV tariff", () => {
  const result = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "uv-transfer",
  })
  assert.equal(result.supported, false)
  assert.equal(result.reason, "legacy-transfer")
})
