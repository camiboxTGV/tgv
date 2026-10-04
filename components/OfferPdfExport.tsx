"use client"

import { useRef, useState } from "react"
import type { OfferItem } from "@/lib/offer/storage"
import {
  MAX_OFFER_PDF_NOTES_CHARS,
  formatOfferPdfFilenameDate,
} from "@/lib/offer/offer-document"
import { areOfferPdfNoteCharactersSupported } from "@/lib/offer/offer-pdf-note-policy"

type ExportState =
  | "idle"
  | "busy"
  | "loading"
  | "success"
  | "error"
  | "rate-limited"
  | "stale"
  | "unsupported-notes"

const MAX_BUSY_RETRIES = 2

export default function OfferPdfExport({
  items,
  locale,
}: Readonly<{
  items: readonly OfferItem[]
  locale: "ro" | "en"
}>) {
  const ro = locale === "ro"
  const [notes, setNotes] = useState("")
  const [state, setState] = useState<ExportState>("idle")
  const buttonRef = useRef<HTMLButtonElement>(null)
  const latestRequestSignature = useRef("")
  latestRequestSignature.current = requestSignature(items, locale, notes)

  const downloadPdf = async () => {
    if (state === "loading" || items.length === 0) return
    if (!areOfferPdfNoteCharactersSupported(notes)) {
      setState("unsupported-notes")
      return
    }
    setState("loading")
    const requestedSignature = requestSignature(items, locale, notes)
    const requestBody = JSON.stringify({
      selectedProducts: JSON.stringify(items),
      locale,
      notes,
    })

    try {
      const response = await requestOfferPdf(requestBody)

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const code =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : ""
        if (code === "selection_changed" || code === "selection_invalid") {
          setState("stale")
          return
        }
        if (code === "rate_limited") {
          setState("rate-limited")
          return
        }
        if (code === "server_busy") {
          setState("busy")
          return
        }
        throw new Error(`PDF request failed with status ${response.status}`)
      }
      if (!response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error("PDF response had an unexpected content type")
      }

      const blob = await response.blob()
      if (blob.size === 0) throw new Error("PDF response was empty")
      if (latestRequestSignature.current !== requestedSignature) {
        setState("stale")
        return
      }
      const filename = responseFilename(response, locale)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.style.display = "none"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
      setState("success")
    } catch (error) {
      console.error(
        "[offer-pdf] download failed",
        error instanceof Error ? error.message : "unknown error",
      )
      setState("error")
    } finally {
      restoreButtonFocus(buttonRef)
    }
  }

  return (
    <section
      aria-labelledby="offer-pdf-title"
      className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange-text)]">
            PDF
          </p>
          <h2
            id="offer-pdf-title"
            className="mt-2 font-[family-name:var(--font-outfit)] text-xl font-semibold text-[var(--brand-black)]"
          >
            {ro ? "Păstrează o copie a selecției" : "Keep a copy of your selection"}
          </h2>
          <p
            id="offer-pdf-helper"
            className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]"
          >
            {ro
              ? "Include cantitățile curente, fotografiile, prețurile și personalizările salvate. Prețurile sunt orientative. Descărcarea nu trimite cererea."
              : "Includes current quantities, photos, prices, and saved personalization. Prices are indicative. Downloading does not send your request."}
          </p>
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={downloadPdf}
          disabled={state === "loading" || items.length === 0}
          aria-busy={state === "loading"}
          aria-describedby="offer-pdf-helper"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border-2 border-[var(--brand-orange-focus)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:border-[var(--brand-orange)] hover:bg-[var(--brand-orange)] disabled:cursor-wait disabled:opacity-60"
        >
          <DownloadIcon />
          <span>
            {state === "loading"
              ? ro
                ? "Pregătim PDF-ul…"
                : "Preparing PDF…"
              : ro
                ? "Descarcă selecția (PDF)"
                : "Download selection (PDF)"}
          </span>
        </button>
      </div>

      <details className="mt-4 border-t border-[var(--border-soft)] pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--brand-orange-text)]">
          {ro
            ? "Adaugă o notă în PDF (opțional)"
            : "Add a note to the PDF (optional)"}
        </summary>
        <div className="mt-3">
          <label
            htmlFor="offer-pdf-notes"
            className="text-sm font-medium text-[var(--brand-black)]"
          >
            {ro ? "Notă" : "Note"}
          </label>
          <textarea
            id="offer-pdf-notes"
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              if (state !== "loading") setState("idle")
            }}
            maxLength={MAX_OFFER_PDF_NOTES_CHARS}
            rows={4}
            aria-invalid={state === "unsupported-notes"}
            aria-describedby={`offer-pdf-note-help offer-pdf-note-count${
              state === "unsupported-notes" ? " offer-pdf-note-error" : ""
            }`}
            placeholder={
              ro
                ? "Ex.: ambalare individuală, culori preferate sau detalii pentru prezentare…"
                : "E.g. individual packaging, preferred colours, or presentation details…"
            }
            className="mt-2 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--brand-black)] outline-none transition-shadow placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[var(--brand-orange-focus)]"
          />
          <div className="mt-2 flex flex-col gap-1 text-xs text-[var(--text-muted)] sm:flex-row sm:items-start sm:justify-between">
            <p id="offer-pdf-note-help" className="max-w-xl leading-relaxed">
              {ro
                ? "Această notă este inclusă doar în PDF. Nu este trimisă către TGV-Media odată cu cererea de ofertă."
                : "This note is included only in the PDF. It is not sent to TGV-Media with your quote request."}
            </p>
            <p id="offer-pdf-note-count" className="shrink-0 tabular-nums">
              {notes.length}/{MAX_OFFER_PDF_NOTES_CHARS}
            </p>
          </div>
        </div>
      </details>

      {state === "success" ? (
        <p className="mt-4 text-sm font-medium text-[var(--text-soft)]" role="status" aria-live="polite">
          {ro
            ? "PDF-ul a fost descărcat. Cererea nu a fost trimisă."
            : "PDF downloaded. Your request has not been sent."}
        </p>
      ) : null}
      {state === "stale" ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {ro
            ? "Selecția sau nota s-a modificat cât timp pregăteam PDF-ul. Descarcă din nou versiunea actualizată."
            : "Your selection or note changed while the PDF was being prepared. Download the updated version again."}
        </p>
      ) : null}
      {state === "rate-limited" ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {ro
            ? "Ai generat mai multe PDF-uri într-un timp scurt. Așteaptă câteva minute și încearcă din nou."
            : "You generated several PDFs in a short time. Wait a few minutes and try again."}
        </p>
      ) : null}
      {state === "busy" ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {ro
            ? "Serviciul PDF este ocupat momentan. Așteaptă puțin și încearcă din nou."
            : "The PDF service is busy right now. Wait a moment and try again."}
        </p>
      ) : null}
      {state === "unsupported-notes" ? (
        <p
          id="offer-pdf-note-error"
          className="mt-4 text-sm font-medium text-red-700"
          role="alert"
        >
          {ro
            ? "Nota conține caractere pe care PDF-ul nu le poate reda. Folosește litere latine, inclusiv diacritice românești, cifre și semne de punctuație obișnuite."
            : "The note contains characters the PDF cannot render. Use Latin letters, including Romanian diacritics, numbers, and common punctuation."}
        </p>
      ) : null}
      {state === "error" ? (
        <p className="mt-4 text-sm font-medium text-red-700" role="alert">
          {ro
            ? "Nu am putut genera PDF-ul. Selecția și nota au rămas neschimbate. Încearcă din nou."
            : "We couldn’t create the PDF. Your selection and note are unchanged. Try again."}
        </p>
      ) : null}
    </section>
  )
}

function responseFilename(response: Response, locale: "ro" | "en"): string {
  const disposition = response.headers.get("content-disposition") ?? ""
  const match = /filename="([A-Za-z0-9._-]+)"/.exec(disposition)
  if (match?.[1]) return match[1]
  const date = formatOfferPdfFilenameDate(new Date().toISOString())
  return locale === "ro"
    ? `tgv-media-selectie-${date}.pdf`
    : `tgv-media-selection-${date}.pdf`
}

function requestSignature(
  items: readonly OfferItem[],
  locale: "ro" | "en",
  notes: string,
): string {
  return JSON.stringify({ items, locale, notes })
}

async function requestOfferPdf(body: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_BUSY_RETRIES; attempt += 1) {
    const response = await fetch("/api/offer-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    if (response.status !== 503 || attempt === MAX_BUSY_RETRIES) {
      return response
    }

    await response.arrayBuffer()
    await wait(retryAfterMilliseconds(response.headers.get("retry-after")))
  }
  throw new Error("PDF retry loop ended unexpectedly")
}

function retryAfterMilliseconds(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1_000
  return Math.min(10_000, Math.max(250, Number(value) * 1_000))
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function restoreButtonFocus(
  buttonRef: Readonly<{ current: HTMLButtonElement | null }>,
): void {
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      const active = document.activeElement
      if (
        active === document.body ||
        active === null ||
        active === buttonRef.current
      ) {
        buttonRef.current?.focus({ preventScroll: true })
      }
    }, 0)
  })
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}
