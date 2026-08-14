export type PortfolioCategory =
  | "signage-display"
  | "luxury-packaging-out-of-box"
  | "brand-assets-premium-print"
  | "corporate-identity-gifts"
  | "special-projects-prototyping"

export interface PortfolioItem {
  slug: string
  title: string
  category: PortfolioCategory
  summary: string
  image: string
  imageAlt: string
}

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  "signage-display": "SIGNAGE & DISPLAY",
  "luxury-packaging-out-of-box": "Luxury Packaging & Out of Box",
  "brand-assets-premium-print": "Brand Assets & Premium Print",
  "corporate-identity-gifts": "Corporate Identity & Gifts",
  "special-projects-prototyping": "Special Projects & Prototyping",
}

export const PORTFOLIO_CATEGORY_ORDER: PortfolioCategory[] = [
  "signage-display",
  "luxury-packaging-out-of-box",
  "brand-assets-premium-print",
  "corporate-identity-gifts",
  "special-projects-prototyping",
]

export const PORTFOLIO_CATEGORY_DESCRIPTIONS: Record<
  PortfolioCategory,
  string
> = {
  "signage-display":
    "Office branding, retail interiors, dimensional lettering, custom CNC or laser-cut logos, wayfinding, backdrops, and architectural brand elements.",
  "luxury-packaging-out-of-box":
    "Rigid magnetic boxes, presentation trays, custom sleeves, and premium structures finished with debossing or hot foil.",
  "brand-assets-premium-print":
    "Brand books, catalogues, hand-bound materials, luxury menus, and production printing on fine creative papers.",
  "corporate-identity-gifts":
    "Curated onboarding kits, executive gifts, and premium promotional pieces with detailed metal engraving or leather debossing.",
  "special-projects-prototyping":
    "One-off installations, scale models, 3D-printed parts with manual finishes, and structural projects built on two decades of know-how.",
}

export const portfolio: PortfolioItem[] = [
  {
    slug: "bespoke-retail-event-displays",
    title: "Bespoke retail & event displays",
    category: "signage-display",
    summary:
      "Dimensional acrylic lettering and display elements engineered, cut, and assembled for branded environments.",
    image: "/images/portfolio/signage-acrylic-lettering.png",
    imageAlt: "Custom laser-cut acrylic dimensional lettering",
  },
  {
    slug: "high-end-gift-recognition-kits",
    title: "High-end gift & recognition kits",
    category: "corporate-identity-gifts",
    summary:
      "A precision-made recognition award combining clear and coloured acrylic with direct engraving.",
    image: "/images/portfolio/corporate-award.png",
    imageAlt: "Custom red and clear acrylic corporate award",
  },
  {
    slug: "artcraft-project",
    title: "Artcraft project",
    category: "special-projects-prototyping",
    summary:
      "A playful, brand-shaped desk object that combines digital cutting, print, and detailed manual assembly.",
    image: "/images/portfolio/artcraft-flower-pen.png",
    imageAlt: "Custom flower-shaped pen and holder artcraft project",
  },
  {
    slug: "bespoke-snow-globe",
    title: "Bespoke architectural snow globe",
    category: "corporate-identity-gifts",
    summary:
      "A miniature branded environment developed as a memorable seasonal corporate gift.",
    image: "/images/portfolio/custom-snow-globe.png",
    imageAlt: "Custom snow globe with a miniature branded building",
  },
  {
    slug: "premium-passport-cover",
    title: "Premium passport presentation set",
    category: "brand-assets-premium-print",
    summary:
      "A tactile passport cover with precise typography, gold detailing, and a coordinated insert.",
    image: "/images/portfolio/premium-passport-cover.png",
    imageAlt: "Green premium passport cover with gold lettering",
  },
  {
    slug: "cinema-gift-kit",
    title: "Cinema-themed presentation kit",
    category: "corporate-identity-gifts",
    summary:
      "Custom-cut cinema objects assembled into an experiential gift and presentation concept.",
    image: "/images/portfolio/cinema-gift-kit.png",
    imageAlt: "Cinema-themed corporate gift objects",
  },
  {
    slug: "camera-prototype",
    title: "Interactive camera prototype",
    category: "special-projects-prototyping",
    summary:
      "A functional one-off structure produced from digitally cut panels and manually assembled mechanisms.",
    image: "/images/portfolio/camera-prototype.png",
    imageAlt: "Black custom-built camera prototype",
  },
  {
    slug: "luxury-game-packaging",
    title: "Playful structural packaging",
    category: "luxury-packaging-out-of-box",
    summary:
      "A custom box with fitted dividers, interactive components, and a fully branded unboxing experience.",
    image: "/images/portfolio/luxury-game-packaging.png",
    imageAlt: "Custom cardboard game packaging with fitted inserts",
  },
  {
    slug: "premium-brand-book",
    title: "Premium brand book system",
    category: "brand-assets-premium-print",
    summary:
      "Colour-critical printed collateral designed as a coordinated, high-impact presentation set.",
    image: "/images/portfolio/brand-book-print.png",
    imageAlt: "Premium printed brand books with colour gradients",
  },
  {
    slug: "3d-printed-prototype",
    title: "3D-printed functional prototype",
    category: "special-projects-prototyping",
    summary:
      "A complex nested object rapidly prototyped, refined, and finished for presentation.",
    image: "/images/portfolio/3d-printed-object.png",
    imageAlt: "Orange 3D-printed nested prototype",
  },
  {
    slug: "gold-dimensional-lettering",
    title: "Gold dimensional identity lettering",
    category: "signage-display",
    summary:
      "Precision-cut dimensional lettering with a polished gold finish for a premium branded interior.",
    image: "/images/portfolio/signage-gold-lettering.png",
    imageAlt: "Gold dimensional logo and lettering",
  },
  {
    slug: "premium-packaging-detail",
    title: "Precision-cut presentation packaging",
    category: "luxury-packaging-out-of-box",
    summary:
      "Layered premium materials, sharp registration, and a tailored window reveal for a distinctive unboxing moment.",
    image: "/images/portfolio/premium-packaging-detail.png",
    imageAlt: "Purple custom packaging with precision-cut window",
  },
  {
    slug: "film-slate-detail",
    title: "Film identity production details",
    category: "brand-assets-premium-print",
    summary:
      "A close study in durable print, fine line work, and carefully aligned production details.",
    image: "/images/portfolio/film-slate-detail.png",
    imageAlt: "Printed film slate with precision details",
  },
]

export const featuredPortfolio: PortfolioItem[] = portfolio.slice(0, 3)
