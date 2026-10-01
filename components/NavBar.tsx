"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useOffer } from "@/components/OfferProvider"
import LanguageSwitch from "@/components/LanguageSwitch"
import SearchBox from "@/components/SearchBox"
import { useLanguage } from "@/components/LanguageProvider"

interface NavLink {
  href: string
  label: { en: string; ro: string }
}

const links: NavLink[] = [
  { href: "/services", label: { en: "Services", ro: "Servicii" } },
  { href: "/catalog", label: { en: "Catalog", ro: "Catalog" } },
  { href: "/portfolio", label: { en: "Portfolio", ro: "Portofoliu" } },
  { href: "/about", label: { en: "About", ro: "Despre noi" } },
]

export default function NavBar() {
  const pathname = usePathname()
  const { locale } = useLanguage()
  const { count, hydrated } = useOffer()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuButtonRef.current?.focus())
    }
  }

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

  useEffect(() => {
    if (!open) return

    const desktop = window.matchMedia("(min-width: 1024px)")
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true)
        return
      }
      if (event.key !== "Tab") return

      const focusable = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    desktop.addEventListener("change", onDesktop)

    const dialog = menuRef.current
    const inerted = dialog
      ? Array.from(document.body.children).filter(
          (element) => element !== dialog && !element.hasAttribute("inert"),
        )
      : []
    inerted.forEach((element) => element.setAttribute("inert", ""))

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      desktop.removeEventListener("change", onDesktop)
      inerted.forEach((element) => element.removeAttribute("inert"))
    }
  }, [open])

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href))

  const countLabel = count > 99 ? "99+" : String(count)

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-colors ${
          scrolled
            ? "bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border-soft)]"
            : "bg-transparent"
        }`}
      >
      <div className="flex items-center justify-between gap-4 mx-auto px-6 lg:px-8 py-4 max-w-6xl xl:gap-6">
        <Link
          href="/"
          className="shrink-0 text-xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
        >
          TGV<span className="text-[var(--brand-orange)]">•</span>Media
        </Link>

        <div className="hidden min-w-0 grow items-center justify-end gap-4 lg:flex xl:gap-6">
          <nav className="flex shrink-0 items-center gap-5 xl:gap-8">
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
                {link.label[locale]}
              </Link>
            ))}
          </nav>

          <SearchBox className="w-44 shrink-0 xl:w-72" />

          <LanguageSwitch />

          <div className="flex shrink-0 items-center gap-3">
            {hydrated && count > 0 && (
              <Link
                href="/offer"
                aria-label={
                  locale === "ro"
                    ? `${count} ${count === 1 ? "produs" : "produse"} în oferta ta`
                    : `${count} item${count === 1 ? "" : "s"} in your offer`
                }
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[var(--brand-orange)] bg-[var(--surface)] px-2 text-xs font-semibold tabular-nums text-[var(--brand-orange)] transition-colors hover:bg-[var(--brand-orange)] hover:text-white"
              >
                {countLabel}
              </Link>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center whitespace-nowrap px-5 py-2.5 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
            >
              {locale === "ro" ? "Începe un proiect" : "Start a project"}
            </Link>
          </div>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={locale === "ro" ? "Deschide meniul" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className="inline-flex items-center justify-center p-2 w-10 h-10 rounded-md text-[var(--brand-black)] hover:bg-[var(--surface-soft)] lg:hidden"
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
      </header>

      {open && (
        <div
          ref={menuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label={locale === "ro" ? "Meniu principal" : "Main menu"}
          className="fixed inset-0 z-[60] flex max-h-dvh min-h-dvh flex-col overflow-y-auto overscroll-contain bg-[var(--surface)] p-6 lg:hidden"
        >
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => closeMenu()}
              className="text-xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
            >
              TGV<span className="text-[var(--brand-orange)]">•</span>Media
            </Link>
            <button
              type="button"
              onClick={() => closeMenu(true)}
              aria-label={locale === "ro" ? "Închide meniul" : "Close menu"}
              autoFocus
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
              onNavigate={() => closeMenu()}
            />
          </div>

          <div className="mt-5">
            <LanguageSwitch mobile />
          </div>

          <nav className="flex flex-col gap-6 mt-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => closeMenu()}
                className={`text-2xl font-[family-name:var(--font-outfit)] font-semibold ${
                  isActive(link.href)
                    ? "text-[var(--brand-orange)]"
                    : "text-[var(--brand-black)]"
                }`}
              >
                {link.label[locale]}
              </Link>
            ))}
          </nav>

          {hydrated && count > 0 && (
            <Link
              href="/offer"
              onClick={() => closeMenu()}
              className="inline-flex items-center justify-center gap-2 mt-auto mb-3 px-6 py-3 text-sm font-semibold text-[var(--brand-orange)] bg-[var(--surface)] border border-[var(--brand-orange)] rounded-full"
            >
              <span>
                {locale === "ro" ? "Construiește oferta" : "Build my offer"} ({count})
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link
            href="/contact"
            onClick={() => closeMenu()}
            className={`inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors ${
              hydrated && count > 0 ? "" : "mt-auto"
            }`}
          >
            {locale === "ro" ? "Începe un proiect" : "Start a project"}
          </Link>
        </div>
      )}
    </>
  )
}
