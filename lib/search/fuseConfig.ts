import type { IFuseOptions } from "fuse.js"

export const FUSE_OPTIONS: IFuseOptions<unknown> = {
  keys: [
    { name: "supplierSku", weight: 0.32 },
    { name: "name", weight: 0.32 },
    { name: "categoryLabel", weight: 0.09 },
    { name: "brand", weight: 0.08 },
    { name: "searchText", weight: 0.07 },
    { name: "summary", weight: 0.06 },
    { name: "supplierPersonalizations", weight: 0.04 },
    { name: "personalizations", weight: 0.02 },
  ],
  threshold: 0.32,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  fieldNormWeight: 0.8,
  shouldSort: true,
  useExtendedSearch: false,
}

export const SEARCH_RESULT_LIMIT = 6
export const SEARCH_PAGE_SIZE = 48
export const SEARCH_MAX_QUERY_LENGTH = 100
export const SEARCH_API_MAX_LIMIT = 100
