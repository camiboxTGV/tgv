import assert from "node:assert/strict"
import test from "node:test"
import {
  catalogImageProxyPath,
  catalogImageVersion,
  isRemoteCatalogImage,
} from "./catalog-images.ts"

test("catalog image proxy paths are stable, versioned, and URL-safe", () => {
  const source = "https://macma.ro/products/jpg/M/6005844_0.jpg"
  const path = catalogImageProxyPath("macma-60058", 0, source)

  assert.match(path, /^\/api\/catalog-image\/macma-60058\/0\/[a-f0-9]{20}$/)
  assert.equal(path, catalogImageProxyPath("macma-60058", 0, source))
  assert.notEqual(catalogImageVersion(source), catalogImageVersion(`${source}?updated=1`))
  assert.equal(/[& ]/.test(path), false)
})

test("local catalog images bypass the proxy", () => {
  assert.equal(isRemoteCatalogImage("/images/categories/bags.webp"), false)
  assert.equal(
    catalogImageProxyPath("bags", 0, "/images/categories/bags.webp"),
    "/images/categories/bags.webp",
  )
})
