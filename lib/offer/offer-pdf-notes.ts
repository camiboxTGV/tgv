import { createElement } from "react"
import {
  Font,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import { areOfferPdfNoteCharactersSupported } from "./offer-pdf-note-policy.ts"

const MAX_PDF_WORD_GRAPHEMES = 28

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
})

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF8F3",
    border: "1px solid #FFD3B5",
    borderRadius: 10,
    marginTop: 6,
    padding: 9,
  },
  title: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 5,
  },
  text: {
    color: "#3C3C45",
    fontSize: 8.3,
    lineHeight: 1.5,
  },
})

/**
 * Gives React PDF legal breakpoints for tokens such as long URLs, order codes,
 * or pasted text without spaces. Empty syllables become zero-width glue in
 * React PDF's line breaker, allowing a wrap without inserting a visible or
 * extractable hyphen. Joining the returned parts always recovers the input.
 */
export function splitPdfWordForWrapping(word: string): string[] {
  const graphemes = Array.from(
    graphemeSegmenter.segment(word),
    ({ segment }) => segment,
  )

  if (graphemes.length <= MAX_PDF_WORD_GRAPHEMES) return [word]

  const chunks: string[] = []
  for (let index = 0; index < graphemes.length; index += MAX_PDF_WORD_GRAPHEMES) {
    chunks.push(graphemes.slice(index, index + MAX_PDF_WORD_GRAPHEMES).join(""))
  }
  return chunks.flatMap((chunk, index) => (index === 0 ? [chunk] : ["", chunk]))
}

Font.registerHyphenationCallback(splitPdfWordForWrapping)

export function OfferPdfNotes({
  title,
  notes,
}: {
  title: string
  notes: string
}) {
  if (!areOfferPdfNoteCharactersSupported(notes)) {
    throw new TypeError("offer PDF notes contain unsupported characters")
  }

  return createElement(
    View,
    { style: styles.card, wrap: true },
    createElement(Text, { style: styles.title, minPresenceAhead: 14 }, title),
    createElement(Text, { style: styles.text }, notes),
  )
}
