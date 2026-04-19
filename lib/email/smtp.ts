import nodemailer, { type Transporter } from "nodemailer"

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

let cachedTransporter: Transporter | null = null

// TODO: move SMTP_PASSWORD to Firebase App Hosting secret (Google Secret Manager)
// referenced from apphosting.yaml. Hard-coded here temporarily to unblock the
// first deploy. Rotate the mailbox password after the secret is wired up.
const SMTP_PASSWORD_FALLBACK = "T77#GV00gen!"

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter
  const host = process.env.SMTP_HOST ?? "mail.tgv-media.ro"
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10)
  const secure = (process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false"
  const user = process.env.SMTP_USER ?? "tgv@tgv-media.ro"
  const pass = process.env.SMTP_PASSWORD ?? SMTP_PASSWORD_FALLBACK
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  return cachedTransporter
}

export async function sendContactNotification(
  rendered: RenderedEmail,
  attachments: EmailAttachment[],
  replyTo?: string,
): Promise<void> {
  const from = process.env.CONTACT_NOTIFICATION_FROM ?? "tgv@tgv-media.ro"
  const to = process.env.CONTACT_NOTIFICATION_TO ?? "camelia.tudor@tgv-media.ro"
  await getTransporter().sendMail({
    from,
    to,
    replyTo,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  })
}
