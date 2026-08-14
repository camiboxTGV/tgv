"use client"

import Link from "next/link"
import SocialLinks from "@/components/SocialLinks"
import { services } from "@/lib/content/services"
import { useLanguage } from "@/components/LanguageProvider"
import { localizeService } from "@/lib/i18n/content"

export default function Footer() {
  const year = new Date().getFullYear()
  const { locale } = useLanguage()
  const copy = locale === "ro"
    ? {
        description: "Producție și personalizare promoțională, de la concept la livrare.",
        network: "Rețeaua noastră",
        services: "Servicii",
        site: "Site",
        catalog: "Catalog",
        offer: "Oferta mea",
        calculator: "Calculator de preț",
        priceList: "Listă prețuri personalizare (PDF)",
        portfolio: "Portofoliu",
        about: "Despre noi",
        contact: "Contact",
        touch: "Contactează-ne",
        rights: "Toate drepturile rezervate.",
        sitemap: "Harta site-ului",
      }
    : {
        description: "Full-service customization and promotional production.",
        network: "Our network",
        services: "Services",
        site: "Site",
        catalog: "Catalog",
        offer: "My offer",
        calculator: "Price calculator",
        priceList: "Personalisation price list (PDF)",
        portfolio: "Portfolio",
        about: "About",
        contact: "Contact",
        touch: "Get in touch",
        rights: "All rights reserved.",
        sitemap: "Sitemap",
      }

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
            {copy.description}
          </p>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {copy.network}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a
                href="https://qreactive.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-soft)] transition-colors hover:text-[var(--brand-orange)]"
              >
                qreactive.ro ↗
              </a>
              <a
                href="https://inkme.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-soft)] transition-colors hover:text-[var(--brand-orange)]"
              >
                inkme.ro ↗
              </a>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {copy.services}
          </h3>
          <ul className="flex flex-col gap-2 mt-4">
            {services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/services/${service.slug}`}
                  className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
                >
                  {localizeService(service, locale).title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {copy.site}
          </h3>
          <ul className="flex flex-col gap-2 mt-4">
            <li>
              <Link
                href="/catalog"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.catalog}
              </Link>
            </li>
            <li>
              <Link
                href="/offer"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.offer}
              </Link>
            </li>
            <li>
              <Link
                href="/pricing"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.calculator}
              </Link>
            </li>
            <li>
              <a
                href="/downloads/tgv-media-personalization-pricing.pdf"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
                download
              >
                {copy.priceList}
              </a>
            </li>
            <li>
              <Link
                href="/portfolio"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.portfolio}
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.about}
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                {copy.contact}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {copy.touch}
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
          <p>© {year} TGV-Media. {copy.rights}</p>
          <div className="flex items-center gap-5">
            <Link
              href="/sitemap"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              {copy.sitemap}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
