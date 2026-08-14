"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioItem,
} from "@/lib/content/portfolio"
import { useLanguage } from "@/components/LanguageProvider"
import {
  PORTFOLIO_LABELS_RO,
  localizePortfolioItem,
} from "@/lib/i18n/content"

interface Props {
  items: PortfolioItem[]
}

export default function HomeProjectCarousel({ items }: Readonly<Props>) {
  const { locale } = useLanguage()
  const [active, setActive] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)

  const moveTo = useCallback(
    (next: number) => {
      const index = (next + items.length) % items.length
      const viewport = viewportRef.current
      const card = viewport?.querySelector<HTMLElement>("[data-carousel-card]")
      if (viewport && card) {
        const gap = 16
        viewport.scrollTo({ left: index * (card.offsetWidth + gap), behavior: "smooth" })
      }
      setActive(index)
    },
    [items.length],
  )

  useEffect(() => {
    if (items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % items.length
        const viewport = viewportRef.current
        const card = viewport?.querySelector<HTMLElement>("[data-carousel-card]")
        if (viewport && card) {
          viewport.scrollTo({
            left: next * (card.offsetWidth + 16),
            behavior: "smooth",
          })
        }
        return next
      })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [items.length])

  return (
    <section
      aria-label={locale === "ro" ? "Proiecte custom selectate" : "Selected custom projects"}
      className="pb-10 lg:pb-14"
    >
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {locale === "ro" ? "Din atelierul nostru" : "From our production floor"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveTo(active - 1)}
              aria-label={locale === "ro" ? "Proiectul anterior" : "Previous project"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-black)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange)]"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => moveTo(active + 1)}
              aria-label={locale === "ro" ? "Proiectul următor" : "Next project"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--brand-black)] transition-colors hover:border-[var(--brand-orange)] hover:text-[var(--brand-orange)]"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          tabIndex={0}
          role="group"
          aria-label={locale === "ro" ? "Galerie de proiecte" : "Project slides"}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => {
            const localized = localizePortfolioItem(item, locale)
            return (
            <article
              key={item.slug}
              data-carousel-card
              className="relative min-w-[82%] snap-start overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--brand-black)] sm:min-w-[48%] lg:min-w-[31.8%]"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={item.image}
                  alt={localized.imageAlt}
                  fill
                  priority={index < 3}
                  sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 31vw"
                  className="object-cover transition-transform duration-700 hover:scale-[1.025]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[var(--brand-black)] p-5 text-white">
                  <p className="inline-flex rounded-full bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                    {locale === "ro"
                      ? PORTFOLIO_LABELS_RO[item.category]
                      : PORTFOLIO_CATEGORY_LABELS[item.category]}
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-outfit)] text-lg font-semibold">
                    {localized.title}
                  </h2>
                </div>
              </div>
            </article>
            )
          })}
        </div>

        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={item.slug}
              className={`h-1.5 rounded-full transition-all ${
                active === index
                  ? "w-6 bg-[var(--brand-orange)]"
                  : "w-1.5 bg-[var(--border-strong)]"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
