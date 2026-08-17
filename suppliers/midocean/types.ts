export type MidoceanDecimalString = string

export interface MidoceanDigitalAsset {
  url: string | null
  url_highress?: string | null
  type: string
  subtype: string
}

export interface MidoceanVariant {
  variant_id: string
  sku: string
  release_date?: string
  discontinued_date?: string
  product_proposition_category: string
  category_level1: string
  category_level2: string
  category_level3?: string
  color_description: string
  color_group: string
  plc_status: string
  plc_status_description: string
  gtin?: string
  color_code: string
  pms_color?: string
  size_textile?: string
  digital_assets?: MidoceanDigitalAsset[]
}

export interface MidoceanProduct {
  master_code: string
  master_id: string
  type_of_products: string
  commodity_code?: string
  number_of_print_positions?: string
  country_of_origin: string
  brand: string
  product_name?: string
  category_code: string
  product_class: string
  commercial_description?: string
  short_description: string
  long_description?: string
  dimensions?: string
  length?: MidoceanDecimalString
  length_unit?: string
  width?: MidoceanDecimalString
  width_unit?: string
  height?: MidoceanDecimalString
  height_unit?: string
  diameter?: MidoceanDecimalString
  diameter_unit?: string
  volume?: MidoceanDecimalString
  volume_unit?: string
  liquid_volume?: MidoceanDecimalString
  liquid_volume_unit?: string
  gross_weight?: MidoceanDecimalString
  gross_weight_unit?: string
  net_weight?: MidoceanDecimalString
  net_weight_unit?: string
  inner_carton_quantity?: string
  outer_carton_quantity?: string
  carton_length?: MidoceanDecimalString
  carton_length_unit?: string
  carton_width?: MidoceanDecimalString
  carton_width_unit?: string
  carton_height?: MidoceanDecimalString
  carton_height_unit?: string
  carton_volume?: MidoceanDecimalString
  carton_volume_unit?: string
  carton_gross_weight?: MidoceanDecimalString
  carton_gross_weight_unit?: string
  material?: string
  packaging_after_printing?: string
  printable: string
  gender?: string
  neck?: string
  sleeve?: string
  details_textile?: string
  themes?: string
  top_seller?: string
  timestamp: string
  digital_assets?: MidoceanDigitalAsset[]
  variants: MidoceanVariant[]
}

export type MidoceanProductsFeed = MidoceanProduct[]

export interface MidoceanPriceScale {
  minimum_quantity: string
  price: MidoceanDecimalString
}

export interface MidoceanPriceEntry {
  sku: string
  variant_id: string
  price: MidoceanDecimalString
  valid_until: string
  scale?: MidoceanPriceScale[]
}

export interface MidoceanPricelistFeed {
  currency: string
  date: string
  price: MidoceanPriceEntry[]
}

export interface MidoceanStockEntry {
  sku: string
  qty: number
  first_arrival_date?: string
  first_arrival_qty?: number
  next_arrival_date?: string
  next_arrival_qty?: number
}

export interface MidoceanStockFeed {
  modified_at: string
  stock: MidoceanStockEntry[]
}

export type MidoceanLanguageCode =
  | "cs"
  | "da"
  | "de"
  | "en"
  | "es"
  | "fi"
  | "fr"
  | "hu"
  | "it"
  | "nl"
  | "pl"
  | "pt"
  | "ro"
  | "ru"
  | "sv"

export type MidoceanLocalizedTechniqueName = Partial<
  Record<MidoceanLanguageCode, string | null>
>

export interface MidoceanPrintingTechniqueDescription {
  id: string
  name: MidoceanLocalizedTechniqueName[]
}

export interface MidoceanPrintingTechnique {
  default: boolean
  id: string
  max_colours: string
}

export interface MidoceanPrintPositionPoint {
  distance_from_left: number
  distance_from_top: number
  sequence_no: number
}

export interface MidoceanPrintPositionImage {
  print_position_image_blank: string
  print_position_image_with_area: string
  variant_color: string
}

export interface MidoceanPrintingPosition {
  position_id: string
  print_size_unit: string
  max_print_size_height: number
  max_print_size_width: number
  rotation: number
  print_position_type: string
  distance_of_mirror_position?: number
  printing_techniques: MidoceanPrintingTechnique[]
  points: MidoceanPrintPositionPoint[]
  images: MidoceanPrintPositionImage[]
  category: string
}

export interface MidoceanPrintDataProduct {
  master_code: string
  master_id: string
  item_color_numbers: string[]
  print_manipulation: string | null
  print_template: string
  printing_positions: MidoceanPrintingPosition[]
}

export interface MidoceanPrintDataFeed {
  printing_technique_descriptions: MidoceanPrintingTechniqueDescription[]
  products: MidoceanPrintDataProduct[]
}

export interface MidoceanPrintManipulationPrice {
  code: string
  description: string
  price: MidoceanDecimalString
}

export interface MidoceanPrintPriceScale {
  minimum_quantity: string
  price: MidoceanDecimalString
  next_price: MidoceanDecimalString
}

export interface MidoceanPrintVariableCost {
  range_id: string
  area_from: MidoceanDecimalString
  area_to: MidoceanDecimalString
  scales?: MidoceanPrintPriceScale[]
}

export interface MidoceanPrintTechniquePrice {
  id: string
  description: string
  pricing_type: string
  setup: MidoceanDecimalString
  setup_repeat: MidoceanDecimalString
  next_colour_cost_indicator: string
  var_costs: MidoceanPrintVariableCost[]
}

export interface MidoceanPrintPricelistFeed {
  currency: string
  pricelist_valid_from: string
  pricelist_valid_until: string
  print_manipulations: MidoceanPrintManipulationPrice[]
  print_techniques: MidoceanPrintTechniquePrice[]
}

export interface MidoceanCatalogFeeds {
  products: MidoceanProductsFeed
  pricelist: MidoceanPricelistFeed
  stock: MidoceanStockFeed
  printdata: MidoceanPrintDataFeed
  fetchedAt: string
}

export interface MidoceanInventoryFeeds {
  pricelist: MidoceanPricelistFeed
  stock: MidoceanStockFeed
  fetchedAt: string
}
