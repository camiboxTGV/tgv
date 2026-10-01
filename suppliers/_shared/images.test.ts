import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { RawProduct, SupplierAdapter } from "./adapter.ts"
import {
  downloadProductImages,
  localRelPath,
  type ImageManifest,
} from "./images.ts"
import { runSync } from "./orchestrator.ts"

const CATEGORY = "bags/shopping-bags/cotton-and-canvas"
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
)

async function withTempRepo(run: (repoRoot: string) => Promise<void>): Promise<void> {
  const repoRoot = await mkdtemp(join(tmpdir(), "tgv-images-"))
  try {
    await run(repoRoot)
  } finally {
    await rm(repoRoot, { recursive: true, force: true })
  }
}

function rawProduct(sku: string, images: string[]): RawProduct {
  return {
    supplierId: "macma",
    supplierSku: sku,
    name: `Macma ${sku}`,
    supplierCategory: CATEGORY,
    supplierPriceEur: 10,
    originalCurrency: "EUR",
    stock: 10,
    images,
    fetchedAt: "2026-09-30T00:00:00.000Z",
  }
}

function macmaAdapter(raw: RawProduct): SupplierAdapter {
  return {
    id: "macma",
    displayName: "Macma",
    fetchAll: async () => [raw],
    mapCategory: (product) => product.supplierCategory,
    mapPersonalizations: () => [],
  }
}

test("local mirror paths hash supplier-controlled traversal segments", () => {
  const safePath = localRelPath("makito", "../../outside/catalog", 0, "WEBP")
  assert.match(
    safePath,
    /^\/catalog\/makito\/product-[a-f0-9]{24}\/00\.webp$/,
  )
  assert.equal(safePath.includes(".."), false)
  assert.throws(() => localRelPath("makito", "sku", -1, "webp"), /image index/)
  assert.throws(
    () => localRelPath("makito", "sku", 0, "../json"),
    /image extension/,
  )
})

test("an opted-in adapter mirrors only its configured product image limit during skip-image syncs", async () => {
  await withTempRepo(async (repoRoot) => {
    const sourceUrls = [
      "https://macma.ro/products/first.jpg",
      "https://macma.ro/products/second.jpg",
    ]
    const fetched: string[] = []
    const adapter: SupplierAdapter = {
      ...macmaAdapter(rawProduct("MIRROR-LIMIT", sourceUrls)),
      imageMirror: {
        enabledWhenImagesSkipped: true,
        maxProductImages: 1,
        fetch: async (sourceUrl, signal) => {
          assert.equal(signal.aborted, false)
          fetched.push(sourceUrl)
          return new Response(TINY_PNG, {
            headers: {
              "content-length": String(TINY_PNG.byteLength),
              "content-type": "image/png",
            },
          })
        },
      },
    }

    const report = await runSync({
      repoRoot,
      adapters: [adapter],
      force: true,
      skipImages: true,
    })

    assert.deepEqual(fetched, [sourceUrls[0]])
    assert.deepEqual(report.suppliers.macma?.images, {
      downloaded: 1,
      skipped: 0,
      failed: 0,
    })
    const products = JSON.parse(
      await readFile(
        join(repoRoot, `lib/content/generated/products/${CATEGORY}.json`),
        "utf8",
      ),
    ) as Array<{ images: string[] }>
    assert.deepEqual(products[0]?.images, ["/catalog/macma/MIRROR-LIMIT/00.webp"])

    const manifest = JSON.parse(
      await readFile(
        join(repoRoot, "lib/content/generated/images-manifest.json"),
        "utf8",
      ),
    ) as ImageManifest
    assert.deepEqual(Object.keys(manifest.entries), ["macma/MIRROR-LIMIT/00"])
    assert.equal(
      (await readFile(join(repoRoot, "public/catalog/macma/MIRROR-LIMIT/00.webp")))
        .byteLength > 0,
      true,
    )
  })
})

test("ordinary skip-image syncs preserve an existing image manifest", async () => {
  await withTempRepo(async (repoRoot) => {
    const manifestPath = join(repoRoot, "lib/content/generated/images-manifest.json")
    await mkdir(join(repoRoot, "lib/content/generated"), { recursive: true })
    const original = JSON.stringify({
      entries: {
        "macma/OLD/00": {
          supplierId: "macma",
          supplierSku: "OLD",
          sourceUrl: "https://macma.ro/products/old.jpg",
          localPath: "/catalog/macma/OLD/00.webp",
          sourceHash: "existing",
          fetchedAt: "2026-09-29T00:00:00.000Z",
        },
      },
    })
    await writeFile(manifestPath, original, "utf8")

    await runSync({
      repoRoot,
      adapters: [
        macmaAdapter(
          rawProduct("NO-MIRROR", ["https://macma.ro/products/no-mirror.jpg"]),
        ),
      ],
      force: true,
      skipImages: true,
    })

    assert.equal(await readFile(manifestPath, "utf8"), original)
  })
})

test("dry-run syncs never fetch or mutate mirrored images", async () => {
  await withTempRepo(async (repoRoot) => {
    const manifestPath = join(repoRoot, "lib/content/generated/images-manifest.json")
    await mkdir(join(repoRoot, "lib/content/generated"), { recursive: true })
    const originalManifest = JSON.stringify({
      entries: {
        "macma/EXISTING/00": {
          supplierId: "macma",
          supplierSku: "EXISTING",
          sourceUrl: "https://macma.ro/products/existing.jpg",
          localPath: "/catalog/macma/EXISTING/00.webp",
          sourceHash: "existing",
          fetchedAt: "2026-09-29T00:00:00.000Z",
        },
      },
    })
    await writeFile(manifestPath, originalManifest, "utf8")

    let fetches = 0
    const adapter: SupplierAdapter = {
      ...macmaAdapter(
        rawProduct("DRY-RUN", ["https://macma.ro/products/dry-run.jpg"]),
      ),
      imageMirror: {
        enabledWhenImagesSkipped: true,
        fetch: async () => {
          fetches += 1
          return new Response(TINY_PNG, {
            headers: { "content-type": "image/png" },
          })
        },
      },
    }

    const report = await runSync({
      repoRoot,
      adapters: [adapter],
      dryRun: true,
      force: true,
    })

    assert.equal(fetches, 0)
    assert.deepEqual(report.suppliers.macma?.images, {
      downloaded: 0,
      skipped: 0,
      failed: 0,
    })
    assert.equal(await readFile(manifestPath, "utf8"), originalManifest)
    await assert.rejects(
      readFile(join(repoRoot, "public/catalog/macma/DRY-RUN/00.webp")),
      (error: NodeJS.ErrnoException) => error.code === "ENOENT",
    )
  })
})

test("cache hits require a nonempty regular file and failed atomic writes remove temp files", async () => {
  await withTempRepo(async (repoRoot) => {
    const sourceUrl = "https://macma.ro/products/cache.jpg"
    const imagePath = join(repoRoot, "public/catalog/macma/CACHE/00.webp")
    const imageDir = join(repoRoot, "public/catalog/macma/CACHE")
    const manifest: ImageManifest = { entries: {} }
    let fetches = 0
    const fetchImage = async (): Promise<Response> => {
      fetches += 1
      return new Response(TINY_PNG, {
        headers: { "content-type": "image/png" },
      })
    }

    const first = await downloadProductImages({
      repoRoot,
      supplierId: "macma",
      supplierSku: "CACHE",
      sourceUrls: [sourceUrl],
      manifest,
      fetchImage,
    })
    assert.equal(first.downloaded, 1)

    await writeFile(imagePath, Buffer.alloc(0))
    const afterEmptyFile = await downloadProductImages({
      repoRoot,
      supplierId: "macma",
      supplierSku: "CACHE",
      sourceUrls: [sourceUrl],
      manifest,
      fetchImage,
    })
    assert.equal(afterEmptyFile.downloaded, 1)
    assert.equal(afterEmptyFile.skipped, 0)
    assert.equal(fetches, 2)
    assert.equal((await readFile(imagePath)).byteLength > 0, true)

    await rm(imagePath)
    await mkdir(imagePath)
    const originalConsoleError = console.error
    console.error = () => {}
    try {
      const afterDirectory = await downloadProductImages({
        repoRoot,
        supplierId: "macma",
        supplierSku: "CACHE",
        sourceUrls: [sourceUrl],
        manifest,
        fetchImage,
      })
      assert.equal(afterDirectory.failed, 1)
      assert.equal(fetches, 3)
    } finally {
      console.error = originalConsoleError
    }

    assert.deepEqual(await readdir(imageDir), ["00.webp"])
  })
})

test("custom image fetch timeouts abort authenticated fetches", async () => {
  await withTempRepo(async (repoRoot) => {
    let observedAbort = false
    const originalConsoleError = console.error
    console.error = () => {}
    try {
      const result = await downloadProductImages({
        repoRoot,
        supplierId: "makito",
        supplierSku: "TIMEOUT",
        sourceUrls: ["https://apis.makito.es/catalog/assets/timeout.jpg"],
        manifest: { entries: {} },
        fetchTimeoutMs: 5,
        fetchImage: async (_sourceUrl, signal) =>
          await new Promise<Response>((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => {
                observedAbort = true
                reject(signal.reason)
              },
              { once: true },
            )
          }),
      })

      assert.equal(observedAbort, true)
      assert.equal(result.failed, 1)
    } finally {
      console.error = originalConsoleError
    }
  })
})

test("image processing preserves resize and WebP conversion while rejecting oversized inputs", async () => {
  await withTempRepo(async (repoRoot) => {
    const manifest: ImageManifest = { entries: {} }
    const normalSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2"><rect width="100%" height="100%" fill="red"/></svg>',
    )
    const normal = await downloadProductImages({
      repoRoot,
      supplierId: "macma",
      supplierSku: "RESIZE",
      sourceUrls: ["https://macma.ro/products/resize.svg"],
      manifest,
      fetchImage: async () =>
        new Response(normalSvg, {
          headers: { "content-type": "image/svg+xml" },
        }),
    })
    assert.equal(normal.downloaded, 1)

    const { default: sharp } = await import("sharp")
    const metadata = await sharp(
      await readFile(join(repoRoot, "public/catalog/macma/RESIZE/00.webp")),
    ).metadata()
    assert.equal(metadata.format, "webp")
    assert.equal(metadata.width, 1200)

    const oversizedSvg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="5000"><rect width="100%" height="100%" fill="red"/></svg>',
    )
    const originalConsoleError = console.error
    console.error = () => {}
    try {
      const oversized = await downloadProductImages({
        repoRoot,
        supplierId: "macma",
        supplierSku: "OVERSIZED",
        sourceUrls: ["https://macma.ro/products/oversized.svg"],
        manifest,
        fetchImage: async () =>
          new Response(oversizedSvg, {
            headers: { "content-type": "image/svg+xml" },
          }),
      })
      assert.equal(oversized.failed, 1)
      assert.equal(
        Object.keys(manifest.entries).some((key) => key.includes("OVERSIZED")),
        false,
      )
    } finally {
      console.error = originalConsoleError
    }
  })
})

test("authenticated mirrors accept generic binary media only when Sharp decodes an image", async () => {
  await withTempRepo(async (repoRoot) => {
    const manifest: ImageManifest = { entries: {} }
    const valid = await downloadProductImages({
      repoRoot,
      supplierId: "makito",
      supplierSku: "BINARY-IMAGE",
      sourceUrls: ["https://apis.makito.es/catalog/assets/binary-image"],
      manifest,
      fetchImage: async () =>
        new Response(TINY_PNG, {
          headers: { "content-type": "application/octet-stream" },
        }),
    })
    assert.equal(valid.downloaded, 1)
    assert.equal(
      (await readFile(join(repoRoot, "public/catalog/makito/BINARY-IMAGE/00.webp")))
        .byteLength > 0,
      true,
    )

    const originalConsoleError = console.error
    console.error = () => {}
    try {
      const invalid = await downloadProductImages({
        repoRoot,
        supplierId: "makito",
        supplierSku: "BINARY-NOT-IMAGE",
        sourceUrls: ["https://apis.makito.es/catalog/assets/binary-not-image"],
        manifest,
        fetchImage: async () =>
          new Response(Buffer.from("not an image"), {
            headers: { "content-type": "application/octet-stream" },
          }),
      })
      assert.equal(invalid.failed, 1)
      assert.equal(
        Object.keys(manifest.entries).some((key) => key.includes("BINARY-NOT-IMAGE")),
        false,
      )
    } finally {
      console.error = originalConsoleError
    }
  })
})

test("authenticated mirror responses are streamed through the byte limit and cancelled", async () => {
  await withTempRepo(async (repoRoot) => {
    let cancellations = 0
    const manifest: ImageManifest = { entries: {} }
    const originalConsoleError = console.error
    console.error = () => {}
    try {
      const result = await downloadProductImages({
        repoRoot,
        supplierId: "makito",
        supplierSku: "LIMITED",
        sourceUrls: ["https://apis.makito.es/catalog/assets/limited.jpg"],
        manifest,
        maximumBytes: 3,
        fetchImage: async (_sourceUrl, signal) => {
          assert.equal(signal.aborted, false)
          return new Response(
            new ReadableStream<Uint8Array>({
              pull(controller) {
                controller.enqueue(new Uint8Array([1, 2, 3, 4]))
              },
              cancel() {
                cancellations += 1
              },
            }),
            { headers: { "content-type": "image/jpeg" } },
          )
        },
      })

      assert.deepEqual(result, {
        relPaths: [],
        downloaded: 0,
        skipped: 0,
        failed: 1,
      })
      assert.equal(cancellations, 1)
      assert.deepEqual(manifest.entries, {})
    } finally {
      console.error = originalConsoleError
    }
  })
})
