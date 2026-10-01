"use client"

import Image from "next/image"
import Link from "next/link"
import {
  categoryItemLabel,
  type CategoryNode,
} from "@/lib/content/categories"
import { useLanguage } from "@/components/LanguageProvider"

interface Props {
  category: CategoryNode
  productCount: number
  href?: string
  priority?: boolean
  representativeImage?: string
}

export default function CategoryCard({
  category,
  productCount,
  href,
  priority = false,
  representativeImage,
}: Readonly<Props>) {
  const { locale } = useLanguage()
  const ro = locale === "ro"
  const target = href ?? `/catalog/${category.slug}`
  const image = representativeImage ?? category.image
  const usesProductImage = Boolean(representativeImage)
  return (
    <Link
      href={target}
      className="group flex flex-col gap-3 overflow-hidden"
    >
      <div className="relative overflow-hidden aspect-[4/3] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {image ? (
          <Image
            src={image}
            alt={category.name}
            fill
            loading={priority ? "eager" : "lazy"}
            sizes="(min-width: 1024px) 352px, (min-width: 640px) 45vw, calc(100vw - 48px)"
            className={usesProductImage
              ? "object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
              : "object-cover transition-transform duration-500 group-hover:scale-[1.04]"}
          />
        ) : (
          /* Inline style: data-driven gradient from CategoryNode.accent */
          <div
            aria-hidden="true"
            className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
            style={{ background: category.accent ?? "linear-gradient(135deg, #4D4D4D 0%, #0F0F10 100%)" }}
          />
        )}
        <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-medium text-white bg-black/35 backdrop-blur-sm rounded-full">
          {productCount}{" "}
          {ro
            ? category.contentType === "project"
              ? productCount === 1 ? "proiect" : "proiecte"
              : productCount === 1 ? "produs" : "produse"
            : categoryItemLabel(category, productCount)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
          {category.name}
        </h3>
        {category.description ? (
          <p className="text-sm leading-relaxed text-[var(--text-soft)]">
            {category.description}
          </p>
        ) : null}
        <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-[var(--brand-orange)] group-hover:gap-2 transition-all">
          <span>{ro ? "Explorează categoria" : `Browse ${category.name.toLowerCase()}`}</span>
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  )
}
