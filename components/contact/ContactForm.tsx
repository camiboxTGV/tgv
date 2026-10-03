"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import ChipGroup from "@/components/contact/ChipGroup"
import FileDropZone from "@/components/contact/FileDropZone"
import { useOffer } from "@/components/OfferProvider"
import { useLanguage } from "@/components/LanguageProvider"
import { getPriceDisclosure } from "@/lib/pricing/disclosure"
import { lineKey, type OfferItem } from "@/lib/offer/storage"
import { summarizeDecorationSelection } from "@/lib/pricing/decoration-selection"
import { toTimeZoneDateInputValue } from "@/lib/contact/local-date"
import {
  CONTACT_FIELD_LIMITS,
  hasContactPhone,
  hasRequiredContactDetails,
  isValidContactEmail,
} from "@/lib/contact/required-contact"
import {
  ACCEPT_FILES_ATTR,
  MAX_CONTEXT_CHARS,
  MAX_FILE_COUNT,
  MAX_FILE_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  type DeadlinePreset,
  type QuantityBucket,
} from "@/lib/contact/types"

interface FormState {
  name: string
  email: string
  phone: string
  company: string
  quantity: QuantityBucket | null
  quantityOther: string
  deadlinePreset: DeadlinePreset | null
  deadlineDate: string
  context: string
  files: File[]
}

type Errors = Partial<Record<keyof FormState, string>>

const QUANTITY_BUCKETS: { value: QuantityBucket; label: string }[] = [
  { value: "1-50", label: "1–50" },
  { value: "50-500", label: "50–500" },
  { value: "500-5000", label: "500–5,000" },
  { value: "5000+", label: "5,000+" },
  { value: "other", label: "Other" },
]

const DEADLINE_PRESETS: { value: DeadlinePreset; label: string; hint: string }[] = [
  { value: "2-weeks", label: "Within 2 weeks", hint: "Rush — premium rate may apply" },
  { value: "1-month", label: "Within 1 month", hint: "Standard lead time" },
  { value: "2-3-months", label: "2–3 months", hint: "Best pricing window" },
  { value: "flexible", label: "Flexible", hint: "We'll suggest the optimal timeline" },
]

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  quantity: null,
  quantityOther: "",
  deadlinePreset: null,
  deadlineDate: "",
  context: "",
  files: [],
}

function errorMessage(code: string): string {
  switch (code) {
    case "file_too_large":
      return "One of your files exceeds the 18 MB limit."
    case "file_type_not_allowed":
      return "One of your files has an unsupported format."
    case "upload_total_too_large":
      return "Total attachments exceed the upload limit. Please split into fewer files."
    case "too_many_files":
      return "You can attach up to 5 files."
    case "products_invalid":
      return "The selected product list is invalid. Refresh the page and try again."
    case "phone_required":
      return "A phone number is required."
    case "phone_invalid":
      return "Use a valid phone number with 6 to 15 digits."
    case "server_busy":
      return "The contact service is busy. Please wait a moment and try again."
    case "network":
      return "We couldn't reach the server. Check your connection and try again."
    case "send_failed":
      return "We couldn't send your brief. Please try again in a moment or email us directly."
    default:
      return "Something went wrong. Please try again."
  }
}

export default function ContactForm() {
  const { locale } = useLanguage()
  const ro = locale === "ro"
  const priceDisclosure = getPriceDisclosure(locale)
  const searchParams = useSearchParams()
  const { items: offerItems, clear } = useOffer()
  const [state, setState] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<OfferItem[]>([])

  const fromOffer = searchParams?.get("from") === "offer"
  const hasSelectedProducts = selectedProducts.length > 0
  const optionalText = ro ? "opțional" : "optional"

  useEffect(() => {
    if (!fromOffer) return
    if (offerItems.length > 0) setSelectedProducts(offerItems)
  }, [fromOffer, offerItems])

  const requiredValid = useMemo(() => {
    return hasRequiredContactDetails(state.email, state.phone)
  }, [state.email, state.phone])

  const minDeadline = useMemo(
    () => toTimeZoneDateInputValue(new Date(), "Europe/Bucharest"),
    [],
  )

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }))
    if (touched.has(key)) {
      setErrors((e) => ({ ...e, [key]: validateField(key, value) }))
    }
  }

  function markTouched(key: keyof FormState) {
    setTouched((t) => new Set(t).add(key))
    setErrors((e) => ({
      ...e,
      [key]: validateField(key, state[key]),
    }))
  }

  function validateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): string | undefined {
    switch (key) {
      case "email": {
        const v = (value as string).trim()
        if (v.length === 0) return ro ? "Obligatoriu." : "Required."
        if (!isValidContactEmail(v)) {
          return ro ? "Introdu un email valid." : "Use a valid email."
        }
        return undefined
      }
      case "phone": {
        const v = (value as string).trim()
        if (v.length === 0) return ro ? "Obligatoriu." : "Required."
        if (!hasContactPhone(v)) {
          return ro
            ? "Introdu un număr valid cu 6–15 cifre."
            : "Use a valid number with 6–15 digits."
        }
        return undefined
      }
      default:
        return undefined
    }
  }

  function validateAll(): boolean {
    const all: Errors = {}
    const keys: (keyof FormState)[] = ["email", "phone"]
    keys.forEach((k) => {
      const err = validateField(k, state[k])
      if (err) all[k] = err
    })
    setErrors(all)
    setTouched(new Set(keys))
    return Object.keys(all).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAll()) return
    setSubmitting(true)
    setSubmitError(null)

    const formData = new FormData()
    formData.append("name", state.name.trim())
    formData.append("email", state.email.trim())
    formData.append("phone", state.phone.trim())
    formData.append("company", state.company.trim())
    if (state.quantity) formData.append("quantity", state.quantity)
    formData.append("quantityOther", state.quantityOther.trim())
    if (state.deadlinePreset) formData.append("deadlinePreset", state.deadlinePreset)
    formData.append("deadlineDate", state.deadlineDate)
    formData.append("context", state.context)
    formData.append("selectedProducts", JSON.stringify(selectedProducts))
    for (const file of state.files) {
      formData.append("files", file, file.name)
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        let code = "send_failed"
        try {
          const body = (await res.json()) as { error?: string }
          if (body?.error) code = body.error
        } catch {
          // ignore parse failure — use default code
        }
        setSubmitError(errorMessage(code))
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError(errorMessage("network"))
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <SuccessCard
        hadSelection={selectedProducts.length > 0}
        hadBriefDetails={
          selectedProducts.length > 0 ||
          state.quantity !== null ||
          state.deadlinePreset !== null ||
          state.deadlineDate.length > 0 ||
          state.context.trim().length > 0 ||
          state.files.length > 0
        }
        locale={locale}
        onClearOffer={clear}
      />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-10 p-6 lg:p-10 bg-[var(--surface)] border border-[var(--border)] rounded-3xl"
    >
      {fromOffer ? (
        <div
          role="note"
          className="rounded-2xl border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/5 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-black)]">
            {ro ? "Pasul 2 din 2" : "Step 2 of 2"}
          </p>
          <h2 className="mt-2 text-xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            {ro
              ? "Adaugă datele de contact și trimite cererea."
              : "Add your contact details and send the request."}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-soft)]">
            {ro
              ? "Selecția ta este pregătită, dar nu a fost încă trimisă. Cererea ajunge la noi numai după ce apeși butonul de trimitere de la finalul formularului."
              : "Your selection is ready, but it has not been sent yet. We receive it only after you press the send button at the end of this form."}
          </p>
        </div>
      ) : null}

      {selectedProducts.length > 0 && (
        <SelectedProductsPanel items={selectedProducts} locale={locale} />
      )}

      <p
        id="contact-required-fields"
        role="note"
        className="rounded-xl bg-[var(--surface-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--text-soft)]"
      >
        <strong className="font-semibold text-[var(--brand-black)]">
          {ro ? "Doar emailul și telefonul sunt obligatorii." : "Only email and phone are required."}
        </strong>{" "}
        {ro
          ? "Toate celelalte câmpuri sunt opționale și ne ajută să pregătim mai repede oferta."
          : "Everything else is optional and helps us prepare your quote faster."}
      </p>

      <FieldGroup label={ro ? "Despre tine" : "About you"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="contact-name"
            label={ro ? "Nume" : "Name"}
            optionalText={optionalText}
          >
            <input
              id="contact-name"
              type="text"
              maxLength={CONTACT_FIELD_LIMITS.name}
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="name"
              className={inputClass(false)}
            />
          </Field>
          <Field
            id="contact-email"
            label="Email"
            required
            error={errors.email}
          >
            <input
              id="contact-email"
              type="email"
              maxLength={CONTACT_FIELD_LIMITS.email}
              value={state.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              autoComplete="email"
              required
              aria-invalid={!!errors.email}
              aria-describedby="contact-email-details"
              className={inputClass(!!errors.email)}
            />
          </Field>
          <Field
            id="contact-phone"
            label={ro ? "Telefon" : "Phone"}
            required
            error={errors.phone}
          >
            <input
              id="contact-phone"
              type="tel"
              maxLength={CONTACT_FIELD_LIMITS.phone}
              value={state.phone}
              onChange={(e) => update("phone", e.target.value)}
              onBlur={() => markTouched("phone")}
              autoComplete="tel"
              required
              aria-invalid={!!errors.phone}
              aria-describedby="contact-phone-details"
              className={inputClass(!!errors.phone)}
            />
          </Field>
          <Field
            id="contact-company"
            label={ro ? "Companie" : "Company"}
            optionalText={optionalText}
          >
            <input
              id="contact-company"
              type="text"
              maxLength={CONTACT_FIELD_LIMITS.company}
              value={state.company}
              onChange={(e) => update("company", e.target.value)}
              autoComplete="organization"
              className={inputClass(false)}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label={ro ? "Despre proiect" : "About the project"}>
        <div className="flex flex-col gap-6">
          {!hasSelectedProducts && (
            <Field
              label={ro ? "Cantitate estimată" : "Quantity estimate"}
              optionalText={optionalText}
            >
              <ChipGroup
                variant="single"
                name="quantity"
                label={ro ? "Cantitate estimată" : "Quantity estimate"}
                options={QUANTITY_BUCKETS}
                value={state.quantity}
                onChange={(v) => update("quantity", v)}
              />
              {state.quantity === "other" && (
                <input
                  type="text"
                  maxLength={CONTACT_FIELD_LIMITS.quantityOther}
                  aria-label={ro ? "Altă cantitate" : "Other quantity"}
                  placeholder={ro ? "ex. 12.500 bucăți" : "e.g. 12,500 units"}
                  value={state.quantityOther}
                  onChange={(e) => update("quantityOther", e.target.value)}
                  className={`${inputClass(false)} mt-3`}
                />
              )}
            </Field>
          )}
          <Field
            label={ro ? "Termen limită" : "Deadline"}
            optionalText={optionalText}
            help={ro ? "Alege un interval sau o dată exactă" : "Pick a timeframe or set an exact date"}
          >
            <DeadlinePicker
              preset={state.deadlinePreset}
              date={state.deadlineDate}
              minDate={minDeadline}
              onPresetChange={(v) => {
                update("deadlinePreset", v)
                if (v !== null) update("deadlineDate", "")
              }}
              onDateChange={(v) => {
                update("deadlineDate", v)
                if (v.length > 0) update("deadlinePreset", null)
              }}
              locale={locale}
            />
          </Field>
          <Field
            id="contact-context"
            label={ro ? "Spune-ne despre eveniment, public sau campanie" : "Tell us about the event, audience or campaign"}
            optionalText={optionalText}
            help={`${state.context.length}/${MAX_CONTEXT_CHARS}`}
          >
            <textarea
              id="contact-context"
              value={state.context}
              maxLength={MAX_CONTEXT_CHARS}
              onChange={(e) => update("context", e.target.value.slice(0, MAX_CONTEXT_CHARS))}
              rows={5}
              placeholder={ro ? "Cui se adresează, când are loc și cum arată rezultatul dorit…" : "Who is it for, when does it happen, what does success look like…"}
              aria-describedby="contact-context-details"
              className={`${inputClass(false)} resize-y min-h-32`}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup
        label={ro ? "Fișiere și grafică" : "Files & artwork"}
        optionalText={optionalText}
      >
        <FileDropZone
          files={state.files}
          onChange={(files) => update("files", files)}
          maxBytes={MAX_FILE_BYTES}
          maxTotalBytes={MAX_TOTAL_UPLOAD_BYTES}
          maxFiles={MAX_FILE_COUNT}
          accept={ACCEPT_FILES_ATTR}
        />
      </FieldGroup>

      <div className="flex flex-col gap-4 pt-2">
        {hasSelectedProducts ? (
          <div
            role="note"
            className="rounded-xl border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/5 px-4 py-3 text-sm leading-relaxed text-[var(--text-soft)]"
          >
            {priceDisclosure.detailed}
          </div>
        ) : null}
        {submitError && (
          <div
            role="alert"
            className="px-4 py-3 text-sm text-[var(--brand-orange)] bg-[var(--surface-soft)] border border-[var(--brand-orange)] rounded-xl"
          >
            {submitError}
          </div>
        )}
        <p
          id="contact-submit-help"
          aria-live="polite"
          className="text-center text-sm text-[var(--text-soft)]"
        >
          {requiredValid
            ? ro
              ? "Datele obligatorii sunt complete. Poți trimite cererea."
              : "Required details are complete. You can send the request."
            : ro
              ? "Completează un email valid și numărul de telefon pentru a activa trimiterea."
              : "Enter a valid email and your phone number to enable sending."}
        </p>
        <button
          type="submit"
          disabled={!requiredValid || submitting}
          aria-describedby="contact-required-fields contact-submit-help"
          className={`inline-flex items-center justify-center gap-2 px-6 py-4 w-full text-base font-semibold text-white rounded-full transition-all ${
            !requiredValid || submitting
              ? "bg-[var(--text-muted)] cursor-not-allowed"
              : "bg-[var(--brand-orange)] hover:scale-[1.01]"
          }`}
        >
          {submitting ? (ro ? "Se trimite…" : "Sending…") : (
            <>
              <span>
                {ro
                  ? hasSelectedProducts
                    ? "Trimite cererea de ofertă"
                    : "Trimite cererea"
                  : hasSelectedProducts
                    ? "Send quote request"
                    : "Send request"}
              </span>
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
        <p className="text-xs text-[var(--text-muted)] text-center">
          {ro ? "Prin trimitere ești de acord cu " : "By sending you agree to our "}
          <Link
            href="/privacy"
            className="text-[var(--text-soft)] hover:text-[var(--brand-orange)] underline"
          >
            {ro ? "politica de confidențialitate" : "privacy policy"}
          </Link>
          . {ro ? "Răspundem în cel mult o zi lucrătoare." : "We respond within 1 business day."}
        </p>
      </div>
    </form>
  )
}

function inputClass(hasError: boolean): string {
  return `block px-4 py-3 w-full text-sm text-[var(--brand-black)] bg-[var(--surface-soft)] border rounded-xl outline-none transition-colors focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--brand-orange)] ${
    hasError
      ? "border-[var(--brand-orange)]"
      : "border-transparent focus:border-[var(--brand-orange)]"
  }`
}

function FieldGroup({
  label,
  optionalText,
  children,
}: {
  label: string
  optionalText?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
        {label}
        {optionalText ? (
          <>
            {" "}
            <span className="ml-2 font-normal normal-case tracking-normal text-[var(--text-muted)]">
              ({optionalText})
            </span>
          </>
        ) : null}
      </h3>
      {children}
    </div>
  )
}

function Field({
  id,
  label,
  required,
  optionalText,
  error,
  help,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  optionalText?: string
  error?: string
  help?: string
  children: React.ReactNode
}) {
  const labelContent = (
    <span className="flex items-center gap-1 text-sm font-medium text-[var(--text-soft)]">
      {label}
      {required ? (
        <span aria-hidden="true" className="text-[var(--brand-orange)]">
          *
        </span>
      ) : null}
      {optionalText ? (
        <span className="font-normal text-[var(--text-muted)]">
          ({optionalText})
        </span>
      ) : null}
    </span>
  )

  return (
    <div className="flex flex-col gap-2">
      {id ? <label htmlFor={id}>{labelContent}</label> : labelContent}
      {children}
      <span
        id={id ? `${id}-details` : undefined}
        className="flex items-center justify-between gap-2 text-xs"
      >
        <span className="text-[var(--brand-orange)]">{error ?? ""}</span>
        {help && (
          <span className="text-[var(--text-muted)]">{help}</span>
        )}
      </span>
    </div>
  )
}

function DeadlinePicker({
  preset,
  date,
  minDate,
  onPresetChange,
  onDateChange,
  locale,
}: {
  preset: DeadlinePreset | null
  date: string
  minDate: string
  onPresetChange: (v: DeadlinePreset | null) => void
  onDateChange: (v: string) => void
  locale: "ro" | "en"
}) {
  const ro = locale === "ro"
  const activeHint = DEADLINE_PRESETS.find((p) => p.value === preset)?.hint
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">
        {ro ? "Interval preferat" : "Preferred timeframe"}
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="cursor-pointer">
          <input
            type="radio"
            name="deadline-preset"
            value=""
            checked={preset === null && date.length === 0}
            onChange={() => {
              onPresetChange(null)
              onDateChange("")
            }}
            className="peer sr-only"
          />
          <span className="flex h-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-sm font-medium text-[var(--text-soft)] transition-all hover:scale-[1.02] hover:border-[var(--border-strong)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-orange)] peer-focus-visible:ring-offset-2">
            {ro ? "Fără preferință" : "No preference"}
          </span>
        </label>
        {DEADLINE_PRESETS.map((opt) => {
          const selected = preset === opt.value
          return (
            <label
              key={opt.value}
              className="cursor-pointer"
            >
              <input
                type="radio"
                name="deadline-preset"
                value={opt.value}
                checked={selected}
                onChange={() => onPresetChange(opt.value)}
                className="peer sr-only"
              />
              <span className="flex h-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-center text-sm font-medium text-[var(--text-soft)] transition-all hover:scale-[1.02] hover:border-[var(--border-strong)] peer-checked:border-[var(--brand-orange)] peer-checked:bg-[var(--brand-orange)] peer-checked:text-white peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--brand-orange)] peer-focus-visible:ring-offset-2">
                {ro
                  ? ({ "2-weeks": "În 2 săptămâni", "1-month": "Într-o lună", "2-3-months": "2–3 luni", flexible: "Flexibil" } as const)[opt.value]
                  : opt.label}
              </span>
            </label>
          )
        })}
      </div>
      {activeHint && (
        <p className="text-xs text-[var(--text-muted)]">
          {ro && preset
            ? ({ "2-weeks": "Urgent — se poate aplica un tarif premium", "1-month": "Termen standard", "2-3-months": "Interval optim pentru preț", flexible: "Îți recomandăm calendarul optim" } as const)[preset]
            : activeHint}
        </p>
      )}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
          {ro ? "sau" : "or"}
        </span>
        <span className="flex-1 h-px bg-[var(--border-soft)]" />
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          {ro ? "Dată exactă" : "Exact date"}
        </span>
        <input
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={inputClass(false)}
        />
      </label>
    </fieldset>
  )
}

function SelectedProductsPanel({
  items,
  locale,
}: {
  items: OfferItem[]
  locale: "ro" | "en"
}) {
  const ro = locale === "ro"
  const priceDisclosure = getPriceDisclosure(locale)

  return (
    <div className="flex flex-col gap-3 p-5 bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          {ro ? "Produse selectate" : "Selected products"} ({items.length})
        </h3>
        <Link
          href="/offer"
          className="text-xs font-medium text-[var(--text-soft)] hover:text-[var(--brand-orange)] transition-colors"
        >
          {ro ? "Editează selecția" : "Edit selection"} →
        </Link>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const variantLabel = [item.colorName, item.sizeLabel]
            .filter(Boolean)
            .join(" · ")
          const decoration = summarizeDecorationSelection(item, locale)
          return (
            <li
              key={lineKey(item)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--brand-black)]"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                <span>{item.name}</span>
                {item.supplierSku ? (
                  <span className="font-mono text-[var(--text-soft)]">
                    {item.supplierSku}
                  </span>
                ) : null}
                {variantLabel ? (
                  <span className="text-[var(--text-soft)]">{variantLabel}</span>
                ) : null}
                <span className="text-[var(--text-muted)]">× {item.quantity}</span>
              </div>
              {decoration ? (
                <div className="mt-2 border-t border-[var(--border-soft)] pt-2 leading-relaxed text-[var(--text-soft)]">
                  <p>
                    <span className="font-semibold text-[var(--brand-black)]">
                      {ro ? "Personalizare selectată" : "Selected personalization"}:
                    </span>{" "}
                    {decoration.method}
                  </p>
                  <p className="mt-0.5 text-[var(--text-muted)]">
                    {decoration.options.join(" · ")}
                  </p>
                  <p className="mt-1 font-medium text-[var(--brand-black)]">
                    {ro ? "Estimare personalizare" : "Personalization estimate"}: {decoration.decorationPrice}
                    {decoration.lineTotal
                      ? ` · ${ro ? "Produse + personalizare" : "Products + personalization"}: ${decoration.lineTotal}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)]">
        {priceDisclosure.compact}
      </p>
    </div>
  )
}

function SuccessCard({
  hadSelection,
  hadBriefDetails,
  locale,
  onClearOffer,
}: {
  hadSelection: boolean
  hadBriefDetails: boolean
  locale: "ro" | "en"
  onClearOffer: () => void
}) {
  const ro = locale === "ro"
  const priceDisclosure = getPriceDisclosure(locale)

  return (
    <div className="flex flex-col items-start gap-6 p-8 lg:p-12 bg-[var(--surface)] border border-[var(--border)] rounded-3xl">
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-16 h-16 text-white bg-[var(--brand-orange)] rounded-2xl"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl sm:text-4xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          {ro ? "Am primit cererea." : "Request received."}
        </h2>
        <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
          {hadBriefDetails
            ? ro
              ? "Mulțumim. Un membru al echipei de producție va analiza detaliile și va reveni în cel mult o zi lucrătoare cu următorii pași, iar unde este posibil, cu oferta și planul de mostre."
              : "Thank you. A member of our production team will review the details and come back within 1 business day with next steps and, where possible, a quote and sample plan."
            : ro
              ? "Mulțumim. Te vom contacta în cel mult o zi lucrătoare pentru a clarifica detaliile proiectului și următorii pași."
              : "Thank you. We'll contact you within 1 business day to clarify the project details and next steps."}
        </p>
        {hadSelection ? (
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">
            {priceDisclosure.detailed}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[var(--brand-orange)] rounded-full hover:scale-[1.02] transition-transform"
        >
          <span>{ro ? "Înapoi la pagina principală" : "Back to homepage"}</span>
          <span aria-hidden="true">→</span>
        </Link>
        {hadSelection && (
          <button
            type="button"
            onClick={onClearOffer}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-[var(--text-soft)] hover:text-[var(--brand-black)] bg-transparent transition-colors"
          >
            {ro ? "Golește oferta" : "Clear my offer"}
          </button>
        )}
      </div>
    </div>
  )
}
