import assert from "node:assert/strict"
import test from "node:test"
import type { ContactPayload } from "../contact/types.ts"
import { getPriceDisclosure } from "../pricing/disclosure.ts"
import { DEFAULT_DECORATION_OPTIONS } from "../pricing/calculator.ts"
import { renderContactEmail } from "./renderContactEmail.ts"

function payloadWithProducts(): ContactPayload {
  return {
    name: "Ana Popescu",
    email: "ana@example.com",
    phone: "+40 700 000 000",
    company: "Example SRL",
    quantity: null,
    quantityOther: "",
    deadlinePreset: "1-month",
    deadlineDate: "",
    context: "We need branded products for a customer event.",
    selectedProducts: [
      {
        slug: "sample-product",
        name: "Sample Product",
        category: "bags",
        quantity: 2,
        supplierId: "sample-supplier",
        supplierSku: "SKU-001",
        priceSnapshot: 12.5,
        personalizations: ["uv-print", "co2"],
        decorationOptions: {
          ...DEFAULT_DECORATION_OPTIONS,
          method: "uv-print",
          uvFormat: "large-a4",
          difficultShape: true,
          sample: true,
          handlingRate: 0.1,
          artworkHours: 0.5,
        },
      },
    ],
    submittedAt: "2026-09-30T12:00:00.000Z",
  }
}

test("selected-product email labels its subtotal exclusions and flags transport/import for quoting", () => {
  const disclosure = getPriceDisclosure("en")
  const rendered = renderContactEmail(payloadWithProducts(), [])

  assert.ok(rendered.html.includes(disclosure.emailSubtotalLabel))
  assert.ok(rendered.html.includes(disclosure.internalQuoteReminder))
  assert.ok(
    rendered.html.includes(
      "indicative server-catalog prices resolved when the request was submitted",
    ),
  )
  assert.ok(!rendered.html.includes("snapshots captured when the customer built"))
  assert.ok(rendered.html.includes("€25.00"))
  assert.ok(!rendered.html.includes("Indicative total (ex. VAT)"))

  assert.ok(rendered.text.includes(`${disclosure.emailSubtotalLabel}: €25.00`))
  assert.ok(rendered.text.includes(disclosure.internalQuoteReminder))
  assert.ok(!rendered.text.includes("Indicative total (ex. VAT)"))
})

test("selected personalization options and calculated price appear in both email formats", () => {
  const rendered = renderContactEmail(payloadWithProducts(), [])

  for (const expected of [
    "Selected personalization: Direct UV print",
    "Printed area: Large object · up to A4",
    "difficult shape",
    "production sample",
    "Personalization estimate:</strong> €64.70",
    "Products + personalization:</strong> €89.70",
  ]) {
    assert.ok(rendered.html.includes(expected), `missing HTML detail: ${expected}`)
  }
  for (const expected of [
    "Personalization: Direct UV print",
    "Printed area: Large object · up to A4",
    "Personalization estimate: €64.70",
    "Products + personalization: €89.70",
  ]) {
    assert.ok(rendered.text.includes(expected), `missing text detail: ${expected}`)
  }
})

test("optional name and context do not create blank email artifacts", () => {
  const payload = payloadWithProducts()
  payload.name = ""
  payload.context = ""
  payload.deadlinePreset = null

  const rendered = renderContactEmail(payload, [])

  assert.ok(rendered.subject.includes("ana@example.com"))
  assert.ok(!rendered.html.includes(">Name</td>"))
  assert.ok(!rendered.html.includes(">Message</h3>"))
  assert.ok(rendered.html.includes("reach ana@example.com directly"))
  assert.ok(!rendered.text.includes("Name:     "))
  assert.ok(!rendered.text.includes("Message:"))
  assert.ok(rendered.text.includes("Deadline: Not specified"))
})

test("general contact email does not add a product-shipping action", () => {
  const disclosure = getPriceDisclosure("en")
  const payload = payloadWithProducts()
  payload.selectedProducts = []
  payload.quantity = "50-500"

  const rendered = renderContactEmail(payload, [])

  assert.ok(!rendered.html.includes(disclosure.internalQuoteReminder))
  assert.ok(!rendered.text.includes(disclosure.internalQuoteReminder))
})
