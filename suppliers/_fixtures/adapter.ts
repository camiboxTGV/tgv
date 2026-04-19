import type { Personalization } from "@/lib/content/catalog"
import type { RawProduct, SupplierAdapter } from "../_shared/adapter.ts"

const NOW = new Date("2026-04-19T00:00:00.000Z").toISOString()

interface Fixture {
  sku: string
  name: string
  description: string
  supplierCategory: string
  slugPath: string | null
  price: number
  stock: number
  images: string[]
  material: string[]
  techs: string[]
}

const FIXTURES: Fixture[] = [
  {
    sku: "FX-001",
    name: "Ceramic mug 300ml",
    description: "Glossy white ceramic mug, dishwasher safe, ready for full-colour UV print.",
    supplierCategory: "Ceramics/Mugs",
    slugPath: "drink-and-lunchware/ceramics/mugs",
    price: 1.85,
    stock: 420,
    images: [],
    material: ["CERAMIC"],
    techs: ["UV"],
  },
  {
    sku: "FX-002",
    name: "Double-wall stainless bottle 500ml",
    description: "Vacuum-insulated bottle, matte finish. Fiber-laser engraving on the body.",
    supplierCategory: "Bottles/Vacuum",
    slugPath: "drink-and-lunchware/bottles/vacuum-flasks",
    price: 8.4,
    stock: 38,
    images: [],
    material: ["STAINLESS STEEL"],
    techs: ["G1"],
  },
  {
    sku: "FX-003",
    name: "Hardcover notebook A5",
    description: "Linen-bound A5 notebook with elastic closure. Foil or laser logo on the cover.",
    supplierCategory: "Notebooks/Hardcover",
    slugPath: "office-and-writing/notebooks/hard-cover",
    price: 4.2,
    stock: 6,
    images: [],
    material: ["LINEN", "PAPER"],
    techs: ["UV", "G2"],
  },
  {
    sku: "FX-004",
    name: "Classic metal ballpen",
    description: "Brushed-metal twist pen. Fiber-laser engraving along the barrel.",
    supplierCategory: "Writing/Ballpens",
    slugPath: "office-and-writing/writing/ball-pens",
    price: 1.2,
    stock: 0,
    images: [],
    material: ["ALUMINIUM"],
    techs: ["G3"],
  },
  {
    sku: "FX-005",
    name: "Cotton tote bag 240gsm",
    description: "240gsm cotton tote with reinforced handles. UV transfer for high-volume runs.",
    supplierCategory: "Shopping/Tote",
    slugPath: "bags-and-travel/shopping-bags/tote-bags",
    price: 2.95,
    stock: 180,
    images: [],
    material: ["COTTON"],
    techs: ["DT"],
  },
  {
    sku: "FX-006",
    name: "Mystery product",
    description: "Product whose supplier category we haven't mapped yet.",
    supplierCategory: "Completely|Unknown|Path",
    slugPath: null,
    price: 3,
    stock: 50,
    images: [],
    material: [],
    techs: [],
  },
]

function mapTech(code: string): Personalization[] {
  switch (code) {
    case "UV":
    case "UV-PL":
      return ["uv-print"]
    case "G1":
    case "G2":
    case "G3":
      return ["co2"]
    case "DT":
    case "T2":
    case "T3":
    case "T4":
      return ["uv-transfer"]
    case "S1":
    case "S2":
      return ["uv-print"]
    default:
      return []
  }
}

export const adapter: SupplierAdapter = {
  id: "fixtures",
  displayName: "Fixtures (pipeline proof)",
  async fetchAll(): Promise<RawProduct[]> {
    return FIXTURES.map((f) => ({
      supplierId: "fixtures",
      supplierSku: f.sku,
      name: f.name,
      description: f.description,
      supplierCategory: f.supplierCategory,
      supplierPriceEur: f.price,
      originalCurrency: "EUR",
      stock: f.stock,
      images: f.images,
      material: f.material,
      rawPersonalizationCodes: f.techs,
      fetchedAt: NOW,
    }))
  },
  mapCategory(raw) {
    const match = FIXTURES.find((f) => f.sku === raw.supplierSku)
    return match?.slugPath ?? null
  },
  mapPersonalizations(raw) {
    const codes = raw.rawPersonalizationCodes ?? []
    const out: Personalization[] = []
    for (const code of codes) out.push(...mapTech(code))
    return out
  },
}
