"use client"

import type { ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/components/LanguageProvider"
import OfferSelectionError from "@/components/OfferSelectionError"
import { useOffer } from "@/components/OfferProvider"

export default function OfferContactGuard({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale } = useLanguage()
  const {
    items,
    hydrated,
    offerLoadError,
    resetInvalidOffer,
  } = useOffer()
  const fromOffer = searchParams?.get("from") === "offer"
  const legacyItemsParam = searchParams?.get("items") ?? null

  if (legacyItemsParam !== null) {
    return (
      <OfferSelectionError
        locale={locale}
        mode="invalid-url"
        recoveryHref={items.length > 0 ? "/contact?from=offer" : undefined}
      />
    )
  }

  if (!fromOffer) return children

  if (!hydrated) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-muted)] lg:p-8"
      >
        {locale === "ro" ? "Se încarcă oferta…" : "Loading your offer…"}
      </div>
    )
  }

  if (offerLoadError) {
    return (
      <OfferSelectionError
        locale={locale}
        mode="invalid-storage"
        onReset={() => {
          resetInvalidOffer()
          router.push("/offer")
        }}
      />
    )
  }

  if (items.length === 0) {
    return <OfferSelectionError locale={locale} mode="empty" />
  }

  return children
}
