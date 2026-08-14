import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import NavBar from "@/components/NavBar"
import Footer from "@/components/Footer"
import OfferProvider from "@/components/OfferProvider"
import OfferDock from "@/components/OfferDock"
import OfferToast from "@/components/OfferToast"
import LanguageProvider from "@/components/LanguageProvider"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.tgv-media.ro"),
  title: "TGV-Media — Custom production. Nine techniques. One workflow.",
  description:
    "Technical consultancy, custom fabrication, premium print, and integrated branding powered by nine in-house production techniques.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <body className="flex flex-col min-h-screen">
        <LanguageProvider>
          <OfferProvider>
            <NavBar />
            <main className="flex-1">{children}</main>
            <Footer />
            <OfferDock />
            <OfferToast />
          </OfferProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
