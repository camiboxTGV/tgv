"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
  images: string[]
  alt: string
  initialIndex?: number
  selectedIndex?: number
  onIndexChange?: (index: number) => void
  fallbackAccent?: string
}

export default function ProductGallery({
  images,
  alt,
  initialIndex = 0,
  selectedIndex,
  onIndexChange,
  fallbackAccent,
}: Readonly<Props>) {
  const controlled = typeof selectedIndex === "number"
  const [internalIndex, setInternalIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
  )
  const index = controlled ? selectedIndex : internalIndex
  const setIndex = useCallback(
    (next: number) => {
      const clamped = (next + images.length) % Math.max(images.length, 1)
      if (!controlled) setInternalIndex(clamped)
      onIndexChange?.(clamped)
    },
    [controlled, images.length, onIndexChange],
  )

  const stripRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const goPrev = useCallback(() => setIndex(index - 1), [index, setIndex])
  const goNext = useCallback(() => setIndex(index + 1), [index, setIndex])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        goPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goPrev, goNext])

  useEffect(() => {
    const node = stripRef.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`)
    node?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [index])

  if (images.length === 0) {
    return (
      <div
        className="relative overflow-hidden aspect-[4/3] rounded-2xl border border-[var(--border)]"
        style={fallbackAccent ? { background: fallbackAccent } : undefined}
      />
    )
  }

  const currentImage = images[index] ?? images[0]

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden aspect-[4/3] rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          const startX = touchStartX.current
          if (startX === null) return
          const endX = e.changedTouches[0]?.clientX ?? startX
          const dx = endX - startX
          if (Math.abs(dx) > 40) {
            if (dx < 0) goNext()
            else goPrev()
          }
          touchStartX.current = null
        }}
      >
        <Image
          key={currentImage}
          src={currentImage}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-contain p-4"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--surface)]/90 hover:bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--surface)]/90 hover:bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text-soft)] hover:text-[var(--brand-black)] transition-colors shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="absolute bottom-3 right-3 px-2 py-0.5 text-xs font-medium text-white bg-black/40 backdrop-blur-sm rounded-full">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth snap-x snap-mandatory"
          role="tablist"
          aria-label="Product images"
        >
          {images.map((src, i) => {
            const active = i === index
            return (
              <button
                key={src}
                type="button"
                data-thumb={i}
                role="tab"
                aria-selected={active}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden snap-start transition-all ${
                  active
                    ? "ring-2 ring-[var(--brand-orange)] ring-offset-2 ring-offset-[var(--bg)]"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
