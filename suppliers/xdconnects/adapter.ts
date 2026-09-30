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
  decodeXdConnectsCategory,
  encodeXdConnectsCategory,
  mapXdConnectsCategory,
} from "./category-mapping.ts"
import { loadXdConnectsCurrencyUnitsPerEur } from "./exchange-rate.ts"
import { loadXdConnectsFeed } from "./fetch.ts"
import {
  describeXdConnectsPersonalizations,
  mapXdConnectsTechnique,
} from "./personalization.ts"
import type { XdConnectsFeed, XdConnectsRow } from "./types.ts"

const SUPPLIER_ID = "xdconnects"
const DISPLAY_NAME = "XD Connects"
const IMAGE_HOST = "static.xdconnects.com"
const IMAGE_PATH_PREFIX = "/ProductImages/Large/"
const MIN_GALLERY_IMAGES = 12

export interface XdConnectsBuildOptions {
  minimumRows?: number
  minimumModels?: number
  minimumPublishedProducts?: number
  minimumPriceCoverage?: number
  minimumStockCoverage?: number
  minimumImageCoverage?: number
}

interface ResolvedBuildOptions {
  minimumRows: number
  minimumModels: number
  minimumPublishedProducts: number
  minimumPriceCoverage: number
  minimumStockCoverage: number
  minimumImageCoverage: number
}

const DEFAULT_SAFETY: ResolvedBuildOptions = {
  minimumRows: 5_000,
  minimumModels: 1_000,
  minimumPublishedProducts: 1_000,
  minimumPriceCoverage: 1,
  minimumStockCoverage: 1,
  minimumImageCoverage: 1,
}

export function buildXdConnectsInventorySnapshot(
  feed: XdConnectsFeed,
  currencyUnitsPerEur: number,
  options: XdConnectsBuildOptions = {},
): SupplierInventorySnapshot {
  const safety = resolveSafetyOptions(options)
  assertFeedSafety(feed, currencyUnitsPerEur, safety)
  const prices = new Map<string, number>()
  const stock = new Map<string, number>()

  for (const row of feed.rows) {
    const itemCode = cleanText(row.ItemCode)
    const originalPrice = itemPrice(row)
    const currentStock = parseXdConnectsStock(row.CurrentStock)
    if (!itemCode || !Number.isFinite(originalPrice) || originalPrice <= 0) continue
    if (!Number.isFinite(currentStock) || currentStock < 0) continue
    prices.set(itemCode, originalPrice / currencyUnitsPerEur)
    stock.set(itemCode, currentStock)
  }

  return { fetchedAt: feed.fetchedAt, prices, stock }
}

export function buildXdConnectsProducts(
  feed: XdConnectsFeed,
  currencyUnitsPerEur: number,
  options: XdConnectsBuildOptions = {},
): RawProduct[] {
  const safety = resolveSafetyOptions(options)
  assertFeedSafety(feed, currencyUnitsPerEur, safety)
  const groups = new Map<string, XdConnectsRow[]>()

  for (const row of feed.rows) {
    const modelCode = cleanText(row.ModelCode)
    const siblings = groups.get(modelCode) ?? []
    siblings.push(row)
    groups.set(modelCode, siblings)
  }

  const products: RawProduct[] = []
  for (const [modelCode, unsortedRows] of groups) {
    const rows = [...unsortedRows].sort((left, right) =>
      left.ItemCode.localeCompare(right.ItemCode, undefined, { numeric: true }),
    )
    assertFamilyConsistency(modelCode, rows)
    const representative = chooseRepresentative(rows)
    const materials = distinctCaseInsensitive(
      rows.flatMap((row) => splitList(row.Material)),
    )
    const colors = distinctCaseInsensitive(rows.map((row) => cleanText(row.Color)).filter(Boolean))
      .sort((a, b) => a.localeCompare(b))
    const sizes = distinctCaseInsensitive(
      rows.map((row) => cleanText(row.TextileSize)).filter(Boolean),
    ).sort(sizeOrder)
    const canonicalImages = canonicalImageByColor(rows)
    const variants = rows.map((row) => rawVariant(row, currencyUnitsPerEur, canonicalImages))
    const prices = variants.map((variant) => variant.priceEur)
    const stock = variants.reduce((sum, variant) => sum + variant.stock, 0)
    const methods = describeXdConnectsPersonalizations(rows)
    const images = familyImages(representative, variants)
    const description = cleanRichText(representative.LongDescription)
    const originalPrice = itemPrice(representative)

    products.push({
      supplierId: SUPPLIER_ID,
      supplierSku: modelCode,
      supplierVariantIds: variants.map((variant) => variant.supplierVariantId),
      name: cleanText(representative.ItemName) || modelCode,
      description,
      descriptionLong: description,
      supplierCategory: encodeXdConnectsCategory({
        mainCategory: representative.MainCategory,
        subCategory: representative.SubCategory,
      }),
      supplierPriceEur: Math.min(...prices),
      supplierPriceEurMax: Math.max(...prices),
      originalCurrency: feed.currency,
      originalPrice,
      stock,
      images,
      attributes: {
        modelCode,
        lifecycle: cleanText(representative.ProductLifeCycle),
        ...(representative.IntroDate.trim() ? { introDate: representative.IntroDate.trim() } : {}),
      },
      fetchedAt: feed.fetchedAt,
      moq: positiveInteger(representative.MOQBlankOrder),
      weightGrams: positiveNumber(representative.ItemWeightNetGr),
      rawPersonalizationCodes: methods.map((method) => method.code),
      supplierPersonalizations: methods,
      material: materials,
      colors,
      sizes,
      specifications: xdConnectsProductSpecifications(rows, materials),
      variantCount: variants.length,
      variants,
      brand: cleanText(representative.Brand) || undefined,
      capacity: productCapacity(representative),
    })
  }

  if (products.length < safety.minimumPublishedProducts) {
    throw new Error(
      `xdconnects publishable product count is unsafe: ${products.length}; ` +
        `required at least ${safety.minimumPublishedProducts}`,
    )
  }

  return products.sort((left, right) =>
    left.supplierSku.localeCompare(right.supplierSku, undefined, { numeric: true }),
  )
}

export function xdConnectsProductSpecifications(
  rows: readonly XdConnectsRow[],
  materials: readonly string[],
): ProductSpecification[] {
  const specs: ProductSpecification[] = []
  addValues(specs, "dimensions", "Dimensions", "Dimensiuni", rows, (row) => normalizedDimensions(row.ItemDimensions))
  if (materials.length) {
    specs.push({
      key: "materials",
      label: "Materials",
      labelRo: "Materiale",
      value: materials.join(", "),
    })
  }
  addValues(specs, "lifecycle", "Product lifecycle", "Ciclu de viață", rows, (row) => cleanText(row.ProductLifeCycle))
  addValues(specs, "country-of-origin", "Country of origin", "Țara de origine", rows, (row) => cleanText(row.CountryOfOrigin))
  addValues(specs, "customs-tariff", "Customs tariff code", "Cod tarifar vamal", rows, (row) => cleanText(row.CommodityCode))
  addValues(specs, "packaging", "Item packaging", "Ambalaj produs", rows, (row) => cleanText(row.PackagingTypeItem))
  addValues(specs, "inner-box", "Inner box", "Cutie interioară", rows, (row) => withUnit(row.InnerboxQty, "pcs", "buc."))
  addValues(specs, "outer-carton", "Outer carton", "Cutie exterioară", rows, (row) => withUnit(row.OuterCartonQty, "pcs", "buc."))
  addValues(specs, "compliance", "Compliance", "Conformitate", rows, (row) => cleanText(row.Compliance))
  addValues(specs, "certifications", "Certifications", "Certificări", rows, (row) => cleanText(row.Certifications))
  addValues(specs, "eco", "Sustainability", "Sustenabilitate", rows, (row) => cleanText(row.Eco))
  addValues(specs, "recycled-content", "Recycled content", "Conținut reciclat", rows, (row) => withUnit(row["Recycled Content Percent"], "%", "%"))
  addValues(specs, "waterproof-level", "Water resistance", "Rezistență la apă", rows, (row) => cleanText(row.WaterproofLevel))
  addValues(specs, "laptop-size", "Laptop/tablet size", "Dimensiune laptop/tabletă", rows, (row) => withUnit(row.FitsLaptopTabletSizeInches, "in", "in"))
  addValues(specs, "bluetooth-version", "Bluetooth version", "Versiune Bluetooth", rows, (row) => cleanText(row.BTVersion))
  addValues(specs, "play-time", "Play time", "Autonomie redare", rows, (row) => withUnit(row.PlayTimeHours, "hours", "ore"))
  addValues(specs, "powerbank-capacity", "Power bank capacity", "Capacitate baterie externă", rows, (row) => withUnit(row.PowerbankCapacity, "mAh", "mAh"))
  addValues(specs, "charging-power", "Charging power", "Putere de încărcare", rows, (row) => withUnit(row.ChargingPowerWatt, "W", "W"))
  addValues(specs, "notebook-format", "Notebook format", "Format agendă", rows, (row) => cleanText(row.NotebookFormat))
  addValues(specs, "pages", "Number of pages", "Număr de pagini", rows, (row) => cleanText(row.NumberOfPages))
  addValues(specs, "paper-weight", "Paper weight", "Gramaj hârtie", rows, (row) => withUnit(row.PaperWeight, "g/m²", "g/m²"))
  addValues(specs, "paper-ruling", "Paper ruling", "Liniatură", rows, (row) => cleanText(row.PaperRulingLayout))
  addValues(specs, "fabric", "Fabric", "Țesătură", rows, (row) => cleanText(row.Fabric))
  addValues(specs, "fabric-weight", "Fabric weight", "Gramaj material", rows, (row) => withUnit(row["Fabric Grams per m2"], "g/m²", "g/m²"))
  addValues(specs, "fit", "Fit", "Croială", rows, (row) => cleanText(row.Fit))
  addValues(specs, "umbrella-mechanism", "Umbrella mechanism", "Mecanism umbrelă", rows, (row) => cleanText(row.UmbrellaMechanism))
  addValues(specs, "canopy-diameter", "Canopy diameter", "Diametru cupolă", rows, (row) => withUnit(row.CanopyDiameterCM, "cm", "cm"))
  addValues(specs, "pen-mechanism", "Pen mechanism", "Mecanism instrument", rows, (row) => cleanText(row.PenMechanism))
  addValues(specs, "pen-refill", "Pen refill", "Rezervă instrument", rows, (row) => cleanText(row.PenRefillType))
  addValues(specs, "co2-emissions", "CO₂ emissions", "Emisii CO₂", rows, (row) => withUnit(row["Total CO2 emissions"], "kg CO₂e", "kg CO₂e"))
  return specs
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,

  async fetchAll(): Promise<RawProduct[]> {
    const feed = await loadXdConnectsFeed()
    const currencyUnitsPerEur = await loadXdConnectsCurrencyUnitsPerEur(feed.currency)
    return buildXdConnectsProducts(feed, currencyUnitsPerEur)
  },

  async fetchInventory(): Promise<SupplierInventorySnapshot> {
    const feed = await loadXdConnectsFeed()
    const currencyUnitsPerEur = await loadXdConnectsCurrencyUnitsPerEur(feed.currency)
    return buildXdConnectsInventorySnapshot(feed, currencyUnitsPerEur)
  },

  mapCategory(raw) {
    const category = decodeXdConnectsCategory(raw.supplierCategory)
    return mapXdConnectsCategory({
      ...category,
      name: raw.name,
      material: raw.material,
    })
  },

  mapPersonalizations(raw) {
    const personalizations = new Set<Personalization>()
    for (const method of raw.supplierPersonalizations ?? []) {
      for (const mapped of mapXdConnectsTechnique(
        method.code,
        method.label,
        raw.material ?? [],
      )) {
        personalizations.add(mapped)
      }
    }
    return [...personalizations]
  },
}

function assertFeedSafety(
  feed: XdConnectsFeed,
  currencyUnitsPerEur: number,
  safety: ResolvedBuildOptions,
): void {
  if (!Number.isFinite(currencyUnitsPerEur) || currencyUnitsPerEur <= 0) {
    throw new Error("xdconnects currency conversion rate must be positive")
  }
  if (feed.rows.length < safety.minimumRows) {
    throw new Error(
      `xdconnects feed is unsafe: ${feed.rows.length} rows; ` +
        `required at least ${safety.minimumRows}`,
    )
  }
  const models = new Set<string>()
  let priced = 0
  let stocked = 0
  let imaged = 0
  for (const row of feed.rows) {
    const modelCode = cleanText(row.ModelCode)
    const itemCode = cleanText(row.ItemCode)
    if (modelCode) models.add(modelCode)
    if (!modelCode || !itemCode || !cleanText(row.ItemName)) {
      throw new Error("xdconnects feed contains a row without a product identity")
    }
    if (!cleanText(row.MainCategory) || !cleanText(row.SubCategory)) {
      throw new Error(`xdconnects item ${itemCode} has no category tuple`)
    }
    if (Number.isFinite(itemPrice(row)) && itemPrice(row) > 0) priced++
    if (Number.isFinite(parseXdConnectsStock(row.CurrentStock))) stocked++
    const neutralImage = cleanText(row["MainImage Neutral"])
    const preferredImage = isXdConnectsImageUrl(neutralImage)
      ? neutralImage
      : cleanText(row.MainImage)
    if (isXdConnectsImageUrl(preferredImage)) imaged++
  }
  if (models.size < safety.minimumModels) {
    throw new Error(
      `xdconnects model count is unsafe: ${models.size}; required at least ${safety.minimumModels}`,
    )
  }
  assertCoverage("price", priced, feed.rows.length, safety.minimumPriceCoverage)
  assertCoverage("stock", stocked, feed.rows.length, safety.minimumStockCoverage)
  assertCoverage("image", imaged, feed.rows.length, safety.minimumImageCoverage)
}

function resolveSafetyOptions(options: XdConnectsBuildOptions): ResolvedBuildOptions {
  const resolved: ResolvedBuildOptions = {
    minimumRows: options.minimumRows ?? DEFAULT_SAFETY.minimumRows,
    minimumModels: options.minimumModels ?? DEFAULT_SAFETY.minimumModels,
    minimumPublishedProducts:
      options.minimumPublishedProducts ?? DEFAULT_SAFETY.minimumPublishedProducts,
    minimumPriceCoverage: options.minimumPriceCoverage ?? DEFAULT_SAFETY.minimumPriceCoverage,
    minimumStockCoverage: options.minimumStockCoverage ?? DEFAULT_SAFETY.minimumStockCoverage,
    minimumImageCoverage: options.minimumImageCoverage ?? DEFAULT_SAFETY.minimumImageCoverage,
  }
  for (const key of ["minimumRows", "minimumModels", "minimumPublishedProducts"] as const) {
    if (!Number.isInteger(resolved[key]) || resolved[key] < 0) {
      throw new Error(`xdconnects ${key} must be a non-negative integer`)
    }
  }
  for (const key of ["minimumPriceCoverage", "minimumStockCoverage", "minimumImageCoverage"] as const) {
    if (!Number.isFinite(resolved[key]) || resolved[key] <= 0 || resolved[key] > 1) {
      throw new Error(`xdconnects ${key} must be greater than 0 and at most 1`)
    }
  }
  return resolved
}

function assertCoverage(
  label: string,
  count: number,
  total: number,
  minimum: number,
): void {
  const coverage = total === 0 ? 0 : count / total
  if (coverage < minimum) {
    throw new Error(
      `xdconnects ${label} coverage is unsafe: ${count}/${total} ` +
        `(${(coverage * 100).toFixed(1)}%); required ${(minimum * 100).toFixed(0)}%`,
    )
  }
}

function assertFamilyConsistency(modelCode: string, rows: readonly XdConnectsRow[]): void {
  for (const field of ["ItemName", "Brand", "MainCategory", "SubCategory"] as const) {
    const values = distinctCaseInsensitive(rows.map((row) => cleanText(row[field])).filter(Boolean))
    if (values.length > 1) {
      throw new Error(`xdconnects model ${modelCode} has inconsistent ${field}`)
    }
  }
}

function chooseRepresentative(rows: readonly XdConnectsRow[]): XdConnectsRow {
  return [...rows].sort((left, right) => {
    const priceDifference = itemPrice(left) - itemPrice(right)
    if (Number.isFinite(priceDifference) && priceDifference !== 0) return priceDifference
    return left.ItemCode.localeCompare(right.ItemCode, undefined, { numeric: true })
  })[0]!
}

function canonicalImageByColor(rows: readonly XdConnectsRow[]): ReadonlyMap<string, string> {
  const images = new Map<string, string>()
  for (const row of rows) {
    const itemCode = cleanText(row.ItemCode)
    const neutral = cleanText(row["MainImage Neutral"])
    const preferred = isXdConnectsImageUrl(neutral) ? neutral : cleanText(row.MainImage)
    images.set(itemCode, approvedImage(preferred, itemCode))
  }
  return images
}

function rawVariant(
  row: XdConnectsRow,
  currencyUnitsPerEur: number,
  canonicalImages: ReadonlyMap<string, string>,
): RawVariant {
  const itemCode = cleanText(row.ItemCode)
  const originalPrice = itemPrice(row)
  const stock = parseXdConnectsStock(row.CurrentStock)
  const colorName = cleanText(row.Color)
  const size = cleanText(row.TextileSize)
  const image = canonicalImages.get(itemCode) ??
    approvedImage(row.MainImage, itemCode)
  return {
    supplierVariantId: itemCode,
    colorName: colorName || undefined,
    colorHex: normalizeHex(row.HexColor1),
    size: size || undefined,
    priceEur: originalPrice / currencyUnitsPerEur,
    stock,
    images: [image],
  }
}

function familyImages(
  representative: XdConnectsRow,
  variants: readonly RawVariant[],
): string[] {
  const images: string[] = []
  const seen = new Set<string>()
  const add = (value: string): void => {
    if (seen.has(value)) return
    seen.add(value)
    images.push(value)
  }
  for (const variant of variants) {
    for (const image of variant.images ?? []) add(image)
  }
  const minimum = Math.max(MIN_GALLERY_IMAGES, images.length)
  for (const candidate of splitImageList(representative.AllImages)) {
    if (images.length >= minimum) break
    add(approvedImage(candidate, representative.ItemCode))
  }
  return images
}

function approvedImage(value: string, itemCode: string): string {
  const image = cleanText(value)
  if (!isXdConnectsImageUrl(image)) {
    throw new Error(`xdconnects item ${itemCode || "(unknown)"} has an unapproved image URL`)
  }
  return image
}

function isXdConnectsImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" &&
      url.hostname === IMAGE_HOST &&
      url.port === "" &&
      url.pathname.startsWith(IMAGE_PATH_PREFIX)
  } catch {
    return false
  }
}

function splitImageList(value: string): string[] {
  return distinct(value.split(/\s*,\s*/).map(cleanText).filter(Boolean))
}

function itemPrice(row: XdConnectsRow): number {
  const tiers = [1, 2, 3, 4, 5, 6]
    .map((tier) => ({
      quantity: positiveNumber(row[`Qty${tier}`]),
      price: positiveNumber(row[`ItemPriceNet_Qty${tier}`]),
    }))
    .filter((tier) => tier.quantity !== undefined && tier.price !== undefined)
    .sort((left, right) => left.quantity! - right.quantity!)
  return tiers[0]?.price ?? Number.NaN
}

export function parseXdConnectsDecimal(value: unknown): number {
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

export function parseXdConnectsStock(value: unknown): number {
  const parsed = parseXdConnectsDecimal(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}

function productCapacity(row: XdConnectsRow): string | undefined {
  const volume = positiveNumber(row.ContentVolumeLiters)
  if (volume !== undefined) return `${formatNumber(volume)} L`
  const powerbank = positiveNumber(row.PowerbankCapacity)
  if (powerbank !== undefined) return `${formatNumber(powerbank)} mAh`
  return undefined
}

function addValues(
  out: ProductSpecification[],
  key: string,
  label: string,
  labelRo: string,
  rows: readonly XdConnectsRow[],
  valueFor: (row: XdConnectsRow) => string,
): void {
  const values = distinctCaseInsensitive(rows.map(valueFor).filter(Boolean))
  if (!values.length) return
  out.push({ key, label, labelRo, value: values.join(" · ") })
}

function withUnit(value: string, unit: string, _unitRo: string): string {
  const number = positiveNumber(value)
  return number === undefined ? "" : `${formatNumber(number)} ${unit}`
}

function normalizedDimensions(value: string): string {
  return cleanText(value).replace(/\s*[xX]\s*(?=\d)/g, " × ")
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = parseXdConnectsDecimal(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = parseXdConnectsDecimal(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeHex(value: string): string | undefined {
  const hex = value.trim().replace(/^#/, "")
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : undefined
}

function splitList(value: string): string[] {
  return value.split(",").map(cleanText).filter(Boolean)
}

function cleanRichText(value: string): string {
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

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function distinct<T>(values: readonly T[]): T[] {
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

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
}

const SIZE_ORDER: Readonly<Record<string, number>> = {
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
