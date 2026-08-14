import {
  validateGeneratedCatalog,
  type CatalogSyncValidationMode,
} from "../lib/content/catalog-sync-validation.ts"

function parseMode(argv: string[]): CatalogSyncValidationMode {
  const value = argv.find((argument) => argument.startsWith("--mode="))
  const mode = value?.slice("--mode=".length)
  if (mode === "full" || mode === "inventory") return mode
  throw new Error('Expected --mode="full" or --mode="inventory".')
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2))
  const result = await validateGeneratedCatalog({
    repoRoot: process.cwd(),
    mode,
  })

  console.log(`Generated catalog verification OK (${result.mode})`)
  console.log(`  product files: ${result.productFiles}`)
  console.log(`  products:      ${result.products}`)
  console.log(`  Macma:         ${result.macmaProducts} products, ${result.macmaMethods} exact methods`)
  if (result.f38Codes.length > 0) {
    console.log(`  F38 methods:   ${result.f38Codes.join(", ")}`)
  }
  console.log(
    `  unknown codes: ${result.unknownMacmaCodes.length > 0 ? result.unknownMacmaCodes.join(", ") : "none"}`,
  )
}

main().catch((error) => {
  console.error(`Generated catalog verification FAILED: ${(error as Error).message}`)
  process.exit(1)
})
