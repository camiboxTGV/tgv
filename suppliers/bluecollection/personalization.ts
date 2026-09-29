import type { Personalization } from "../../lib/content/catalog.ts"
import type {
  RawProduct,
  RawSupplierPersonalizationMethod,
} from "../_shared/adapter.ts"
import type {
  BlueCollectionMarkingName,
  BlueCollectionProduct,
} from "./types.ts"

const ROMANIAN_LABELS: Readonly<Record<number, string>> = {
  1: "Gravură laser",
  2: "Tampografie",
  3: "Embosare",
  4: "Doming",
  5: "Transfer DTF",
  6: "Broderie digitală",
  7: "Serigrafie",
  8: "Transfer serigrafic",
  9: "Imprimare UV",
  10: "Flex solvent",
  11: "Sublimare",
}

interface MethodAccumulator {
  labelId: number
  printSizes: Set<string>
}

export function describeBlueCollectionPersonalizations(
  products: readonly BlueCollectionProduct[],
  markingNames: readonly BlueCollectionMarkingName[],
): RawSupplierPersonalizationMethod[] {
  const labels = new Map(markingNames.map((method) => [method.id, method]))
  const methods = new Map<string, MethodAccumulator>()

  for (const product of products) {
    for (const markingData of product.marking_data ?? []) {
      for (const place of markingData.marking_place ?? []) {
        for (const option of place.marking_option ?? []) {
          const code = clean(option.option_code)
          const labelId = option.option_label
          if (!code || !Number.isInteger(labelId) || (labelId as number) <= 0) continue
          const existing = methods.get(code)
          if (existing && existing.labelId !== labelId) {
            throw new Error(
              `bluecollection marking code ${code} has conflicting method labels ` +
                `${existing.labelId} and ${labelId}.`,
            )
          }
          const method = existing ?? {
            labelId: labelId as number,
            printSizes: new Set<string>(),
          }
          const printSize = clean(option.option_info)
          if (printSize) method.printSizes.add(printSize)
          methods.set(code, method)
        }
      }
    }
  }

  return [...methods]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .map(([code, method]) => {
      const definition = labels.get(method.labelId)
      const label = clean(definition?.name_en)
      return {
        code,
        label: label || `Blue Collection method ${method.labelId}`,
        ...(ROMANIAN_LABELS[method.labelId]
          ? { labelRo: ROMANIAN_LABELS[method.labelId] }
          : {}),
        printSizes: [...method.printSizes].sort((a, b) => a.localeCompare(b)),
        recognized: Boolean(label),
      }
    })
}

export function mapBlueCollectionPersonalizations(raw: RawProduct): Personalization[] {
  const out = new Set<Personalization>()
  for (const method of raw.supplierPersonalizations ?? []) {
    const label = normalize(method.label)
    if (label === "laser engraving") {
      out.add(isMetal(raw.material ?? []) ? "fiber-laser" : "co2")
    } else if (label === "pad printing" || label === "screen printing") {
      out.add("pad-screen")
    } else if (label === "doming") {
      out.add("uv-transfer")
    } else if (
      label === "dtf" ||
      label === "screen printing heat transfer" ||
      label === "sublimation"
    ) {
      out.add("textile-transfer")
    } else if (label === "uv printing") {
      out.add("uv-print")
    }
  }
  return [...out]
}

function isMetal(materials: readonly string[]): boolean {
  return materials.some((material) =>
    /ALUMIN|STEEL|STAINLESS|BRASS|COPPER|METAL|IRON|ZINC/i.test(material)
  )
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en")
}
