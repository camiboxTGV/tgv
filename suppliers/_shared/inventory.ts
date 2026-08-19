import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { CatalogProduct, ProductVariant } from "../../lib/content/catalog.ts"
import type {
  SupplierAdapter,
  SupplierInventorySnapshot,
} from "./adapter.ts"
import { stockLevelFor } from "./adapter.ts"
import { applyMarkup } from "./pricing.ts"

const PRODUCTS_DIR = "lib/content/generated/products"
const VARIANTS_DIR = "lib/content/generated/variants"
const UNCLASSIFIED_FILE = "lib/content/generated/unclassified.json"
const DEFAULT_MINIMUM_COVERAGE = 0.9

interface ProductFile {
  path: string
  products: CatalogProduct[]
}

export interface InventorySyncOptions {
  repoRoot: string
  adapters: SupplierAdapter[]
  supplierFilter?: string
  dryRun?: boolean
  minimumCoverage?: number
}

export interface InventorySupplierSummary {
  id: string
  displayName: string
  trackedProducts: number
  trackedVariants: number
  matchedPrices: number
  matchedStock: number
  missingPrices: number
  missingStock: number
  productsUpdated: number
  variantsUpdated: number
}

export interface InventorySyncReport {
  ranAt: string
  success: true
  changedFiles: number
  suppliers: Record<string, InventorySupplierSummary>
}

export class InventoryBootstrapRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InventoryBootstrapRequiredError"
  }
}

export async function runInventorySync(
  opts: InventorySyncOptions,
): Promise<InventorySyncReport> {
  const active = opts.adapters.filter(
    (adapter) => !opts.supplierFilter || adapter.id === opts.supplierFilter,
  )
  if (active.length === 0) {
    const suffix = opts.supplierFilter
      ? ` (filter "${opts.supplierFilter}" matched nothing)`
      : ""
    throw new Error(`No adapters to run${suffix}.`)
  }

  assertInventoryAdapters(active)
  const files = await loadProductFiles(opts.repoRoot)
  const allProducts = files.flatMap((file) => file.products)
  const minimumCoverage = opts.minimumCoverage ?? DEFAULT_MINIMUM_COVERAGE
  if (minimumCoverage <= 0 || minimumCoverage > 1) {
    throw new Error(`minimumCoverage must be greater than 0 and at most 1.`)
  }

  const bindings = new Map<string, Set<string>>()
  for (const adapter of active) {
    const products = allProducts.filter((product) => product.supplierId === adapter.id)
    if (products.length === 0) {
      throw new InventoryBootstrapRequiredError(
        `No generated products exist for supplier "${adapter.id}". Run a full sync first.`,
      )
    }

    const ids = new Set<string>()
    for (const product of products) {
      if (!product.supplierVariantIds?.length) {
        throw new InventoryBootstrapRequiredError(
          `Product "${product.slug}" has no inventory bindings. Run a full sync once to bootstrap them.`,
        )
      }
      for (const id of product.supplierVariantIds) {
        if (ids.has(id)) {
          throw new Error(
            `Supplier "${adapter.id}" inventory id "${id}" is bound to multiple products.`,
          )
        }
        ids.add(id)
      }
    }
    bindings.set(adapter.id, ids)
  }

  const snapshots = new Map<string, SupplierInventorySnapshot>()
  await Promise.all(
    active.map(async (adapter) => {
      let snapshot: SupplierInventorySnapshot
      try {
        snapshot = await adapter.fetchInventory!()
      } catch (error) {
        const detail = error instanceof Error
          ? `${error.name === "Error" ? "" : `${error.name}: `}${error.message}`
          : String(error)
        throw new Error(`Supplier "${adapter.id}" inventory fetch failed: ${detail}`)
      }
      assertSnapshotCoverage(
        adapter,
        snapshot,
        bindings.get(adapter.id) ?? new Set(),
        minimumCoverage,
      )
      snapshots.set(adapter.id, snapshot)
    }),
  )

  const changedProductFiles = new Set<string>()
  const changedVariants = new Map<string, ProductVariant[]>()
  const suppliers: Record<string, InventorySupplierSummary> = {}

  for (const adapter of active) {
    const trackedIds = bindings.get(adapter.id) ?? new Set()
    const snapshot = snapshots.get(adapter.id)!
    suppliers[adapter.id] = {
      id: adapter.id,
      displayName: adapter.displayName,
      trackedProducts: allProducts.filter((product) => product.supplierId === adapter.id).length,
      trackedVariants: trackedIds.size,
      matchedPrices: countMatches(trackedIds, snapshot.prices),
      matchedStock: countMatches(trackedIds, snapshot.stock),
      missingPrices: countMissing(trackedIds, snapshot.prices),
      missingStock: countMissing(trackedIds, snapshot.stock),
      productsUpdated: 0,
      variantsUpdated: 0,
    }
  }

  for (const file of files) {
    for (const product of file.products) {
      const summary = suppliers[product.supplierId]
      const snapshot = snapshots.get(product.supplierId)
      if (!summary || !snapshot) continue

      const changed = await updateProduct(
        opts.repoRoot,
        product,
        snapshot,
        changedVariants,
        summary,
      )
      if (changed) changedProductFiles.add(file.path)
    }
  }

  if (!opts.dryRun) {
    for (const file of files) {
      if (!changedProductFiles.has(file.path)) continue
      await writeFileAtomic(file.path, JSON.stringify(file.products, null, 2))
    }
    for (const [path, variants] of changedVariants) {
      await writeFileAtomic(path, JSON.stringify(variants, null, 2))
    }
  }

  return {
    ranAt: new Date().toISOString(),
    success: true,
    changedFiles: changedProductFiles.size + changedVariants.size,
    suppliers,
  }
}

function assertInventoryAdapters(adapters: SupplierAdapter[]): void {
  const ids = new Set<string>()
  for (const adapter of adapters) {
    if (ids.has(adapter.id)) {
      throw new Error(`Duplicate active supplier adapter id "${adapter.id}".`)
    }
    ids.add(adapter.id)
    if (!adapter.fetchInventory) {
      throw new Error(
        `Supplier "${adapter.id}" does not implement fetchInventory and cannot run daily inventory syncs.`,
      )
    }
  }
}

function assertSnapshotCoverage(
  adapter: SupplierAdapter,
  snapshot: SupplierInventorySnapshot,
  tracked: Set<string>,
  minimumCoverage: number,
): void {
  if (!Number.isFinite(Date.parse(snapshot.fetchedAt))) {
    throw new Error(`Supplier "${adapter.id}" returned an invalid inventory timestamp.`)
  }
  for (const id of tracked) {
    const price = snapshot.prices.get(id)
    if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
      throw new Error(`Supplier "${adapter.id}" returned an invalid price for "${id}".`)
    }
    const stock = snapshot.stock.get(id)
    if (stock !== undefined && (!Number.isFinite(stock) || stock < 0)) {
      throw new Error(`Supplier "${adapter.id}" returned invalid stock for "${id}".`)
    }
  }
  const priceCoverage = tracked.size === 0 ? 1 : countMatches(tracked, snapshot.prices) / tracked.size
  const stockCoverage = tracked.size === 0 ? 1 : countMatches(tracked, snapshot.stock) / tracked.size
  if (priceCoverage < minimumCoverage || stockCoverage < minimumCoverage) {
    throw new Error(
      `Supplier "${adapter.id}" inventory coverage is unsafe: ` +
        `prices=${asPercent(priceCoverage)}, stock=${asPercent(stockCoverage)}, ` +
        `required=${asPercent(minimumCoverage)}. Refusing to write.`,
    )
  }
}

async function updateProduct(
  repoRoot: string,
  product: CatalogProduct,
  snapshot: SupplierInventorySnapshot,
  changedVariants: Map<string, ProductVariant[]>,
  summary: InventorySupplierSummary,
): Promise<boolean> {
  const ids = product.supplierVariantIds
  if (!ids?.length) {
    throw new InventoryBootstrapRequiredError(
      `Product "${product.slug}" has no inventory bindings. Run a full sync first.`,
    )
  }

  let changed = false
  let totalStock = 0
  const prices: number[] = []

  if (product.hasVariantDetail) {
    const path = join(repoRoot, VARIANTS_DIR, `${product.slug}.json`)
    const variants = await readJson<ProductVariant[]>(path)
    const expectedIds = new Set(ids)
    if (
      variants.length !== ids.length ||
      variants.some(
        (variant) =>
          !variant.supplierVariantId || !expectedIds.has(variant.supplierVariantId),
      )
    ) {
      throw new InventoryBootstrapRequiredError(
        `Product "${product.slug}" has incomplete variant inventory bindings. Run a full sync first.`,
      )
    }

    let variantsChanged = false
    for (const variant of variants) {
      const id = variant.supplierVariantId!
      const supplierPrice = snapshot.prices.get(id)
      const nextPrice = supplierPrice === undefined ? variant.price : applyMarkup(supplierPrice)
      const nextStock = snapshot.stock.get(id) ?? 0
      const nextLevel = stockLevelFor(nextStock)
      let variantChanged = false
      if (variant.price !== nextPrice) {
        variant.price = nextPrice
        variantChanged = true
        variantsChanged = true
      }
      if (variant.stock !== nextStock || variant.stockLevel !== nextLevel) {
        variant.stock = nextStock
        variant.stockLevel = nextLevel
        variantChanged = true
        variantsChanged = true
      }
      if (variantChanged) summary.variantsUpdated++
      prices.push(variant.price)
      totalStock += variant.stock
    }
    if (variantsChanged) {
      changedVariants.set(path, variants)
      changed = true
    }
  } else {
    if (ids.length !== 1) {
      throw new InventoryBootstrapRequiredError(
        `Product "${product.slug}" has ${ids.length} inventory ids but no variant details. Run a full sync first.`,
      )
    }
    const supplierPrice = snapshot.prices.get(ids[0])
    prices.push(supplierPrice === undefined ? product.price : applyMarkup(supplierPrice))
    totalStock = snapshot.stock.get(ids[0]) ?? 0
  }

  const nextPrice = Math.min(...prices)
  const nextPriceFrom = prices.some((price) => price > nextPrice + 0.005)
  const nextStockLevel = stockLevelFor(totalStock)
  if (
    product.price !== nextPrice ||
    product.priceFrom !== nextPriceFrom ||
    product.stock !== totalStock ||
    product.stockLevel !== nextStockLevel
  ) {
    product.price = nextPrice
    product.priceFrom = nextPriceFrom
    product.stock = totalStock
    product.stockLevel = nextStockLevel
    changed = true
  }

  if (changed) {
    product.fetchedAt = snapshot.fetchedAt
    summary.productsUpdated++
  }
  return changed
}

async function loadProductFiles(repoRoot: string): Promise<ProductFile[]> {
  const root = join(repoRoot, PRODUCTS_DIR)
  const paths = await listJsonFiles(root)
  const unclassified = join(repoRoot, UNCLASSIFIED_FILE)
  if (await fileExists(unclassified)) paths.push(unclassified)
  paths.sort((a, b) => a.localeCompare(b))
  return Promise.all(
    paths.map(async (path) => ({ path, products: await readJson<CatalogProduct[]>(path) })),
  )
}

async function listJsonFiles(root: string): Promise<string[]> {
  const out: string[] = []
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return out
    throw error
  }
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) out.push(...(await listJsonFiles(path)))
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path)
  }
  return out
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

function countMatches(ids: Set<string>, values: ReadonlyMap<string, number>): number {
  let count = 0
  for (const id of ids) if (values.has(id)) count++
  return count
}

function countMissing(ids: Set<string>, values: ReadonlyMap<string, number>): number {
  return ids.size - countMatches(ids, values)
}

function asPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`
}

async function writeFileAtomic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.tmp-${process.pid}`
  await writeFile(tmp, content, "utf8")
  await rename(tmp, path)
}
