"use client"

import { useEffect, useMemo, useState } from "react"
import {
  PERSONALIZATION_LABELS,
  type Personalization,
} from "@/lib/content/catalog"
import {
  DEFAULT_DECORATION_OPTIONS,
  LASER_SIZE_LABELS,
  UV_FORMAT_LABELS,
  calculateDecoration,
  formatEuro,
  type DecorationOptions,
  type HandlingRate,
  type LaserSize,
  type UvFormat,
} from "@/lib/pricing/calculator"
import { useLanguage } from "@/components/LanguageProvider"

interface Props {
  methods: Personalization[]
  quantity: number
  onQuantityChange?: (quantity: number) => void
  productUnitPrice?: number
  productName?: string
}

const ALL_METHODS: Personalization[] = [
  "co2",
  "fiber-laser",
  "uv-print",
  "uv-transfer",
]

export default function DecorationEstimator({
  methods,
  quantity,
  onQuantityChange,
  productUnitPrice,
  productName,
}: Readonly<Props>) {
  const { locale } = useLanguage()
  const ro = locale === "ro"
  const available = methods.length > 0 ? methods : ALL_METHODS
  const [options, setOptions] = useState<DecorationOptions>(() => ({
    ...DEFAULT_DECORATION_OPTIONS,
    method: available[0] ?? "uv-print",
  }))

  useEffect(() => {
    if (!available.includes(options.method)) {
      setOptions((current) => ({
        ...current,
        method: available[0] ?? "uv-print",
      }))
    }
  }, [available, options.method])

  const estimate = useMemo(
    () => calculateDecoration(quantity, options),
    [quantity, options],
  )
  const productSubtotal =
    productUnitPrice === undefined ? null : productUnitPrice * quantity
  const estimatedTotal =
    productSubtotal !== null && estimate.decorationTotal !== null
      ? productSubtotal + estimate.decorationTotal
      : null

  const update = <K extends keyof DecorationOptions>(
    key: K,
    value: DecorationOptions[K],
  ) => setOptions((current) => ({ ...current, [key]: value }))

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          {ro ? "Calculator orientativ" : "Indicative calculator"}
        </p>
        {productName ? (
          <p className="text-sm font-medium text-[var(--brand-black)]">{productName}</p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {onQuantityChange ? (
          <Field label={ro ? "Cantitate" : "Quantity"}>
            <input
              type="number"
              min={1}
              max={10000}
              value={quantity}
              onChange={(event) => onQuantityChange(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
            />
          </Field>
        ) : null}

        <Field label={ro ? "Metodă de personalizare" : "Decoration method"}>
          <select
            value={options.method}
            onChange={(event) => update("method", event.target.value as Personalization)}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
          >
            {available.map((method) => (
              <option key={method} value={method}>
                {ro
                  ? ({
                      co2: "Gravură laser CO2",
                      "fiber-laser": "Gravură laser cu fibră",
                      "uv-print": "Print UV direct",
                      "uv-transfer": "Transfer UV",
                    } as const)[method]
                  : PERSONALIZATION_LABELS[method].label}
              </option>
            ))}
          </select>
        </Field>

        {options.method === "uv-print" ? (
          <Field label={ro ? "Suprafață imprimată" : "Printed area"}>
            <select
              value={options.uvFormat}
              onChange={(event) => update("uvFormat", event.target.value as UvFormat)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
            >
              {Object.entries(UV_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{ro ? uvFormatRo(value as UvFormat) : label}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {options.method === "co2" || options.method === "fiber-laser" ? (
          <Field label={ro ? "Dimensiunea obiectului" : "Object size"}>
            <select
              value={options.laserSize}
              onChange={(event) => update("laserSize", event.target.value as LaserSize)}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
            >
              {Object.entries(LASER_SIZE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{ro ? laserSizeRo(value as LaserSize) : label}</option>
              ))}
            </select>
          </Field>
        ) : null}

        {options.method === "co2" ? (
          <Field label={ro ? "Grupa de material" : "Material group"}>
            <select
              value={options.co2Material}
              onChange={(event) => update("co2Material", event.target.value as "standard" | "silicone")}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
            >
              <option value="standard">{ro ? "Hârtie, piele, textile, acril, lemn, plută, sticlă, metal acoperit" : "Paper, leather, textile, acrylic, wood, cork, glass, coated metal"}</option>
              <option value="silicone">{ro ? "Silicon" : "Silicone"}</option>
            </select>
          </Field>
        ) : null}

        <Field label={ro ? "Manipulare la despachetare / reambalare" : "Unpack / repack handling"}>
          <select
            value={options.handlingRate}
            onChange={(event) => update("handlingRate", Number(event.target.value) as HandlingRate)}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
          >
            <option value={0}>{ro ? "Fără" : "None"}</option>
            <option value={0.05}>{ro ? "Obiect mic" : "Small object"} · €0.05/{ro ? "buc." : "unit"}</option>
            <option value={0.1}>{ro ? "Obiect mediu" : "Medium object"} · €0.10/{ro ? "buc." : "unit"}</option>
            <option value={0.2}>{ro ? "Obiect dificil" : "Difficult object"} · €0.20/{ro ? "buc." : "unit"}</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Check label={ro ? "Nume individuale (+50%)" : "Individual names (+50%)"} checked={options.named} onChange={(value) => update("named", value)} />
        {options.method === "uv-print" ? (
          <>
            <Check label={ro ? "Formă dificilă (+50%)" : "Difficult shape (+50%)"} checked={options.difficultShape} onChange={(value) => update("difficultShape", value)} />
            <Check label={ro ? "Lac de protecție (2×)" : "Protective varnish (2×)"} checked={options.varnish} onChange={(value) => update("varnish", value)} />
          </>
        ) : null}
        {options.method === "co2" || options.method === "fiber-laser" ? (
          <Check label={ro ? "Obiect premium peste €40 (2×)" : "Luxury object over €40 (2×)"} checked={options.luxuryObject} onChange={(value) => update("luxuryObject", value)} />
        ) : null}
        {options.method === "co2" ? (
          <Check label={ro ? "Gravură peste 12 cm² (2×)" : "Engraving over 12 cm² (2×)"} checked={options.largeEngraving} onChange={(value) => update("largeEngraving", value)} />
        ) : null}
        <Check label={ro ? "Mostră de producție (+€7)" : "Production sample (+€7)"} checked={options.sample} onChange={(value) => update("sample", value)} />
      </div>

      <div className="mt-5 rounded-xl bg-[var(--surface)] p-4">
        {estimate.supported ? (
          <dl className="space-y-2 text-sm">
            {productSubtotal !== null ? <ResultRow label={ro ? "Produse" : "Products"} value={formatEuro(productSubtotal)} /> : null}
            <ResultRow label={ro ? "Producție personalizare" : "Decoration production"} value={formatEuro(estimate.productionSubtotal ?? 0)} />
            {estimate.handlingSubtotal > 0 ? <ResultRow label={ro ? "Manipulare" : "Handling"} value={formatEuro(estimate.handlingSubtotal)} /> : null}
            {estimate.sampleSubtotal > 0 ? <ResultRow label={ro ? "Mostră" : "Sample"} value={formatEuro(estimate.sampleSubtotal)} /> : null}
            <ResultRow
              label={estimatedTotal === null ? (ro ? "Estimare personalizare" : "Decoration estimate") : (ro ? "Total orientativ" : "Indicative total")}
              value={formatEuro(estimatedTotal ?? estimate.decorationTotal ?? 0)}
              strong
              divided
            />
          </dl>
        ) : (
          <div>
            <p className="text-sm font-semibold text-[var(--brand-black)]">{ro ? "Este necesară o ofertă manuală" : "Manual quote required"}</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-soft)]">
              {ro ? "Transferul UV este disponibil, însă tariful furnizat nu definește un preț suficient de sigur. Îl vom confirma în oferta finală." : estimate.message}
            </p>
            {productSubtotal !== null ? (
              <p className="mt-3 text-sm text-[var(--text-soft)]">
                {ro ? "Subtotal produse înainte de personalizare:" : "Product subtotal before decoration:"}{" "}<strong className="text-[var(--brand-black)]">{formatEuro(productSubtotal)}</strong>
              </p>
            ) : null}
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {ro
            ? "EUR, fără TVA. Estimarea este orientativă și se bazează pe grila de tarife furnizată; grafica, materialul, poziționarea și fezabilitatea se confirmă în oferta finală."
            : "EUR, excluding VAT. This is an indicative estimate based on the supplied rate sheet; artwork, substrate, positioning, and production feasibility are confirmed in the final quote."}
        </p>
      </div>
    </div>
  )
}

function uvFormatRo(format: UvFormat): string {
  return ({ small: "Marcaj mic", card: "Format card", medium: "Marcaj mediu", a6: "Până la A6", a5: "Până la A5", a4: "Până la A4" } as const)[format]
}

function laserSizeRo(size: LaserSize): string {
  return ({ small: "Obiect mic", medium: "Obiect mediu", large: "Obiect mare" } as const)[size]
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-soft)]">
      {label}
      {children}
    </label>
  )
}

function Check({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs text-[var(--text-soft)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 accent-[var(--brand-orange)]"
      />
      <span>{label}</span>
    </label>
  )
}

function ResultRow({
  label,
  value,
  strong = false,
  divided = false,
}: Readonly<{
  label: string
  value: string
  strong?: boolean
  divided?: boolean
}>) {
  return (
    <div className={`flex items-center justify-between gap-4 ${divided ? "border-t border-[var(--border-soft)] pt-2" : ""} ${strong ? "font-semibold text-[var(--brand-black)]" : "text-[var(--text-soft)]"}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
