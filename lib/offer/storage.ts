import type { Personalization } from "@/lib/content/catalog"
import type { DecorationOptions } from "@/lib/pricing/calculator"
import { parseDecorationOptions } from "../pricing/decoration-options.ts"

export const OFFER_STORAGE_KEY = "tgv:offer:v2"
export const OFFER_STORAGE_KEY_V1 = "tgv:offer:v1"

export const MAX_OFFER_ITEMS = 50
export const MAX_OFFER_REQUEST_JSON_CHARS = 128 * 1024
const MAX_OFFER_JSON_CHARS = 256 * 1024
const MAX_OFFER_URL_CHARS = 384 * 1024

export interface OfferReadResult {
  items: OfferItem[]
  error: "invalid" | null
}

export interface OfferItem {
  slug: string
  name: string
  category: string
  quantity: number
  supplierId?: string
  supplierSku?: string
  variantKey?: string
  colorName?: string
  sizeLabel?: string
  thumbnailUrl?: string
  priceSnapshot?: number
  personalizations?: Personalization[]
  decorationOptions?: DecorationOptions
}

export function hasOfferCapacity(items: readonly OfferItem[]): boolean {
  return items.length < MAX_OFFER_ITEMS
}

export function lineKey(item: Pick<OfferItem, "slug" | "variantKey">): string {
  return item.variantKey ?? item.slug
}

const isBrowser = () => typeof window !== "undefined"

export function isSafeOfferThumbnailUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 1 &&
    value.length <= 2048 &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001F\u007F]/.test(value)
  )
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function isOptionalBoundedString(
  value: unknown,
  maxLength: number,
): value is string | undefined {
  return value === undefined || isBoundedString(value, maxLength)
}

function isValidItem(value: unknown): value is OfferItem {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (
    !isBoundedString(v.slug, 200) ||
    !isBoundedString(v.name, 300) ||
    !isBoundedString(v.category, 500) ||
    typeof v.quantity !== "number" ||
    !Number.isFinite(v.quantity) ||
    !Number.isInteger(v.quantity) ||
    v.quantity < 1 ||
    v.quantity > 10000
  ) {
    return false
  }
  if (!isOptionalBoundedString(v.variantKey, 500)) return false
  if (!isOptionalBoundedString(v.supplierId, 100)) return false
  if (!isOptionalBoundedString(v.supplierSku, 200)) return false
  if (!isOptionalBoundedString(v.colorName, 200)) return false
  if (!isOptionalBoundedString(v.sizeLabel, 100)) return false
  if (
    v.personalizations !== undefined &&
    (!Array.isArray(v.personalizations) ||
      v.personalizations.length > 6 ||
      !v.personalizations.every((method) =>
        ["co2", "fiber-laser", "uv-print", "pad-screen", "textile-transfer", "uv-transfer"].includes(
          String(method),
        ),
      ))
  ) {
    return false
  }
  if (
    v.priceSnapshot !== undefined &&
    (typeof v.priceSnapshot !== "number" ||
      !Number.isFinite(v.priceSnapshot) ||
      v.priceSnapshot < 0 ||
      v.priceSnapshot > 1_000_000_000)
  ) {
    return false
  }
  if (v.decorationOptions !== undefined) {
    const decorationOptions = parseDecorationOptions(v.decorationOptions)
    if (
      !decorationOptions ||
      !Array.isArray(v.personalizations) ||
      !v.personalizations.includes(decorationOptions.method)
    ) {
      return false
    }
  }
  return true
}

function normalizeItem(value: unknown): OfferItem | null {
  if (!isValidItem(value)) return null

  const normalized: OfferItem = {
    slug: value.slug.trim(),
    name: value.name.trim(),
    category: value.category.trim(),
    quantity: value.quantity,
  }
  if (value.supplierId !== undefined) {
    normalized.supplierId = value.supplierId.trim()
  }
  if (value.supplierSku !== undefined) {
    normalized.supplierSku = value.supplierSku.trim()
  }
  if (value.variantKey !== undefined) {
    normalized.variantKey = value.variantKey.trim()
  }
  if (value.colorName !== undefined) {
    normalized.colorName = value.colorName.trim()
  }
  if (value.sizeLabel !== undefined) {
    normalized.sizeLabel = value.sizeLabel.trim()
  }
  if (isSafeOfferThumbnailUrl(value.thumbnailUrl)) {
    normalized.thumbnailUrl = value.thumbnailUrl
  }
  if (value.priceSnapshot !== undefined) {
    normalized.priceSnapshot = value.priceSnapshot
  }
  if (value.personalizations !== undefined) {
    normalized.personalizations = [...new Set(value.personalizations)]
  }
  if (value.decorationOptions !== undefined) {
    const decorationOptions = parseDecorationOptions(value.decorationOptions)
    if (!decorationOptions) return null
    normalized.decorationOptions = decorationOptions
  }

  return normalized
}

function parseOfferItems(value: unknown): OfferItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_OFFER_ITEMS) return null
  const items: OfferItem[] = []
  const seenLineKeys = new Set<string>()
  for (const candidate of value) {
    const item = normalizeItem(candidate)
    if (!item) return null
    const key = lineKey(item)
    if (seenLineKeys.has(key)) return null
    seenLineKeys.add(key)
    items.push(item)
  }
  if (JSON.stringify(items).length > MAX_OFFER_REQUEST_JSON_CHARS) return null
  return items
}

interface LegacyOfferItem {
  slug: string
  name: string
  category: string
  quantity: number
}

function isValidLegacyItem(value: unknown): value is LegacyOfferItem {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    isBoundedString(v.slug, 200) &&
    isBoundedString(v.name, 300) &&
    isBoundedString(v.category, 500) &&
    typeof v.quantity === "number" &&
    Number.isFinite(v.quantity) &&
    Number.isInteger(v.quantity) &&
    v.quantity >= 1 &&
    v.quantity <= 10000
  )
}

export function readOfferResult(): OfferReadResult {
  if (!isBrowser()) return { items: [], error: null }
  try {
    const raw = window.localStorage.getItem(OFFER_STORAGE_KEY)
    if (raw !== null) {
      if (raw.length > MAX_OFFER_JSON_CHARS) {
        return { items: [], error: "invalid" }
      }
      const parsed = JSON.parse(raw)
      const items = parseOfferItems(parsed)
      return items
        ? { items, error: null }
        : { items: [], error: "invalid" }
    }
  } catch {
    return { items: [], error: "invalid" }
  }

  const migrated = migrateLegacy()
  return migrated ?? { items: [], error: null }
}

export function readOffer(): OfferItem[] {
  return readOfferResult().items
}

function migrateLegacy(): OfferReadResult | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(OFFER_STORAGE_KEY_V1)
    if (!raw) return null
    if (raw.length > MAX_OFFER_JSON_CHARS) {
      return { items: [], error: "invalid" }
    }
    const parsed = JSON.parse(raw)
    if (
      !Array.isArray(parsed) ||
      parsed.length > MAX_OFFER_ITEMS ||
      !parsed.every(isValidLegacyItem)
    ) {
      return { items: [], error: "invalid" }
    }
    const items = parseOfferItems(parsed.map((l) => ({
      slug: l.slug,
      name: l.name,
      category: l.category,
      quantity: l.quantity,
    })))
    if (!items) return { items: [], error: "invalid" }
    try {
      window.localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(items))
      window.localStorage.removeItem(OFFER_STORAGE_KEY_V1)
    } catch {
      // Keep the legacy copy when persistence is unavailable; the in-memory
      // migration remains usable for this browser session.
    }
    return { items, error: null }
  } catch {
    return { items: [], error: "invalid" }
  }
}

export function writeOffer(items: OfferItem[]): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(OFFER_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage full or blocked — silently ignore
  }
}

export function serializeForUrl(items: OfferItem[]): string {
  if (!isBrowser()) {
    return Buffer.from(JSON.stringify(items), "utf-8").toString("base64url")
  }
  const json = JSON.stringify(items)
  const b64 = window.btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function deserializeFromUrl(s: string): OfferItem[] | null {
  try {
    if (
      s.length === 0 ||
      s.length > MAX_OFFER_URL_CHARS ||
      s.length % 4 === 1 ||
      !/^[A-Za-z0-9_-]+$/.test(s)
    ) {
      return null
    }
    let b64 = s.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) b64 += "="
    const bytes = isBrowser()
      ? Uint8Array.from(window.atob(b64), (character) => character.charCodeAt(0))
      : Buffer.from(b64, "base64")
    const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    if (json.length > MAX_OFFER_JSON_CHARS) return null
    const parsed = JSON.parse(json)
    return parseOfferItems(parsed)
  } catch {
    return null
  }
}
