import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import LocalizedText from "@/components/LocalizedText"
import SearchSortSelect from "@/components/SearchSortSelect"
import StockBadge from "@/components/StockBadge"
import { searchCatalog } from "@/lib/search/catalogSearch.server"
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_PAGE_SIZE } from "@/lib/search/fuseConfig"
import { normalizeSearchSort, type SearchSort } from "@/lib/search/sorting"
import type { SearchResult } from "@/lib/search/types"

export const metadata: Metadata = {
  title: "Search products — TGV-Media",
  description: "Search the TGV-Media catalog by product name, code, brand, or category.",
}

interface SearchPageProps {
  readonly searchParams: Promise<{ q?: string; page?: string; sort?: string }>
}

function pageNumber(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function pageHref(query: string, page: number, sort: SearchSort): string {
  const params = new URLSearchParams({ q: query })
  if (sort !== "relevance") params.set("sort", sort)
  if (page > 1) params.set("page", String(page))
  return `/search?${params.toString()}`
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function ResultCard({ result }: Readonly<{ result: SearchResult }>) {
  const href = `/catalog/${result.category}/${result.slug}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]">
      <Link
        href={href}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-orange)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--border-soft)] bg-white">
          {result.thumbnail ? (
            <Image
              src={result.thumbnail}
              alt={result.name}
              fill
              sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-contain transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--surface-soft)]" aria-hidden="true" />
          )}
          <div className="absolute left-3 top-3">
            <StockBadge level={result.stockLevel} />
          </div>
        </div>

        <div className="flex grow flex-col gap-2 p-4">
          <p className="text-xs font-medium text-[var(--text-muted)] line-clamp-1">
            {result.categoryLabel}
          </p>
          <h2 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)] line-clamp-2">
            {result.name}
          </h2>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <LocalizedText en="Code" ro="Cod" /> {result.supplierSku}
          </p>
          <div className="mt-auto flex items-baseline gap-2 pt-3">
            {result.priceFrom ? (
              <span className="text-xs text-[var(--text-muted)]">
                <LocalizedText en="from" ro="de la" />
              </span>
            ) : null}
            <span className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {formatPrice(result.price)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              <LocalizedText en="ex. VAT" ro="fără TVA" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const requestedPage = pageNumber(params.page)
  const sort = normalizeSearchSort(params.sort)
  const initialSearch = searchCatalog(params.q ?? "", {
    limit: SEARCH_PAGE_SIZE,
    sort,
  })
  const totalPages = Math.max(1, Math.ceil(initialSearch.total / SEARCH_PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const search =
    currentPage === 1
      ? initialSearch
      : searchCatalog(params.q ?? "", {
          limit: SEARCH_PAGE_SIZE,
          offset: (currentPage - 1) * SEARCH_PAGE_SIZE,
          sort,
        })
  const query = search.query

  return (
    <main className="mx-auto min-h-[60vh] max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        <LocalizedText en="Catalog search" ro="Căutare în catalog" />
      </p>
      <h1 className="mt-3 text-4xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)] sm:text-5xl">
        <LocalizedText en="Find the right product" ro="Găsește produsul potrivit" />
      </h1>

      <form action="/search" method="get" role="search" className="mt-8 flex max-w-3xl gap-3">
        <label htmlFor="catalog-search" className="sr-only">
          <LocalizedText en="Search products" ro="Caută produse" />
        </label>
        <input
          id="catalog-search"
          name="q"
          type="search"
          defaultValue={query}
          minLength={2}
          maxLength={SEARCH_MAX_QUERY_LENGTH}
          required
          autoFocus={!query}
          placeholder="Product name, code, brand, or category"
          className="min-w-0 grow rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--brand-black)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-[var(--brand-orange)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
        >
          <LocalizedText en="Search" ro="Caută" />
        </button>
      </form>

      {query.length < 2 ? (
        <p className="mt-10 text-[var(--text-soft)]">
          <LocalizedText
            en="Enter at least two characters to search the catalog."
            ro="Introdu cel puțin două caractere pentru a căuta în catalog."
          />
        </p>
      ) : search.total === 0 ? (
        <div className="mt-12 max-w-2xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-8">
          <h2 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            <LocalizedText en={`No results for “${query}”`} ro={`Niciun rezultat pentru „${query}”`} />
          </h2>
          <p className="mt-2 text-[var(--text-soft)]">
            <LocalizedText
              en="Try a product code, a shorter phrase, a brand, or a category."
              ro="Încearcă un cod de produs, o expresie mai scurtă, un brand sau o categorie."
            />
          </p>
        </div>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-soft)] pb-5">
            <div>
              <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                <LocalizedText en={`Results for “${query}”`} ro={`Rezultate pentru „${query}”`} />
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                <LocalizedText
                  en={`${search.total.toLocaleString("en-IE")} matching products`}
                  ro={`${search.total.toLocaleString("ro-RO")} produse găsite`}
                />
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <SearchSortSelect query={query} value={sort} />
              {totalPages > 1 ? (
                <p className="whitespace-nowrap text-sm text-[var(--text-muted)]">
                  <LocalizedText
                    en={`Page ${currentPage} of ${totalPages}`}
                    ro={`Pagina ${currentPage} din ${totalPages}`}
                  />
                </p>
              ) : null}
            </div>
          </div>

          <section aria-label="Search results" className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {search.results.map((result) => (
              <ResultCard key={`${result.category}/${result.slug}`} result={result} />
            ))}
          </section>

          {totalPages > 1 ? (
            <nav aria-label="Search result pages" className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-6">
              {currentPage > 1 ? (
                <Link
                  href={pageHref(query, currentPage - 1, sort)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:border-[var(--brand-orange)]"
                >
                  <LocalizedText en="← Previous" ro="← Înapoi" />
                </Link>
              ) : (
                <span />
              )}
              {currentPage < totalPages ? (
                <Link
                  href={pageHref(query, currentPage + 1, sort)}
                  className="rounded-xl bg-[var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <LocalizedText en="Next →" ro="Înainte →" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </main>
  )
}
