import type { Locale } from "@/lib/i18n/config"

export interface PriceDisclosureCopy {
  compact: string
  shippingOnly: string
  detailed: string
  pendingLabel: string
  pendingValue: string
  subtotalLabel: string
  emailSubtotalLabel: string
  internalQuoteReminder: string
}

export const PRICE_DISCLOSURE: Record<Locale, PriceDisclosureCopy> = {
  en: {
    compact: "Excl. VAT. Supplier transport/import calculated in the final quote.",
    shippingOnly:
      "Supplier transport/import not included · confirmed in the final quote.",
    detailed:
      "Displayed prices exclude VAT and supplier transport and, where applicable, import costs. The exact amount may be €0 or may vary by supplier, product, quantity and destination. It will be calculated and itemised in the final quote before you confirm the order.",
    pendingLabel: "Supplier transport/import",
    pendingValue: "Calculated in final quote",
    subtotalLabel: "Indicative subtotal",
    emailSubtotalLabel:
      "Indicative product subtotal (excl. VAT and supplier transport/import)",
    internalQuoteReminder:
      "Action required: calculate and itemise supplier transport/import before issuing the final quote.",
  },
  ro: {
    compact:
      "Fără TVA. Transportul de la furnizor și eventualele costuri de import se calculează în oferta finală.",
    shippingOnly:
      "Transportul de la furnizor și eventualele costuri de import nu sunt incluse · se confirmă în oferta finală.",
    detailed:
      "Prețurile afișate nu includ TVA și transportul de la furnizor, iar unde este cazul, costurile de import. Valoarea exactă poate fi 0 € sau poate varia în funcție de furnizor, produs, cantitate și destinație. Costul va fi calculat și evidențiat în oferta finală, înainte de confirmarea comenzii.",
    pendingLabel: "Transport furnizor / import",
    pendingValue: "Calculat în oferta finală",
    subtotalLabel: "Subtotal orientativ",
    emailSubtotalLabel:
      "Subtotal orientativ produse (fără TVA și transport/import de la furnizor)",
    internalQuoteReminder:
      "Acțiune necesară: calculează și evidențiază transportul/importul de la furnizor înainte de emiterea ofertei finale.",
  },
}

export function getPriceDisclosure(locale: Locale): PriceDisclosureCopy {
  return PRICE_DISCLOSURE[locale]
}
