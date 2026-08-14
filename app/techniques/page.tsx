import type { Metadata } from "next"
import Link from "next/link"
import { techniques } from "@/lib/content/techniques"

export const metadata: Metadata = {
  title: "Decoration Techniques — TGV-Media",
  description:
    "Nine in-house decoration techniques for textiles, promotional objects, rigid surfaces, signage and print.",
}

export default function TechniquesPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          How we decorate
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          Nine techniques. <span className="text-[var(--brand-orange)]">One</span>{" "}
          production workflow.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          We match the method to the substrate, artwork, finish and quantity,
          then proof and produce it under one roof.
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techniques.map((technique, index) => (
            <article
              key={technique.slug}
              id={technique.slug}
              className="flex flex-col gap-4 p-6 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"
            >
              <span className="text-xs font-semibold tracking-widest text-[var(--brand-orange)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                  {technique.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  {technique.bestFor}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[var(--brand-black)]">
        <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
            Not sure which technique fits?
          </h2>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
            Send the artwork, substrate and quantity. We&apos;ll recommend the
            method and a sample plan.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            Start a project
          </Link>
        </div>
      </section>
    </>
  )
}
