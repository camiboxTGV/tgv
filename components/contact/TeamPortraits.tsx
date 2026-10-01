"use client"

import { useLanguage } from "@/components/LanguageProvider"
import TeamPhotoGrid from "@/components/TeamPhotoGrid"

export default function TeamPortraits() {
  const { locale } = useLanguage()
  const ro = locale === "ro"
  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
              {ro ? "Echipa" : "The team"}
            </p>
          </div>
          <h2
            id="team-heading"
            className="mt-5 text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
          >
            {ro ? "Cunoaște oamenii din spatele proiectelor." : "Meet the people behind the work."}
          </h2>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-[var(--text-soft)]">
          {ro
            ? "Idei, măiestrie în producție și atenție la detalii — reunite în atelierul nostru din București."
            : "Ideas, production craft and close attention to detail — brought together under one roof in our Bucharest studio."}
        </p>
      </div>

      <TeamPhotoGrid />
    </section>
  )
}
