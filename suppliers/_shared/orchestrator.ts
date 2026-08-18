import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { CatalogProduct, ProductVariant } from "../../lib/content/catalog.ts"
import { flattenTree, categoryTree } from "../../lib/content/categories.ts"
import type { SupplierAdapter } from "./adapter.ts"
import { getSupplierDefinition, isSupplierImageUrlAllowed } from "../suppliers.ts"
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
  suppliers?: Record<string, number>
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

  assertAdapterContracts(active)
  if (supplierFilter && !dryRun) {
    throw new Error(
      "A filtered supplier sync cannot write catalog files because it would remove other suppliers. " +
        "Use --supplier only with --dry-run, or run an unfiltered full sync.",
    )
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
  const report: SyncReport = {
    ranAt: new Date().toISOString(),
    success: results.every((r) => r.summary.ok),
    totalProducts: allProducts.length,
    totalUnclassified: allUnclassified.length,
    suppliers: suppliersReport,
    productsPerLeaf,
  }

  if (!report.success) {
    if (dryRun) return report
    const failures = Object.values(report.suppliers)
      .filter((supplier) => !supplier.ok)
      .map((supplier) => `${supplier.id}: ${supplier.error ?? "unknown error"}`)
      .join("; ")
    throw new Error(`Supplier sync failed; catalog data was not written. ${failures}`)
  }

  if (!supplierFilter) {
    assertSafeCatalogSize(last, report, !!force)
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
    const supplier = suppliersReport[supplierId]
    if (supplier) supplier.variantFilesWritten = count
  }
  await saveManifest(repoRoot, manifest)
  await writeFileAtomic(
    join(repoRoot, LAST_SYNC_FILE),
    JSON.stringify(
      {
        ranAt: report.ranAt,
        totalProducts: report.totalProducts,
        suppliers: Object.fromEntries(
          Object.entries(report.suppliers).map(([id, supplier]) => [id, supplier.normalized]),
        ),
      } satisfies LastSync,
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

  try {
    assertRawProducts(adapter, raws)
  } catch (err) {
    summary.ok = false
    summary.error = (err as Error).message
    return { summary, mapped, unclassified, variantsBySlug }
  }

  const unmappedCounts = new Map<string, number>()
  const unknownPersonalizationCounts = new Map<string, number>()

  for (const raw of raws) {
    if (!Number.isFinite(raw.supplierPriceEur) || raw.supplierPriceEur <= 0) {
      summary.droppedMissingPrice++
      continue
    }
    try {
      const result = normalize(raw, adapter)
      if (!result.product) continue

      for (const code of result.unknownPersonalizationCodes) {
        unknownPersonalizationCounts.set(
          code,
          (unknownPersonalizationCounts.get(code) ?? 0) + 1,
        )
      }

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

      if (!result.slugPath) {
        const key = result.unclassifiedCategory?.trim() || "(empty supplier category)"
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
  summary.unknownPersonalizationCodes = [
    ...unknownPersonalizationCounts.entries(),
  ]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code))

  if (summary.images.failed > 0) {
    summary.ok = false
    summary.error = summary.error ?? `${summary.images.failed} product image downloads failed.`
  }

  return { summary, mapped, unclassified, variantsBySlug }
}

function assertAdapterContracts(adapters: SupplierAdapter[]): void {
  const seen = new Set<string>()
  for (const adapter of adapters) {
    if (seen.has(adapter.id)) {
      throw new Error(`Duplicate active supplier adapter id "${adapter.id}".`)
    }
    seen.add(adapter.id)

    const definition = getSupplierDefinition(adapter.id)
    if (!definition) {
      throw new Error(`Supplier adapter "${adapter.id}" has no supplier definition.`)
    }
    if (definition.displayName !== adapter.displayName) {
      throw new Error(`Supplier adapter "${adapter.id}" does not match its definition.`)
    }
  }
}

function assertRawProducts(
  adapter: SupplierAdapter,
  raws: Awaited<ReturnType<SupplierAdapter["fetchAll"]>>,
): void {
  const definition = getSupplierDefinition(adapter.id)
  if (!definition) throw new Error(`Supplier "${adapter.id}" has no definition.`)

  const seenSkus = new Set<string>()
  const seenVariantIds = new Set<string>()
  for (let index = 0; index < raws.length; index++) {
    const raw = raws[index]
    const label = `${adapter.id} product #${index + 1}`
    if (raw.supplierId !== adapter.id) {
      throw new Error(`${label} declares supplierId "${raw.supplierId}".`)
    }
    if (!raw.supplierSku?.trim()) throw new Error(`${label} has no supplier SKU.`)
    if (seenSkus.has(raw.supplierSku)) {
      throw new Error(`Supplier "${adapter.id}" returned duplicate SKU "${raw.supplierSku}".`)
    }
    seenSkus.add(raw.supplierSku)
    if (adapter.fetchInventory) {
      if (!raw.supplierVariantIds?.length) {
        throw new Error(
          `${label} (${raw.supplierSku}) has no inventory binding ids.`,
        )
      }
      const rawVariantIds = new Set(
        (raw.variants ?? []).map((variant) => variant.supplierVariantId),
      )
      if (raw.variants?.length && rawVariantIds.size !== raw.supplierVariantIds.length) {
        throw new Error(
          `${label} (${raw.supplierSku}) inventory bindings do not cover every variant.`,
        )
      }
      for (const variantId of raw.supplierVariantIds) {
        if (!variantId.trim()) {
          throw new Error(`${label} (${raw.supplierSku}) has an empty inventory binding id.`)
        }
        if (seenVariantIds.has(variantId)) {
          throw new Error(
            `Supplier "${adapter.id}" assigned inventory id "${variantId}" to multiple products.`,
          )
        }
        if (raw.variants?.length && !rawVariantIds.has(variantId)) {
          throw new Error(
            `${label} (${raw.supplierSku}) inventory id "${variantId}" has no matching variant.`,
          )
        }
        seenVariantIds.add(variantId)
      }
    }
    if (!raw.name?.trim()) throw new Error(`${label} has no product name.`)
    if (!Array.isArray(raw.images)) throw new Error(`${label} has an invalid images field.`)
    if (!definition.allowProductsWithoutImages && raw.images.length === 0) {
      throw new Error(`${label} (${raw.supplierSku}) has no images.`)
    }

    const imageUrls = [
      ...raw.images,
      ...(raw.variants ?? []).flatMap((variant) => variant.images ?? []),
    ]
    for (const imageUrl of imageUrls) {
      if (!isSupplierImageUrlAllowed(adapter.id, imageUrl)) {
        throw new Error(
          `${label} (${raw.supplierSku}) uses an unapproved image URL: ${imageUrl}`,
        )
      }
    }
  }
}

function assertSafeCatalogSize(last: LastSync | null, report: SyncReport, force: boolean): void {
  if (!last || force) return
  for (const [supplierId, previousCount] of Object.entries(last.suppliers ?? {})) {
    const currentCount = report.suppliers[supplierId]?.normalized ?? 0
    if (currentCount < previousCount * 0.5) {
      throw new Error(
        `Catastrophic supplier drop for "${supplierId}": previous sync had ${previousCount} mapped products, ` +
          `new run has ${currentCount}. Refusing to write. Re-run with --force to override.`,
      )
    }
  }

  if (report.totalProducts < last.totalProducts * 0.5) {
    throw new Error(
      `Catastrophic drop: previous sync had ${last.totalProducts} products, new run has ${report.totalProducts}. ` +
        `Refusing to write. Re-run with --force to override.`,
    )
  }
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
  const expectedProductFiles = new Set<string>()

  for (const [slugPath, list] of byCategory) {
    const file = join(productsDir, `${slugPath}.json`)
    expectedProductFiles.add(file)
    await mkdir(dirname(file), { recursive: true })
    await writeFileAtomic(file, JSON.stringify(list, null, 2))
  }
  await pruneStaleJsonFiles(productsDir, expectedProductFiles)

  const variantsDir = join(repoRoot, VARIANTS_DIR)
  await mkdir(variantsDir, { recursive: true })
  const expectedVariantFiles = new Set<string>()
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
    expectedVariantFiles.add(file)
    await writeFileAtomic(file, JSON.stringify(sorted, null, 2))
    const supplierId = productsBySlug.get(slug)?.supplierId ?? "unknown"
    perSupplierVariantCount.set(
      supplierId,
      (perSupplierVariantCount.get(supplierId) ?? 0) + 1,
    )
  }
  await pruneStaleJsonFiles(variantsDir, expectedVariantFiles)

  for (const [supplierId, count] of perSupplierVariantCount) {
    const supplier = report.suppliers[supplierId]
    if (supplier) supplier.variantFilesWritten = count
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
    const last = JSON.parse(txt) as LastSync
    if (last.suppliers) return last

    try {
      const reportText = await readFile(join(repoRoot, SYNC_REPORT_FILE), "utf8")
      const report = JSON.parse(reportText) as SyncReport
      last.suppliers = Object.fromEntries(
        Object.entries(report.suppliers).map(([id, supplier]) => [id, supplier.normalized]),
      )
    } catch {
      // Older syncs may not have a usable report; the global guard still applies.
    }
    return last
  } catch {
    return null
  }
}

async function pruneStaleJsonFiles(root: string, expected: Set<string>): Promise<void> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return
    throw error
  }

  for (const entry of entries) {
    const fullPath = join(root, entry.name)
    if (entry.isDirectory()) {
      await pruneStaleJsonFiles(fullPath, expected)
    } else if (entry.isFile() && entry.name.endsWith(".json") && !expected.has(fullPath)) {
      await rm(fullPath, { force: true })
    }
  }
}

async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp-${process.pid}`
  await writeFile(tmp, content, "utf8")
  await rename(tmp, path)
}
