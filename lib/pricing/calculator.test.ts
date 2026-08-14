import assert from "node:assert/strict"
import test from "node:test"
import {
  DEFAULT_DECORATION_OPTIONS,
  calculateDecoration,
} from "./calculator.ts"

test("UV printing respects the €30 minimum order", () => {
  const result = calculateDecoration(10, DEFAULT_DECORATION_OPTIONS)
  assert.equal(result.supported, true)
  assert.equal(result.productionSubtotal, 30)
  assert.equal(result.decorationTotal, 30)
})

test("UV A4 pricing exceeds the minimum where applicable", () => {
  const result = calculateDecoration(10, {
    ...DEFAULT_DECORATION_OPTIONS,
    uvFormat: "a4",
  })
  assert.equal(result.productionSubtotal, 40)
})

test("fiber laser quantity bands and named-item multiplier are applied", () => {
  const standard = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "fiber-laser",
    laserSize: "medium",
  })
  const named = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "fiber-laser",
    laserSize: "medium",
    named: true,
  })
  assert.equal(standard.productionSubtotal, 100)
  assert.equal(named.productionSubtotal, 150)
})

test("CO2 runs over 500 units are routed to manual review", () => {
  const result = calculateDecoration(501, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "co2",
  })
  assert.equal(result.supported, false)
  assert.match(result.message ?? "", /above 500/i)
})

test("UV transfer never borrows the direct-UV tariff", () => {
  const result = calculateDecoration(100, {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "uv-transfer",
  })
  assert.equal(result.supported, false)
  assert.match(result.message ?? "", /does not define a reliable rate/i)
})
