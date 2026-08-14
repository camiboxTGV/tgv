"use client"

import { useLanguage } from "@/components/LanguageProvider"

export default function LanguageSwitch({
  mobile = false,
}: Readonly<{ mobile?: boolean }>) {
  const { locale, setLocale } = useLanguage()

  return (
    <div
      role="group"
      aria-label={locale === "ro" ? "Selectarea limbii" : "Language selection"}
      className={`inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 ${
        mobile ? "self-start" : "shrink-0"
      }`}
    >
      {(["ro", "en"] as const).map((option) => {
        const active = locale === option
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            aria-label={option === "ro" ? "Română" : "English"}
            className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "bg-[var(--brand-orange)] text-white"
                : "text-[var(--text-muted)] hover:text-[var(--brand-orange)]"
            }`}
          >
            {option.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
