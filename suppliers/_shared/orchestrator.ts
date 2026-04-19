import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { CatalogProduct, ProductVariant } from "../../lib/content/catalog.ts"
import { flattenTree, categoryTree } from "../../lib/content/categories.ts"
import type { SupplierAdapter } from "./adapter.ts"
import { normalize } from "./normalize.ts"
import { assertUniqueSlugs } from "./slug.ts"
import {
  downloadProductImages,
  loadManifest,
  saveManifest,
  type ImageManifest,
} from "./images.ts"

export interface OrchestratorOptions {
  repoRoot: string
  adapters: SupplierAdapter[]
  force?: boolean
  supplierFilter?: string
  skipImages?: boolean
  dryRun?: boolean
}

export interface SupplierRunSummary {
  id: string
  displayName: string
  ok: boolean
  error?: string
  fetched: number
  normalized: number
  unclassified: number
  droppedMissingPrice: number
  variantFilesWritten: number
  newUnmappedCategories: { category: string; count: number }[]
  unknownPersonalizationCodes: { code: string; count: number }[]
  images: { downloaded: number; skipped: number; failed: number }
}

export interface SyncReport {
  ranAt: string
  success: boolean
  totalProducts: number
  totalUnclassified: number
  suppliers: Record<string, SupplierRunSummary>
  productsPerLeaf: Record<string, number>
}

interface LastSync {
  ranAt: string
  totalProducts: number
}

const GENERATED_ROOT = "lib/content/generated"
const PRODUCTS_DIR = "lib/content/generated/products"
const VARIANTS_DIR = "lib/content/generated/variants"
const UNCLASSIFIED_FILE = "lib/content/generated/unclassified.json"
const SYNC_REPORT_FILE = "lib/content/generated/sync-report.json"
const LAST_SYNC_FILE = "lib/content/generated/last-sync.json"

export async function runSync(opts: OrchestratorOptions): Promise<SyncReport> {
  const { repoRoot, adapters, force, supplierFilter, skipImages, dryRun } = opts
  const active = adapters.filter((a) => !supplierFilter || a.id === supplierFilter)

  if (active.length === 0) {
    const suffix = supplierFilter ? ` (filter "${supplierFilter}" matched nothing)` : ""
    throw new Error(`No adapters to run${suffix}.`)
  }

  const manifest: ImageManifest = skipImages ? { entries: {} } : await loadManifest(repoRoot)
  const allProducts: CatalogProduct[] = []
  const allUnclassified: CatalogProduct[] = []
  const allVariants = new Map<string, ProductVariant[]>()
  const suppliersReport: Record<string, SupplierRunSummary> = {}

  const results = await Promise.all(
    active.map((adapter) => runOneAdapter(adapter, repoRoot, manifest, !!skipImages)),
  )

  for (const r of results) {
    suppliersReport[r.summary.id] = r.summary
    allProducts.push(...r.mapped)
    allUnclassified.push(...r.unclassified)
    for (const [slug, vs] of r.variantsBySlug) {
      allVariants.set(slug, vs)
    }
  }

  assertUniqueSlugs(allProducts.concat(allUnclassified).map((p) => p.slug))

  sortProducts(allProducts)
  sortProducts(allUnclassified)

  const productsPerLeaf = groupByCategory(allProducts)

  const last = await loadLastSync(repoRoot)
  if (last && !force && allProducts.length < last.totalProducts * 0.5) {
    throw new Error(
      `Catastrophic drop: previous sync had ${last.totalProducts} products, new run has ${allProducts.length}. ` +
        `Refusing to write. Re-run with --force to override.`,
    )
  }

  const report: SyncReport = {
    ranAt: new Date().toISOString(),
    success: results.every((r) => r.summary.ok),
    totalProducts: allProducts.length,
    totalUnclassified: allUnclassified.length,
    suppliers: suppliersReport,
    productsPerLeaf,
  }

  if (dryRun) {
    return report
  }

  const variantFilesWritten = await writeCatalog(
    repoRoot,
    allProducts,
    allUnclassified,
    allVariants,
    report,
  )
  for (const [supplierId, count] of variantFilesWritten) {
    const s = suppliersReport[supplierId]
    if (s) s.variantFilesWritten = count
  }
  await saveManifest(repoRoot, manifest)
  await writeFileAtomic(
    join(repoRoot, LAST_SYNC_FILE),
    JSON.stringify(
      { ranAt: report.ranAt, totalProducts: report.totalProducts } satisfies LastSync,
      null,
      2,
    ),
  )

  return report
}

async function runOneAdapter(
  adapter: SupplierAdapter,
  repoRoot: string,
  manifest: ImageManifest,
  skipImages: boolean,
): Promise<{
  summary: SupplierRunSummary
  mapped: CatalogProduct[]
  unclassified: CatalogProduct[]
  variantsBySlug: Map<string, ProductVariant[]>
}> {
  const summary: SupplierRunSummary = {
    id: adapter.id,
    displayName: adapter.displayName,
    ok: true,
    fetched: 0,
    normalized: 0,
    unclassified: 0,
    droppedMissingPrice: 0,
    variantFilesWritten: 0,
    newUnmappedCategories: [],
    unknownPersonalizationCodes: [],
    images: { downloaded: 0, skipped: 0, failed: 0 },
  }
  const mapped: CatalogProduct[] = []
  const unclassified: CatalogProduct[] = []
  const variantsBySlug = new Map<string, ProductVariant[]>()

  let raws: Awaited<ReturnType<SupplierAdapter["fetchAll"]>>
  try {
    raws = await adapter.fetchAll()
  } catch (err) {
    summary.ok = false
    summary.error = (err as Error).message
    return { summary, mapped, unclassified, variantsBySlug }
  }
  summary.fetched = raws.length

  const unmappedCounts = new Map<string, number>()

  for (const raw of raws) {
    if (!Number.isFinite(raw.supplierPriceEur) || raw.supplierPriceEur <= 0) {
      summary.droppedMissingPrice++
      continue
    }
    try {
      const result = normalize(raw, adapter)
      if (!result.product) continue

      if (!skipImages && raw.images.length > 0) {
        const dl = await downloadProductImages({
          repoRoot,
          supplierId: raw.supplierId,
          supplierSku: raw.supplierSku,
          sourceUrls: raw.images,
          manifest,
          skipDownload: skipImages,
        })
        result.product.images = dl.relPaths
        summary.images.downloaded += dl.downloaded
        summary.images.skipped += dl.skipped
        summary.images.failed += dl.failed
      }

      if (result.variants.length > 0) {
        variantsBySlug.set(result.product.slug, result.variants)
      }

      if (result.unclassifiedCategory) {
        const key = result.unclassifiedCategory
        unmappedCounts.set(key, (unmappedCounts.get(key) ?? 0) + 1)
        unclassified.push(result.product)
        summary.unclassified++
      } else {
        mapped.push(result.product)
        summary.normalized++
      }
    } catch (err) {
      summary.ok = false
      summary.error = summary.error ?? (err as Error).message
    }
  }

  summary.newUnmappedCategories = [...unmappedCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return { summary, mapped, unclassified, variantsBySlug }
}

function sortProducts(list: CatalogProduct[]): void {
  list.sort((a, b) => {
    if (a.supplierId !== b.supplierId) return a.supplierId < b.supplierId ? -1 : 1
    if (a.supplierSku !== b.supplierSku) return a.supplierSku < b.supplierSku ? -1 : 1
    return 0
  })
}

function groupByCategory(products: CatalogProduct[]): Record<string, number> {
  const out: Record<string, number> = {}
  const valid = new Set(flattenTree(categoryTree).map((n) => n.slugPath))
  for (const p of products) {
    if (!valid.has(p.category)) continue
    out[p.category] = (out[p.category] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)))
}

async function writeCatalog(
  repoRoot: string,
  mapped: CatalogProduct[],
  unclassified: CatalogProduct[],
  variantsBySlug: Map<string, ProductVariant[]>,
  report: SyncReport,
): Promise<Map<string, number>> {
  const byCategory = new Map<string, CatalogProduct[]>()
  for (const p of mapped) {
    const list = byCategory.get(p.category) ?? []
    list.push(p)
    byCategory.set(p.category, list)
  }

  const productsDir = join(repoRoot, PRODUCTS_DIR)
  await mkdir(productsDir, { recursive: true })

  for (const [slugPath, list] of byCategory) {
    const file = join(productsDir, `${slugPath}.json`)
    await mkdir(dirname(file), { recursive: true })
    await writeFileAtomic(file, JSON.stringify(list, null, 2))
  }

  const variantsDir = join(repoRoot, VARIANTS_DIR)
  await mkdir(variantsDir, { recursive: true })
  const productsBySlug = new Map<string, CatalogProduct>()
  for (const p of mapped) productsBySlug.set(p.slug, p)
  for (const p of unclassified) productsBySlug.set(p.slug, p)
  const perSupplierVariantCount = new Map<string, number>()
  const sortedSlugs = [...variantsBySlug.keys()].sort((a, b) => a.localeCompare(b))
  for (const slug of sortedSlugs) {
    const vs = variantsBySlug.get(slug)
    if (!vs || vs.length === 0) continue
    const sorted = [...vs].sort((a, b) => a.contentKey.localeCompare(b.contentKey))
    const file = join(variantsDir, `${slug}.json`)
    await writeFileAtomic(file, JSON.stringify(sorted, null, 2))
    const supplierId = productsBySlug.get(slug)?.supplierId ?? "unknown"
    perSupplierVariantCount.set(
      supplierId,
      (perSupplierVariantCount.get(supplierId) ?? 0) + 1,
    )
  }

  await writeFileAtomic(
    join(repoRoot, UNCLASSIFIED_FILE),
    JSON.stringify(unclassified, null, 2),
  )
  await writeFileAtomic(
    join(repoRoot, SYNC_REPORT_FILE),
    JSON.stringify(report, null, 2),
  )
  await writeFileAtomic(join(repoRoot, GENERATED_ROOT, "index.json"), buildIndex(byCategory))

  return perSupplierVariantCount
}

function buildIndex(byCategory: Map<string, CatalogProduct[]>): string {
  const entries: Record<string, number> = {}
  for (const [slugPath, list] of byCategory) {
    entries[slugPath] = list.length
  }
  const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : 1)))
  return JSON.stringify({ generatedAt: new Date().toISOString(), counts: sorted }, null, 2)
}

async function loadLastSync(repoRoot: string): Promise<LastSync | null> {
  try {
    const txt = await readFile(join(repoRoot, LAST_SYNC_FILE), "utf8")
    return JSON.parse(txt) as LastSync
  } catch {
    return null
  }
}

async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp-${process.pid}`
  await writeFile(tmp, content, "utf8")
  await rename(tmp, path)
}
