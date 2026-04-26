import type { IFuseOptions } from "fuse.js"

export const FUSE_OPTIONS: IFuseOptions<unknown> = {
  keys: [
    { name: "name", weight: 0.5 },
    { name: "brand", weight: 0.2 },
    { name: "summary", weight: 0.15 },
    { name: "category", weight: 0.1 },
    { name: "personalizations", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  useExtendedSearch: false,
}

export const SEARCH_RESULT_LIMIT = 10
