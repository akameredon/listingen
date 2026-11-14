-- Admin review controls and financial guardrails (remote version 20261114090000).
grant update on public.product_versions to authenticated;
create policy product_versions_admin_update on public.product_versions for update to authenticated
using ((select auth.jwt()) -> 'app_metadata' ->> 'role' in ('admin','reviewer'))
with check ((select auth.jwt()) -> 'app_metadata' ->> 'role' in ('admin','reviewer'));
revoke insert on public.payout_requests from authenticated;
drop policy payout_requests_owner_insert on public.payout_requests;
create unique index if not exists commission_rules_one_active_currency
on public.commission_rules(currency) where is_active = true and effective_until is null;
