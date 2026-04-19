export type PortfolioCategory =
  | "signage-display"
  | "apparel"
  | "packaging-print"
  | "promo-merch"
  | "awards-gifting"
  | "custom-fabrication"

export interface PortfolioItem {
  slug: string
  title: string
  category: PortfolioCategory
  summary: string
  accent: string
}

export const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  "signage-display": "Signage & display",
  "apparel": "Apparel & embroidery",
  "packaging-print": "Packaging & print",
  "promo-merch": "Promotional & merch",
  "awards-gifting": "Awards & gifting",
  "custom-fabrication": "Custom fabrication",
}

export const portfolio: PortfolioItem[] = [
  {
    slug: "event-signage-suite",
    title: "Event signage suite",
    category: "signage-display",
    summary:
      "Roll-ups, backdrops and wayfinding produced as a coordinated set for a multi-day conference.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  },
  {
    slug: "apparel-launch-kit",
    title: "Apparel launch kit",
    category: "apparel",
    summary:
      "Embroidered caps, transfer-printed t-shirts and woven labels packed as a full team kit.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 60%, #FF6600 100%)",
  },
  {
    slug: "retail-packaging-system",
    title: "Retail packaging system",
    category: "packaging-print",
    summary:
      "Custom rigid boxes with foil monogram and matte lamination for a seasonal product launch.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  },
  {
    slug: "executive-gift-program",
    title: "Executive gift program",
    category: "awards-gifting",
    summary:
      "Engraved leather folio, brass keyring and notebook curated into a recipient-ready gift box.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
  },
  {
    slug: "trade-show-booth-graphics",
    title: "Trade-show booth graphics",
    category: "signage-display",
    summary:
      "Modular booth panels, fabric backwall and pop-up banner produced to a single colour spec.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
  },
  {
    slug: "uniform-program-rollout",
    title: "Uniform program rollout",
    category: "apparel",
    summary:
      "Polo shirts, softshells and caps decorated and sized for a phased multi-location rollout.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
  },
  {
    slug: "limited-edition-glass-awards",
    title: "Limited-edition glass awards",
    category: "awards-gifting",
    summary:
      "Optical-glass trophies with deep CO2 sub-surface engraving for a recognition programme.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
  },
  {
    slug: "drinkware-corporate-gifting",
    title: "Drinkware corporate gifting",
    category: "promo-merch",
    summary:
      "Stainless bottles and ceramic mugs decorated with fiber-laser engraving and UV-printed wraps.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 60%, #4D4D4D 100%)",
  },
  {
    slug: "brand-launch-collateral",
    title: "Brand launch collateral",
    category: "packaging-print",
    summary:
      "Catalogues, business cards and folders produced together so paper stock and finish stay aligned.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 60%, #0F0F10 100%)",
  },
  {
    slug: "retail-pos-display",
    title: "Retail POS display",
    category: "custom-fabrication",
    summary:
      "Acrylic and timber counter unit fabricated and finished in-house for a seasonal in-store promo.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  },
  {
    slug: "event-wristband-program",
    title: "Event wristband program",
    category: "promo-merch",
    summary:
      "Tyvek and silicone wristbands printed with sequential numbering for a multi-tier festival.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
  },
  {
    slug: "bespoke-product-prototypes",
    title: "Bespoke product prototypes",
    category: "custom-fabrication",
    summary:
      "Small-batch prototype run for a packaging concept — from tooling through finished sample units.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  },
]

export const featuredPortfolio: PortfolioItem[] = portfolio.slice(0, 3)
