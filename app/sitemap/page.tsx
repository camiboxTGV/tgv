import type { Metadata } from "next"
import Link from "next/link"
import { getTopCategories } from "@/lib/content/catalog"
import { services } from "@/lib/content/services"

export const metadata: Metadata = {
  title: "Sitemap — TGV-Media",
  description:
    "Every page on the TGV-Media site, organized by section. Find services, catalog categories, your offer and legal information at a glance.",
}

interface SitemapLink {
  href: string
  label: string
  description?: string
}

interface SitemapSection {
  title: string
  intro: string
  links: SitemapLink[]
}

export default function SitemapPage() {
  const sections: SitemapSection[] = [
    {
      title: "Main",
      intro: "The pages most visitors land on.",
      links: [
        { href: "/", label: "Homepage", description: "What we do, in one scroll." },
        { href: "/about", label: "About", description: "The team and the workshop." },
        { href: "/portfolio", label: "Portfolio", description: "Selected work across formats." },
        { href: "/contact", label: "Contact", description: "Send a brief and your artwork." },
      ],
    },
    {
      title: "Services",
      intro: "Everything we produce, organized by capability.",
      links: [
        { href: "/services", label: "Services overview", description: "All four services on one page." },
        ...services.map((s) => ({
          href: `/services/${s.slug}`,
          label: s.title,
          description: s.summary,
        })),
      ],
    },
    {
      title: "Catalog",
      intro: "Browse personalizable products by category, then add to your offer.",
      links: [
        { href: "/catalog", label: "Catalog overview", description: "All categories with product counts." },
        ...getTopCategories().map((c) => ({
          href: `/catalog/${c.slug}`,
          label: c.name,
          description: c.description,
        })),
      ],
    },
    {
      title: "Quote",
      intro: "Move from browsing to a personalized offer.",
      links: [
        { href: "/offer", label: "My offer", description: "Review selected products and continue to the brief." },
      ],
    },
    {
      title: "Legal",
      intro: "Policies, terms and the page you're reading right now.",
      links: [
        { href: "/sitemap", label: "Sitemap", description: "This page." },
        { href: "/privacy", label: "Privacy policy" },
        { href: "/terms", label: "Terms of service" },
      ],
    },
  ]

  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Sitemap
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Every page,{" "}
          <span className="text-[var(--brand-orange)]">at a glance</span>.
        </h1>
        <p className="mt-6 text-lg text-[var(--text-soft)] leading-relaxed">
          A human-readable map of the TGV-Media site. If you're looking for a
          specific service, product category or page, it's listed here.
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-24 max-w-4xl">
        <div className="flex flex-col gap-12">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                  {section.title}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {section.intro}
                </p>
              </div>
              <ul className="flex flex-col gap-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-start justify-between gap-4 px-4 py-3 -mx-4 rounded-xl hover:bg-[var(--surface-soft)] transition-colors"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-base font-medium text-[var(--brand-black)]">
                          {link.label}
                        </span>
                        {link.description && (
                          <span className="text-sm text-[var(--text-muted)]">
                            {link.description}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-1 text-[var(--text-muted)] group-hover:text-[var(--brand-orange)] group-hover:translate-x-1 transition-all"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
