import assert from "node:assert/strict"
import test from "node:test"
import { PRICE_DISCLOSURE, getPriceDisclosure } from "./disclosure.ts"

for (const locale of ["en", "ro"] as const) {
  test(`${locale} price disclosure covers the complete commercial rule`, () => {
    const copy = getPriceDisclosure(locale)

    assert.equal(copy, PRICE_DISCLOSURE[locale])
    assert.match(copy.detailed, /TVA|VAT/)
    assert.match(copy.detailed, /€\s?0|0\s?€/)
    assert.match(copy.detailed, /furnizor|supplier/i)
    assert.match(copy.detailed, /produs|product/i)
    assert.match(copy.detailed, /cantitate|quantity/i)
    assert.match(copy.detailed, /destinație|destination/i)
    assert.match(copy.detailed, /oferta finală|final quote/i)
    assert.match(copy.pendingValue, /oferta finală|final quote/i)
    assert.match(copy.internalQuoteReminder, /transport|supplier/i)
  })
}
