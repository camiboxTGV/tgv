interface CategoryImageCandidate {
  images?: readonly string[]
}

export function pickCategoryImage(
  curatedImage: string | undefined,
  candidates: readonly CategoryImageCandidate[],
): string | undefined {
  if (curatedImage?.trim()) return curatedImage

  for (const candidate of candidates) {
    const image = candidate.images?.find((value) => value.trim())
    if (image) return image
  }

  return undefined
}
