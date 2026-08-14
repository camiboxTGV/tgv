export interface SearchRankFields {
  name: string
  supplierSku: string
  brand: string
  categoryLabel: string
  stockLevel: "in-stock" | "low" | "out-of-stock"
}

interface SearchCandidate<T extends SearchRankFields> {
  item: T
  score?: number
  relevance?: number
}

const SEARCH_STOP_WORDS = new Set([
  "and",
  "the",
  "with",
  "for",
  "from",
  "of",
  "si",
  "cu",
  "de",
  "din",
  "pentru",
])

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

export function searchQueryTokens(rawQuery: string): string[] {
  const tokens = [...new Set(normalizeSearchText(rawQuery).split(" "))].filter(
    (token) => token.length >= 2,
  )
  const meaningful = tokens.filter((token) => !SEARCH_STOP_WORDS.has(token))
  return (meaningful.length > 0 ? meaningful : tokens).slice(0, 8)
}

function normalizeCode(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "")
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        substitution,
      )
    }
    previous.splice(0, previous.length, ...current)
  }
  return previous[right.length]
}

function tokenDistance(token: string, value: string): number {
  const words = normalizeSearchText(value).split(" ").filter(Boolean)
  if (words.length === 0) return 1

  return Math.min(...words.map((word) => {
    if (word === token) return 0
    if (word.startsWith(token)) return 0.01
    return editDistance(token, word) / Math.max(token.length, word.length)
  }))
}

export function searchRelevanceScore(item: SearchRankFields, rawQuery: string): number {
  const tokens = searchQueryTokens(rawQuery)
  if (tokens.length === 0) return 1

  const fields = [
    { value: item.supplierSku, weight: 0.8 },
    { value: item.name, weight: 0.8 },
    { value: item.brand, weight: 0.9 },
    { value: item.categoryLabel, weight: 1 },
  ]
  return tokens.reduce((total, token) => {
    const bestFieldScore = Math.min(
      ...fields.map((field) => tokenDistance(token, field.value) * field.weight),
    )
    return total + bestFieldScore
  }, 0) / tokens.length
}

export function searchPriority(item: SearchRankFields, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery)
  if (!query) return 99

  const queryCode = normalizeCode(rawQuery)
  const sku = normalizeCode(item.supplierSku)
  const name = normalizeSearchText(item.name)
  const brand = normalizeSearchText(item.brand)
  const category = normalizeSearchText(item.categoryLabel)

  if (sku === queryCode) return 0
  if (name === query) return 1
  if (sku.startsWith(queryCode)) return 2
  if (name.startsWith(query)) return 3

  const queryTokens = searchQueryTokens(query)
  const nameWords = name.split(" ")
  if (queryTokens.every((token) => nameWords.some((word) => word.startsWith(token)))) {
    return 4
  }
  if (name.includes(query)) return 5
  if (brand === query || brand.startsWith(query)) return 6
  if (category.includes(query)) return 7
  return 8
}

function stockPriority(stockLevel: SearchRankFields["stockLevel"]): number {
  if (stockLevel === "in-stock") return 0
  if (stockLevel === "low") return 1
  return 2
}

export function compareSearchCandidates<T extends SearchRankFields>(
  left: SearchCandidate<T>,
  right: SearchCandidate<T>,
  query: string,
): number {
  const priorityDifference = searchPriority(left.item, query) - searchPriority(right.item, query)
  if (priorityDifference !== 0) return priorityDifference

  const relevanceDifference =
    (left.relevance ?? searchRelevanceScore(left.item, query)) -
    (right.relevance ?? searchRelevanceScore(right.item, query))
  if (Math.abs(relevanceDifference) > Number.EPSILON) return relevanceDifference

  const scoreDifference = (left.score ?? 1) - (right.score ?? 1)
  if (Math.abs(scoreDifference) > Number.EPSILON) return scoreDifference

  const stockDifference = stockPriority(left.item.stockLevel) - stockPriority(right.item.stockLevel)
  if (stockDifference !== 0) return stockDifference

  return left.item.name.localeCompare(right.item.name, "en", { sensitivity: "base" })
}
