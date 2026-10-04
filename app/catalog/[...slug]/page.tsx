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
import { pickCategoryImage } from "@/lib/content/category-images"
import {
  countProductsUnder,
  getProductByCategoryPath,
  getProductsByCategoryPath,
  getProductVariants,
} from "@/lib/content/catalog.server"
import {
  breadcrumbsFor,
  categoryItemLabel,
  findNode,
  isLeaf,
  joinPath,
  splitPath,
  type CategoryNode,
} from "@/lib/content/categories"
import { paginateItems } from "@/lib/content/pagination"
import LocalizedText from "@/components/LocalizedText"

export const dynamic = "force-static"
export const dynamicParams = true

interface PageProps {
  params: Promise<{ slug: string[] }>
}

const PERSONALIZATIONS: Personalization[] = [
  "co2",
  "fiber-laser",
  "uv-print",
  "pad-screen",
  "textile-transfer",
  "uv-transfer",
]

const VALID_CATEGORY_PATHS = new Set(allCategorySlugPaths())

interface ResolvedParams {
  kind: "category" | "product" | "missing"
  segments: string[]
  page?: number
  productSlug?: string
  categorySegments?: string[]
}

function resolveSlug(slug: string[]): ResolvedParams {
  const slugPath = slug.join("/")
  if (VALID_CATEGORY_PATHS.has(slugPath)) {
    return { kind: "category", segments: slug, page: 1 }
  }

  if (slug.at(-2) === "page") {
    const rawPage = slug.at(-1) ?? ""
    const page = /^\d+$/.test(rawPage) ? Number(rawPage) : Number.NaN
    const categorySegments = slug.slice(0, -2)
    const categoryPath = categorySegments.join("/")
    const category = getCategoryByPath(categorySegments)
    if (
      Number.isSafeInteger(page) &&
      page > 1 &&
      rawPage === String(page) &&
      VALID_CATEGORY_PATHS.has(categoryPath) &&
      category &&
      isLeaf(category)
    ) {
      return {
        kind: "category",
        segments: categorySegments,
        page,
      }
    }
    return { kind: "missing", segments: slug }
  }
  if (slug.length < 2) return { kind: "missing", segments: slug }
  const parent = slug.slice(0, -1)
  const parentPath = parent.join("/")
  const parentCategory = getCategoryByPath(parent)
  if (
    !VALID_CATEGORY_PATHS.has(parentPath) ||
    !parentCategory ||
    !isLeaf(parentCategory)
  ) {
    return { kind: "missing", segments: slug }
  }
  const productSlug = slug.at(-1)
  if (!productSlug) return { kind: "missing", segments: slug }
  const product = getProductByCategoryPath(productSlug, parent)
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
  return allCategorySlugPaths().map((slugPath) => ({
    slug: splitPath(slugPath),
  }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const resolved = resolveSlug(slug)

  if (resolved.kind === "category") {
    const node = getCategoryByPath(resolved.segments)
    if (!node) return { title: "Catalog — TGV-Media" }
    return {
      title: `${node.name}${(resolved.page ?? 1) > 1 ? ` — Page ${resolved.page}` : ""} — Catalog — TGV-Media`,
      description:
        node.description ?? `Browse ${node.name.toLowerCase()} products.`,
    }
  }

  if (resolved.kind === "product" && resolved.productSlug) {
    const product = getProductByCategoryPath(
      resolved.productSlug,
      resolved.categorySegments ?? [],
    )
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
    const product = getProductByCategoryPath(
      resolved.productSlug,
      resolved.categorySegments,
    )
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

  return (
    <CategoryView
      segments={resolved.segments}
      requestedPage={resolved.page ?? 1}
    />
  )
}

function CategoryView({
  segments,
  requestedPage,
}: Readonly<{
  segments: string[]
  requestedPage: number
}>) {
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
              <LocalizedText en="Home" ro="Acasă" />
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
        <p className="relative text-sm font-semibold uppercase tracking-widest text-[var(--brand-orange-text)]">
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
          {totalCount}{" "}
          <LocalizedText
            en={`${categoryItemLabel(node, totalCount)} ${node.contentType === "project" ? "featured in this category." : "available for personalization."}`}
            ro={`${node.contentType === "project" ? (totalCount === 1 ? "proiect" : "proiecte") : (totalCount === 1 ? "produs" : "produse")} ${node.contentType === "project" ? "în această categorie." : "disponibile pentru personalizare."}`}
          />
        </p>
      </section>

      {isLeafNode ? (
        <LeafProducts slug={segments} requestedPage={requestedPage} />
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
              <LocalizedText en="Available techniques" ro="Tehnici disponibile" />
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
              <LocalizedText en="Don't see what you need?" ro="Nu găsești ceea ce ai nevoie?" />
            </h2>
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              <LocalizedText en="We build bespoke pieces from substrate up." ro="Construim piese custom de la materialul de bază." />
            </p>
          </div>
          <Link
            href="/services/custom-production-integrated-branding"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)] bg-transparent border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
          >
            <span><LocalizedText en="Custom production" ro="Producție custom" /></span>
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
              <LocalizedText en="Home" ro="Acasă" />
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
            <LocalizedText en="You may also like" ro="S-ar putea să îți placă și" />
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

function LeafProducts({
  slug,
  requestedPage,
}: Readonly<{
  slug: string[]
  requestedPage: number
}>) {
  const products = getProductsByCategoryPath(slug)
  if (products.length === 0) {
    if (requestedPage > 1) notFound()
    const node = findNode(slug)
    if (node?.contentType === "project") {
      return (
        <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
          <div className="flex flex-col items-start max-w-2xl p-7 sm:p-9 bg-[var(--surface)] border border-[var(--border)] rounded-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-orange-text)]">
              <LocalizedText en="Bespoke portfolio" ro="Portofoliu custom" />
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-[family-name:var(--font-outfit)] font-semibold text-[var(--brand-black)]">
              <LocalizedText en="New projects will appear here as they leave the studio." ro="Proiectele noi vor apărea aici pe măsură ce ies din atelier." />
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--text-soft)]">
              <LocalizedText en="Until then, explore our wider portfolio or brief us on the piece you need — our team can take it from concept to production." ro="Până atunci, explorează portofoliul complet sau trimite-ne brieful piesei de care ai nevoie — o putem duce de la concept la producție." />
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)] bg-[var(--brand-orange)] hover:bg-[var(--brand-orange-hover)] rounded-full transition-colors"
              >
                <LocalizedText en="View portfolio" ro="Vezi portofoliul" />
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-[var(--brand-black)] border border-[var(--border-strong)] hover:bg-[var(--surface-soft)] rounded-full transition-colors"
              >
                <LocalizedText en="Start a custom project" ro="Începe un proiect custom" />
              </Link>
            </div>
          </div>
        </section>
      )
    }
    return (
      <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
        <p className="text-sm text-[var(--text-muted)]">
          <LocalizedText en="No products in this category yet. Check back after the next catalog sync." ro="Nu există încă produse în această categorie. Revino după următoarea sincronizare a catalogului." />
        </p>
      </section>
    )
  }
  const pagination = paginateItems(products, requestedPage)
  if (requestedPage > pagination.totalPages) notFound()

  return (
    <section className="mx-auto px-6 lg:px-8 py-12 lg:py-16 max-w-6xl">
      <p className="mb-6 text-sm text-[var(--text-muted)]">
        <LocalizedText
          en={`Showing ${pagination.start}–${pagination.end} of ${pagination.totalItems} products`}
          ro={`Sunt afișate produsele ${pagination.start}–${pagination.end} din ${pagination.totalItems}`}
        />
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {pagination.items.map((product, index) => (
          <ProductCard
            key={product.slug}
            product={product}
            priority={index === 0}
          />
        ))}
      </div>
      {pagination.totalPages > 1 ? (
        <CatalogPagination
          slug={slug}
          page={pagination.page}
          totalPages={pagination.totalPages}
        />
      ) : null}
    </section>
  )
}

function CatalogPagination({
  slug,
  page,
  totalPages,
}: Readonly<{
  slug: string[]
  page: number
  totalPages: number
}>) {
  return (
    <nav
      aria-label="Catalog pages"
      className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-6"
    >
      {page > 1 ? (
        <Link
          href={catalogPageHref(slug, page - 1)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-black)] transition-colors hover:border-[var(--brand-orange-focus)]"
        >
          <LocalizedText en="← Previous" ro="← Înapoi" />
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-[var(--text-muted)]">
        <LocalizedText
          en={`Page ${page} of ${totalPages}`}
          ro={`Pagina ${page} din ${totalPages}`}
        />
      </p>
      {page < totalPages ? (
        <Link
          href={catalogPageHref(slug, page + 1)}
          className="rounded-xl bg-[var(--brand-orange)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-black)] transition-opacity hover:opacity-90"
        >
          <LocalizedText en="Next →" ro="Înainte →" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}

function catalogPageHref(slug: string[], page: number): string {
  const base = `/catalog/${slug.join("/")}`
  return page <= 1 ? base : `${base}/page/${page}`
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
        {subcategories.map((child, index) => {
          const childPath = [...parentPath, child.slug]
          const representativeImage = child.image
            ? undefined
            : pickCategoryImage(
                undefined,
                getProductsByCategoryPath(childPath),
              )

          return (
            <CategoryCard
              key={child.slug}
              category={child}
              href={`/catalog/${childPath.join("/")}`}
              productCount={countProductsUnder(child, parentPath)}
              priority={index === 0}
              representativeImage={representativeImage}
            />
          )
        })}
      </div>
    </section>
  )
}
