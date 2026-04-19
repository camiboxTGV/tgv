import type { Metadata } from "next"
import { Suspense } from "react"
import ContactHero from "@/components/contact/ContactHero"
import ContactForm from "@/components/contact/ContactForm"

export const metadata: Metadata = {
  title: "Contact — TGV-Media",
  description:
    "Brief us on your project. Send artwork, selected products and event context — we respond within 1 business day with a quote and a sample plan.",
}

export default function ContactPage() {
  return (
    <section className="mx-auto px-6 lg:px-8 pt-16 pb-24 lg:pt-20 lg:pb-32 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-8 lg:gap-12">
        <ContactHero />
        <Suspense fallback={null}>
          <ContactForm />
        </Suspense>
      </div>
    </section>
  )
}
