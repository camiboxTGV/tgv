import type { Personalization } from "../../lib/content/catalog.ts"
import type { RawSupplierPersonalizationMethod } from "../_shared/adapter.ts"
import type { XdConnectsRow } from "./types.ts"

interface TechniqueDescription {
  label: string
  labelRo: string
  recognized: boolean
}

const TECHNIQUE_LABELS: Readonly<Record<string, Omit<TechniqueDescription, "recognized">>> = {
  "co2 engraving": { label: "CO2 engraving", labelRo: "Gravură CO2" },
  "digital print": { label: "Digital print", labelRo: "Imprimare digitală" },
  "digital print 360°": {
    label: "Digital print 360°",
    labelRo: "Imprimare digitală 360°",
  },
  "digital transfer": { label: "Digital transfer", labelRo: "Transfer digital" },
  doming: { label: "Doming", labelRo: "Doming cu rășină" },
  embroidery: { label: "Embroidery", labelRo: "Broderie" },
  "engraved pu leather badge": {
    label: "Engraved PU leather badge",
    labelRo: "Ecuson din piele PU gravat",
  },
  "hot stamping": { label: "Hot stamping", labelRo: "Folio la cald" },
  "laser engraving": { label: "Laser engraving", labelRo: "Gravură laser" },
  "pad print": { label: "Pad print", labelRo: "Tampografie" },
  "pu label baltimore black": {
    label: "PU label Baltimore black",
    labelRo: "Etichetă PU Baltimore neagră",
  },
  "pu label brendon": { label: "PU label Brendon", labelRo: "Etichetă PU Brendon" },
  "screen transfer": { label: "Screen transfer", labelRo: "Transfer serigrafic" },
  "silk screen print": { label: "Silk screen print", labelRo: "Serigrafie" },
  "silk screen round": {
    label: "Silk screen round",
    labelRo: "Serigrafie circulară",
  },
  "ukiyo card": { label: "Ukiyo Card", labelRo: "Card Ukiyo" },
}

export function describeXdConnectsPersonalizations(
  rows: readonly XdConnectsRow[],
): RawSupplierPersonalizationMethod[] {
  const byCode = new Map<string, {
    technique: string
    printSizes: Set<string>
  }>()

  for (const row of rows) {
    const code = clean(row.PrintCodeDefault)
    const technique = clean(row.PrintTechniqueDefault)
    if (!code || !technique) continue
    const current = byCode.get(code) ?? { technique, printSizes: new Set<string>() }
    if (!current.technique) current.technique = technique
    const printSize = xdConnectsPrintSize(row)
    if (printSize) current.printSizes.add(printSize)
    byCode.set(code, current)
  }

  return [...byCode]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, data]) => {
      const description = describeTechnique(code, data.technique)
      return {
        code,
        label: description.label,
        labelRo: description.labelRo,
        printSizes: [...data.printSizes].sort((a, b) => a.localeCompare(b)),
        recognized: description.recognized,
      }
    })
}

export function mapXdConnectsTechnique(
  code: string,
  technique: string,
  materials: readonly string[],
): Personalization[] {
  const normalized = normalize(`${code} ${technique}`)
  if (/\b(?:digital|screen) transfer\b/.test(normalized)) {
    return ["textile-transfer"]
  }
  if (/\bco2 engraving\b/.test(normalized)) return ["co2"]
  if (/\blaser engraving\b/.test(normalized)) {
    return [isMetal(materials) ? "fiber-laser" : "co2"]
  }
  if (/\bdigital (?:round|print)\b/.test(normalized)) return ["uv-print"]
  if (/\bpad print\b|\bsilks?creen\b|\bsilk screen\b/.test(normalized)) {
    return ["pad-screen"]
  }
  if (/\bdoming\b/.test(normalized)) return ["uv-transfer"]
  return []
}

export function xdConnectsPrintSize(row: XdConnectsRow): string | undefined {
  const area = clean(row.MaxPrintAreaDefault) || dimensions(row)
  if (!area) return undefined
  const normalizedArea = area
    .replace(/\s*[xX]\s*(?=\d)/g, " × ")
    .replace(/\s+/g, " ")
    .trim()
  const position = clean(row.PrintPositionDefault)
  return position ? `${normalizedArea} · ${position}` : normalizedArea
}

function dimensions(row: XdConnectsRow): string {
  const width = clean(row.MaxPrintWidthDefaultMM)
  const height = clean(row.MaxPrintHeightDefaultMM)
  if (!width || !height) return ""
  return `${width} × ${height} mm`
}

function describeTechnique(code: string, technique: string): TechniqueDescription {
  const known = TECHNIQUE_LABELS[normalize(technique)]
  if (known) return { ...known, recognized: true }
  return {
    label: `XD Connects method ${code}`,
    labelRo: `Metodă XD Connects ${code}`,
    recognized: false,
  }
}

function isMetal(materials: readonly string[]): boolean {
  return materials.some((material) =>
    /\b(?:alumini(?:um|u)|steel|stainless|metal|iron|brass|copper|zinc)\b/i.test(material),
  )
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en")
}

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}
