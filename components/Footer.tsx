import Link from "next/link"
import SocialLinks from "@/components/SocialLinks"
import { services } from "@/lib/content/services"

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[var(--surface-elevated)] border-t border-[var(--border)]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mx-auto px-6 lg:px-12 py-12 max-w-6xl">
        <div>
          <Link
            href="/"
            className="text-xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
          >
            TGV<span className="text-[var(--brand-orange)]">-</span>Media
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
            Full-service customization and promotional production.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Services
          </h3>
          <ul className="flex flex-col gap-2 mt-4">
            {services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
                >
                  {service.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Site
          </h3>
          <ul className="flex flex-col gap-2 mt-4">
            <li>
              <Link
                href="/catalog"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                Catalog
              </Link>
            </li>
            <li>
              <Link
                href="/offer"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                My offer
              </Link>
            </li>
            <li>
              <Link
                href="/portfolio"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                Portfolio
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Get in touch
          </h3>
          <ul className="flex flex-col gap-2 mt-4 text-sm text-[var(--text-muted)]">
            <li>Strada Dimitrie Racoviță 3, București</li>
            <li>
              <a
                href="mailto:office@tgv-media.ro"
                className="hover:text-[var(--brand-black)] transition-colors"
              >
                office@tgv-media.ro
              </a>
            </li>
            <li>
              <a
                href="tel:+40723267197"
                className="hover:text-[var(--brand-black)] transition-colors"
              >
                +40 723 267 197
              </a>
            </li>
          </ul>
          <div className="mt-5">
            <SocialLinks />
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mx-auto px-6 lg:px-12 py-5 max-w-6xl text-xs text-[var(--text-muted)]">
          <p>© {year} TGV-Media. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link
              href="/sitemap"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
