import type { Metadata } from "next"
import Link from "next/link"
import ServiceCard from "@/components/ServiceCard"
import { services } from "@/lib/content/services"

export const metadata: Metadata = {
  title: "Services — TGV-Media",
  description:
    "Promotional object personalization, embossing & foil finishing, custom production and digital print — four services under one roof.",
}

export default function ServicesPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          What we produce
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Four services. <span className="text-[var(--brand-orange)]">One</span>{" "}
          production house.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          From laser-engraved promotional objects to short-run digital print, we
          handle decoration, finishing and custom fabrication in one workflow —
          so you brief once and ship coordinated output.
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </section>

      <section className="bg-[var(--brand-black)]">
        <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
            Not sure which service fits your project?
          </h2>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
            Tell us about the substrate, the quantity and the deadline. We'll
            recommend the right technique and send a sample plan.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            Start a project
          </Link>
        </div>
      </section>
    </>
  )
}
