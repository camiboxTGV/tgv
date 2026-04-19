export const OFFER_STORAGE_KEY = "tgv:offer:v1"

export interface OfferItem {
  slug: string
  name: string
  category: string
  quantity: number
}

const isBrowser = () => typeof window !== "undefined"

function isValidItem(value: unknown): value is OfferItem {
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
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidItem)
  } catch {
    return []
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
