"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useOffer } from "@/components/OfferProvider"
import { getCategoryBySlugPath, getTopCategories } from "@/lib/content/catalog"
import { lineKey, serializeForUrl } from "@/lib/offer/storage"

export default function OfferPage() {
  const { items, count, totalQuantity, hydrated, remove, setLineQuantity, clear } =
    useOffer()
  const router = useRouter()

  const goToBrief = () => {
    const encoded = serializeForUrl(items)
    router.push(`/contact?from=offer&items=${encoded}`)
  }

  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-8 lg:pt-28 lg:pb-12 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Your offer
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Build the brief.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          Adjust quantities, remove what no longer fits, then send the brief.
          We'll come back with a quote and a sample plan.
        </p>
      </section>

      {!hydrated ? (
        <section className="mx-auto px-6 lg:px-8 pb-24 max-w-4xl">
          <div className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-sm text-[var(--text-muted)]">
            Loading your offer…
          </div>
        </section>
      ) : count === 0 ? (
        <EmptyState />
      ) : (
        <section className="mx-auto px-6 lg:px-8 pb-24 max-w-4xl">
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const category = getCategoryBySlugPath(item.category)
              const key = lineKey(item)
              const variantLabel = [item.colorName, item.sizeLabel]
                .filter(Boolean)
                .join(" · ")
              return (
                <li
                  key={key}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)] truncate">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {category?.name ?? item.category}
                      {variantLabel ? (
                        <>
                          {" · "}
                          <span className="text-[var(--text-soft)] font-medium">
                            {variantLabel}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <QtyControl
                      value={item.quantity}
                      onChange={(n) => setLineQuantity(key, n)}
                    />
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      aria-label={`Remove ${item.name}`}
                      className="inline-flex items-center justify-center w-9 h-9 text-[var(--text-muted)] hover:text-[var(--brand-orange)] bg-[var(--surface-soft)] hover:bg-[var(--surface)] border border-[var(--border-soft)] rounded-full transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 p-5 bg-[var(--surface-elevated)] rounded-2xl">
            <div className="text-sm text-[var(--text-soft)]">
              <span className="font-semibold text-[var(--brand-black)]">
                {count}
              </span>{" "}
              {count === 1 ? "product" : "products"} ·{" "}
              <span className="font-semibold text-[var(--brand-black)]">
                {totalQuantity}
              </span>{" "}
              total units
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-[var(--text-soft)] hover:text-[var(--brand-black)] bg-transparent transition-colors"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={goToBrief}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[var(--brand-orange)] rounded-full hover:scale-[1.02] transition-transform"
              >
                <span>Continue to brief</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
            >
              <span aria-hidden="true">←</span>
              <span>Continue browsing the catalog</span>
            </Link>
          </div>
        </section>
      )}
    </>
  )
}

function EmptyState() {
  return (
    <section className="mx-auto px-6 lg:px-8 pb-24 max-w-4xl">
      <div className="flex flex-col items-start gap-6 p-8 lg:p-12 bg-[var(--surface)] border border-[var(--border)] rounded-3xl">
        <span
          aria-hidden="true"
          className="block w-32 h-32 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-orange) 0%, var(--brand-black) 100%)",
            opacity: 0.18,
          }}
        />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            Your offer is empty.
          </h2>
          <p className="text-base text-[var(--text-soft)] leading-relaxed">
            Browse the catalog and add products you'd like to personalize. We'll
            come back with a quote based on your selection.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {getTopCategories().slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              href={`/catalog/${c.slug}`}
              className="flex items-center justify-between gap-3 p-4 bg-[var(--surface-soft)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] rounded-xl transition-colors"
            >
              <span className="text-sm font-medium text-[var(--brand-black)]">
                {c.name}
              </span>
              <span aria-hidden="true" className="text-[var(--brand-orange)]">
                →
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[var(--brand-orange)] rounded-full hover:scale-[1.02] transition-transform"
        >
          <span>Browse catalog</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

function QtyControl({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="inline-flex items-center bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className="inline-flex items-center justify-center w-9 h-9 text-[var(--text-soft)] hover:text-[var(--brand-orange)] transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={10000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Quantity"
        className="w-16 text-center text-sm font-semibold text-[var(--brand-black)] bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--brand-orange)] rounded-full"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="inline-flex items-center justify-center w-9 h-9 text-[var(--text-soft)] hover:text-[var(--brand-orange)] transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
