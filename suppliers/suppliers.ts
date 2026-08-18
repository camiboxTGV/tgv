import type { SupplierAdapter } from "./_shared/adapter.ts"

export interface SupplierImageSource {
  protocol: "https"
  hostname: string
  port: string
  pathnamePrefix: `/${string}`
}

interface SupplierModule {
  adapter: SupplierAdapter
}

export interface SupplierDefinition {
  id: string
  displayName: string
  enabled: boolean
  allowProductsWithoutImages?: boolean
  imageSources: readonly SupplierImageSource[]
  loadAdapter: () => Promise<SupplierModule>
}

export const supplierDefinitions = [
  {
    id: "fixtures",
    displayName: "Fixtures (pipeline proof)",
    enabled: false,
    allowProductsWithoutImages: true,
    imageSources: [],
    loadAdapter: () => import("./_fixtures/adapter.ts"),
  },
  {
    id: "macma",
    displayName: "Macma",
    enabled: true,
    allowProductsWithoutImages: false,
    imageSources: [
      {
        protocol: "https",
        hostname: "macma.ro",
        port: "",
        pathnamePrefix: "/products/",
      },
    ],
    loadAdapter: () => import("./macma/adapter.ts"),
  },
  {
    id: "midocean",
    displayName: "midocean",
    enabled: true,
    allowProductsWithoutImages: false,
    imageSources: [
      {
        protocol: "https",
        hostname: "cdn1.midocean.com",
        port: "",
        pathnamePrefix: "/image/",
      },
    ],
    loadAdapter: () => import("./midocean/adapter.ts"),
  },
] as const satisfies readonly SupplierDefinition[]

export const supplierImageRemotePatterns = supplierDefinitions.flatMap((supplier) =>
  supplier.imageSources.map((source) => ({
    protocol: source.protocol,
    hostname: source.hostname,
    port: source.port,
    pathname: `${source.pathnamePrefix}**`,
  })),
)

export function getSupplierDefinition(id: string): SupplierDefinition | undefined {
  return supplierDefinitions.find((supplier) => supplier.id === id)
}

export function isSupplierImageUrlAllowed(supplierId: string, value: string): boolean {
  const definition = getSupplierDefinition(supplierId)
  if (!definition) return false

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  return definition.imageSources.some(
    (source) =>
      url.protocol === `${source.protocol}:` &&
      url.hostname === source.hostname &&
      url.port === source.port &&
      url.pathname.startsWith(source.pathnamePrefix),
  )
}

export function assertSupplierDefinitions(): void {
  const seen = new Set<string>()
  for (const registeredDefinition of supplierDefinitions) {
    const definition: SupplierDefinition = registeredDefinition
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) {
      throw new Error(`Invalid supplier id "${definition.id}".`)
    }
    if (seen.has(definition.id)) {
      throw new Error(`Duplicate supplier definition "${definition.id}".`)
    }
    seen.add(definition.id)

    if (!definition.allowProductsWithoutImages && definition.imageSources.length === 0) {
      throw new Error(`Supplier "${definition.id}" must declare at least one image source.`)
    }
    for (const source of definition.imageSources) {
      if (!source.pathnamePrefix.endsWith("/")) {
        throw new Error(
          `Image path prefix for supplier "${definition.id}" must end with "/".`,
        )
      }
    }
  }
}
