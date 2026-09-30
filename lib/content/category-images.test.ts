import assert from "node:assert/strict"
import test from "node:test"
import { catalogImageProxyPath } from "./catalog-images.ts"
import { pickCategoryImage } from "./category-images.ts"

test("category images prefer a non-empty curated image", () => {
  assert.equal(
    pickCategoryImage("/images/categories/bags.webp", [
      { images: ["/api/catalog-image/product/0/version"] },
    ]),
    "/images/categories/bags.webp",
  )
})

test("category images use the first image from the first matching product", () => {
  assert.equal(
    pickCategoryImage(undefined, [
      {
        images: [
          "/api/catalog-image/first/0/version",
          "/api/catalog-image/first/1/version",
        ],
      },
      { images: ["/api/catalog-image/second/0/version"] },
    ]),
    "/api/catalog-image/first/0/version",
  )
})

test("category images skip empty curated and candidate images", () => {
  assert.equal(
    pickCategoryImage("   ", [
      {},
      { images: [] },
      { images: ["", "   "] },
      { images: ["", "/api/catalog-image/available/0/version"] },
    ]),
    "/api/catalog-image/available/0/version",
  )
})

test("category images preserve proxied product image paths", () => {
  const proxyPath = catalogImageProxyPath(
    "bluecollection-20251",
    0,
    "https://bluecollection.eu/assets/img/20251.jpg",
  )

  assert.equal(pickCategoryImage(undefined, [{ images: [proxyPath] }]), proxyPath)
})

test("category images are undefined when no usable image exists", () => {
  assert.equal(
    pickCategoryImage(undefined, [{ images: [] }, { images: ["", "  "] }]),
    undefined,
  )
})
