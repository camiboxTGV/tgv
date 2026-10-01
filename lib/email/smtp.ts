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

const SMTP_CONNECTION_TIMEOUT_MS = 15_000
const SMTP_GREETING_TIMEOUT_MS = 15_000
const SMTP_SOCKET_TIMEOUT_MS = 60_000

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  connectionTimeout: number
  greetingTimeout: number
  socketTimeout: number
}

type SmtpEnvironment = Readonly<Record<string, string | undefined>>

export function resolveSmtpConfig(env: SmtpEnvironment): SmtpConfig {
  const rawPort = (env.SMTP_PORT ?? "465").trim()
  if (!/^\d+$/.test(rawPort)) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535")
  }

  const port = Number(rawPort)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535")
  }

  const rawSecure = (env.SMTP_SECURE ?? "true").trim().toLowerCase()
  if (rawSecure !== "true" && rawSecure !== "false") {
    throw new Error('SMTP_SECURE must be either "true" or "false"')
  }

  const pass = env.SMTP_PASSWORD
  if (pass === undefined || pass.trim().length === 0) {
    throw new Error("SMTP_PASSWORD is required")
  }

  return {
    host: env.SMTP_HOST ?? "mail.tgv-media.ro",
    port,
    secure: rawSecure === "true",
    user: env.SMTP_USER ?? "tgv@tgv-media.ro",
    pass,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  }
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter
  const config = resolveSmtpConfig(process.env)
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
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
