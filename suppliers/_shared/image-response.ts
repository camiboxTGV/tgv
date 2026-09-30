/**
 * Read an upstream image without ever buffering more than the configured cap.
 */
export async function readBoundedImageResponse(
  response: Response,
  maximumBytes: number,
): Promise<Buffer> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new Error("image size limit must be a positive integer")
  }

  const contentLength = response.headers.get("content-length")
  if (contentLength !== null) {
    const declaredLength = Number(contentLength)
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > maximumBytes
    ) {
      await cancelResponseBody(response)
      throw new Error("supplier image has an invalid size")
    }
  }
  if (!response.body) throw new Error("supplier image body is empty")

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let byteLength = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > maximumBytes) {
        throw new Error("supplier image exceeds the size limit")
      }
      chunks.push(Buffer.from(value))
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }

  if (byteLength === 0) throw new Error("supplier image body is empty")
  return Buffer.concat(chunks, byteLength)
}

export async function cancelResponseBody(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => {})
}
