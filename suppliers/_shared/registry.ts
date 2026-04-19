import type { SupplierAdapter } from "./adapter.ts"

export interface SupplierRegistration {
  adapter: SupplierAdapter
  enabled: boolean
}

export async function loadActiveAdapters(): Promise<SupplierAdapter[]> {
  const registrations = await loadAllRegistrations()
  return registrations.filter((r) => r.enabled).map((r) => r.adapter)
}

interface AdapterModule {
  adapter: SupplierAdapter
}

const KNOWN_ADAPTERS: { path: string; enabled: boolean }[] = [
  { path: "../_fixtures/adapter.ts", enabled: true },
  { path: "../macma/adapter.ts", enabled: true },
]

async function loadAllRegistrations(): Promise<SupplierRegistration[]> {
  const out: SupplierRegistration[] = []
  for (const entry of KNOWN_ADAPTERS) {
    const mod = await tryImport(entry.path)
    if (mod) out.push({ adapter: mod.adapter, enabled: entry.enabled })
  }
  return out
}

async function tryImport(path: string): Promise<AdapterModule | null> {
  try {
    return (await import(path)) as AdapterModule
  } catch {
    return null
  }
}
