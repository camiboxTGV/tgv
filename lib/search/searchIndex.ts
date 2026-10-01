import { normalizeSearchText } from "./ranking.ts"

export type SearchableStockLevel = "in-stock" | "low" | "out-of-stock"

export interface SearchIndexSource<T> {
  item: T
  name: string
  codes: readonly string[]
  brand?: string
  category?: string
  summary?: string
  keywords?: readonly string[]
  stockLevel: SearchableStockLevel
}

export interface SearchIndexHit<T> {
  item: T
  nameMatchTokens: readonly string[]
  priority: number
  score: number
}

interface PreparedDocument<T> {
  item: T
  name: string
  stockLevel: SearchableStockLevel
  normalizedName: string
  normalizedBrand: string
  normalizedCategory: string
  normalizedCodes: string[]
}

interface MutablePosting {
  fields: number
  weight: number
}

interface Posting extends MutablePosting {
  document: number
}

interface QueryAlternative {
  penalty: number
  token: string
}

interface QueryTerm {
  alternatives: QueryAlternative[]
  token: string
}

interface ParsedQuery {
  hasTranslatedTerms: boolean
  normalized: string
  originalNormalized: string
  terms: QueryTerm[]
}

interface TermDocumentMatch {
  fields: number
  fuzzy: boolean
  score: number
  token: string
}

interface Candidate {
  document: number
  fields: number[]
  fuzzyTerms: boolean[]
  matchedTokens: string[]
  matchedTerms: number
  score: number
}

const FIELD_CODE = 1 << 0
const FIELD_NAME = 1 << 1
const FIELD_BRAND = 1 << 2
const FIELD_CATEGORY = 1 << 3
const FIELD_KEYWORD = 1 << 4
const FIELD_SUMMARY = 1 << 5

const FIELD_WEIGHT = {
  code: 0,
  codeFragment: 0.6,
  name: 0.06,
  brand: 0.22,
  category: 0.34,
  keyword: 0.5,
  summary: 0.78,
} as const

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "cu",
  "de",
  "din",
  "for",
  "from",
  "in",
  "la",
  "of",
  "o",
  "pentru",
  "si",
  "the",
  "to",
  "un",
  "with",
])

/**
 * Phrase-level concepts that cannot be represented accurately by replacing one
 * token at a time. Longer phrases must come first.
 */
const QUERY_PHRASE_REWRITES: ReadonlyArray<readonly [string, string]> = [
  ["incarcator fara fir", "wireless charger"],
  ["casti fara fir", "wireless headphones"],
  ["memorie usb", "usb flash drive"],
  ["stick usb", "usb flash drive"],
  ["baterii externe", "power bank"],
  ["baterie externa", "power bank"],
  ["acumulator extern", "power bank"],
  ["sticla de apa", "water bottle"],
  ["geanta de voiaj", "travel bag"],
  ["geanta voiaj", "travel bag"],
  ["sacosa de cumparaturi", "shopping bag"],
  ["incarcator wireless", "wireless charger"],
  ["cana ceramica", "ceramic mug"],
  ["tee shirt", "tshirt"],
  ["t shirt", "tshirt"],
  ["powerbank", "power bank"],
  ["sacosa", "shopping bag"],
]

/** Romanian UI terms are preferred over their accidental English lookalikes. */
const QUERY_TRANSLATIONS = new Map<string, string>([
  ["agenda", "notebook"],
  ["agende", "notebook"],
  ["apa", "water"],
  ["alb", "white"],
  ["alba", "white"],
  ["albastra", "blue"],
  ["albastre", "blue"],
  ["albastru", "blue"],
  ["aluminiu", "aluminum"],
  ["argintie", "silver"],
  ["argintiu", "silver"],
  ["aurie", "gold"],
  ["auriu", "gold"],
  ["bambus", "bamboo"],
  ["bleumarin", "navy"],
  ["borseta", "waist"],
  ["breloc", "keyring"],
  ["brelocuri", "keyring"],
  ["bumbac", "cotton"],
  ["caciula", "beanie"],
  ["cana", "mug"],
  ["cani", "mug"],
  ["ceramice", "ceramic"],
  ["casti", "headphones"],
  ["ceramica", "ceramic"],
  ["galben", "yellow"],
  ["galbena", "yellow"],
  ["geanta", "bag"],
  ["genti", "bag"],
  ["gri", "gray"],
  ["incarcator", "charger"],
  ["incarcatoare", "charger"],
  ["lanterna", "flashlight"],
  ["lemn", "wood"],
  ["maro", "brown"],
  ["metalica", "metal"],
  ["metalice", "metal"],
  ["metalic", "metal"],
  ["mov", "purple"],
  ["neagra", "black"],
  ["negre", "black"],
  ["negru", "black"],
  ["otel", "steel"],
  ["patura", "blanket"],
  ["pelerina", "poncho"],
  ["piele", "leather"],
  ["pix", "pen"],
  ["pixuri", "pen"],
  ["pliabila", "foldable"],
  ["pliabile", "foldable"],
  ["pliabil", "foldable"],
  ["poliester", "polyester"],
  ["portocalie", "orange"],
  ["portocaliu", "orange"],
  ["prosop", "towel"],
  ["prosoape", "towel"],
  ["reciclata", "recycled"],
  ["reciclat", "recycled"],
  ["rosie", "red"],
  ["rosii", "red"],
  ["rosu", "red"],
  ["roz", "pink"],
  ["rucsac", "backpack"],
  ["rucsacuri", "backpack"],
  ["sapca", "cap"],
  ["sepci", "cap"],
  ["sticla", "bottle"],
  ["sticle", "bottle"],
  ["termos", "thermos"],
  ["tricou", "tshirt"],
  ["tricouri", "tshirt"],
  ["umbrela", "umbrella"],
  ["umbrele", "umbrella"],
  ["verde", "green"],
])

const RELATED_TERMS = new Map<string, readonly string[]>([
  ["aluminum", ["aluminium"]],
  ["aluminium", ["aluminum"]],
  ["backpack", ["rucksack"]],
  ["cap", ["hat"]],
  ["flashlight", ["torch"]],
  ["gray", ["grey"]],
  ["grey", ["gray"]],
  ["headphones", ["earphones", "headset"]],
  ["keychain", ["keyring"]],
  ["keyring", ["keychain"]],
  ["mug", ["cup"]],
  ["organiser", ["organizer"]],
  ["organizer", ["organiser"]],
  ["rucksack", ["backpack"]],
  ["shirt", ["tshirt"]],
  ["tshirt", ["shirt"]],
  ["torch", ["flashlight"]],
])

const RESULT_CACHE_SIZE = 64
const TERM_CACHE_SIZE = 128
const MAX_CACHED_RESULTS = 1_000
const MAX_CACHED_TERM_DOCUMENTS = 2_000
const PRODUCT_NAME_COLLATOR = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
})

function compactCode(value: string): string {
  return normalizeSearchText(value).replaceAll(" ", "")
}

function lightStem(token: string): string {
  if (token.length <= 3) return token
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`
  if (token.length > 4 && /(ches|shes|sses|xes|zes)$/.test(token)) {
    return token.slice(0, -2)
  }
  if (
    token.length > 3 &&
    token.endsWith("s") &&
    token !== "canvas" &&
    !/(is|ss|us)$/.test(token)
  ) {
    return token.slice(0, -1)
  }
  return token
}

function rewritePhrases(normalizedQuery: string): string {
  let rewritten = ` ${normalizedQuery} `
  for (const [phrase, replacement] of QUERY_PHRASE_REWRITES) {
    rewritten = rewritten.replaceAll(` ${phrase} `, ` ${replacement} `)
  }
  return rewritten.trim().replace(/\s+/g, " ")
}

function addAlternative(
  alternatives: QueryAlternative[],
  seen: Map<string, number>,
  token: string,
  penalty: number,
): void {
  if (token.length < 2) return
  const previous = seen.get(token)
  if (previous !== undefined && previous <= penalty) return
  seen.set(token, penalty)
  const existing = alternatives.find((alternative) => alternative.token === token)
  if (existing) {
    existing.penalty = penalty
  } else {
    alternatives.push({ token, penalty })
  }
}

export function parseSearchQuery(rawQuery: string): ParsedQuery {
  const originalNormalized = normalizeSearchText(rawQuery)
  const normalized = rewritePhrases(originalNormalized)
  const rawTokens = normalized.split(" ").filter((token) => token.length >= 2)
  const meaningful = rawTokens.filter((token) => !SEARCH_STOP_WORDS.has(token))
  const selected = meaningful.length > 0 ? meaningful : rawTokens
  const seenTerms = new Set<string>()
  const terms: QueryTerm[] = []
  let hasTranslatedTerms = false

  for (const sourceToken of selected) {
    const translated = QUERY_TRANSLATIONS.get(sourceToken)
    if (translated) hasTranslatedTerms = true
    const preferred = translated ?? sourceToken
    const canonical = lightStem(preferred)
    if (seenTerms.has(canonical)) continue
    if (terms.length >= 8) break
    seenTerms.add(canonical)

    const alternatives: QueryAlternative[] = []
    const seenAlternatives = new Map<string, number>()
    addAlternative(alternatives, seenAlternatives, preferred, 0)
    addAlternative(alternatives, seenAlternatives, canonical, 0.015)
    for (const related of RELATED_TERMS.get(preferred) ?? []) {
      addAlternative(alternatives, seenAlternatives, related, 0.035)
      addAlternative(alternatives, seenAlternatives, lightStem(related), 0.05)
    }
    if (translated) {
      addAlternative(alternatives, seenAlternatives, sourceToken, 0.2)
      addAlternative(alternatives, seenAlternatives, lightStem(sourceToken), 0.215)
    }
    terms.push({ alternatives, token: canonical })
  }

  return {
    hasTranslatedTerms,
    normalized: terms.map((term) => term.token).join(" "),
    originalNormalized,
    terms,
  }
}

function tokenVariants(value: string): string[] {
  const normalized = normalizeSearchText(value)
  const out = new Set<string>()
  for (const token of normalized.split(" ")) {
    if (token.length < 2 || SEARCH_STOP_WORDS.has(token)) continue
    out.add(token)
    out.add(lightStem(token))
  }
  if (/\bt shirts?\b/.test(normalized)) out.add("tshirt")
  return [...out]
}

function tokenBigrams(token: string): string[] {
  const padded = `^${token}$`
  const grams = new Set<string>()
  for (let index = 0; index < padded.length - 1; index += 1) {
    grams.add(padded.slice(index, index + 2))
  }
  return [...grams]
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0
  if (left.length === 0) return right.length
  if (right.length === 0) return left.length

  let previousPrevious: number[] | null = null
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      let distance = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        substitution,
      )
      if (
        previousPrevious &&
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        distance = Math.min(distance, previousPrevious[rightIndex - 2] + 1)
      }
      current[rightIndex] = distance
    }
    previousPrevious = previous
    previous = current
  }
  return previous[right.length]
}

function allowedEditDistance(token: string): number {
  if (token.length < 3) return 0
  if (token.length <= 5) return 1
  return 2
}

function looksLikeTypoCorrection(queryToken: string, matchedToken: string): boolean {
  if (queryToken === matchedToken) return true
  if (queryToken.slice(0, 2) !== matchedToken.slice(0, 2)) return false
  return editDistance(queryToken, matchedToken) <= 2
}

function lowerBound(values: readonly string[], target: string): number {
  let low = 0
  let high = values.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (values[middle] < target) low = middle + 1
    else high = middle
  }
  return low
}

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): void {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size <= limit) return
  const oldest = cache.keys().next().value as K | undefined
  if (oldest !== undefined) cache.delete(oldest)
}

function stockPriority(stockLevel: SearchableStockLevel): number {
  if (stockLevel === "in-stock") return 0
  if (stockLevel === "low") return 1
  return 2
}

function normalizedWithOffsets(value: string): { offsets: number[]; value: string } {
  const offsets: number[] = []
  let normalized = ""
  let sourceOffset = 0
  let pendingSpace = false

  for (const sourceCharacter of value) {
    const folded = sourceCharacter
      .normalize("NFKD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
    for (const character of folded) {
      if (/[a-z0-9]/.test(character)) {
        if (pendingSpace && normalized.length > 0) {
          normalized += " "
          offsets.push(sourceOffset)
        }
        normalized += character
        offsets.push(sourceOffset)
        pendingSpace = false
      } else if (normalized.length > 0) {
        pendingSpace = true
      }
    }
    sourceOffset += sourceCharacter.length
  }
  return { offsets, value: normalized }
}

export function highlightSearchName(
  name: string,
  matchedTokens: readonly string[],
): ReadonlyArray<readonly [number, number]> {
  if (matchedTokens.length === 0) return []
  const normalized = normalizedWithOffsets(name)
  const ranges: Array<readonly [number, number]> = []
  const words = [...normalized.value.matchAll(/[a-z0-9]+/g)]

  for (const token of new Set(matchedTokens)) {
    for (const wordMatch of words) {
      const word = wordMatch[0]
      const start = wordMatch.index
      if (
        word !== token &&
        !word.startsWith(token) &&
        lightStem(word) !== token
      ) continue
      const end = start + word.length - 1
      const sourceStart = normalized.offsets[start]
      const sourceEnd = normalized.offsets[end]
      if (sourceStart !== undefined && sourceEnd !== undefined) {
        ranges.push([sourceStart, sourceEnd])
      }
      break
    }
  }

  ranges.sort((left, right) => left[0] - right[0] || left[1] - right[1])
  return ranges.filter((range, index) => (
    index === 0 || range[0] > ranges[index - 1][1]
  ))
}

export function compareSearchIndexHits<T>(
  left: SearchIndexHit<T>,
  right: SearchIndexHit<T>,
  getName: (item: T) => string,
  getStockLevel: (item: T) => SearchableStockLevel,
): number {
  return left.priority - right.priority ||
    left.score - right.score ||
    stockPriority(getStockLevel(left.item)) - stockPriority(getStockLevel(right.item)) ||
    PRODUCT_NAME_COLLATOR.compare(getName(left.item), getName(right.item))
}

export class SearchIndex<T> {
  private readonly documents: PreparedDocument<T>[]
  private readonly exactCodes = new Map<string, number | number[]>()
  private readonly documentsByItem = new Map<T, PreparedDocument<T>>()
  private readonly postings: Map<string, Posting[]>
  private readonly vocabulary: string[]
  private readonly bigramVocabulary = new Map<string, number[]>()
  private readonly resultCache = new Map<string, readonly SearchIndexHit<T>[]>()
  private readonly termCache = new Map<string, ReadonlyMap<number, TermDocumentMatch>>()

  constructor(sources: readonly SearchIndexSource<T>[]) {
    const postings = new Map<string, Posting[]>()
    this.documents = sources.map((source, document) => {
      const documentTokens = new Map<string, MutablePosting>()
      const normalizedCodes = [...new Set(source.codes.map(compactCode).filter(Boolean))]
      for (const code of normalizedCodes) {
        const existing = this.exactCodes.get(code)
        if (existing === undefined) this.exactCodes.set(code, document)
        else if (typeof existing === "number") this.exactCodes.set(code, [existing, document])
        else existing.push(document)
      }

      const addToken = (token: string, weight: number, field: number): void => {
        const previous = documentTokens.get(token)
        if (previous) {
          previous.fields |= field
          previous.weight = Math.min(previous.weight, weight)
        } else {
          documentTokens.set(token, { fields: field, weight })
        }
      }
      const addText = (value: string, weight: number, field: number): void => {
        for (const token of tokenVariants(value)) addToken(token, weight, field)
      }

      for (const code of source.codes) {
        addText(code, FIELD_WEIGHT.codeFragment, FIELD_CODE)
        const compact = compactCode(code)
        if (compact.length >= 2) addToken(compact, FIELD_WEIGHT.code, FIELD_CODE)
      }
      addText(source.name, FIELD_WEIGHT.name, FIELD_NAME)
      addText(source.brand ?? "", FIELD_WEIGHT.brand, FIELD_BRAND)
      addText(source.category ?? "", FIELD_WEIGHT.category, FIELD_CATEGORY)
      for (const keyword of source.keywords ?? []) {
        addText(keyword, FIELD_WEIGHT.keyword, FIELD_KEYWORD)
      }
      addText(source.summary ?? "", FIELD_WEIGHT.summary, FIELD_SUMMARY)

      for (const [token, posting] of documentTokens) {
        const tokenPostings = postings.get(token)
        const value = { document, ...posting }
        if (tokenPostings) tokenPostings.push(value)
        else postings.set(token, [value])
      }

      return {
        item: source.item,
        name: source.name,
        stockLevel: source.stockLevel,
        normalizedName: normalizeSearchText(source.name),
        normalizedBrand: normalizeSearchText(source.brand ?? ""),
        normalizedCategory: normalizeSearchText(source.category ?? ""),
        normalizedCodes,
      }
    })
    for (const document of this.documents) {
      this.documentsByItem.set(document.item, document)
    }

    this.postings = postings
    this.vocabulary = [...this.postings.keys()].sort()
    for (let vocabularyIndex = 0; vocabularyIndex < this.vocabulary.length; vocabularyIndex += 1) {
      for (const bigram of tokenBigrams(this.vocabulary[vocabularyIndex])) {
        const matches = this.bigramVocabulary.get(bigram)
        if (matches) matches.push(vocabularyIndex)
        else this.bigramVocabulary.set(bigram, [vocabularyIndex])
      }
    }
  }

  private addVocabularyMatch(
    matches: Map<string, number>,
    token: string,
    score: number,
  ): void {
    const previous = matches.get(token)
    if (previous === undefined || score < previous) matches.set(token, score)
  }

  private addExactAndPrefixMatches(
    matches: Map<string, number>,
    alternative: QueryAlternative,
  ): void {
    const start = lowerBound(this.vocabulary, alternative.token)
    for (let index = start; index < this.vocabulary.length; index += 1) {
      const token = this.vocabulary[index]
      if (!token.startsWith(alternative.token)) break
      const prefixPenalty = token === alternative.token
        ? 0
        : 0.08 + Math.min(0.08, (token.length - alternative.token.length) * 0.004)
      this.addVocabularyMatch(matches, token, alternative.penalty + prefixPenalty)
    }
  }

  private fuzzyVocabularyMatches(alternative: QueryAlternative): Map<string, number> {
    const maxDistance = allowedEditDistance(alternative.token)
    const matches = new Map<string, number>()
    if (maxDistance === 0) return matches

    const candidates = new Set<number>()
    for (const bigram of tokenBigrams(alternative.token)) {
      for (const vocabularyIndex of this.bigramVocabulary.get(bigram) ?? []) {
        candidates.add(vocabularyIndex)
      }
    }
    for (const vocabularyIndex of candidates) {
      const token = this.vocabulary[vocabularyIndex]
      if (Math.abs(token.length - alternative.token.length) > maxDistance) continue
      const distance = editDistance(alternative.token, token)
      if (distance === 0 || distance > maxDistance) continue
      const relativeDistance = distance / Math.max(token.length, alternative.token.length)
      if (relativeDistance > 0.34) continue
      matches.set(token, alternative.penalty + 0.22 + relativeDistance * 0.45)
    }
    return matches
  }

  private postingsForTerm(term: QueryTerm): ReadonlyMap<number, TermDocumentMatch> {
    const cacheKey = term.alternatives
      .map((alternative) => `${alternative.token}:${alternative.penalty}`)
      .join("|")
    const cached = this.termCache.get(cacheKey)
    if (cached) return cached

    const vocabularyMatches = new Map<string, number>()
    for (const alternative of term.alternatives) {
      this.addExactAndPrefixMatches(vocabularyMatches, alternative)
    }

    const documents = new Map<number, TermDocumentMatch>()
    const addDocuments = (
      token: string,
      tokenScore: number,
      fuzzy: boolean,
    ): void => {
      for (const posting of this.postings.get(token) ?? []) {
        const score = tokenScore + posting.weight
        const previous = documents.get(posting.document)
        const shouldReplace = !previous ||
          (!fuzzy && previous.fuzzy) ||
          (fuzzy === previous.fuzzy && score < previous.score - Number.EPSILON)
        if (shouldReplace) {
          documents.set(posting.document, {
            fields: posting.fields,
            fuzzy,
            score,
            token,
          })
        } else if (
          fuzzy === previous.fuzzy &&
          Math.abs(score - previous.score) <= Number.EPSILON
        ) {
          previous.fields |= posting.fields
          previous.fuzzy &&= fuzzy
        }
      }
    }
    for (const [token, score] of vocabularyMatches) {
      addDocuments(token, score, false)
    }

    const hasExactCodeMatch = term.alternatives.some(
      (alternative) => this.exactCodes.has(alternative.token),
    )
    if (!hasExactCodeMatch) {
      for (const alternative of term.alternatives) {
        for (const [token, score] of this.fuzzyVocabularyMatches(alternative)) {
          const existingScore = vocabularyMatches.get(token)
          if (existingScore !== undefined && existingScore <= score) continue
          addDocuments(token, score, true)
        }
      }
    }

    if (documents.size <= MAX_CACHED_TERM_DOCUMENTS) {
      setBoundedCache(this.termCache, cacheKey, documents, TERM_CACHE_SIZE)
    }
    return documents
  }

  private exactCodeHits(queryCode: string): SearchIndexHit<T>[] {
    const match = this.exactCodes.get(queryCode)
    const documents = match === undefined
      ? []
      : typeof match === "number" ? [match] : match
    return documents.map((document) => ({
      item: this.documents[document].item,
      nameMatchTokens: [],
      priority: 0,
      score: 0,
    }))
  }

  private combineTermMatches(termMatches: ReadonlyMap<number, TermDocumentMatch>[]): Candidate[] {
    if (termMatches.length === 0) return []
    const ordered = [...termMatches].sort((left, right) => left.size - right.size)
    const strictCandidates: Candidate[] = []
    if (ordered[0].size > 0) {
      for (const [document, first] of ordered[0]) {
        if (ordered.slice(1).some((matches) => !matches.has(document))) continue
        const matches = termMatches.map((matches) => matches.get(document) ?? first)
        strictCandidates.push({
          document,
          fields: matches.map((match) => match.fields),
          fuzzyTerms: matches.map((match) => match.fuzzy),
          matchedTokens: matches.map((match) => match.token),
          matchedTerms: matches.length,
          score: matches.reduce((sum, match) => sum + match.score, 0),
        })
      }
    }
    // Degrade predictably instead of returning nothing because one word was
    // unknown or only appears on another product. Missing words carry a large
    // penalty, while complete matches stay unpenalized.
    const partial = new Map<number, Candidate>()
    for (const matches of termMatches) {
      for (const [document, match] of matches) {
        const candidate = partial.get(document)
        if (candidate) {
          candidate.fields.push(match.fields)
          candidate.fuzzyTerms.push(match.fuzzy)
          candidate.matchedTokens.push(match.token)
          candidate.matchedTerms += 1
          candidate.score += match.score
        } else {
          partial.set(document, {
            document,
            fields: [match.fields],
            fuzzyTerms: [match.fuzzy],
            matchedTokens: [match.token],
            matchedTerms: 1,
            score: match.score,
          })
        }
      }
    }
    const hasEmptyTerm = termMatches.some((matches) => matches.size === 0)
    const requiredMatches = hasEmptyTerm
      ? Math.max(1, termMatches.filter((matches) => matches.size > 0).length)
      : termMatches.length === 2
        ? 1
        : Math.max(1, Math.ceil(termMatches.length * 2 / 3))
    const strictDocuments = new Set(strictCandidates.map((candidate) => candidate.document))
    const bestStrictScore = strictCandidates.reduce(
      (best, candidate) => Math.min(best, candidate.score),
      Number.POSITIVE_INFINITY,
    )
    const partialCandidates = [...partial.values()]
      .filter((candidate) => !strictDocuments.has(candidate.document))
      .filter((candidate) => candidate.matchedTerms >= requiredMatches)
      .map((candidate) => ({
        ...candidate,
        score: candidate.score + (termMatches.length - candidate.matchedTerms) * 1.25,
      }))
      .filter((candidate) => (
        termMatches.length !== 2 ||
        strictCandidates.length === 0 ||
        candidate.score < bestStrictScore
      ))
    return [...strictCandidates, ...partialCandidates]
  }

  private candidatePriority(
    candidate: Candidate,
    document: PreparedDocument<T>,
    parsedQuery: ParsedQuery,
    queryCode: string,
    codeLike: boolean,
  ): number {
    if (codeLike && document.normalizedCodes.includes(queryCode)) return 0
    if (document.normalizedName === parsedQuery.originalNormalized) return 1
    if (
      codeLike &&
      document.normalizedCodes.some((code) => code.startsWith(queryCode))
    ) return 2
    if (
      document.normalizedName === parsedQuery.normalized ||
      (
        !parsedQuery.hasTranslatedTerms &&
        document.normalizedName.startsWith(parsedQuery.originalNormalized)
      ) ||
      document.normalizedName.startsWith(parsedQuery.normalized)
    ) return 3
    if (
      candidate.matchedTerms === parsedQuery.terms.length &&
      candidate.fuzzyTerms.every((fuzzy) => !fuzzy) &&
      (
        parsedQuery.terms.length === 1 ||
        candidate.fields.some((fields) => (fields & ~FIELD_SUMMARY) !== 0)
      )
    ) return 4
    if (
      document.normalizedName.includes(parsedQuery.originalNormalized) ||
      document.normalizedName.includes(parsedQuery.normalized)
    ) return 5
    if (
      document.normalizedBrand === parsedQuery.originalNormalized ||
      document.normalizedBrand === parsedQuery.normalized ||
      document.normalizedBrand.startsWith(parsedQuery.originalNormalized) ||
      document.normalizedBrand.startsWith(parsedQuery.normalized)
    ) return 6
    if (
      document.normalizedCategory.includes(parsedQuery.originalNormalized) ||
      document.normalizedCategory.includes(parsedQuery.normalized) ||
      (
        candidate.matchedTerms === parsedQuery.terms.length &&
        candidate.fields.every((fields) => (fields & FIELD_CATEGORY) !== 0)
      )
    ) return 7
    return 8
  }

  search(rawQuery: string): readonly SearchIndexHit<T>[] {
    const trimmedQuery = rawQuery.trim()
    const uppercaseCodeIntent = !/\s/.test(trimmedQuery) &&
      /[A-Z]/.test(trimmedQuery) &&
      trimmedQuery === trimmedQuery.toUpperCase()
    const cacheKey = `${normalizeSearchText(rawQuery)}:${uppercaseCodeIntent ? "code" : "text"}`
    const cached = this.resultCache.get(cacheKey)
    if (cached) {
      this.resultCache.delete(cacheKey)
      this.resultCache.set(cacheKey, cached)
      return cached
    }

    const parsedQuery = parseSearchQuery(rawQuery)
    const queryCode = compactCode(rawQuery)
    const codeLike = /\d/.test(queryCode) || (
      parsedQuery.terms.length === 1 && queryCode.length >= 4
    ) || uppercaseCodeIntent
    const exact = this.exactCodeHits(queryCode)
    const exactOnly = exact.length > 0 && (codeLike || queryCode.length >= 4)
    if (exact.length > 0 && (exactOnly || parsedQuery.terms.length === 0)) {
      exact.sort((left, right) => compareSearchIndexHits(
        left,
        right,
        (item) => this.documentsByItem.get(item)?.name ?? "",
        (item) => this.documentsByItem.get(item)?.stockLevel ?? "out-of-stock",
      ))
      setBoundedCache(this.resultCache, cacheKey, exact, RESULT_CACHE_SIZE)
      return exact
    }
    if (parsedQuery.terms.length === 0) return []

    const termMatches = parsedQuery.terms.map((term) => this.postingsForTerm(term))
    const hits: SearchIndexHit<T>[] = this.combineTermMatches(termMatches).map((candidate) => {
      const document = this.documents[candidate.document]
      const matchedNameTokens = candidate.matchedTokens.filter((_, index) => (
        (candidate.fields[index] & FIELD_NAME) !== 0
      ))
      const matchedPhrase = candidate.matchedTokens.join(" ")
      const typoCorrectedPhrase =
        candidate.matchedTerms === parsedQuery.terms.length &&
        parsedQuery.terms.every((term, index) => (
          looksLikeTypoCorrection(term.token, candidate.matchedTokens[index])
        ))
      const phraseBonus = typoCorrectedPhrase && document.normalizedName.startsWith(matchedPhrase)
        ? 0.04
        : typoCorrectedPhrase && document.normalizedName.includes(matchedPhrase)
          ? 0.02
          : 0
      return {
        item: document.item,
        nameMatchTokens: matchedNameTokens,
        priority: this.candidatePriority(
          candidate,
          document,
          parsedQuery,
          queryCode,
          codeLike,
        ),
        score: candidate.score - phraseBonus,
      }
    })
    if (exact.length > 0) {
      const exactItems = new Set(exact.map((hit) => hit.item))
      hits.splice(0, hits.length, ...exact, ...hits.filter((hit) => !exactItems.has(hit.item)))
    }
    hits.sort((left, right) => compareSearchIndexHits(
      left,
      right,
      (item) => this.documentsByItem.get(item)?.name ?? "",
      (item) => this.documentsByItem.get(item)?.stockLevel ?? "out-of-stock",
    ))
    if (hits.length <= MAX_CACHED_RESULTS) {
      setBoundedCache(this.resultCache, cacheKey, hits, RESULT_CACHE_SIZE)
    }
    return hits
  }
}
