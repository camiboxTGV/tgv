"use client"

import { useLanguage } from "@/components/LanguageProvider"
import { getPriceDisclosure } from "@/lib/pricing/disclosure"

type NoticeVariant = "compact" | "shippingOnly" | "detailed"

interface Props {
  variant?: NoticeVariant
  className?: string
}

export default function PriceScopeNotice({
  variant = "compact",
  className,
}: Readonly<Props>) {
  const { locale } = useLanguage()
  const copy = getPriceDisclosure(locale)

  return <p className={className}>{copy[variant]}</p>
}
