export interface MacmaSku {
  id: string
  catalogcode?: string
  name: string
  description?: string
  brand?: string
  size?: string
  weight?: number
  exportcarton?: number
  innercarton?: number
  color?: { code?: string; name?: string; rgb?: string }
  origin?: string
  tariff?: string
  newitem?: boolean
  chapter?: string
  gender?: string
  mainpic?: string
  img?: string[]
  capacity?: string
  sizes?: string
  material?: string[] | string
  print?: { technology?: string[]; size?: string }
  packing?: Record<string, unknown>
  video?: string
}

export interface MacmaPrice {
  id: string
  name: string
  price: number
  pricestr?: string
  webprice?: number
  webpricestr?: string
}

export interface MacmaStock {
  id: string
  name: string
  local: number
  regional: number
  international: number
}

export interface MacmaCacheMeta {
  fetchedAt: string
  etag?: string
  lastModified?: string
}
