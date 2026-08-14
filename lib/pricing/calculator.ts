import type { Personalization } from "@/lib/content/catalog"

export type UvFormat =
  | "small"
  | "card"
  | "medium-a6"
  | "large-a5"
  | "large-a4"
  | "large-a3"
export type LaserSize = "small" | "medium" | "large"
export type HandlingRate = 0 | 0.05 | 0.1 | 0.2
export type PadInkSystem = "mono" | "two-component"
export type PrintColors = 1 | 2 | 3 | 4 | 5 | 6
export type TextileFormat = "10x10" | "20x30"

export type EstimateReason =
  | "legacy-transfer"
  | "co2-high-quantity"
  | "unsupported-combination"
  | "pad-low-quantity"
  | "pad-high-quantity"
  | "textile-high-quantity"

export interface DecorationOptions {
  method: Personalization
  uvFormat: UvFormat
  laserSize: LaserSize
  co2Material: "standard" | "silicone"
  padInkSystem: PadInkSystem
  printColors: PrintColors
  textileFormat: TextileFormat
  artworkHours: number
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
  reason?: EstimateReason
  message?: string
  unitRate: number | null
  billableQuantity: number | null
  productionSubtotal: number | null
  handlingSubtotal: number
  sampleSubtotal: number
  artworkSubtotal: number
  decorationTotal: number | null
}

export const DEFAULT_DECORATION_OPTIONS: DecorationOptions = {
  method: "uv-print",
  uvFormat: "small",
  laserSize: "small",
  co2Material: "standard",
  padInkSystem: "mono",
  printColors: 1,
  textileFormat: "10x10",
  artworkHours: 0,
  named: false,
  difficultShape: false,
  varnish: false,
  luxuryObject: false,
  largeEngraving: false,
  sample: false,
  handlingRate: 0,
}

export const UV_FORMAT_LABELS: Record<UvFormat, string> = {
  small: "Small object · pens, keyrings, USB drives",
  card: "Card · bank cards and card-shaped USB drives",
  "medium-a6": "Medium object · up to A6",
  "large-a5": "Large object · up to A5",
  "large-a4": "Large object · up to A4",
  "large-a3": "Large object · up to A3",
}

export const LASER_SIZE_LABELS: Record<LaserSize, string> = {
  small: "Small object",
  medium: "Medium object",
  large: "Large object",
}

type UvRate = number | "flat-order"

const UV_RATES: Array<{
  max: number
  rates: Record<UvFormat, UvRate>
}> = [
  { max: 20, rates: { small: "flat-order", card: "flat-order", "medium-a6": "flat-order", "large-a5": "flat-order", "large-a4": 2, "large-a3": 4 } },
  { max: 50, rates: { small: "flat-order", card: "flat-order", "medium-a6": 0.8, "large-a5": 1.2, "large-a4": 1.87, "large-a3": 3.75 } },
  { max: 100, rates: { small: "flat-order", card: 0.55, "medium-a6": 0.75, "large-a5": 1.1, "large-a4": 1.8, "large-a3": 3.6 } },
  { max: 200, rates: { small: 0.28, card: 0.37, "medium-a6": 0.65, "large-a5": 0.95, "large-a4": 1.7, "large-a3": 3.4 } },
  { max: 500, rates: { small: 0.23, card: 0.29, "medium-a6": 0.6, "large-a5": 0.85, "large-a4": 1.6, "large-a3": 3.2 } },
  { max: 1000, rates: { small: 0.18, card: 0.26, "medium-a6": 0.55, "large-a5": 0.8, "large-a4": 1.55, "large-a3": 3.1 } },
  { max: 2000, rates: { small: 0.16, card: 0.25, "medium-a6": 0.5, "large-a5": 0.75, "large-a4": 1.5, "large-a3": 3 } },
  { max: Number.POSITIVE_INFINITY, rates: { small: 0.15, card: 0.22, "medium-a6": 0.4, "large-a5": 0.7, "large-a4": 1.3, "large-a3": 2.8 } },
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

interface ColorRateRow {
  quantity: number
  rates: readonly [number, number, number, number, number, number]
}

const PAD_MONO_RATES: ColorRateRow[] = [
  { quantity: 50, rates: [0.764, 1.146, 1.526, 1.911, 2.293, 2.675] },
  { quantity: 100, rates: [0.465, 0.698, 0.928, 1.163, 1.395, 1.628] },
  { quantity: 200, rates: [0.267, 0.4, 0.532, 0.667, 0.8, 0.933] },
  { quantity: 300, rates: [0.223, 0.334, 0.445, 0.557, 0.668, 0.78] },
  { quantity: 500, rates: [0.202, 0.302, 0.403, 0.504, 0.605, 0.706] },
  { quantity: 1000, rates: [0.19, 0.285, 0.375, 0.476, 0.571, 0.666] },
  { quantity: 2000, rates: [0.179, 0.268, 0.353, 0.447, 0.537, 0.626] },
  { quantity: 3000, rates: [0.169, 0.254, 0.334, 0.423, 0.507, 0.592] },
  { quantity: 5000, rates: [0.161, 0.241, 0.319, 0.402, 0.483, 0.563] },
  { quantity: 10000, rates: [0.154, 0.232, 0.301, 0.386, 0.463, 0.541] },
]

const PAD_TWO_COMPONENT_RATES: ColorRateRow[] = [
  { quantity: 50, rates: [1.226, 1.839, 2.45, 3.065, 3.678, 4.291] },
  { quantity: 100, rates: [0.745, 1.117, 1.488, 1.862, 2.234, 2.607] },
  { quantity: 200, rates: [0.426, 0.639, 0.852, 1.065, 1.278, 1.491] },
  { quantity: 300, rates: [0.356, 0.534, 0.711, 0.89, 1.068, 1.246] },
  { quantity: 500, rates: [0.323, 0.485, 0.646, 0.808, 0.97, 1.131] },
  { quantity: 1000, rates: [0.304, 0.456, 0.609, 0.76, 0.912, 1.064] },
  { quantity: 2000, rates: [0.286, 0.429, 0.571, 0.715, 0.859, 1.002] },
  { quantity: 3000, rates: [0.27, 0.405, 0.539, 0.675, 0.81, 0.945] },
  { quantity: 5000, rates: [0.257, 0.385, 0.513, 0.642, 0.771, 0.899] },
  { quantity: 10000, rates: [0.247, 0.371, 0.495, 0.618, 0.742, 0.865] },
]

const TEXTILE_RATES: Record<TextileFormat, Array<{ max: number; rates: ColorRateRow["rates"] }>> = {
  "20x30": [
    { max: 120, rates: [0.84, 1.092, 1.323, 1.596, 1.848, 2.079] },
    { max: 600, rates: [0.756, 0.987, 1.218, 1.428, 1.659, 1.89] },
    { max: 2600, rates: [0.672, 0.882, 1.071, 1.281, 1.47, 1.701] },
    { max: 5100, rates: [0.609, 0.777, 0.945, 1.155, 1.323, 1.512] },
    { max: 10500, rates: [0.525, 0.672, 0.861, 1.008, 1.155, 1.323] },
  ],
  "10x10": [
    { max: 120, rates: [0.525, 0.84, 1.008, 1.155, 1.344, 1.54] },
    { max: 600, rates: [0.483, 0.756, 0.903, 1.05, 1.218, 1.4] },
    { max: 2600, rates: [0.441, 0.672, 0.798, 0.924, 1.078, 1.232] },
    { max: 5100, rates: [0.399, 0.609, 0.714, 0.84, 0.966, 1.106] },
    { max: 10500, rates: [0.3465, 0.546, 0.672, 0.777, 0.882, 1.022] },
  ],
}

function positiveQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1
  return Math.max(1, Math.round(quantity))
}

function positiveHours(hours: number): number {
  if (!Number.isFinite(hours)) return 0
  return Math.max(0, hours)
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function padRate(quantity: number, ink: PadInkSystem, colors: PrintColors): number | null {
  if (quantity < 50 || quantity > 10000) return null
  const table = ink === "mono" ? PAD_MONO_RATES : PAD_TWO_COMPONENT_RATES
  const row = table.findLast((candidate) => quantity >= candidate.quantity)
  return row?.rates[colors - 1] ?? null
}

function textileRate(quantity: number, format: TextileFormat, colors: PrintColors): number | null {
  return TEXTILE_RATES[format].find((row) => quantity <= row.max)?.rates[colors - 1] ?? null
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
  const handlingSubtotal = roundMoney(quantity * options.handlingRate)
  const artworkSubtotal = roundMoney(positiveHours(options.artworkHours) * 25)
  const sampleEligible = options.method === "uv-print" || options.method === "co2" || options.method === "fiber-laser"
  const sampleSubtotal = sampleEligible && options.sample ? 7 : 0

  if (options.method === "uv-transfer") {
    return {
      supported: false,
      reason: "legacy-transfer",
      message:
        "This legacy supplier transfer label does not identify a validated production tariff. We will confirm the exact method in the final quote.",
      unitRate: null,
      billableQuantity: null,
      productionSubtotal: null,
      handlingSubtotal,
      sampleSubtotal,
      artworkSubtotal,
      decorationTotal: null,
    }
  }

  let unitRate: number | null = null
  let billableQuantity: number | null = quantity
  let productionSubtotal: number | null = null
  let reason: EstimateReason = "unsupported-combination"

  if (options.method === "uv-print") {
    const uvRate = UV_RATES.find((row) => quantity <= row.max)?.rates[options.uvFormat]
    if (uvRate !== undefined) {
      const base = uvRate === "flat-order" ? 30 : Math.max(30, uvRate * quantity)
      let multiplier = 1
      if (options.varnish) multiplier *= 2
      if (options.difficultShape) multiplier *= 1.5
      if (options.named) multiplier *= 1.5
      unitRate = uvRate === "flat-order" ? null : uvRate
      billableQuantity = uvRate === "flat-order" ? null : quantity
      productionSubtotal = roundMoney(base * multiplier)
    }
  } else if (options.method === "co2") {
    unitRate = co2Rate(quantity, options)
    if (unitRate !== null) {
      let multiplier = 1
      if (options.luxuryObject) multiplier *= 2
      if (options.largeEngraving) multiplier *= 2
      if (options.named) multiplier *= 1.5
      productionSubtotal = roundMoney(Math.max(10, unitRate * quantity) * multiplier)
    } else if (quantity > 500) {
      reason = "co2-high-quantity"
    }
  } else if (options.method === "fiber-laser") {
    unitRate = fiberRate(quantity, options.laserSize)
    let multiplier = 1
    if (options.luxuryObject) multiplier *= 2
    if (options.named) multiplier *= 1.5
    productionSubtotal = roundMoney(Math.max(10, unitRate * quantity) * multiplier)
  } else if (options.method === "pad-screen") {
    unitRate = padRate(quantity, options.padInkSystem, options.printColors)
    if (unitRate !== null) {
      productionSubtotal = roundMoney(unitRate * quantity)
    } else {
      reason = quantity < 50 ? "pad-low-quantity" : "pad-high-quantity"
    }
  } else if (options.method === "textile-transfer") {
    unitRate = textileRate(quantity, options.textileFormat, options.printColors)
    if (unitRate !== null) {
      billableQuantity = Math.max(120, quantity)
      productionSubtotal = roundMoney(unitRate * billableQuantity)
    } else {
      reason = "textile-high-quantity"
    }
  }

  if (productionSubtotal === null) {
    return {
      supported: false,
      reason,
      message:
        reason === "co2-high-quantity"
          ? "CO2 runs above 500 units are priced by production review."
          : reason === "pad-low-quantity"
            ? "Pad and screen-print runs below 50 units need a manual production review."
            : reason === "pad-high-quantity"
              ? "Pad and screen-print runs above 10,000 units need a manual production review."
              : reason === "textile-high-quantity"
                ? "Textile-transfer runs above 10,500 units need a manual production review."
                : "This material and size combination needs a manual production review.",
      unitRate: null,
      billableQuantity: null,
      productionSubtotal: null,
      handlingSubtotal,
      sampleSubtotal,
      artworkSubtotal,
      decorationTotal: null,
    }
  }

  return {
    supported: true,
    unitRate,
    billableQuantity,
    productionSubtotal,
    handlingSubtotal,
    sampleSubtotal,
    artworkSubtotal,
    decorationTotal: roundMoney(productionSubtotal + handlingSubtotal + sampleSubtotal + artworkSubtotal),
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
