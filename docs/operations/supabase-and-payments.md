# Listingen operations: Supabase and payments

## Supabase project

- Project: `listingen`
- Organization: Sleekblue
- Project ref: `ggghagsrtgrpteclltrh`
- Region: `us-east-1`
- API URL: `https://ggghagsrtgrpteclltrh.supabase.co`

The Vercel project has these non-secret Supabase values configured for Production, Preview and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase secret/service-role key in a `VITE_*` variable or browser bundle.

## Edge Functions

- `marketplace-finance`: JWT required. Handles free claims, Paystack checkout initialization, atomic creator payout requests, recipient verification and admin payout initiation.
- `paystack-webhook`: JWT disabled because Paystack does not send a Supabase user JWT. It authenticates every event using Paystack's HMAC SHA-512 signature.

The functions use Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` environment variable. It is never sent to the browser.

## Paystack configuration still required

Set these secrets in Supabase Edge Function secrets before enabling real-money checkout or transfers:

- `PAYSTACK_SECRET_KEY`: the platform's Paystack secret key.
- `LISTINGEN_SITE_URL`: the canonical public application origin, e.g. the final production domain.

Configure the Paystack webhook URL as:

`https://ggghagsrtgrpteclltrh.supabase.co/functions/v1/paystack-webhook`

The webhook validates the signature, verifies amount and currency against the pending purchase, and only then marks an order paid and writes creator/platform ledger entries. A browser redirect never marks an order paid.

Partial refunds are not automated in this release; full refunds are reversed through the signed webhook. Reconcile partial refunds manually until a dedicated allocation workflow is implemented.

## Administrator provisioning

Administrative privileges are read from Supabase Auth `app_metadata.role`, never from editable `user_metadata` or a public profile field.

After the first trusted administrator account exists, set its role to `admin` through the Supabase Auth Admin API or dashboard. Reviewer accounts may use `app_metadata.role = reviewer`. Do not expose service-role credentials to the browser.

## Database migrations

The `supabase/migrations` filenames are aligned with the remote migration history. Use the Supabase CLI with the explicit remote flag when applying migrations. Review the diff before applying. Do not use destructive reset commands against the remote project.

All exposed public tables have RLS enabled and explicit API grants. Financial writes are performed by Edge Functions using server-side credentials.

## Legacy Lovable data

The Listingen project previously referenced a different backend. The new Sleekblue project is separate and currently contains the new marketplace schema, not a copy of records held in the previous Lovable-managed database. Do not delete or overwrite the old backend. Export and reconcile its `listings` records before treating the new database as a complete production migration.

## Current release constraints

- The Vercel project has a protected preview deployment; Deployment Protection has not been disabled.
- A production custom domain has not been attached.
- Paystack secrets and the canonical production URL have not been configured.
- The first administrator role has not yet been provisioned.
- Credentials ever committed in the public repository's historical `.env` file must be rotated. Removing the file from the current branch does not erase its Git history.
