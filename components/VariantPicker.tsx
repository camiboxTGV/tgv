"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ProductVariant } from "@/lib/content/catalog"

interface Props {
  variants: ProductVariant[]
  defaultVariantKey: string | null
  onChange: (variant: ProductVariant) => void
}

const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, XXL: 6, "3XL": 7, XXXL: 7, "4XL": 8, "5XL": 9,
}

function sizeRank(s: string): number {
  return SIZE_ORDER[s.toUpperCase()] ?? 1000
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ra = sizeRank(a)
    const rb = sizeRank(b)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

function uniqueOrdered<T>(input: Iterable<T>): T[] {
  const out: T[] = []
  const seen = new Set<T>()
  for (const x of input) {
    if (!seen.has(x)) {
      seen.add(x)
      out.push(x)
    }
  }
  return out
}

export default function VariantPicker({
  variants,
  defaultVariantKey,
  onChange,
}: Readonly<Props>) {
  const { colors, sizes, hasColor, hasSize } = useMemo(() => {
    const colorNames: string[] = []
    const sizeList: string[] = []
    for (const v of variants) {
      if (v.color?.name) colorNames.push(v.color.name)
      if (v.size) sizeList.push(v.size)
    }
    return {
      colors: uniqueOrdered(colorNames).sort((a, b) => a.localeCompare(b)),
      sizes: sortSizes(uniqueOrdered(sizeList)),
      hasColor: colorNames.length > 0,
      hasSize: sizeList.length > 0,
    }
  }, [variants])

  const colorHexByName = useMemo(() => {
    const m = new Map<string, string | undefined>()
    for (const v of variants) {
      if (v.color?.name && !m.has(v.color.name)) {
        m.set(v.color.name, v.color.hex)
      }
    }
    return m
  }, [variants])

  const initialVariant =
    variants.find((v) => v.contentKey === defaultVariantKey) ?? variants[0] ?? null
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    initialVariant?.color?.name,
  )
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    initialVariant?.size,
  )
  const [autoShiftNotice, setAutoShiftNotice] = useState<string | null>(null)

  const findBest = useCallback(
    (color: string | undefined, size: string | undefined): ProductVariant | null => {
      const byBoth = variants.find((v) => v.color?.name === color && v.size === size)
      if (byBoth) return byBoth
      if (color && !size) return variants.find((v) => v.color?.name === color) ?? null
      if (!color && size) return variants.find((v) => v.size === size) ?? null
      return variants[0] ?? null
    },
    [variants],
  )

  const availableSizesForColor = useMemo(() => {
    if (!selectedColor) return new Set(sizes)
    const out = new Set<string>()
    for (const v of variants) {
      if (v.color?.name === selectedColor && v.size) out.add(v.size)
    }
    return out
  }, [variants, selectedColor, sizes])

  const inStockSizesForColor = useMemo(() => {
    const out = new Set<string>()
    for (const v of variants) {
      if (
        v.color?.name === selectedColor &&
        v.size &&
        v.stockLevel !== "out-of-stock"
      ) {
        out.add(v.size)
      }
    }
    return out
  }, [variants, selectedColor])

  const currentVariant = findBest(selectedColor, selectedSize) ?? variants[0] ?? null

  useEffect(() => {
    if (!currentVariant) return
    onChange(currentVariant)
  }, [currentVariant, onChange])

  const onPickColor = useCallback(
    (color: string) => {
      setAutoShiftNotice(null)
      setSelectedColor(color)
      if (selectedSize && hasSize) {
        const exists = variants.some(
          (v) => v.color?.name === color && v.size === selectedSize,
        )
        if (!exists) {
          const inStock = variants.find(
            (v) =>
              v.color?.name === color &&
              v.size &&
              v.stockLevel !== "out-of-stock",
          )
          const fallback = inStock ?? variants.find((v) => v.color?.name === color)
          if (fallback?.size) {
            setSelectedSize(fallback.size)
            setAutoShiftNotice(
              `Size ${selectedSize} is unavailable in ${color} — showing ${fallback.size}.`,
            )
          } else {
            setSelectedSize(undefined)
          }
        }
      }
    },
    [hasSize, selectedSize, variants],
  )

  const onPickSize = useCallback(
    (size: string) => {
      setAutoShiftNotice(null)
      setSelectedSize(size)
    },
    [],
  )

  if (variants.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {hasColor ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Colour
            </span>
            <span className="text-sm text-[var(--text-soft)]">{selectedColor ?? "—"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const hex = colorHexByName.get(color)
              const active = color === selectedColor
              const hasAnyInStock = variants.some(
                (v) => v.color?.name === color && v.stockLevel !== "out-of-stock",
              )
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => onPickColor(color)}
                  aria-label={color}
                  title={color}
                  className={`relative w-9 h-9 rounded-full border transition-all ${
                    active
                      ? "ring-2 ring-[var(--brand-orange)] ring-offset-2 ring-offset-[var(--bg)] border-transparent"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  } ${!hasAnyInStock ? "opacity-40" : ""}`}
                  style={{
                    background: hex ?? "linear-gradient(135deg, #E2E1E8 0%, #C7C6CE 100%)",
                  }}
                >
                  {!hasAnyInStock ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="block w-full h-0.5 bg-[var(--text-muted)] rotate-45 rounded-full" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {hasSize ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Size
            </span>
            <span className="text-sm text-[var(--text-soft)]">{selectedSize ?? "—"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const active = size === selectedSize
              const exists = availableSizesForColor.has(size)
              const inStock = inStockSizesForColor.has(size)
              const disabled = !exists
              return (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onPickSize(size)}
                  className={`min-w-[3rem] px-3 py-2 text-sm font-medium rounded-full border transition-all ${
                    active
                      ? "bg-[var(--brand-black)] text-white border-[var(--brand-black)]"
                      : inStock
                      ? "bg-[var(--surface)] text-[var(--text-soft)] border-[var(--border)] hover:border-[var(--border-strong)]"
                      : "bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border-soft)]"
                  } ${disabled ? "cursor-not-allowed line-through opacity-60" : "cursor-pointer"}`}
                  aria-pressed={active}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {autoShiftNotice ? (
        <p className="text-xs text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-xl px-3 py-2">
          {autoShiftNotice}
        </p>
      ) : null}
    </div>
  )
}
