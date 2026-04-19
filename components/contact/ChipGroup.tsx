"use client"

interface Option<T extends string> {
  value: T
  label: string
}

interface SingleProps<T extends string> {
  variant: "single"
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  label?: string
  name: string
}

interface MultiProps<T extends string> {
  variant: "multi"
  options: Option<T>[]
  value: T[]
  onChange: (value: T[]) => void
  label?: string
  name: string
}

type Props<T extends string> = SingleProps<T> | MultiProps<T>

export default function ChipGroup<T extends string>(props: Props<T>) {
  const isSelected = (v: T) =>
    props.variant === "single" ? props.value === v : props.value.includes(v)

  const handleClick = (v: T) => {
    if (props.variant === "single") {
      props.onChange(v)
    } else {
      const next = props.value.includes(v)
        ? props.value.filter((x) => x !== v)
        : [...props.value, v]
      props.onChange(next)
    }
  }

  return (
    <div role={props.variant === "single" ? "radiogroup" : "group"} aria-label={props.label ?? props.name}>
      <div className="flex flex-wrap gap-2">
        {props.options.map((opt) => {
          const selected = isSelected(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              role={props.variant === "single" ? "radio" : "checkbox"}
              aria-checked={selected}
              onClick={() => handleClick(opt.value)}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border transition-all hover:scale-[1.03] ${
                selected
                  ? "text-white bg-[var(--brand-orange)] border-[var(--brand-orange)]"
                  : "text-[var(--text-soft)] bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
