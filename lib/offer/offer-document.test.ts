import assert from "node:assert/strict"
import { join } from "node:path"
import test from "node:test"
import { inflateSync } from "node:zlib"
import { createElement } from "react"
import {
  Document,
  Font,
  Page,
  renderToBuffer,
} from "@react-pdf/renderer"
import {
  DEFAULT_DECORATION_OPTIONS,
} from "../pricing/calculator.ts"
import {
  MAX_OFFER_PDF_NOTES_CHARS,
  buildOfferDocumentModel,
  formatOfferPdfFilenameDate,
  normalizeOfferPdfDisplayText,
  parseOfferPdfRequest,
} from "./offer-document.ts"
import type { OfferItem } from "./storage.ts"
import {
  OfferPdfNotes,
  splitPdfWordForWrapping,
} from "./offer-pdf-notes.ts"
import {
  areOfferPdfNoteCharactersSupported,
  findUnsupportedOfferPdfNoteCharacters,
} from "./offer-pdf-note-policy.ts"

Font.register({
  family: "Lato",
  fonts: [
    {
      src: join(process.cwd(), "public/fonts/pdf/Lato-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: join(process.cwd(), "public/fonts/pdf/Lato-Bold.ttf"),
      fontWeight: 700,
    },
  ],
})

function countPdfPages(pdf: Buffer): number {
  return pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length ?? 0
}

async function renderNotesFixture(notes: string): Promise<{
  pageCount: number
  layoutWarnings: string[]
  pdf: Buffer
}> {
  const layoutWarnings: string[] = []
  const originalWarn = console.warn
  const originalError = console.error
  const recordMessage = (...values: unknown[]) => {
    const message = values.map(String).join(" ")
    if (/can(?:not|'t) wrap|bigger than available|overflow/i.test(message)) {
      layoutWarnings.push(message)
    }
  }

  console.warn = (...values: unknown[]) => {
    recordMessage(...values)
  }
  console.error = (...values: unknown[]) => {
    recordMessage(...values)
  }

  try {
    const document = createElement(
      Document,
      null,
      createElement(
        Page,
        {
          size: [260, 300],
          style: { padding: 20, fontFamily: "Lato", fontSize: 9 },
          wrap: true,
        },
        createElement(OfferPdfNotes, { title: "PDF note", notes }),
      ),
    )
    const pdf = await renderToBuffer(document)
    return { pageCount: countPdfPages(pdf), layoutWarnings, pdf }
  } finally {
    console.warn = originalWarn
    console.error = originalError
  }
}

async function renderAsciiLongTokenFixture(notes: string): Promise<Buffer> {
  const document = createElement(
    Document,
    null,
    createElement(
      Page,
      {
        size: [220, 120],
        style: { padding: 20, fontSize: 9 },
        wrap: true,
      },
      createElement(OfferPdfNotes, { title: "PDF note", notes }),
    ),
  )
  return renderToBuffer(document)
}

function extractAsciiTextFromReactPdf(pdf: Buffer): string {
  const source = pdf.toString("latin1")
  const streamStartPattern = /stream\r?\n/g
  const extracted: string[] = []
  let streamStart: RegExpExecArray | null

  while ((streamStart = streamStartPattern.exec(source)) !== null) {
    const dataStart = streamStart.index + streamStart[0].length
    const endMarker = source.indexOf("endstream", dataStart)
    if (endMarker < 0) break

    let dataEnd = endMarker
    while (dataEnd > dataStart && /[\r\n]/.test(source[dataEnd - 1])) {
      dataEnd -= 1
    }

    try {
      const content = inflateSync(pdf.subarray(dataStart, dataEnd)).toString(
        "latin1",
      )
      for (const textArray of content.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
        for (const hexText of textArray[1].matchAll(/<([0-9A-Fa-f]*)>/g)) {
          extracted.push(Buffer.from(hexText[1], "hex").toString("latin1"))
        }
      }
    } catch {
      // Font and image streams are not page text streams.
    }

    streamStartPattern.lastIndex = endMarker + "endstream".length
  }

  return extracted.join("")
}

test("PDF request parsing preserves bounded optional notes and locale", () => {
  const selectedProducts = JSON.stringify([
    { slug: "product-1", name: "Product", category: "office", quantity: 2 },
  ])
  const parsed = parseOfferPdfRequest({
    selectedProducts,
    locale: "ro",
    notes: "  Culori: roșu și alb\nAmbalare individuală  ",
  })

  assert.deepEqual(parsed, {
    selectedProducts,
    locale: "ro",
    notes: "Culori: roșu și alb\nAmbalare individuală",
  })
  assert.equal(
    parseOfferPdfRequest({
      selectedProducts,
      locale: "en",
      notes: "a".repeat(MAX_OFFER_PDF_NOTES_CHARS),
    })?.notes.length,
    MAX_OFFER_PDF_NOTES_CHARS,
  )
})

test("PDF filename date uses the Bucharest calendar day", () => {
  assert.equal(
    formatOfferPdfFilenameDate("2026-10-03T21:30:00.000Z"),
    "2026-10-04",
  )
})

test("PDF catalog display text removes invisible controls and normalizes whitespace", () => {
  assert.equal(
    normalizeOfferPdfDisplayText("\u2060\u2060KEYCHAIN\t HOLDER\u2060"),
    "KEYCHAIN HOLDER",
  )

  const model = buildOfferDocumentModel(
    [
      {
        slug: "controlled-product",
        name: "\u2060Product\t name",
        category: "tools-and-keyrings\t",
        quantity: 1,
        supplierSku: "SKU-1\t",
        colorName: "\u2060Red",
        sizeLabel: " L\t",
        priceSnapshot: 1,
      },
    ],
    "en",
    "",
  )

  assert.equal(model.items[0].name, "Product name")
  assert.equal(model.items[0].category, "tools-and-keyrings")
  assert.equal(model.items[0].supplierSku, "SKU-1")
  assert.equal(model.items[0].variantLabel, "Red · L")
})

test("PDF request parsing rejects invalid field types and oversized notes", () => {
  const selectedProducts = "[]"
  assert.equal(
    parseOfferPdfRequest({
      selectedProducts,
      locale: "de",
      notes: "",
    }),
    null,
  )
  assert.equal(
    parseOfferPdfRequest({
      selectedProducts: [],
      locale: "en",
      notes: "",
    }),
    null,
  )
  assert.equal(
    parseOfferPdfRequest({
      selectedProducts,
      locale: "en",
      notes: "a".repeat(MAX_OFFER_PDF_NOTES_CHARS + 1),
    }),
    null,
  )
})

test("offer document model includes priced personalization and preserves notes", () => {
  const items: OfferItem[] = [
    {
      slug: "uv-product",
      name: "UV product",
      category: "office/writing",
      quantity: 2,
      supplierSku: "UV-1",
      priceSnapshot: 12.5,
      personalizations: ["uv-print"],
      decorationOptions: {
        ...DEFAULT_DECORATION_OPTIONS,
        method: "uv-print",
        uvFormat: "large-a4",
        difficultShape: true,
        sample: true,
        handlingRate: 0.1,
        artworkHours: 0.5,
      },
    },
  ]

  const model = buildOfferDocumentModel(
    items,
    "ro",
    "Linia întâi\nLinia a doua",
    "2026-10-04T10:00:00.000Z",
  )

  assert.equal(model.notes, "Linia întâi\nLinia a doua")
  assert.equal(model.productsSubtotal, 25)
  assert.equal(model.knownPersonalizationSubtotal, 64.7)
  assert.equal(model.estimatedTotal, 89.7)
  assert.equal(model.hasManualReview, false)
  assert.equal(model.items[0].productSubtotal, 25)
  assert.equal(model.items[0].personalization?.subtotal, 64.7)
  assert.equal(model.items[0].lineTotal, 89.7)
  assert.match(model.items[0].personalization?.method ?? "", /UV/)
})

test("manual personalization is never represented as a zero-priced grand total", () => {
  const items: OfferItem[] = [
    {
      slug: "manual-product",
      name: "Manual product",
      category: "bags",
      quantity: 3,
      priceSnapshot: 5,
      personalizations: ["uv-transfer"],
      decorationOptions: {
        ...DEFAULT_DECORATION_OPTIONS,
        method: "uv-transfer",
      },
    },
  ]

  const model = buildOfferDocumentModel(items, "en", "")

  assert.equal(model.productsSubtotal, 15)
  assert.equal(model.knownPersonalizationSubtotal, 0)
  assert.equal(model.estimatedTotal, null)
  assert.equal(model.hasManualReview, true)
  assert.equal(model.items[0].personalization?.requiresManualReview, true)
  assert.equal(model.items[0].personalization?.subtotal, null)
  assert.equal(model.items[0].lineTotal, null)
})

test("lines without saved personalization retain their product total", () => {
  const model = buildOfferDocumentModel(
    [
      {
        slug: "plain-product",
        name: "Plain product",
        category: "drinkware",
        quantity: 4,
        priceSnapshot: 2.5,
      },
    ],
    "en",
    "",
  )

  assert.equal(model.items[0].personalization, null)
  assert.equal(model.items[0].lineTotal, 10)
  assert.equal(model.estimatedTotal, 10)
})

test("PDF word wrapping preserves graphemes and bounds unbroken tokens", () => {
  const shortWord = "personalizare"
  assert.deepEqual(splitPdfWordForWrapping(shortWord), [shortWord])

  const familyEmoji = "👨‍👩‍👧‍👦"
  const longToken = `${familyEmoji.repeat(35)}${"x".repeat(80)}`
  const chunks = splitPdfWordForWrapping(longToken)

  assert.ok(chunks.length > 1)
  assert.equal(chunks.join(""), longToken)
  assert.ok(chunks.includes(""))
  for (const chunk of chunks.filter(Boolean)) {
    assert.ok(
      Array.from(graphemeSegmenterForTest.segment(chunk)).length <= 28,
    )
  }
})

test("PDF note policy renders Romanian but rejects unsupported scripts and emoji", async () => {
  const selectedProducts = "[]"
  const supported =
    "Ăă Ââ Îî Șș Țț — ofertă 10×20 cm, 25 € și ambalare „cadou”."

  assert.equal(areOfferPdfNoteCharactersSupported(supported), true)
  assert.deepEqual(findUnsupportedOfferPdfNoteCharacters(supported), [])
  assert.equal(
    parseOfferPdfRequest({ selectedProducts, locale: "ro", notes: supported })
      ?.notes,
    supported,
  )

  const rendered = await renderNotesFixture(supported)
  assert.equal(rendered.pageCount, 1)
  assert.deepEqual(rendered.layoutWarnings, [])
  assert.ok(rendered.pdf.length > 0)

  for (const unsupported of ["emoji 🙂", "text chirilic: Привет", "汉字", "a\u00adb"]) {
    assert.equal(areOfferPdfNoteCharactersSupported(unsupported), false)
    assert.ok(findUnsupportedOfferPdfNoteCharacters(unsupported).length > 0)
    assert.equal(
      parseOfferPdfRequest({
        selectedProducts,
        locale: "ro",
        notes: unsupported,
      }),
      null,
    )
  }

  assert.throws(
    () => OfferPdfNotes({ title: "PDF note", notes: "unsupported emoji 🙂" }),
    /unsupported characters/,
  )
})

test("maximum multiline PDF notes paginate without oversized layout warnings", async () => {
  const line = "Detalii personalizare, culori și ambalare individuală.\n"
  const notes = line
    .repeat(Math.ceil(MAX_OFFER_PDF_NOTES_CHARS / line.length))
    .slice(0, MAX_OFFER_PDF_NOTES_CHARS)
  const result = await renderNotesFixture(notes)

  assert.equal(notes.length, MAX_OFFER_PDF_NOTES_CHARS)
  assert.deepEqual(result.layoutWarnings, [])
  assert.ok(result.pageCount >= 2)
  assert.ok(result.pageCount <= 12)
})

test("maximum unbroken PDF notes wrap and paginate within a bounded page count", async () => {
  const notes = "x".repeat(MAX_OFFER_PDF_NOTES_CHARS)
  const result = await renderNotesFixture(notes)

  assert.deepEqual(result.layoutWarnings, [])
  assert.ok(result.pageCount >= 2)
  assert.ok(result.pageCount <= 12)
})

test("rendered long tokens wrap without adding extractable hyphens", async () => {
  const token = "offerreference0123456789".repeat(16)
  const pdf = await renderAsciiLongTokenFixture(token)
  const extracted = extractAsciiTextFromReactPdf(pdf)

  assert.ok(countPdfPages(pdf) >= 2)
  assert.equal(extracted, `PDF note${token}`)
  assert.equal(extracted.includes("-"), false)
})

const graphemeSegmenterForTest = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
})
