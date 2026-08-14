import type { NextRequest } from "next/server"
import { searchCatalog } from "@/lib/search/catalogSearch.server"
import {
  SEARCH_API_MAX_LIMIT,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/fuseConfig"
import type { SearchResponse } from "@/lib/search/types"

export const runtime = "nodejs"

export async function GET(req: NextRequest): Promise<Response> {
  const raw = req.nextUrl.searchParams.get("q") ?? ""
  const rawLimit = req.nextUrl.searchParams.get("limit")
  const requestedLimit = rawLimit === null ? Number.NaN : Number(rawLimit)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(SEARCH_API_MAX_LIMIT, Math.max(1, Math.floor(requestedLimit)))
    : SEARCH_RESULT_LIMIT

  try {
    const search = searchCatalog(raw, { limit })
    const body: SearchResponse = {
      results: search.results,
      query: search.query,
      total: search.total,
      hasMore: search.hasMore,
    }
    return Response.json(body, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    })
  } catch {
    return Response.json({ error: "search_failed" }, { status: 500 })
  }
}
