import type {
  Personalization,
  ProductSpecification,
} from "../../lib/content/catalog.ts"
import type {
  RawProduct,
  RawVariant,
  SupplierAdapter,
  SupplierInventorySnapshot,
} from "../_shared/adapter.ts"
import {
  decodeCifraCategory,
  encodeCifraCategory,
  mapCifraCategory,
} from "./category-mapping.ts"
import { loadCifraCatalogFeeds } from "./fetch.ts"
import {
  describeCifraPersonalizations,
  mapCifraTechnique,
  splitCifraTechniques,
} from "./personalization.ts"
import type {
  CifraCatalogFeeds,
  CifraPriceEntry,
  CifraProduct,
} from "./types.ts"

const SUPPLIER_ID = "cifra"
const DISPLAY_NAME = "Cifra"
const MIN_PRICE_FEED_COVERAGE = 0.9

interface PriceLookups {
  byModel: ReadonlyMap<string, number>
}

export function parseCifraDecimal(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
  if (typeof value !== "string") return Number.NaN
  const compact = value.trim().replace(/\s/g, "")
  if (!compact) return Number.NaN
  if (compact.includes(",") && compact.includes(".")) {
    const normalized = compact.lastIndexOf(",") > compact.lastIndexOf(".")
      ? compact.replace(/\./g, "").replace(",", ".")
      : compact.replace(/,/g, "")
    return Number(normalized)
  }
  return Number(compact.replace(",", "."))
}

export function parseCifraStock(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  if (typeof value !== "string") return 0
  const digits = value.replace(/[^0-9-]/g, "")
  if (!digits) return 0
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
}

export function buildCifraInventorySnapshot(
  feeds: CifraCatalogFeeds,
): SupplierInventorySnapshot {
  assertFeedSafety(feeds)
  const prices = buildPriceLookups(feeds.prices)
  const priceMap = new Map<string, number>()
  const stockMap = new Map<string, number>()

  for (const row of feeds.tariff) {
    const model = row.model?.trim()
    if (!model) continue
    const price = priceFor(row, prices)
    if (Number.isFinite(price) && price > 0) priceMap.set(model, price)
    stockMap.set(model, parseCifraStock(row.quantity))
  }

  return {
    fetchedAt: feeds.fetchedAt,
    prices: priceMap,
    stock: stockMap,
  }
}

export function buildCifraProducts(feeds: CifraCatalogFeeds): RawProduct[] {
  assertFeedSafety(feeds)
  const prices = buildPriceLookups(feeds.prices)
  const groups = new Map<string, CifraProduct[]>()

  for (const row of feeds.tariff) {
    const model = row.model?.trim()
    const name = cleanText(row.name)
    if (!model || !name || imageUrls(row).length === 0) continue
    const rootModel = canonicalRootModel(row.rootmodel, model)
    const siblings = groups.get(rootModel) ?? []
    siblings.push(row)
    groups.set(rootModel, siblings)
  }

  const products: RawProduct[] = []
  for (const [rootModel, rows] of groups) {
    const variants = rows
      .map((row) => rawVariant(row, priceFor(row, prices)))
      .filter((variant): variant is RawVariant => variant !== null)
      .sort((a, b) => a.supplierVariantId.localeCompare(b.supplierVariantId))
    if (variants.length === 0) continue

    const representative = representativeRow(rows, prices)
    const materials = distinct(rows.map((row) => cleanText(row.material)).filter(Boolean))
    const colors = distinct(
      rows.map((row) => cleanText(row.color?.name)).filter(Boolean),
    ).sort((a, b) => a.localeCompare(b))
    const sizes = distinct(rows.map(sizeForRow).filter(isNonEmpty)).sort(sizeOrder)
    const images = unionImages(variants)
    const personalization = personalizationData(rows)
    const variantPrices = variants.map((variant) => variant.priceEur)
    const stock = variants.reduce((sum, variant) => sum + variant.stock, 0)
    const description = firstNonEmpty(rows.map((row) => cleanText(row.description)))
    const parentCategory = firstNonEmpty(
      rows.map((row) => cleanText(row.parent_category)),
    ) ?? ""
    const category = firstNonEmpty(rows.map((row) => cleanText(row.category))) ?? ""

    products.push({
      supplierId: SUPPLIER_ID,
      supplierSku: rootModel,
      supplierVariantIds: variants.map((variant) => variant.supplierVariantId),
      name: cleanText(representative.name) || rootModel,
      description,
      descriptionLong: description,
      supplierCategory: encodeCifraCategory(parentCategory, category),
      supplierPriceEur: Math.min(...variantPrices),
      supplierPriceEurMax: Math.max(...variantPrices),
      originalCurrency: "EUR",
      originalPrice: priceFor(representative, prices),
      stock,
      images,
      attributes: {
        rootModel,
        ...(representative.ean?.trim() ? { ean: representative.ean.trim() } : {}),
      },
      fetchedAt: feeds.fetchedAt,
      moq: positiveInteger(representative.multiples),
      weightGrams: weightGrams(representative.weight),
      rawPersonalizationCodes: personalization.codes,
      supplierPersonalizations: describeCifraPersonalizations(
        personalization.codes,
        personalization.printSizesByCode,
      ),
      material: materials,
      colors,
      sizes,
      specifications: cifraProductSpecifications(rows, materials),
      variantCount: variants.length,
      variants,
    })
  }

  return products.sort((a, b) =>
    a.supplierSku.localeCompare(b.supplierSku, undefined, { numeric: true }),
  )
}

export function cifraProductSpecifications(
  rows: readonly CifraProduct[],
  materials: readonly string[],
): ProductSpecification[] {
  const specs: ProductSpecification[] = []
  const dimensions = distinct(rows.map(dimensionsForRow).filter(Boolean))
  if (dimensions.length) {
    specs.push({
      key: "dimensions",
      label: "Dimensions",
      labelRo: "Dimensiuni",
      value: dimensions.join(" · "),
    })
  }
  if (materials.length) {
    specs.push({
      key: "materials",
      label: "Materials",
      labelRo: "Materiale",
      value: materials.join(", "),
    })
  }

  addNumericSpec(specs, "units-per-carton", "Units per carton", "Unități per cutie", rows.map((row) => row.unacaja), "pcs", "buc.")
  addTextSpec(specs, "carton-dimensions", "Carton dimensions", "Dimensiuni cutie", rows.map((row) => cleanText(row.dcaja)), "cm")
  addNumericSpec(specs, "gross-carton-weight", "Gross carton weight", "Greutate brută cutie", rows.map((row) => row.pbcaja), "kg", "kg")
  addNumericSpec(specs, "net-carton-weight", "Net carton weight", "Greutate netă cutie", rows.map((row) => row.pncaja), "kg", "kg")
  addNumericSpec(specs, "units-per-pallet", "Units per pallet", "Unități per palet", rows.map((row) => row.units_per_pale ?? row.unpale), "pcs", "buc.")
  addTextSpec(specs, "ean", "EAN", "EAN", rows.map((row) => cleanText(row.ean)))
  addTextSpec(specs, "catalog-pages", "Catalogue pages", "Pagini catalog", rows.map((row) => cleanText(row.catalog_pages)))
  return specs
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,

  async fetchAll(): Promise<RawProduct[]> {
    return buildCifraProducts(await loadCifraCatalogFeeds())
  },

  async fetchInventory(): Promise<SupplierInventorySnapshot> {
    return buildCifraInventorySnapshot(await loadCifraCatalogFeeds())
  },

  mapCategory(raw) {
    const { parentCategory, category } = decodeCifraCategory(raw.supplierCategory)
    return mapCifraCategory({ parentCategory, category, name: raw.name })
  },

  mapPersonalizations(raw) {
    const methods = new Set<Personalization>()
    for (const code of raw.rawPersonalizationCodes ?? []) {
      for (const method of mapCifraTechnique(code, raw.material ?? [])) methods.add(method)
    }
    return [...methods]
  },
}

function buildPriceLookups(entries: readonly CifraPriceEntry[]): PriceLookups {
  const byModel = new Map<string, number>()
  for (const entry of entries) {
    const model = entry.model?.trim()
    if (!model) continue
    const firstTier = [...(entry.p_disc ?? [])]
      .map((tier) => ({
        quantity: parseCifraStock(tier.quantity),
        price: parseCifraDecimal(tier.price),
      }))
      .filter((tier) => Number.isFinite(tier.price) && tier.price > 0)
      .sort((a, b) => a.quantity - b.quantity)[0]
    if (firstTier) byModel.set(model, firstTier.price)
  }
  return { byModel }
}

function priceFor(row: CifraProduct, prices: PriceLookups): number {
  const exact = prices.byModel.get(row.model.trim())
  if (exact !== undefined) return exact
  return parseCifraDecimal(row.confidential_price ?? row.price_pvp)
}

function assertFeedSafety(feeds: CifraCatalogFeeds): void {
  if (feeds.tariff.length === 0) throw new Error("cifra product tariff is empty")
  const eligible = feeds.tariff.filter((row) => row.model?.trim())
  const pricedModels = new Set(feeds.prices.map((entry) => entry.model?.trim()).filter(Boolean))
  const matched = eligible.filter((row) => pricedModels.has(row.model.trim())).length
  const coverage = eligible.length === 0 ? 0 : matched / eligible.length
  if (coverage < MIN_PRICE_FEED_COVERAGE) {
    throw new Error(
      `cifra price coverage is unsafe: ${matched}/${eligible.length} (${(coverage * 100).toFixed(1)}%); required 90%`,
    )
  }
}

function rawVariant(row: CifraProduct, price: number): RawVariant | null {
  const model = row.model?.trim()
  const images = imageUrls(row)
  if (!model || !Number.isFinite(price) || price <= 0 || images.length === 0) return null
  const colorName = cleanText(row.color?.name)
  const colorHex = normalizeHex(row.color?.rgb_hex)
  const size = sizeForRow(row)
  return {
    supplierVariantId: model,
    colorName: colorName || undefined,
    colorHex,
    size: size || undefined,
    priceEur: price,
    stock: parseCifraStock(row.quantity),
    images,
  }
}

function representativeRow(rows: readonly CifraProduct[], prices: PriceLookups): CifraProduct {
  return [...rows].sort((left, right) => {
    const leftPrice = priceFor(left, prices)
    const rightPrice = priceFor(right, prices)
    if (!Number.isFinite(leftPrice)) return 1
    if (!Number.isFinite(rightPrice)) return -1
    return leftPrice - rightPrice
  })[0]!
}

function personalizationData(rows: readonly CifraProduct[]): {
  codes: string[]
  printSizesByCode: Map<string, Set<string>>
} {
  const codes: string[] = []
  const seen = new Set<string>()
  const printSizesByCode = new Map<string, Set<string>>()
  for (const row of rows) {
    const printSize = cleanText(row.mgrabacion)
    for (const code of splitCifraTechniques(row.tgrabacion)) {
      if (!seen.has(code)) {
        seen.add(code)
        codes.push(code)
      }
      if (!printSize) continue
      const sizes = printSizesByCode.get(code) ?? new Set<string>()
      sizes.add(printSize)
      printSizesByCode.set(code, sizes)
    }
  }
  return { codes, printSizesByCode }
}

function imageUrls(row: CifraProduct): string[] {
  return distinct([row.image, ...(row.images ?? [])].filter(isCifraImageUrl))
}

function isCifraImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" &&
      url.hostname === "www.publicatalogue.com" &&
      url.pathname.startsWith("/image/cache/data/")
  } catch {
    return false
  }
}

function unionImages(variants: readonly RawVariant[]): string[] {
  return distinct(variants.flatMap((variant) => variant.images ?? []))
}

function sizeForRow(row: CifraProduct): string | undefined {
  const value = row.attributes?.find((attribute) => attribute.id === "clothing_size")?.value
  const explicit = cleanText(value)
  if (explicit) return explicit
  return cleanText(row.name).match(/\b\d+\s*GB\b/i)?.[0].replace(/\s+/g, " ")
}

function canonicalRootModel(value: string | null | undefined, fallback: string): string {
  const normalized = (value?.trim() || fallback.trim()).replace(/[-\s]+$/, "")
  return normalized || fallback.trim()
}

function dimensionsForRow(row: CifraProduct): string | undefined {
  const values = [row.length, row.width, row.height].map(parseCifraDecimal)
  if (values.every((value) => !Number.isFinite(value) || value <= 0)) return undefined
  return `${values.map((value) => Number.isFinite(value) ? value : 0).join(" × ")} cm`
}

function weightGrams(value: unknown): number | undefined {
  const kilograms = parseCifraDecimal(value)
  return Number.isFinite(kilograms) && kilograms > 0
    ? Math.round(kilograms * 1000)
    : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = parseCifraStock(value)
  return parsed > 0 ? parsed : undefined
}

function addNumericSpec(
  out: ProductSpecification[],
  key: string,
  label: string,
  labelRo: string,
  rawValues: readonly unknown[],
  unit: string,
  unitRo: string,
): void {
  const values = distinct(
    rawValues
      .map(parseCifraDecimal)
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => String(value)),
  )
  if (!values.length) return
  out.push({
    key,
    label,
    labelRo,
    value: `${values.join(" / ")} ${unit}`,
    valueRo: `${values.join(" / ")} ${unitRo}`,
  })
}

function addTextSpec(
  out: ProductSpecification[],
  key: string,
  label: string,
  labelRo: string,
  rawValues: ReadonlyArray<string | undefined>,
  suffix = "",
): void {
  const values = distinct(rawValues.filter(isNonEmpty))
  if (!values.length) return
  const value = values.map((entry) => suffix ? `${entry} ${suffix}` : entry).join(" · ")
  out.push({ key, label, labelRo, value })
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const hex = value.trim().replace(/^#/, "")
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : undefined
}

function firstNonEmpty(values: readonly string[]): string | undefined {
  return values.find(Boolean)
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value)
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

const SIZE_ORDER: Record<string, number> = {
  XXS: 0,
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
  "2XL": 6,
  XXXL: 7,
  "3XL": 7,
  "4XL": 8,
  "5XL": 9,
}

function sizeOrder(left: string, right: string): number {
  const leftOrder = SIZE_ORDER[left.toUpperCase()]
  const rightOrder = SIZE_ORDER[right.toUpperCase()]
  if (leftOrder !== undefined && rightOrder !== undefined) return leftOrder - rightOrder
  if (leftOrder !== undefined) return -1
  if (rightOrder !== undefined) return 1
  return left.localeCompare(right, undefined, { numeric: true })
}
