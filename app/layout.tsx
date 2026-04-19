import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import NavBar from "@/components/NavBar"
import Footer from "@/components/Footer"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "TGV-Media — Custom production. Nine techniques. One workflow.",
  description:
    "Full-service customization and promotional production. Nine in-house decoration techniques across apparel, print, signage, and promo products — from single-piece samples to 10,000+ unit runs.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
