import { join } from "node:path"
import {
  Document,
  Font,
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"
import { getPriceDisclosure } from "../pricing/disclosure.ts"
import type {
  OfferDocumentItem,
  OfferDocumentModel,
} from "./offer-document.ts"
import { OFFER_PDF_TIME_ZONE } from "./offer-document.ts"
import { OfferPdfNotes } from "./offer-pdf-notes.ts"

const SITE_URL = "https://www.tgv-media.ro"
const BRAND_ORANGE = "#FF6600"
const BRAND_ORANGE_TEXT = "#9F3F00"
const BRAND_BLACK = "#0F0F10"
const TEXT_SOFT = "#3C3C45"
const TEXT_MUTED = "#62626D"
const BORDER = "#E2E1E8"
const SURFACE_SOFT = "#F6F5F9"
const ORANGE_TINT = "#FFF1E8"

Font.register({
  family: "Lato",
  fonts: [
    {
      src: join(process.cwd(), "lib/offer/fonts/Lato-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: join(process.cwd(), "lib/offer/fonts/Lato-Bold.ttf"),
      fontWeight: 700,
    },
  ],
})
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    color: BRAND_BLACK,
    fontFamily: "Lato",
    fontSize: 9,
    paddingTop: 30,
    paddingRight: 38,
    paddingBottom: 54,
    paddingLeft: 38,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: BRAND_ORANGE,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: BRAND_BLACK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brandMarkText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.7,
  },
  brandName: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  brandSubline: {
    color: TEXT_MUTED,
    fontSize: 7.2,
    marginTop: 2,
  },
  generatedBlock: {
    alignItems: "flex-end",
  },
  generatedLabel: {
    color: TEXT_MUTED,
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  generatedValue: {
    color: TEXT_SOFT,
    fontSize: 8.5,
    marginTop: 3,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: ORANGE_TINT,
    borderRadius: 20,
    color: "#8B3800",
    fontSize: 7.2,
    fontWeight: 700,
    letterSpacing: 0.75,
    paddingTop: 5,
    paddingRight: 10,
    paddingBottom: 5,
    paddingLeft: 10,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.1,
    marginTop: 10,
    maxWidth: 460,
  },
  introduction: {
    color: TEXT_SOFT,
    fontSize: 9.6,
    lineHeight: 1.45,
    marginTop: 7,
    maxWidth: 480,
  },
  metrics: {
    flexDirection: "row",
    marginTop: 11,
    marginBottom: 14,
  },
  metric: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 10,
    marginRight: 8,
    paddingTop: 7,
    paddingRight: 13,
    paddingBottom: 7,
    paddingLeft: 13,
    minWidth: 90,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  metricLabel: {
    color: TEXT_MUTED,
    fontSize: 7.5,
    marginTop: 3,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
  },
  sectionCount: {
    color: TEXT_MUTED,
    fontSize: 8,
  },
  productCard: {
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    marginBottom: 8,
    padding: 10,
  },
  productTop: {
    flexDirection: "row",
  },
  imageBox: {
    width: 68,
    height: 68,
    backgroundColor: SURFACE_SOFT,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
    textDecoration: "none",
  },
  productImage: {
    width: 64,
    height: 64,
    objectFit: "contain",
  },
  imagePlaceholder: {
    color: BRAND_ORANGE_TEXT,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  productMain: {
    flexGrow: 1,
    flexShrink: 1,
  },
  lineNumber: {
    color: BRAND_ORANGE_TEXT,
    fontSize: 7.2,
    fontWeight: 700,
    letterSpacing: 0.65,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  productName: {
    color: BRAND_BLACK,
    fontSize: 12.5,
    fontWeight: 700,
    lineHeight: 1.25,
    textDecoration: "underline",
  },
  productMeta: {
    color: TEXT_MUTED,
    fontSize: 7.8,
    lineHeight: 1.45,
    marginTop: 5,
  },
  priceGrid: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 8,
    flexDirection: "row",
    marginTop: 7,
    paddingTop: 6,
    paddingRight: 9,
    paddingBottom: 6,
    paddingLeft: 9,
  },
  priceCell: {
    flexGrow: 1,
    flexBasis: 0,
  },
  priceCellRight: {
    alignItems: "flex-end",
  },
  priceLabel: {
    color: TEXT_MUTED,
    fontSize: 6.7,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  priceValue: {
    color: BRAND_BLACK,
    fontSize: 9.3,
    fontWeight: 700,
    marginTop: 3,
  },
  personalization: {
    backgroundColor: ORANGE_TINT,
    borderLeft: `3px solid ${BRAND_ORANGE}`,
    borderRadius: 6,
    marginTop: 7,
    paddingTop: 7,
    paddingRight: 10,
    paddingBottom: 7,
    paddingLeft: 10,
  },
  personalizationTitle: {
    fontSize: 8.8,
    fontWeight: 700,
  },
  personalizationOption: {
    color: TEXT_SOFT,
    fontSize: 7.5,
    lineHeight: 1.35,
    marginTop: 2,
  },
  personalizationTotal: {
    color: BRAND_BLACK,
    fontSize: 8,
    fontWeight: 700,
    marginTop: 4,
  },
  noPersonalization: {
    color: TEXT_MUTED,
    fontSize: 7.8,
    marginTop: 9,
  },
  totalsCard: {
    backgroundColor: BRAND_BLACK,
    borderRadius: 12,
    marginTop: 9,
    padding: 11,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalLabel: {
    color: "#C9C8D0",
    fontSize: 8.5,
  },
  totalValue: {
    color: "#FFFFFF",
    fontSize: 9.3,
    fontWeight: 700,
  },
  totalRule: {
    backgroundColor: "#3A3A3F",
    height: 1,
    marginTop: 2,
    marginBottom: 6,
  },
  grandTotalLabel: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: 700,
  },
  grandTotalValue: {
    color: BRAND_ORANGE,
    fontSize: 15,
    fontWeight: 700,
  },
  manualNotice: {
    color: "#FFD3B5",
    fontSize: 7.6,
    lineHeight: 1.4,
    marginTop: 7,
  },
  disclosure: {
    backgroundColor: SURFACE_SOFT,
    borderRadius: 9,
    color: TEXT_SOFT,
    fontSize: 7.5,
    lineHeight: 1.5,
    marginTop: 7,
    padding: 8,
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
    paddingTop: 7,
    borderTop: `1px solid ${BORDER}`,
  },
  contactText: {
    color: TEXT_MUTED,
    fontSize: 7.5,
  },
  contactLink: {
    color: BRAND_ORANGE_TEXT,
    fontSize: 7.5,
    textDecoration: "none",
  },
  footer: {
    position: "absolute",
    left: 38,
    right: 38,
    bottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    color: TEXT_MUTED,
    fontSize: 6.8,
  },
  footerDot: {
    color: BRAND_ORANGE,
  },
})

const COPY = {
  ro: {
    status: "Estimare orientativă · nu este ofertă comercială finală",
    title: "Selecție pentru ofertă — estimare orientativă",
    introduction:
      "Un rezumat al produselor, cantităților și personalizărilor salvate în selecția ta. Echipa TGV-Media va confirma prețul final după verificarea tehnică.",
    generated: "Generat",
    product: "Produs",
    products: "Produse",
    unit: "Bucată",
    units: "Bucăți",
    lines: "Poziții selectate",
    line: "Poziția",
    code: "Cod",
    variant: "Variantă",
    quantity: "Cantitate",
    unitPrice: "Preț unitar",
    productSubtotal: "Subtotal produs",
    personalization: "Personalizare salvată",
    personalizationEstimate: "Estimare personalizare",
    lineTotal: "Produs + personalizare",
    noneSelected: "Nicio personalizare salvată pentru această poziție.",
    notes: "Notă pentru PDF",
    productsTotal: "Subtotal produse",
    personalizationTotal: "Personalizări cunoscute",
    estimatedTotal: "Total orientativ cunoscut",
    partialTotal: "Total parțial cunoscut",
    manual:
      "Cel puțin o personalizare necesită analiză manuală și nu este inclusă în totalul de mai sus.",
    unavailable: "De confirmat",
    footer: "Sumar generat de tgv-media.ro",
    page: "Pagina",
  },
  en: {
    status: "Indicative estimate · not a final commercial quote",
    title: "Selection for quote — indicative estimate",
    introduction:
      "A summary of the products, quantities, and saved personalizations in your selection. The TGV-Media team will confirm final pricing after technical review.",
    generated: "Generated",
    product: "Product",
    products: "Products",
    unit: "Unit",
    units: "Units",
    lines: "Selected lines",
    line: "Line",
    code: "Code",
    variant: "Variant",
    quantity: "Quantity",
    unitPrice: "Unit price",
    productSubtotal: "Product subtotal",
    personalization: "Saved personalization",
    personalizationEstimate: "Personalization estimate",
    lineTotal: "Product + personalization",
    noneSelected: "No personalization saved for this line.",
    notes: "PDF note",
    productsTotal: "Products subtotal",
    personalizationTotal: "Known personalizations",
    estimatedTotal: "Known indicative total",
    partialTotal: "Known partial total",
    manual:
      "At least one personalization requires manual review and is not included in the total above.",
    unavailable: "To be confirmed",
    footer: "Summary generated by tgv-media.ro",
    page: "Page",
  },
} as const

export async function renderOfferPdf(
  model: OfferDocumentModel,
): Promise<Buffer> {
  return renderToBuffer(<OfferPdfDocument model={model} />)
}

function OfferPdfDocument({ model }: { model: OfferDocumentModel }) {
  const copy = COPY[model.locale]
  const disclosure = getPriceDisclosure(model.locale)

  return (
    <Document
      title={copy.title}
      author="TGV-Media"
      subject={copy.status}
      creator="tgv-media.ro"
      language={model.locale}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.accent} fixed />

        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>TGV</Text>
            </View>
            <View>
              <Text style={styles.brandName}>TGV-Media</Text>
              <Text style={styles.brandSubline}>Personalizare · producție · branding</Text>
            </View>
          </View>
          <View style={styles.generatedBlock}>
            <Text style={styles.generatedLabel}>{copy.generated}</Text>
            <Text style={styles.generatedValue}>
              {formatGeneratedAt(model.generatedAt, model.locale)}
            </Text>
          </View>
        </View>

        <Text style={styles.statusPill}>{copy.status}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.introduction}>{copy.introduction}</Text>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{model.items.length}</Text>
            <Text style={styles.metricLabel}>
              {model.items.length === 1 ? copy.product : copy.products}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{model.totalQuantity}</Text>
            <Text style={styles.metricLabel}>
              {model.totalQuantity === 1 ? copy.unit : copy.units}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{copy.lines}</Text>
          <Text style={styles.sectionCount}>
            {model.items.length}{" "}
            {(model.items.length === 1 ? copy.product : copy.products).toLowerCase()}
          </Text>
        </View>

        {model.items.map((item, index) => (
          <ProductLine
            key={item.key}
            item={item}
            index={index}
            locale={model.locale}
          />
        ))}

        {model.notes ? (
          <OfferPdfNotes title={copy.notes} notes={model.notes} />
        ) : null}

        <View style={styles.totalsCard} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{copy.productsTotal}</Text>
            <Text style={styles.totalValue}>
              {formatMoney(model.productsSubtotal, model.locale)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{copy.personalizationTotal}</Text>
            <Text style={styles.totalValue}>
              {formatMoney(model.knownPersonalizationSubtotal, model.locale)}
            </Text>
          </View>
          <View style={styles.totalRule} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>
              {model.estimatedTotal === null
                ? copy.partialTotal
                : copy.estimatedTotal}
            </Text>
            <Text style={styles.grandTotalValue}>
              {formatMoney(
                model.estimatedTotal ??
                  model.productsSubtotal + model.knownPersonalizationSubtotal,
                model.locale,
              )}
            </Text>
          </View>
          {model.hasManualReview ? (
            <Text style={styles.manualNotice}>{copy.manual}</Text>
          ) : null}
        </View>

        <Text style={styles.disclosure}>{disclosure.detailed}</Text>

        <View style={styles.contactRow} wrap={false}>
          <Text style={styles.contactText}>office@tgv-media.ro</Text>
          <Link src={SITE_URL} style={styles.contactLink}>
            www.tgv-media.ro
          </Link>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {copy.footer} <Text style={styles.footerDot}>•</Text> {copy.status}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${copy.page} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

function ProductLine({
  item,
  index,
  locale,
}: {
  item: OfferDocumentItem
  index: number
  locale: "ro" | "en"
}) {
  const copy = COPY[locale]
  const meta = [
    item.supplierSku ? `${copy.code}: ${item.supplierSku}` : null,
    item.variantLabel ? `${copy.variant}: ${item.variantLabel}` : null,
    item.category.replaceAll("/", " / "),
  ].filter(Boolean)
  const productUrl = `${SITE_URL}/catalog/${item.category}/${item.slug}`

  return (
    <View style={styles.productCard} wrap={false}>
      <View style={styles.productTop}>
        <Link src={productUrl} style={styles.imageBox}>
          {item.imageData ? (
            <PdfImage src={item.imageData} style={styles.productImage} />
          ) : (
            <Text style={styles.imagePlaceholder}>TGV</Text>
          )}
        </Link>
        <View style={styles.productMain}>
          <Text style={styles.lineNumber}>
            {copy.line} {index + 1}
          </Text>
          <Link src={productUrl} style={styles.productName}>
            {item.name}
          </Link>
          <Text style={styles.productMeta}>{meta.join("  ·  ")}</Text>
          <View style={styles.priceGrid}>
            <View style={styles.priceCell}>
              <Text style={styles.priceLabel}>{copy.quantity}</Text>
              <Text style={styles.priceValue}>{item.quantity}</Text>
            </View>
            <View style={[styles.priceCell, styles.priceCellRight]}>
              <Text style={styles.priceLabel}>{copy.unitPrice}</Text>
              <Text style={styles.priceValue}>
                {item.unitPrice === null
                  ? copy.unavailable
                  : formatMoney(item.unitPrice, locale)}
              </Text>
            </View>
            <View style={[styles.priceCell, styles.priceCellRight]}>
              <Text style={styles.priceLabel}>{copy.productSubtotal}</Text>
              <Text style={styles.priceValue}>
                {item.productSubtotal === null
                  ? copy.unavailable
                  : formatMoney(item.productSubtotal, locale)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {item.personalization ? (
        <View style={styles.personalization}>
          <Text style={styles.personalizationTitle}>
            {copy.personalization}: {item.personalization.method}
          </Text>
          {item.personalization.options.map((option) => (
            <Text key={option} style={styles.personalizationOption}>
              • {option}
            </Text>
          ))}
          <Text style={styles.personalizationTotal}>
            {copy.personalizationEstimate}:{" "}
            {item.personalization.subtotal === null
              ? item.personalization.estimateLabel
              : formatMoney(item.personalization.subtotal, locale)}
            {item.lineTotal !== null
              ? `  ·  ${copy.lineTotal}: ${formatMoney(item.lineTotal, locale)}`
              : ""}
          </Text>
        </View>
      ) : (
        <Text style={styles.noPersonalization}>{copy.noneSelected}</Text>
      )}
    </View>
  )
}

function formatMoney(value: number, locale: "ro" | "en"): string {
  return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-IE", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatGeneratedAt(value: string, locale: "ro" | "en"): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: OFFER_PDF_TIME_ZONE,
  }).format(date)
}
