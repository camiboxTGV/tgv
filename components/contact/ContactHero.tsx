interface Step {
  n: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "We review your brief",
    body: "Our team reads your message, files and selected products within 1 business day.",
  },
  {
    n: "02",
    title: "You get a quote + sample plan",
    body: "We send a transparent quote, a sample plan and a recommended technique for the substrate.",
  },
  {
    n: "03",
    title: "Production starts",
    body: "Once you approve the proof, production begins and dispatch happens within 5–10 working days.",
  },
]

export default function ContactHero() {
  return (
    <div className="relative flex flex-col gap-10 p-8 lg:p-10 bg-[var(--brand-black)] text-white rounded-3xl overflow-hidden">
      <DotPattern />
      <div className="relative">
        <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          Brief
        </p>
        <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-[family-name:var(--font-outfit)] font-semibold leading-tight">
          Let's build the next campaign together.
        </h2>
        <p className="mt-5 max-w-md text-sm lg:text-base text-white/70 leading-relaxed">
          Tell us about your project. Send us your artwork, the event context
          and any reference images — we'll come back with a plan.
        </p>
      </div>

      <ol className="relative flex flex-col gap-6">
        {STEPS.map((step) => (
          <li key={step.n} className="flex items-start gap-5">
            <span className="text-3xl lg:text-4xl font-[family-name:var(--font-outfit)] font-bold text-[var(--brand-orange)]">
              {step.n}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-base lg:text-lg font-[family-name:var(--font-outfit)] font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="relative flex flex-col gap-1 pt-6 border-t border-white/10 text-xs text-white/50">
        <p>
          We respond within{" "}
          <span className="text-white">1 business day</span>.
        </p>
        <p>Files stay private and are never reused without your permission.</p>
      </div>
    </div>
  )
}

function DotPattern() {
  return (
    <svg
      aria-hidden="true"
      className="absolute top-0 right-0 w-72 h-72 text-white/5"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="contact-dots"
          x="0"
          y="0"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#contact-dots)" />
    </svg>
  )
}
