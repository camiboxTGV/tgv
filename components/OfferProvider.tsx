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
  type OfferItem,
  readOffer,
  writeOffer,
} from "@/lib/offer/storage"

export interface AddToOfferInput {
  slug: string
  name: string
  category: string
}

interface OfferContextValue {
  items: OfferItem[]
  count: number
  totalQuantity: number
  hydrated: boolean
  has: (slug: string) => boolean
  add: (input: AddToOfferInput) => void
  remove: (slug: string) => void
  setQuantity: (slug: string, quantity: number) => void
  clear: () => void
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
}: {
  children: React.ReactNode
}) {
  const [items, setItems] = useState<OfferItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setItems(readOffer())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) writeOffer(items)
  }, [items, hydrated])

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  )

  const add = useCallback((input: AddToOfferInput) => {
    let added = false
    let nextCount = 0
    setItems((prev) => {
      if (prev.some((i) => i.slug === input.slug)) return prev
      added = true
      const next = [...prev, { ...input, quantity: 1 }]
      nextCount = next.length
      return next
    })
    if (added) {
      queueMicrotask(() =>
        dispatchOfferAdded({ name: input.name, totalCount: nextCount }),
      )
    }
  }, [])

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug))
  }, [])

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug ? { ...i, quantity: clampQuantity(quantity) } : i,
      ),
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<OfferContextValue>(
    () => ({
      items,
      count: items.length,
      totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
      hydrated,
      has,
      add,
      remove,
      setQuantity,
      clear,
    }),
    [items, hydrated, has, add, remove, setQuantity, clear],
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
