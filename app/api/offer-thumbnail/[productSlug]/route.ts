import { getProductsByCategoryPath, getProductVariants } from "@/lib/content/catalog.server"
import { splitPath } from "@/lib/content/categories"
import { offerThumbnailFor } from "@/lib/offer/thumbnail"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ productSlug: string }>
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { productSlug } = await context.params
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") ?? ""
  const variantKey = searchParams.get("variant")

  if (
    productSlug.length < 1 ||
    productSlug.length > 200 ||
    category.length < 1 ||
    category.length > 500 ||
    (variantKey?.length ?? 0) > 500
  ) {
    return jsonResponse({ error: "Invalid offer item" }, 400)
  }

  const product = getProductsByCategoryPath(splitPath(category)).find(
    (candidate) => candidate.slug === productSlug,
  )
  if (!product) return jsonResponse({ error: "Product not found" }, 404)

  const variant = variantKey
    ? getProductVariants(productSlug).find(
        (candidate) => candidate.contentKey === variantKey,
      )
    : undefined
  const thumbnailUrl = offerThumbnailFor(product, variant)
  if (!thumbnailUrl) return jsonResponse({ error: "Image not found" }, 404)

  return jsonResponse({ thumbnailUrl }, 200)
}

function jsonResponse(
  body: Record<string, string>,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  })
}
