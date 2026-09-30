import { createMakitoClientFromEnv } from "../suppliers/makito/fetch.ts"

function keysOf(records: readonly unknown[]): string[] {
  const keys = new Set<string>()
  for (const value of records.slice(0, 100)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue
    for (const key of Object.keys(value)) keys.add(key)
  }
  return [...keys].sort()
}

function identifier(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value)
  return null
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function distinctLimited(values: Iterable<string>, limit = 25): string[] {
  return [...new Set(values)].sort().slice(0, limit)
}

async function main(): Promise<void> {
  const client = createMakitoClientFromEnv()
  const [catalog, stock, prices, printConfig] = await Promise.all([
    client.getCatalog(),
    client.getStock(),
    client.getPriceList(),
    client.getPrintConfig(),
  ])

  const productRefs = new Set(
    catalog.products.map((product) => identifier(product.ref)).filter(isString),
  )
  const variants = catalog.products.flatMap((product) =>
    Array.isArray(product.variants) ? product.variants : [],
  )
  const variantRecords = variants.map(record).filter(isRecord)
  const variantIds = new Set(
    variantRecords
      .map((variant) => identifier(variant.material ?? variant.matnr))
      .filter(isString),
  )
  const priceMaterials = prices.priceList
    .map((entry) => identifier(entry.material))
    .filter(isString)
  const stockMaterials = stock.stocks
    .map((entry) => identifier(entry.material))
    .filter(isString)

  const summary = {
    catalog: {
      products: catalog.products.length,
      sampledKeys: keysOf(catalog.products),
      productsWithVariantsArray: catalog.products.filter((product) =>
        Array.isArray(product.variants)
      ).length,
      variantRecords: variantRecords.length,
      sampledVariantKeys: keysOf(variantRecords),
      uniqueProductRefs: productRefs.size,
      uniqueVariantIds: variantIds.size,
    },
    stock: {
      records: stock.stocks.length,
      sampledKeys: keysOf(stock.stocks),
      uniqueMaterials: new Set(stockMaterials).size,
      materialMatchesVariant: stockMaterials.filter((value) => variantIds.has(value)).length,
      materialMatchesProduct: stockMaterials.filter((value) => productRefs.has(value)).length,
    },
    prices: {
      records: prices.priceList.length,
      sampledKeys: keysOf(prices.priceList),
      currencies: distinctLimited(prices.priceList.map((entry) => String(entry.currency ?? ""))),
      baseQuantities: distinctLimited(
        prices.priceList.map((entry) => String(entry.baseQuantity ?? "")),
      ),
      sampledScaleKeys: keysOf(prices.priceList.flatMap((entry) => entry.scales)),
      uniqueMaterials: new Set(priceMaterials).size,
      materialMatchesVariant: priceMaterials.filter((value) => variantIds.has(value)).length,
      materialMatchesProduct: priceMaterials.filter((value) => productRefs.has(value)).length,
    },
    printConfig: {
      products: printConfig.products.length,
      sampledKeys: keysOf(printConfig.products),
    },
  }

  console.log(JSON.stringify(summary, null, 2))
}

function isString(value: string | null): value is string {
  return value !== null
}

function isRecord(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return value !== null
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Makito probe failed")
  process.exit(1)
})
