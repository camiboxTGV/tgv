import { createMakitoClientFromEnv } from "../suppliers/makito/fetch.ts"
import {
  cancelResponseBody,
  readBoundedImageResponse,
} from "../suppliers/_shared/image-response.ts"
import {
  adapter as makitoAdapter,
  buildMakitoInventorySnapshot,
  buildMakitoProducts,
} from "../suppliers/makito/adapter.ts"

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

function lengthHistogram(values: Iterable<string>): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const value of values) {
    const key = String(value.length)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => Number(left) - Number(right)),
  )
}

function stripLeadingZeroes(value: string): string {
  return value.replace(/^0+(?=.)/, "")
}

function alphanumeric(value: string): string {
  return value.normalize("NFKC").replace(/[^a-z0-9]/gi, "").toUpperCase()
}

function assetSegments(value: unknown): string[] {
  if (typeof value !== "string") return []
  try {
    const url = new URL(value)
    if (url.origin !== "https://apis.makito.es") return []
    return url.pathname.split("/").filter(Boolean)
  } catch {
    return []
  }
}

async function main(): Promise<void> {
  const client = createMakitoClientFromEnv()
  const [catalog, stock, prices, printConfig] = await Promise.all([
    client.getCatalog(),
    client.getStock(),
    client.getPriceList(),
    client.getPrintConfig(),
  ])
  const fetchedAt = client.fetchedAt()
  const products = buildMakitoProducts({
    catalog,
    stock,
    priceList: prices,
    printConfig,
    fetchedAt,
  })
  const inventory = buildMakitoInventorySnapshot({
    catalog,
    stock,
    priceList: prices,
    fetchedAt,
  })
  await verifyImageDelivery(products[0]?.images[0], client)

  const productRefs = new Set(
    catalog.products.map((product) => identifier(product.ref)).filter(isString),
  )
  const variants = catalog.products.flatMap((product) =>
    Array.isArray(product.variants) ? product.variants : [],
  )
  const variantRecords = variants.map(record).filter(isRecord)
  const variantIds = new Set(
    variantRecords
      .map((variant) =>
        identifier(variant.variant_reference ?? variant.material ?? variant.matnr)
      )
      .filter(isString),
  )
  const priceMaterials = prices.priceList
    .map((entry) => identifier(entry.material))
    .filter(isString)
  const stockMaterials = stock.stocks
    .map((entry) => identifier(entry.material))
    .filter(isString)
  const variantIdsWithoutLeadingZeroes = new Set(
    [...variantIds].map(stripLeadingZeroes),
  )
  const variantIdsAlphanumeric = new Set([...variantIds].map(alphanumeric))
  const variantAssetSegments = variantRecords.flatMap((variant) => [
    assetSegments(variant.variant_image),
    assetSegments(variant.variant_thumbnail),
  ]).filter((segments) => segments.length > 0)
  const segmentSets = Array.from(
    { length: Math.max(0, ...variantAssetSegments.map((segments) => segments.length)) },
    (_, index) => new Set(variantAssetSegments.map((segments) => segments[index]).filter(isString)),
  )
  const categoryRecords = catalog.products
    .flatMap((product) => Array.isArray(product.categories) ? product.categories : [])
    .map(record)
    .filter(isRecord)
  const printConfigIds = printConfig.products
    .map((product) => identifier(product.id))
    .filter(isString)
  const printAreas = printConfig.products
    .flatMap((product) => Array.isArray(product.areas) ? product.areas : [])
  const printAreaRecords = printAreas.map(record).filter(isRecord)
  const printTechniques = printAreaRecords.flatMap((area) =>
    Array.isArray(area.techniques) ? area.techniques : [],
  )
  const builtVariantIds = products.flatMap((product) => product.supplierVariantIds ?? [])
  const builtVariantIdSet = new Set(builtVariantIds)
  const productsWithImages = products.filter((product) => product.images.length > 0).length
  const productsWithMappedCategory = products.filter((product) =>
    makitoAdapter.mapCategory(product) !== null
  ).length
  const builtVariantsWithPrice = builtVariantIds.filter((variantId) =>
    inventory.prices.has(variantId)
  ).length
  const builtVariantsWithStockBinding = builtVariantIds.filter((variantId) =>
    inventory.stock.has(variantId)
  ).length
  const percent = (covered: number, total: number) =>
    total > 0 ? Number(((covered / total) * 100).toFixed(2)) : 0

  const summary = {
    production: {
      products: {
        built: products.length,
        sourceRecords: catalog.products.length,
        coveragePercent: percent(products.length, catalog.products.length),
        withImages: productsWithImages,
        imageCoveragePercent: percent(productsWithImages, products.length),
        withMappedCategory: productsWithMappedCategory,
        mappedCategoryCoveragePercent: percent(productsWithMappedCategory, products.length),
      },
      variants: {
        built: builtVariantIds.length,
        uniqueBuilt: builtVariantIdSet.size,
        sourceRecords: variantRecords.length,
        coveragePercent: percent(builtVariantIds.length, variantRecords.length),
        withInventoryPrice: builtVariantsWithPrice,
        inventoryPriceCoveragePercent: percent(builtVariantsWithPrice, builtVariantIds.length),
        withStockBinding: builtVariantsWithStockBinding,
        stockBindingCoveragePercent: percent(
          builtVariantsWithStockBinding,
          builtVariantIds.length,
        ),
      },
      inventory: {
        priceBindings: inventory.prices.size,
        stockBindings: inventory.stock.size,
      },
      imageCandidates: products.reduce((count, product) => count + product.images.length, 0),
      imagePreflight: "passed",
    },
    schema: {
      catalog: {
        products: catalog.products.length,
        sampledKeys: keysOf(catalog.products),
        productsWithVariantsArray: catalog.products.filter((product) =>
          Array.isArray(product.variants)
        ).length,
        variantRecords: variantRecords.length,
        sampledVariantKeys: keysOf(variantRecords),
        sampledCategoryKeys: keysOf(categoryRecords),
        uniqueProductRefs: productRefs.size,
        uniqueVariantIds: variantIds.size,
        variantIdLengths: lengthHistogram(variantIds),
        assetPathDepths: lengthHistogram(variantAssetSegments.map((segments) =>
          "x".repeat(segments.length)
        )),
        assetSegmentEqualsVariantReference: variantRecords.filter((variant) => {
          const expected = identifier(variant.variant_reference)
          if (!expected) return false
          return [variant.variant_image, variant.variant_thumbnail].some((value) =>
            assetSegments(value).includes(expected)
          )
        }).length,
      },
      stock: {
        records: stock.stocks.length,
        sampledKeys: keysOf(stock.stocks),
        uniqueMaterials: new Set(stockMaterials).size,
        materialLengths: lengthHistogram(stockMaterials),
        materialMatchesVariant: stockMaterials.filter((value) => variantIds.has(value)).length,
        materialMatchesVariantWithoutLeadingZeroes: stockMaterials.filter((value) =>
          variantIdsWithoutLeadingZeroes.has(stripLeadingZeroes(value))
        ).length,
        materialMatchesVariantAlphanumeric: stockMaterials.filter((value) =>
          variantIdsAlphanumeric.has(alphanumeric(value))
        ).length,
        materialMatchesAssetSegment: Object.fromEntries(segmentSets.map((values, index) => [
          String(index),
          stockMaterials.filter((value) => values.has(value)).length,
        ])),
        materialMatchesProduct: stockMaterials.filter((value) => productRefs.has(value)).length,
      },
      prices: {
        records: prices.priceList.length,
        sampledKeys: keysOf(prices.priceList),
        sampledScaleKeys: keysOf(prices.priceList.flatMap((entry) => entry.scales)),
        uniqueMaterials: new Set(priceMaterials).size,
        materialMatchesVariant: priceMaterials.filter((value) => variantIds.has(value)).length,
        materialMatchesProduct: priceMaterials.filter((value) => productRefs.has(value)).length,
      },
      printConfig: {
        products: printConfig.products.length,
        sampledKeys: keysOf(printConfig.products),
        uniqueIds: new Set(printConfigIds).size,
        idMatchesVariant: printConfigIds.filter((value) => variantIds.has(value)).length,
        idMatchesProduct: printConfigIds.filter((value) => productRefs.has(value)).length,
        areas: printAreas.length,
        sampledAreaKeys: keysOf(printAreaRecords),
        sampledTechniqueKeys: keysOf(printTechniques),
        techniqueContainerTypes: Object.fromEntries(
          distinctLimited(printAreaRecords.map((area) =>
            Array.isArray(area.techniques) ? "array" : typeof area.techniques
          )).map((type) => [type, printAreaRecords.filter((area) =>
            (Array.isArray(area.techniques) ? "array" : typeof area.techniques) === type
          ).length]),
        ),
      },
    },
  }

  console.log(JSON.stringify(summary, null, 2))
}

async function verifyImageDelivery(
  sourceUrl: string | undefined,
  client: ReturnType<typeof createMakitoClientFromEnv>,
): Promise<void> {
  if (!sourceUrl) throw new Error("Makito image preflight has no candidate")
  const response = await client.fetchAsset(sourceUrl)
  const contentType = response.headers.get("content-type")?.toLowerCase()
  if (
    contentType &&
    !contentType.startsWith("image/") &&
    !/^application\/octet-stream(?:\s*;|$)/i.test(contentType)
  ) {
    await cancelResponseBody(response)
    throw new Error("Makito image preflight returned an unsupported media type")
  }
  const bytes = await readBoundedImageResponse(response, 25 * 1024 * 1024)
  const { default: sharp } = await import("sharp")
  const converted = await sharp(bytes, { limitInputPixels: 40_000_000 })
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  if (converted.byteLength === 0) {
    throw new Error("Makito image preflight produced an empty image")
  }
}

function isString(value: string | null): value is string {
  return value !== null
}

function isRecord(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return value !== null
}

main().catch(() => {
  console.error("Makito production probe failed")
  process.exit(1)
})
