# Supplier onboarding

Every supplier is isolated by `supplierId` and `supplierSku`. Product slugs, variants, reports,
and downloaded image paths use that pair, so two suppliers may safely use the same SKU.

The enabled production suppliers are Macma, midocean, XD Connects, Cifra, and Blue Collection.
Their API clients, payload types, category and decoration mappings, fixtures, and tests live in
separate supplier directories; only the shared adapter contract and sync orchestration are common.
Makito is implemented and registered, but remains disabled behind the activation gates below.

To add a supplier:

1. Add its adapter under `suppliers/<id>/adapter.ts` using the `SupplierAdapter` contract.
   Production adapters must implement both `fetchAll()` and `fetchInventory()`, and full-sync raw
   products must include stable `supplierVariantIds` that match their variants. Preserve the
   supplier's exact decoration codes, localized labels, and print sizes in
   `supplierPersonalizations`; keep `personalizations` only for compatible TGV calculator families.
2. Add one entry to `suppliers/suppliers.ts`. Declare the exact HTTPS image hosts and path
   prefixes used by the feed; the same list configures Next.js and validates sync input.
3. Add the supplier's API credentials to `.env.local` and the catalog workflow secrets. Suppliers
   with authenticated image assets also need a reviewed storage/proxy design that does not expose
   secrets or violate an account-wide request limit.
4. Test only that supplier without writing:
   `npm run sync:catalog -- --mode=full --supplier=<id> --dry-run --skip-images`.
5. Run `npm test`, then run the unfiltered
   `npm run sync:catalog -- --mode=full --skip-images` so every enabled supplier is rebuilt together.

Publishing is fail-closed: any adapter/import/data/image failure prevents catalog data from being
written. Full syncs also reject global or per-supplier drops over 50% unless the operator explicitly
uses `--force`, and stale generated product/variant files are pruned after a successful run.
Unknown supplier personalization codes remain visible with a safe fallback label and are counted in
`sync-report.json`, so a new supplier code cannot silently disappear from the website.

## Sync cadence

The catalog has two intentionally separate refresh modes:

- `npm run sync:catalog -- --mode=inventory` fetches only supplier price and stock endpoints. It
  updates existing generated product and variant records in place, never adds/removes products, and
  never changes names, categories, descriptions or photo URLs. A 90% binding-coverage guard blocks
  suspicious partial feeds. If an older catalog has no stable inventory bindings yet, the command
  performs one fail-safe full bootstrap sync.
- `npm run sync:catalog -- --mode=full --skip-images` fetches the product list, photo URLs, prices and
  stock, then rebuilds generated catalog data. `--skip-images` skips the optional local binary cache;
  supplier photo URLs are still refreshed and remain the deployed image source.

The GitHub Actions workflow runs inventory mode at 03:17 UTC Monday-Saturday and full mode at the
same time on Sunday. Its global FIFO concurrency queue prevents overlapping writers, avoids
competing for account-wide supplier quotas, and preserves every pending run. A commit is created
only when deployable catalog JSON changes, and Firebase App Hosting then deploys that commit from
its configured live branch.

Before publishing, the workflow validates every enabled supplier's API credentials, generated
totals, unique supplier SKUs, positive output for every enabled supplier, Macma's exact
personalization payload, and the F38 S2/DC/DT/DW regression canary. It then runs the test suite and
a production build. Automated commits are restricted to `lib/content/generated/**`; if the build
changes any other tracked source, or the target branch advances while the sync is running, the job
fails instead of publishing data produced from stale code. Each run writes a GitHub step summary
and retains its sync log and reports for 14 days.

Pushing supplier-adapter or personalization-mapping changes to `main` automatically selects a full
sync. Wait for its generated-data bot commit and the Firebase rollout of that commit. Manually run
`full` with the deletion-guard bypass disabled only if the push-triggered run did not complete.
Daily inventory mode deliberately does not rewrite product metadata, photos, or personalization
methods.

Scheduled GitHub workflows run only from the repository default branch. Keep the workflow on
`main`, configure App Hosting's live branch as `main` with automatic rollouts enabled, and ensure
App Hosting rollout path filters do not ignore `lib/content/generated/**`.

The fixture adapter is intentionally disabled. It exists only for local pipeline work and must not
be enabled in a real catalog.

### Cifra

Cifra uses `CIFRA_API_TOKEN`; `CIFRA_API_BASE` defaults to
`https://api.cifrashop.com` and `CIFRA_API_LANGUAGE` defaults to `en`. The typed
client under `suppliers/cifra/fetch.ts` covers the public JSON/CSV catalog,
confidential JSON/CSV tariff, novelties JSON/CSV, quantity-break prices, and
web-order creation. Catalog and inventory syncs use the confidential tariff and
price-range feeds. Order creation defaults to `commit: false`; production callers
must explicitly opt into committing an order.

### XD Connects

XD Connects uses the account-specific V5 combined feed URL in `XDCONNECTS_FEED_URL`. The URL is a
credential: keep it server-side and configure it as a GitHub Actions secret. The client validates
the official feed host, downloads no more than once per 15 minutes, and shares the cached response
between full and inventory parsing. The account-wide interval has one live-download owner: the
globally serialized GitHub Actions workflow. Production-style local runs may read a valid existing
cache but refuse a new XD download; injected feeds remain available to the automated tests. Feed
prices are account net prices; RON feeds are converted to EUR using the daily European Central Bank
reference rate. `XDCONNECTS_RON_PER_EUR` can optionally pin the number of RON per EUR for a
deterministic run.

Products are grouped by `ModelCode`, while every `ItemCode` remains a stable variant and inventory
binding. The adapter retains zero-stock and outlet variants, current stock only, product media,
exact default decoration codes, positions, and print sizes. The combined feed contains complete
details for only the default decoration option, so other codes listed by the supplier are not
invented as selectable methods.

### Makito

Makito uses `MAKITO_CLIENT_ID` and `MAKITO_CLIENT_SECRET` to obtain a bearer token. Keep local
values in `.env.local`. Do not add workflow or runtime copies until the activation review below is
complete.

The client can read Makito's whole-file catalog, stock, price, print-price and print-configuration
JSON snapshots. Inventory syncs read only the snapshots needed to update existing price and stock
bindings. Stable supplier references and material IDs are retained as strings, and exact supplier
technique identifiers remain visible even when they do not map to a TGV calculator family.

Makito's request limit is an account-wide token bucket with capacity 100 and a refill rate of 25
requests per minute. The client throttles one process and retries bounded transient failures, but
separate App Hosting instances and the GitHub runner cannot share that in-memory state.

Makito catalog assets are authenticated. The same-origin image route contains a hardened,
allowlisted authenticated fetch path, but it is not production-enabled: a cache miss would share
the supplier account bucket, and process-local limiting cannot coordinate across instances or
deployments. Mirror the assets to durable storage before activation, or add a genuinely shared
limiter and preferably quota-isolated runtime credentials.

Pricing is also activation-gated. Makito's public docs show `amount`, `baseQuantity`, and quantity
scales but do not define their arithmetic or state whether price-list `material` identifies a
product or variant. The adapter therefore refuses to publish a guessed price. Validate a live
snapshot and obtain supplier confirmation, configure an explicit resolver/binding, solve protected
asset delivery, then enable the registry entry and perform a reviewed dry run. Until then, builds
and scheduled syncs do not contact Makito.

### Blue Collection

Blue Collection uses `BLUECOLLECTION_USERNAME` and the generated
`BLUECOLLECTION_PASSWORD`; `BLUECOLLECTION_API_BASE` defaults to
`https://developers.bluecollection.eu`. Access and refresh tokens stay in memory and are renewed
from their JWT expiry timestamps. Production syncs validate both credentials before making API
requests. Full syncs combine `/api/products-index/` with the dedicated
stock feed, group colour variants into stable product families, exclude supplier catalogues and
display cases, and quarantine every unseen category tuple. The adapter keeps the supplier's exact
marking methods and sizes while mapping only compatible methods into TGV calculator families.
