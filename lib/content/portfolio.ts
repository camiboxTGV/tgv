export interface PortfolioItem {
  slug: string
  title: string
  category: string
  accent: string
}

export const portfolio: PortfolioItem[] = [
  {
    slug: "event-signage-suite",
    title: "Event signage suite",
    category: "Large-format & display",
    accent: "linear-gradient(135deg, #FF6600 0%, #0F0F10 100%)",
  },
  {
    slug: "apparel-launch-kit",
    title: "Apparel launch kit",
    category: "Apparel & embroidery",
    accent: "linear-gradient(135deg, #0F0F10 0%, #4D4D4D 60%, #FF6600 100%)",
  },
  {
    slug: "retail-packaging-system",
    title: "Retail packaging system",
    category: "Packaging & print",
    accent: "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)",
  },
]

export const featuredPortfolio = portfolio
