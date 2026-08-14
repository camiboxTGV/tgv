"use client"

import { useLanguage } from "@/components/LanguageProvider"
import type { Technique } from "@/lib/content/techniques"
import { localizeTechnique } from "@/lib/i18n/content"

export default function TechniqueGrid({
  techniques,
}: Readonly<{ techniques: Technique[] }>) {
  const { locale } = useLanguage()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {techniques.map((technique, index) => {
        const localized = localizeTechnique(technique, locale)
        return (
          <article
            key={technique.slug}
            id={technique.slug}
            className="flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <span className="text-xs font-semibold tracking-widest text-[var(--brand-orange)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {localized.title}
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--brand-orange)]">
                {localized.bestFor}
              </p>
            </div>
            <div className="space-y-3 border-t border-[var(--border-soft)] pt-4">
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                <span className="font-semibold text-[var(--brand-black)]">
                  {locale === "ro" ? "Ce este: " : "What it is: "}
                </span>
                {localized.whatItIs}
              </p>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                <span className="font-semibold text-[var(--brand-black)]">
                  {locale === "ro" ? "Aplicații: " : "Applications: "}
                </span>
                {localized.applications}
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
