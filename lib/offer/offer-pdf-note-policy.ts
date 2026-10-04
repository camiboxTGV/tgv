const EXTRA_SUPPORTED_CODE_POINTS = new Set([
  0x2010, // hyphen
  0x2012, // figure dash
  0x2013, // en dash
  0x2014, // em dash
  0x2015, // horizontal bar
  0x2018, // left single quotation mark
  0x2019, // right single quotation mark
  0x201a, // single low-9 quotation mark
  0x201b, // single high-reversed-9 quotation mark
  0x201c, // left double quotation mark
  0x201d, // right double quotation mark
  0x201e, // double low-9 quotation mark
  0x2020, // dagger
  0x2021, // double dagger
  0x2022, // bullet
  0x2026, // ellipsis
  0x2030, // per mille sign
  0x2039, // single left-pointing angle quotation mark
  0x203a, // single right-pointing angle quotation mark
  0x2044, // fraction slash
  0x20ac, // euro sign
  0x2116, // numero sign
  0x2122, // trademark sign
  0x2190, // left arrow
  0x2191, // up arrow
  0x2192, // right arrow
  0x2193, // down arrow
  0x2212, // minus sign
  0x2260, // not equal to
  0x2264, // less-than or equal to
  0x2265, // greater-than or equal to
])

/**
 * Conservative, browser-safe character policy for the embedded Lato PDF font.
 * It covers English, Romanian, common European Latin text, and punctuation
 * whose glyphs are present in both bundled Lato faces. Unsupported scripts,
 * emoji, controls, invisible format characters, and soft hyphens are rejected
 * instead of being rendered as corrupt or misleading glyphs.
 */
export function isOfferPdfNoteCharacterSupported(character: string): boolean {
  if (character === "\n") return true

  const codePoint = character.codePointAt(0)
  if (codePoint === undefined) return false

  if (codePoint >= 0x20 && codePoint <= 0x7e) return true
  if (codePoint >= 0xa0 && codePoint <= 0x17f && codePoint !== 0xad) {
    return true
  }
  if (codePoint >= 0x218 && codePoint <= 0x21b) return true
  return EXTRA_SUPPORTED_CODE_POINTS.has(codePoint)
}

export function findUnsupportedOfferPdfNoteCharacters(value: string): string[] {
  const unsupported = new Set<string>()
  for (const character of value) {
    if (!isOfferPdfNoteCharacterSupported(character)) {
      unsupported.add(character)
    }
  }
  return Array.from(unsupported)
}

export function areOfferPdfNoteCharactersSupported(value: string): boolean {
  for (const character of value) {
    if (!isOfferPdfNoteCharacterSupported(character)) return false
  }
  return true
}
