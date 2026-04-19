export interface Service {
  slug: string
  title: string
  summary: string
  bullets: string[]
}

export const services: Service[] = [
  {
    slug: "apparel",
    title: "Branded Apparel & Merch",
    summary:
      "Decorated apparel for teams, campaigns and uniform programs — produced consistently across runs.",
    bullets: [
      "T-shirts, hoodies & polos",
      "Caps, beanies & headwear",
      "Workwear & uniform programs",
    ],
  },
  {
    slug: "print",
    title: "Print Collateral",
    summary:
      "Stationery, sales tools and event collateral printed with calibrated colour and proper finishing.",
    bullets: [
      "Business cards & stationery",
      "Brochures, flyers & catalogues",
      "Folders & presentation packs",
    ],
  },
  {
    slug: "signage",
    title: "Large-Format & Signage",
    summary:
      "Banners, displays and environmental graphics built to read clearly at any distance and last on site.",
    bullets: [
      "Roll-up & pull-up banners",
      "Trade show & event displays",
      "Window graphics & wayfinding",
    ],
  },
  {
    slug: "promo",
    title: "Promotional Products",
    summary:
      "Tactile, useful giveaway products decorated to keep your brand in daily rotation.",
    bullets: [
      "Drinkware & desk accessories",
      "Tech & travel giveaways",
      "Event swag & gift sets",
    ],
  },
  {
    slug: "packaging",
    title: "Packaging & Labels",
    summary:
      "Retail-ready packaging, labels and presentation pieces that protect product and carry the brand.",
    bullets: [
      "Custom printed boxes",
      "Product labels & stickers",
      "Sleeves & presentation packaging",
    ],
  },
  {
    slug: "design-to-production",
    title: "Design to Production",
    summary:
      "Artwork preparation, proofing and production handled in one workflow — no handoffs between vendors.",
    bullets: [
      "Artwork preparation & vectorising",
      "Print proofing & colour matching",
      "Production, finishing & dispatch",
    ],
  },
]
