"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { SearchResponse, SearchResult } from "@/lib/search/types"

type Status = "idle" | "loading" | "ready" | "error"

interface SearchBoxProps {
  className?: string
  onNavigate?: () => void
}

function highlight(
  text: string,
  ranges: ReadonlyArray<readonly [number, number]>,
): ReactNode {
  if (!ranges.length) return text
  const sorted = [...ranges].sort((a, b) => a[0] - b[0])
  const out: ReactNode[] = []
  let cursor = 0
  for (const [start, end] of sorted) {
    if (start < cursor) continue
    if (start > cursor) out.push(text.slice(cursor, start))
    out.push(
      <mark
        key={start}
        className="bg-[var(--brand-orange)]/20 text-[var(--brand-black)] rounded-sm"
      >
        {text.slice(start, end + 1)}
      </mark>,
    )
    cursor = end + 1
  }
  if (cursor < text.length) out.push(text.slice(cursor))
  return <>{out}</>
}

export default function SearchBox({ className, onNavigate }: SearchBoxProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>("idle")
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current)
    if (trimmed.length < 2) {
      abortRef.current?.abort()
      setResults([])
      setStatus("idle")
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      loadingDelayRef.current = setTimeout(() => {
        setStatus("loading")
        setIsOpen(true)
      }, 200)
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`)
          return res.json() as Promise<SearchResponse>
        })
        .then((data) => {
          if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current)
          setResults(data.results)
          setStatus("ready")
          setIsOpen(true)
          setActiveIndex(-1)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return
          if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current)
          setResults([])
          setStatus("error")
          setIsOpen(true)
        })
    }, 150)
  }, [query])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current)
    }
  }, [])

  function navigate(result: SearchResult) {
    router.push(`/catalog/${result.category}/${result.slug}`)
    setIsOpen(false)
    setQuery("")
    setActiveIndex(-1)
    onNavigate?.()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (results.length === 0) return
      setIsOpen(true)
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault()
        navigate(results[activeIndex])
      } else if (results.length === 1) {
        e.preventDefault()
        navigate(results[0])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="search-listbox"
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `search-opt-${activeIndex}` : undefined
        }
        placeholder="Search products…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length || status === "error") setIsOpen(true)
        }}
        onKeyDown={onKeyDown}
        className="px-4 py-2.5 w-full text-sm text-[var(--brand-black)] placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border border-transparent rounded-xl outline-none transition-colors focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand-orange)]"
      />
      {isOpen && (
        <ul
          id="search-listbox"
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 mt-2 max-h-96 overflow-y-auto bg-[var(--surface)] border border-[var(--border-soft)] rounded-xl shadow-lg"
        >
          {status === "loading" && (
            <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
              Searching…
            </li>
          )}
          {status === "ready" && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
              No matches for &ldquo;{query}&rdquo;
            </li>
          )}
          {status === "error" && (
            <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
              Search unavailable. Try again in a moment.
            </li>
          )}
          {results.map((r, i) => (
            <li
              key={r.slug}
              id={`search-opt-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                navigate(r)
              }}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                i === activeIndex ? "bg-[var(--surface-soft)]" : ""
              }`}
            >
              {r.thumbnail ? (
                <img
                  src={r.thumbnail}
                  alt=""
                  loading="lazy"
                  className="shrink-0 w-12 h-12 rounded-md object-cover bg-[var(--surface-soft)]"
                />
              ) : (
                <div className="shrink-0 w-12 h-12 rounded-md bg-[var(--surface-soft)]" />
              )}
              <div className="flex flex-col min-w-0 grow">
                <span className="text-sm font-medium text-[var(--brand-black)] truncate">
                  {highlight(r.name, r.matches)}
                </span>
                <span className="text-xs text-[var(--text-muted)] truncate">
                  {r.categoryLabel}
                </span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--brand-orange)]">
                {r.priceFrom ? "from " : ""}
                {r.price.toFixed(2)} €
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
