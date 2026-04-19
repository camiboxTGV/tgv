"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { onOfferAdded } from "@/components/OfferProvider"

interface Toast {
  id: number
  name: string
  totalCount: number
}

const DURATION_MS = 3000

export default function OfferToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const off = onOfferAdded(({ name, totalCount }) => {
      const id = Date.now() + Math.random()
      setToasts((prev) => [...prev, { id, name, totalCount }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, DURATION_MS)
    })
    return off
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col fixed bottom-24 left-1/2 -translate-x-1/2 z-50 gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 max-w-sm text-sm text-white bg-[var(--brand-black)] border border-white/10 rounded-full shadow-xl pointer-events-auto"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 text-[var(--brand-black)] bg-[var(--brand-orange)] rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="truncate">
            <span className="text-white/70">Added</span>{" "}
            <span className="font-medium">{t.name}</span>
          </span>
          <Link
            href="/offer"
            className="ml-2 text-xs font-semibold text-[var(--brand-orange)] hover:text-white transition-colors whitespace-nowrap"
          >
            View ({t.totalCount}) →
          </Link>
        </div>
      ))}
    </div>
  )
}
