import {
  LASER_SIZE_LABELS,
  UV_FORMAT_LABELS,
  calculateDecoration,
  type DecorationOptions,
} from "./calculator.ts"

const DECORATION_METHOD_LABELS = {
  en: {
    co2: "CO₂ laser engraving",
    "fiber-laser": "Fiber laser engraving",
    "uv-print": "Direct UV print",
    "pad-screen": "Pad & screen printing",
    "textile-transfer": "Textile transfer",
    "uv-transfer": "Supplier transfer — manual quote",
  },
  ro: {
    co2: "Gravură laser CO₂",
    "fiber-laser": "Gravură laser cu fibră",
    "uv-print": "Print UV direct",
    "pad-screen": "Tampografie / serigrafie",
    "textile-transfer": "Transfer textil",
    "uv-transfer": "Transfer furnizor — ofertă manuală",
  },
} as const

const UV_FORMAT_LABELS_RO = {
  small: "Obiect mic · pix, breloc, USB",
  card: "Card bancar sau USB tip card",
  "medium-a6": "Obiect mediu · până la A6",
  "large-a5": "Obiect mare · până la A5",
  "large-a4": "Obiect mare · până la A4",
  "large-a3": "Obiect mare · până la A3",
} as const

const LASER_SIZE_LABELS_RO = {
  small: "Obiect mic",
  medium: "Obiect mediu",
  large: "Obiect mare",
} as const

interface DecorationSelectionLine {
  decorationOptions?: DecorationOptions
  quantity: number
  priceSnapshot?: number
}

export interface DecorationSelectionSummary {
  method: string
  options: string[]
  decorationPrice: string
  lineTotal: string | null
}

function formatPrice(value: number): string {
  return `€${value.toFixed(2)}`
}

export function summarizeDecorationSelection(
  item: DecorationSelectionLine,
  locale: "en" | "ro" = "en",
): DecorationSelectionSummary | null {
  const options = item.decorationOptions
  if (!options) return null
  const ro = locale === "ro"

  const details: string[] = []
  const addOns: string[] = []
  if (options.method === "uv-print") {
    details.push(
      `${ro ? "Suprafață imprimată" : "Printed area"}: ${ro ? UV_FORMAT_LABELS_RO[options.uvFormat] : UV_FORMAT_LABELS[options.uvFormat]}`,
    )
    if (options.named) addOns.push(ro ? "nume individuale" : "individual names")
    if (options.difficultShape) addOns.push(ro ? "formă dificilă" : "difficult shape")
    if (options.varnish) addOns.push(ro ? "lac de protecție" : "protective varnish")
    if (options.sample) addOns.push(ro ? "mostră de producție" : "production sample")
  } else if (options.method === "co2") {
    details.push(
      `${ro ? "Dimensiunea obiectului" : "Object size"}: ${ro ? LASER_SIZE_LABELS_RO[options.laserSize] : LASER_SIZE_LABELS[options.laserSize]}`,
    )
    details.push(
      `${ro ? "Material" : "Material"}: ${options.co2Material === "silicone" ? (ro ? "Silicon" : "Silicone") : "Standard"}`,
    )
    if (options.named) addOns.push(ro ? "nume individuale" : "individual names")
    if (options.luxuryObject) addOns.push(ro ? "obiect premium peste €40" : "luxury object over €40")
    if (options.largeEngraving) addOns.push(ro ? "gravură peste 12 cm²" : "engraving over 12 cm²")
    if (options.sample) addOns.push(ro ? "mostră de producție" : "production sample")
  } else if (options.method === "fiber-laser") {
    details.push(
      `${ro ? "Dimensiunea obiectului" : "Object size"}: ${ro ? LASER_SIZE_LABELS_RO[options.laserSize] : LASER_SIZE_LABELS[options.laserSize]}`,
    )
    if (options.named) addOns.push(ro ? "nume individuale" : "individual names")
    if (options.luxuryObject) addOns.push(ro ? "obiect premium peste €40" : "luxury object over €40")
    if (options.sample) addOns.push(ro ? "mostră de producție" : "production sample")
  } else if (options.method === "pad-screen") {
    details.push(
      `${ro ? "Sistem de cerneală" : "Ink system"}: ${options.padInkSystem === "mono" ? (ro ? "Monocomponentă" : "Mono-component") : (ro ? "Bicomponentă" : "Two-component")}`,
    )
    details.push(`${ro ? "Culori" : "Colours"}: ${options.printColors}`)
  } else if (options.method === "textile-transfer") {
    details.push(`${ro ? "Format maxim" : "Maximum format"}: ${options.textileFormat} cm`)
    details.push(`${ro ? "Culori" : "Colours"}: ${options.printColors}`)
  }

  details.push(
    `${ro ? "Opțiuni suplimentare" : "Add-ons"}: ${addOns.length > 0 ? addOns.join(", ") : (ro ? "Niciuna" : "None")}`,
  )
  details.push(
    options.handlingRate > 0
      ? `${ro ? "Manipulare despachetare/reambalare" : "Unpack/repack handling"}: ${formatPrice(options.handlingRate)}/${ro ? "buc." : "unit"}`
      : `${ro ? "Manipulare despachetare/reambalare" : "Unpack/repack handling"}: ${ro ? "Fără" : "None"}`,
  )
  if (options.artworkHours > 0) {
    details.push(
      `${ro ? "Procesare grafică" : "Artwork processing"}: ${options.artworkHours} ${ro ? (options.artworkHours === 1 ? "oră" : "ore") : `hour${options.artworkHours === 1 ? "" : "s"}`}`,
    )
  }

  const estimate = calculateDecoration(item.quantity, options)
  const decorationPrice =
    estimate.decorationTotal === null
      ? ro
        ? "Este necesară o ofertă manuală"
        : `Manual quote required${estimate.message ? ` — ${estimate.message}` : ""}`
      : formatPrice(estimate.decorationTotal)
  const productSubtotal =
    typeof item.priceSnapshot === "number"
      ? item.priceSnapshot * item.quantity
      : null
  const lineTotal =
    productSubtotal !== null && estimate.decorationTotal !== null
      ? formatPrice(productSubtotal + estimate.decorationTotal)
      : null

  return {
    method: DECORATION_METHOD_LABELS[locale][options.method],
    options: details,
    decorationPrice,
    lineTotal,
  }
}
