import type { SupplierAdapter } from "./_shared/adapter.ts"
import { supplierImageSources } from "./image-sources.ts"
import type { SupplierImageSource } from "./image-sources.ts"
export {
  isSupplierImageUrlAllowed,
  supplierImageRemotePatterns,
} from "./image-sources.ts"
export type { SupplierImageSource } from "./image-sources.ts"

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
    imageSources: supplierImageSources.fixtures,
    loadAdapter: () => import("./_fixtures/adapter.ts"),
  },
  {
    id: "macma",
    displayName: "Macma",
    enabled: true,
    allowProductsWithoutImages: false,
    imageSources: supplierImageSources.macma,
    loadAdapter: () => import("./macma/adapter.ts"),
  },
  {
    id: "midocean",
    displayName: "midocean",
    enabled: true,
    allowProductsWithoutImages: false,
    imageSources: supplierImageSources.midocean,
    loadAdapter: () => import("./midocean/adapter.ts"),
  },
  {
    id: "cifra",
    displayName: "Cifra",
    enabled: true,
    allowProductsWithoutImages: false,
    imageSources: supplierImageSources.cifra,
    loadAdapter: () => import("./cifra/adapter.ts"),
  },
] as const satisfies readonly SupplierDefinition[]

export function getSupplierDefinition(id: string): SupplierDefinition | undefined {
  return supplierDefinitions.find((supplier) => supplier.id === id)
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
