import assert from "node:assert/strict"
import test from "node:test"
import { toTimeZoneDateInputValue } from "./local-date.ts"

test("client and API deadline minimums use the same Bucharest calendar day", () => {
  const instant = new Date("2026-10-03T21:30:00.000Z")
  const clientMinimum = toTimeZoneDateInputValue(instant, "Europe/Bucharest")
  const apiToday = toTimeZoneDateInputValue(instant, "Europe/Bucharest")

  assert.equal(clientMinimum, "2026-10-04")
  assert.equal(clientMinimum, apiToday)
})

test("formats server deadlines against the Bucharest calendar day", () => {
  const lateUtcEvening = new Date("2026-10-02T22:30:00.000Z")

  assert.equal(
    toTimeZoneDateInputValue(lateUtcEvening, "Europe/Bucharest"),
    "2026-10-03",
  )
})
