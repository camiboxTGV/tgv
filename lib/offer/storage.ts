export const OFFER_STORAGE_KEY = "tgv:offer:v2"
export const OFFER_STORAGE_KEY_V1 = "tgv:offer:v1"

export interface OfferItem {
  slug: string
  name: string
  category: string
  quantity: number
  variantKey?: string
  colorName?: string
  sizeLabel?: string
  priceSnapshot?: number
}

export function lineKey(item: Pick<OfferItem, "slug" | "variantKey">): string {
  return item.variantKey ?? item.slug
}

const isBrowser = () => typeof window !== "undefined"

function isValidItem(value: unknown): value is OfferItem {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (
    typeof v.slug !== "string" ||
    typeof v.name !== "string" ||
    typeof v.category !== "string" ||
    typeof v.quantity !== "number" ||
    !Number.isFinite(v.quantity) ||
    v.quantity < 1
  ) {
    return false
  }
  if (v.variantKey !== undefined && typeof v.variantKey !== "string") return false
  if (v.colorName !== undefined && typeof v.colorName !== "string") return false
  if (v.sizeLabel !== undefined && typeof v.sizeLabel !== "string") return false
  if (
    v.priceSnapshot !== undefined &&
    (typeof v.priceSnapshot !== "number" || !Number.isFinite(v.priceSnapshot))
  ) {
    return false
  }
  return true
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
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.category === "string" &&
    typeof v.quantity === "number" &&
    Number.isFinite(v.quantity) &&
    v.quantity >= 1
  )
}

export function readOffer(): OfferItem[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(OFFER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(isValidItem)
      return []
    }
  } catch {
    // fall through to migration
  }
  const migrated = migrateLegacy()
  if (migrated) {
    writeOffer(migrated)
    try {
      globalThis.localStorage?.removeItem(OFFER_STORAGE_KEY_V1)
    } catch {
      // ignore
    }
  }
  return migrated ?? []
}

function migrateLegacy(): OfferItem[] | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(OFFER_STORAGE_KEY_V1)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter(isValidLegacyItem).map((l) => ({
      slug: l.slug,
      name: l.name,
      category: l.category,
      quantity: l.quantity,
    }))
  } catch {
    return null
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
    let b64 = s.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) b64 += "="
    const json = isBrowser()
      ? decodeURIComponent(escape(window.atob(b64)))
      : Buffer.from(b64, "base64").toString("utf-8")
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return null
    const items = parsed.filter(isValidItem)
    return items
  } catch {
    return null
  }
}
