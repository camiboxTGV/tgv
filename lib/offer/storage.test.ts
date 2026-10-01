import assert from "node:assert/strict"
import test from "node:test"
import {
  deserializeFromUrl,
  isSafeOfferThumbnailUrl,
  serializeForUrl,
  type OfferItem,
} from "./storage.ts"
import { offerThumbnailFor } from "./thumbnail.ts"

const baseItem: OfferItem = {
  slug: "travel-mug",
  name: "Travel mug",
  category: "drinkware/travel-mugs",
  quantity: 2,
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
