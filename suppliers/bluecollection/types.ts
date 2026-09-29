export interface BlueCollectionLocalizedName {
  id?: number
  language?: string | null
  title?: string | null
}

export interface BlueCollectionLocalizedDescription {
  id?: number
  language?: string | null
  text?: string | null
}

export interface BlueCollectionPrice {
  pln?: string | number | null
  eur?: string | number | null
  chf?: string | number | null
  czk?: string | number | null
}

export interface BlueCollectionMaterial {
  language?: string | null
  text?: string | null
}

export interface BlueCollectionImage {
  url?: string | null
}

export interface BlueCollectionAdditional {
  id?: number
  item?: string | null
  value?: unknown
}

export interface BlueCollectionFutureDelivery {
  id?: number
  quantity?: number | string | null
  date?: string | null
  product?: number
}

export interface BlueCollectionMarkingOption {
  id?: number
  price_code?: number | null
  option_label?: number | null
  option_code?: string | null
  realisation_time_id?: number | null
  option_info?: string | null
  max_colors?: number | null
}

export interface BlueCollectionMarkingPlace {
  id?: number
  code?: string | null
  name_pl?: string | null
  marking_option?: BlueCollectionMarkingOption[] | null
}

export interface BlueCollectionMarkingData {
  id?: number
  default_marking_code?: string | null
  marking_place?: BlueCollectionMarkingPlace[] | null
}

export interface BlueCollectionProduct {
  id: number
  index: string
  quantity: number
  active: boolean
  catalogue?: boolean
  christmas_catalogue?: boolean
  added?: string | null
  updated?: string | null
  new_product?: boolean
  promotion?: boolean
  sale?: boolean
  end_of_series?: boolean
  discount_prices?: boolean
  names?: BlueCollectionLocalizedName[] | null
  descriptions?: BlueCollectionLocalizedDescription[] | null
  prices?: BlueCollectionPrice[] | null
  madeof?: BlueCollectionMaterial[] | null
  category?: number | null
  subcategory?: number | null
  additional_category?: number | null
  additional_subcategory?: number | null
  additional?: BlueCollectionAdditional[] | null
  future_delivery?: BlueCollectionFutureDelivery[] | null
  marking_data?: BlueCollectionMarkingData[] | null
  image?: BlueCollectionImage[] | null
}

export interface BlueCollectionStockEntry {
  index: string
  quantity: number
}

export interface BlueCollectionCategory {
  id: number
  pl?: string | null
  en?: string | null
  de?: string | null
  fr?: string | null
  cz?: string | null
}

export interface BlueCollectionSubcategory extends BlueCollectionCategory {
  category: number
}

export interface BlueCollectionMarkingName {
  id: number
  name_pl?: string | null
  name_en?: string | null
  name_de?: string | null
  name_fr?: string | null
  name_cz?: string | null
}

export interface BlueCollectionPage<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface BlueCollectionCatalogFeeds {
  products: BlueCollectionProduct[]
  stock: BlueCollectionStockEntry[]
  categories: BlueCollectionCategory[]
  subcategories: BlueCollectionSubcategory[]
  markingNames: BlueCollectionMarkingName[]
  fetchedAt: string
}

export interface BlueCollectionInventoryFeeds {
  products: BlueCollectionProduct[]
  stock: BlueCollectionStockEntry[]
  fetchedAt: string
}
