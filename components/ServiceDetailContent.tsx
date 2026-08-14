"use client"

import Link from "next/link"
import { useLanguage } from "@/components/LanguageProvider"
import type { Service } from "@/lib/content/services"
import { localizeService } from "@/lib/i18n/content"

export default function ServiceDetailContent({
  service,
  related,
}: Readonly<{ service: Service; related: Service[] }>) {
  const { locale } = useLanguage()
  const localized = localizeService(service, locale)
  const ro = locale === "ro"

  return (
    <>
      <nav aria-label={ro ? "Navigare ierarhică" : "Breadcrumb"} className="mx-auto max-w-6xl px-6 pt-10 lg:px-8">
        <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <li><Link href="/" className="transition-colors hover:text-[var(--brand-black)]">{ro ? "Acasă" : "Home"}</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/services" className="transition-colors hover:text-[var(--brand-black)]">{ro ? "Servicii" : "Services"}</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-[var(--text-soft)]">{localized.title}</li>
        </ol>
      </nav>

      <section className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-12 pt-8 lg:px-8 lg:pb-16 lg:pt-12">
        <div aria-hidden="true" className="absolute right-0 top-0 h-48 w-48 rounded-full opacity-20 blur-3xl lg:h-72 lg:w-72" style={{ background: service.accent }} />
        <p className="relative text-sm font-semibold uppercase tracking-widest text-[var(--brand-orange)]">{ro ? "Serviciu" : "Service"}</p>
        <h1 className="relative mt-4 max-w-4xl font-[family-name:var(--font-outfit)] text-4xl font-bold leading-tight tracking-tight text-[var(--brand-black)] sm:text-5xl lg:text-6xl">{localized.title}</h1>
        <p className="relative mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-soft)]">{localized.lead}</p>
        <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/contact" className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]">{ro ? "Începe un proiect" : "Start a project"}</Link>
          <Link href="/catalog" className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:bg-[var(--surface-soft)]">{ro ? "Vezi catalogul" : "Browse catalog"}</Link>
        </div>
      </section>

      {localized.techniques ? (
        <section className="border-y border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">{ro ? "Capabilități" : "Capabilities"}</p>
            <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-2xl font-semibold text-[var(--brand-black)] sm:text-3xl lg:text-4xl">{ro ? "Patru tehnici, adaptate materialului tău." : "Four techniques, matched to your substrate."}</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              {localized.techniques.map((technique) => (
                <article key={technique.slug} className="flex flex-col gap-2 rounded-xl border border-transparent bg-[var(--surface-soft)] p-6 transition-colors hover:border-[var(--border)]">
                  <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-[var(--brand-black)]">{technique.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-soft)]">{technique.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">{ro ? "Unde îl aplicăm" : "Where we apply it"}</p>
        <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-2xl font-semibold text-[var(--brand-black)] sm:text-3xl lg:text-4xl">{ro ? "Exemple de utilizare." : "Use cases."}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          {localized.useCases.map((useCase) => (
            <li key={useCase} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--brand-orange)]">✓</span>
              <span className="text-sm leading-relaxed text-[var(--text-soft)]">{useCase}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 lg:px-8 lg:pb-24">
        <div className="relative flex flex-col items-start overflow-hidden rounded-3xl bg-[var(--brand-black)] p-8 lg:p-12">
          <span className="block h-1 w-16 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-outfit)] text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">{ro ? "Ai grafica pregătită? Trimite-ne-o." : "Have artwork? Send it across."}</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">{ro ? "Verificăm fișierul, recomandăm tehnica potrivită și revenim cu o ofertă și un plan de mostre." : "We'll review the file, recommend the right technique and come back with a quote and sample plan."}</p>
          <Link href="/contact" className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]">{ro ? "Începe un proiect" : "Start a project"}</Link>
        </div>
      </section>

      <section className="border-t border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">{ro ? "Alte servicii" : "Other services"}</p>
          <h2 className="mt-3 font-[family-name:var(--font-outfit)] text-2xl font-semibold text-[var(--brand-black)] sm:text-3xl">{ro ? "Explorează și celelalte servicii." : "Explore the rest of what we do."}</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {related.map((candidate) => {
              const item = localizeService(candidate, locale)
              return (
                <Link key={candidate.slug} href={`/services/${candidate.slug}`} className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-transparent bg-[var(--surface-soft)] p-5 transition-colors hover:border-[var(--border)]">
                  <span aria-hidden="true" className="absolute left-0 top-0 h-full w-1" style={{ background: candidate.accent }} />
                  <h3 className="font-[family-name:var(--font-outfit)] text-base font-semibold text-[var(--brand-black)]">{item.title}</h3>
                  <p className="line-clamp-2 text-sm text-[var(--text-muted)]">{item.summary}</p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-orange)] transition-all group-hover:gap-2">{ro ? "Vezi serviciul" : "View service"} <span aria-hidden="true">→</span></span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
