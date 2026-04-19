"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOffer } from "@/components/OfferProvider"

const HIDDEN_ROUTES = ["/contact", "/offer"]

export default function OfferDock() {
  const { count, hydrated } = useOffer()
  const pathname = usePathname()

  if (!hydrated) return null
  if (HIDDEN_ROUTES.some((r) => pathname?.startsWith(r))) return null

  if (count === 0) {
    return (
      <Link
        href="/catalog"
        className="hidden sm:inline-flex fixed right-6 bottom-6 z-40 items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--text-soft)] bg-[var(--surface)]/90 backdrop-blur border border-[var(--border)] rounded-full shadow-lg hover:text-[var(--brand-black)] hover:border-[var(--border-strong)] transition-colors"
      >
        <span>Browse catalog</span>
        <span aria-hidden="true">→</span>
      </Link>
    )
  }

  return (
    <Link
      href="/offer"
      className="inline-flex fixed right-6 bottom-6 z-40 items-center gap-3 px-5 py-3 text-sm font-semibold text-white bg-[var(--brand-orange)] rounded-full shadow-xl hover:scale-[1.02] transition-transform"
    >
      <span className="inline-flex items-center justify-center w-6 h-6 text-xs text-[var(--brand-orange)] bg-white rounded-full">
        {count}
      </span>
      <span>Build my offer</span>
      <span aria-hidden="true">→</span>
    </Link>
  )
}
