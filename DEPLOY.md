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

- Images are **hotlinked** from `macma.ro` via `next/image` (whitelisted in `next.config.ts`).
- Firebase's image optimizer caches transformed versions on first request.
- If Macma rate-limits or renames URLs, images break. Upgrade path: run `npm run sync:catalog` (without `--skip-images`) to download them locally, but that path needs `sharp` installed and a place to host ~2 GB of WebP.

## Rollback

- Firebase App Hosting keeps the previous deploy as the active release until the new one goes green.
- If a deploy fails, the live site stays on the previous successful build.
- To roll back manually: Firebase console → App Hosting → your backend → Releases → pick a previous release → "Roll back".

## Things that would break the deploy

- **A product category JSON file referencing a supplier slug that doesn't exist** (removed mid-sync) → 404s on detail pages but build stays green. The 50% deletion guard in the orchestrator prevents this catastrophically.
- **A new category added to `lib/content/categories.ts` without corresponding generated products** → the category renders "No products in this category yet", which is fine.
- **TypeScript errors** → build fails. Always `npm run build` locally before pushing.
- **`next/image` trying to optimize a URL from an un-whitelisted domain** → 400 errors on the image. If we add a second supplier with its own CDN, add it to `next.config.ts` `remotePatterns`.

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
