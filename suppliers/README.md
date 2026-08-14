# Supplier onboarding

Every supplier is isolated by `supplierId` and `supplierSku`. Product slugs, variants, reports,
and downloaded image paths use that pair, so two suppliers may safely use the same SKU.

To add a supplier:

1. Add its adapter under `suppliers/<id>/adapter.ts` using the `SupplierAdapter` contract.
2. Add one entry to `suppliers/suppliers.ts`. Declare the exact HTTPS image hosts and path
   prefixes used by the feed; the same list configures Next.js and validates sync input.
3. Add the supplier's API credentials to `.env.local` and the catalog workflow secrets.
4. Test only that supplier without writing: `npm run sync:catalog -- --supplier=<id> --dry-run --skip-images`.
5. Run `npm test`, then run the unfiltered `npm run sync:catalog -- --skip-images` so every enabled
   supplier is rebuilt together.

Publishing is fail-closed: any adapter/import/data/image failure prevents catalog data from being
written. Full syncs also reject global or per-supplier drops over 50% unless the operator explicitly
uses `--force`, and stale generated product/variant files are pruned after a successful run.

The fixture adapter is intentionally disabled. It exists only for local pipeline work and must not
be enabled in a real catalog.
