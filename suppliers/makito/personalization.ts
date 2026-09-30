import type { Personalization } from "../../lib/content/catalog.ts"
import type {
  RawProduct,
  RawSupplierPersonalizationMethod,
} from "../_shared/adapter.ts"

export interface MakitoTechniqueInput {
  id: string
  description?: string
  category?: string
  technicalRange?: string
  maximumColors?: number
  fullColor?: boolean
  printSizes?: readonly string[]
}

interface TechniqueLabels {
  label: string
  labelRo: string
}

const KNOWN_LABELS: readonly [RegExp, TechniqueLabels][] = [
  [
    /\b(?:pad print(?:ing)?|tampograph(?:y|ie)|tampografia)\b/,
    { label: "Pad printing", labelRo: "Tampografie" },
  ],
  [
    /\b(?:screen print(?:ing)?|silk ?screen|serigraph(?:y|ie)|serigrafia)\b/,
    { label: "Screen printing", labelRo: "Serigrafie" },
  ],
  [
    /\b(?:laser engrav(?:ing|e)|gravure laser|grabado laser)\b/,
    { label: "Laser engraving", labelRo: "Gravură laser" },
  ],
  [
    /\b(?:co2 engrav(?:ing|e)|gravure co2|grabado co2)\b/,
    { label: "CO2 engraving", labelRo: "Gravură CO2" },
  ],
  [
    /\b(?:digital transfer|dtf|transfer digital)\b/,
    { label: "Digital transfer", labelRo: "Transfer digital" },
  ],
  [
    /\b(?:screen transfer|transfer serigraph(?:ic|ique)|transfer serigrafico)\b/,
    { label: "Screen transfer", labelRo: "Transfer serigrafic" },
  ],
  [
    /\b(?:sublimation|sublimacion|sublimacao)\b/,
    { label: "Sublimation", labelRo: "Sublimare" },
  ],
  [
    /\b(?:uv print(?:ing)?|digital print(?:ing)?|impresion digital|impression numerique)\b/,
    { label: "Digital printing", labelRo: "Imprimare digitală" },
  ],
  [
    /\b(?:doming|resin dome|gota de resina)\b/,
    { label: "Doming", labelRo: "Doming cu rășină" },
  ],
  [
    /\b(?:embroidery|broderie|bordado)\b/,
    { label: "Embroidery", labelRo: "Broderie" },
  ],
  [
    /\b(?:hot stamp(?:ing)?|foil stamp(?:ing)?|termograbado)\b/,
    { label: "Hot stamping", labelRo: "Folio la cald" },
  ],
]

export function describeMakitoPersonalizations(
  techniques: readonly MakitoTechniqueInput[],
): RawSupplierPersonalizationMethod[] {
  const byId = new Map<string, {
    labels: TechniqueLabels
    recognized: boolean
    printSizes: Set<string>
  }>()

  for (const technique of techniques) {
    const id = clean(technique.id)
    if (!id) continue
    const sourceLabel = clean(technique.description) || clean(technique.category)
    const normalized = normalize([
      sourceLabel,
      technique.category,
      technique.technicalRange,
    ].filter(Boolean).join(" "))
    const known = KNOWN_LABELS.find(([pattern]) => pattern.test(normalized))?.[1]
    const labels = known ?? {
      label: sourceLabel || `Makito method ${id}`,
      labelRo: `Metodă Makito ${id}`,
    }
    const current = byId.get(id)
    if (current && current.labels.label !== labels.label) {
      throw new Error(`makito technique ${id} has conflicting descriptions`)
    }
    const item = current ?? {
      labels,
      recognized: Boolean(known),
      printSizes: new Set<string>(),
    }
    for (const size of technique.printSizes ?? []) {
      const value = clean(size)
      if (value) item.printSizes.add(value)
    }
    if (Number.isInteger(technique.maximumColors) && (technique.maximumColors ?? 0) > 0) {
      item.printSizes.add(`Up to ${technique.maximumColors} colours`)
    } else if (technique.fullColor) {
      item.printSizes.add("Full colour")
    }
    byId.set(id, item)
  }

  return [...byId]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([code, item]) => ({
      code,
      label: item.labels.label,
      labelRo: item.labels.labelRo,
      printSizes: [...item.printSizes].sort((left, right) => left.localeCompare(right)),
      recognized: item.recognized,
    }))
}

export function mapMakitoPersonalizations(raw: RawProduct): Personalization[] {
  const mapped = new Set<Personalization>()
  for (const method of raw.supplierPersonalizations ?? []) {
    const value = normalize(`${method.code} ${method.label}`)
    if (/\b(?:digital transfer|screen transfer|dtf|sublimation)\b/.test(value)) {
      mapped.add("textile-transfer")
    } else if (/\bco2\b/.test(value)) {
      mapped.add("co2")
    } else if (/\blaser engrav(?:ing|e)\b/.test(value)) {
      mapped.add(isMetal(raw.material ?? []) ? "fiber-laser" : "co2")
    } else if (/\b(?:uv print(?:ing)?|digital print(?:ing)?)\b/.test(value)) {
      mapped.add("uv-print")
    } else if (/\b(?:pad print(?:ing)?|screen print(?:ing)?|silk ?screen)\b/.test(value)) {
      mapped.add("pad-screen")
    } else if (/\b(?:doming|resin dome)\b/.test(value)) {
      mapped.add("uv-transfer")
    }
  }
  return [...mapped]
}

function isMetal(materials: readonly string[]): boolean {
  return materials.some((material) =>
    /\b(?:alumini(?:um|o)|steel|stainless|metal|iron|brass|copper|zinc|acero)\b/i.test(material),
  )
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}
