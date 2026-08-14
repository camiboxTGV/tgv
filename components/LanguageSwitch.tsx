export default function LanguageSwitch({
  mobile = false,
}: Readonly<{ mobile?: boolean }>) {
  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 ${
        mobile ? "self-start" : "shrink-0"
      }`}
    >
      <a
        href="https://www.tgv-media.ro/"
        title="Versiunea în limba română"
        className="rounded-full px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-orange)]"
      >
        RO
      </a>
      <span className="rounded-full bg-[var(--brand-orange)] px-2 py-1 text-[11px] font-semibold text-white">
        EN
      </span>
    </div>
  )
}
