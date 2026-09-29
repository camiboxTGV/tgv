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
  decodeBlueCollectionCategory,
  encodeBlueCollectionCategory,
  mapBlueCollectionCategory,
  tupleKey,
} from "./category-mapping.ts"
import type {
  BlueCollectionCategoryTuple,
} from "./category-mapping.ts"
import {
  loadBlueCollectionCatalogFeeds,
  loadBlueCollectionInventoryFeeds,
} from "./fetch.ts"
import {
  describeBlueCollectionPersonalizations,
  mapBlueCollectionPersonalizations,
} from "./personalization.ts"
import type {
  BlueCollectionCatalogFeeds,
  BlueCollectionCategory,
  BlueCollectionInventoryFeeds,
  BlueCollectionProduct,
  BlueCollectionStockEntry,
  BlueCollectionSubcategory,
} from "./types.ts"

const SUPPLIER_ID = "bluecollection"
const DISPLAY_NAME = "Blue Collection"
const MAX_PRODUCT_IMAGES = 64
const DEFAULT_MINIMUM_COVERAGE = 0.98
const MAX_PLAUSIBLE_UNIT_WEIGHT_KG = 100

const COLOR_NAMES: Readonly<Record<string, string>> = {
  "12": "Black",
  "13": "Blue",
  "14": "Navy blue",
  "15": "Red",
  "16": "Green",
  "17": "Light green",
  "18": "Graphite",
  "19": "Silver",
  "20": "Orange",
  "23": "Yellow",
  "24": "Burgundy",
  "26": "Violet",
  "27": "Pink",
  "97": "Light blue",
  "98": "Multicolour",
  "99": "Beige",
  "100": "White",
  "101": "Brown",
  "103": "Natural",
  "104": "Olive",
  "106": "Grey",
  "107": "Transparent",
  "108": "Gold",
  "316": "Turquoise",
  "561": "Champagne",
  "633": "Celadon",
  "1933": "Bottle green",
}

export interface BlueCollectionBuildOptions {
  minimumRawProducts?: number
  minimumStockEntries?: number
  minimumMerchandiseVariants?: number
  minimumPublishedProducts?: number
  minimumMarkingNames?: number
  minimumCoverage?: number
}

interface ResolvedSafetyOptions {
  minimumRawProducts: number
  minimumStockEntries: number
  minimumMerchandiseVariants: number
  minimumPublishedProducts: number
  minimumMarkingNames: number
  minimumCoverage: number
}

interface FamilyIdentity {
  key: string
  supplierSku: string
  sourceCode: string
}

interface FamilyRow {
  product: BlueCollectionProduct
  price: number
  stock: number
  images: string[]
  color?: string
  tuple: BlueCollectionCategoryTuple
}

interface TaxonomyLookups {
  categories: ReadonlyMap<number, BlueCollectionCategory>
  subcategories: ReadonlyMap<number, BlueCollectionSubcategory>
}

const DEFAULT_SAFETY: ResolvedSafetyOptions = {
  minimumRawProducts: 1_500,
  minimumStockEntries: 1_500,
  minimumMerchandiseVariants: 1_500,
  minimumPublishedProducts: 1_000,
  minimumMarkingNames: 9,
  minimumCoverage: DEFAULT_MINIMUM_COVERAGE,
}

export function buildBlueCollectionProducts(
  feeds: BlueCollectionCatalogFeeds,
  options: BlueCollectionBuildOptions = {},
): RawProduct[] {
  const safety = resolveSafetyOptions(options)
  assertRawProductFeed(feeds.products, safety.minimumRawProducts)
  if (feeds.markingNames.length < safety.minimumMarkingNames) {
    throw new Error(
      `bluecollection marking-name feed is unsafe: ${feeds.markingNames.length}; ` +
        `required at least ${safety.minimumMarkingNames}.`,
    )
  }

  const stock = buildStockMap(feeds.stock, safety.minimumStockEntries)
  const taxonomy = buildTaxonomyLookups(feeds.categories, feeds.subcategories)
  const merchandise = feeds.products.filter(
    (product) => product.active && product.category !== 12,
  )
  if (merchandise.length < safety.minimumMerchandiseVariants) {
    throw new Error(
      `bluecollection merchandise feed is unsafe: ${merchandise.length}; ` +
        `required at least ${safety.minimumMerchandiseVariants}.`,
    )
  }

  assertCoverage(
    "EUR price",
    merchandise.filter((product) => validPrice(product) !== null).length,
    merchandise.length,
    safety.minimumCoverage,
  )
  assertCoverage(
    "stock binding",
    merchandise.filter((product) => stock.has(clean(product.index))).length,
    merchandise.length,
    safety.minimumCoverage,
  )
  assertCoverage(
    "category relation",
    merchandise.filter((product) => resolveProductCategory(product, taxonomy) !== null).length,
    merchandise.length,
    safety.minimumCoverage,
  )
  assertCoverage(
    "localized name",
    merchandise.filter((product) => localizedText(product.names, "title")).length,
    merchandise.length,
    safety.minimumCoverage,
  )

  const families = new Map<string, { identity: FamilyIdentity; rows: FamilyRow[] }>()
  for (const product of merchandise) {
    const index = clean(product.index)
    const price = validPrice(product)
    if (!index || price === null) continue
    const identity = blueCollectionFamilyIdentity(index)
    const tuple = resolveProductCategory(product, taxonomy) ?? unresolvedTuple(product)
    const images = productImages(product)
    const row: FamilyRow = {
      product,
      price,
      stock: stock.get(index) ?? safeStock(product.quantity),
      images,
      color: productColor(product),
      tuple,
    }
    const family = families.get(identity.key) ?? { identity, rows: [] }
    family.rows.push(row)
    families.set(identity.key, family)
  }

  const groupsWithImages = [...families.values()].filter((family) =>
    family.rows.some((row) => row.images.length > 0)
  ).length
  assertCoverage(
    "family image",
    groupsWithImages,
    families.size,
    safety.minimumCoverage,
  )

  const products: RawProduct[] = []
  for (const family of [...families.values()].sort((left, right) =>
    left.identity.key.localeCompare(right.identity.key, undefined, { numeric: true })
  )) {
    const rows = [...family.rows].sort((left, right) =>
      left.product.index.localeCompare(right.product.index, undefined, { numeric: true })
    )
    const totalStock = rows.reduce((sum, row) => sum + row.stock, 0)
    const representative = chooseRepresentative(rows)
    const images = familyImages(rows, representative)
    if (images.length === 0) {
      if (totalStock > 0) {
        throw new Error(
          `bluecollection family ${family.identity.supplierSku} is in stock but has no approved images.`,
        )
      }
      continue
    }

    const name = localizedText(representative.product.names, "title") ||
      representative.product.index
    const description = localizedText(representative.product.descriptions, "text") || undefined
    const materials = familyMaterials(rows)
    const category = chooseFamilyCategory(rows)
    const variants = rows.map(rawVariant)
    const prices = variants.map((variant) => variant.priceEur)
    const supplierPersonalizations = describeBlueCollectionPersonalizations(
      rows.map((row) => row.product),
      feeds.markingNames,
    )
    const colors = distinct(rows.map((row) => row.color).filter(isNonEmpty)).sort((a, b) =>
      a.localeCompare(b)
    )
    const weightGrams = familyWeightGrams(rows)
    const capacity = familyCapacity(rows, name)

    products.push({
      supplierId: SUPPLIER_ID,
      supplierSku: family.identity.supplierSku,
      supplierVariantIds: variants.map((variant) => variant.supplierVariantId),
      name,
      description,
      descriptionLong: description,
      supplierCategory: encodeBlueCollectionCategory(category),
      supplierPriceEur: Math.min(...prices),
      ...(Math.max(...prices) > Math.min(...prices)
        ? { supplierPriceEurMax: Math.max(...prices) }
        : {}),
      originalCurrency: "EUR",
      originalPrice: representative.price,
      stock: totalStock,
      images,
      attributes: {
        familyKey: family.identity.key,
        categoryId: String(category.categoryId ?? ""),
        subcategoryId: String(category.subcategoryId ?? ""),
      },
      sourceUrl: `https://bluecollection.gifts/en/${encodeURIComponent(family.identity.sourceCode)}.html`,
      fetchedAt: feeds.fetchedAt,
      weightGrams,
      rawPersonalizationCodes: supplierPersonalizations.map((method) => method.code),
      supplierPersonalizations,
      material: materials,
      colors,
      specifications: blueCollectionProductSpecifications(rows, materials),
      variantCount: variants.length,
      variants,
      capacity,
    })
  }

  if (products.length < safety.minimumPublishedProducts) {
    throw new Error(
      `bluecollection publishable product count is unsafe: ${products.length}; ` +
        `required at least ${safety.minimumPublishedProducts}.`,
    )
  }
  return products
}

export function buildBlueCollectionInventorySnapshot(
  feeds: BlueCollectionInventoryFeeds,
  options: BlueCollectionBuildOptions = {},
): SupplierInventorySnapshot {
  const safety = resolveSafetyOptions(options)
  assertRawProductFeed(feeds.products, safety.minimumRawProducts)
  const stockFeed = buildStockMap(feeds.stock, safety.minimumStockEntries)
  const merchandise = feeds.products.filter(
    (product) => product.active && product.category !== 12,
  )
  if (merchandise.length < safety.minimumMerchandiseVariants) {
    throw new Error(
      `bluecollection inventory merchandise count is unsafe: ${merchandise.length}; ` +
        `required at least ${safety.minimumMerchandiseVariants}.`,
    )
  }

  const prices = new Map<string, number>()
  const stock = new Map<string, number>()
  for (const product of merchandise) {
    const index = clean(product.index)
    const price = validPrice(product)
    if (index && price !== null) prices.set(index, price)
    const quantity = stockFeed.get(index)
    if (index && quantity !== undefined) stock.set(index, quantity)
  }
  assertCoverage("inventory EUR price", prices.size, merchandise.length, safety.minimumCoverage)
  assertCoverage("inventory stock", stock.size, merchandise.length, safety.minimumCoverage)
  return { fetchedAt: feeds.fetchedAt, prices, stock }
}

export function blueCollectionFamilyIdentity(index: string): FamilyIdentity {
  const normalized = clean(index)
  const qualityVariant = normalized.match(/^(.+)-\d{2}([APS])$/i)
  const qualityWithoutColour = normalized.match(/^(\d+)([APS])$/i)
  const qualityBase = qualityVariant?.[1] ?? qualityWithoutColour?.[1]
  const terminal = (qualityVariant?.[2] ?? qualityWithoutColour?.[2])?.toUpperCase()
  if (qualityBase && terminal) {
    return {
      key: `${qualityBase}:${terminal}`,
      supplierSku: `${qualityBase}${terminal}`,
      sourceCode: normalized,
    }
  }
  const variantBase = normalized.match(/^(.+)-\d{2}$/)?.[1]
  const base = variantBase || normalized
  return { key: base, supplierSku: base, sourceCode: base }
}

export function parseBlueCollectionDecimal(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
  if (typeof value !== "string") return Number.NaN
  const compact = value.trim().replace(/\s/g, "")
  if (!compact) return Number.NaN
  if (compact.includes(",") && compact.includes(".")) {
    return Number(
      compact.lastIndexOf(",") > compact.lastIndexOf(".")
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, ""),
    )
  }
  return Number(compact.replace(",", "."))
}

export function blueCollectionProductSpecifications(
  rows: readonly FamilyRow[],
  materials: readonly string[],
): ProductSpecification[] {
  const specifications: ProductSpecification[] = []
  const dimensions = distinct(
    rows
      .map((row) => normalizeDimensions(additionalText(row.product, "dimensions")))
      .filter(isNonEmpty),
  )
  if (dimensions.length > 0) {
    specifications.push({
      key: "dimensions",
      label: "Dimensions",
      labelRo: "Dimensiuni",
      value: dimensions.join(" · "),
    })
  }
  if (materials.length > 0) {
    specifications.push({
      key: "materials",
      label: "Materials",
      labelRo: "Materiale",
      value: materials.join(", "),
    })
  }
  const cartonQuantities = distinct(
    rows
      .map((row) => positiveIntegerText(additionalValue(row.product, "qty_package")))
      .filter(isNonEmpty),
  )
  if (cartonQuantities.length > 0) {
    specifications.push({
      key: "units-per-carton",
      label: "Units per carton",
      labelRo: "Unități per cutie",
      value: `${cartonQuantities.join(" · ")} pcs`,
      valueRo: `${cartonQuantities.join(" · ")} buc.`,
    })
  }
  const warrantyMonths = distinct(
    rows
      .map((row) => positiveIntegerText(additionalValue(row.product, "guarantee")))
      .filter(isNonEmpty),
  )
  if (warrantyMonths.length > 0) {
    specifications.push({
      key: "warranty",
      label: "Warranty",
      labelRo: "Garanție",
      value: `${warrantyMonths.join(" · ")} months`,
      valueRo: `${warrantyMonths.join(" · ")} luni`,
    })
  }
  return specifications
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,

  async fetchAll(): Promise<RawProduct[]> {
    return buildBlueCollectionProducts(await loadBlueCollectionCatalogFeeds())
  },

  async fetchInventory(): Promise<SupplierInventorySnapshot> {
    return buildBlueCollectionInventorySnapshot(await loadBlueCollectionInventoryFeeds())
  },

  mapCategory(raw) {
    return mapBlueCollectionCategory({
      ...decodeBlueCollectionCategory(raw.supplierCategory),
      name: raw.name,
      material: raw.material,
    })
  },

  mapPersonalizations(raw): Personalization[] {
    return mapBlueCollectionPersonalizations(raw)
  },
}

function resolveSafetyOptions(
  options: BlueCollectionBuildOptions,
): ResolvedSafetyOptions {
  const resolved = { ...DEFAULT_SAFETY, ...options }
  for (const key of [
    "minimumRawProducts",
    "minimumStockEntries",
    "minimumMerchandiseVariants",
    "minimumPublishedProducts",
    "minimumMarkingNames",
  ] as const) {
    if (!Number.isInteger(resolved[key]) || resolved[key] < 0) {
      throw new Error(`bluecollection ${key} must be a non-negative integer.`)
    }
  }
  if (resolved.minimumCoverage <= 0 || resolved.minimumCoverage > 1) {
    throw new Error("bluecollection minimumCoverage must be greater than 0 and at most 1.")
  }
  return resolved
}

function assertRawProductFeed(
  products: readonly BlueCollectionProduct[],
  minimum: number,
): void {
  if (products.length < minimum) {
    throw new Error(
      `bluecollection product feed is unsafe: ${products.length}; required at least ${minimum}.`,
    )
  }
  const indexes = new Set<string>()
  for (const product of products) {
    const index = clean(product.index)
    if (!index) throw new Error("bluecollection product feed contains an empty index.")
    if (indexes.has(index)) throw new Error(`bluecollection product index ${index} is duplicated.`)
    indexes.add(index)
  }
}

function buildStockMap(
  entries: readonly BlueCollectionStockEntry[],
  minimum: number,
): Map<string, number> {
  if (entries.length < minimum) {
    throw new Error(
      `bluecollection stock feed is unsafe: ${entries.length}; required at least ${minimum}.`,
    )
  }
  const stock = new Map<string, number>()
  for (const entry of entries) {
    const index = clean(entry.index)
    if (!index) throw new Error("bluecollection stock feed contains an empty index.")
    if (!Number.isInteger(entry.quantity) || entry.quantity < 0) {
      throw new Error(`bluecollection stock for ${index} is invalid.`)
    }
    if (stock.has(index)) throw new Error(`bluecollection stock index ${index} is duplicated.`)
    stock.set(index, entry.quantity)
  }
  return stock
}

function buildTaxonomyLookups(
  categories: readonly BlueCollectionCategory[],
  subcategories: readonly BlueCollectionSubcategory[],
): TaxonomyLookups {
  const byCategory = new Map<number, BlueCollectionCategory>()
  const bySubcategory = new Map<number, BlueCollectionSubcategory>()
  for (const category of categories) {
    if (byCategory.has(category.id)) {
      throw new Error(`bluecollection category id ${category.id} is duplicated.`)
    }
    byCategory.set(category.id, category)
  }
  for (const subcategory of subcategories) {
    if (bySubcategory.has(subcategory.id)) {
      throw new Error(`bluecollection subcategory id ${subcategory.id} is duplicated.`)
    }
    if (!byCategory.has(subcategory.category)) {
      throw new Error(
        `bluecollection subcategory ${subcategory.id} references unknown category ${subcategory.category}.`,
      )
    }
    bySubcategory.set(subcategory.id, subcategory)
  }
  return { categories: byCategory, subcategories: bySubcategory }
}

function resolveProductCategory(
  product: BlueCollectionProduct,
  taxonomy: TaxonomyLookups,
): BlueCollectionCategoryTuple | null {
  const primary = categoryTuple(product.category, product.subcategory, taxonomy)
  if (primary) return primary
  return categoryTuple(
    product.additional_category,
    product.additional_subcategory,
    taxonomy,
  )
}

function categoryTuple(
  categoryId: number | null | undefined,
  subcategoryId: number | null | undefined,
  taxonomy: TaxonomyLookups,
): BlueCollectionCategoryTuple | null {
  if (!Number.isInteger(categoryId) || !Number.isInteger(subcategoryId)) return null
  const category = taxonomy.categories.get(categoryId as number)
  const subcategory = taxonomy.subcategories.get(subcategoryId as number)
  if (!category || !subcategory || subcategory.category !== categoryId) return null
  return {
    categoryId: categoryId as number,
    category: clean(category.en) || clean(category.pl),
    subcategoryId: subcategoryId as number,
    subcategory: clean(subcategory.en) || clean(subcategory.pl),
  }
}

function unresolvedTuple(product: BlueCollectionProduct): BlueCollectionCategoryTuple {
  return {
    categoryId: Number.isInteger(product.category) ? product.category! : null,
    category: "Unrecognized category",
    subcategoryId: Number.isInteger(product.subcategory) ? product.subcategory! : null,
    subcategory: "Unrecognized subcategory",
  }
}

function chooseFamilyCategory(rows: readonly FamilyRow[]): BlueCollectionCategoryTuple {
  const counts = new Map<string, { tuple: BlueCollectionCategoryTuple; count: number }>()
  for (const row of rows) {
    const key = tupleKey(row.tuple.categoryId, row.tuple.subcategoryId)
    const existing = counts.get(key)
    counts.set(key, { tuple: row.tuple, count: (existing?.count ?? 0) + 1 })
  }
  const ranked = [...counts.values()].sort((left, right) =>
    right.count - left.count ||
    tupleKey(left.tuple.categoryId, left.tuple.subcategoryId).localeCompare(
      tupleKey(right.tuple.categoryId, right.tuple.subcategoryId),
      undefined,
      { numeric: true },
    )
  )
  const selected = ranked[0]
  if (!selected) throw new Error("bluecollection family has no category tuple.")
  if (ranked[1]?.count === selected.count) {
    return {
      categoryId: null,
      category: `Ambiguous categories: ${ranked
        .filter((entry) => entry.count === selected.count)
        .map((entry) => tupleKey(entry.tuple.categoryId, entry.tuple.subcategoryId))
        .join(", ")}`,
      subcategoryId: null,
      subcategory: "Review required",
    }
  }
  return selected.tuple
}

function chooseRepresentative(rows: readonly FamilyRow[]): FamilyRow {
  const ranked = [...rows].sort((left, right) => {
    const leftComplete = representativeCompleteness(left)
    const rightComplete = representativeCompleteness(right)
    if (leftComplete !== rightComplete) return rightComplete - leftComplete
    if (Boolean(left.product.catalogue) !== Boolean(right.product.catalogue)) {
      return left.product.catalogue ? -1 : 1
    }
    if ((left.stock > 0) !== (right.stock > 0)) return left.stock > 0 ? -1 : 1
    return right.stock - left.stock || left.price - right.price ||
      left.product.index.localeCompare(right.product.index, undefined, { numeric: true })
  })
  const representative = ranked[0]
  if (!representative) throw new Error("bluecollection family has no representative row.")
  return representative
}

function representativeCompleteness(row: FamilyRow): number {
  let score = 0
  if (localizedText(row.product.names, "title", false)) score++
  if (localizedText(row.product.descriptions, "text", false)) score++
  if (row.price > 0) score++
  if (row.images.length > 0) score++
  return score
}

function rawVariant(row: FamilyRow): RawVariant {
  const primary = primaryImage(row)
  return {
    supplierVariantId: row.product.index,
    colorName: row.color,
    priceEur: row.price,
    stock: row.stock,
    ...(primary ? { images: [primary] } : {}),
  }
}

function familyImages(rows: readonly FamilyRow[], representative: FamilyRow): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (value: string | null | undefined) => {
    if (!value || seen.has(value) || out.length >= MAX_PRODUCT_IMAGES) return
    seen.add(value)
    out.push(value)
  }
  add(primaryImage(representative))
  for (const row of rows) add(primaryImage(row))
  for (const image of representative.images) add(image)
  return out
}

function productImages(product: BlueCollectionProduct): string[] {
  return distinct(
    (product.image ?? [])
      .map((image) => approvedImageUrl(image.url))
      .filter(isNonEmpty),
  )
}

function approvedImageUrl(value: unknown): string | undefined {
  const source = clean(value)
  if (!source) return undefined
  try {
    const url = new URL(source)
    if (
      url.protocol !== "https:" ||
      url.hostname !== "bluecollection.eu" ||
      !url.pathname.startsWith("/assets/img/")
    ) {
      return undefined
    }
    return url.toString()
  } catch {
    return undefined
  }
}

function primaryImage(row: FamilyRow): string | undefined {
  const expected = `/${row.product.index.toLocaleLowerCase("en")}.jpg`
  return row.images.find((image) => new URL(image).pathname.toLocaleLowerCase("en").endsWith(expected)) ??
    row.images[0]
}

function validPrice(product: BlueCollectionProduct): number | null {
  for (const entry of product.prices ?? []) {
    const value = parseBlueCollectionDecimal(entry.eur)
    if (Number.isFinite(value) && value > 0) return value
  }
  return null
}

function productColor(product: BlueCollectionProduct): string | undefined {
  const code = clean(additionalValue(product, "color_code"))
  return COLOR_NAMES[code]
}

function familyMaterials(rows: readonly FamilyRow[]): string[] {
  const values: string[] = []
  for (const row of rows) {
    const additional = additionalText(row.product, "material_en")
    const fallback = (row.product.madeof ?? [])
      .find((material) => clean(material.language).toLocaleLowerCase("en") === "en")?.text
    const source = additional || clean(fallback)
    for (const material of source.split(/[,;]+/)) {
      const cleaned = material.replace(/\*+/g, "").trim()
      if (cleaned) values.push(cleaned)
    }
  }
  return distinctCaseInsensitive(values)
}

function familyWeightGrams(rows: readonly FamilyRow[]): number | undefined {
  const kilograms = rows
    .map((row) => parseBlueCollectionDecimal(additionalValue(row.product, "unit_weight")))
    .filter((value) =>
      Number.isFinite(value) && value > 0 && value <= MAX_PLAUSIBLE_UNIT_WEIGHT_KG
    )
    .sort((left, right) => left - right)
  if (kilograms.length === 0) return undefined
  const middle = Math.floor(kilograms.length / 2)
  const median = kilograms.length % 2 === 0
    ? (kilograms[middle - 1]! + kilograms[middle]!) / 2
    : kilograms[middle]!
  return Math.round(median * 1_000)
}

function familyCapacity(rows: readonly FamilyRow[], name: string): string | undefined {
  for (const row of rows) {
    const liters = parseBlueCollectionDecimal(additionalValue(row.product, "capacity_l"))
    if (Number.isFinite(liters) && liters > 0) {
      return liters < 1
        ? `${Math.round(liters * 1_000)} ml`
        : `${formatNumber(liters)} L`
    }
    const milliampHours = parseBlueCollectionDecimal(
      additionalValue(row.product, "capacity_mah"),
    )
    if (Number.isFinite(milliampHours) && milliampHours > 0) {
      return `${formatNumber(milliampHours)} mAh`
    }
  }

  const combined = name.match(
    /\b([\d.,]+)\s*(ml|l)?\s*\+\s*([\d.,]+)\s*(ml|l)\b/i,
  )
  if (combined) {
    const rightUnit = formatCapacityUnit(combined[4]!)
    const leftUnit = formatCapacityUnit(combined[2] || combined[4]!)
    const left = parseNamedCapacity(combined[1]!, leftUnit)
    const right = parseNamedCapacity(combined[3]!, rightUnit)
    if (left && right) return `${left} + ${right}`
  }

  const named = name.match(/\b(\d(?:[\d\s.,]*\d)?)\s*(ml|l|mah)\b/i)
  if (named) {
    return parseNamedCapacity(named[1]!, formatCapacityUnit(named[2]!))
  }
  return undefined
}

function localizedText(
  values: readonly {
    language?: string | null
    title?: string | null
    text?: string | null
  }[] | null | undefined,
  field: "title" | "text",
  allowFallback = true,
): string {
  const english = values?.find(
    (entry) => clean(entry.language).toLocaleLowerCase("en") === "en",
  )
  const normalizeValue = (value: unknown) =>
    field === "title" ? clean(value).replace(/\s+/g, " ") : clean(value)
  const englishText = normalizeValue(english?.[field])
  if (englishText || !allowFallback) return englishText
  const polish = values?.find(
    (entry) => clean(entry.language).toLocaleLowerCase("en") === "pl",
  )
  return normalizeValue(polish?.[field]) || normalizeValue(values?.[0]?.[field])
}

function additionalValue(product: BlueCollectionProduct, item: string): unknown {
  return product.additional?.find((entry) => clean(entry.item) === item)?.value
}

function additionalText(product: BlueCollectionProduct, item: string): string {
  return clean(additionalValue(product, item))
}

function normalizeDimensions(value: string): string | undefined {
  const normalized = clean(value)
    .replace(/\s*[x×]\s*/gi, " × ")
    .replace(/\s+/g, " ")
  return normalized ? `${normalized} mm` : undefined
}

function positiveIntegerText(value: unknown): string | undefined {
  const parsed = parseBlueCollectionDecimal(value)
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : undefined
}

function assertCoverage(
  label: string,
  covered: number,
  total: number,
  minimum: number,
): void {
  const coverage = total === 0 ? 0 : covered / total
  if (coverage < minimum) {
    throw new Error(
      `bluecollection ${label} coverage is unsafe: ${covered}/${total} ` +
        `(${(coverage * 100).toFixed(1)}%); required ${(minimum * 100).toFixed(0)}%.`,
    )
  }
}

function safeStock(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ? value as number : 0
}

function formatCapacityUnit(value: string): string {
  const unit = value.toLocaleLowerCase("en")
  if (unit === "ml") return "ml"
  if (unit === "mah") return "mAh"
  return "L"
}

function parseNamedCapacity(value: string, unit: string): string | undefined {
  const compact = value.trim()
  let amount: number
  if (
    unit === "ml" || unit === "mAh"
  ) {
    const integerLike = compact.replace(/[\s.,]/g, "")
    amount = /^\d+$/u.test(integerLike) ? Number(integerLike) : Number.NaN
  } else {
    amount = parseBlueCollectionDecimal(compact)
  }
  if (!Number.isFinite(amount) || amount <= 0) return undefined
  return `${formatNumber(amount)} ${unit}`
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}

function distinct(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function distinctCaseInsensitive(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const key = value.toLocaleLowerCase("en")
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() :
    typeof value === "number" && Number.isFinite(value) ? String(value) : ""
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value)
}
