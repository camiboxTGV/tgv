export const SUPPORTED_LOCALES = ["ro", "en"] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_STORAGE_KEY = "tgv-media-locale"

export function isLocale(value: unknown): value is Locale {
  return value === "ro" || value === "en"
}
