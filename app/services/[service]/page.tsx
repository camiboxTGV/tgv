import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  type Service,
  getServiceBySlug,
  serviceSlugs,
  services,
} from "@/lib/content/services"

interface PageProps {
  params: Promise<{ service: string }>
}

export function generateStaticParams() {
  return serviceSlugs.map((service) => ({ service }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) return { title: "Service — TGV-Media" }
  return {
    title: `${service.title} — TGV-Media`,
    description: service.summary,
  }
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { service: slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) notFound()

  const related = services.filter((s) => s.slug !== service.slug)

  return (
    <>
      <Breadcrumbs title={service.title} />
      <Hero service={service} />
      {service.techniques && <Techniques service={service} />}
      <UseCases service={service} />
      <CtaPanel />
      <Related services={related} />
    </>
  )
}

function Breadcrumbs({ title }: { title: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto px-6 lg:px-8 pt-10 max-w-6xl"
    >
      <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <li>
          <Link
            href="/"
            className="hover:text-[var(--brand-black)] transition-colors"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link
            href="/services"
            className="hover:text-[var(--brand-black)] transition-colors"
          >
            Services
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-[var(--text-soft)]">{title}</li>
      </ol>
    </nav>
  )
}

function Hero({ service }: { service: Service }) {
  return (
    <section className="relative mx-auto px-6 lg:px-8 pt-8 pb-12 lg:pt-12 lg:pb-16 max-w-6xl overflow-hidden">
      {/* Inline style: data-driven gradient accent block from Service.accent */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-48 h-48 lg:w-72 lg:h-72 rounded-full blur-3xl opacity-20"
        style={{ background: service.accent }}
      />
      <p className="relative text-sm font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
        Service
      </p>
      <h1 className="relative mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
        {service.title}
      </h1>
      <p className="relative mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
        {service.lead}
      </p>
      <div className="relative flex flex-col sm:flex-row gap-3 mt-10">
        <Link
          href="/contact"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
        >
          Start a project
        </Link>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
        >
          Browse catalog
        </Link>
      </div>
    </section>
  )
}

function Techniques({ service }: { service: Service }) {
  if (!service.techniques) return null
  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Capabilities
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          Four techniques, matched to your substrate.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
          {service.techniques.map((t) => (
            <article
              key={t.slug}
              className="flex flex-col gap-2 p-6 bg-[var(--surface-soft)] border border-transparent hover:border-[var(--border)] rounded-xl transition-colors"
            >
              <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {t.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {t.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCases({ service }: { service: Service }) {
  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        Where we apply it
      </p>
      <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        Use cases.
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
        {service.useCases.map((useCase) => (
          <li
            key={useCase}
            className="flex items-start gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
          >
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center mt-0.5 w-5 h-5 text-[var(--brand-orange)] bg-[var(--surface-soft)] rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm text-[var(--text-soft)] leading-relaxed">
              {useCase}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CtaPanel() {
  return (
    <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
      <div className="relative flex flex-col items-start p-8 lg:p-12 bg-[var(--brand-black)] rounded-3xl overflow-hidden">
        <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
        <h2 className="mt-6 max-w-2xl text-2xl sm:text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
          Have artwork? Send it across.
        </h2>
        <p className="mt-4 max-w-xl text-base text-white/70 leading-relaxed">
          We'll review the file, recommend the right technique and come back
          with a quote and sample plan.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
        >
          Start a project
        </Link>
      </div>
    </section>
  )
}

function Related({ services: related }: { services: Service[] }) {
  return (
    <section className="bg-[var(--surface)] border-t border-[var(--border-soft)]">
      <div className="mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Other services
        </p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          Explore the rest of what we do.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {related.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="group relative flex flex-col gap-2 p-5 bg-[var(--surface-soft)] border border-transparent hover:border-[var(--border)] rounded-xl overflow-hidden transition-colors"
            >
              {/* Inline style: data-driven gradient accent strip from Service.accent */}
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 w-1 h-full"
                style={{ background: s.accent }}
              />
              <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {s.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                {s.summary}
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[var(--brand-orange)] group-hover:gap-2 transition-all">
                <span>View service</span>
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
