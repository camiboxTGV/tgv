"use client"

import { useLanguage } from "@/components/LanguageProvider"

export default function LocalizedText({
  en,
  ro,
}: Readonly<{ en: string; ro: string }>) {
  const { locale } = useLanguage()
  return locale === "ro" ? ro : en
}
