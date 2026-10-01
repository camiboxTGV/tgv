"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ComponentProps, useCallback, useRef } from "react"

type Props = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & {
  href: string
}

/**
 * Keeps large link collections from prefetching just because they entered the
 * viewport, while still warming the route as soon as a visitor shows intent.
 */
export default function IntentPrefetchLink({
  href,
  onFocus,
  onMouseEnter,
  onTouchStart,
  ...props
}: Readonly<Props>) {
  const router = useRouter()
  const hasPrefetched = useRef(false)

  const prefetch = useCallback(() => {
    if (hasPrefetched.current) return
    hasPrefetched.current = true
    router.prefetch(href)
  }, [href, router])

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onFocus={(event) => {
        onFocus?.(event)
        if (!event.defaultPrevented) prefetch()
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        if (!event.defaultPrevented) prefetch()
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        if (!event.defaultPrevented) prefetch()
      }}
    />
  )
}
