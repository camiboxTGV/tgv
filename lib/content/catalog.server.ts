import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  descendantLeafPaths,
  findNode,
  isLeaf,
  joinPath,
  leafSlugPaths,
  splitPath,
  type CategoryNode,
} from "./categories"
import type { CatalogProduct, ProductVariant } from "./catalog"
import { filterCatalogStock } from "./catalog-stock"
import {
  catalogImageProxyPath,
  catalogImageVersion,
  isRemoteCatalogImage,
} from "./catalog-images"

const PRODUCTS_DIR = "lib/content/generated/products"
const VARIANTS_DIR = "lib/content/generated/variants"

const cachedCategories = new Map<string, CatalogProduct[]>()
const cachedImageSources = new Map<
  string,
  { supplierId: string; sourceUrls: string[] }
>()
let cachedAllProducts: CatalogProduct[] | null = null
let cachedBySlug: Map<string, CatalogProduct> | null = null

function repoRoot(): string {
  return process.cwd()
}

function loadLeafProducts(slugPath: string): CatalogProduct[] {
  const cached = cachedCategories.get(slugPath)
  if (cached) return cached
  try {
    const txt = readFileSync(join(repoRoot(), PRODUCTS_DIR, `${slugPath}.json`), "utf8")
    const rawList = JSON.parse(txt) as CatalogProduct[]
    const list = filterCatalogStock(rawList).map((product) => {
      const sourceUrls = [...product.images]
      cachedImageSources.set(product.slug, {
        supplierId: product.supplierId,
        sourceUrls,
      })
      return {
        ...product,
        images: sourceUrls.map((sourceUrl, index) =>
          catalogImageProxyPath(product.slug, index, sourceUrl),
        ),
      }
    })
    cachedCategories.set(slugPath, list)
    return list
  } catch {
    cachedCategories.set(slugPath, [])
    return []
  }
}

function loadAllProducts(): CatalogProduct[] {
  if (cachedAllProducts) return cachedAllProducts
  const out: CatalogProduct[] = []
  for (const leaf of leafSlugPaths()) {
    out.push(...loadLeafProducts(joinPath(leaf)))
  }
  cachedAllProducts = out
  return out
}

function bySlugIndex(): Map<string, CatalogProduct> {
  if (cachedBySlug) return cachedBySlug
  const map = new Map<string, CatalogProduct>()
  for (const p of loadAllProducts()) map.set(p.slug, p)
  cachedBySlug = map
  return map
}

export function getProductsByCategoryPath(segments: string[]): CatalogProduct[] {
  const node = findNode(segments)
  if (!node) return []
  if (isLeaf(node)) return loadLeafProducts(joinPath(segments))
  const out: CatalogProduct[] = []
  for (const leaf of descendantLeafPaths(node, segments.slice(0, -1))) {
    out.push(...loadLeafProducts(joinPath(leaf)))
  }
  return out
}

export function getProductsByCategory(slug: string): CatalogProduct[] {
  return getProductsByCategoryPath(splitPath(slug))
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return bySlugIndex().get(slug)
}

export interface CatalogImageSource {
  supplierId: string
  sourceUrl: string
  version: string
}

export function getCatalogImageSource(
  productSlug: string,
  index: number,
): CatalogImageSource | undefined {
  bySlugIndex()
  const cached = cachedImageSources.get(productSlug)
  const sourceUrl = cached?.sourceUrls[index]
  if (!cached || !sourceUrl || !isRemoteCatalogImage(sourceUrl)) return undefined
  return {
    supplierId: cached.supplierId,
    sourceUrl,
    version: catalogImageVersion(sourceUrl),
  }
}

export function countProductsUnder(node: CategoryNode, trail: string[] = []): number {
  const here = [...trail, node.slug]
  if (isLeaf(node)) return loadLeafProducts(joinPath(here)).length
  let total = 0
  for (const child of node.children ?? []) {
    total += countProductsUnder(child, here)
  }
  return total
}

export function allProducts(): CatalogProduct[] {
  return loadAllProducts()
}

const cachedVariants = new Map<string, ProductVariant[]>()

export function getProductVariants(slug: string): ProductVariant[] {
  const hit = cachedVariants.get(slug)
  if (hit) return hit
  try {
    const txt = readFileSync(join(repoRoot(), VARIANTS_DIR, `${slug}.json`), "utf8")
    const list = filterCatalogStock(JSON.parse(txt) as ProductVariant[])
    cachedVariants.set(slug, list)
    return list
  } catch {
    cachedVariants.set(slug, [])
    return []
  }
}
