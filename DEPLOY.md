# Deploy notes

This repo ships to **Firebase App Hosting**. Pushing to `main` triggers an automatic build + deploy.

## First-deploy checklist

**Before pushing the first commit with the supplier pipeline:**

1. **Verify the GitHub secrets** for supplier credentials.
   - Repo → Settings → Secrets and variables → Actions
   - `MACMA_API_BASE`: `https://macma.ro/api/v2/<token>/en` (no trailing slash)
   - `MIDOCEAN_API_KEY`: the midocean gateway API key
   - `XDCONNECTS_FEED_URL`: the account-specific XD Connects V5 combined-feed URL
   - `CIFRA_API_TOKEN`: the Cifra confidential catalog token
   - `BLUECOLLECTION_USERNAME`: the Blue Collection developer login
   - `BLUECOLLECTION_PASSWORD`: the generated Blue Collection API password
   - Supplier credentials are used only by the `Catalog data sync` workflow. GitHub
     does not pass them to the test or build steps.
   - `CIFRA_ORDER_API_KEY` is a separate optional credential for direct order reads and is not used by catalog sync.
   - Optional Actions variable `XDCONNECTS_RON_PER_EUR` pins the RON-per-EUR conversion rate;
     otherwise the workflow reads the daily European Central Bank reference rate.

2. **Confirm the Firebase backend** is linked to `main` on this repo.
   - Firebase console → App Hosting → your backend → Settings → Repository
   - Branch: `main`
   - Auto-deploy: enabled

3. **Run `npm run build` locally before pushing.** If the build fails locally, it will fail on Firebase too.

4. **Push the supplier implementation.** The path-filtered `Catalog data sync` workflow starts a
   full sync on `main`. Firebase may first deploy the source commit with the preceding generated
   snapshot; that is expected.

5. **Wait for the generated-data commit.** Confirm the workflow summary and
   `lib/content/generated/sync-report.json` show positive fetched and normalized counts for
   every enabled supplier, with no unexpected drops or unreviewed personalization codes. The
   workflow then commits the generated catalog to `main`.

6. **Confirm the following Firebase rollout is green.** This rollout is built from the bot commit
   and contains the refreshed generated products.

## What auto-deploys on push

- Every push to `main` → Firebase App Hosting build → deploy.
- The build reads `lib/content/generated/**` straight from the repo. No supplier API access is needed during build or deploy.

## What the daily GitHub Action does

- Runs at 03:17 UTC: inventory-only Monday-Saturday and a full catalog refresh on Sunday.
- Fetches fresh data from every enabled supplier, commits generated changes to `main` if anything moved.
- That commit triggers a Firebase deploy automatically — no human in the loop.
- Manual trigger: Actions tab → "Catalog data sync" → "Run workflow".

## Image handling in production

- Product images use the same-origin `/api/catalog-image/...` route. The route fetches an allowlisted supplier image server-side, converts it to WebP, and returns a versioned one-year immutable cache response for Firebase's CDN.
- Catalog pages, search results, product galleries, metadata, and recommendations all receive the proxy URL from the shared catalog loader. Supplier URLs are never sent to the browser.
- The first uncached request for an image still requires the supplier to be available; subsequent requests are served from Firebase's CDN. If the bytes at an existing supplier URL change, increment `CATALOG_IMAGE_CACHE_VERSION` in `lib/content/catalog-images.ts` to produce a fresh cache key.
- Makito remains production-disabled. Its images require bearer authentication and every cache miss
  would consume an account-wide token. Do not activate the direct runtime proxy with the sync
  credential: independent App Hosting instances and the GitHub runner cannot share the client's
  in-memory limiter. Mirror the protected assets into durable public storage, or add genuinely
  shared quota coordination plus quota-isolated runtime credentials, before activation.
- Category artwork is committed under `public/images/categories/` with lowercase URL-safe names, so it does not depend on supplier hosting or special-character path handling.

## Rollback

- Firebase App Hosting keeps the previous deploy as the active release until the new one goes green.
- If a deploy fails, the live site stays on the previous successful build.
- To roll back manually: Firebase console → App Hosting → your backend → Releases → pick a previous release → "Roll back".

## Things that would break the deploy

- **A product category JSON file referencing a supplier slug that doesn't exist** (removed mid-sync) → 404s on detail pages but build stays green. The 50% deletion guard in the orchestrator prevents this catastrophically.
- **A new category added to `lib/content/categories.ts` without corresponding generated products** → the category renders "No products in this category yet", which is fine.
- **TypeScript errors** → build fails. Always `npm run build` locally before pushing.
- **A supplier image domain missing from the strict supplier allowlist** → the proxy returns 403. Add the supplier through `suppliers/suppliers.ts`; its generated allowlist is shared by catalog sync and image delivery.

## Secrets summary

| Secret | Lives in | Used by |
|---|---|---|
| `MACMA_API_BASE` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `MIDOCEAN_API_KEY` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `XDCONNECTS_FEED_URL` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `XDCONNECTS_RON_PER_EUR` (optional) | GitHub repo Actions variables | `.github/workflows/sync-catalog.yml` |
| `CIFRA_API_TOKEN` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `BLUECOLLECTION_USERNAME` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `BLUECOLLECTION_PASSWORD` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| (none currently) | Firebase App Hosting | — |

The workflow summary and generated sync report are the source of truth for current per-supplier
product totals and catalog size.

## Makito activation gate

Makito is implemented but deliberately disabled in `suppliers/suppliers.ts`. Before changing that
flag, all of the following must be true:

1. Validate a live account snapshot and confirm in writing how `amount`, `baseQuantity`, and scale
   quantities produce a unit price, and whether price-list `material` keys product references or
   variant material IDs. The public API reference does not define those semantics.
2. Choose a protected-image design that enforces the supplier's account-wide bucket (capacity 100,
   refill 25 requests/minute) across every process. A durable mirror is preferred; a direct proxy
   requires shared quota state and preferably separate runtime credentials.
3. Add `MAKITO_CLIENT_ID` and `MAKITO_CLIENT_SECRET` as GitHub sync secrets. If a reviewed direct
   proxy is chosen, map separately managed runtime secrets through Firebase App Hosting according
   to [Firebase's environment configuration](https://firebase.google.com/docs/app-hosting/configure#environment-variables).
4. Enable the registry entry, run a Makito-only dry run, review category and decoration coverage,
   then run an unfiltered full sync and verify the generated-data rollout.
