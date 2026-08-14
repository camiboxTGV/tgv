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
    slug: "technical-consultancy-product-design",
    title: "Technical Consultancy & Product Design",
    summary:
      "Turning bold concepts into production-ready physical products through two decades of technical expertise.",
    lead:
      "We analyse build feasibility, select the right substrates, and optimise production workflows for cost-efficient, flawless execution.",
    useCases: [
      "Material selection, structurally sound engineering, and structural layout",
      "Bespoke development for unique 3D items, custom packaging, and tailored POSM displays",
      "Production workflow optimisation for medium-to-large volumes",
      "Turnkey technical planning for non-standard, custom projects",
    ],
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  },
  {
    slug: "graphic-design-prepress",
    title: "Graphic Design & Prepress (DTP)",
    summary:
      "Bridging the gap between digital artwork and physical substrate with absolute precision.",
    lead:
      "Creative graphic design, rigorous prepress checking, vector optimisation, and strict colour calibration keep every brand asset consistent across different materials.",
    useCases: [
      "Vector optimisation and line-work preparation for clean laser engraving and CNC cutting",
      "Prepress blueprint checking, file validation, and layout formatting",
      "Colour management and multi-substrate chromatic calibration for exact brand colours",
      "Adapting brand assets for complex production methods and custom packaging",
    ],
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
  },
  {
    slug: "custom-production-integrated-branding",
    title: "Custom Production & Integrated Branding",
    summary:
      "Nine core manufacturing techniques combine to build what does not exist in standard catalogues.",
    lead:
      "We fabricate from the ground up in wood, acrylic, metals, and composite substrates, with premium personalisation for corporate gifting, awards, and architectural signage.",
    useCases: [
      "Brand-shaped retail displays, signage, and bespoke POSM pieces",
      "Custom packaging structures in non-standard shapes and formats",
      "Event activations, architectural props, and specialised brand installations",
      "Premium corporate gifts, milestone awards, and limited-edition trophies",
      "Functional prototypes and small-to-medium batch product runs",
    ],
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    techniques: [
      {
        slug: "co2-laser-engraving-cutting",
        title: "CO2 laser",
        description: "Engraving and clean cutting for non-metallic materials.",
      },
      {
        slug: "fiber-laser-engraving",
        title: "Fiber laser",
        description: "Permanent, detailed marking for metals and engineering plastics.",
      },
      {
        slug: "uv-printing-direct-to-object",
        title: "Direct UV print",
        description: "Full-colour printing directly onto rigid and flexible objects.",
      },
      {
        slug: "3d-printing",
        title: "3D print & CNC cutting",
        description: "Rapid prototypes, custom parts, and digitally cut structures.",
      },
    ],
  },
  {
    slug: "production-printing-fine-bookbinding",
    title: "Production Printing & Fine Bookbinding",
    summary:
      "Industrial-grade print runs paired with artisanal finishing for high-impact editorial and corporate stationery.",
    lead:
      "High-resolution sheet-fed digital printing for short-to-medium runs, enhanced by premium embellishments and complete in-house finishing.",
    useCases: [
      "Business cards, stationery, brochures, and catalogues",
      "Traditional debossing, embossing, and hot foil stamping",
      "Hot-foil folders, metallic monograms, and luxury presentation packs",
      "Automated folding, stitching, perfect binding, and bespoke luxury box making",
    ],
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
  },
]

export const serviceSlugs: string[] = services.map((service) => service.slug)

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug)
}
