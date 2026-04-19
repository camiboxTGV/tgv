import Link from "next/link"
import type { Service } from "@/lib/content/services"

interface Props {
  service: Service
}

export default function ServiceCard({ service }: Props) {
  const previewUseCases = service.useCases.slice(0, 3)
  return (
    <article className="group relative flex flex-col gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden hover:border-[var(--border-strong)] transition-colors">
      {/* Inline style: data-driven gradient accent strip pulled from Service.accent */}
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 w-1 h-full"
        style={{ background: service.accent }}
      />
      <h3 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        {service.title}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--text-soft)]">
        {service.summary}
      </p>
      <ul className="flex flex-col gap-1.5 text-sm text-[var(--text-muted)]">
        {previewUseCases.map((useCase) => (
          <li key={useCase} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
            />
            <span>{useCase}</span>
          </li>
        ))}
      </ul>
      {service.techniques && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {service.techniques.map((t) => (
            <span
              key={t.slug}
              className="px-2 py-0.5 text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
            >
              {t.title}
            </span>
          ))}
        </div>
      )}
      <Link
        href={`/services/${service.slug}`}
        className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-[var(--brand-orange)] group-hover:gap-3 transition-all"
      >
        <span>View service</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
