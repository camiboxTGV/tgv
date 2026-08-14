import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Offer — TGV-Media",
  description:
    "Review selected products, adjust quantities and continue to your TGV-Media project brief.",
}

export default function OfferLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
