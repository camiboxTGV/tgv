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

const PRODUCTS_DIR = "lib/content/generated/products"
const VARIANTS_DIR = "lib/content/generated/variants"
const INDEX_FILE = "lib/content/generated/index.json"

interface GeneratedIndex {
  generatedAt: string
  counts: Record<string, number>
}

let cachedIndex: GeneratedIndex | null = null
const cachedCategories = new Map<string, CatalogProduct[]>()
let cachedAllProducts: CatalogProduct[] | null = null
let cachedBySlug: Map<string, CatalogProduct> | null = null

function repoRoot(): string {
  return process.cwd()
}

function loadIndex(): GeneratedIndex {
  if (cachedIndex) return cachedIndex
  try {
    const txt = readFileSync(join(repoRoot(), INDEX_FILE), "utf8")
    cachedIndex = JSON.parse(txt) as GeneratedIndex
  } catch {
    cachedIndex = { generatedAt: new Date(0).toISOString(), counts: {} }
  }
  return cachedIndex
}

function loadLeafProducts(slugPath: string): CatalogProduct[] {
  const cached = cachedCategories.get(slugPath)
  if (cached) return cached
  try {
    const txt = readFileSync(join(repoRoot(), PRODUCTS_DIR, `${slugPath}.json`), "utf8")
    const list = JSON.parse(txt) as CatalogProduct[]
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

export function countProductsUnder(node: CategoryNode, trail: string[] = []): number {
  const index = loadIndex()
  const here = [...trail, node.slug]
  if (isLeaf(node)) return index.counts[joinPath(here)] ?? 0
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
    const list = JSON.parse(txt) as ProductVariant[]
    cachedVariants.set(slug, list)
    return list
  } catch {
    cachedVariants.set(slug, [])
    return []
  }
}
