# Offline POS Operations Runbook

## Release Gates

Before a release candidate can be promoted:

1. Run `npm run verify`.
2. Run `npm run test:coverage -- --runInBand`.
3. Run Supabase local database tests when migrations/RLS tests are available.
4. Run Edge Function tests for `commit_sale`, `create_refund`, and inventory adjustment functions.
5. Run the Maestro offline checkout scenario against a dev client:
   - `APP_ID=<app id> npm run test:e2e:offline-checkout`
6. Smoke test on a physical Android device.
7. Smoke test on a target iOS device before iOS release.
8. Verify migration from the previous production build preserves pending local sales.

## Environment Rules

- Development, staging, and production must use separate Supabase and PowerSync projects.
- Production builds must not display staging/development labels.
- Non-production builds should show a visible environment label in settings or diagnostics.
- Environment variables must not be captured in diagnostics exports or observability context.

## Pending Sales Not Syncing

Operator symptoms:

- Sync badge shows pending uploads.
- Sale appears in receipt/history locally but not in backend reports.

Support steps:

1. Open sync diagnostics.
2. Record device ID, app version, business, branch, pending upload count, failed upload count, and last error code.
3. Confirm the user is signed in.
4. Ask the user to keep the app open and online for at least two minutes.
5. If `auth_expired`, ask the user to sign in again.
6. If `validation_failed`, `permission_denied`, or `conflict_requires_review`, escalate with the sale reference and diagnostics export.
7. Do not clear app data while pending or failed uploads exist.

## Auth Expired With Pending Sales

Expected behavior:

- Local sales remain visible.
- Upload pauses until re-authentication.
- Existing idempotency keys are reused after sign-in.

Support steps:

1. Re-authenticate the same user or an authorized manager/owner.
2. Trigger manual sync.
3. Confirm pending upload count decreases.
4. If upload remains paused, collect diagnostics and escalate.

## Duplicate Sale Suspected

Verification steps:

1. Search by `idempotency_key` in backend sales.
2. Search by local sale ID and reference number.
3. If duplicate backend rows share the same business and idempotency key, block release and investigate Edge Function idempotency handling.
4. If duplicate local taps are suspected, verify checkout logs show only one committed local sale.

## Inventory Mismatch

Support steps:

1. Export inventory diagnostics for the product and branch.
2. Compare `inventory_items.stock_quantity` with summed `inventory_logs.quantity_changed`.
3. Check for `needs_review` sales or refunds.
4. If mismatch follows offline multi-device sales, create a manager review task and avoid manual stock overwrite without an adjustment reason.

## Refund Failed

Support steps:

1. Confirm user role has refund permission.
2. Confirm original sale status is `completed`.
3. Confirm the sale is not already refunded.
4. Collect refund error, sale reference, business, branch, and device ID.
5. If payment provider is involved, verify provider settlement before retrying refund.

## Device Lost With Unsynced Transactions

Response:

1. Disable the user's session in Supabase.
2. Identify the device ID and last sync timestamp.
3. Review pending upload metrics for that device if available.
4. Use local diagnostics export only if the physical device can be recovered.
5. Do not recreate sales manually unless approved by finance/operations after receipt verification.

## Supabase or PowerSync Outage

Expected operator messaging:

- Offline sales are saved on this device.
- Pending sales will sync when service is restored.

Support steps:

1. Confirm outage status.
2. Tell operators to keep devices charged and avoid clearing app storage.
3. Pause non-critical product/inventory edits if possible.
4. After recovery, monitor failed upload count, duplicate idempotency attempts, and sync latency.

## Production Monitoring

Track during rollout:

- Crash-free sessions.
- Pending upload count by business/branch.
- Failed upload count by error code.
- `auth_expired` upload pauses.
- Duplicate idempotency attempts.
- Sync latency from local `created_at` to `server_confirmed_at`.
- Checkout local transaction duration.
