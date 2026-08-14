import Link from "next/link"
import LocalizedText from "@/components/LocalizedText"

export default function PricingCalculatorCallout() {
  return (
    <aside className="group relative overflow-hidden rounded-3xl border border-[var(--brand-orange)]/25 bg-[var(--surface-soft)] p-6 lg:p-7">
      <span
        aria-hidden="true"
        className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--brand-orange)]/10 transition-transform duration-500 group-hover:scale-110"
      />

      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-orange)] text-white shadow-sm">
          <CalculatorIcon />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
            <LocalizedText en="Plan your budget" ro="Planifică bugetul" />
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-outfit)] text-xl font-semibold leading-tight text-[var(--brand-black)] lg:text-2xl">
            <LocalizedText
              en="Need a starting estimate?"
              ro="Ai nevoie de o estimare inițială?"
            />
          </h2>
        </div>
      </div>

      <p className="relative mt-4 text-sm leading-relaxed text-[var(--text-soft)]">
        <LocalizedText
          en="Calculate an indicative personalisation price, then return here when you are ready for a final quote."
          ro="Calculează un preț orientativ pentru personalizare, apoi revino aici când ești pregătit pentru oferta finală."
        />
      </p>

      <Link
        href="/pricing"
        className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-black)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--brand-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-orange)] focus-visible:ring-offset-2"
      >
        <LocalizedText en="Open price calculator" ro="Deschide calculatorul de preț" />
        <ArrowIcon />
      </Link>
    </aside>
  )
}

function CalculatorIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8v4H8z" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}
