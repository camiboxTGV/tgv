import type { Service } from "@/lib/content/services"

interface Props {
  service: Service
}

export default function ServiceCard({ service }: Props) {
  return (
    <article className="flex flex-col gap-3 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--border-strong)] transition-colors">
      <h3 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        {service.title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--text-soft)]">
        {service.summary}
      </p>
      <ul className="flex flex-col gap-1.5 mt-2 text-sm text-[var(--text-muted)]">
        {service.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
            />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
