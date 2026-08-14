import type { SupplierAdapter } from "./adapter.ts"
import {
  assertSupplierDefinitions,
  supplierDefinitions,
  type SupplierDefinition,
} from "../suppliers.ts"

export interface SupplierRegistration {
  adapter: SupplierAdapter
  enabled: boolean
}

export async function loadActiveAdapters(): Promise<SupplierAdapter[]> {
  const registrations = await loadAllRegistrations()
  return registrations.filter((r) => r.enabled).map((r) => r.adapter)
}

async function loadAllRegistrations(): Promise<SupplierRegistration[]> {
  assertSupplierDefinitions()
  const out: SupplierRegistration[] = []
  for (const definition of supplierDefinitions) {
    if (!definition.enabled) continue
    const mod = await tryImport(definition)
    if (mod.adapter.id !== definition.id) {
      throw new Error(
        `Supplier adapter id "${mod.adapter.id}" does not match definition "${definition.id}".`,
      )
    }
    if (mod.adapter.displayName !== definition.displayName) {
      throw new Error(
        `Supplier adapter "${definition.id}" display name does not match its definition.`,
      )
    }
    out.push({ adapter: mod.adapter, enabled: definition.enabled })
  }
  return out
}

async function tryImport(definition: SupplierDefinition) {
  try {
    return await definition.loadAdapter()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not load enabled supplier "${definition.id}": ${message}`)
  }
}
