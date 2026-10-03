"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  hasOfferCapacity,
  isSafeOfferThumbnailUrl,
  lineKey,
  type OfferItem,
  readOfferResult,
  writeOffer,
} from "@/lib/offer/storage"
import type { Personalization } from "@/lib/content/catalog"
import type { DecorationOptions } from "@/lib/pricing/calculator"

export interface AddToOfferInput {
  slug: string
  name: string
  category: string
  supplierId?: string
  supplierSku?: string
  variantKey?: string
  colorName?: string
  sizeLabel?: string
  thumbnailUrl?: string
  priceSnapshot?: number
  personalizations?: Personalization[]
}

interface OfferContextValue {
  items: OfferItem[]
  count: number
  totalQuantity: number
  hydrated: boolean
  offerLoadError: boolean
  has: (slug: string) => boolean
  hasLine: (key: string) => boolean
  add: (input: AddToOfferInput) => void
  remove: (key: string) => void
  setLineQuantity: (key: string, quantity: number) => void
  setLineDecoration: (key: string, options: DecorationOptions) => void
  clear: () => void
  resetInvalidOffer: () => void
}

const OfferContext = createContext<OfferContextValue | null>(null)

const ADDED_EVENT = "tgv:offer:added"

export function dispatchOfferAdded(detail: {
  name: string
  totalCount: number
}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail }))
}

export function onOfferAdded(
  handler: (detail: { name: string; totalCount: number }) => void,
) {
  if (typeof window === "undefined") return () => {}
  const listener = (e: Event) => {
    const ce = e as CustomEvent<{ name: string; totalCount: number }>
    handler(ce.detail)
  }
  window.addEventListener(ADDED_EVENT, listener)
  return () => window.removeEventListener(ADDED_EVENT, listener)
}

function clampQuantity(n: number): number {
  if (!Number.isFinite(n)) return 1
  const i = Math.round(n)
  if (i < 1) return 1
  if (i > 10000) return 10000
  return i
}

export default function OfferProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [items, setItems] = useState<OfferItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [offerLoadError, setOfferLoadError] = useState(false)

  useEffect(() => {
    const result = readOfferResult()
    setItems(result.items)
    setOfferLoadError(result.error !== null)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !offerLoadError) writeOffer(items)
  }, [items, hydrated, offerLoadError])

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  )

  const hasLine = useCallback(
    (key: string) => items.some((i) => lineKey(i) === key),
    [items],
  )

  const add = useCallback((input: AddToOfferInput) => {
    setOfferLoadError(false)
    const newKey = input.variantKey ?? input.slug
    let added = false
    let nextCount = 0
    setItems((prev) => {
      if (!hasOfferCapacity(prev)) return prev
      if (prev.some((i) => lineKey(i) === newKey)) return prev
      added = true
      const next: OfferItem[] = [
        ...prev,
        {
          slug: input.slug,
          name: input.name,
          category: input.category,
          supplierId: input.supplierId,
          supplierSku: input.supplierSku,
          quantity: 1,
          variantKey: input.variantKey,
          colorName: input.colorName,
          sizeLabel: input.sizeLabel,
          thumbnailUrl: isSafeOfferThumbnailUrl(input.thumbnailUrl)
            ? input.thumbnailUrl
            : undefined,
          priceSnapshot: input.priceSnapshot,
          personalizations: input.personalizations,
        },
      ]
      nextCount = next.length
      return next
    })
    if (added) {
      queueMicrotask(() =>
        dispatchOfferAdded({ name: input.name, totalCount: nextCount }),
      )
    }
  }, [])

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => lineKey(i) !== key))
  }, [])

  const setLineQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        lineKey(i) === key ? { ...i, quantity: clampQuantity(quantity) } : i,
      ),
    )
  }, [])

  const setLineDecoration = useCallback(
    (key: string, decorationOptions: DecorationOptions) => {
      setItems((prev) =>
        prev.map((item) =>
          lineKey(item) === key ? { ...item, decorationOptions } : item,
        ),
      )
    },
    [],
  )

  const clear = useCallback(() => setItems([]), [])

  const resetInvalidOffer = useCallback(() => {
    setItems([])
    setOfferLoadError(false)
  }, [])

  const value = useMemo<OfferContextValue>(
    () => ({
      items,
      count: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      hydrated,
      offerLoadError,
      has,
      hasLine,
      add,
      remove,
      setLineQuantity,
      setLineDecoration,
      clear,
      resetInvalidOffer,
    }),
    [
      items,
      hydrated,
      offerLoadError,
      has,
      hasLine,
      add,
      remove,
      setLineQuantity,
      setLineDecoration,
      clear,
      resetInvalidOffer,
    ],
  )

  return (
    <OfferContext.Provider value={value}>{children}</OfferContext.Provider>
  )
}

export function useOffer(): OfferContextValue {
  const ctx = useContext(OfferContext)
  if (!ctx) {
    throw new Error("useOffer must be used inside <OfferProvider>")
  }
  return ctx
}
