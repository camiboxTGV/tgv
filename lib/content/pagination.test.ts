import assert from "node:assert/strict"
import test from "node:test"
import { paginateItems } from "./pagination.ts"

test("catalog pagination preserves order and includes every item exactly once", () => {
  const source = Array.from({ length: 67 }, (_, index) => `product-${index + 1}`)
  const pages = Array.from({ length: 3 }, (_, index) =>
    paginateItems(source, index + 1, 24),
  )

  assert.deepEqual(pages.flatMap((page) => page.items), source)
  assert.deepEqual(
    pages.map(({ start, end }) => [start, end]),
    [[1, 24], [25, 48], [49, 67]],
  )
})

test("catalog pagination clamps malformed page and page-size inputs", () => {
  const source = ["a", "b", "c"]

  assert.equal(paginateItems(source, Number.NaN, 0).page, 1)
  assert.equal(paginateItems(source, 99, 2).page, 2)
  assert.deepEqual(paginateItems([], 4, 24), {
    items: [],
    page: 1,
    pageSize: 24,
    totalItems: 0,
    totalPages: 1,
    start: 0,
    end: 0,
  })
})
