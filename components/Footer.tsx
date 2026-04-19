import Link from "next/link"
import { services } from "@/lib/content/services"

interface SocialLink {
  href: string
  label: string
  path: string
}

const socials: SocialLink[] = [
  {
    href: "#",
    label: "LinkedIn",
    path:
      "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.46 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 6.99V22h-4.56v-6.17c0-1.47-.03-3.36-2.05-3.36-2.05 0-2.36 1.6-2.36 3.25V22H7.68V8z",
  },
  {
    href: "#",
    label: "Instagram",
    path:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.95c-3.14 0-3.51.01-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.32 3.32 0 0 0-.82-1.26 3.32 3.32 0 0 0-1.26-.82c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.75-.07zm0 3.32a4.57 4.57 0 1 1 0 9.14 4.57 4.57 0 0 1 0-9.14zm0 7.54a2.97 2.97 0 1 0 0-5.94 2.97 2.97 0 0 0 0 5.94zm5.81-7.72a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0z",
  },
  {
    href: "#",
    label: "Facebook",
    path:
      "M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.75 8.43-4.91 8.43-9.93z",
  },
]

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
            Company
          </h3>
          <ul className="flex flex-col gap-2 mt-4">
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
                href="/portfolio"
                className="text-sm text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors"
              >
                Portfolio
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
            <li>Address: TBD</li>
            <li>Email: TBD</li>
            <li>Phone: TBD</li>
          </ul>
          <div className="flex items-center gap-3 mt-5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="inline-flex items-center justify-center w-9 h-9 text-[var(--text-soft)] hover:text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--border)] rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mx-auto px-6 lg:px-12 py-5 max-w-6xl text-xs text-[var(--text-muted)]">
          <p>© {year} TGV-Media. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link
              href="/privacy"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
