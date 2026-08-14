import type { Metadata } from "next"
import Link from "next/link"
import { techniques } from "@/lib/content/techniques"
import LocalizedText from "@/components/LocalizedText"
import TechniqueGrid from "@/components/TechniqueGrid"

export const metadata: Metadata = {
  title: "Production Techniques — TGV-Media",
  description:
    "Nine in-house production techniques spanning laser work, direct UV print, 3D printing, digital cutting, premium print, and hand finishing.",
}

export default function TechniquesPage() {
  return (
    <>
      <section className="mx-auto px-6 lg:px-8 pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="How we produce" ro="Cum producem" />
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          <LocalizedText en="Nine techniques. " ro="Nouă tehnici. " />
          <span className="text-[var(--brand-orange)]"><LocalizedText en="One" ro="Un singur" /></span>{" "}
          <LocalizedText en="production workflow." ro="flux de producție." />
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          <LocalizedText
            en="We match digital technology, precision tools, and manual know-how to the substrate, structure, artwork, finish, and quantity."
            ro="Adaptăm tehnologia digitală, instrumentele de precizie și experiența manuală la material, structură, grafică, finisaj și cantitate."
          />
        </p>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 max-w-6xl">
        <TechniqueGrid techniques={techniques} />
      </section>

      <section className="bg-[var(--brand-black)]">
        <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-16 lg:py-20 max-w-6xl">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-white">
            <LocalizedText en="Not sure which technique fits?" ro="Nu știi ce tehnică se potrivește?" />
          </h2>
          <p className="mt-4 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
            <LocalizedText
              en="Send the artwork, substrate and quantity. We'll recommend the method and a sample plan."
              ro="Trimite grafica, materialul și cantitatea. Îți recomandăm metoda și un plan de mostre."
            />
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center mt-8 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            <LocalizedText en="Start a project" ro="Începe un proiect" />
          </Link>
        </div>
      </section>
    </>
  )
}
