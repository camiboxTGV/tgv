import { createHash } from "node:crypto"

const CATALOG_IMAGE_CACHE_VERSION = "v1"

export function isRemoteCatalogImage(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://")
}

export function catalogImageVersion(sourceUrl: string): string {
  return createHash("sha256")
    .update(`${CATALOG_IMAGE_CACHE_VERSION}\0${sourceUrl}`)
    .digest("hex")
    .slice(0, 20)
}

export function catalogImageProxyPath(
  productSlug: string,
  index: number,
  sourceUrl: string,
): string {
  if (!isRemoteCatalogImage(sourceUrl)) return sourceUrl
  return `/api/catalog-image/${encodeURIComponent(productSlug)}/${index}/${catalogImageVersion(sourceUrl)}`
}
