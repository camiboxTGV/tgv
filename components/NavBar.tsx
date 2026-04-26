"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOffer } from "@/components/OfferProvider"
import SearchBox from "@/components/SearchBox"

interface NavLink {
  href: string
  label: string
}

const links: NavLink[] = [
  { href: "/services", label: "Services" },
  { href: "/catalog", label: "Catalog" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
]

export default function NavBar() {
  const pathname = usePathname()
  const { count, hydrated } = useOffer()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = original
      }
    }
  }, [open])

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href))

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors ${
        scrolled
          ? "bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border-soft)]"
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-6 mx-auto px-6 lg:px-8 py-4 max-w-6xl">
        <Link
          href="/"
          className="text-xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
        >
          TGV<span className="text-[var(--brand-orange)]">•</span>Media
        </Link>

        <div className="hidden md:flex grow items-center justify-end gap-6">
          <nav className="flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-[var(--brand-black)]"
                    : "text-[var(--text-soft)] hover:text-[var(--brand-black)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <SearchBox className="w-56 lg:w-72" />

          <div className="flex items-center gap-3">
            {hydrated && count > 0 && (
              <Link
                href="/offer"
                aria-label={`${count} item${count === 1 ? "" : "s"} in your offer`}
                className="inline-flex items-center justify-center w-8 h-8 text-xs font-semibold text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full hover:bg-[var(--brand-orange)] hover:text-white transition-colors"
              >
                {count}
              </Link>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
            >
              Start a project
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="md:hidden inline-flex items-center justify-center p-2 w-10 h-10 rounded-md text-[var(--brand-black)] hover:bg-[var(--surface-soft)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col p-6 bg-[var(--surface)]">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
            >
              TGV<span className="text-[var(--brand-orange)]">-</span>Media
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex items-center justify-center p-2 w-10 h-10 rounded-md text-[var(--brand-black)] hover:bg-[var(--surface-soft)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mt-8">
            <SearchBox
              className="w-full"
              onNavigate={() => setOpen(false)}
            />
          </div>

          <nav className="flex flex-col gap-6 mt-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`text-2xl font-[family-name:var(--font-outfit)] font-semibold ${
                  isActive(link.href)
                    ? "text-[var(--brand-orange)]"
                    : "text-[var(--brand-black)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {hydrated && count > 0 && (
            <Link
              href="/offer"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 mt-auto mb-3 px-6 py-3 text-sm font-semibold text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full"
            >
              <span>Build my offer ({count})</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className={`inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors ${
              hydrated && count > 0 ? "" : "mt-auto"
            }`}
          >
            Start a project
          </Link>
        </div>
      )}
    </header>
  )
}
