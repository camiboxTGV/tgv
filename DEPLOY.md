# Deploy notes

This repo ships to **Firebase App Hosting**. Pushing to `main` triggers an automatic build + deploy.

## First-deploy checklist

**Before pushing the first commit with the supplier pipeline:**

1. **Verify the GitHub secret** for Macma credentials.
   - Repo → Settings → Secrets and variables → Actions
   - Secret name: `MACMA_API_BASE`
   - Value: `https://macma.ro/api/v2/<token>/en` (no trailing slash)
   - Used only by the daily `Catalog sync` workflow; Firebase never sees it.

2. **Confirm the Firebase backend** is linked to `main` on this repo.
   - Firebase console → App Hosting → your backend → Settings → Repository
   - Branch: `main`
   - Auto-deploy: enabled

3. **Run `npm run build` locally before pushing.** If the build fails locally, it will fail on Firebase too.

4. **Push.** Firebase detects the commit and runs `npm install && npm run build` on their infrastructure.

## What auto-deploys on push

- Every push to `main` → Firebase App Hosting build → deploy.
- The build reads `lib/content/generated/**` straight from the repo. No Macma API access needed during deploy.

## What the daily GitHub Action does

- Runs at 03:00 UTC.
- Fetches fresh data from Macma, re-runs the full sync pipeline, commits changes to `main` if anything moved.
- That commit triggers a Firebase deploy automatically — no human in the loop.
- Manual trigger: Actions tab → "Catalog sync" → "Run workflow".

## Image handling in production

- Product images use the same-origin `/api/catalog-image/...` route. The route fetches an allowlisted supplier image server-side, converts it to WebP, and returns a versioned one-year immutable cache response for Firebase's CDN.
- Catalog pages, search results, product galleries, metadata, and recommendations all receive the proxy URL from the shared catalog loader. Supplier URLs are never sent to the browser.
- The first uncached request for an image still requires the supplier to be available; subsequent requests are served from Firebase's CDN. If the bytes at an existing supplier URL change, increment `CATALOG_IMAGE_CACHE_VERSION` in `lib/content/catalog-images.ts` to produce a fresh cache key.
- Category artwork is committed under `public/images/categories/` with lowercase URL-safe names, so it does not depend on supplier hosting or special-character path handling.

## Rollback

- Firebase App Hosting keeps the previous deploy as the active release until the new one goes green.
- If a deploy fails, the live site stays on the previous successful build.
- To roll back manually: Firebase console → App Hosting → your backend → Releases → pick a previous release → "Roll back".

## Things that would break the deploy

- **A product category JSON file referencing a supplier slug that doesn't exist** (removed mid-sync) → 404s on detail pages but build stays green. The 50% deletion guard in the orchestrator prevents this catastrophically.
- **A new category added to `lib/content/categories.ts` without corresponding generated products** → the category renders "No products in this category yet", which is fine.
- **TypeScript errors** → build fails. Always `npm run build` locally before pushing.
- **A supplier image domain missing from the strict supplier allowlist** → the proxy returns 403. Add the supplier through `suppliers/_shared/suppliers.ts`; its generated allowlist is shared by catalog sync and image delivery.

## Secrets summary

| Secret | Lives in | Used by |
|---|---|---|
| `MACMA_API_BASE` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| (none currently) | Firebase App Hosting | — |

## Current production footprint

- ~2,210 static pages
- 1,934 products (1,929 Macma + 5 fixtures)
- 926 product-detail variant files
- ~12 MB of committed generated JSON
- Build time: ~8 s on a fast runner
- Deploy time: ~2–3 min end-to-end (Firebase clone + install + build + warmup)
