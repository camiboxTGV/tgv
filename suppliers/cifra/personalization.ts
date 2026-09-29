import type { Personalization } from "../../lib/content/catalog.ts"
import type { RawSupplierPersonalizationMethod } from "../_shared/adapter.ts"

export function splitCifraTechniques(value: string | null | undefined): string[] {
  if (!value) return []
  return [
    ...new Set(
      value
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    ),
  ]
}

export function describeCifraPersonalizations(
  codes: readonly string[],
  printSizesByCode: ReadonlyMap<string, ReadonlySet<string>>,
): RawSupplierPersonalizationMethod[] {
  return codes.map((code) => {
    const description = describeTechnique(code)
    return {
      code,
      label: description.label,
      labelRo: description.labelRo,
      printSizes: [...(printSizesByCode.get(code) ?? [])].sort((a, b) => a.localeCompare(b)),
      recognized: description.recognized,
    }
  })
}

export function mapCifraTechnique(
  code: string,
  materials: readonly string[],
): Personalization[] {
  const normalized = normalizeTechnique(code)
  if (isNoDecoration(normalized) || /\bBORDA\w*\b|IMPORTACION|CONSULTAR/.test(normalized)) {
    return []
  }
  if (/DTF|TEXTIL|POLIESTER|VINILO|SUBL|\bSUB\w*/.test(normalized)) {
    return ["textile-transfer"]
  }
  if (/L360|LC[O0][12]?|LASER|\bL(?:L|\d|\+|\/|$)/.test(normalized)) {
    return [isMetal(materials) ? "fiber-laser" : "co2"]
  }
  if (/DIGI|DGITAL|DIGTAL|DIIGTAL|CUATR|ADHESIVO|GOTA|RESIN/.test(normalized)) {
    return ["uv-transfer"]
  }
  if (/SERIGRAF/.test(normalized)) return ["pad-screen"]
  if (isKnownGenericDecoration(normalized)) return ["pad-screen"]
  return []
}

function describeTechnique(code: string): {
  label: string
  labelRo: string
  recognized: boolean
} {
  const normalized = normalizeTechnique(code)
  if (isNoDecoration(normalized)) {
    return {
      label: "Supplied without decoration",
      labelRo: "Livrat fără personalizare",
      recognized: true,
    }
  }
  if (/\bBORDA\w*\b/.test(normalized)) {
    return { label: "Embroidery", labelRo: "Broderie", recognized: true }
  }
  if (/DTF/.test(normalized)) {
    return { label: "Direct-to-film transfer", labelRo: "Transfer DTF", recognized: true }
  }
  if (/SUBL|\bSUB\w*/.test(normalized)) {
    return { label: "Sublimation", labelRo: "Sublimare", recognized: true }
  }
  if (/L360/.test(normalized)) {
    return { label: "360° laser engraving", labelRo: "Gravură laser 360°", recognized: true }
  }
  if (/LC[O0][12]?|LASER|\bL(?:L|\d|\+|\/|$)/.test(normalized)) {
    return { label: "Laser engraving", labelRo: "Gravură laser", recognized: true }
  }
  if (/DIGI|DGITAL|DIGTAL|DIIGTAL|CUATR/.test(normalized)) {
    return { label: "Digital printing", labelRo: "Imprimare digitală", recognized: true }
  }
  if (/VINILO/.test(normalized)) {
    return { label: "Vinyl transfer", labelRo: "Transfer cu vinil", recognized: true }
  }
  if (/GOTA|RESIN/.test(normalized)) {
    return { label: "Resin dome", labelRo: "Doming cu rășină", recognized: true }
  }
  if (/SERIGRAF|IMPRESION|TEXTIL|POLIESTER/.test(normalized)) {
    return { label: "Screen printing", labelRo: "Serigrafie", recognized: true }
  }
  if (/ADHESIVO/.test(normalized)) {
    return { label: "Printed adhesive", labelRo: "Autocolant imprimat", recognized: true }
  }
  if (isKnownGenericDecoration(normalized)) {
    return {
      label: `Cifra decoration code ${code}`,
      labelRo: `Cod personalizare Cifra ${code}`,
      recognized: true,
    }
  }
  return {
    label: `Cifra method ${code}`,
    labelRo: `Metodă Cifra ${code}`,
    recognized: false,
  }
}

const KNOWN_GENERIC_DECORATION_CODES = new Set([
  "A",
  "A (PACK)",
  "A(UNIDAD)",
  "B",
  "B (UNIDAD)",
  "B(POR UNIDAD)",
  "B+B",
  "B+D",
  "B+E",
  "C",
  "C (1 COLOR)",
  "C (1COLOR)",
  "C (UNIDAD)",
  "C(CAJA)",
  "C(POR UNIDAD)",
  "C(UNIDAD)",
  "CONSULTAR",
  "D",
  "D (UNIDAD)",
  "D (VARILLA)",
  "D(1TINTA)",
  "D(POR UNIDAD)",
  "D(UNIDAD)",
  "D(VARILLA)",
  "D+B",
  "D+D",
  "D_PACK_5",
  "E",
  "E(1 TINTA)",
  "E(SIN",
  "E(UNIDAD)",
  "E*",
  "E* (1 COLOR)",
  "E*(EMBOLSADO)",
  "E+B",
  "E+E",
  "EB",
  "E_1TINTA",
  "E_E",
  "F",
  "F (1 COLOR)",
  "F (BOLSA)",
  "F (ELASTICO)",
  "F(1 COLOR)",
  "F(1COLOR)",
  "F(POR PLANCHA)",
  "F(UNIDAD)",
  "F+B",
  "F+F",
  "F+F+F",
  "F+F+F+F",
  "F_1TINTA",
  "G",
  "G_D",
  "H",
  "I",
  "IMPORTACION",
  "LONA",
  "METOPA",
  "PAPEL MUPPY",
  "PARASOLES",
  "POLIPROPILENO",
  "PVC 3 MM",
  "R1",
  "R2",
  "R3",
  "R4",
  "R1+R1",
  "SG1",
  "SG2",
  "SGA",
  "SGC",
  "SGN",
  "SGP",
  "SU",
  "T",
  "TARIFA ESPECIAL",
  "TC",
  "TDB",
  "TRL",
  "TSB",
  "V",
])

function isKnownGenericDecoration(code: string): boolean {
  return KNOWN_GENERIC_DECORATION_CODES.has(code)
}

function normalizeTechnique(code: string): string {
  return code
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLocaleUpperCase("en")
}

function isNoDecoration(code: string): boolean {
  return /SE S[EI]R?V?E? SIN MARCA|SE SRIVE SIN MARCAR/.test(code)
}

function isMetal(materials: readonly string[]): boolean {
  return materials.some((material) =>
    /ALUMIN|STEEL|ACERO|INOX|METAL|IRON|HIERRO|BRASS|LATON|COPPER|COBRE|ZINC/i.test(material),
  )
}
