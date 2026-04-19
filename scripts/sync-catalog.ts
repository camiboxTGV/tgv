import { loadActiveAdapters } from "../suppliers/_shared/registry.ts"
import { runSync } from "../suppliers/_shared/orchestrator.ts"

interface Args {
  force: boolean
  dryRun: boolean
  skipImages: boolean
  supplier?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = { force: false, dryRun: false, skipImages: false }
  for (const a of argv) {
    if (a === "--force") args.force = true
    else if (a === "--dry-run") args.dryRun = true
    else if (a === "--skip-images") args.skipImages = true
    else if (a.startsWith("--supplier=")) args.supplier = a.slice("--supplier=".length)
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

  const report = await runSync({
    repoRoot: process.cwd(),
    adapters,
    force: args.force,
    dryRun: args.dryRun,
    skipImages: args.skipImages,
    supplierFilter: args.supplier,
  })

  console.log(`Sync ${report.success ? "OK" : "FAILED"} at ${report.ranAt}`)
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

  if (!report.success) process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
