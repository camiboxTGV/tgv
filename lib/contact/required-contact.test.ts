import assert from "node:assert/strict"
import test from "node:test"
import {
  CONTACT_FIELD_LIMITS,
  hasContactPhone,
  hasRequiredContactDetails,
  isValidContactDateInput,
  isValidContactEmail,
  isWithinContactFieldLimit,
} from "./required-contact.ts"

test("requires both a valid email address and a phone number", () => {
  assert.equal(hasRequiredContactDetails("ana@example.com", "+40 721 234 567"), true)
  assert.equal(hasRequiredContactDetails("", "+40 721 234 567"), false)
  assert.equal(hasRequiredContactDetails("ana@example.com", ""), false)
  assert.equal(hasRequiredContactDetails("not-an-email", "+40 721 234 567"), false)
})

test("trims contact details before validating them", () => {
  assert.equal(isValidContactEmail("  ana@example.com  "), true)
  assert.equal(hasContactPhone("   "), false)
  assert.equal(hasContactPhone("  +40 721 234 567  "), true)
})

test("email validation enforces the shared transport-safe length bound", () => {
  const domain = "@example.com"
  const atLimit = `${"a".repeat(CONTACT_FIELD_LIMITS.email - domain.length)}${domain}`
  const overLimit = `a${atLimit}`

  assert.equal(atLimit.length, CONTACT_FIELD_LIMITS.email)
  assert.equal(isValidContactEmail(atLimit), true)
  assert.equal(isValidContactEmail(overLimit), false)
})

test("phone validation permits international punctuation but requires 6 to 15 digits", () => {
  assert.equal(hasContactPhone("+40 (721) 234-567"), true)
  assert.equal(hasContactPhone("12345"), false)
  assert.equal(hasContactPhone("123456789012345"), true)
  assert.equal(hasContactPhone("1234567890123456"), false)
  assert.equal(hasContactPhone("call-me"), false)
  assert.equal(hasContactPhone("40+721234567"), false)
  assert.equal(hasContactPhone("123\t456"), false)
  assert.equal(hasContactPhone("123\n456"), false)
})

test("optional contact fields use explicit shared length boundaries", () => {
  assert.equal(
    isWithinContactFieldLimit("name", "a".repeat(CONTACT_FIELD_LIMITS.name)),
    true,
  )
  assert.equal(
    isWithinContactFieldLimit("name", "a".repeat(CONTACT_FIELD_LIMITS.name + 1)),
    false,
  )
  assert.equal(
    isWithinContactFieldLimit(
      "quantityOther",
      "a".repeat(CONTACT_FIELD_LIMITS.quantityOther + 1),
    ),
    false,
  )
})

test("exact deadline dates reject malformed and impossible calendar values", () => {
  assert.equal(isValidContactDateInput("2028-02-29"), true)
  assert.equal(isValidContactDateInput("2027-02-29"), false)
  assert.equal(isValidContactDateInput("2026-02-30"), false)
  assert.equal(isValidContactDateInput("2026-2-03"), false)
  assert.equal(isValidContactDateInput("2026-10-03T00:00:00Z"), false)
})
