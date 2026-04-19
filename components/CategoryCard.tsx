import Link from "next/link"
import type { CatalogCategory } from "@/lib/content/catalog"

interface Props {
  category: CatalogCategory
  productCount: number
}

export default function CategoryCard({ category, productCount }: Props) {
  return (
    <Link
      href={`/catalog/${category.slug}`}
      className="group flex flex-col gap-3 overflow-hidden"
    >
      <div className="relative overflow-hidden aspect-[4/3] rounded-2xl border border-[var(--border)]">
        {/* Inline style: data-driven gradient from CatalogCategory.accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
          style={{ background: category.accent }}
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium text-white bg-black/35 backdrop-blur-sm rounded-full">
          {productCount} {productCount === 1 ? "product" : "products"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          {category.name}
        </h3>
        <p className="text-sm leading-relaxed text-[var(--text-soft)]">
          {category.description}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-[var(--brand-orange)] group-hover:gap-2 transition-all">
          <span>Browse {category.name.toLowerCase()}</span>
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
