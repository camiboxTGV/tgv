import type { OfferItem } from "@/lib/offer/storage"

export type QuantityBucket = "1-50" | "50-500" | "500-5000" | "5000+" | "other"
export type DeadlinePreset = "2-weeks" | "1-month" | "2-3-months" | "flexible"

export const QUANTITY_BUCKET_LABELS: Record<QuantityBucket, string> = {
  "1-50": "1–50 units",
  "50-500": "50–500 units",
  "500-5000": "500–5,000 units",
  "5000+": "5,000+ units",
  other: "Other",
}

export const DEADLINE_PRESET_LABELS: Record<DeadlinePreset, string> = {
  "2-weeks": "Within 2 weeks",
  "1-month": "Within 1 month",
  "2-3-months": "2–3 months",
  flexible: "Flexible",
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_TOTAL_UPLOAD_BYTES = 35 * 1024 * 1024

export const ACCEPTED_FILE_EXTENSIONS = [
  ".ai",
  ".eps",
  ".svg",
  ".pdf",
  ".png",
  ".tiff",
  ".tif",
  ".jpg",
  ".jpeg",
  ".psd",
  ".indd",
] as const

export const ACCEPT_FILES_ATTR = ACCEPTED_FILE_EXTENSIONS.join(",")

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_CONTEXT_CHARS = 20
export const MAX_CONTEXT_CHARS = 2000

export const QUANTITY_BUCKETS: QuantityBucket[] = [
  "1-50",
  "50-500",
  "500-5000",
  "5000+",
  "other",
]

export const DEADLINE_PRESETS: DeadlinePreset[] = [
  "2-weeks",
  "1-month",
  "2-3-months",
  "flexible",
]

export interface ContactPayload {
  name: string
  email: string
  phone: string
  company: string
  quantity: QuantityBucket | null
  quantityOther: string
  deadlinePreset: DeadlinePreset | null
  deadlineDate: string
  context: string
  selectedProducts: OfferItem[]
  submittedAt: string
}
