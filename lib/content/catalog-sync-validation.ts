import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type {
  CatalogProduct,
  SupplierPersonalizationMethod,
} from "./catalog.ts"

export type CatalogSyncValidationMode = "full" | "inventory"

export interface CatalogSyncValidationOptions {
  repoRoot: string
  mode: CatalogSyncValidationMode
  now?: Date
  maxFullSyncAgeMs?: number
}

export interface CatalogSyncValidationResult {
  mode: CatalogSyncValidationMode
  productFiles: number
  products: number
  macmaProducts: number
  macmaMethods: number
  unknownMacmaCodes: string[]
  f38Codes: string[]
}

interface GeneratedIndex {
  generatedAt: string
  counts: Record<string, number>
}

interface SyncSupplierReport {
  ok: boolean
  normalized: number
  unknownPersonalizationCodes?: { code: string; count: number }[]
}

interface SyncReport {
  ranAt: string
  success: boolean
  totalProducts: number
  suppliers: Record<string, SyncSupplierReport>
}

interface LastSync {
  ranAt: string
  totalProducts: number
  suppliers?: Record<string, number>
}

const GENERATED_ROOT = "lib/content/generated"
const PRODUCTS_ROOT = `${GENERATED_ROOT}/products`
const DEFAULT_MAX_FULL_SYNC_AGE_MS = 30 * 60 * 1000
const F38_EXPECTED_CODES = ["DC", "DT", "DW", "S2"]

export async function validateGeneratedCatalog(
  options: CatalogSyncValidationOptions,
): Promise<CatalogSyncValidationResult> {
  const productRoot = join(options.repoRoot, PRODUCTS_ROOT)
  const productFiles = await listJsonFiles(productRoot)
  assert(productFiles.length > 0, "Generated catalog has no product files.")

  const products: CatalogProduct[] = []
  for (const path of productFiles) {
    const parsed = await readJson<unknown>(path)
    assert(Array.isArray(parsed), `Generated product file is not an array: ${path}`)
    products.push(...(parsed as CatalogProduct[]))
  }
  assert(products.length > 0, "Generated catalog contains no products.")

  const slugs = new Set<string>()
  const supplierSkus = new Set<string>()
  const macmaProducts: CatalogProduct[] = []
  let macmaMethods = 0

  for (const product of products) {
    assertNonEmptyString(product.slug, "Product slug")
    assertNonEmptyString(product.supplierId, `${product.slug} supplierId`)
    assertNonEmptyString(product.supplierSku, `${product.slug} supplierSku`)
    assert(Array.isArray(product.personalizations), `${product.slug} personalizations is not an array.`)
    assert(
      typeof product.stock === "number" && Number.isFinite(product.stock) && product.stock >= 0,
      `${product.slug} has invalid numeric stock.`,
    )
    assert(
      product.stockLevel === stockLevelFor(product.stock),
      `${product.slug} stock level does not match its numeric stock.`,
    )
    if (product.availableSizes !== undefined) {
      assert(
        Array.isArray(product.availableSizes),
        `${product.slug} availableSizes is not an array.`,
      )
      for (const size of product.availableSizes) {
        assertNonEmptyString(size, `${product.slug} available size`)
      }
    }
    if (product.specifications !== undefined) {
      assert(
        Array.isArray(product.specifications),
        `${product.slug} specifications is not an array.`,
      )
      const specificationKeys = new Set<string>()
      for (const specification of product.specifications) {
        assertNonEmptyString(specification.key, `${product.slug} specification key`)
        assertNonEmptyString(specification.label, `${product.slug} specification label`)
        assertNonEmptyString(specification.value, `${product.slug} specification value`)
        assert(
          !specificationKeys.has(specification.key),
          `${product.slug} has duplicate specification key "${specification.key}".`,
        )
        specificationKeys.add(specification.key)
      }
    }
    assert(!slugs.has(product.slug), `Duplicate generated product slug "${product.slug}".`)
    slugs.add(product.slug)

    const supplierKey = `${product.supplierId}\0${product.supplierSku}`
    assert(
      !supplierSkus.has(supplierKey),
      `Supplier SKU "${product.supplierId}/${product.supplierSku}" appears more than once.`,
    )
    supplierSkus.add(supplierKey)

    if (product.supplierPersonalizations !== undefined) {
      validateSupplierMethods(product.slug, product.supplierPersonalizations)
    }

    if (product.supplierId !== "macma") continue
    macmaProducts.push(product)
    macmaMethods += product.supplierPersonalizations?.length ?? 0

    if (options.mode === "full") {
      assert(
        Array.isArray(product.supplierPersonalizations),
        `${product.slug} has no exact Macma personalization data.`,
      )
      assert(
        !product.personalizations.includes("uv-transfer"),
        `${product.slug} still contains the retired generic Macma transfer mapping.`,
      )
    }
  }

  assert(macmaProducts.length > 0, "Generated catalog contains no Macma products.")

  const f38 = macmaProducts.find((product) => product.supplierSku === "F38")
  const f38Codes = [...(f38?.supplierPersonalizations ?? [])]
    .map((method) => method.code)
    .sort((a, b) => a.localeCompare(b))

  let unknownMacmaCodes: string[] = []
  if (options.mode === "full") {
    assert(macmaMethods > 0, "Full sync produced no exact Macma personalization methods.")
    if (f38) {
      assert(
        arraysEqual(f38Codes, F38_EXPECTED_CODES),
        `Macma F38 methods are ${f38Codes.join(", ") || "missing"}; expected ${F38_EXPECTED_CODES.join(", ")}.`,
      )
      assert(
        !f38.personalizations.includes("uv-print"),
        "Macma F38 is incorrectly mapped to direct UV printing.",
      )
    }

    const fullResult = await validateFullSyncFiles(options, products.length, macmaProducts.length)
    unknownMacmaCodes = fullResult.unknownMacmaCodes
  }

  return {
    mode: options.mode,
    productFiles: productFiles.length,
    products: products.length,
    macmaProducts: macmaProducts.length,
    macmaMethods,
    unknownMacmaCodes,
    f38Codes,
  }
}

async function validateFullSyncFiles(
  options: CatalogSyncValidationOptions,
  productCount: number,
  macmaProductCount: number,
): Promise<{ unknownMacmaCodes: string[] }> {
  const root = join(options.repoRoot, GENERATED_ROOT)
  const [index, report, last] = await Promise.all([
    readJson<GeneratedIndex>(join(root, "index.json")),
    readJson<SyncReport>(join(root, "sync-report.json")),
    readJson<LastSync>(join(root, "last-sync.json")),
  ])

  assert(report.success === true, "Generated sync report is not successful.")
  assert(report.totalProducts === productCount, "Sync report product total does not match generated files.")
  assert(last.totalProducts === productCount, "Last-sync product total does not match generated files.")
  assert(last.ranAt === report.ranAt, "Sync report and last-sync timestamps do not match.")

  const indexTotal = Object.values(index.counts).reduce((sum, count) => sum + count, 0)
  assert(indexTotal === productCount, "Generated index total does not match generated product files.")

  const macma = report.suppliers.macma
  assert(macma?.ok === true, "Macma is missing or unsuccessful in the sync report.")
  assert(macma.normalized === macmaProductCount, "Macma report total does not match generated products.")
  if (last.suppliers?.macma !== undefined) {
    assert(last.suppliers.macma === macmaProductCount, "Last-sync Macma total does not match generated products.")
  }

  const ranAt = Date.parse(report.ranAt)
  assert(Number.isFinite(ranAt), "Sync report has an invalid timestamp.")
  const now = (options.now ?? new Date()).getTime()
  const maxAge = options.maxFullSyncAgeMs ?? DEFAULT_MAX_FULL_SYNC_AGE_MS
  const age = now - ranAt
  assert(age >= -60_000, "Sync report timestamp is unexpectedly in the future.")
  assert(age <= maxAge, `Full sync report is stale (${Math.round(age / 60_000)} minutes old).`)

  const unknownMacmaCodes = (macma.unknownPersonalizationCodes ?? [])
    .filter((entry) => entry.count > 0)
    .map((entry) => entry.code)
    .sort((a, b) => a.localeCompare(b))

  return { unknownMacmaCodes }
}

function validateSupplierMethods(
  productSlug: string,
  methods: SupplierPersonalizationMethod[],
): void {
  assert(Array.isArray(methods), `${productSlug} supplierPersonalizations is not an array.`)
  const codes = new Set<string>()
  for (const method of methods) {
    assertNonEmptyString(method.code, `${productSlug} supplier method code`)
    assertNonEmptyString(method.label, `${productSlug}/${method.code} supplier method label`)
    assert(!codes.has(method.code), `${productSlug} contains duplicate method code "${method.code}".`)
    codes.add(method.code)
    if (method.printSizes !== undefined) {
      assert(Array.isArray(method.printSizes), `${productSlug}/${method.code} printSizes is not an array.`)
      for (const size of method.printSizes) {
        assertNonEmptyString(size, `${productSlug}/${method.code} print size`)
      }
    }
  }
}

async function listJsonFiles(root: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) out.push(...(await listJsonFiles(path)))
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(path)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

async function readJson<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T
  } catch (error) {
    throw new Error(`Cannot read generated catalog file ${path}: ${(error as Error).message}`)
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assert(typeof value === "string" && value.trim().length > 0, `${label} is empty.`)
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function stockLevelFor(stock: number): CatalogProduct["stockLevel"] {
  if (stock <= 0) return "out-of-stock"
  if (stock < 10) return "low"
  return "in-stock"
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
