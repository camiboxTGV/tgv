"use client"

import Link from "next/link"

type ErrorMode = "invalid-storage" | "invalid-url" | "empty"

interface Props {
  locale: "ro" | "en"
  mode: ErrorMode
  onReset?: () => void
  recoveryHref?: string
  showBackToOffer?: boolean
}

export default function OfferSelectionError({
  locale,
  mode,
  onReset,
  recoveryHref,
  showBackToOffer = true,
}: Readonly<Props>) {
  const ro = locale === "ro"
  const title =
    mode === "invalid-url"
      ? ro
        ? "Linkurile vechi de ofertă nu mai sunt acceptate."
        : "Older offer links are no longer supported."
      : mode === "invalid-storage"
        ? ro
          ? "Oferta salvată nu poate fi citită complet."
          : "Your saved offer cannot be read completely."
        : ro
          ? "Oferta nu conține produse."
          : "Your offer does not contain any products."

  return (
    <div
      role="alert"
      className="rounded-3xl border border-[var(--brand-orange)]/40 bg-[var(--surface)] p-6 lg:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
        {ro ? "Selecția necesită atenție" : "Selection needs attention"}
      </p>
      <h2 className="mt-3 text-2xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-soft)]">
        {mode === "empty"
          ? ro
            ? "Adaugă cel puțin un produs înainte de a continua la datele de contact. Nu a fost trimisă nicio cerere."
            : "Add at least one product before continuing to contact details. No request has been submitted."
          : ro
            ? "Am oprit formularul pentru a nu omite produse sau opțiuni fără să te avertizăm. Nu a fost trimisă nicio cerere."
            : "We paused the form so products or options are never omitted without warning. No request has been submitted."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {recoveryHref ? (
          <Link
            href={recoveryHref}
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {ro ? "Folosește oferta salvată" : "Use saved offer"}
          </Link>
        ) : null}
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {ro ? "Refă oferta" : "Rebuild offer"}
          </button>
        ) : null}
        {!recoveryHref && !onReset ? (
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {ro ? "Alege produse" : "Choose products"}
          </Link>
        ) : null}
        {showBackToOffer ? (
          <Link
            href="/offer"
            className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)]"
          >
            {ro ? "Înapoi la ofertă" : "Back to offer"}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
