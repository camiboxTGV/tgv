"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/LanguageProvider"
import type { SearchSort } from "@/lib/search/sorting"

interface SearchSortSelectProps {
  query: string
  value: SearchSort
}

export default function SearchSortSelect({
  query,
  value,
}: Readonly<SearchSortSelectProps>) {
  const router = useRouter()
  const { locale } = useLanguage()
  const [isPending, startTransition] = useTransition()

  function changeSort(nextSort: SearchSort) {
    const params = new URLSearchParams({ q: query })
    if (nextSort !== "relevance") params.set("sort", nextSort)
    startTransition(() => router.push(`/search?${params.toString()}`))
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <span className="hidden sm:inline">
        {locale === "ro" ? "Sortează după" : "Sort by"}
      </span>
      <select
        aria-label={locale === "ro" ? "Sortează rezultatele" : "Sort results"}
        value={value}
        disabled={isPending}
        onChange={(event) => changeSort(event.target.value as SearchSort)}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--brand-black)] outline-none transition-colors focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/20 disabled:opacity-60"
      >
        <option value="relevance">
          {locale === "ro" ? "Relevanță" : "Relevance"}
        </option>
        <option value="price-asc">
          {locale === "ro" ? "Preț: crescător" : "Price: low to high"}
        </option>
        <option value="price-desc">
          {locale === "ro" ? "Preț: descrescător" : "Price: high to low"}
        </option>
        <option value="name-asc">
          {locale === "ro" ? "Nume: A–Z" : "Name: A–Z"}
        </option>
        <option value="availability">
          {locale === "ro" ? "În stoc mai întâi" : "In stock first"}
        </option>
      </select>
    </label>
  )
}
