/**
 * Public Makito B2B snapshot contracts.
 *
 * The public API documents the top-level envelopes and a subset of product
 * fields, but not the nested catalog variant/category/image structures. Those
 * values intentionally remain `unknown` until the adapter validates them
 * against a real account response.
 */

export type MakitoIdentifier = string | number
export type MakitoNumericValue = string | number

export interface MakitoCatalogProduct extends Record<string, unknown> {
  ref: MakitoIdentifier
  web_reference?: MakitoIdentifier | null
  name?: string | null
  description?: string | null
  brand?: string | null
  web_new?: boolean | string | number | null
  custom_code?: string | null
  length?: MakitoNumericValue | null
  height?: MakitoNumericValue | null
  width?: MakitoNumericValue | null
  diameter?: MakitoNumericValue | null
  weight?: MakitoNumericValue | null
  material?: unknown
  printcode?: unknown
  batteries?: unknown
  sizes?: unknown
  categories?: unknown
  image?: unknown
  variant_image?: unknown
  variant_thumbnail?: unknown
  variants?: unknown
}

export interface MakitoCatalogSnapshot extends Record<string, unknown> {
  products: MakitoCatalogProduct[]
}

export interface MakitoStockEntry extends Record<string, unknown> {
  material: MakitoIdentifier
  quantity: MakitoNumericValue
  availableDate?: string | null
  storageId?: MakitoIdentifier | null
}

export interface MakitoStockSnapshot extends Record<string, unknown> {
  stocks: MakitoStockEntry[]
}

export interface MakitoPriceScale extends Record<string, unknown> {
  quantity: MakitoNumericValue
  amount: MakitoNumericValue
}

export interface MakitoPriceEntry extends Record<string, unknown> {
  material: MakitoIdentifier
  currency: string
  baseQuantity: MakitoNumericValue
  scales: MakitoPriceScale[]
}

export interface MakitoPriceListSnapshot extends Record<string, unknown> {
  generatedAt?: string
  priceList: MakitoPriceEntry[]
}

export interface MakitoPrintPriceItem extends Record<string, unknown> {
  threshold: MakitoNumericValue
  type: string
  price: MakitoNumericValue
}

export interface MakitoPrintPrices extends Record<string, unknown> {
  setupPrice?: MakitoNumericValue | null
  additionalSetupPrice?: MakitoNumericValue | null
  items: MakitoPrintPriceItem[]
}

export interface MakitoPrintPriceEntry extends Record<string, unknown> {
  id: MakitoIdentifier
  category?: string | null
  code?: string | null
  name?: string | null
  prices: MakitoPrintPrices
}

export interface MakitoPrintPriceListSnapshot extends Record<string, unknown> {
  generatedAt?: string
  printPriceList: MakitoPrintPriceEntry[]
}

export interface MakitoPrintTechnique extends Record<string, unknown> {
  id?: MakitoIdentifier
  description?: string | null
  category?: string | null
  technicalRange?: string | null
  maximumColors?: MakitoNumericValue | null
  fullColor?: boolean | string | number | null
  lines?: unknown
}

export interface MakitoPrintArea extends Record<string, unknown> {
  id?: MakitoIdentifier | null
  position?: string | null
  width?: MakitoNumericValue | null
  height?: MakitoNumericValue | null
  image?: unknown
  /** The live API returns the unstructured supplier technique label here. */
  techniques?: string | MakitoPrintTechnique[] | null
}

export interface MakitoPrintConfigProduct extends Record<string, unknown> {
  /** Live product identity; it matches the catalog product `ref`. */
  id?: MakitoIdentifier | null
  /** Legacy/documentation alias retained for defensive compatibility. */
  productReference?: unknown
  areas?: MakitoPrintArea[]
  positions?: unknown[]
  techniques?: MakitoPrintTechnique[]
}

export interface MakitoPrintConfigSnapshot extends Record<string, unknown> {
  generatedAt?: string
  lang?: string
  products: MakitoPrintConfigProduct[]
}

export interface MakitoCatalogFeeds {
  catalog: MakitoCatalogSnapshot
  stock: MakitoStockSnapshot
  priceList: MakitoPriceListSnapshot
  printConfig: MakitoPrintConfigSnapshot
  fetchedAt: string
}

export interface MakitoInventoryFeeds {
  catalog: MakitoCatalogSnapshot
  stock: MakitoStockSnapshot
  priceList: MakitoPriceListSnapshot
  fetchedAt: string
}
