"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioCategory,
  type PortfolioItem,
} from "@/lib/content/portfolio"

interface Props {
  items: PortfolioItem[]
}

type Filter = "all" | PortfolioCategory

export default function PortfolioGallery({ items }: Props) {
  const [filter, setFilter] = useState<Filter>("all")

  const presentCategories = useMemo(() => {
    const set = new Set<PortfolioCategory>()
    for (const i of items) set.add(i.category)
    return Array.from(set)
  }, [items])

  const visible = useMemo(
    () =>
      filter === "all" ? items : items.filter((i) => i.category === filter),
    [items, filter],
  )

  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-2 pb-6 max-w-6xl">
        <div className="flex items-center gap-2 overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
          <FilterChip
            label="All work"
            count={items.length}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {presentCategories.map((c) => (
            <FilterChip
              key={c}
              label={PORTFOLIO_CATEGORY_LABELS[c]}
              count={items.filter((i) => i.category === c).length}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((item) => (
            <PortfolioCard key={item.slug} item={item} />
          ))}
        </div>
        {visible.length === 0 && (
          <div className="flex flex-col items-start gap-3 p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <p className="text-sm text-[var(--text-muted)]">
              No projects in this category yet.
            </p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
            >
              <span>Show all work</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </section>

      <section className="bg-[var(--brand-black)]">
        <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
            See something close to your project?
          </h2>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
            Send us the brief and reference. We'll come back with a quote, a
            sample plan and a production timeline within one business day.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            Start a project
          </Link>
        </div>
      </section>
    </>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border whitespace-nowrap transition-all ${
        active
          ? "text-white bg-[var(--brand-orange)] border-[var(--brand-orange)]"
          : "text-[var(--text-soft)] bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-xs ${
          active ? "text-white/80" : "text-[var(--text-muted)]"
        }`}
      >
        {count}
      </span>
    </button>
  )
}

function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <article className="group flex flex-col gap-3">
      <div className="relative overflow-hidden aspect-video rounded-2xl border border-[var(--border)]">
        {/* Inline style: data-driven gradient placeholder from PortfolioItem.accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: item.accent }}
        />
        <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-white bg-black/35 backdrop-blur-sm rounded-full">
          {PORTFOLIO_CATEGORY_LABELS[item.category]}
        </span>
      </div>
      <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        {item.title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
        {item.summary}
      </p>
    </article>
  )
}
