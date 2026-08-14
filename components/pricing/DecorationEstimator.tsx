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
  type PadInkSystem,
  type PrintColors,
  type TextileFormat,
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

export default function DecorationEstimator({
  methods,
  quantity,
  onQuantityChange,
  productUnitPrice,
  productName,
}: Readonly<Props>) {
  const { locale } = useLanguage()
  const ro = locale === "ro"
  const available = methods
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

  if (available.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          {ro ? "Ofertă manuală" : "Manual quote"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
          {ro
            ? "Metodele furnizorului nu au încă un tarif automat compatibil. Păstrăm codurile exacte și confirmăm tehnologia, poziționarea și prețul în oferta finală."
            : "The supplier methods do not yet have a compatible automated tariff. We keep the exact codes and confirm the technique, placement, and price in the final quote."}
        </p>
      </div>
    )
  }

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
              max={1000000}
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
                      "pad-screen": "Tampografie / serigrafie",
                      "textile-transfer": "Transfer textil",
                      "uv-transfer": "Transfer furnizor · ofertă manuală",
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

        {options.method === "pad-screen" ? (
          <>
            <Field label={ro ? "Sistem de cerneală" : "Ink system"}>
              <select
                value={options.padInkSystem}
                onChange={(event) => update("padInkSystem", event.target.value as PadInkSystem)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
              >
                <option value="mono">{ro ? "Monocomponentă · PVC, ABS, polistiren" : "Mono-component · PVC, ABS, polystyrene"}</option>
                <option value="two-component">{ro ? "Bicomponentă · PE, melamină, piele, metal lăcuit" : "Two-component · PE, melamine, leather, coated metal"}</option>
              </select>
            </Field>
            <ColorField options={options} update={update} ro={ro} />
          </>
        ) : null}

        {options.method === "textile-transfer" ? (
          <>
            <Field label={ro ? "Format maxim" : "Maximum format"}>
              <select
                value={options.textileFormat}
                onChange={(event) => update("textileFormat", event.target.value as TextileFormat)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
              >
                <option value="10x10">10 × 10 cm</option>
                <option value="20x30">20 × 30 cm</option>
              </select>
            </Field>
            <ColorField options={options} update={update} ro={ro} />
          </>
        ) : null}

        <Field label={ro ? "Manipulare la despachetare / reambalare" : "Unpack / repack handling"}>
          <select
            value={options.handlingRate}
            onChange={(event) => update("handlingRate", Number(event.target.value) as HandlingRate)}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
          >
            <option value={0}>{ro ? "Fără" : "None"}</option>
            {options.method !== "textile-transfer" ? (
              <option value={0.05}>{ro ? "Obiect mic" : "Small object"} · €0.05/{ro ? "buc." : "unit"}</option>
            ) : null}
            <option value={0.1}>{options.method === "textile-transfer" ? (ro ? "Tricou, geantă sau rucsac" : "Shirt, bag, or backpack") : (ro ? "Obiect mediu" : "Medium object")} · €0.10/{ro ? "buc." : "unit"}</option>
            <option value={0.2}>{options.method === "textile-transfer" ? (ro ? "Umbrelă" : "Umbrella") : (ro ? "Obiect dificil" : "Difficult object")} · €0.20/{ro ? "buc." : "unit"}</option>
          </select>
        </Field>

        <Field label={ro ? "Procesare grafică (opțional)" : "Artwork processing (optional)"}>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={0.25}
              value={options.artworkHours}
              onChange={(event) => update("artworkHours", Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 pr-20 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--text-muted)]">€25/{ro ? "oră" : "hour"}</span>
          </div>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.method === "uv-print" || options.method === "co2" || options.method === "fiber-laser" ? (
          <Check label={ro ? "Nume individuale (+50%)" : "Individual names (+50%)"} checked={options.named} onChange={(value) => update("named", value)} />
        ) : null}
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
        {options.method === "uv-print" || options.method === "co2" || options.method === "fiber-laser" ? (
          <Check label={ro ? "Mostră de producție (+€7)" : "Production sample (+€7)"} checked={options.sample} onChange={(value) => update("sample", value)} />
        ) : null}
      </div>

      <div className="mt-5 rounded-xl bg-[var(--surface)] p-4">
        {estimate.supported ? (
          <dl className="space-y-2 text-sm">
            {productSubtotal !== null ? <ResultRow label={ro ? "Produse" : "Products"} value={formatEuro(productSubtotal)} /> : null}
            <ResultRow label={ro ? "Producție personalizare" : "Decoration production"} value={formatEuro(estimate.productionSubtotal ?? 0)} />
            {estimate.handlingSubtotal > 0 ? <ResultRow label={ro ? "Manipulare" : "Handling"} value={formatEuro(estimate.handlingSubtotal)} /> : null}
            {estimate.sampleSubtotal > 0 ? <ResultRow label={ro ? "Mostră" : "Sample"} value={formatEuro(estimate.sampleSubtotal)} /> : null}
            {estimate.artworkSubtotal > 0 ? <ResultRow label={ro ? "Procesare grafică" : "Artwork processing"} value={formatEuro(estimate.artworkSubtotal)} /> : null}
            {estimate.billableQuantity !== null && estimate.billableQuantity > quantity ? (
              <ResultRow label={ro ? "Cantitate minimă facturată" : "Minimum billed quantity"} value={`${estimate.billableQuantity} ${ro ? "buc." : "units"}`} />
            ) : null}
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
              {manualMessage(estimate.reason, estimate.message, ro)}
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
  return ({
    small: "Obiect mic · pix, breloc, USB",
    card: "Card bancar sau USB tip card",
    "medium-a6": "Obiect mediu · până la A6",
    "large-a5": "Obiect mare · până la A5",
    "large-a4": "Obiect mare · până la A4",
    "large-a3": "Obiect mare · până la A3",
  } as const)[format]
}

function ColorField({
  options,
  update,
  ro,
}: Readonly<{
  options: DecorationOptions
  update: <K extends keyof DecorationOptions>(key: K, value: DecorationOptions[K]) => void
  ro: boolean
}>) {
  return (
    <Field label={ro ? "Număr de culori" : "Number of colours"}>
      <select
        value={options.printColors}
        onChange={(event) => update("printColors", Number(event.target.value) as PrintColors)}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--brand-black)] outline-none focus:border-[var(--brand-orange)]"
      >
        {([1, 2, 3, 4, 5, 6] as const).map((colors) => (
          <option key={colors} value={colors}>{colors} {ro ? (colors === 1 ? "culoare" : "culori") : (colors === 1 ? "colour" : "colours")}</option>
        ))}
      </select>
    </Field>
  )
}

function manualMessage(
  reason: import("@/lib/pricing/calculator").EstimateReason | undefined,
  fallback: string | undefined,
  ro: boolean,
): string {
  if (!ro) return fallback ?? "This configuration needs a manual production review."
  return ({
    "legacy-transfer": "Eticheta de transfer din datele vechi ale furnizorului nu identifică un tarif validat. Confirmăm metoda exactă în oferta finală.",
    "co2-high-quantity": "Comenzile cu gravură CO2 de peste 500 de bucăți se calculează după analiza producției.",
    "unsupported-combination": "Această combinație de material și dimensiune necesită analiza manuală a producției.",
    "pad-low-quantity": "Comenzile de tampografie sau serigrafie sub 50 de bucăți necesită analiză manuală.",
    "pad-high-quantity": "Comenzile de tampografie sau serigrafie peste 10.000 de bucăți necesită analiză manuală.",
    "textile-high-quantity": "Comenzile de transfer textil peste 10.500 de bucăți necesită analiză manuală.",
  } as const)[reason ?? "unsupported-combination"]
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
