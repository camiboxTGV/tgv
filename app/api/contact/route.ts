import { NextResponse } from "next/server"
import {
  ACCEPTED_FILE_EXTENSIONS,
  DEADLINE_PRESETS,
  EMAIL_REGEX,
  MAX_CONTEXT_CHARS,
  MAX_FILE_COUNT,
  MAX_FILE_BYTES,
  MAX_MULTIPART_BODY_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MIN_CONTEXT_CHARS,
  QUANTITY_BUCKETS,
  type ContactPayload,
  type DeadlinePreset,
  type QuantityBucket,
} from "@/lib/contact/types"
import { parseSelectedProducts } from "@/lib/contact/selected-products"
import {
  renderContactEmail,
  type AttachmentSummary,
} from "@/lib/email/renderContactEmail"
import { sendContactNotification, type EmailAttachment } from "@/lib/email/smtp"

export const runtime = "nodejs"

const MAX_CONCURRENT_CONTACT_REQUESTS = 2
let activeContactRequests = 0

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status })
}

function isValidQuantity(value: unknown): value is QuantityBucket | null {
  if (value === null) return true
  return typeof value === "string" && (QUANTITY_BUCKETS as string[]).includes(value)
}

function isValidDeadlinePreset(value: unknown): value is DeadlinePreset | null {
  if (value === null) return true
  return typeof value === "string" && (DEADLINE_PRESETS as string[]).includes(value)
}

class MultipartBodyTooLargeError extends Error {
  constructor() {
    super("Multipart request exceeds the upload limit")
    this.name = "MultipartBodyTooLargeError"
  }
}

async function parseMultipartFormData(request: Request): Promise<FormData> {
  if (!request.body) return request.formData()
  const contentType = request.headers.get("content-type")
  if (!contentType) throw new TypeError("Missing content type")

  let receivedBytes = 0
  const reader = request.body.getReader()
  const limitedBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      receivedBytes += value.byteLength
      if (receivedBytes > MAX_MULTIPART_BODY_BYTES) {
        await reader.cancel()
        controller.error(new MultipartBodyTooLargeError())
        return
      }
      controller.enqueue(value)
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })

  return new Response(limitedBody, {
    headers: { "Content-Type": contentType },
  }).formData()
}

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return ACCEPTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export async function POST(request: Request): Promise<Response> {
  if (activeContactRequests >= MAX_CONCURRENT_CONTACT_REQUESTS) {
    return NextResponse.json(
      { ok: false, error: "server_busy" },
      { status: 503, headers: { "Retry-After": "10" } },
    )
  }

  activeContactRequests += 1
  try {
    return await handleContactRequest(request)
  } finally {
    activeContactRequests -= 1
  }
}

async function handleContactRequest(request: Request): Promise<Response> {
  const rawContentLength = request.headers.get("content-length")
  if (rawContentLength !== null) {
    if (!/^\d+$/.test(rawContentLength)) return bad("invalid_form")
    const contentLength = Number(rawContentLength)
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength > MAX_MULTIPART_BODY_BYTES
    ) {
      return bad("upload_total_too_large", 413)
    }
  }

  let form: FormData
  try {
    form = await parseMultipartFormData(request)
  } catch (error) {
    if (error instanceof MultipartBodyTooLargeError) {
      return bad("upload_total_too_large", 413)
    }
    return bad("invalid_form")
  }

  const name = (form.get("name") ?? "").toString().trim()
  const email = (form.get("email") ?? "").toString().trim()
  const phone = (form.get("phone") ?? "").toString().trim()
  const company = (form.get("company") ?? "").toString().trim()
  const quantityRaw = form.get("quantity")
  const quantity =
    typeof quantityRaw === "string" && quantityRaw.length > 0 ? quantityRaw : null
  const quantityOther = (form.get("quantityOther") ?? "").toString().trim()
  const deadlinePresetRaw = form.get("deadlinePreset")
  const deadlinePreset =
    typeof deadlinePresetRaw === "string" && deadlinePresetRaw.length > 0
      ? deadlinePresetRaw
      : null
  const deadlineDate = (form.get("deadlineDate") ?? "").toString().trim()
  const context = (form.get("context") ?? "").toString()
  const selectedProducts = parseSelectedProducts(form.get("selectedProducts"))

  if (name.length === 0) return bad("name_required")
  if (!EMAIL_REGEX.test(email)) return bad("email_invalid")
  if (!isValidQuantity(quantity)) return bad("quantity_invalid")
  if (!isValidDeadlinePreset(deadlinePreset)) return bad("deadline_preset_invalid")
  if (deadlinePreset === null && deadlineDate.length === 0) {
    return bad("deadline_required")
  }
  if (deadlineDate.length > 0) {
    const parsed = new Date(deadlineDate)
    if (Number.isNaN(parsed.getTime())) return bad("deadline_date_invalid")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (parsed.getTime() < today.getTime()) return bad("deadline_date_past")
  }
  const contextTrimmed = context.trim()
  if (contextTrimmed.length < MIN_CONTEXT_CHARS) return bad("context_too_short")
  if (context.length > MAX_CONTEXT_CHARS) return bad("context_too_long")
  if (selectedProducts === null) return bad("products_invalid")

  const fileEntries = form.getAll("files").filter((v): v is File => v instanceof File)
  if (fileEntries.length > MAX_FILE_COUNT) return bad("too_many_files")
  let totalBytes = 0
  const attachments: EmailAttachment[] = []
  const summaries: AttachmentSummary[] = []
  for (const file of fileEntries) {
    if (file.size === 0) continue
    if (file.size > MAX_FILE_BYTES) return bad("file_too_large")
    if (!hasAllowedExtension(file.name)) return bad("file_type_not_allowed")
    totalBytes += file.size
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) return bad("upload_total_too_large")
    const arrayBuffer = await file.arrayBuffer()
    const content = Buffer.from(arrayBuffer)
    attachments.push({
      filename: file.name,
      content,
      contentType: file.type || undefined,
    })
    summaries.push({ filename: file.name, size: file.size })
  }

  const payload: ContactPayload = {
    name,
    email,
    phone,
    company,
    quantity: quantity as QuantityBucket | null,
    quantityOther,
    deadlinePreset: deadlinePreset as DeadlinePreset | null,
    deadlineDate,
    context,
    selectedProducts,
    submittedAt: new Date().toISOString(),
  }

  try {
    const rendered = renderContactEmail(payload, summaries)
    await sendContactNotification(rendered, attachments, email)
  } catch (err) {
    console.error("[contact] send failed", err instanceof Error ? err.message : err)
    return bad("send_failed", 502)
  }

  return NextResponse.json({ ok: true })
}
