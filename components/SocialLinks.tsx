interface SocialLink {
  href: string
  label: string
  path: string
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://www.facebook.com/tgvmedia",
    label: "Facebook",
    path:
      "M22 12.07C22 6.51 17.52 2 12 2S2 6.51 2 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.75 8.43-4.91 8.43-9.93z",
  },
  {
    href: "https://www.instagram.com/tgvmediagrup?igsh=YXZkMmU3bHlmbW82&utm_source=qr",
    label: "Instagram",
    path:
      "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.95c-3.14 0-3.51.01-4.75.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.07-.23-1.65-.38-2.04a3.32 3.32 0 0 0-.82-1.26 3.32 3.32 0 0 0-1.26-.82c-.39-.15-.97-.33-2.04-.38-1.24-.06-1.61-.07-4.75-.07zm0 3.32a4.57 4.57 0 1 1 0 9.14 4.57 4.57 0 0 1 0-9.14zm0 7.54a2.97 2.97 0 1 0 0-5.94 2.97 2.97 0 0 0 0 5.94zm5.81-7.72a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0z",
  },
]

export default function SocialLinks({
  showLabels = false,
}: Readonly<{ showLabels?: boolean }>) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {SOCIAL_LINKS.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow TGV-Media on ${social.label}`}
          className={
            showLabels
              ? "group inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[var(--brand-black)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-orange)] rounded-full transition-colors"
              : "inline-flex items-center justify-center w-10 h-10 text-[var(--text-soft)] border border-[var(--border)] hover:text-white hover:bg-[var(--brand-orange)] hover:border-[var(--brand-orange)] rounded-full transition-colors"
          }
        >
          <svg
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d={social.path} />
          </svg>
          {showLabels ? <span>{social.label}</span> : null}
        </a>
      ))}
    </div>
  )
}
