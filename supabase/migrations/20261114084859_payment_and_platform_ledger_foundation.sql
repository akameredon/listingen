-- Payment and platform revenue ledger foundation (remote version 20261114091000).
create table public.platform_revenue_entries (
 id uuid primary key default gen_random_uuid(),
 purchase_item_id uuid references public.purchase_items(id),
 entry_type text not null check(entry_type in ('platform_fee','refund_reversal','adjustment')),
 amount integer not null, currency text not null,
 commission_rule_id uuid references public.commission_rules(id),
 description text not null default '', created_at timestamptz not null default now()
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), provider text not null,
 provider_event_id text not null unique, event_type text not null,
 payload_hash text, processed_at timestamptz not null default now()
);
alter table public.platform_revenue_entries enable row level security;
alter table public.payment_events enable row level security;
create policy platform_revenue_admin_read on public.platform_revenue_entries for select to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin');
create policy payout_accounts_admin_update on public.payout_accounts for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin');
create policy payout_requests_admin_update on public.payout_requests for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin');
grant select,update on public.payout_accounts to authenticated;
grant select,update on public.payout_requests to authenticated;
grant select on public.platform_revenue_entries to authenticated;
grant all on public.platform_revenue_entries to service_role;
grant all on public.payment_events to service_role;
create unique index ledger_one_sale_credit on public.ledger_entries(purchase_item_id) where entry_type='sale_credit';
create unique index ledger_one_refund_debit on public.ledger_entries(purchase_item_id) where entry_type='refund_debit';
create unique index platform_revenue_one_fee on public.platform_revenue_entries(purchase_item_id) where entry_type='platform_fee';
create unique index platform_revenue_one_refund on public.platform_revenue_entries(purchase_item_id) where entry_type='refund_reversal';
create index platform_revenue_created_idx on public.platform_revenue_entries(created_at desc);
create index payment_events_provider_idx on public.payment_events(provider,event_type,processed_at desc);
