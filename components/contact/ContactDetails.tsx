interface ContactChannel {
  label: string
  value: string
  href: string
  hint: string
  icon: "phone" | "email" | "pin"
}

const CHANNELS: ContactChannel[] = [
  {
    label: "Call us",
    value: "+40 723 267 197",
    href: "tel:+40723267197",
    hint: "Mon–Fri · 09:00 – 18:00 EET",
    icon: "phone",
  },
  {
    label: "Email",
    value: "office@tgv-media.ro",
    href: "mailto:office@tgv-media.ro",
    hint: "We reply within 1 business day",
    icon: "email",
  },
  {
    label: "Studio",
    value: "Strada Dimitrie Racoviță 3",
    href: "https://www.google.com/maps/search/?api=1&query=Strada+Dimitrie+Racovi%C8%9B%C4%83+3%2C+030167+Bucure%C8%99ti",
    hint: "030167 București, România",
    icon: "pin",
  },
]

const MAP_EMBED_URL =
  "https://maps.google.com/maps?q=Strada%20Dimitrie%20Racovi%C8%9B%C4%83%203%2C%20Bucure%C8%99ti&t=&z=16&ie=UTF8&iwloc=&output=embed"

export default function ContactDetails() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          Reach us directly
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {CHANNELS.map((c) => (
          <ChannelCard key={c.label} channel={c} />
        ))}
      </div>

      <div className="relative w-full h-72 sm:h-80 lg:h-96 bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-3xl overflow-hidden">
        <iframe
          src={MAP_EMBED_URL}
          title="TGV-Media studio location on Google Maps"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block w-full h-full border-0"
        />
      </div>
    </section>
  )
}

function ChannelCard({ channel }: { channel: ContactChannel }) {
  const isExternal = channel.icon === "pin"
  return (
    <a
      href={channel.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="group relative flex flex-col gap-4 p-6 lg:p-7 bg-[var(--surface)] border border-[var(--border-soft)] rounded-3xl hover:border-[var(--brand-orange)] hover:-translate-y-0.5 transition-all"
    >
      <span className="inline-flex items-center justify-center w-12 h-12 text-[var(--brand-orange)] bg-[var(--brand-orange)]/10 rounded-2xl group-hover:bg-[var(--brand-orange)] group-hover:text-white transition-colors">
        <ChannelIcon name={channel.icon} />
      </span>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          {channel.label}
        </p>
        <p className="text-xl lg:text-2xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)] leading-tight break-words">
          {channel.value}
        </p>
        <p className="mt-1 text-sm text-[var(--text-soft)]">{channel.hint}</p>
      </div>

      <span
        aria-hidden="true"
        className="absolute top-6 right-6 text-[var(--text-muted)] group-hover:text-[var(--brand-orange)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </span>
    </a>
  )
}

function ChannelIcon({ name }: { name: ContactChannel["icon"] }) {
  if (name === "phone") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
      </svg>
    )
  }
  if (name === "email") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <polyline points="3 7 12 13 21 7" />
      </svg>
    )
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
