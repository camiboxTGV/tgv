import {
  DEFAULT_DECORATION_OPTIONS,
  type DecorationOptions,
  type HandlingRate,
  type LaserSize,
  type PadInkSystem,
  type PrintColors,
  type TextileFormat,
  type UvFormat,
} from "./calculator.ts"
import type { Personalization } from "../content/catalog.ts"

const PERSONALIZATIONS = new Set<Personalization>([
  "co2",
  "fiber-laser",
  "uv-print",
  "pad-screen",
  "textile-transfer",
  "uv-transfer",
])
const UV_FORMATS = new Set<UvFormat>([
  "small",
  "card",
  "medium-a6",
  "large-a5",
  "large-a4",
  "large-a3",
])
const LASER_SIZES = new Set<LaserSize>(["small", "medium", "large"])
const CO2_MATERIALS = new Set<DecorationOptions["co2Material"]>([
  "standard",
  "silicone",
])
const PAD_INK_SYSTEMS = new Set<PadInkSystem>(["mono", "two-component"])
const PRINT_COLORS = new Set<PrintColors>([1, 2, 3, 4, 5, 6])
const TEXTILE_FORMATS = new Set<TextileFormat>(["10x10", "20x30"])
const HANDLING_RATES = new Set<HandlingRate>([0, 0.05, 0.1, 0.2])
export const MAX_ARTWORK_HOURS = 10_000

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

export function clampArtworkHours(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_ARTWORK_HOURS, Math.max(0, value))
}

/**
 * Keep only the fields that can affect the selected production method. This
 * prevents hidden controls from carrying stale charges across method changes.
 */
export function normalizeDecorationOptions(
  options: DecorationOptions,
): DecorationOptions {
  const shared: DecorationOptions = {
    ...DEFAULT_DECORATION_OPTIONS,
    method: options.method,
    artworkHours: options.artworkHours,
    handlingRate:
      options.method === "textile-transfer" && options.handlingRate === 0.05
        ? 0
        : options.handlingRate,
  }

  if (options.method === "uv-print") {
    return {
      ...shared,
      uvFormat: options.uvFormat,
      named: options.named,
      difficultShape: options.difficultShape,
      varnish: options.varnish,
      sample: options.sample,
    }
  }

  if (options.method === "co2") {
    return {
      ...shared,
      laserSize: options.laserSize,
      co2Material: options.co2Material,
      named: options.named,
      luxuryObject: options.luxuryObject,
      largeEngraving: options.largeEngraving,
      sample: options.sample,
    }
  }

  if (options.method === "fiber-laser") {
    return {
      ...shared,
      laserSize: options.laserSize,
      named: options.named,
      luxuryObject: options.luxuryObject,
      sample: options.sample,
    }
  }

  if (options.method === "pad-screen") {
    return {
      ...shared,
      padInkSystem: options.padInkSystem,
      printColors: options.printColors,
    }
  }

  if (options.method === "textile-transfer") {
    return {
      ...shared,
      textileFormat: options.textileFormat,
      printColors: options.printColors,
    }
  }

  return shared
}

/**
 * Rebuild calculator options from known, bounded fields before they cross a
 * storage or request boundary. This keeps offer URLs backward compatible while
 * preventing arbitrary client JSON from reaching the email price calculator.
 */
export function parseDecorationOptions(value: unknown): DecorationOptions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.method !== "string" ||
    !PERSONALIZATIONS.has(candidate.method as Personalization) ||
    typeof candidate.uvFormat !== "string" ||
    !UV_FORMATS.has(candidate.uvFormat as UvFormat) ||
    typeof candidate.laserSize !== "string" ||
    !LASER_SIZES.has(candidate.laserSize as LaserSize) ||
    typeof candidate.co2Material !== "string" ||
    !CO2_MATERIALS.has(candidate.co2Material as DecorationOptions["co2Material"]) ||
    typeof candidate.padInkSystem !== "string" ||
    !PAD_INK_SYSTEMS.has(candidate.padInkSystem as PadInkSystem) ||
    typeof candidate.printColors !== "number" ||
    !PRINT_COLORS.has(candidate.printColors as PrintColors) ||
    typeof candidate.textileFormat !== "string" ||
    !TEXTILE_FORMATS.has(candidate.textileFormat as TextileFormat) ||
    typeof candidate.artworkHours !== "number" ||
    !Number.isFinite(candidate.artworkHours) ||
    candidate.artworkHours < 0 ||
    candidate.artworkHours > MAX_ARTWORK_HOURS ||
    !isBoolean(candidate.named) ||
    !isBoolean(candidate.difficultShape) ||
    !isBoolean(candidate.varnish) ||
    !isBoolean(candidate.luxuryObject) ||
    !isBoolean(candidate.largeEngraving) ||
    !isBoolean(candidate.sample) ||
    typeof candidate.handlingRate !== "number" ||
    !HANDLING_RATES.has(candidate.handlingRate as HandlingRate)
  ) {
    return null
  }

  return normalizeDecorationOptions({
    method: candidate.method as Personalization,
    uvFormat: candidate.uvFormat as UvFormat,
    laserSize: candidate.laserSize as LaserSize,
    co2Material: candidate.co2Material as DecorationOptions["co2Material"],
    padInkSystem: candidate.padInkSystem as PadInkSystem,
    printColors: candidate.printColors as PrintColors,
    textileFormat: candidate.textileFormat as TextileFormat,
    artworkHours: candidate.artworkHours,
    named: candidate.named,
    difficultShape: candidate.difficultShape,
    varnish: candidate.varnish,
    luxuryObject: candidate.luxuryObject,
    largeEngraving: candidate.largeEngraving,
    sample: candidate.sample,
    handlingRate: candidate.handlingRate as HandlingRate,
  })
}
