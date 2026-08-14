import { loadActiveAdapters } from "../suppliers/_shared/registry.ts"
import {
  InventoryBootstrapRequiredError,
  runInventorySync,
  type InventorySyncReport,
} from "../suppliers/_shared/inventory.ts"
import { runSync } from "../suppliers/_shared/orchestrator.ts"

type SyncMode = "full" | "inventory"

interface Args {
  mode: SyncMode
  force: boolean
  dryRun: boolean
  skipImages: boolean
  supplier?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    mode: "full",
    force: false,
    dryRun: false,
    skipImages: false,
  }
  for (const a of argv) {
    if (a === "--mode=full") args.mode = "full"
    else if (a === "--mode=inventory") args.mode = "inventory"
    else if (a.startsWith("--mode=")) {
      throw new Error(`Unknown sync mode "${a.slice("--mode=".length)}".`)
    } else if (a === "--force") args.force = true
    else if (a === "--dry-run") args.dryRun = true
    else if (a === "--skip-images") args.skipImages = true
    else if (a.startsWith("--supplier=")) {
      const supplier = a.slice("--supplier=".length).trim()
      if (!supplier) throw new Error("--supplier requires a non-empty id.")
      args.supplier = supplier
    } else {
      throw new Error(`Unknown argument "${a}".`)
    }
  }
  return args
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const adapters = await loadActiveAdapters()
  if (adapters.length === 0) {
    console.error("No active supplier adapters found. Check suppliers/_shared/registry.ts.")
    process.exit(1)
  }

  if (args.mode === "inventory") {
    if (args.force) throw new Error("--force is only valid for full catalog syncs.")
    if (args.skipImages) throw new Error("--skip-images is only valid for full catalog syncs.")

    try {
      const report = await runInventorySync({
        repoRoot: process.cwd(),
        adapters,
        dryRun: args.dryRun,
        supplierFilter: args.supplier,
      })
      printInventoryReport(report)
      return
    } catch (error) {
      if (!(error instanceof InventoryBootstrapRequiredError) || args.dryRun) throw error
      console.warn(`[inventory] ${error.message}`)
      console.warn("[inventory] Bootstrapping bindings with one full sync.")
      const report = await runSync({
        repoRoot: process.cwd(),
        adapters,
        dryRun: false,
        skipImages: true,
      })
      printFullReport(report, "Bootstrap full sync")
      return
    }
  }

  const report = await runSync({
    repoRoot: process.cwd(),
    adapters,
    force: args.force,
    dryRun: args.dryRun,
    skipImages: args.skipImages,
    supplierFilter: args.supplier,
  })

  printFullReport(report, "Full sync")

  if (!report.success) process.exit(2)
}

function printFullReport(
  report: Awaited<ReturnType<typeof runSync>>,
  label: string,
): void {
  console.log(`${label} ${report.success ? "OK" : "FAILED"} at ${report.ranAt}`)
  console.log(`  total products: ${report.totalProducts}`)
  console.log(`  unclassified:   ${report.totalUnclassified}`)
  for (const [id, s] of Object.entries(report.suppliers)) {
    console.log(
      `  [${id}] ok=${s.ok} fetched=${s.fetched} normalized=${s.normalized} ` +
        `unclassified=${s.unclassified} droppedNoPrice=${s.droppedMissingPrice} ` +
        `images(dl=${s.images.downloaded} skip=${s.images.skipped} fail=${s.images.failed})`,
    )
    if (s.error) console.log(`    error: ${s.error}`)
    if (s.newUnmappedCategories.length) {
      console.log(`    top unmapped categories:`)
      for (const u of s.newUnmappedCategories.slice(0, 10)) {
        console.log(`      ${u.count.toString().padStart(5)} × ${u.category}`)
      }
    }
  }
}

function printInventoryReport(report: InventorySyncReport): void {
  console.log(`Inventory sync OK at ${report.ranAt}`)
  console.log(`  changed files: ${report.changedFiles}`)
  for (const supplier of Object.values(report.suppliers)) {
    console.log(
      `  [${supplier.id}] products=${supplier.trackedProducts} variants=${supplier.trackedVariants} ` +
        `updated(products=${supplier.productsUpdated} variants=${supplier.variantsUpdated}) ` +
        `coverage(price=${supplier.matchedPrices}/${supplier.trackedVariants} ` +
        `stock=${supplier.matchedStock}/${supplier.trackedVariants}) ` +
        `missing(price=${supplier.missingPrices} stock=${supplier.missingStock})`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
