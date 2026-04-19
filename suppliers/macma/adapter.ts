import type { Personalization } from "../../lib/content/catalog.ts"
import type { RawProduct, RawVariant, SupplierAdapter } from "../_shared/adapter.ts"
import { fetchJsonEndpoint } from "./fetch.ts"
import { categoryMap, personalizationMap } from "./mapping.ts"
import type { MacmaPrice, MacmaSku, MacmaStock } from "./types.ts"

const SUPPLIER_ID = "macma"
const DISPLAY_NAME = "Macma"

function baseUrl(): string | null {
  const env = process.env.MACMA_API_BASE?.trim()
  if (!env) return null
  return env.replace(/\/+$/, "")
}

const FIBER_LASER_MATERIAL_KEYWORDS = [
  "ALUMINIUM",
  "ALUMINUM",
  "STEEL",
  "STAINLESS",
  "BRASS",
  "COPPER",
  "METAL",
  "IRON",
  "ZINC",
]

function normalizeMaterial(raw: MacmaSku["material"]): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((s) => s.toUpperCase())
  if (typeof raw === "string" && raw.trim()) return [raw.toUpperCase()]
  return []
}

function isMetalProduct(materials: string[]): boolean {
  return materials.some((m) => FIBER_LASER_MATERIAL_KEYWORDS.some((k) => m.includes(k)))
}

function joinSummary(sku: MacmaSku): string | undefined {
  const parts: string[] = []
  if (sku.description) parts.push(sku.description.trim())
  return parts.length ? parts.join(" — ") : undefined
}

async function loadAll(): Promise<{
  skus: MacmaSku[]
  prices: Map<string, number>
  stock: Map<string, number>
  fetchedAt: string
}> {
  const base = baseUrl()
  if (!base) {
    throw new Error(
      "MACMA_API_BASE is not set. Export MACMA_API_BASE='https://macma.ro/api/v2/<token>/en' before running sync.",
    )
  }

  const [skuRes, priceRes, stockRes] = await Promise.all([
    fetchJsonEndpoint<MacmaSku[]>(`${base}/sku.json`, "sku"),
    fetchJsonEndpoint<MacmaPrice[]>(`${base}/pricelist.json`, "pricelist"),
    fetchJsonEndpoint<MacmaStock[]>(`${base}/stock.json`, "stock"),
  ])

  const priceMap = new Map<string, number>()
  for (const p of priceRes.data) {
    if (Number.isFinite(p.price) && p.price > 0) priceMap.set(p.id, p.price)
  }

  const stockMap = new Map<string, number>()
  for (const s of stockRes.data) {
    const total = (s.local ?? 0) + (s.regional ?? 0) + (s.international ?? 0)
    stockMap.set(s.id, total)
  }

  return {
    skus: skuRes.data,
    prices: priceMap,
    stock: stockMap,
    fetchedAt: skuRes.meta.fetchedAt,
  }
}

interface VariantAccumulator {
  catalogcode: string
  representative: MacmaSku
  representativePrice: number
  minPrice: number
  maxPrice: number
  totalStock: number
  anyInStock: boolean
  colors: Set<string>
  sizes: Set<string>
  materials: Set<string>
  techs: Set<string>
  variantIds: string[]
  rawVariants: RawVariant[]
  supplierCategory: string
  brand?: string
  capacity?: string
  weightGrams?: number
  descriptionLong?: string
  priceSum: number
  priced: number
}

function rawVariantFrom(sku: MacmaSku, price: number, stock: number): RawVariant {
  const colorName = sku.color?.name?.trim()
  const colorHex = sku.color?.rgb?.trim()
  const size = sku.size && isSizeLabel(sku.size) ? sku.size : undefined
  const imgs = (sku.img ?? []).filter((u) => typeof u === "string" && u.length > 0)
  return {
    supplierVariantId: sku.id,
    colorName: colorName || undefined,
    colorHex: colorHex && colorHex.startsWith("#") ? colorHex : undefined,
    size,
    priceEur: price,
    stock,
    images: imgs.length > 0 ? imgs : undefined,
  }
}

function addVariant(acc: VariantAccumulator, sku: MacmaSku, price: number, stock: number): void {
  acc.variantIds.push(sku.id)
  if (price < acc.minPrice) {
    acc.minPrice = price
    acc.representative = sku
    acc.representativePrice = price
  }
  if (price > acc.maxPrice) acc.maxPrice = price
  acc.priceSum += price
  acc.priced++
  acc.totalStock += stock
  if (stock > 0) acc.anyInStock = true
  if (sku.color?.name) acc.colors.add(sku.color.name)
  if (sku.size && isSizeLabel(sku.size)) acc.sizes.add(sku.size)
  for (const m of normalizeMaterial(sku.material)) acc.materials.add(m)
  for (const t of sku.print?.technology ?? []) acc.techs.add(t)
  acc.rawVariants.push(rawVariantFrom(sku, price, stock))
  if (!acc.brand && sku.brand?.trim()) acc.brand = sku.brand.trim()
  if (!acc.capacity && sku.capacity?.trim()) acc.capacity = sku.capacity.trim()
  if (acc.weightGrams === undefined && typeof sku.weight === "number" && sku.weight > 0) {
    acc.weightGrams = Math.round(sku.weight * 1000)
  }
  if (!acc.descriptionLong && sku.description?.trim()) acc.descriptionLong = sku.description.trim()
}

function isSizeLabel(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false
  if (s.length > 12) return false
  if (/[×x]/i.test(s) && /\d/.test(s)) return false
  if (/[øØ]/.test(s)) return false
  if (/(\bcm\b|\bmm\b|\bml\b|\bL\b$)/.test(s) && /\d/.test(s)) return false
  if (/[,;:]/.test(s)) return false
  return true
}

function unionVariantImages(variants: RawVariant[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of variants) {
    for (const url of v.images ?? []) {
      if (!seen.has(url)) {
        seen.add(url)
        out.push(url)
      }
    }
  }
  return out
}

function pickSupplierCategory(skus: MacmaSku[]): string {
  for (const s of skus) {
    const c = (s.chapter ?? "").trim()
    if (c) return c
  }
  return ""
}

export const adapter: SupplierAdapter = {
  id: SUPPLIER_ID,
  displayName: DISPLAY_NAME,

  async fetchAll(): Promise<RawProduct[]> {
    const { skus, prices, stock, fetchedAt } = await loadAll()

    const groups = new Map<string, VariantAccumulator>()
    const skusByCode = new Map<string, MacmaSku[]>()

    for (const sku of skus) {
      if (!sku.id || !sku.name) continue
      const code = (sku.catalogcode ?? "").trim() || sku.id
      const price = prices.get(sku.id)
      if (!price) continue
      const hasImages = (sku.img ?? []).some((u) => typeof u === "string" && u.length > 0)
      if (!hasImages) continue
      const variantStock = stock.get(sku.id) ?? 0

      const siblings = skusByCode.get(code) ?? []
      siblings.push(sku)
      skusByCode.set(code, siblings)

      const existing = groups.get(code)
      if (existing) {
        addVariant(existing, sku, price, variantStock)
      } else {
        const acc: VariantAccumulator = {
          catalogcode: code,
          representative: sku,
          representativePrice: price,
          minPrice: price,
          maxPrice: price,
          totalStock: variantStock,
          anyInStock: variantStock > 0,
          colors: new Set<string>(sku.color?.name ? [sku.color.name] : []),
          sizes: new Set<string>(
            sku.size && isSizeLabel(sku.size) ? [sku.size] : [],
          ),
          materials: new Set<string>(normalizeMaterial(sku.material)),
          techs: new Set<string>(sku.print?.technology ?? []),
          variantIds: [sku.id],
          rawVariants: [],
          supplierCategory: (sku.chapter ?? "").trim(),
          brand: sku.brand?.trim() || undefined,
          capacity: sku.capacity?.trim() || undefined,
          weightGrams:
            typeof sku.weight === "number" && sku.weight > 0
              ? Math.round(sku.weight * 1000)
              : undefined,
          descriptionLong: sku.description?.trim() || undefined,
          priceSum: price,
          priced: 1,
        }
        acc.rawVariants.push(rawVariantFrom(sku, price, variantStock))
        groups.set(code, acc)
      }
    }

    const out: RawProduct[] = []
    for (const acc of groups.values()) {
      const rep = acc.representative
      const skusOfCode = skusByCode.get(acc.catalogcode) ?? [rep]
      const supplierCategory = acc.supplierCategory || pickSupplierCategory(skusOfCode)
      const unionImages = unionVariantImages(acc.rawVariants)

      out.push({
        supplierId: SUPPLIER_ID,
        supplierSku: acc.catalogcode,
        name: rep.name,
        description: joinSummary(rep),
        descriptionLong: acc.descriptionLong,
        supplierCategory,
        supplierPriceEur: acc.minPrice,
        supplierPriceEurMax: acc.maxPrice,
        originalCurrency: "EUR",
        stock: acc.totalStock,
        images: unionImages,
        material: [...acc.materials],
        rawPersonalizationCodes: [...acc.techs],
        colors: [...acc.colors].sort((a, b) => a.localeCompare(b)),
        sizes: [...acc.sizes].sort(sizeOrder),
        variantCount: acc.variantIds.length,
        variants: acc.rawVariants,
        brand: acc.brand,
        capacity: acc.capacity,
        weightGrams: acc.weightGrams,
        attributes: {
          ...(rep.brand ? { brand: rep.brand } : {}),
          ...(rep.size ? { size: rep.size } : {}),
          ...(rep.weight ? { weight: `${rep.weight} kg` } : {}),
        },
        fetchedAt,
      })
    }

    return out
  },

  mapCategory(raw) {
    const chapter = (raw.supplierCategory ?? "").trim()
    if (!chapter) return null
    if (chapter in categoryMap) return categoryMap[chapter]
    const parts = chapter.split("|")
    for (let i = parts.length - 1; i > 0; i--) {
      const prefix = parts.slice(0, i).join("|")
      if (prefix in categoryMap) return categoryMap[prefix]
    }
    return null
  },

  mapPersonalizations(raw) {
    const codes = raw.rawPersonalizationCodes ?? []
    const out = new Set<Personalization>()
    for (const code of codes) {
      const mapped = personalizationMap[code]
      if (!mapped) continue
      for (const p of mapped) {
        if (p === "co2" && raw.material && isMetalProduct(raw.material)) {
          out.add("fiber-laser")
        } else {
          out.add(p)
        }
      }
    }
    return [...out]
  },
}

const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, XXL: 6, "3XL": 7, XXXL: 7, "4XL": 8, "5XL": 9,
}

function sizeOrder(a: string, b: string): number {
  const ax = SIZE_ORDER[a.toUpperCase()]
  const bx = SIZE_ORDER[b.toUpperCase()]
  if (ax !== undefined && bx !== undefined) return ax - bx
  if (ax !== undefined) return -1
  if (bx !== undefined) return 1
  return a.localeCompare(b)
}
