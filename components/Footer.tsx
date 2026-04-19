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
    label: "Facebook",
    path:
      "M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.75 8.43-4.91 8.43-9.93z",
  },
  {
    href: "#",
    label: "Instagram",
    path:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.95c-3.14 0-3.51.01-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.32 3.32 0 0 0-.82-1.26 3.32 3.32 0 0 0-1.26-.82c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.75-.07zm0 3.32a4.57 4.57 0 1 1 0 9.14 4.57 4.57 0 0 1 0-9.14zm0 7.54a2.97 2.97 0 1 0 0-5.94 2.97 2.97 0 0 0 0 5.94zm5.81-7.72a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0z",
  },
  {
    href: "#",
    label: "LinkedIn",
    path:
      "M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.46 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 6.99V22h-4.56v-6.17c0-1.47-.03-3.36-2.05-3.36-2.05 0-2.36 1.6-2.36 3.25V22H7.68V8z",
  },
  {
    href: "#",
    label: "Behance",
    path:
      "M7.799 5.698c.589 0 1.12.051 1.606.156.482.102.894.273 1.241.507.344.235.612.546.804.938.188.387.281.871.281 1.443 0 .619-.141 1.137-.421 1.551-.284.413-.7.751-1.255 1.014.756.218 1.317.601 1.689 1.146.371.546.557 1.205.557 1.975 0 .622-.12 1.16-.359 1.612a3.087 3.087 0 0 1-.991 1.119 4.439 4.439 0 0 1-1.444.622c-.546.135-1.121.205-1.703.205H1V5.698h6.799zm-.401 4.978c.484 0 .881-.115 1.192-.345.311-.23.466-.605.466-1.127 0-.291-.052-.529-.158-.713a1.146 1.146 0 0 0-.422-.451 1.769 1.769 0 0 0-.605-.234c-.226-.044-.464-.066-.71-.066H4v2.936h3.398zm.187 5.225c.265 0 .518-.027.758-.078a1.86 1.86 0 0 0 .637-.255 1.34 1.34 0 0 0 .438-.488c.107-.207.158-.477.158-.81 0-.65-.184-1.115-.546-1.395-.366-.279-.852-.42-1.453-.42H4v3.446h3.585zM17.062 16.512c.42.402.972.602 1.654.602.498 0 .926-.124 1.286-.371.358-.246.581-.504.661-.776h2.34c-.385 1.139-.969 1.957-1.756 2.448-.785.493-1.74.737-2.857.737-.778 0-1.479-.123-2.105-.371a4.453 4.453 0 0 1-1.585-1.058 4.696 4.696 0 0 1-1.005-1.624c-.234-.624-.354-1.314-.354-2.062 0-.732.121-1.408.358-2.034.241-.622.585-1.165 1.034-1.626a4.83 4.83 0 0 1 1.601-1.077c.624-.262 1.314-.392 2.072-.392.842 0 1.582.158 2.211.475a4.553 4.553 0 0 1 1.561 1.286c.413.529.708 1.137.886 1.811.176.673.226 1.385.146 2.118h-7.119c0 .785.272 1.523.692 1.918v-.004zm2.851-5.243c-.337-.348-.886-.539-1.516-.539-.41 0-.752.069-1.026.205a2.114 2.114 0 0 0-.661.502 1.83 1.83 0 0 0-.349.628c-.063.215-.103.41-.115.583h4.397c-.062-.703-.273-1.215-.612-1.55l-.118-.029zM15.34 6.246h5.447v1.346H15.34V6.246z",
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
              href="/sitemap"
              className="hover:text-[var(--brand-black)] transition-colors"
            >
              Sitemap
            </Link>
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
