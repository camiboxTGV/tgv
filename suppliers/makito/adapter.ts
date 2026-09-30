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
  decodeMakitoCategories,
  encodeMakitoCategories,
  mapMakitoCategory,
} from "./category-mapping.ts"
import {
  fetchMakitoAssetFromEnv,
  loadMakitoCatalogFeeds,
  loadMakitoInventoryFeeds,
} from "./fetch.ts"
import {
  describeMakitoPersonalizations,
  mapMakitoPersonalizations,
  type MakitoTechniqueInput,
} from "./personalization.ts"
import type {
  MakitoCatalogFeeds,
  MakitoCatalogProduct,
  MakitoIdentifier,
  MakitoInventoryFeeds,
  MakitoNumericValue,
  MakitoPriceEntry,
  MakitoPrintArea,
  MakitoPrintConfigProduct,
  MakitoPrintTechnique,
  MakitoStockEntry,
} from "./types.ts"

const SUPPLIER_ID = "makito"
const DISPLAY_NAME = "Makito"
const ASSET_ORIGIN = "https://apis.makito.es"
const CATALOG_ASSET_PREFIX = "/catalog/assets/"

export interface MakitoResolvedPrice {
  unitPriceEur: number
  minimumQuantity: number
  /** The resolver must declare which documented identifier the entry uses. */
  binding: "variant" | "product"
}

export type MakitoPriceResolver = (
  entry: MakitoPriceEntry,
) => MakitoResolvedPrice | null

export interface MakitoBuildOptions {
  /** Override the verified live-account price contract in isolated tests only. */
  priceResolver?: MakitoPriceResolver
  /** Optional precomputed binding override used by isolated inventory tests. */
  productVariantIds?: ReadonlyMap<string, readonly string[]>
}

interface UnitPrice {
  unitPriceEur: number
  minimumQuantity: number
}

interface IndexedPrice extends UnitPrice {
  material: string
}

interface PriceIndex {
  byVariant: ReadonlyMap<string, IndexedPrice>
  byProduct: ReadonlyMap<string, IndexedPrice>
}

interface ParsedVariant {
  id: string
  colorName?: string
  colorHex?: string
  size?: string
  sourceImages: string[]
}

interface ProductPrintConfig {
  techniques: MakitoTechniqueInput[]
}

/**
 * Parse a Makito numeric field without locale guesses or lossy coercion.
 */
export function parseMakitoDecimal(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
  if (typeof value !== "string") return Number.NaN
  const trimmed = value.trim()
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return Number.NaN
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

/**
 * Convert an API identifier to the stable string representation used by the
 * catalog. Unsafe numbers are rejected so variant bindings never round.
 */
export function makitoIdentifier(value: unknown, label = "identifier"): string {
  if (typeof value === "string") {
    const cleaned = value.trim()
    if (cleaned) return cleaned
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value)
  }
  throw new Error(`makito ${label} is invalid`)
}

/** Resolve the verified Makito live-account EUR amount/base-quantity contract. */
export function resolveUnambiguousMakitoPrice(
  entry: MakitoPriceEntry,
): UnitPrice | null {
  if (cleanText(entry.currency).toUpperCase() !== "EUR") return null
  const baseQuantity = parseMakitoDecimal(entry.baseQuantity)
  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) return null
  if (!Array.isArray(entry.scales) || entry.scales.length !== 1) return null
  const scale = entry.scales[0]
  if (!scale || parseMakitoDecimal(scale.quantity) !== 1) return null
  const amount = parseMakitoDecimal(scale.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const unitPriceEur = amount / baseQuantity
  if (!Number.isFinite(unitPriceEur) || unitPriceEur <= 0) return null
  return { unitPriceEur, minimumQuantity: 1 }
}

/** Production resolver: live price-list `material` values bind to product refs. */
export const resolveMakitoProductPrice: MakitoPriceResolver = (entry) => {
  const resolved = resolveUnambiguousMakitoPrice(entry)
  return resolved ? { ...resolved, binding: "product" } : null
}

export function isTrustedMakitoCatalogAssetUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4_096) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (
    url.origin !== ASSET_ORIGIN ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.startsWith(CATALOG_ASSET_PREFIX)
  ) {
    return false
  }
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(url.pathname)
  } catch {
    return false
  }
  if (!decodedPath.startsWith(CATALOG_ASSET_PREFIX) || decodedPath.includes("\\")) {
    return false
  }
  const segments = decodedPath.split("/")
  return !segments.some((segment) => segment === "." || segment === "..")
}

export function buildMakitoInventorySnapshot(
  feeds: MakitoInventoryFeeds,
  options: MakitoBuildOptions = {},
): SupplierInventorySnapshot {
  const prices = buildPriceIndex(feeds.priceList.priceList, options.priceResolver)
  const stock = buildStockIndex(feeds.stock.stocks, feeds.fetchedAt)
  const productVariantIds = options.productVariantIds ??
    buildProductVariantIndex(feeds.catalog.products)
  const knownVariantIds = new Set(
    [...productVariantIds.values()].flatMap((variantIds) => [...variantIds]),
  )
  const inventoryPrices = new Map<string, number>()
  for (const [material, price] of prices.byVariant) {
    if (!knownVariantIds.has(material)) continue
    inventoryPrices.set(material, price.unitPriceEur)
  }
  for (const [productRef, price] of prices.byProduct) {
    if (knownVariantIds.has(productRef)) {
      throw new Error("makito inventory price list contains a variant material as a product key")
    }
    const variantIds = productVariantIds.get(productRef)
    // Makito's price snapshot contains entries outside the general catalog.
    if (!variantIds?.length) continue
    for (const variantId of variantIds) {
      const normalizedId = makitoIdentifier(variantId, "inventory variant id")
      const existing = inventoryPrices.get(normalizedId)
      if (existing !== undefined && existing !== price.unitPriceEur) {
        throw new Error(`makito material ${normalizedId} has conflicting product and variant prices`)
      }
      inventoryPrices.set(normalizedId, price.unitPriceEur)
    }
  }
  return {
    fetchedAt: requireTimestamp(feeds.fetchedAt),
    prices: inventoryPrices,
    stock,
  }
}

export function buildMakitoProducts(
  feeds: MakitoCatalogFeeds,
  options: MakitoBuildOptions = {},
): RawProduct[] {
  const fetchedAt = requireTimestamp(feeds.fetchedAt)
  if (!Array.isArray(feeds.catalog.products) || feeds.catalog.products.length === 0) {
    throw new Error("makito catalog is empty")
  }

  const prices = buildPriceIndex(feeds.priceList.priceList, options.priceResolver)
  const stock = buildStockIndex(feeds.stock.stocks, fetchedAt)
  const printConfig = buildPrintConfigIndex(feeds.printConfig.products)
  const seenProducts = new Set<string>()
  const seenVariants = new Map<string, string>()
  const products: RawProduct[] = []

  for (const product of feeds.catalog.products) {
    const productRef = makitoIdentifier(product.ref, "product ref")
    if (seenProducts.has(productRef)) {
      throw new Error(`makito returned duplicate product ref ${productRef}`)
    }
    seenProducts.add(productRef)

    const name = cleanText(product.name)
    if (!name) continue
    const parsedVariants = parseProductVariants(product, productRef)
    if (parsedVariants.length === 0) continue
    for (const variant of parsedVariants) {
      const owner = seenVariants.get(variant.id)
      if (owner && owner !== productRef) {
        throw new Error(
          `makito material ${variant.id} is assigned to products ${owner} and ${productRef}`,
        )
      }
      seenVariants.set(variant.id, productRef)
    }

    const productScopedVariantKeys = parsedVariants.filter((variant) =>
      prices.byProduct.has(variant.id)
    )
    if (productScopedVariantKeys.length > 0) {
      throw new Error(
        `makito product ${productRef} price list contains mixed or variant material keys`,
      )
    }

    const variantPrices = parsedVariants.map((variant) =>
      priceForVariant(prices, productRef, variant.id)
    )
    const matchedPriceCount = variantPrices.filter(Boolean).length
    if (matchedPriceCount === 0) continue
    if (matchedPriceCount !== parsedVariants.length) {
      throw new Error(`makito product ${productRef} has a partial price binding`)
    }

    const rawVariants = parsedVariants.map((variant, index) => {
      const price = variantPrices[index]!
      return {
        supplierVariantId: variant.id,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        size: variant.size,
        priceEur: price.unitPriceEur,
        stock: stock.get(variant.id) ?? 0,
      } satisfies RawVariant
    })

    const pricesForProduct = rawVariants.map((variant) => variant.priceEur)
    const categories = extractCategories(product.categories)
    const materials = extractMaterialDescriptions(product)
    const images = distinct([
      ...extractProductImages(product),
      ...parsedVariants.flatMap((variant) => variant.sourceImages),
    ]).slice(0, 1)
    if (images.length === 0) continue

    const techniques = [
      ...(printConfig.get(productRef)?.techniques ?? []),
      ...extractProductPrintCodes(product.printcode),
    ]
    const personalizations = describeMakitoPersonalizations(techniques)
    const moq = Math.min(
      ...variantPrices.map((price) => price!.minimumQuantity),
    )
    const totalStock = safeStockTotal(rawVariants, productRef)
    const description = cleanRichText(product.description) || undefined
    const colors = distinct(
      rawVariants.map((variant) => variant.colorName).filter(isNonEmpty),
    ).sort((left, right) => left.localeCompare(right))
    const sizes = distinct(
      rawVariants.map((variant) => variant.size).filter(isNonEmpty),
    ).sort(sizeOrder)
    const attributes: Record<string, string> = { productRef }
    const webReference = optionalIdentifier(product.web_reference)
    const customCode = cleanText(product.custom_code)
    if (webReference) attributes.webReference = webReference
    if (customCode) attributes.customCode = customCode

    products.push({
      supplierId: SUPPLIER_ID,
      supplierSku: productRef,
      supplierVariantIds: rawVariants.map((variant) => variant.supplierVariantId),
      name,
      description,
      descriptionLong: description,
      supplierCategory: encodeMakitoCategories(categories),
      supplierPriceEur: Math.min(...pricesForProduct),
      supplierPriceEurMax: Math.max(...pricesForProduct),
      originalCurrency: "EUR",
      originalPrice: Math.min(...pricesForProduct),
      stock: totalStock,
      images,
      attributes,
      fetchedAt,
      moq,
      rawPersonalizationCodes: personalizations.map((method) => method.code),
      supplierPersonalizations: personalizations,
      material: materials,
      colors,
      sizes,
      specifications: makitoProductSpecifications(product, materials),
      variantCount: rawVariants.length,
      variants: rawVariants,
      brand: cleanText(product.brand) || undefined,
    })
  }

  if (products.length === 0) {
    throw new Error("makito catalog has no safely publishable products")
  }
  return products.sort((left, right) =>
    left.supplierSku.localeCompare(right.supplierSku, undefined, { numeric: true }),
  )
}

export function makitoProductSpecifications(
  product: MakitoCatalogProduct,
  materials: readonly string[],
): ProductSpecification[] {
  const specs: ProductSpecification[] = []
  const dimensions = [
    ["Length", product.length],
    ["Width", product.width],
    ["Height", product.height],
    ["Diameter", product.diameter],
  ]
    .map(([label, value]) => {
      const formatted = numericText(value)
      return formatted ? `${label}: ${formatted}` : ""
    })
    .filter(Boolean)
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
  const weight = numericText(product.weight)
  if (weight) {
    specs.push({
      key: "supplier-weight",
      label: "Supplier weight",
      labelRo: "Greutate furnizor",
      value: weight,
    })
  }
  const batteries = simpleTextValues(product.batteries)
  if (batteries.length) {
    specs.push({
      key: "batteries",
      label: "Batteries",
      labelRo: "Baterii",
      value: batteries.join(", "),
    })
  }
  return specs
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,
  imageMirror: {
    enabledWhenImagesSkipped: true,
    maxProductImages: 1,
    fetch: fetchMakitoAssetFromEnv,
  },

  async fetchAll(): Promise<RawProduct[]> {
    return buildMakitoProducts(await loadMakitoCatalogFeeds())
  },

  async fetchInventory(): Promise<SupplierInventorySnapshot> {
    return buildMakitoInventorySnapshot(await loadMakitoInventoryFeeds())
  },

  mapCategory(raw) {
    return mapMakitoCategory({
      categories: decodeMakitoCategories(raw.supplierCategory),
      name: raw.name,
      material: raw.material,
    })
  },

  mapPersonalizations(raw): Personalization[] {
    return mapMakitoPersonalizations(raw)
  },
}

function buildPriceIndex(
  entries: readonly MakitoPriceEntry[],
  resolver: MakitoPriceResolver = resolveMakitoProductPrice,
): PriceIndex {
  if (!Array.isArray(entries)) throw new Error("makito price list is invalid")
  const byVariant = new Map<string, IndexedPrice>()
  const byProduct = new Map<string, IndexedPrice>()
  let binding: MakitoResolvedPrice["binding"] | undefined
  for (const entry of entries) {
    const material = makitoIdentifier(entry.material, "price material")
    const resolved = resolver(entry)
    if (!resolved) continue
    assertResolvedPrice(resolved, material)
    if (binding && binding !== resolved.binding) {
      throw new Error("makito price list mixes product and variant binding scopes")
    }
    binding = resolved.binding
    const next: IndexedPrice = {
      material,
      unitPriceEur: resolved.unitPriceEur,
      minimumQuantity: resolved.minimumQuantity,
    }
    const prices = resolved.binding === "variant" ? byVariant : byProduct
    const other = resolved.binding === "variant" ? byProduct : byVariant
    if (other.has(material)) {
      throw new Error(`makito price key ${material} has conflicting binding scopes`)
    }
    const existing = prices.get(material)
    if (
      existing &&
      (existing.unitPriceEur !== next.unitPriceEur ||
        existing.minimumQuantity !== next.minimumQuantity)
    ) {
      throw new Error(`makito material ${material} has conflicting EUR prices`)
    }
    prices.set(material, next)
  }
  return { byVariant, byProduct }
}

function priceForVariant(
  prices: PriceIndex,
  productRef: string,
  variantId: string,
): IndexedPrice | undefined {
  const variantPrice = prices.byVariant.get(variantId)
  const productPrice = prices.byProduct.get(productRef)
  if (variantPrice && productPrice) {
    throw new Error(
      `makito product ${productRef} variant ${variantId} has both product and variant prices`,
    )
  }
  return variantPrice ?? productPrice
}

function assertResolvedPrice(price: MakitoResolvedPrice, material: string): void {
  if (!Number.isFinite(price.unitPriceEur) || price.unitPriceEur <= 0) {
    throw new Error(`makito material ${material} resolved to an invalid EUR price`)
  }
  if (!Number.isSafeInteger(price.minimumQuantity) || price.minimumQuantity <= 0) {
    throw new Error(`makito material ${material} resolved to an invalid minimum quantity`)
  }
  if (price.binding !== "variant" && price.binding !== "product") {
    throw new Error(`makito material ${material} resolved to an invalid binding scope`)
  }
}

function buildStockIndex(
  entries: readonly MakitoStockEntry[],
  fetchedAt: string,
): ReadonlyMap<string, number> {
  if (!Array.isArray(entries)) throw new Error("makito stock list is invalid")
  const snapshotTime = Date.parse(fetchedAt)
  if (!Number.isFinite(snapshotTime)) throw new Error("makito fetchedAt is invalid")
  const records = new Map<string, { material: string; quantity: number; current: boolean }>()

  for (const entry of entries) {
    const material = makitoIdentifier(entry.material, "stock material")
    const quantity = parseMakitoDecimal(entry.quantity)
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error(`makito material ${material} has invalid stock quantity`)
    }
    const storage = entry.storageId === undefined || entry.storageId === null
      ? ""
      : makitoIdentifier(entry.storageId, "storage id")
    const availableDate = cleanText(entry.availableDate)
    let current = true
    if (availableDate) {
      const timestamp = Date.parse(availableDate)
      if (!Number.isFinite(timestamp)) {
        throw new Error(`makito material ${material} has invalid availableDate`)
      }
      current = timestamp <= snapshotTime
    }
    const key = `${material}\0${storage}\0${availableDate}`
    const existing = records.get(key)
    if (existing && existing.quantity !== quantity) {
      throw new Error(`makito material ${material} has conflicting stock records`)
    }
    records.set(key, { material, quantity, current })
  }

  const totals = new Map<string, number>()
  for (const record of records.values()) {
    if (!record.current) continue
    const total = (totals.get(record.material) ?? 0) + record.quantity
    if (!Number.isSafeInteger(total)) {
      throw new Error(`makito material ${record.material} stock exceeds safe range`)
    }
    totals.set(record.material, total)
  }
  return totals
}

function parseProductVariants(
  product: MakitoCatalogProduct,
  productRef: string,
): ParsedVariant[] {
  const rawVariants = explicitVariantValues(product)
  const byId = new Map<string, ParsedVariant>()
  for (const raw of rawVariants) {
    const parsed = parseVariant(raw, productRef)
    if (!parsed) continue
    const existing = byId.get(parsed.id)
    if (existing && !sameVariant(existing, parsed)) {
      throw new Error(
        `makito product ${productRef} has conflicting variant ${parsed.id}`,
      )
    }
    byId.set(parsed.id, existing ?? parsed)
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  )
}

function buildProductVariantIndex(
  products: readonly MakitoCatalogProduct[],
): ReadonlyMap<string, readonly string[]> {
  if (!Array.isArray(products)) throw new Error("makito catalog is invalid")
  const result = new Map<string, readonly string[]>()
  const seenProductRefs = new Set<string>()
  const variantOwners = new Map<string, string>()
  for (const product of products) {
    const productRef = makitoIdentifier(product.ref, "product ref")
    if (seenProductRefs.has(productRef)) {
      throw new Error(`makito returned duplicate product ref ${productRef}`)
    }
    seenProductRefs.add(productRef)
    const variantIds = parseProductVariants(product, productRef).map((variant) => variant.id)
    if (variantIds.length === 0) continue
    for (const variantId of variantIds) {
      const owner = variantOwners.get(variantId)
      if (owner && owner !== productRef) {
        throw new Error(
          `makito material ${variantId} is assigned to products ${owner} and ${productRef}`,
        )
      }
      variantOwners.set(variantId, productRef)
    }
    result.set(productRef, variantIds)
  }
  return result
}

function explicitVariantValues(product: MakitoCatalogProduct): unknown[] {
  if (product.variants !== undefined && product.variants !== null) {
    if (!Array.isArray(product.variants)) {
      throw new Error(`makito product ${makitoIdentifier(product.ref)} variants is invalid`)
    }
    return product.variants
  }
  return []
}

function parseVariant(value: unknown, productRef: string): ParsedVariant | null {
  // `variant_reference` is a web/catalog reference, never the stock material.
  if (typeof value === "string" || typeof value === "number") return null
  const record = objectRecord(value, `makito product ${productRef} variant`)
  const assets = [record.variant_image, record.variant_thumbnail]
    .map((asset) => parseVariantAsset(asset, productRef))
    .filter(isPresent)
  if (assets.length === 0) return null
  const materials = distinct(assets.map((asset) => asset.material))
  if (materials.length !== 1) {
    throw new Error(`makito product ${productRef} variant assets disagree on material`)
  }
  const id = materials[0]!
  const explicitMaterial = firstDefined(record.material, record.matnr)
  if (
    explicitMaterial !== undefined &&
    explicitMaterial !== null &&
    makitoIdentifier(explicitMaterial, `product ${productRef} material`) !== id
  ) {
    throw new Error(`makito product ${productRef} variant material conflicts with its asset path`)
  }
  const color = parseColor(record)
  const size = parseSize(record)
  return {
    id,
    colorName: color.name,
    colorHex: color.hex,
    size,
    sourceImages: distinct(assets.map((asset) => asset.url)),
  }
}

function parseVariantAsset(
  value: unknown,
  productRef: string,
): { material: string; url: string } | null {
  if (value === undefined || value === null || value === "") return null
  if (!isTrustedMakitoCatalogAssetUrl(value)) return null
  const url = new URL(value)
  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  const segments = decodedPath.slice(CATALOG_ASSET_PREFIX.length).split("/")
  if (segments.length !== 4) {
    throw new Error(`makito product ${productRef} variant asset path is invalid`)
  }
  const [assetProductRef, material, type, filename] = segments
  if (assetProductRef !== productRef) {
    throw new Error(`makito product ${productRef} variant asset belongs to another product`)
  }
  if (!material || !/^\d{11}$/.test(material)) {
    throw new Error(`makito product ${productRef} variant asset material is invalid`)
  }
  if ((type !== "principal" && type !== "thumbnail") || !filename) {
    throw new Error(`makito product ${productRef} variant asset path is invalid`)
  }
  return { material, url: value }
}

function parseColor(variant: Record<string, unknown>): { name?: string; hex?: string } {
  const value = firstDefined(variant.color, variant.colour)
  const color = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
  const title = localizedText(
    firstDefined(
      variant.colorTitle,
      variant.colourTitle,
      variant.variant_name,
      color?.title,
      color?.name,
      color?.description,
      color?.label,
      color?.value,
      value,
    ),
  )
  const code = localizedText(
    firstDefined(
      variant.colorCode,
      variant.colourCode,
      variant.variant_colorcode,
      color?.code,
    ),
  )
  const name = title || code
  const rawHex = cleanText(
    firstDefined(
      variant.colorHex,
      variant.variant_colorhex,
      color?.hex,
      color?.rgb,
      color?.hexadecimal,
    ),
  )
  const normalizedHex = rawHex.replace(/^#/, "")
  const hex = /^[0-9a-f]{6}$/i.test(normalizedHex)
    ? `#${normalizedHex.toUpperCase()}`
    : undefined
  return { name: name || undefined, hex }
}

function parseSize(variant: Record<string, unknown>): string | undefined {
  const value = firstDefined(variant.size, variant.variant_size)
  const size = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
  const title = localizedText(
    firstDefined(
      variant.sizeTitle,
      size?.title,
      size?.name,
      size?.description,
      size?.label,
      size?.value,
      value,
    ),
  )
  const code = localizedText(firstDefined(variant.sizeCode, size?.code))
  return title || code || undefined
}

function sameVariant(left: ParsedVariant, right: ParsedVariant): boolean {
  return left.id === right.id &&
    left.colorName === right.colorName &&
    left.colorHex === right.colorHex &&
    left.size === right.size &&
    arraysEqual(left.sourceImages, right.sourceImages)
}

function extractProductImages(product: MakitoCatalogProduct): string[] {
  const record = product as Record<string, unknown>
  return extractAssetUrls([
    product.image,
    record.images,
    record.img_min,
    record.img_max,
    record.main,
    record.url,
  ]).slice(0, 1)
}

function extractAssetUrls(value: unknown, depth = 0): string[] {
  if (depth > 8) return []
  if (isTrustedMakitoCatalogAssetUrl(value)) return [value]
  if (Array.isArray(value)) {
    return distinct(value.flatMap((item) => extractAssetUrls(item, depth + 1)))
  }
  if (!value || typeof value !== "object") return []
  const record = value as Record<string, unknown>
  const imageKeys = [
    "url",
    "href",
    "image",
    "images",
    "imageUrl",
    "img100",
    "img_min",
    "img_max",
    "main",
    "large",
    "original",
    "files",
  ]
  return distinct(
    imageKeys.flatMap((key) => extractAssetUrls(record[key], depth + 1)),
  )
}

function extractCategories(value: unknown): string[] {
  const categories: string[] = []
  const visit = (item: unknown, depth: number): void => {
    if (depth > 8 || item === undefined || item === null) return
    if (typeof item === "string") {
      const text = cleanText(item)
      if (text) categories.push(text)
      return
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child, depth + 1)
      return
    }
    if (typeof item !== "object") return
    const record = item as Record<string, unknown>
    for (const key of ["category", "name", "label", "description"]) {
      const text = cleanText(record[key])
      if (text) categories.push(text)
    }
    for (const key of ["parent", "parents", "children", "categories"]) {
      visit(record[key], depth + 1)
    }
  }
  visit(value, 0)
  return distinct(categories)
}

function extractMaterialDescriptions(product: MakitoCatalogProduct): string[] {
  const record = product as Record<string, unknown>
  return distinct([
    ...simpleTextValues(product.material),
    ...simpleTextValues(record.materialDescription),
    ...simpleTextValues(record.material_description),
    ...simpleTextValues(record.composition),
  ])
}

function buildPrintConfigIndex(
  products: readonly MakitoPrintConfigProduct[],
): ReadonlyMap<string, ProductPrintConfig> {
  if (!Array.isArray(products)) throw new Error("makito print config is invalid")
  const result = new Map<string, ProductPrintConfig>()
  for (const product of products) {
    const record = product as Record<string, unknown>
    const rawRef = firstDefined(
      product.id,
      product.productReference,
      record.ref,
      record.reference,
      record.product_ref,
    )
    if (rawRef === undefined || rawRef === null) continue
    const ref = makitoIdentifier(rawRef, "print-config product reference")
    const techniques = Array.isArray(product.techniques)
      ? product.techniques.flatMap(parsePrintTechnique)
      : []
    const areaTechniques = Array.isArray(product.areas)
      ? product.areas.flatMap(parsePrintAreaTechniques)
      : []
    const existing = result.get(ref)
    result.set(ref, {
      techniques: [
        ...(existing?.techniques ?? []),
        ...techniques,
        ...areaTechniques,
      ],
    })
  }
  return result
}

function parsePrintAreaTechniques(area: MakitoPrintArea): MakitoTechniqueInput[] {
  const printSize = formatPrintArea(area)
  if (typeof area.techniques === "string") {
    const rawTechnique = cleanRichText(area.techniques)
    if (!rawTechnique) return []
    return [{
      id: rawTechnique,
      description: rawTechnique,
      printSizes: printSize ? [printSize] : [],
    }]
  }
  if (!Array.isArray(area.techniques)) return []
  return area.techniques.flatMap((technique) =>
    parsePrintTechnique(technique).map((parsed) => ({
      ...parsed,
      printSizes: distinct([...(parsed.printSizes ?? []), ...(printSize ? [printSize] : [])]),
    }))
  )
}

function formatPrintArea(area: MakitoPrintArea): string {
  const width = positiveNumericText(area.width)
  const height = positiveNumericText(area.height)
  const position = cleanRichText(area.position)
  const dimensions = width && height ? `${width} × ${height} mm` : ""
  return [dimensions, position].filter(Boolean).join(" · ")
}

function parsePrintTechnique(technique: MakitoPrintTechnique): MakitoTechniqueInput[] {
  if (technique.id === undefined || technique.id === null) return []
  const id = makitoIdentifier(technique.id, "print technique id")
  const maximumColors = optionalPositiveInteger(technique.maximumColors)
  const fullColor = optionalBoolean(technique.fullColor)
  const record = technique as Record<string, unknown>
  return [{
    id,
    description: cleanText(technique.description) || undefined,
    category: cleanText(technique.category) || undefined,
    technicalRange: cleanText(technique.technicalRange) || undefined,
    maximumColors,
    fullColor,
    printSizes: simpleTextValues(
      firstDefined(record.printSizes, record.print_sizes, record.printSize),
    ),
  }]
}

function extractProductPrintCodes(value: unknown): MakitoTechniqueInput[] {
  if (value === undefined || value === null) return []
  const items = Array.isArray(value) ? value : [value]
  const techniques: MakitoTechniqueInput[] = []
  for (const item of items) {
    if (typeof item === "string" || typeof item === "number") {
      const id = makitoIdentifier(item, "product print code")
      techniques.push({ id, description: id })
      continue
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const rawId = firstDefined(record.id, record.code, record.printcode)
    if (rawId === undefined || rawId === null) continue
    const id = makitoIdentifier(rawId, "product print code")
    techniques.push({
      id,
      description: cleanText(
        firstDefined(record.description, record.name, record.label),
      ) || id,
    })
  }
  return techniques
}

function safeStockTotal(variants: readonly RawVariant[], productRef: string): number {
  let total = 0
  for (const variant of variants) {
    total += variant.stock
    if (!Number.isSafeInteger(total)) {
      throw new Error(`makito product ${productRef} stock exceeds safe range`)
    }
  }
  return total
}

function simpleTextValues(value: unknown): string[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) {
    return distinct(value.flatMap((item) => simpleTextValues(item)))
  }
  const scalar = simpleScalarText(value)
  return scalar ? [scalar] : []
}

function simpleScalarText(value: unknown): string {
  if (typeof value === "string") return cleanText(value)
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return ""
}

function numericText(value: MakitoNumericValue | null | undefined): string {
  if (value === undefined || value === null) return ""
  const parsed = parseMakitoDecimal(value)
  return Number.isFinite(parsed) ? String(parsed) : ""
}

function positiveNumericText(value: MakitoNumericValue | null | undefined): string {
  const text = numericText(value)
  return text && Number(text) > 0 ? text : ""
}

function optionalIdentifier(value: MakitoIdentifier | null | undefined): string {
  if (value === undefined || value === null) return ""
  return makitoIdentifier(value)
}

function optionalPositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined
  const parsed = parseMakitoDecimal(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (value === 1 || value === "1" || value === "true") return true
  if (value === 0 || value === "0" || value === "false") return false
  return undefined
}

function objectRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is invalid`)
  }
  return value as Record<string, unknown>
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null)
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function cleanRichText(value: unknown): string {
  return cleanText(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function localizedText(value: unknown, depth = 0): string {
  if (depth > 3 || value === undefined || value === null) return ""
  const scalar = simpleScalarText(value)
  if (scalar) return scalar
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = localizedText(item, depth + 1)
      if (text) return text
    }
    return ""
  }
  if (typeof value !== "object") return ""
  const record = value as Record<string, unknown>
  for (const key of ["en", "en-gb", "en_GB", "english", "title", "name", "value"]) {
    const text = localizedText(record[key], depth + 1)
    if (text) return text
  }
  return ""
}

function requireTimestamp(value: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) {
    throw new Error("makito fetchedAt is invalid")
  }
  return value
}

function distinct(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const cleaned = cleanText(value)
    if (!cleaned || seen.has(cleaned)) continue
    seen.add(cleaned)
    result.push(cleaned)
  }
  return result
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value)
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function sizeOrder(left: string, right: string): number {
  const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"]
  const leftIndex = order.indexOf(left.toUpperCase())
  const rightIndex = order.indexOf(right.toUpperCase())
  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) return 1
    if (rightIndex === -1) return -1
    return leftIndex - rightIndex
  }
  return left.localeCompare(right, undefined, { numeric: true })
}
