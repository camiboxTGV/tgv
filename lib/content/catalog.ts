export type Personalization = "co2" | "fiber-laser" | "uv-print" | "uv-transfer"

export const PERSONALIZATION_LABELS: Record<
  Personalization,
  { label: string; short: string }
> = {
  "co2": { label: "Gravură CO2", short: "CO2" },
  "fiber-laser": { label: "Gravură fiber laser", short: "Fiber" },
  "uv-print": { label: "Print UV", short: "UV print" },
  "uv-transfer": { label: "Transfer UV", short: "UV transfer" },
}

export interface CatalogCategory {
  slug: string
  name: string
  description: string
  accent: string
}

export interface CatalogProduct {
  slug: string
  name: string
  category: string
  summary: string
  accent: string
  personalizations: Personalization[]
}

export const categories: CatalogCategory[] = [
  {
    slug: "drinkware",
    name: "Drinkware",
    description:
      "Mugs, bottles, tumblers and barware ready for laser, UV print or transfer decoration.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  },
  {
    slug: "office-desk",
    name: "Office & desk",
    description:
      "Notebooks, pens, mousepads and the everyday objects that carry your brand into daily use.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
  },
  {
    slug: "tech-travel",
    name: "Tech & travel",
    description:
      "Powerbanks, USB sticks, bags and cables — useful gear with on-brand finishing.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
  },
  {
    slug: "apparel-accessories",
    name: "Apparel & accessories",
    description:
      "Caps, t-shirts and lanyards. Decoration set varies — talk to us about the right technique.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
  },
  {
    slug: "awards-gifting",
    name: "Awards & gifting",
    description:
      "Glass awards, plaques and curated gift sets for milestones, recognition and partner programs.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
  },
  {
    slug: "event-promo",
    name: "Event & promo",
    description:
      "Badges, wristbands, signage props and event-day essentials for activations and conferences.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  },
]

export const products: CatalogProduct[] = [
  // Drinkware
  {
    slug: "ceramic-mug-classic",
    name: "Ceramic mug — classic",
    category: "drinkware",
    summary: "11oz ceramic mug, glossy white. Wraps and full-colour artwork supported.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    personalizations: ["uv-print", "uv-transfer"],
  },
  {
    slug: "stainless-bottle-500",
    name: "Stainless bottle — 500ml",
    category: "drinkware",
    summary: "Double-wall stainless bottle, matte finish. Fiber-laser engraving for permanence.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["fiber-laser", "uv-transfer"],
  },
  {
    slug: "bamboo-travel-mug",
    name: "Bamboo travel mug",
    category: "drinkware",
    summary: "Bamboo body with leak-proof lid. CO2 engraving for natural-finish branding.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
    personalizations: ["co2", "uv-print"],
  },
  {
    slug: "glass-tumbler-300",
    name: "Glass tumbler — 300ml",
    category: "drinkware",
    summary: "Crystal-clear glass tumbler. UV print for full-colour brand graphics.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["uv-print"],
  },
  {
    slug: "copper-coated-mug",
    name: "Copper-coated mug",
    category: "drinkware",
    summary: "Mule-style copper-coated mug. Fiber laser produces deep, contrast-rich marks.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 60%, #4D4D4D 100%)",
    personalizations: ["fiber-laser"],
  },
  {
    slug: "thermal-flask-1l",
    name: "Thermal flask — 1L",
    category: "drinkware",
    summary: "Stainless 1L flask for the road. Fiber-laser side panel branding.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["fiber-laser", "uv-transfer"],
  },

  // Office & desk
  {
    slug: "hardcover-notebook-a5",
    name: "Hardcover notebook — A5",
    category: "office-desk",
    summary: "Linen-bound A5 notebook with elastic closure. Foil or laser logo on the front.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    personalizations: ["co2", "uv-print"],
  },
  {
    slug: "softcover-notebook-a6",
    name: "Softcover notebook — A6",
    category: "office-desk",
    summary: "Pocket-format softcover, recycled paper. UV print or CO2 engraving.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["co2", "uv-print"],
  },
  {
    slug: "metal-pen-classic",
    name: "Metal pen — classic",
    category: "office-desk",
    summary: "Brushed-metal pen with twist mechanism. Fiber-laser engraving along the barrel.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
    personalizations: ["fiber-laser"],
  },
  {
    slug: "leather-mousepad",
    name: "Leather mousepad",
    category: "office-desk",
    summary: "PU leather mousepad, stitched edge. CO2 engraving for crisp logo recess.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["co2"],
  },
  {
    slug: "wooden-pen-holder",
    name: "Wooden pen holder",
    category: "office-desk",
    summary: "Solid-oak desktop pen holder. CO2 engraving on the front face.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["co2"],
  },
  {
    slug: "cork-coaster-set",
    name: "Cork coaster set",
    category: "office-desk",
    summary: "Set of four natural cork coasters. CO2 engraving for textured branding.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    personalizations: ["co2", "uv-print"],
  },

  // Tech & travel
  {
    slug: "aluminium-powerbank-10000",
    name: "Aluminium powerbank — 10000mAh",
    category: "tech-travel",
    summary: "Brushed-aluminium body. Fiber-laser engraving for permanent, high-contrast logos.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["fiber-laser", "uv-print"],
  },
  {
    slug: "metal-usb-stick-32",
    name: "Metal USB stick — 32GB",
    category: "tech-travel",
    summary: "Compact stainless USB-C stick. Fiber-laser engraving on the cap.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    personalizations: ["fiber-laser"],
  },
  {
    slug: "canvas-laptop-sleeve",
    name: "Canvas laptop sleeve",
    category: "tech-travel",
    summary: "Padded canvas sleeve for 14\" laptops. UV transfer for full-colour artwork.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "braided-usb-c-cable",
    name: "Braided USB-C cable",
    category: "tech-travel",
    summary: "1m braided cable with metal housings. Fiber-laser engraving on the connector body.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    personalizations: ["fiber-laser"],
  },
  {
    slug: "cabin-luggage-tag",
    name: "Cabin luggage tag",
    category: "tech-travel",
    summary: "PU leather tag with metal plate. Combine fiber laser and UV print.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["fiber-laser", "uv-print"],
  },
  {
    slug: "wireless-charger-pad",
    name: "Wireless charger pad",
    category: "tech-travel",
    summary: "Slim Qi wireless pad with rubberized top. UV print for logo and accent colour.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["uv-print"],
  },

  // Apparel & accessories
  {
    slug: "woven-lanyard-20mm",
    name: "Woven lanyard — 20mm",
    category: "apparel-accessories",
    summary: "Polyester lanyard with safety breakaway. Sublimated full-colour design via UV transfer.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 60%, #0F0F10 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "structured-baseball-cap",
    name: "Structured baseball cap",
    category: "apparel-accessories",
    summary: "Cotton-twill 6-panel cap, structured front. UV transfer or embroidered patch.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "cotton-tshirt-180gsm",
    name: "Cotton t-shirt — 180gsm",
    category: "apparel-accessories",
    summary: "Mid-weight cotton tee, unisex fit. Full-colour UV transfer or screen print.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "enamel-pin-25mm",
    name: "Enamel pin — 25mm",
    category: "apparel-accessories",
    summary: "Hard-enamel pin, gold or silver plating. UV print for fine-detail accents.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    personalizations: ["uv-print"],
  },
  {
    slug: "cotton-tote-bag",
    name: "Cotton tote bag",
    category: "apparel-accessories",
    summary: "240gsm cotton tote with reinforced handles. UV transfer for high-volume runs.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "wool-beanie",
    name: "Wool beanie",
    category: "apparel-accessories",
    summary: "Acrylic-wool beanie, ribbed cuff. UV transfer label or woven patch.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["uv-transfer"],
  },

  // Awards & gifting
  {
    slug: "glass-award-rectangular",
    name: "Glass award — rectangular",
    category: "awards-gifting",
    summary: "Optical-quality glass on a black base. Deep CO2 engraving for crisp lettering.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["co2"],
  },
  {
    slug: "wooden-plaque-a4",
    name: "Wooden plaque — A4",
    category: "awards-gifting",
    summary: "Solid-walnut plaque with metal insert. Combine CO2 engraving and fiber laser.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
    personalizations: ["co2", "fiber-laser"],
  },
  {
    slug: "crystal-paperweight",
    name: "Crystal paperweight",
    category: "awards-gifting",
    summary: "Faceted crystal paperweight. Internal sub-surface engraving via CO2.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["co2"],
  },
  {
    slug: "leather-folio-a5",
    name: "Leather folio — A5",
    category: "awards-gifting",
    summary: "Full-grain leather folio with notepad. CO2 engraving on the front cover.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    personalizations: ["co2"],
  },
  {
    slug: "gift-set-executive",
    name: "Executive gift set",
    category: "awards-gifting",
    summary: "Pen, notebook and bottle in a custom box. Mix decoration techniques across items.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 60%, #4D4D4D 100%)",
    personalizations: ["co2", "fiber-laser", "uv-print"],
  },
  {
    slug: "metal-keyring-classic",
    name: "Metal keyring — classic",
    category: "awards-gifting",
    summary: "Solid-brass keyring with split ring. Fiber-laser engraving for permanent marks.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["fiber-laser"],
  },

  // Event & promo
  {
    slug: "tyvek-wristband",
    name: "Tyvek wristband",
    category: "event-promo",
    summary: "Single-use event wristband, full-colour print, tamper-evident closure.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
    personalizations: ["uv-print"],
  },
  {
    slug: "silicone-wristband",
    name: "Silicone wristband",
    category: "event-promo",
    summary: "Reusable silicone wristband, debossed or UV-printed branding.",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
    personalizations: ["uv-print"],
  },
  {
    slug: "id-badge-holder",
    name: "ID badge holder",
    category: "event-promo",
    summary: "Hard-plastic ID badge with retractable reel. UV print on the front insert.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #FF6600 100%)",
    personalizations: ["uv-print"],
  },
  {
    slug: "event-tote-light",
    name: "Event tote — light",
    category: "event-promo",
    summary: "Lightweight non-woven tote for conferences. UV transfer for high-volume runs.",
    accent: "linear-gradient(135deg, #FF6600 0%, #4D4D4D 100%)",
    personalizations: ["uv-transfer"],
  },
  {
    slug: "table-flag-mini",
    name: "Table flag — mini",
    category: "event-promo",
    summary: "Desk-format flag on a metal stand. UV print on fabric, CO2 on the base.",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 100%)",
    personalizations: ["co2", "uv-print"],
  },
  {
    slug: "acrylic-display-stand",
    name: "Acrylic display stand",
    category: "event-promo",
    summary: "Clear-acrylic counter display. CO2 engraving and UV print combine cleanly.",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #FF6600 100%)",
    personalizations: ["co2", "uv-print"],
  },
]

export const categorySlugs: string[] = categories.map((c) => c.slug)

export function getCategoryBySlug(slug: string): CatalogCategory | undefined {
  return categories.find((c) => c.slug === slug)
}

export function getProductsByCategory(slug: string): CatalogProduct[] {
  return products.filter((p) => p.category === slug)
}

export function getProductBySlug(slug: string): CatalogProduct | undefined {
  return products.find((p) => p.slug === slug)
}
