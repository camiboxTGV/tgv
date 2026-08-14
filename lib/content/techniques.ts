export interface Technique {
  slug: string
  title: string
  bestFor: string
  whatItIs: string
  applications: string
}

export const techniques: Technique[] = [
  {
    slug: "co2-laser-engraving-cutting",
    title: "CO2 Laser Engraving & Cutting",
    bestFor: "Wood, acrylic, leather, glass, cork, and textiles",
    whatItIs:
      "High-precision personalisation and cutting technology using a thermal laser beam.",
    applications:
      "Ideal for non-metallic materials including wood, acrylic, leather, glass, cork, and textiles, with extremely fine detail and clean edge cuts.",
  },
  {
    slug: "fiber-laser-engraving",
    title: "Fiber Laser Engraving",
    bestFor: "Metals, engineering plastics, instruments, and jewellery",
    whatItIs:
      "Next-generation laser technology specialised in processing hard surfaces.",
    applications:
      "Permanent, high-speed marking on steel, aluminium, brass, silver, and engineering plastics—ideal for industrial parts, premium instruments, and jewellery.",
  },
  {
    slug: "uv-printing-direct-to-object",
    title: "UV Printing (Direct-to-Object)",
    bestFor: "High-resolution, full-colour print on almost any surface",
    whatItIs:
      "Digital full-colour printing technology with instant curing under ultraviolet light.",
    applications:
      "Photo-quality customisation directly onto rigid or flexible plastics, metal, wood, glass, and leather, with exceptional scratch resistance.",
  },
  {
    slug: "debossing-hot-foil-stamping",
    title: "Debossing & Hot Foil Stamping",
    bestFor: "Leather, premium cardstock, packaging, and presentation pieces",
    whatItIs:
      "Traditional premium embellishment techniques using heat and pressure through a custom metal die.",
    applications:
      "Debossing creates a refined recessed effect, while hot foil adds a metallic gold, silver, or copper finish for a luxury visual impact.",
  },
  {
    slug: "3d-printing",
    title: "3D Printing",
    bestFor: "Rapid prototypes, custom parts, scale models, and complex objects",
    whatItIs:
      "Additive manufacturing technology that constructs objects layer by layer from a digital model.",
    applications:
      "Rapid prototyping, custom parts, scale models, technical components, and complex decorative objects that traditional methods cannot produce.",
  },
  {
    slug: "tangential-knife-cutting",
    title: "Tangential Knife Cutting (Digital Flatbed Die-Cutting)",
    bestFor: "Carton, greyboard, foam, magnetic sheet, and gasket materials",
    whatItIs:
      "Tool-based digital cutting on a CNC flatbed platform, entirely without heat.",
    applications:
      "A clean alternative to lasers for materials prone to burning or melting, with no smoke stains or melted residue.",
  },
  {
    slug: "production-digital-printing",
    title: "Production Digital Printing",
    bestFor: "Premium stationery, catalogues, collateral, and short-run packaging",
    whatItIs:
      "Industrial-grade, high-speed sheet-fed printing using high-resolution electrophotographic technology.",
    applications:
      "Short-to-medium runs of business cards, brochures, flyers, catalogues, and packaging with calibrated colour and fast turnaround.",
  },
  {
    slug: "bookbinding-print-finishing",
    title: "Bookbinding & Print Finishing",
    bestFor: "Bound publications, finished print, and bespoke presentation boxes",
    whatItIs:
      "The mechanical and manual process of structurally assembling printed materials.",
    applications:
      "Folding, stapling, perfect binding, artisanal decorative bookbinding, and custom box making that turn raw sheets into durable finished products.",
  },
  {
    slug: "mixed-manual-techniques",
    title: "Mixed Manual Techniques & Know-How (20 Years of Experience)",
    bestFor: "Complex, unconventional work that spans multiple production methods",
    whatItIs:
      "Our workshop signature: the art of combining technologies and manual techniques in unconventional ways.",
    applications:
      "Fine assembly, artisanal finishes, and ingenious technical solutions for projects that do not fit a single category, backed by two decades of production experience.",
  },
]
