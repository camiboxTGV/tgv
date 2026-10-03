import { EMAIL_REGEX } from "./types.ts"

export const CONTACT_FIELD_LIMITS = {
  name: 200,
  email: 254,
  phone: 50,
  company: 200,
  quantityOther: 100,
  deadlineDate: 10,
} as const

export type BoundedContactField = keyof typeof CONTACT_FIELD_LIMITS

export function isWithinContactFieldLimit(
  field: BoundedContactField,
  value: string,
): boolean {
  return value.length <= CONTACT_FIELD_LIMITS[field]
}

export function isValidContactEmail(value: string): boolean {
  const normalized = value.trim()
  return (
    isWithinContactFieldLimit("email", normalized) &&
    EMAIL_REGEX.test(normalized)
  )
}

export function hasContactPhone(value: string): boolean {
  const normalized = value.trim()
  if (
    normalized.length === 0 ||
    !isWithinContactFieldLimit("phone", normalized) ||
    !/^\+?[\d ()./-]+$/.test(normalized)
  ) {
    return false
  }
  const digitCount = normalized.replace(/\D/g, "").length
  return digitCount >= 6 && digitCount <= 15
}

export function isValidContactDateInput(value: string): boolean {
  if (
    !isWithinContactFieldLimit("deadlineDate", value) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false
  }
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function hasRequiredContactDetails(
  email: string,
  phone: string,
): boolean {
  return isValidContactEmail(email) && hasContactPhone(phone)
}
