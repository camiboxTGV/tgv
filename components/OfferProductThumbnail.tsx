"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { isSafeOfferThumbnailUrl } from "@/lib/offer/storage"

export default function OfferProductThumbnail({
  thumbnailUrl,
  slug,
  category,
  variantKey,
}: Readonly<{
  thumbnailUrl?: string
  slug: string
  category: string
  variantKey?: string
}>) {
  const providedSrc = isSafeOfferThumbnailUrl(thumbnailUrl)
    ? thumbnailUrl
    : undefined
  const sourceKey = [slug, category, variantKey ?? "", providedSrc ?? ""].join("\u0000")
  const [resolved, setResolved] = useState<{ key: string; src: string }>()
  const [failures, setFailures] = useState<{ key: string; sources: string[] }>()
  const resolvedSrc = resolved?.key === sourceKey ? resolved.src : undefined
  const failedSources = failures?.key === sourceKey ? failures.sources : []
  const providedFailed = Boolean(
    providedSrc && failedSources.includes(providedSrc),
  )
  const src =
    providedSrc && !providedFailed
      ? providedSrc
      : resolvedSrc && !failedSources.includes(resolvedSrc)
        ? resolvedSrc
        : undefined
  const showImage = Boolean(src)

  useEffect(() => {
    if (
      (providedSrc && !providedFailed) ||
      slug.length < 1 ||
      slug.length > 200 ||
      category.length < 1 ||
      category.length > 500 ||
      (variantKey?.length ?? 0) > 500
    ) {
      return
    }

    const controller = new AbortController()
    const query = new URLSearchParams({ category })
    if (variantKey) query.set("variant", variantKey)

    void fetch(`/api/offer-thumbnail/${encodeURIComponent(slug)}?${query}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return
        const payload = (await response.json()) as { thumbnailUrl?: unknown }
        if (
          isSafeOfferThumbnailUrl(payload.thumbnailUrl) &&
          payload.thumbnailUrl !== providedSrc
        ) {
          setResolved({ key: sourceKey, src: payload.thumbnailUrl })
        }
      })
      .catch(() => {
        // A missing legacy thumbnail should keep the neutral placeholder.
      })

    return () => controller.abort()
  }, [category, providedFailed, providedSrc, slug, sourceKey, variantKey])

  return (
    <div
      data-offer-thumbnail={showImage ? "image" : "placeholder"}
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] sm:h-20 sm:w-20"
    >
      {showImage && src ? (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="80px"
          className="object-contain p-2"
          onError={() => {
            setFailures((current) => {
              if (!src) return current
              const sources = current?.key === sourceKey ? current.sources : []
              return sources.includes(src)
                ? current
                : { key: sourceKey, sources: [...sources, src] }
            })
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </span>
      )}
    </div>
  )
}
