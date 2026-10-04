import type { OfferItem } from "./storage.ts"
import { calculateDecoration } from "../pricing/calculator.ts"
import { summarizeDecorationSelection } from "../pricing/decoration-selection.ts"
import { toTimeZoneDateInputValue } from "../contact/local-date.ts"
import { areOfferPdfNoteCharactersSupported } from "./offer-pdf-note-policy.ts"

export const MAX_OFFER_PDF_NOTES_CHARS = 2_000
export const OFFER_PDF_TIME_ZONE = "Europe/Bucharest"

export function formatOfferPdfFilenameDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) {
    throw new TypeError("invalid offer PDF generation date")
  }
  return toTimeZoneDateInputValue(date, OFFER_PDF_TIME_ZONE)
}

export function normalizeOfferPdfDisplayText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\t\n\r\f\v]+/gu, " ")
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu,
      "",
    )
    .replace(/\s+/gu, " ")
    .trim()
}

export interface OfferPdfRequestPayload {
  selectedProducts: string
  locale: "ro" | "en"
  notes: string
}

export interface OfferDocumentPersonalization {
  method: string
  options: string[]
  estimateLabel: string
  subtotal: number | null
  requiresManualReview: boolean
}

export interface OfferDocumentItem {
  key: string
  slug: string
  name: string
  category: string
  supplierSku?: string
  variantLabel?: string
  quantity: number
  unitPrice: number | null
  productSubtotal: number | null
  personalization: OfferDocumentPersonalization | null
  lineTotal: number | null
  imageData?: string
}

export interface OfferDocumentModel {
  locale: "ro" | "en"
  generatedAt: string
  notes: string
  items: OfferDocumentItem[]
  totalQuantity: number
  productsSubtotal: number
  knownPersonalizationSubtotal: number
  estimatedTotal: number | null
  hasManualReview: boolean
  hasUnknownProductPrice: boolean
}

export function parseOfferPdfRequest(
  value: unknown,
): OfferPdfRequestPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.selectedProducts !== "string" ||
    (candidate.locale !== "ro" && candidate.locale !== "en")
  ) {
    return null
  }

  const notes = candidate.notes ?? ""
  if (
    typeof notes !== "string" ||
    notes.length > MAX_OFFER_PDF_NOTES_CHARS ||
    !areOfferPdfNoteCharactersSupported(notes)
  ) {
    return null
  }

  return {
    selectedProducts: candidate.selectedProducts,
    locale: candidate.locale,
    notes: notes.trim(),
  }
}

export function buildOfferDocumentModel(
  items: readonly OfferItem[],
  locale: "ro" | "en",
  notes: string,
  generatedAt = new Date().toISOString(),
): OfferDocumentModel {
  let totalQuantity = 0
  let productsSubtotal = 0
  let knownPersonalizationSubtotal = 0
  let hasManualReview = false
  let hasUnknownProductPrice = false

  const documentItems = items.map((item): OfferDocumentItem => {
    totalQuantity += item.quantity
    const unitPrice =
      typeof item.priceSnapshot === "number" ? item.priceSnapshot : null
    const productSubtotal =
      unitPrice === null ? null : roundMoney(unitPrice * item.quantity)
    if (productSubtotal === null) {
      hasUnknownProductPrice = true
    } else {
      productsSubtotal = roundMoney(productsSubtotal + productSubtotal)
    }

    const summary = summarizeDecorationSelection(item, locale)
    const estimate = item.decorationOptions
      ? calculateDecoration(item.quantity, item.decorationOptions)
      : null
    const personalization =
      summary && estimate
        ? {
            method: normalizeOfferPdfDisplayText(summary.method),
            options: summary.options.map(normalizeOfferPdfDisplayText),
            estimateLabel: normalizeOfferPdfDisplayText(summary.decorationPrice),
            subtotal: estimate.decorationTotal,
            requiresManualReview: estimate.decorationTotal === null,
          }
        : null

    if (personalization?.subtotal === null) {
      hasManualReview = true
    } else if (personalization) {
      knownPersonalizationSubtotal = roundMoney(
        knownPersonalizationSubtotal + personalization.subtotal,
      )
    }

    const lineTotal =
      productSubtotal === null || personalization?.subtotal === null
        ? null
        : roundMoney(productSubtotal + (personalization?.subtotal ?? 0))

    const name = normalizeOfferPdfDisplayText(item.name) || item.slug
    const category = normalizeOfferPdfDisplayText(item.category)
    const supplierSku = item.supplierSku
      ? normalizeOfferPdfDisplayText(item.supplierSku)
      : ""
    const variantParts = [item.colorName, item.sizeLabel]
      .filter((value): value is string => Boolean(value))
      .map(normalizeOfferPdfDisplayText)
      .filter(Boolean)

    return {
      key: item.variantKey ?? item.slug,
      slug: item.slug,
      name,
      category,
      ...(supplierSku ? { supplierSku } : {}),
      ...(variantParts.length > 0
        ? { variantLabel: variantParts.join(" · ") }
        : {}),
      quantity: item.quantity,
      unitPrice,
      productSubtotal,
      personalization,
      lineTotal,
    }
  })

  return {
    locale,
    generatedAt,
    notes,
    items: documentItems,
    totalQuantity,
    productsSubtotal,
    knownPersonalizationSubtotal,
    estimatedTotal:
      hasUnknownProductPrice || hasManualReview
        ? null
        : roundMoney(productsSubtotal + knownPersonalizationSubtotal),
    hasManualReview,
    hasUnknownProductPrice,
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
