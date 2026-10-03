import type { Personalization } from "@/lib/content/catalog"
import {
  lineKey,
  MAX_OFFER_ITEMS,
  MAX_OFFER_REQUEST_JSON_CHARS,
  type OfferItem,
} from "../offer/storage.ts"
import { parseDecorationOptions } from "../pricing/decoration-options.ts"

export const MAX_SELECTED_PRODUCTS = MAX_OFFER_ITEMS
export const MAX_SELECTED_PRODUCTS_JSON_CHARS = MAX_OFFER_REQUEST_JSON_CHARS

const MAX_QUANTITY = 1_000_000
const MAX_PRICE_SNAPSHOT = 1_000_000_000
const PERSONALIZATIONS = new Set<Personalization>([
  "co2",
  "fiber-laser",
  "uv-print",
  "pad-screen",
  "textile-transfer",
  "uv-transfer",
])

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > maxLength) return undefined
  return normalized
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value === undefined) return undefined
  return boundedString(value, maxLength)
}

export function parseSelectedProducts(raw: unknown): OfferItem[] | null {
  if (raw === null || raw === "") return []
  if (
    typeof raw !== "string" ||
    raw.length > MAX_SELECTED_PRODUCTS_JSON_CHARS
  ) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_SELECTED_PRODUCTS) return null

  const items: OfferItem[] = []
  const seenLineKeys = new Set<string>()
  for (const value of parsed) {
    if (!value || typeof value !== "object") return null
    const candidate = value as Record<string, unknown>
    const slug = boundedString(candidate.slug, 200)
    const name = boundedString(candidate.name, 300)
    const category = boundedString(candidate.category, 500)
    const quantity = candidate.quantity
    if (
      !slug ||
      !name ||
      !category ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return null
    }

    const item: OfferItem = { slug, name, category, quantity }
    const optionalFields = [
      ["supplierId", 100],
      ["supplierSku", 200],
      ["variantKey", 500],
      ["colorName", 200],
      ["sizeLabel", 100],
    ] as const
    for (const [field, maxLength] of optionalFields) {
      const original = candidate[field]
      const normalized = optionalString(original, maxLength)
      if (original !== undefined && !normalized) return null
      if (normalized) item[field] = normalized
    }

    if (candidate.priceSnapshot !== undefined) {
      if (
        typeof candidate.priceSnapshot !== "number" ||
        !Number.isFinite(candidate.priceSnapshot) ||
        candidate.priceSnapshot < 0 ||
        candidate.priceSnapshot > MAX_PRICE_SNAPSHOT
      ) {
        return null
      }
      item.priceSnapshot = candidate.priceSnapshot
    }

    if (candidate.personalizations !== undefined) {
      if (
        !Array.isArray(candidate.personalizations) ||
        candidate.personalizations.length > PERSONALIZATIONS.size ||
        !candidate.personalizations.every(
          (method): method is Personalization =>
            typeof method === "string" &&
            PERSONALIZATIONS.has(method as Personalization),
        )
      ) {
        return null
      }
      item.personalizations = [...new Set(candidate.personalizations)]
    }

    if (candidate.decorationOptions !== undefined) {
      const decorationOptions = parseDecorationOptions(candidate.decorationOptions)
      if (
        !decorationOptions ||
        !item.personalizations?.includes(decorationOptions.method)
      ) {
        return null
      }
      item.decorationOptions = decorationOptions
    }

    const key = lineKey(item)
    if (seenLineKeys.has(key)) return null
    seenLineKeys.add(key)
    items.push(item)
  }

  return items
}
