export interface ServiceTechnique {
  slug: string
  title: string
  description: string
}

export interface Service {
  slug: string
  title: string
  summary: string
  lead: string
  useCases: string[]
  accent: string
  techniques?: ServiceTechnique[]
}

export const services: Service[] = [
  {
    slug: "personalizare-obiecte-promotionale",
    title: "Promotional object personalization",
    summary:
      "Decoration on demand for promotional products — laser, UV print and transfer applied to drinkware, tech, gifting and more.",
    lead:
      "Four decoration methods, one workflow. Send us the object and the artwork — we match the technique to the substrate and produce a sample before the run.",
    useCases: [
      "Conference giveaways with on-brand finishing",
      "Corporate gifting in low and mid volume",
      "Internal recognition awards and milestone gifts",
      "Retail product personalization runs",
      "Trade-show swag with consistent decoration across formats",
    ],
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    techniques: [
      {
        slug: "co2",
        title: "CO2 engraving",
        description:
          "Engraving on wood, leather, acrylic and coated surfaces. Clean, permanent and tactile.",
      },
      {
        slug: "fiber-laser",
        title: "Fiber laser engraving — metals",
        description:
          "High-contrast marking on metals — stainless steel, aluminium, anodized finishes and brass.",
      },
      {
        slug: "uv-print",
        title: "Print UV",
        description:
          "Full-colour UV-cured print directly on rigid substrates — pens, hardware and flat objects.",
      },
      {
        slug: "uv-transfer",
        title: "Transfer UV",
        description:
          "UV-printed transfers applied to curved or irregular surfaces where direct print can't reach.",
      },
    ],
  },
  {
    slug: "timbru-sec-si-folio",
    title: "Embossing & foil stamping",
    summary:
      "Embossing, debossing and hot-foil finishing for premium print and packaging.",
    lead:
      "Tactile finishing that signals quality before anyone reads a word. We pair foil and emboss tooling with our own print to keep registration tight.",
    useCases: [
      "Business card embossing and gold-foil monograms",
      "Hot-foil branded folders and presentation packs",
      "Luxury packaging with deboss + foil combinations",
      "Wedding and event stationery",
      "Premium invitations and direct-mail pieces",
    ],
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
  },
  {
    slug: "productie-custom",
    title: "Custom production",
    summary:
      "Bespoke fabrication — when the catalog item doesn't exist, we build it from substrate up.",
    lead:
      "Display props, custom-shaped packaging, point-of-sale pieces, awards from raw stock. We engineer the build, source the materials and finish in-house.",
    useCases: [
      "Brand-shaped retail displays and POS",
      "Custom packaging in non-standard formats",
      "Event activations with bespoke signage and props",
      "Limited-edition awards and trophies",
      "Prototypes and small-batch product runs",
    ],
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
  },
  {
    slug: "tipar-digital",
    title: "Digital print",
    summary:
      "Short-run, full-colour digital print for stationery, marketing collateral and packaging proofs.",
    lead:
      "Calibrated colour and crisp text on paper, card and synthetic stocks. Ideal for variable data, fast turnarounds and small editions.",
    useCases: [
      "Business cards and stationery",
      "Brochures, flyers and event programmes",
      "Catalogues and brand books",
      "Packaging proofs and short-run editions",
      "Direct mail with variable data",
    ],
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
  },
]

export const serviceSlugs: string[] = services.map((s) => s.slug)

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug)
}
