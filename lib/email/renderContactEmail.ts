import type { OfferItem } from "@/lib/offer/storage"
import {
  DEADLINE_PRESET_LABELS,
  QUANTITY_BUCKET_LABELS,
  type ContactPayload,
} from "@/lib/contact/types"
import type { RenderedEmail } from "@/lib/email/smtp"

export interface AttachmentSummary {
  filename: string
  size: number
}

const BRAND_ORANGE = "#FF6600"
const TEXT_PRIMARY = "#0F0F10"
const TEXT_SOFT = "#3C3C45"
const TEXT_MUTED = "#6F6F7A"
const BORDER = "#E2E1E8"
const SURFACE_SOFT = "#F1F0F5"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>")
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatPrice(value: number): string {
  return `€${value.toFixed(2)}`
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(date)
  } catch {
    return iso
  }
}

function variantLabel(item: OfferItem): string {
  return [item.colorName, item.sizeLabel].filter(Boolean).join(" · ")
}

function deadlineText(payload: ContactPayload): string {
  if (payload.deadlinePreset) {
    return DEADLINE_PRESET_LABELS[payload.deadlinePreset]
  }
  if (payload.deadlineDate) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "long",
        timeZone: "Europe/Bucharest",
      }).format(new Date(payload.deadlineDate))
    } catch {
      return payload.deadlineDate
    }
  }
  return "Not specified"
}

function quantityText(payload: ContactPayload): string | null {
  if (!payload.quantity) return null
  if (payload.quantity === "other") {
    return payload.quantityOther.trim().length > 0
      ? payload.quantityOther.trim()
      : "Other (not specified)"
  }
  return QUANTITY_BUCKET_LABELS[payload.quantity]
}

export function renderContactEmail(
  payload: ContactPayload,
  attachments: AttachmentSummary[],
): RenderedEmail {
  const hasProducts = payload.selectedProducts.length > 0
  const company = payload.company.trim().length > 0 ? payload.company.trim() : "no company"
  const subject = hasProducts
    ? `New brief — ${payload.name} (${company}) — ${payload.selectedProducts.length} product${payload.selectedProducts.length === 1 ? "" : "s"}`
    : `New brief — ${payload.name} (${company}) — general request`

  return {
    subject,
    html: renderHtml(payload, attachments),
    text: renderText(payload, attachments),
  }
}

function renderHtml(
  payload: ContactPayload,
  attachments: AttachmentSummary[],
): string {
  const hasProducts = payload.selectedProducts.length > 0
  const qty = quantityText(payload)

  const contactRows: string[] = [
    row("Name", escapeHtml(payload.name)),
    row(
      "Email",
      `<a href="mailto:${escapeHtml(payload.email)}" style="color:${BRAND_ORANGE};text-decoration:none;">${escapeHtml(payload.email)}</a>`,
    ),
  ]
  if (payload.phone.trim().length > 0) {
    contactRows.push(row("Phone", escapeHtml(payload.phone)))
  }
  if (payload.company.trim().length > 0) {
    contactRows.push(row("Company", escapeHtml(payload.company)))
  }
  contactRows.push(row("Deadline", escapeHtml(deadlineText(payload))))
  if (!hasProducts && qty) {
    contactRows.push(row("Quantity estimate", escapeHtml(qty)))
  }

  const productsBlock = hasProducts
    ? renderProductsTable(payload.selectedProducts)
    : ""

  const attachmentsBlock =
    attachments.length > 0
      ? `<h3 style="margin:24px 0 8px;font-family:Arial,sans-serif;font-size:14px;color:${TEXT_PRIMARY};">Attachments (${attachments.length})</h3>
         <ul style="margin:0 0 16px 20px;padding:0;font-family:Arial,sans-serif;font-size:13px;color:${TEXT_SOFT};line-height:1.6;">
           ${attachments.map((a) => `<li>${escapeHtml(a.filename)} <span style="color:${TEXT_MUTED};">(${formatBytes(a.size)})</span></li>`).join("")}
         </ul>`
      : ""

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F6F5F9;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:Arial,sans-serif;color:${TEXT_PRIMARY};">
    <div style="height:4px;background:${BRAND_ORANGE};border-radius:2px;"></div>
    <h1 style="margin:20px 0 4px;font-size:22px;color:${TEXT_PRIMARY};">New contact brief</h1>
    <p style="margin:0 0 20px;font-size:13px;color:${TEXT_MUTED};">Submitted ${escapeHtml(formatTimestamp(payload.submittedAt))} (Europe/Bucharest)</p>

    <div style="padding:16px 20px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${contactRows.join("")}
      </table>
    </div>

    <h3 style="margin:24px 0 8px;font-size:14px;color:${TEXT_PRIMARY};">Message</h3>
    <div style="padding:16px 20px;background:${SURFACE_SOFT};border:1px solid ${BORDER};border-radius:12px;font-size:14px;line-height:1.6;color:${TEXT_SOFT};">${nl2br(payload.context)}</div>

    ${productsBlock}
    ${attachmentsBlock}

    <p style="margin:24px 0 0;font-size:12px;color:${TEXT_MUTED};">Reply to this email to reach ${escapeHtml(payload.name)} directly.</p>
  </div>
</body>
</html>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;width:140px;vertical-align:top;font-size:13px;color:${TEXT_MUTED};">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};">${value}</td>
  </tr>`
}

function renderProductsTable(items: OfferItem[]): string {
  let total = 0
  let hasAnyPrice = false
  const rows = items
    .map((item) => {
      const variant = variantLabel(item)
      const unit = item.priceSnapshot
      const subtotal = typeof unit === "number" ? unit * item.quantity : null
      if (typeof subtotal === "number") {
        total += subtotal
        hasAnyPrice = true
      }
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_PRIMARY};vertical-align:top;">
          <div style="font-weight:600;">${escapeHtml(item.name)}</div>
          <div style="font-size:12px;color:${TEXT_MUTED};">${escapeHtml(item.category)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_SOFT};vertical-align:top;">${variant ? escapeHtml(variant) : "&mdash;"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_PRIMARY};vertical-align:top;text-align:right;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_SOFT};vertical-align:top;text-align:right;">${typeof unit === "number" ? formatPrice(unit) : "&mdash;"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_PRIMARY};vertical-align:top;text-align:right;font-weight:600;">${typeof subtotal === "number" ? formatPrice(subtotal) : "&mdash;"}</td>
      </tr>`
    })
    .join("")

  const totalRow = hasAnyPrice
    ? `<tr>
        <td colspan="4" style="padding:12px;font-size:13px;color:${TEXT_MUTED};text-align:right;text-transform:uppercase;letter-spacing:0.08em;">Indicative total (ex. VAT)</td>
        <td style="padding:12px;font-size:14px;color:${TEXT_PRIMARY};font-weight:700;text-align:right;">${formatPrice(total)}</td>
       </tr>`
    : ""

  return `<h3 style="margin:24px 0 8px;font-size:14px;color:${TEXT_PRIMARY};">Selected products (${items.length})</h3>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:${SURFACE_SOFT};">
          <th align="left" style="padding:10px 12px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Product</th>
          <th align="left" style="padding:10px 12px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Variant</th>
          <th align="right" style="padding:10px 12px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
          <th align="right" style="padding:10px 12px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Unit</th>
          <th align="right" style="padding:10px 12px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}${totalRow}</tbody>
    </table>
    <p style="margin:8px 0 0;font-size:11px;color:${TEXT_MUTED};">Prices are indicative snapshots captured when the customer built the offer. Final quote is issued manually.</p>`
}

function renderText(
  payload: ContactPayload,
  attachments: AttachmentSummary[],
): string {
  const hasProducts = payload.selectedProducts.length > 0
  const qty = quantityText(payload)
  const lines: string[] = []
  lines.push("NEW CONTACT BRIEF")
  lines.push(`Submitted ${formatTimestamp(payload.submittedAt)} (Europe/Bucharest)`)
  lines.push("")
  lines.push(`Name:     ${payload.name}`)
  lines.push(`Email:    ${payload.email}`)
  if (payload.phone.trim()) lines.push(`Phone:    ${payload.phone}`)
  if (payload.company.trim()) lines.push(`Company:  ${payload.company}`)
  lines.push(`Deadline: ${deadlineText(payload)}`)
  if (!hasProducts && qty) lines.push(`Quantity: ${qty}`)
  lines.push("")
  lines.push("Message:")
  lines.push(payload.context)
  lines.push("")

  if (hasProducts) {
    let total = 0
    let hasAnyPrice = false
    lines.push(`Selected products (${payload.selectedProducts.length}):`)
    for (const item of payload.selectedProducts) {
      const variant = variantLabel(item)
      const unit = item.priceSnapshot
      const subtotal = typeof unit === "number" ? unit * item.quantity : null
      if (typeof subtotal === "number") {
        total += subtotal
        hasAnyPrice = true
      }
      const parts = [
        `- ${item.name}`,
        variant ? `(${variant})` : null,
        `× ${item.quantity}`,
        typeof unit === "number" ? `@ ${formatPrice(unit)}` : null,
        typeof subtotal === "number" ? `= ${formatPrice(subtotal)}` : null,
      ].filter(Boolean)
      lines.push(parts.join(" "))
    }
    if (hasAnyPrice) {
      lines.push("")
      lines.push(`Indicative total (ex. VAT): ${formatPrice(total)}`)
    }
    lines.push("")
  }

  if (attachments.length > 0) {
    lines.push(`Attachments (${attachments.length}):`)
    for (const a of attachments) {
      lines.push(`- ${a.filename} (${formatBytes(a.size)})`)
    }
    lines.push("")
  }

  return lines.join("\n")
}
