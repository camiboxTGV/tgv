import type {
  Personalization,
  ProductSpecification,
} from "../../lib/content/catalog.ts"
import type {
  RawProduct,
  RawSupplierPersonalizationMethod,
  RawVariant,
  SupplierAdapter,
  SupplierInventorySnapshot,
} from "../_shared/adapter.ts"
import {
  loadMidoceanCatalogFeeds,
  loadMidoceanInventoryFeeds,
} from "./fetch.ts"
import { mapMidoceanCategory } from "./category-mapping.ts"
import type {
  MidoceanCatalogFeeds,
  MidoceanDigitalAsset,
  MidoceanInventoryFeeds,
  MidoceanPricelistFeed,
  MidoceanPrintDataFeed,
  MidoceanPrintDataProduct,
  MidoceanProduct,
  MidoceanPrintingTechniqueDescription,
  MidoceanStockFeed,
  MidoceanVariant,
} from "./types.ts"

const SUPPLIER_ID = "midocean"
const DISPLAY_NAME = "midocean"
const MAX_PRODUCT_IMAGES = 64
const MIN_CATALOG_PRICE_COVERAGE = 0.9

interface SupplierCategoryTuple {
  categoryLevel1: string
  categoryLevel2: string
  categoryLevel3: string
}

interface PriceLookups {
  bySku: Map<string, number>
  byVariantId: Map<string, number>
  skuByVariantId: Map<string, string>
}

interface ResolvedPrice {
  price: number
  bindingSku: string
}

interface TechniqueLabel {
  label: string
  labelRo?: string
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function parseMidoceanDecimal(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value !== "string") return Number.NaN
  const compact = value.trim().replaceAll(/\s+/g, "")
  if (!compact) return Number.NaN
  const normalized = compact.includes(",")
    ? compact.replaceAll(".", "").replace(",", ".")
    : compact
  return Number(normalized)
}

function buildPriceLookups(feed: MidoceanPricelistFeed): PriceLookups {
  if (feed.currency.trim().toUpperCase() !== "EUR") {
    throw new Error(`midocean pricelist currency is ${feed.currency}; expected EUR.`)
  }

  const bySku = new Map<string, number>()
  const byVariantId = new Map<string, number>()
  const skuByVariantId = new Map<string, string>()
  for (const entry of feed.price) {
    const sku = text(entry.sku)
    const variantId = text(entry.variant_id)
    const price = parseMidoceanDecimal(entry.price)
    if (!sku || !variantId) throw new Error("midocean pricelist contains an empty identifier.")
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`midocean pricelist has an invalid price for ${sku}.`)
    }
    if (price === 0) continue
    setUniqueNumber(bySku, sku, price, "price SKU")
    setUniqueNumber(byVariantId, variantId, price, "price variant id")
    const previousSku = skuByVariantId.get(variantId)
    if (previousSku && previousSku !== sku) {
      throw new Error(`midocean price variant id ${variantId} has conflicting SKUs.`)
    }
    skuByVariantId.set(variantId, sku)
  }
  return { bySku, byVariantId, skuByVariantId }
}

function buildStockMap(feed: MidoceanStockFeed): Map<string, number> {
  const out = new Map<string, number>()
  for (const entry of feed.stock) {
    const sku = text(entry.sku)
    if (!sku) throw new Error("midocean stock feed contains an empty SKU.")
    if (!Number.isFinite(entry.qty) || entry.qty < 0) {
      throw new Error(`midocean stock feed has an invalid quantity for ${sku}.`)
    }
    setUniqueNumber(out, sku, entry.qty, "stock SKU")
  }
  return out
}

function setUniqueNumber(
  target: Map<string, number>,
  key: string,
  value: number,
  label: string,
): void {
  const previous = target.get(key)
  if (previous !== undefined && previous !== value) {
    throw new Error(`midocean ${label} ${key} has conflicting values.`)
  }
  target.set(key, value)
}

function productIdentityMatches(a: MidoceanProduct, b: MidoceanProduct): boolean {
  return text(a.product_name) === text(b.product_name) &&
    text(a.category_code) === text(b.category_code) &&
    text(a.product_class) === text(b.product_class) &&
    text(a.type_of_products) === text(b.type_of_products)
}

function coalesceProducts(products: readonly MidoceanProduct[]): MidoceanProduct[] {
  const byCode = new Map<string, MidoceanProduct>()
  for (const source of products) {
    const code = text(source.master_code)
    if (!code) throw new Error("midocean product feed contains an empty master_code.")
    const existing = byCode.get(code)
    if (!existing) {
      byCode.set(code, { ...source, variants: [...source.variants] })
      continue
    }
    if (!productIdentityMatches(existing, source)) {
      throw new Error(`midocean master ${code} is duplicated with conflicting product data.`)
    }

    const variants = new Map(existing.variants.map((variant) => [variant.sku, variant]))
    for (const variant of source.variants) {
      const prior = variants.get(variant.sku)
      if (prior && prior.variant_id !== variant.variant_id) {
        throw new Error(`midocean master ${code} has conflicting duplicate SKU ${variant.sku}.`)
      }
      if (!prior) variants.set(variant.sku, variant)
    }
    existing.variants = [...variants.values()]

    if (!/^\d+$/.test(existing.master_id) && /^\d+$/.test(source.master_id)) {
      existing.master_id = source.master_id
    }
  }
  return [...byCode.values()]
}

function categoryTuple(variant: MidoceanVariant): SupplierCategoryTuple {
  return {
    categoryLevel1: text(variant.category_level1),
    categoryLevel2: text(variant.category_level2),
    categoryLevel3: text(variant.category_level3),
  }
}

function chooseProductCategory(product: MidoceanProduct): SupplierCategoryTuple {
  const counts = new Map<string, { tuple: SupplierCategoryTuple; count: number }>()
  for (const variant of product.variants) {
    const tuple = categoryTuple(variant)
    // Validate every variant path, even if another path wins for its product master.
    mapMidoceanCategory(tuple)
    const key = encodeCategory(tuple)
    const prior = counts.get(key)
    counts.set(key, { tuple, count: (prior?.count ?? 0) + 1 })
  }
  const selected = [...counts.values()].sort((a, b) => {
    const aGeneric = a.tuple.categoryLevel2.toLowerCase() === "brands" ? 1 : 0
    const bGeneric = b.tuple.categoryLevel2.toLowerCase() === "brands" ? 1 : 0
    return aGeneric - bGeneric || b.count - a.count ||
      encodeCategory(a.tuple).localeCompare(encodeCategory(b.tuple))
  })[0]
  if (!selected) throw new Error(`midocean product ${product.master_code} has no category.`)
  return selected.tuple
}

function encodeCategory(tuple: SupplierCategoryTuple): string {
  return JSON.stringify(tuple)
}

function decodeCategory(value: string): SupplierCategoryTuple {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`midocean product has an invalid category tuple: ${value}`)
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`midocean product has an invalid category tuple: ${value}`)
  }
  const record = parsed as Record<string, unknown>
  return {
    categoryLevel1: text(record.categoryLevel1),
    categoryLevel2: text(record.categoryLevel2),
    categoryLevel3: text(record.categoryLevel3),
  }
}

function assetUrl(asset: MidoceanDigitalAsset): string | null {
  if (asset.type !== "image") return null
  const value = text(asset.url)
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function primaryVariantImage(variant: MidoceanVariant): string | null {
  const assets = variant.digital_assets ?? []
  const front = assets.find(
    (asset) => asset.subtype === "item_picture_front" && assetUrl(asset),
  )
  if (front) return assetUrl(front)
  for (const asset of assets) {
    const url = assetUrl(asset)
    if (url) return url
  }
  return null
}

function productImages(variants: readonly MidoceanVariant[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (value: string | null) => {
    if (!value || seen.has(value) || out.length >= MAX_PRODUCT_IMAGES) return
    seen.add(value)
    out.push(value)
  }

  // One front image per colour/variant keeps variant switching accurate.
  for (const variant of variants) add(primaryVariantImage(variant))

  // Add a bounded detail set from the representative variant.
  for (const asset of variants[0]?.digital_assets ?? []) add(assetUrl(asset))
  return out
}

function englishAndRomanianLabel(
  technique: MidoceanPrintingTechniqueDescription,
): TechniqueLabel | null {
  let label = ""
  let labelRo = ""
  for (const localized of technique.name) {
    if (!label) label = text(localized.en)
    if (!labelRo) labelRo = text(localized.ro)
  }
  return label ? { label, ...(labelRo ? { labelRo } : {}) } : null
}

function techniqueLabels(feed: MidoceanPrintDataFeed): Map<string, TechniqueLabel> {
  const out = new Map<string, TechniqueLabel>()
  for (const technique of feed.printing_technique_descriptions) {
    const id = text(technique.id)
    const label = englishAndRomanianLabel(technique)
    if (!id || !label) continue
    out.set(id, label)
  }
  return out
}

function printDataLookups(feed: MidoceanPrintDataFeed): {
  byMasterId: Map<string, MidoceanPrintDataProduct>
  byMasterCode: Map<string, MidoceanPrintDataProduct>
} {
  const byMasterId = new Map<string, MidoceanPrintDataProduct>()
  const byMasterCode = new Map<string, MidoceanPrintDataProduct>()
  for (const product of feed.products) {
    const id = text(product.master_id)
    const code = text(product.master_code)
    if (id) byMasterId.set(id, product)
    if (code) byMasterCode.set(code, product)
  }
  return { byMasterId, byMasterCode }
}

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

function exactPersonalizations(
  printProduct: MidoceanPrintDataProduct | undefined,
  labels: ReadonlyMap<string, TechniqueLabel>,
): RawSupplierPersonalizationMethod[] {
  if (!printProduct) return []
  const sizesByCode = new Map<string, Set<string>>()
  for (const position of printProduct.printing_positions) {
    const width = Number(position.max_print_size_width)
    const height = Number(position.max_print_size_height)
    const unit = text(position.print_size_unit)
    const size = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
      ? `${formatDimension(width)} × ${formatDimension(height)}${unit ? ` ${unit}` : ""}`
      : null
    for (const technique of position.printing_techniques) {
      const code = text(technique.id)
      if (!code) continue
      const sizes = sizesByCode.get(code) ?? new Set<string>()
      if (size) sizes.add(size)
      sizesByCode.set(code, sizes)
    }
  }

  return [...sizesByCode]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, sizes]) => {
      const label = labels.get(code)
      return {
        code,
        label: label?.label ?? `midocean method ${code}`,
        ...(label?.labelRo ? { labelRo: label.labelRo } : {}),
        printSizes: [...sizes].sort((a, b) => a.localeCompare(b)),
        recognized: Boolean(label),
      }
    })
}

function convertWeightToGrams(value: unknown, unitValue: unknown): number | undefined {
  const amount = parseMidoceanDecimal(value)
  const unit = text(unitValue).toLowerCase()
  if (!Number.isFinite(amount) || amount <= 0) return undefined
  if (unit === "kg") return Math.round(amount * 1000)
  if (unit === "g") return Math.round(amount)
  return undefined
}

function specifications(product: MidoceanProduct): ProductSpecification[] {
  const out: ProductSpecification[] = []
  const add = (key: string, label: string, labelRo: string, value: string) => {
    if (value) out.push({ key, label, labelRo, value })
  }
  add("dimensions", "Dimensions", "Dimensiuni", text(product.dimensions))
  add("material", "Material", "Material", text(product.material))
  add("country-of-origin", "Country of origin", "Țara de origine", text(product.country_of_origin))
  add("commodity-code", "Commodity code", "Cod tarifar", text(product.commodity_code))
  add("inner-carton", "Inner carton", "Ambalaj interior", text(product.inner_carton_quantity))
  add("outer-carton", "Outer carton", "Bax exterior", text(product.outer_carton_quantity))
  add(
    "packaging-after-printing",
    "Packaging after printing",
    "Ambalare după personalizare",
    text(product.packaging_after_printing),
  )
  return out
}

function capacity(product: MidoceanProduct): string | undefined {
  const value = text(product.liquid_volume)
  if (!value) return undefined
  const unit = text(product.liquid_volume_unit)
  return unit ? `${value} ${unit}` : value
}

function rawVariant(
  variant: MidoceanVariant,
  bindingSku: string,
  price: number,
  stock: number,
): RawVariant {
  const image = primaryVariantImage(variant)
  return {
    supplierVariantId: bindingSku,
    colorName: text(variant.color_description) || text(variant.color_group) || undefined,
    size: text(variant.size_textile) || undefined,
    priceEur: price,
    stock,
    ...(image ? { images: [image] } : {}),
  }
}

function priceForVariant(
  variant: MidoceanVariant,
  prices: PriceLookups,
): ResolvedPrice | undefined {
  const exact = prices.bySku.get(variant.sku)
  if (exact !== undefined) return { price: exact, bindingSku: variant.sku }
  const byId = prices.byVariantId.get(variant.variant_id)
  const bindingSku = prices.skuByVariantId.get(variant.variant_id)
  return byId !== undefined && bindingSku ? { price: byId, bindingSku } : undefined
}

export function buildMidoceanProducts(feeds: MidoceanCatalogFeeds): RawProduct[] {
  const products = coalesceProducts(feeds.products)
  const prices = buildPriceLookups(feeds.pricelist)
  const stock = buildStockMap(feeds.stock)
  const printLookups = printDataLookups(feeds.printdata)
  const labels = techniqueLabels(feeds.printdata)
  const out: RawProduct[] = []

  if (products.length === 0) {
    throw new Error("midocean product feed is empty; refusing to publish an empty supplier catalog.")
  }
  const variantCount = products.reduce((sum, product) => sum + product.variants.length, 0)
  const pricedVariantCount = products.reduce(
    (sum, product) =>
      sum + product.variants.filter((variant) => priceForVariant(variant, prices) !== undefined).length,
    0,
  )
  const priceCoverage = variantCount === 0 ? 0 : pricedVariantCount / variantCount
  if (priceCoverage < MIN_CATALOG_PRICE_COVERAGE) {
    throw new Error(
      `midocean catalog price coverage is unsafe: ${pricedVariantCount}/${variantCount} ` +
        `(${(priceCoverage * 100).toFixed(1)}%); required ${(MIN_CATALOG_PRICE_COVERAGE * 100).toFixed(0)}%.`,
    )
  }

  for (const product of products) {
    if (product.variants.length === 0) {
      throw new Error(`midocean product ${product.master_code} has no variants.`)
    }

    const tuple = chooseProductCategory(product)

    const pricedVariants = product.variants.filter((variant) =>
      priceForVariant(variant, prices) !== undefined
    )
    const name = text(product.product_name) ||
      text(product.short_description) ||
      text(product.commercial_description) ||
      product.master_code
    const selectedVariants = pricedVariants.length > 0 ? pricedVariants : product.variants
    const rawVariants = selectedVariants.map((variant) => {
      const resolved = priceForVariant(variant, prices)
      const bindingSku = resolved?.bindingSku ?? variant.sku
      return rawVariant(
        variant,
        bindingSku,
        resolved?.price ?? 0,
        stock.get(bindingSku) ?? 0,
      )
    })
    const selectedPrices = rawVariants.map((variant) => variant.priceEur).filter((price) => price > 0)
    const images = productImages(selectedVariants)
    if (images.length === 0) {
      throw new Error(`midocean product ${product.master_code} has no HTTPS product images.`)
    }

    const printProduct = printLookups.byMasterId.get(product.master_id) ??
      printLookups.byMasterCode.get(product.master_code)
    const supplierPersonalizations = exactPersonalizations(printProduct, labels)
    const colors = [...new Set(selectedVariants.map((variant) => text(variant.color_description)).filter(Boolean))]
    const sizes = [...new Set(selectedVariants.map((variant) => text(variant.size_textile)).filter(Boolean))]
    const totalStock = rawVariants.reduce((sum, variant) => sum + variant.stock, 0)
    const minPrice = selectedPrices.length > 0 ? Math.min(...selectedPrices) : 0
    const maxPrice = selectedPrices.length > 0 ? Math.max(...selectedPrices) : 0
    const material = text(product.material)

    out.push({
      supplierId: SUPPLIER_ID,
      supplierSku: product.master_code,
      supplierVariantIds: rawVariants.map((variant) => variant.supplierVariantId),
      name,
      description: text(product.short_description) || undefined,
      descriptionLong: text(product.long_description) || undefined,
      supplierCategory: encodeCategory(tuple),
      supplierPriceEur: minPrice,
      ...(maxPrice > minPrice ? { supplierPriceEurMax: maxPrice } : {}),
      originalCurrency: "EUR",
      originalPrice: minPrice,
      stock: totalStock,
      images,
      attributes: {
        masterId: product.master_id,
        ...(text(product.dimensions) ? { size: text(product.dimensions) } : {}),
        ...(material ? { material } : {}),
      },
      fetchedAt: feeds.fetchedAt,
      material: material ? [material] : [],
      colors: colors.sort((a, b) => a.localeCompare(b)),
      sizes: sizes.sort(sizeOrder),
      specifications: specifications(product),
      variantCount: rawVariants.length,
      variants: rawVariants,
      brand: text(product.brand) || undefined,
      capacity: capacity(product),
      weightGrams: convertWeightToGrams(product.net_weight, product.net_weight_unit) ??
        convertWeightToGrams(product.gross_weight, product.gross_weight_unit),
      rawPersonalizationCodes: supplierPersonalizations.map((method) => method.code),
      supplierPersonalizations,
    })
  }

  return out
}

export function buildMidoceanInventorySnapshot(
  feeds: MidoceanInventoryFeeds,
): SupplierInventorySnapshot {
  return {
    fetchedAt: feeds.fetchedAt,
    prices: buildPriceLookups(feeds.pricelist).bySku,
    stock: buildStockMap(feeds.stock),
  }
}

const METAL_KEYWORDS = [
  "ALUMINIUM", "ALUMINUM", "STEEL", "STAINLESS", "BRASS", "COPPER", "METAL", "IRON", "ZINC",
]

function isMetal(raw: RawProduct): boolean {
  return (raw.material ?? []).some((material) => {
    const upper = material.toUpperCase()
    return METAL_KEYWORDS.some((keyword) => upper.includes(keyword))
  })
}

function genericPersonalization(code: string, raw: RawProduct): Personalization | null {
  if (/^(?:L[0-7]|RL)$/.test(code)) return isMetal(raw) ? "fiber-laser" : "co2"
  if (/^(?:P[0-7]|S[0-7]|ST[0-2]?|RS[0-7])$/.test(code)) return "pad-screen"
  if (/^(?:PD[0-7]|RD[0-3])$/.test(code)) return "uv-print"
  if (/^(?:T1|TC|TD1?|TDT|TR|TT)$/.test(code)) return "uv-transfer"
  return null
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,

  async fetchAll(): Promise<RawProduct[]> {
    return buildMidoceanProducts(await loadMidoceanCatalogFeeds())
  },

  async fetchInventory(): Promise<SupplierInventorySnapshot> {
    return buildMidoceanInventorySnapshot(await loadMidoceanInventoryFeeds())
  },

  mapCategory(raw) {
    return mapMidoceanCategory(decodeCategory(raw.supplierCategory))
  },

  mapPersonalizations(raw) {
    const out = new Set<Personalization>()
    for (const code of raw.rawPersonalizationCodes ?? []) {
      const mapped = genericPersonalization(code, raw)
      if (mapped) out.add(mapped)
    }
    return [...out]
  },
}

const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, XXL: 6, "3XL": 7, XXXL: 7,
  "4XL": 8, "5XL": 9,
}

function sizeOrder(a: string, b: string): number {
  const left = SIZE_ORDER[a.toUpperCase()]
  const right = SIZE_ORDER[b.toUpperCase()]
  if (left !== undefined && right !== undefined) return left - right
  if (left !== undefined) return -1
  if (right !== undefined) return 1
  return a.localeCompare(b)
}
