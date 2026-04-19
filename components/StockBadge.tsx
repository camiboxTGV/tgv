import type { StockLevel } from "@/lib/content/catalog"

interface Props {
  level: StockLevel
  count?: number
  size?: "sm" | "md"
  className?: string
}

const STOCK_LABEL: Record<StockLevel, string> = {
  "in-stock": "In stock",
  "low": "Low stock",
  "out-of-stock": "Out of stock",
}

const STOCK_CLASS: Record<StockLevel, string> = {
  "in-stock":
    "text-[var(--brand-orange)] bg-[color-mix(in_srgb,var(--brand-orange)_10%,transparent)] border-[color-mix(in_srgb,var(--brand-orange)_25%,transparent)]",
  "low": "text-[#A15C00] bg-[#FFF4E5] border-[#F5D9AE]",
  "out-of-stock":
    "text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border-soft)]",
}

export default function StockBadge({
  level,
  count,
  size = "sm",
  className = "",
}: Readonly<Props>) {
  const sizeClass = size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
  const showCount = typeof count === "number" && count > 0 && level !== "out-of-stock"
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${sizeClass} ${STOCK_CLASS[level]} ${className}`.trim()}
    >
      <span>{STOCK_LABEL[level]}</span>
      {showCount ? (
        <span className="opacity-70">· {count.toLocaleString("en-IE")}</span>
      ) : null}
    </span>
  )
}
