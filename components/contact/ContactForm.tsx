"use client"

import Link from "next/link"
import { useEffect, useId, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import ChipGroup from "@/components/contact/ChipGroup"
import FileDropZone from "@/components/contact/FileDropZone"
import { useOffer } from "@/components/OfferProvider"
import { deserializeFromUrl, type OfferItem } from "@/lib/offer/storage"

type ProjectType =
  | "promotional"
  | "custom-production"
  | "print-collateral"
  | "awards-gifting"
  | "other"

type QuantityBucket = "1-50" | "50-500" | "500-5000" | "5000+" | "other"

type PersonalizationPref =
  | "co2"
  | "fiber-laser"
  | "uv-print"
  | "uv-transfer"
  | "hot-foil"
  | "custom-production"
  | "digital-print"
  | "not-sure"

interface FormState {
  name: string
  email: string
  phone: string
  company: string
  projectType: ProjectType | null
  quantity: QuantityBucket | null
  quantityOther: string
  deadline: string
  context: string
  personalizationPrefs: PersonalizationPref[]
  files: File[]
}

type Errors = Partial<Record<keyof FormState, string>>

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "promotional", label: "Promotional products" },
  { value: "custom-production", label: "Custom production" },
  { value: "print-collateral", label: "Print collateral" },
  { value: "awards-gifting", label: "Awards & gifting" },
  { value: "other", label: "Other" },
]

const QUANTITY_BUCKETS: { value: QuantityBucket; label: string }[] = [
  { value: "1-50", label: "1–50" },
  { value: "50-500", label: "50–500" },
  { value: "500-5000", label: "500–5,000" },
  { value: "5000+", label: "5,000+" },
  { value: "other", label: "Other" },
]

const PERSONALIZATION_PREFS: { value: PersonalizationPref; label: string }[] = [
  { value: "co2", label: "Gravură CO2" },
  { value: "fiber-laser", label: "Gravură fiber laser" },
  { value: "uv-print", label: "Print UV" },
  { value: "uv-transfer", label: "Transfer UV" },
  { value: "hot-foil", label: "Timbru sec & folio" },
  { value: "custom-production", label: "Producție custom" },
  { value: "digital-print", label: "Tipar digital" },
  { value: "not-sure", label: "Not sure yet" },
]

const MAX_FILE_BYTES = 25 * 1024 * 1024
const ACCEPT_FILES = ".ai,.eps,.svg,.pdf,.png,.tiff,.tif,.jpg,.jpeg,.psd,.indd"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const initial: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  projectType: null,
  quantity: null,
  quantityOther: "",
  deadline: "",
  context: "",
  personalizationPrefs: [],
  files: [],
}

export default function ContactForm() {
  const searchParams = useSearchParams()
  const { items: offerItems, clear } = useOffer()
  const [state, setState] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<OfferItem[]>([])

  const fromOffer = searchParams?.get("from") === "offer"

  useEffect(() => {
    if (!fromOffer) return
    const itemsParam = searchParams?.get("items")
    if (itemsParam) {
      const decoded = deserializeFromUrl(itemsParam)
      if (decoded && decoded.length > 0) {
        setSelectedProducts(decoded)
        return
      }
    }
    if (offerItems.length > 0) setSelectedProducts(offerItems)
  }, [fromOffer, searchParams, offerItems])

  const requiredValid = useMemo(() => {
    return (
      state.name.trim().length > 0 &&
      EMAIL_REGEX.test(state.email.trim()) &&
      state.projectType !== null &&
      state.context.trim().length >= 20
    )
  }, [state])

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
      case "name":
        return (value as string).trim().length > 0 ? undefined : "Required."
      case "email": {
        const v = (value as string).trim()
        if (v.length === 0) return "Required."
        if (!EMAIL_REGEX.test(v)) return "Use a valid email."
        return undefined
      }
      case "projectType":
        return value === null ? "Pick one." : undefined
      case "context": {
        const v = (value as string).trim()
        if (v.length === 0) return "Required."
        if (v.length < 20) return `Tell us a bit more (min 20 chars, ${v.length} so far).`
        return undefined
      }
      default:
        return undefined
    }
  }

  function validateAll(): boolean {
    const all: Errors = {}
    const keys: (keyof FormState)[] = ["name", "email", "projectType", "context"]
    keys.forEach((k) => {
      const err = validateField(k, state[k])
      if (err) all[k] = err
    })
    setErrors(all)
    setTouched(new Set(keys))
    return Object.keys(all).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAll()) return
    setSubmitting(true)

    const payload = {
      ...state,
      files: state.files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
      selectedProducts,
      submittedAt: new Date().toISOString(),
    }
    // eslint-disable-next-line no-console
    console.log("[contact] brief payload", payload)

    window.setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 800)
  }

  if (submitted) {
    return (
      <SuccessCard
        hadSelection={selectedProducts.length > 0}
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
      {selectedProducts.length > 0 && (
        <SelectedProductsPanel items={selectedProducts} />
      )}

      <FieldGroup label="About you">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Name"
            required
            error={errors.name}
          >
            <input
              type="text"
              value={state.name}
              onChange={(e) => update("name", e.target.value)}
              onBlur={() => markTouched("name")}
              autoComplete="name"
              className={inputClass(!!errors.name)}
            />
          </Field>
          <Field
            label="Email"
            required
            error={errors.email}
          >
            <input
              type="email"
              value={state.email}
              onChange={(e) => update("email", e.target.value)}
              onBlur={() => markTouched("email")}
              autoComplete="email"
              className={inputClass(!!errors.email)}
            />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input
              type="tel"
              value={state.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
              className={inputClass(false)}
            />
          </Field>
          <Field label="Company" error={errors.company}>
            <input
              type="text"
              value={state.company}
              onChange={(e) => update("company", e.target.value)}
              autoComplete="organization"
              className={inputClass(false)}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="About the project">
        <div className="flex flex-col gap-6">
          <Field
            label="Project type"
            required
            error={errors.projectType}
          >
            <ChipGroup
              variant="single"
              name="projectType"
              options={PROJECT_TYPES}
              value={state.projectType}
              onChange={(v) => {
                update("projectType", v)
                markTouched("projectType")
              }}
            />
          </Field>
          <Field label="Quantity estimate">
            <ChipGroup
              variant="single"
              name="quantity"
              options={QUANTITY_BUCKETS}
              value={state.quantity}
              onChange={(v) => update("quantity", v)}
            />
            {state.quantity === "other" && (
              <input
                type="text"
                placeholder="e.g. 12,500 units"
                value={state.quantityOther}
                onChange={(e) => update("quantityOther", e.target.value)}
                className={`${inputClass(false)} mt-3`}
              />
            )}
          </Field>
          <Field label="Deadline">
            <input
              type="date"
              value={state.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              className={inputClass(false)}
            />
          </Field>
          <Field label="Personalization preferences">
            <ChipGroup
              variant="multi"
              name="personalizationPrefs"
              options={PERSONALIZATION_PREFS}
              value={state.personalizationPrefs}
              onChange={(v) => update("personalizationPrefs", v)}
            />
          </Field>
          <Field
            label="Tell us about the event, audience or campaign"
            required
            error={errors.context}
            help={`${state.context.length}/2000`}
          >
            <textarea
              value={state.context}
              onChange={(e) => update("context", e.target.value.slice(0, 2000))}
              onBlur={() => markTouched("context")}
              rows={5}
              placeholder="Who is it for, when does it happen, what does success look like…"
              className={`${inputClass(!!errors.context)} resize-y min-h-32`}
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Files & artwork">
        <FileDropZone
          files={state.files}
          onChange={(files) => update("files", files)}
          maxBytes={MAX_FILE_BYTES}
          accept={ACCEPT_FILES}
        />
      </FieldGroup>

      <div className="flex flex-col gap-4 pt-2">
        <button
          type="submit"
          disabled={!requiredValid || submitting}
          className={`inline-flex items-center justify-center gap-2 px-6 py-4 w-full text-base font-semibold text-white rounded-full transition-all ${
            !requiredValid || submitting
              ? "bg-[var(--text-muted)] cursor-not-allowed"
              : "bg-[var(--brand-orange)] hover:scale-[1.01]"
          }`}
        >
          {submitting ? "Sending…" : (
            <>
              <span>Send brief</span>
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
        <p className="text-xs text-[var(--text-muted)] text-center">
          By sending you agree to our{" "}
          <Link
            href="/privacy"
            className="text-[var(--text-soft)] hover:text-[var(--brand-orange)] underline"
          >
            privacy policy
          </Link>
          . We respond within 1 business day.
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
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
        {label}
      </h3>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  help?: string
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="flex items-center gap-1 text-sm font-medium text-[var(--text-soft)]">
        {label}
        {required && <span className="text-[var(--brand-orange)]">*</span>}
      </span>
      {children}
      <span className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--brand-orange)]">{error ?? ""}</span>
        {help && (
          <span className="text-[var(--text-muted)]">{help}</span>
        )}
      </span>
    </label>
  )
}

function SelectedProductsPanel({ items }: { items: OfferItem[] }) {
  return (
    <div className="flex flex-col gap-3 p-5 bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          Selected products ({items.length})
        </h3>
        <Link
          href="/offer"
          className="text-xs font-medium text-[var(--text-soft)] hover:text-[var(--brand-orange)] transition-colors"
        >
          Edit selection →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.slug}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--brand-black)] bg-[var(--surface)] border border-[var(--border)] rounded-full"
          >
            {item.name}
            <span className="text-[var(--text-muted)]">× {item.quantity}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function SuccessCard({
  hadSelection,
  onClearOffer,
}: {
  hadSelection: boolean
  onClearOffer: () => void
}) {
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
          Brief received.
        </h2>
        <p className="text-base lg:text-lg text-[var(--text-soft)] leading-relaxed">
          Thank you. A member of our production team will review your brief and
          come back within 1 business day with a quote and a sample plan.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[var(--brand-orange)] rounded-full hover:scale-[1.02] transition-transform"
        >
          <span>Back to homepage</span>
          <span aria-hidden="true">→</span>
        </Link>
        {hadSelection && (
          <button
            type="button"
            onClick={onClearOffer}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-[var(--text-soft)] hover:text-[var(--brand-black)] bg-transparent transition-colors"
          >
            Clear my offer
          </button>
        )}
      </div>
    </div>
  )
}
