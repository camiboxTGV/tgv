export const CATALOG_PAGE_SIZE = 24

export interface PaginationSlice<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  start: number
  end: number
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize = CATALOG_PAGE_SIZE,
): PaginationSlice<T> {
  const safePageSize = Number.isFinite(pageSize)
    ? Math.max(1, Math.floor(pageSize))
    : CATALOG_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize))
  const requestedPage = Number.isFinite(page) ? Math.floor(page) : 1
  const safePage = Math.max(1, Math.min(requestedPage, totalPages))
  const startIndex = (safePage - 1) * safePageSize
  const pageItems = items.slice(startIndex, startIndex + safePageSize)

  return {
    items: pageItems,
    page: safePage,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages,
    start: pageItems.length === 0 ? 0 : startIndex + 1,
    end: startIndex + pageItems.length,
  }
}
