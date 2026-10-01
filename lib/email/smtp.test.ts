import assert from "node:assert/strict"
import test from "node:test"
import { resolveSmtpConfig } from "./smtp.ts"

test("resolveSmtpConfig applies safe defaults and bounded SMTP timeouts", () => {
  const config = resolveSmtpConfig({ SMTP_PASSWORD: "secret-value" })

  assert.deepEqual(config, {
    host: "mail.tgv-media.ro",
    port: 465,
    secure: true,
    user: "tgv@tgv-media.ro",
    pass: "secret-value",
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  })
})

test("resolveSmtpConfig accepts an explicit valid transport configuration", () => {
  const config = resolveSmtpConfig({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: " 587 ",
    SMTP_SECURE: " FALSE ",
    SMTP_USER: "mailer@example.test",
    SMTP_PASSWORD: "  preserve surrounding spaces  ",
  })

  assert.equal(config.host, "smtp.example.test")
  assert.equal(config.port, 587)
  assert.equal(config.secure, false)
  assert.equal(config.user, "mailer@example.test")
  assert.equal(config.pass, "  preserve surrounding spaces  ")
})

test("resolveSmtpConfig requires a nonempty password without exposing it", () => {
  for (const password of [undefined, "", "   "]) {
    assert.throws(
      () => resolveSmtpConfig({ SMTP_PASSWORD: password }),
      /^Error: SMTP_PASSWORD is required$/,
    )
  }
})

test("resolveSmtpConfig rejects malformed or out-of-range ports", () => {
  for (const port of ["0", "65536", "465.5", "465junk", "-1", "NaN", ""]) {
    assert.throws(
      () => resolveSmtpConfig({ SMTP_PASSWORD: "secret-value", SMTP_PORT: port }),
      /^Error: SMTP_PORT must be an integer between 1 and 65535$/,
    )
  }
})

test("resolveSmtpConfig rejects ambiguous secure-mode values", () => {
  assert.throws(
    () => resolveSmtpConfig({
      SMTP_PASSWORD: "secret-value",
      SMTP_SECURE: "yes",
    }),
    /^Error: SMTP_SECURE must be either "true" or "false"$/,
  )
})
