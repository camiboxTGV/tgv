import assert from "node:assert/strict"
import test from "node:test"
import {
  deserializeFromUrl,
  hasOfferCapacity,
  isSafeOfferThumbnailUrl,
  MAX_OFFER_ITEMS,
  MAX_OFFER_REQUEST_JSON_CHARS,
  OFFER_STORAGE_KEY,
  OFFER_STORAGE_KEY_V1,
  readOfferResult,
  serializeForUrl,
  type OfferItem,
} from "./storage.ts"
import { offerThumbnailFor } from "./thumbnail.ts"
import { DEFAULT_DECORATION_OPTIONS } from "../pricing/calculator.ts"

const baseItem: OfferItem = {
  slug: "travel-mug",
  name: "Travel mug",
  category: "drinkware/travel-mugs",
  quantity: 2,
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return [...values.keys()][index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

function withBrowserStorage<T>(storage: Storage, run: () => T): T {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  })
  try {
    return run()
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow)
    } else {
      Reflect.deleteProperty(globalThis, "window")
    }
  }
}

test("offer URL serialization preserves a safe product thumbnail", () => {
  const thumbnailUrl = "/api/catalog-image/travel-mug/2/version"
  const encoded = serializeForUrl([{ ...baseItem, thumbnailUrl }])

  assert.deepEqual(deserializeFromUrl(encoded), [
    { ...baseItem, thumbnailUrl },
  ])
})

test("legacy offer lines without thumbnails remain valid", () => {
  const encoded = serializeForUrl([baseItem])

  assert.deepEqual(deserializeFromUrl(encoded), [baseItem])
})

test("offer URL serialization preserves selected personalization options", () => {
  const decorationOptions = {
    ...DEFAULT_DECORATION_OPTIONS,
    method: "uv-print" as const,
    uvFormat: "large-a4" as const,
    difficultShape: true,
    sample: true,
  }
  const item = {
    ...baseItem,
    personalizations: ["uv-print" as const, "co2" as const],
    decorationOptions,
  }

  assert.deepEqual(deserializeFromUrl(serializeForUrl([item])), [item])
})

test("offer decoding returns canonical method-specific personalization options", () => {
  const item = {
    ...baseItem,
    personalizations: ["textile-transfer" as const],
    decorationOptions: {
      ...DEFAULT_DECORATION_OPTIONS,
      method: "textile-transfer" as const,
      textileFormat: "20x30" as const,
      printColors: 2 as const,
      handlingRate: 0.05 as const,
      varnish: true,
    },
  }

  assert.deepEqual(deserializeFromUrl(serializeForUrl([item])), [
    {
      ...item,
      decorationOptions: {
        ...DEFAULT_DECORATION_OPTIONS,
        method: "textile-transfer",
        textileFormat: "20x30",
        printColors: 2,
      },
    },
  ])
})

test("offer decoding discards unknown fields before enforcing the request cap", () => {
  const encoded = serializeForUrl([
    {
      ...baseItem,
      padding: "x".repeat(MAX_OFFER_REQUEST_JSON_CHARS),
      futureMetadata: { shouldNotSurvive: true },
    } as OfferItem,
  ])

  const decoded = deserializeFromUrl(encoded)

  assert.deepEqual(decoded, [baseItem])
  assert.ok(JSON.stringify(decoded).length <= MAX_OFFER_REQUEST_JSON_CHARS)
})

test("unsafe optional thumbnails are removed without dropping the offer line", () => {
  const encoded = Buffer.from(
    JSON.stringify([
      { ...baseItem, thumbnailUrl: "https://untrusted.example/product.jpg" },
    ]),
    "utf8",
  ).toString("base64url")

  assert.deepEqual(deserializeFromUrl(encoded), [baseItem])
  assert.equal(isSafeOfferThumbnailUrl("//untrusted.example/product.jpg"), false)
  assert.equal(isSafeOfferThumbnailUrl("/images/products/mug.jpg"), true)
})

test("a malformed URL line rejects the complete legacy payload", () => {
  const encoded = Buffer.from(
    JSON.stringify([
      baseItem,
      {
        slug: "broken-item",
        name: "Broken item",
        category: "broken/category",
        quantity: 0,
      },
    ]),
    "utf8",
  ).toString("base64url")

  assert.equal(deserializeFromUrl(encoded), null)
  assert.equal(deserializeFromUrl("not%base64url"), null)
})

test("duplicate logical offer lines reject the complete payload", () => {
  assert.equal(
    deserializeFromUrl(
      serializeForUrl([
        baseItem,
        { ...baseItem, name: "Duplicate", quantity: 3 },
      ]),
    ),
    null,
  )
})

test("malformed local storage reports an error without dropping only bad lines", () => {
  const raw = JSON.stringify([
    baseItem,
    {
      slug: "broken-item",
      name: "Broken item",
      category: "broken/category",
      quantity: 0,
    },
  ])
  const storage = memoryStorage({ [OFFER_STORAGE_KEY]: raw })

  withBrowserStorage(storage, () => {
    assert.deepEqual(readOfferResult(), { items: [], error: "invalid" })
    assert.equal(storage.getItem(OFFER_STORAGE_KEY), raw)
  })
})

test("offer capacity accepts the 50th line and rejects a 51st line", () => {
  const atLimit = Array.from({ length: MAX_OFFER_ITEMS }, (_, index) => ({
    ...baseItem,
    slug: `product-${index}`,
  }))

  assert.equal(hasOfferCapacity(atLimit.slice(0, -1)), true)
  assert.equal(hasOfferCapacity(atLimit), false)
  assert.equal(deserializeFromUrl(serializeForUrl(atLimit))?.length, MAX_OFFER_ITEMS)
  assert.equal(
    deserializeFromUrl(
      serializeForUrl([
        ...atLimit,
        { ...baseItem, slug: `product-${MAX_OFFER_ITEMS}` },
      ]),
    ),
    null,
  )
})

test("legacy storage migration is all-or-nothing", () => {
  const invalidLegacy = JSON.stringify([baseItem, { ...baseItem, quantity: 1.5 }])
  const invalidStorage = memoryStorage({
    [OFFER_STORAGE_KEY_V1]: invalidLegacy,
  })

  withBrowserStorage(invalidStorage, () => {
    assert.deepEqual(readOfferResult(), { items: [], error: "invalid" })
    assert.equal(invalidStorage.getItem(OFFER_STORAGE_KEY), null)
    assert.equal(invalidStorage.getItem(OFFER_STORAGE_KEY_V1), invalidLegacy)
  })

  const duplicateLegacy = JSON.stringify([
    baseItem,
    { ...baseItem, quantity: 3 },
  ])
  const duplicateStorage = memoryStorage({
    [OFFER_STORAGE_KEY_V1]: duplicateLegacy,
  })
  withBrowserStorage(duplicateStorage, () => {
    assert.deepEqual(readOfferResult(), { items: [], error: "invalid" })
    assert.equal(duplicateStorage.getItem(OFFER_STORAGE_KEY), null)
    assert.equal(duplicateStorage.getItem(OFFER_STORAGE_KEY_V1), duplicateLegacy)
  })

  const validStorage = memoryStorage({
    [OFFER_STORAGE_KEY_V1]: JSON.stringify([baseItem]),
  })
  withBrowserStorage(validStorage, () => {
    assert.deepEqual(readOfferResult(), { items: [baseItem], error: null })
    assert.equal(validStorage.getItem(OFFER_STORAGE_KEY), JSON.stringify([baseItem]))
    assert.equal(validStorage.getItem(OFFER_STORAGE_KEY_V1), null)
  })

  const blockedStorage = memoryStorage({
    [OFFER_STORAGE_KEY_V1]: JSON.stringify([baseItem]),
  })
  blockedStorage.setItem = () => {
    throw new Error("storage unavailable")
  }
  withBrowserStorage(blockedStorage, () => {
    assert.deepEqual(readOfferResult(), { items: [baseItem], error: null })
    assert.equal(blockedStorage.getItem(OFFER_STORAGE_KEY_V1), JSON.stringify([baseItem]))
  })
})

test("offer thumbnails prefer the selected variant's first usable image", () => {
  const product = { images: ["/image-0.jpg", "/image-1.jpg", "/image-2.jpg"] }

  assert.equal(
    offerThumbnailFor(product, { imageRefs: [2, 1] }),
    "/image-2.jpg",
  )
  assert.equal(
    offerThumbnailFor(product, { imageRefs: [99] }),
    "/image-0.jpg",
  )
  assert.equal(offerThumbnailFor({ images: [] }, null), undefined)
})
