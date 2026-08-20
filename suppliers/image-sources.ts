export interface SupplierImageSource {
  protocol: "https"
  hostname: string
  port: string
  pathnamePrefix: `/${string}`
}

export const supplierImageSources = {
  fixtures: [],
  macma: [
    {
      protocol: "https",
      hostname: "macma.ro",
      port: "",
      pathnamePrefix: "/products/",
    },
  ],
  midocean: [
    {
      protocol: "https",
      hostname: "cdn1.midocean.com",
      port: "",
      pathnamePrefix: "/image/",
    },
  ],
  cifra: [
    {
      protocol: "https",
      hostname: "www.publicatalogue.com",
      port: "",
      pathnamePrefix: "/image/cache/data/",
    },
  ],
} as const satisfies Readonly<Record<string, readonly SupplierImageSource[]>>

export const supplierImageRemotePatterns = Object.values(supplierImageSources).flatMap(
  (sources) => sources.map((source) => ({
    protocol: source.protocol,
    hostname: source.hostname,
    port: source.port,
    pathname: `${source.pathnamePrefix}**`,
  })),
)

export function isSupplierImageUrlAllowed(supplierId: string, value: string): boolean {
  const sources = supplierImageSources[
    supplierId as keyof typeof supplierImageSources
  ] as readonly SupplierImageSource[] | undefined
  if (!sources) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  return sources.some(
    (source) =>
      url.protocol === `${source.protocol}:` &&
      url.hostname === source.hostname &&
      url.port === source.port &&
      url.pathname.startsWith(source.pathnamePrefix),
  )
}
