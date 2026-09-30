import assert from "node:assert/strict"
import test from "node:test"
import type { ContactPayload } from "../contact/types.ts"
import { getPriceDisclosure } from "../pricing/disclosure.ts"
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
  assert.ok(rendered.html.includes("€25.00"))
  assert.ok(!rendered.html.includes("Indicative total (ex. VAT)"))

  assert.ok(rendered.text.includes(`${disclosure.emailSubtotalLabel}: €25.00`))
  assert.ok(rendered.text.includes(disclosure.internalQuoteReminder))
  assert.ok(!rendered.text.includes("Indicative total (ex. VAT)"))
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
