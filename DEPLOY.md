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
   - `MAKITO_CLIENT_ID`: the Makito B2B client id
   - `MAKITO_CLIENT_SECRET`: the Makito B2B client secret
   - Supplier credentials are used only by the `Catalog data sync` workflow. GitHub
     does not pass them to the test or build steps.
   - `CIFRA_ORDER_API_KEY` is a separate optional credential for direct order reads and is not used by catalog sync.
   - Optional Actions variable `XDCONNECTS_RON_PER_EUR` pins the RON-per-EUR conversion rate;
     otherwise the workflow reads the daily European Central Bank reference rate.

2. **Rotate and provision the contact mailbox password.**
   - Rotate the mailbox credential before deployment; an earlier application fallback exposed the
     previous value in repository history.
   - From an authenticated Firebase CLI, run `firebase apphosting:secrets:set smtpPassword` and
     enter the rotated password when prompted. Accept the prompt to grant the App Hosting backend
     access, or grant access explicitly if the secret already exists.
   - The committed `apphosting.yaml` exposes this secret only at runtime as `SMTP_PASSWORD`.
     Local development must provide `SMTP_PASSWORD` in `.env.local`; the application deliberately
     refuses to send mail when it is missing or blank.
   - In Firebase App Hosting settings, remove any stale plain `SMTP_PASSWORD` environment-variable
     override. Console-managed variables take precedence over `apphosting.yaml` and could otherwise
     keep the rotated credential from taking effect.
   - After any future rotation, create a new `smtpPassword` version and trigger a new rollout so
     the live backend is pinned to the new version.

3. **Confirm the Firebase backend** is linked to `main` on this repo.
   - Firebase console → App Hosting → your backend → Settings → Repository
   - Branch: `main`
   - Auto-deploy: enabled

4. **Run `npm run build` locally before pushing.** If the build fails locally, it will fail on Firebase too.

5. **Push the supplier implementation.** The path-filtered `Catalog data sync` workflow starts a
   full sync on `main`. Firebase may first deploy the source commit with the preceding generated
   snapshot; that is expected.

6. **Wait for the generated-data commit.** Confirm the workflow summary and
   `lib/content/generated/sync-report.json` show positive fetched and normalized counts for
   every enabled supplier, with no unexpected drops or unreviewed personalization codes. The
   workflow then commits the generated catalog to `main`.

7. **Confirm the following Firebase rollout is green.** This rollout is built from the bot commit
   and contains the refreshed generated products.

## What auto-deploys on push

- Every push to `main` → Firebase App Hosting build → deploy.
- The build reads `lib/content/generated/**` straight from the repo. No supplier API access is needed during build or deploy.
- `.github/workflows/ci.yml` runs tests, type-checking, and a production build for pull requests
  and `main` pushes. Require its `Site CI / verify` check in branch protection so failures cannot
  reach the auto-deploy branch.

## What the daily GitHub Action does

- Runs at 03:17 UTC: inventory-only Monday-Saturday and a full catalog refresh on Sunday.
- Fetches fresh data from every enabled supplier, commits generated changes to `main` if anything moved.
- That commit triggers a Firebase deploy automatically — no human in the loop.
- Manual trigger: Actions tab → "Catalog data sync" → "Run workflow".

## Image handling in production

- Product images use the same-origin `/api/catalog-image/...` route. The route fetches an allowlisted supplier image server-side, converts it to WebP, and returns a versioned one-year immutable cache response for Firebase's CDN.
- Catalog pages, search results, product galleries, metadata, and recommendations all receive the proxy URL from the shared catalog loader. Supplier URLs are never sent to the browser.
- The first uncached request for an image still requires the supplier to be available; subsequent requests are served from Firebase's CDN. If the bytes at an existing supplier URL change, increment `CATALOG_IMAGE_CACHE_VERSION` in `lib/content/catalog-images.ts` to produce a fresh cache key.
- Makito is the exception to the runtime proxy path. Its protected images are fetched once by the
  globally serialized catalog workflow, converted to WebP, and committed under
  `public/catalog/makito/`. The generated catalog references those same-origin static files, so
  App Hosting never needs Makito credentials and browser traffic cannot consume the supplier's
  account-wide request bucket. The initial mirror can take roughly three hours at the documented
  25 requests/minute refill rate; later full syncs reuse unchanged mirrored files.
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
| `MAKITO_CLIENT_ID` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `MAKITO_CLIENT_SECRET` | GitHub repo secrets | `.github/workflows/sync-catalog.yml` |
| `smtpPassword` (`SMTP_PASSWORD`) | Google Cloud Secret Manager via Firebase App Hosting | `apphosting.yaml`, contact notification runtime |

The workflow summary and generated sync report are the source of truth for current per-supplier
product totals and catalog size.

## Makito release contract

The live-account probe verifies the production builder before activation. The account feed uses
product-reference price keys, EUR `amount / baseQuantity` unit prices, and 11-digit inventory
materials encoded in validated variant asset paths. Products without a matching price are skipped;
partial or contradictory bindings fail closed. Protected images are mirrored only by the catalog
workflow, and the normal global workflow queue prevents catalog runs from competing for Makito's
account-wide bucket.
