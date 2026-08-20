export interface CifraColor {
  id?: string | null
  name?: string | null
  rgb_hex?: string | null
}

export interface CifraAttribute {
  id?: string | null
  value?: string | null
}

export interface CifraProduct {
  model: string
  rootmodel?: string | null
  name: string
  description?: string | null
  parent_category?: string | null
  category?: string | null
  image?: string | null
  images?: Array<string | null> | null
  ean?: string | null
  quantity?: string | number | null
  quantity_str?: string | null
  price_pvp?: string | number | null
  confidential_price?: string | number | null
  multiples?: string | number | null
  color?: CifraColor | null
  weight?: string | number | null
  length?: string | number | null
  width?: string | number | null
  height?: string | number | null
  unacaja?: string | number | null
  unpale?: string | number | null
  pbcaja?: string | number | null
  pncaja?: string | number | null
  dcaja?: string | null
  units_per_pale?: string | number | null
  material?: string | null
  catalog_pages?: string | null
  tgrabacion?: string | null
  mgrabacion?: string | null
  fecha1?: string | null
  cantidad1?: string | number | null
  attributes?: CifraAttribute[] | null
}

export interface CifraPriceBreak {
  quantity: string | number
  price: string | number
}

export interface CifraPriceEntry {
  model: string
  rootmodel?: string | null
  p_disc: CifraPriceBreak[]
}

export interface CifraShippingAddress {
  firstname: string
  address_1: string
  city: string
  zone: string
  postcode?: string
  country: string
  telephone?: string
}

export interface CifraOrderItem {
  model: string
  quantity: number
}

export interface CifraCreateOrderRequest {
  /** Defaults to false so callers must explicitly opt into a committed order. */
  commit?: boolean
  client_reference?: string
  comment?: string
  shipping_address: CifraShippingAddress
  items: CifraOrderItem[]
}

export interface CifraCreatedOrderProduct {
  model: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface CifraCreatedOrderData {
  order_id: number
  shipping_address: CifraShippingAddress & {
    lastname?: string
    address_2?: string
    email?: string
  }
  shipping_method: string
  products: CifraCreatedOrderProduct[]
  total: number
  date_added: string
}

export interface CifraCreateOrderResponse {
  message: string
  data: CifraCreatedOrderData
}

export interface CifraCatalogFeeds {
  tariff: CifraProduct[]
  prices: CifraPriceEntry[]
  fetchedAt: string
}

export interface CifraCacheMeta {
  fetchedAt: string
  etag?: string
  lastModified?: string
}
