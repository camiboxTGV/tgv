# Supplier onboarding

Every supplier is isolated by `supplierId` and `supplierSku`. Product slugs, variants, reports,
and downloaded image paths use that pair, so two suppliers may safely use the same SKU.

The enabled production suppliers are Macma and midocean. Their API clients, payload types,
category and decoration mappings, fixtures, and tests live in separate supplier directories;
only the shared adapter contract and sync orchestration are common.

To add a supplier:

1. Add its adapter under `suppliers/<id>/adapter.ts` using the `SupplierAdapter` contract.
   Production adapters must implement both `fetchAll()` and `fetchInventory()`, and full-sync raw
   products must include stable `supplierVariantIds` that match their variants. Preserve the
   supplier's exact decoration codes, localized labels, and print sizes in
   `supplierPersonalizations`; keep `personalizations` only for compatible TGV calculator families.
2. Add one entry to `suppliers/suppliers.ts`. Declare the exact HTTPS image hosts and path
   prefixes used by the feed; the same list configures Next.js and validates sync input.
3. Add the supplier's API credentials to `.env.local` and the catalog workflow secrets.
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
same time on Sunday. Its concurrency group prevents overlapping writers. A commit is created only
when deployable catalog JSON changes, and Firebase App Hosting then deploys that commit from its
configured live branch.

Before publishing, the workflow validates every enabled supplier's API credentials, generated
totals, unique supplier SKUs, Macma's exact personalization payload, and the F38 S2/DC/DT/DW
regression canary. It then runs the test suite and a production build. Automated commits are restricted to
`lib/content/generated/**`; if the build changes any other tracked source, or the target branch
advances while the sync is running, the job fails instead of publishing data produced from stale
code. Each run writes a GitHub step summary and retains its sync log and reports for 14 days.

After deploying supplier-adapter or personalization-mapping changes, manually run `full` once from
`main` with the deletion-guard bypass disabled. Daily inventory mode deliberately does not rewrite
product metadata, photos, or personalization methods.

Scheduled GitHub workflows run only from the repository default branch. Keep the workflow on
`main`, configure App Hosting's live branch as `main` with automatic rollouts enabled, and ensure
App Hosting rollout path filters do not ignore `lib/content/generated/**`.

The fixture adapter is intentionally disabled. It exists only for local pipeline work and must not
be enabled in a real catalog.
