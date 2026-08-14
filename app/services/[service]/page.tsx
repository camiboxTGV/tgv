import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ServiceDetailContent from "@/components/ServiceDetailContent"
import {
  getServiceBySlug,
  serviceSlugs,
  services,
} from "@/lib/content/services"

interface PageProps {
  params: Promise<{ service: string }>
}

export function generateStaticParams() {
  return serviceSlugs.map((service) => ({ service }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { service: slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) return { title: "Service — TGV-Media" }
  return {
    title: `${service.title} — TGV-Media`,
    description: service.summary,
  }
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { service: slug } = await params
  const service = getServiceBySlug(slug)
  if (!service) notFound()

  return (
    <ServiceDetailContent
      service={service}
      related={services.filter((candidate) => candidate.slug !== service.slug)}
    />
  )
}
