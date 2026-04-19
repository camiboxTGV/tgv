import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import CategoryCard from "@/components/CategoryCard"
import ProductCard from "@/components/ProductCard"
import ProductDetail from "@/components/ProductDetail"
import {
  PERSONALIZATION_LABELS,
  type Personalization,
  allCategorySlugPaths,
  getCategoryByPath,
} from "@/lib/content/catalog"
import {
  allProducts,
  countProductsUnder,
  getProductBySlug,
  getProductsByCategoryPath,
  getProductVariants,
} from "@/lib/content/catalog.server"
import {
  breadcrumbsFor,
  findNode,
  isLeaf,
  joinPath,
  splitPath,
  type CategoryNode,
} from "@/lib/content/categories"

interface PageProps {
  params: Promise<{ slug: string[] }>
}

const PERSONALIZATIONS: Personalization[] = [
  "co2",
  "fiber-laser",
  "uv-print",
  "uv-transfer",
]

const VALID_CATEGORY_PATHS = new Set(allCategorySlugPaths())

interface ResolvedParams {
  kind: "category" | "product" | "missing"
  segments: string[]
  productSlug?: string
  categorySegments?: string[]
}

function resolveSlug(slug: string[]): ResolvedParams {
  const slugPath = slug.join("/")
  if (VALID_CATEGORY_PATHS.has(slugPath)) {
    return { kind: "category", segments: slug }
  }
  if (slug.length < 2) return { kind: "missing", segments: slug }
  const parent = slug.slice(0, -1)
  const parentPath = parent.join("/")
  if (!VALID_CATEGORY_PATHS.has(parentPath)) {
    return { kind: "missing", segments: slug }
  }
  const productSlug = slug.at(-1)
  if (!productSlug) return { kind: "missing", segments: slug }
  const product = getProductBySlug(productSlug)
  if (!product || product.category !== parentPath) {
    return { kind: "missing", segments: slug }
  }
  return {
    kind: "product",
    segments: slug,
    productSlug,
    categorySegments: parent,
  }
}

export function generateStaticParams() {
  const categoryParams = allCategorySlugPaths().map((slugPath) => ({
    slug: splitPath(slugPath),
  }))
  const productParams = allProducts().map((p) => ({
    slug: [...splitPath(p.category), p.slug],
  }))
  return [...categoryParams, ...productParams]
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const resolved = resolveSlug(slug)

  if (resolved.kind === "category") {
    const node = getCategoryByPath(slug)
    if (!node) return { title: "Catalog — TGV-Media" }
    return {
      title: `${node.name} — Catalog — TGV-Media`,
      description:
        node.description ?? `Browse ${node.name.toLowerCase()} products.`,
    }
  }

  if (resolved.kind === "product" && resolved.productSlug) {
    const product = getProductBySlug(resolved.productSlug)
    if (!product) return { title: "Catalog — TGV-Media" }
    const leaf = findNode(splitPath(product.category))
    const description = (product.descriptionLong ?? product.summary).slice(0, 160)
    const firstImage = product.images[0]
    return {
      title: `${product.name} — ${leaf?.name ?? "Catalog"} — TGV-Media`,
      description,
      openGraph: firstImage
        ? {
            title: product.name,
            description,
            images: [{ url: firstImage }],
          }
        : { title: product.name, description },
    }
  }

  return { title: "Catalog — TGV-Media" }
}

export default async function CatalogPage({ params }: Readonly<PageProps>) {
  const { slug } = await params
  const resolved = resolveSlug(slug)

  if (resolved.kind === "missing") notFound()

  if (resolved.kind === "product" && resolved.productSlug && resolved.categorySegments) {
    const product = getProductBySlug(resolved.productSlug)
    if (!product) notFound()
    const variants = product.hasVariantDetail
      ? getProductVariants(product.slug)
      : []
    return (
      <ProductDetailShell
        product={product}
        variants={variants}
        categorySegments={resolved.categorySegments}
      />
    )
  }

  return <CategoryView segments={resolved.segments} />
}

function CategoryView({ segments }: Readonly<{ segments: string[] }>) {
  const node = getCategoryByPath(segments)
  if (!node) notFound()

  const crumbs = breadcrumbsFor(segments)
  const totalCount = countProductsUnder(node, segments.slice(0, -1))
  const isLeafNode = isLeaf(node)

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mx-auto px-6 lg:px-8 pt-10 max-w-6xl"
      >
        <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <li>
            <Link href="/" className="hover:text-[var(--brand-black)] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/catalog" className="hover:text-[var(--brand-black)] transition-colors">
              Catalog
            </Link>
          </li>
          {crumbs.map((c, i) => (
            <CrumbItem
              key={c.href}
              label={c.label}
              href={c.href}
              isLast={i === crumbs.length - 1}
            />
          ))}
        </ol>
      </nav>

      <section className="relative mx-auto px-6 lg:px-8 pt-8 pb-12 lg:pt-12 lg:pb-16 max-w-6xl overflow-hidden">
        {node.accent ? (
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-48 h-48 lg:w-72 lg:h-72 rounded-full blur-3xl opacity-20"
            style={{ background: node.accent }}
          />
        ) : null}
        <p className="relative text-sm font-semibold uppercase tracking-widest text-[var(--brand-orange)]">
          Catalog
        </p>
        <h1 className="relative mt-4 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-[family-name:var(--font-outfit)] font-bold leading-tight tracking-tight text-[var(--brand-black)]">
          {node.name}
        </h1>
        {node.description ? (
          <p className="relative mt-6 max-w-2xl text-lg text-[var(--text-soft)] leading-relaxed">
            {node.description}
          </p>
        ) : null}
        <p className="relative mt-3 text-sm text-[var(--text-muted)]">
          {totalCount} {totalCount === 1 ? "product" : "products"} available for personalization.
        </p>
      </section>

      {isLeafNode ? (
        <LeafProducts slug={segments} />
      ) : (
        <SubcategoryGrid
          parentPath={segments}
          subcategories={node.children ?? []}
        />
      )}

      <section className="bg-[var(--surface)] border-y border-[var(--border-soft)]">
        <div className="mx-auto px-6 lg:px-8 py-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              Available techniques
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PERSONALIZATIONS.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-soft)] bg-[var(--surface-soft)] border border-[var(--border-soft)] rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full bg-[var(--brand-orange)]"
                  />
                  {PERSONALIZATION_LABELS[p].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto px-6 lg:px-8 pb-16 lg:pb-24 pt-12 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 lg:p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <div>
            <h2 className="text-lg font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              Don't see what you need?
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              We build bespoke pieces from substrate up.
            </p>
          </div>
          <Link
            href="/services/productie-custom"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            <span>Custom production</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  )
}

function ProductDetailShell({
  product,
  variants,
  categorySegments,
}: Readonly<{
  product: import("@/lib/content/catalog").CatalogProduct
  variants: import("@/lib/content/catalog").ProductVariant[]
  categorySegments: string[]
}>) {
  const crumbs = breadcrumbsFor(categorySegments)
  const currentHref = `/catalog/${joinPath([...categorySegments, product.slug])}`
  const leaf = findNode(splitPath(product.category))
  const siblings = getProductsByCategoryPath(categorySegments)
  const related = pickRelated(siblings, product.slug, 6)

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mx-auto px-6 lg:px-8 pt-10 max-w-6xl"
      >
        <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
          <li>
            <Link href="/" className="hover:text-[var(--brand-black)] transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/catalog" className="hover:text-[var(--brand-black)] transition-colors">
              Catalog
            </Link>
          </li>
          {crumbs.map((c) => (
            <CrumbItem key={c.href} label={c.label} href={c.href} isLast={false} />
          ))}
          <CrumbItem label={product.name} href={currentHref} isLast={true} />
        </ol>
      </nav>

      <ProductDetail
        product={product}
        variants={variants}
        leafCategory={leaf ?? null}
      />

      {related.length > 0 ? (
        <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
            You may also like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

function pickRelated<T extends { slug: string }>(
  pool: T[],
  currentSlug: string,
  count: number,
): T[] {
  const filtered = pool.filter((p) => p.slug !== currentSlug)
  if (filtered.length <= count) return filtered
  const hash = (s: string): number => {
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = Math.trunc(h * 31 + (s.codePointAt(i) ?? 0))
    }
    return Math.abs(h)
  }
  const scored = filtered.map((p) => ({ p, h: hash(p.slug + currentSlug) }))
  scored.sort((a, b) => a.h - b.h)
  return scored.slice(0, count).map((s) => s.p)
}

function CrumbItem({
  label,
  href,
  isLast,
}: Readonly<{ label: string; href: string; isLast: boolean }>) {
  return (
    <>
      <li aria-hidden="true">/</li>
      <li>
        {isLast ? (
          <span className="text-[var(--text-soft)] truncate max-w-[40ch] inline-block align-bottom">
            {label}
          </span>
        ) : (
          <Link href={href} className="hover:text-[var(--brand-black)] transition-colors">
            {label}
          </Link>
        )}
      </li>
    </>
  )
}

function LeafProducts({ slug }: Readonly<{ slug: string[] }>) {
  const products = getProductsByCategoryPath(slug)
  if (products.length === 0) {
    return (
      <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
        <p className="text-sm text-[var(--text-muted)]">
          No products in this category yet. Check back after the next catalog sync.
        </p>
      </section>
    )
  }
  return (
    <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  )
}

function SubcategoryGrid({
  parentPath,
  subcategories,
}: Readonly<{
  parentPath: string[]
  subcategories: CategoryNode[]
}>) {
  return (
    <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subcategories.map((child) => (
          <CategoryCard
            key={child.slug}
            category={child}
            href={`/catalog/${[...parentPath, child.slug].join("/")}`}
            productCount={countProductsUnder(child, parentPath)}
          />
        ))}
      </div>
    </section>
  )
}

