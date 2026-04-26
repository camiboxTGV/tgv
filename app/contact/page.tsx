import type { Metadata } from "next"
import { Suspense } from "react"
import ContactHero from "@/components/contact/ContactHero"
import ContactForm from "@/components/contact/ContactForm"
import ContactDetails from "@/components/contact/ContactDetails"

export const metadata: Metadata = {
  title: "Contact — TGV-Media",
  description:
    "Brief us on your project. Send artwork, selected products and event context — we respond within 1 business day with a quote and a sample plan.",
}

interface ContactPageProps {
  readonly searchParams: Promise<{ from?: string }>
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { from } = await searchParams
  const fromOffer = from === "offer"

  const briefBlock = (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-12">
      <ContactHero />
      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>
    </div>
  )

  return (
    <section className="flex flex-col gap-16 lg:gap-20 mx-auto px-6 lg:px-8 pt-16 pb-24 lg:pt-20 lg:pb-32 max-w-7xl">
      {fromOffer ? briefBlock : <ContactDetails />}
      {fromOffer ? <ContactDetails /> : briefBlock}
    </section>
  )
}
