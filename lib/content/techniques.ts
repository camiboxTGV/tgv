export interface Technique {
  slug: string
  title: string
  bestFor: string
}

export const techniques: Technique[] = [
  {
    slug: "screen-print",
    title: "Screen Printing",
    bestFor: "Large textile runs and bold colour blocks",
  },
  {
    slug: "dtf",
    title: "DTF Transfer",
    bestFor: "Full-colour artwork, gradients and short runs",
  },
  {
    slug: "embroidery",
    title: "Embroidery",
    bestFor: "Caps, polos, workwear and premium logos",
  },
  {
    slug: "uv",
    title: "UV Printing",
    bestFor: "Pens, hardware and flat rigid surfaces",
  },
  {
    slug: "pad",
    title: "Pad Printing",
    bestFor: "Curved and irregular surfaces",
  },
  {
    slug: "laser",
    title: "Laser Engraving",
    bestFor: "Metal, wood, leather and awards",
  },
  {
    slug: "sublimation",
    title: "Sublimation",
    bestFor: "Polyester sportswear, mugs and all-over prints",
  },
  {
    slug: "large-format",
    title: "Large-Format Digital",
    bestFor: "Banners, signage and vehicle graphics",
  },
  {
    slug: "offset-digital",
    title: "Offset & Digital Print",
    bestFor: "Paper collateral, brochures and business cards",
  },
]
