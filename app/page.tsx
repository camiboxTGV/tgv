import Link from "next/link"
import ServiceCard from "@/components/ServiceCard"
import { services } from "@/lib/content/services"
import { techniques } from "@/lib/content/techniques"
import { featuredPortfolio } from "@/lib/content/portfolio"

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBand />
      <ServicesPreview />
      <TechniquesStrip />
      <FeaturedWork />
      <ClosingCTA />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col items-start mx-auto px-6 lg:px-8 pt-20 pb-16 lg:pt-32 lg:pb-24 max-w-6xl">
        <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]" />
          <span>9 in-house techniques</span>
        </span>
        <h1 className="mt-6 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Custom production.{" "}
          <span className="text-[var(--brand-orange)]">Nine</span> techniques.
          One workflow.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          From single-piece samples to ten-thousand-unit runs. We design,
          decorate and dispatch — across apparel, print, signage and promo
          products — under one roof.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            Start a project
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            See our work
          </Link>
        </div>
      </div>
    </section>
  )
}

interface Pillar {
  title: string
  body: string
  icon: React.ReactNode
}

function TrustBand() {
  const pillars: Pillar[] = [
    {
      title: "From 1 to 10,000+",
      body:
        "Single-piece samples through high-volume production runs, with the same attention at every quantity.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="14" width="14" height="6" rx="1" />
          <rect x="5" y="9" width="14" height="6" rx="1" />
          <rect x="7" y="4" width="14" height="6" rx="1" />
        </svg>
      ),
    },
    {
      title: "Nine in-house techniques",
      body:
        "Screen, DTF, embroidery, UV, pad, laser, sublimation, large-format and offset — under one roof.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="6" cy="6" r="1.4" />
          <circle cx="12" cy="6" r="1.4" />
          <circle cx="18" cy="6" r="1.4" />
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="18" cy="12" r="1.4" />
          <circle cx="6" cy="18" r="1.4" />
          <circle cx="12" cy="18" r="1.4" />
          <circle cx="18" cy="18" r="1.4" />
        </svg>
      ),
    },
    {
      title: "Coordinated multi-format",
      body:
        "Apparel, print, signage and promo produced together so brand output stays consistent across every touchpoint.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
          <path d="M11 7h2" />
          <path d="M7 11v2" />
          <path d="M17 11v2" />
          <path d="M11 17h2" />
        </svg>
      ),
    },
    {
      title: "Design to dispatch",
      body:
        "Artwork preparation, proofing and production handled in one workflow — no handoffs between vendors.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7l4-4 3 3-4 4z" />
          <path d="M7 6l4 4" />
          <path d="M9 12l-3 3" />
          <path d="M13 11l8 8" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
  ]

  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="flex flex-col gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 text-[var(--brand-orange)] bg-[var(--surface-soft)] rounded-xl">
              {pillar.icon}
            </span>
            <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {pillar.title}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-soft)]">
              {pillar.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ServicesPreview() {
  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <div className="flex flex-col gap-3 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          What we produce
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          Four services, one production house.
        </h2>
        <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
          Personalizare, finishing, custom production and digital print —
          coordinated across formats and quantities.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
      <div className="flex justify-start mt-10">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
        >
          <span>View all services</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

function TechniquesStrip() {
  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
        <div className="flex flex-col gap-3 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            How we decorate
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            Nine decoration techniques.
          </h2>
          <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
            The right method for every substrate, surface and quantity.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {techniques.map((technique) => (
            <article
              key={technique.slug}
              className="flex flex-col gap-1.5 p-5 bg-[var(--surface-soft)] border border-transparent hover:border-[var(--border)] rounded-xl transition-colors"
            >
              <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {technique.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {technique.bestFor}
              </p>
            </article>
          ))}
        </div>
        <div className="flex justify-start mt-10">
          <Link
            href="/techniques"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
          >
            <span>Explore all techniques</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

function FeaturedWork() {
  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <div className="flex flex-col gap-3 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Recent work
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          Selected projects across signage, apparel and packaging.
        </h2>
        <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
          A small slice of work coming out of the production floor.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {featuredPortfolio.map((item) => (
          <article
            key={item.slug}
            className="group flex flex-col gap-3"
          >
            <div className="relative overflow-hidden aspect-video rounded-2xl border border-[var(--border)]">
              {/* Inline style: portfolio accent is a runtime gradient string from the content module — Tailwind arbitrary values can't accept dynamic values. */}
              <div
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ background: item.accent }}
              />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-white bg-black/35 backdrop-blur-sm rounded-full">
                {item.category}
              </span>
            </div>
            <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {item.title}
            </h3>
          </article>
        ))}
      </div>
      <div className="flex justify-start mt-10">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] hover:gap-3 transition-all"
        >
          <span>See full portfolio</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

function ClosingCTA() {
  return (
    <section className="bg-[var(--brand-black)]">
      <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-20 lg:py-28 max-w-6xl">
        <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
        <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-white">
          Ready to brief your next campaign?
        </h2>
        <p className="mt-5 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
          Send us your artwork or your idea. We&apos;ll come back with a quote,
          a sample plan and a production timeline.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center mt-10 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
        >
          Get a quote
        </Link>
      </div>
    </section>
  )
}
