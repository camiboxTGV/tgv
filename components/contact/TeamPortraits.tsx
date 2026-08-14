import Image from "next/image"

const TEAM_PORTRAITS = [
  {
    src: "/images/team/team-01.jpg",
    alt: "TGV-Media team member reaching toward an illuminated bulb",
  },
  {
    src: "/images/team/team-02.jpg",
    alt: "TGV-Media team member riding a bicycle with orange accents",
  },
  {
    src: "/images/team/team-03.jpg",
    alt: "TGV-Media team member holding an orange paper plane",
  },
  {
    src: "/images/team/team-04.jpg",
    alt: "TGV-Media team member with an illuminated production tool",
  },
  {
    src: "/images/team/team-05.jpg",
    alt: "TGV-Media team member using an airbrush with orange paint",
  },
]

export default function TeamPortraits() {
  return (
    <section aria-labelledby="team-heading" className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <span className="block w-16 h-1 bg-[var(--brand-orange)]" />
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
              The team
            </p>
          </div>
          <h2
            id="team-heading"
            className="mt-5 text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-bold tracking-tight text-[var(--brand-black)]"
          >
            Meet the people behind the work.
          </h2>
        </div>
        <p className="max-w-xl text-base leading-relaxed text-[var(--text-soft)]">
          Ideas, production craft and close attention to detail — brought
          together under one roof in our Bucharest studio.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {TEAM_PORTRAITS.map((portrait, index) => (
          <div
            key={portrait.src}
            className={`relative aspect-[3/4] overflow-hidden rounded-2xl sm:rounded-3xl bg-[var(--surface-soft)] ${
              index === TEAM_PORTRAITS.length - 1
                ? "col-span-2 md:col-span-1"
                : ""
            }`}
          >
            <Image
              src={portrait.src}
              alt={portrait.alt}
              fill
              sizes={
                index === TEAM_PORTRAITS.length - 1
                  ? "(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 100vw"
                  : "(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
              }
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
