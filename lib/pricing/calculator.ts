import type { Personalization } from "@/lib/content/catalog"

export type UvFormat = "small" | "card" | "medium" | "a6" | "a5" | "a4"
export type LaserSize = "small" | "medium" | "large"
export type HandlingRate = 0 | 0.05 | 0.1 | 0.2

export interface DecorationOptions {
  method: Personalization
  uvFormat: UvFormat
  laserSize: LaserSize
  co2Material: "standard" | "silicone"
  named: boolean
  difficultShape: boolean
  varnish: boolean
  luxuryObject: boolean
  largeEngraving: boolean
  sample: boolean
  handlingRate: HandlingRate
}

export interface PriceEstimate {
  supported: boolean
  message?: string
  unitRate: number | null
  productionSubtotal: number | null
  handlingSubtotal: number
  sampleSubtotal: number
  decorationTotal: number | null
}

export const DEFAULT_DECORATION_OPTIONS: DecorationOptions = {
  method: "uv-print",
  uvFormat: "small",
  laserSize: "small",
  co2Material: "standard",
  named: false,
  difficultShape: false,
  varnish: false,
  luxuryObject: false,
  largeEngraving: false,
  sample: false,
  handlingRate: 0,
}

export const UV_FORMAT_LABELS: Record<UvFormat, string> = {
  small: "Small marking",
  card: "Card format",
  medium: "Medium marking",
  a6: "Up to A6",
  a5: "Up to A5",
  a4: "Up to A4",
}

export const LASER_SIZE_LABELS: Record<LaserSize, string> = {
  small: "Small object",
  medium: "Medium object",
  large: "Large object",
}

const UV_RATES: Array<{
  max: number
  rates: Record<UvFormat, number>
}> = [
  { max: 20, rates: { small: 1, card: 1, medium: 1, a6: 1, a5: 2, a4: 4 } },
  { max: 50, rates: { small: 0.6, card: 0.6, medium: 0.8, a6: 1.2, a5: 1.87, a4: 3.75 } },
  { max: 100, rates: { small: 0.4, card: 0.55, medium: 0.75, a6: 1.1, a5: 1.8, a4: 3.6 } },
  { max: 200, rates: { small: 0.28, card: 0.37, medium: 0.65, a6: 0.95, a5: 1.7, a4: 3.4 } },
  { max: 500, rates: { small: 0.23, card: 0.29, medium: 0.6, a6: 0.85, a5: 1.6, a4: 3.2 } },
  { max: 1000, rates: { small: 0.18, card: 0.26, medium: 0.55, a6: 0.8, a5: 1.55, a4: 3.1 } },
  { max: 2000, rates: { small: 0.16, card: 0.25, medium: 0.5, a6: 0.75, a5: 1.5, a4: 3 } },
  { max: Number.POSITIVE_INFINITY, rates: { small: 0.15, card: 0.22, medium: 0.4, a6: 0.7, a5: 1.3, a4: 2.8 } },
]

const CO2_STANDARD: Record<LaserSize, number[]> = {
  small: [1.06, 0.41, 0.35, 0.31],
  medium: [1.59, 0.62, 0.53, 0.47],
  large: [2.12, 0.82, 0.7, 0.62],
}

const CO2_SILICONE: Partial<Record<LaserSize, number[]>> = {
  small: [1.64, 0.62, 0.53, 0.47],
  medium: [2.46, 0.93, 0.79, 0.7],
}

const FIBER_RATES: Record<LaserSize, number[]> = {
  small: [1, 0.6, 0.45, 0.3, 0.23, 0.17, 0.15],
  medium: [1.5, 1, 0.75, 0.45, 0.38, 0.3, 0.28],
  large: [1.7, 1.2, 0.8, 0.75, 0.6, 0.53, 0.49],
}

function positiveQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.round(quantity))
}

function co2Rate(quantity: number, options: DecorationOptions): number | null {
  if (quantity > 500) return null
  const band = quantity < 10 ? 0 : quantity < 50 ? 1 : quantity < 200 ? 2 : 3
  const table = options.co2Material === "silicone" ? CO2_SILICONE : CO2_STANDARD
  return table[options.laserSize]?.[band] ?? null
}

function fiberRate(quantity: number, size: LaserSize): number {
  const band =
    quantity <= 20
      ? 0
      : quantity <= 100
        ? 1
        : quantity <= 200
          ? 2
          : quantity <= 300
            ? 3
            : quantity <= 500
              ? 4
              : quantity <= 1000
                ? 5
                : 6
  return FIBER_RATES[size][band]
}

export function calculateDecoration(
  requestedQuantity: number,
  options: DecorationOptions,
): PriceEstimate {
  const quantity = positiveQuantity(requestedQuantity)
  const handlingSubtotal = quantity * options.handlingRate
  const sampleSubtotal = options.sample ? 7 : 0

  if (options.method === "uv-transfer") {
    return {
      supported: false,
      message:
        "UV transfer is available, but the supplied tariff does not define a reliable rate. We will confirm it in the final quote.",
      unitRate: null,
      productionSubtotal: null,
      handlingSubtotal,
      sampleSubtotal,
      decorationTotal: null,
    }
  }

  let unitRate: number | null = null
  let minimumOrder = 10
  let multiplier = 1

  if (options.method === "uv-print") {
    unitRate = UV_RATES.find((row) => quantity <= row.max)?.rates[options.uvFormat] ?? null
    minimumOrder = 30
    if (options.varnish) multiplier *= 2
    if (options.difficultShape) multiplier *= 1.5
  } else if (options.method === "co2") {
    unitRate = co2Rate(quantity, options)
    if (options.luxuryObject) multiplier *= 2
    if (options.largeEngraving) multiplier *= 2
  } else if (options.method === "fiber-laser") {
    unitRate = fiberRate(quantity, options.laserSize)
    if (options.luxuryObject) multiplier *= 2
  }

  if (unitRate === null) {
    return {
      supported: false,
      message:
        options.method === "co2" && quantity > 500
          ? "CO2 runs above 500 units are priced by production review."
          : "This material and size combination needs a manual production review.",
      unitRate: null,
      productionSubtotal: null,
      handlingSubtotal,
      sampleSubtotal,
      decorationTotal: null,
    }
  }

  if (options.named) multiplier *= 1.5
  const productionSubtotal = Math.max(minimumOrder, unitRate * quantity * multiplier)

  return {
    supported: true,
    unitRate,
    productionSubtotal,
    handlingSubtotal,
    sampleSubtotal,
    decorationTotal: productionSubtotal + handlingSubtotal + sampleSubtotal,
  }
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
