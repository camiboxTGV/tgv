const COLOUR_TERMS: ReadonlyArray<readonly [string, string]> = [
  ["french navy", "#1F2A44"],
  ["royal blue", "#1D4ED8"],
  ["baby blue", "#93C5FD"],
  ["sky blue", "#7DD3FC"],
  ["light blue", "#BFDBFE"],
  ["ice blue", "#BAE6FD"],
  ["arctic blue", "#A5D8FF"],
  ["bright sky", "#38BDF8"],
  ["heather sky", "#7DD3FC"],
  ["pool blue", "#0EA5E9"],
  ["atoll blue", "#0891B2"],
  ["petroleum blue", "#155E75"],
  ["petrol", "#0F766E"],
  ["ultramarine", "#1E40AF"],
  ["aqua", "#22D3EE"],
  ["turquoise", "#14B8A6"],
  ["azure", "#0EA5E9"],
  ["indigo", "#4338CA"],
  ["denim", "#3B5B92"],
  ["navy", "#1E3A5F"],
  ["blue", "#2563EB"],
  ["bottle green", "#14532D"],
  ["forest green", "#166534"],
  ["army green", "#4D5B37"],
  ["dark green", "#166534"],
  ["kelly green", "#16A34A"],
  ["apple green", "#65A30D"],
  ["spring green", "#22C55E"],
  ["mint green", "#6EE7B7"],
  ["sage green", "#84A98C"],
  ["lime", "#84CC16"],
  ["khaki", "#7C7A46"],
  ["army", "#4D5B37"],
  ["emerald", "#059669"],
  ["jade", "#00A86B"],
  ["meadow", "#4D7C0F"],
  ["green", "#16A34A"],
  ["burgundy", "#7F1D3A"],
  ["oxblood", "#4A0404"],
  ["pepper red", "#B91C1C"],
  ["bright red", "#EF4444"],
  ["tango red", "#DC2626"],
  ["chili red", "#B91C1C"],
  ["red", "#DC2626"],
  ["burnt orange", "#C2410C"],
  ["dark orange", "#C2410C"],
  ["apricot", "#FB923C"],
  ["peach", "#FDBA74"],
  ["terracotta", "#C65D3B"],
  ["neon coral", "#FB7185"],
  ["orange", "#F97316"],
  ["ochre", "#CA8A04"],
  ["pale yellow", "#FEF08A"],
  ["light yellow", "#FEF3C7"],
  ["lemon", "#FDE047"],
  ["yellow", "#FACC15"],
  ["champagne", "#E8D5A9"],
  ["matt gold", "#B89432"],
  ["gold", "#D4AF37"],
  ["copper", "#B87333"],
  ["chocolate", "#5C3317"],
  ["umber", "#635147"],
  ["brown", "#8B5E3C"],
  ["earth", "#806044"],
  ["wood", "#A47148"],
  ["rope", "#BFA77A"],
  ["sand", "#D6C39A"],
  ["taupe", "#8B7D6B"],
  ["dark beige", "#B89B72"],
  ["beige", "#D6C3A3"],
  ["natural", "#DCC9A6"],
  ["linen", "#D8C3A5"],
  ["cream", "#FFF1C7"],
  ["ivory", "#FFF7D6"],
  ["off-white", "#F5F1E8"],
  ["off white", "#F5F1E8"],
  ["absolute white", "#FFFFFF"],
  ["white", "#FFFFFF"],
  ["charcoal grey", "#374151"],
  ["charcoal", "#374151"],
  ["stone grey", "#78716C"],
  ["mouse grey", "#737373"],
  ["carbon grey", "#4B5563"],
  ["metal grey", "#64748B"],
  ["dark grey", "#4B5563"],
  ["light grey", "#D1D5DB"],
  ["pure grey", "#9CA3AF"],
  ["flannel grey", "#6B7280"],
  ["ash", "#B6B8BA"],
  ["titanium", "#878681"],
  ["zinc", "#71717A"],
  ["silver", "#C0C0C0"],
  ["grey", "#9CA3AF"],
  ["gray", "#9CA3AF"],
  ["deep black", "#09090B"],
  ["recycled black", "#27272A"],
  ["black", "#111827"],
  ["dark purple", "#581C87"],
  ["astral purple", "#6D28D9"],
  ["light purple", "#C4B5FD"],
  ["violet", "#7C3AED"],
  ["lilac", "#C4B5FD"],
  ["iris", "#5D3FD3"],
  ["fuchsia", "#D946EF"],
  ["orchid", "#DA70D6"],
  ["ancient pink", "#C08497"],
  ["baby pink", "#F9A8D4"],
  ["pale pink", "#FBCFE8"],
  ["candy pink", "#F472B6"],
  ["ribbon pink", "#F9A8D4"],
  ["hibiscus", "#DB2777"],
  ["pink", "#EC4899"],
]

const MULTICOLOUR =
  "conic-gradient(#DC2626 0 16.67%, #F97316 0 33.33%, #FACC15 0 50%, #16A34A 0 66.67%, #2563EB 0 83.33%, #7C3AED 0)"
const TRANSPARENT =
  "repeating-conic-gradient(#E5E7EB 0 25%, #FFFFFF 0 50%) 50% / 8px 8px"

function normaliseColourName(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ")
}

function solidColour(name: string): string | null {
  const normalised = normaliseColourName(name)
  for (const [term, colour] of COLOUR_TERMS) {
    if (normalised.includes(term)) return colour
  }
  return null
}

function deterministicFallback(name: string): string {
  let hash = 0
  for (const character of normaliseColourName(name)) {
    hash = Math.trunc(hash * 31 + (character.codePointAt(0) ?? 0))
  }
  return `hsl(${Math.abs(hash) % 360} 55% 52%)`
}

/**
 * Returns a CSS background for supplier colour names when no exact swatch value is available.
 * Compound names stay visibly compound and unknown supplier colours remain deterministic.
 */
export function catalogColourBackground(name: string, exact?: string): string {
  if (exact?.trim()) return exact.trim()

  const normalised = normaliseColourName(name)
  if (/\b(?:multi(?:colour|color)|mix colour)\b/.test(normalised)) {
    return MULTICOLOUR
  }

  const parts = name
    .split(/\s*(?:\/|\|)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    const colours = parts.map((part) => solidColour(part) ?? deterministicFallback(part))
    const stops = colours.flatMap((colour, index) => {
      const from = Math.round(index * 100 / colours.length)
      const to = Math.round((index + 1) * 100 / colours.length)
      return [`${colour} ${from}%`, `${colour} ${to}%`]
    })
    return `linear-gradient(135deg, ${stops.join(", ")})`
  }

  const solid = solidColour(name)
  if (solid) return solid
  if (normalised.includes("transparent")) return TRANSPARENT
  return deterministicFallback(name)
}
