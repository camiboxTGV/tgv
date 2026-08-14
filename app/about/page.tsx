import type { Metadata } from "next"
import Link from "next/link"
import { categories } from "@/lib/content/catalog"
import { services } from "@/lib/content/services"
import LocalizedText from "@/components/LocalizedText"

export const metadata: Metadata = {
  title: "About — TGV-Media",
  description:
    "TGV-Media is a full-service customization and promotional production house — laser, UV print, finishing and bespoke fabrication under one roof. From single-piece samples to high-volume runs.",
}

export default function AboutPage() {
  return (
    <>
      <Hero />
      <Numbers />
      <Story />
      <Workshop />
      <Values />
      <Process />
      <Team />
      <ClosingCTA />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col items-start mx-auto px-6 lg:px-8 pt-20 pb-16 lg:pt-32 lg:pb-24 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="About TGV-Media" ro="Despre TGV-Media" />
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          <LocalizedText en="We're a " ro="Suntem un atelier de " />
          <span className="text-[var(--brand-orange)]"><LocalizedText en="production" ro="producție" /></span>{" "}
          <LocalizedText en="house — not a print shop." ro="— nu doar o tipografie." />
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
          <LocalizedText
            en="TGV-Media exists to keep brand output consistent across every format a marketing team has to ship. We decorate, finish and fabricate in one workshop — so you brief once and the whole campaign comes out aligned."
            ro="TGV-Media păstrează identitatea brandului consecventă în toate formatele unei campanii. Personalizăm, finisăm și fabricăm în același atelier — un singur brief, o campanie perfect aliniată."
          />
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
          >
            <LocalizedText en="Start a project" ro="Începe un proiect" />
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            <LocalizedText en="Browse catalog" ro="Vezi catalogul" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Numbers() {
  const stats = [
    { value: services.length.toString(), label: <LocalizedText en="Services under one roof" ro="Servicii sub același acoperiș" /> },
    { value: "9", label: <LocalizedText en="Production techniques" ro="Tehnici de producție" /> },
    { value: categories.length.toString(), label: <LocalizedText en="Catalog categories" ro="Categorii de catalog" /> },
    { value: "1", label: <LocalizedText en="Briefing-to-dispatch workflow" ro="Flux de la brief la livrare" /> },
  ]
  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
        {stats.map((s, index) => (
          <div key={index} className="flex flex-col gap-2">
            <span className="text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-orange)]">
              {s.value}
            </span>
            <span className="text-sm leading-snug text-[var(--text-soft)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Story() {
  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_4fr] gap-10 lg:gap-16">
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            <LocalizedText en="Our story" ro="Povestea noastră" />
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            <LocalizedText en="Built around the way real campaigns ship." ro="Construit în jurul modului în care campaniile reale prind viață." />
          </h2>
          <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
            <LocalizedText
              en="Most agencies and marketing teams end up juggling four or five vendors for one campaign — apparel from one place, signage from another, the giveaway items from a third, finishing somewhere else. By the time everything arrives, the brand looks slightly different on every surface."
              ro="Majoritatea agențiilor ajung să coordoneze patru sau cinci furnizori pentru o singură campanie — textile, semnalistică, cadouri și finisaje din locuri diferite. La final, brandul arată puțin diferit pe fiecare suprafață."
            />
          </p>
          <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
            <LocalizedText
              en="TGV-Media was set up to fix exactly that. We brought decoration, finishing and bespoke production into a single workshop, with one artwork and proofing pipeline behind it. The result: when you brief us once, every piece comes out aligned — colour, scale, material, finish."
              ro="TGV-Media a fost creat pentru a rezolva exact această problemă. Am adus personalizarea, finisarea și producția custom într-un singur atelier, cu un flux unic de grafică și verificare. Astfel, culoarea, scara, materialul și finisajul rămân aliniate."
            />
          </p>
          <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
            <LocalizedText
              en="We work with single-piece samples and high-volume runs equally seriously. The same hand reviews the proof. The same standard applies."
              ro="Tratăm cu aceeași seriozitate mostrele unicat și seriile mari. Aceeași atenție verifică proba. Același standard se aplică."
            />
          </p>
        </div>
        <aside className="relative flex flex-col gap-6 p-8 lg:p-10 bg-[var(--brand-black)] rounded-3xl overflow-hidden">
          <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
          <p className="text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold leading-snug text-white">
            <LocalizedText en="One brief, one workshop, one quality bar — across every format the campaign needs." ro="Un singur brief, un singur atelier, același standard de calitate — în toate formatele campaniei." />
          </p>
          <p className="text-sm text-white/60 uppercase tracking-widest">
            <LocalizedText en="How we work" ro="Cum lucrăm" />
          </p>
        </aside>
      </div>
    </section>
  )
}

interface Capability {
  title: string
  body: string
  icon: React.ReactNode
}

function Workshop() {
  const capabilities: Capability[] = [
    {
      title: "Laser systems",
      body:
        "CO2 and fiber laser stations for engraving wood, leather, acrylic, glass and the full metals range.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      ),
    },
    {
      title: "UV print & transfer",
      body:
        "Direct UV print on rigid substrates and UV transfer for curved, irregular and fabric surfaces.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <line x1="7" y1="10" x2="7" y2="14" />
          <line x1="11" y1="10" x2="11" y2="14" />
          <line x1="15" y1="10" x2="15" y2="14" />
          <line x1="19" y1="10" x2="19" y2="14" />
        </svg>
      ),
    },
    {
      title: "Finishing",
      body:
        "Hot foil, embossing, debossing and lamination — the touches that make a piece feel premium in hand.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12l3-3 4 4 5-5 6 6" />
          <path d="M3 18h18" />
        </svg>
      ),
    },
    {
      title: "Custom fabrication",
      body:
        "When the catalog item doesn't exist, we build it from substrate up — displays, awards, props, packaging.",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a4 4 0 0 0-5.4 0l-3 3a4 4 0 0 0 0 5.4l3 3a4 4 0 0 0 5.4 0l3-3a4 4 0 0 0 0-5.4z" />
          <line x1="9" y1="15" x2="15" y2="9" />
        </svg>
      ),
    },
  ]

  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="Capabilities" ro="Capabilități" />
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          <LocalizedText en="Inside the workshop." ro="În atelier." />
        </h2>
        <p className="mt-4 max-w-2xl text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
          <LocalizedText en="Four production lines running in parallel — paired with one artwork-to-dispatch pipeline behind them." ro="Linii de producție care lucrează în paralel, coordonate printr-un singur flux de la grafică la livrare." />
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {capabilities.map((c) => (
            <article
              key={c.title}
              className="flex flex-col gap-3 p-6 bg-[var(--bg)] border border-[var(--border-soft)] rounded-2xl"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 text-[var(--brand-orange)] bg-[var(--surface-soft)] rounded-xl">
                {c.icon}
              </span>
              <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {c.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Values() {
  const values = [
    {
      title: "Craft over volume",
      body:
        "A 50-piece sample run gets the same proof review as a 50,000-piece order. The standard doesn't move with the quantity.",
    },
    {
      title: "One vendor, less drift",
      body:
        "Same workshop, same colour pipeline, same proofing eyes — across apparel, print, signage and promo. The brand stays itself.",
    },
    {
      title: "Honest timelines",
      body:
        "We quote production windows we can hold. If something will take longer, we say so before the artwork is approved.",
    },
    {
      title: "Right technique, right substrate",
      body:
        "We recommend the decoration method that suits the object — not the one that's easiest for us. Substrate decides.",
    },
  ]
  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        <LocalizedText en="What we stand for" ro="Principiile noastre" />
      </p>
      <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        <LocalizedText en="Four principles, applied to every job." ro="Patru principii, aplicate fiecărui proiect." />
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
        {values.map((v) => (
          <article
            key={v.title}
            className="relative flex flex-col gap-3 p-6 lg:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
          >
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 w-1 h-full bg-[var(--brand-orange)]"
            />
            <h3 className="text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {v.title}
            </h3>
            <p className="text-base leading-relaxed text-[var(--text-soft)]">
              {v.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function Process() {
  const steps = [
    {
      n: "01",
      title: "Brief",
      body:
        "Send your artwork, the event context and any reference images. We respond within one business day.",
    },
    {
      n: "02",
      title: "Sample plan",
      body:
        "We come back with a quote, a recommended technique for the substrate and a sample plan for sign-off.",
    },
    {
      n: "03",
      title: "Production",
      body:
        "Once the proof is approved, production runs in-house with the same hands proofing as decorating.",
    },
    {
      n: "04",
      title: "Dispatch",
      body:
        "Quality-checked, packed and dispatched on the agreed date — to one address or split across locations.",
    },
  ]
  return (
    <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
      <div className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          <LocalizedText en="How we work" ro="Cum lucrăm" />
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          <LocalizedText en="From brief to dispatch in four steps." ro="De la brief la livrare în patru pași." />
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-3 p-6 bg-[var(--bg)] border border-[var(--border-soft)] rounded-2xl"
            >
              <span className="text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-bold text-[var(--brand-orange)]">
                {step.n}
              </span>
              <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--text-soft)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

interface TeamRole {
  role: string
  body: string
  accent: string
}

function Team() {
  const team: TeamRole[] = [
    {
      role: "Production lead",
      body: "Owns the floor — sequencing, deadlines and the final proof sign-off before dispatch.",
      accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    },
    {
      role: "Senior decorator",
      body: "Runs the laser and UV stations. Calibrates per substrate, per artwork, per run.",
      accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    },
    {
      role: "Artwork & proofing",
      body: "Receives client files, vectorises, colour-matches and prepares production-ready artwork.",
      accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    },
    {
      role: "Finishing specialist",
      body: "Handles foil, emboss and lamination — the tactile finishes that signal premium in hand.",
      accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
    },
    {
      role: "Custom fabrication",
      body: "Engineers and builds bespoke pieces from raw stock — displays, awards, packaging prototypes.",
      accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    },
    {
      role: "Account & briefing",
      body: "Your single point of contact from first brief to dispatch — translates campaign into production.",
      accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    },
  ]

  return (
    <section className="mx-auto px-6 lg:px-8 py-16 lg:py-24 max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        <LocalizedText en="The team" ro="Echipa" />
      </p>
      <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
        <LocalizedText en="The roles behind every job." ro="Rolurile din spatele fiecărui proiect." />
      </h2>
      <p className="mt-4 max-w-2xl text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
        <LocalizedText en="A small, specialised team — every brief touches each of these hands." ro="O echipă restrânsă și specializată — fiecare brief trece prin mâinile noastre." />
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {team.map((t) => (
          <article
            key={t.role}
            className="flex flex-col gap-3 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl"
          >
            <div className="relative overflow-hidden aspect-square rounded-xl">
              {/* Inline style: data-driven gradient avatar from TeamRole.accent — pattern reused from CategoryCard/ProductCard */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: t.accent }}
              />
            </div>
            <h3 className="text-base font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              {t.role}
            </h3>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {t.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function ClosingCTA() {
  return (
    <section className="bg-[var(--brand-black)]">
      <div className="flex flex-col items-start mx-auto px-6 lg:px-8 py-20 lg:py-28 max-w-6xl">
        <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
        <h2 className="mt-6 max-w-3xl text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold text-white">
          <LocalizedText en="Ready to put us on a brief?" ro="Pregătit să ne trimiți un brief?" />
        </h2>
        <p className="mt-5 max-w-2xl text-base lg:text-lg text-white/70 leading-relaxed">
          <LocalizedText en="Send the artwork, the event context and the deadline. We come back with a quote, a sample plan and a production timeline within one business day." ro="Trimite grafica, contextul evenimentului și termenul. Revenim în cel mult o zi lucrătoare cu o ofertă, un plan de mostre și un calendar de producție." />
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center mt-10 px-6 py-3 text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-full transition-colors"
        >
          <LocalizedText en="Start a project" ro="Începe un proiect" />
        </Link>
      </div>
    </section>
  )
}
