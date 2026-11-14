-- Listingen marketplace foundation (remote version 20261114083325).
-- Safe baseline: legacy listings is created only when absent.
create table if not exists public.listings (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(),
 title text not null default '', idea text not null default '', input jsonb not null default '{}'::jsonb,
 output text not null default '', template text not null default '', status text not null default 'draft',
 score integer, score_report jsonb, batch_id text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, display_name text, avatar_url text,
 bio text, website_url text, country_code text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.creator_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade, slug text not null unique,
 headline text, about text, social_links jsonb not null default '{}'::jsonb, is_public boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.marketplace_products (
 id uuid primary key default gen_random_uuid(), creator_id uuid not null references auth.users(id),
 source_listing_id uuid references public.listings(id) on delete set null, slug text not null unique,
 title text not null, short_description text not null, description text not null default '',
 category text not null, tags text[] not null default '{}', preview_content text not null default '',
 price_amount integer not null check(price_amount >= 0), currency text not null default 'USD',
 status text not null default 'draft' check(status in ('draft','in_review','approved','published','rejected','archived','suspended')),
 current_version_id uuid, published_at timestamptz, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.product_versions (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.marketplace_products(id) on delete cascade,
 version_number integer not null check(version_number > 0), prompt_content text not null, instructions text not null default '',
 changelog text not null default '', verification_state text not null default 'documented'
 check(verification_state in ('documented','tested','reproduced')), verification_evidence jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(product_id,version_number)
);
alter table public.marketplace_products add constraint marketplace_products_current_version_fk
 foreign key(current_version_id) references public.product_versions(id) on delete set null;
create table public.review_submissions (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.marketplace_products(id) on delete cascade,
 version_id uuid not null references public.product_versions(id) on delete cascade, submitted_by uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','in_progress','approved','rejected','changes_requested','withdrawn')),
 quality_score integer check(quality_score between 0 and 100), completeness_report jsonb not null default '{}'::jsonb,
 originality_report jsonb not null default '{}'::jsonb, compliance_report jsonb not null default '{}'::jsonb,
 reproducibility_report jsonb not null default '{}'::jsonb, reviewer_id uuid references auth.users(id),
 reviewer_notes text, submitted_at timestamptz not null default now(), reviewed_at timestamptz
);
create table public.review_events (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.review_submissions(id) on delete cascade,
 actor_id uuid references auth.users(id), event_type text not null, details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.commission_rules (
 id uuid primary key default gen_random_uuid(), name text not null, currency text not null default 'USD',
 platform_fee_bps integer check(platform_fee_bps between 0 and 10000),
 creator_share_bps integer check(creator_share_bps between 0 and 10000), is_active boolean not null default false,
 effective_from timestamptz not null default now(), effective_until timestamptz, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check(platform_fee_bps is null or creator_share_bps is null or platform_fee_bps + creator_share_bps = 10000)
);
create table public.purchases (
 id uuid primary key default gen_random_uuid(), buyer_id uuid not null references auth.users(id), provider text not null,
 provider_checkout_id text unique, provider_payment_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded','partially_refunded','disputed')),
 currency text not null, subtotal_amount integer not null check(subtotal_amount >= 0),
 platform_fee_amount integer not null default 0 check(platform_fee_amount >= 0),
 total_amount integer not null check(total_amount >= 0), paid_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.purchase_items (
 id uuid primary key default gen_random_uuid(), purchase_id uuid not null references public.purchases(id) on delete cascade,
 product_id uuid not null references public.marketplace_products(id), version_id uuid not null references public.product_versions(id),
 creator_id uuid not null references auth.users(id), product_title_snapshot text not null,
 unit_amount integer not null check(unit_amount >= 0), creator_amount integer not null default 0 check(creator_amount >= 0),
 platform_amount integer not null default 0 check(platform_amount >= 0), currency text not null, created_at timestamptz not null default now()
);
create table public.ledger_entries (
 id uuid primary key default gen_random_uuid(), purchase_item_id uuid references public.purchase_items(id),
 user_id uuid not null references auth.users(id), entry_type text not null
 check(entry_type in ('sale_credit','platform_fee','refund_debit','payout_debit','adjustment')),
 amount integer not null, currency text not null, commission_rule_id uuid references public.commission_rules(id),
 description text not null default '', created_at timestamptz not null default now()
);
create table public.payout_accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), provider text not null,
 provider_account_ref text, account_label text, status text not null default 'pending'
 check(status in ('pending','verified','disabled')), metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.payout_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 payout_account_id uuid references public.payout_accounts(id), amount integer not null check(amount > 0),
 currency text not null, status text not null default 'requested'
 check(status in ('requested','approved','processing','paid','rejected','failed','cancelled')),
 provider_transfer_ref text, admin_note text, requested_at timestamptz not null default now(), processed_at timestamptz
);
create table public.product_reviews (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.marketplace_products(id) on delete cascade,
 buyer_id uuid not null references auth.users(id), purchase_item_id uuid not null unique references public.purchase_items(id),
 rating integer not null check(rating between 1 and 5), review_text text not null default '',
 status text not null default 'pending' check(status in ('pending','published','hidden')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), requester_id uuid not null references auth.users(id),
 purchase_id uuid references public.purchases(id), product_id uuid references public.marketplace_products(id),
 subject text not null, message text not null, status text not null default 'open'
 check(status in ('open','in_progress','resolved','closed')),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 assigned_to uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.referral_codes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 code text not null unique, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.campaign_attributions (
 id uuid primary key default gen_random_uuid(), referral_code_id uuid references public.referral_codes(id),
 product_id uuid references public.marketplace_products(id), purchase_id uuid references public.purchases(id),
 campaign_source text, campaign_medium text, campaign_name text, landing_path text, visitor_key text,
 created_at timestamptz not null default now()
);
create table public.app_config (
 key text primary key, value jsonb not null, is_public boolean not null default false,
 updated_by uuid references auth.users(id), updated_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null,
 entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index listings_user_created_idx on public.listings(user_id,created_at desc);
create index marketplace_products_status_created_idx on public.marketplace_products(status,created_at desc);
create index marketplace_products_creator_idx on public.marketplace_products(creator_id,updated_at desc);
create index marketplace_products_category_idx on public.marketplace_products(category,status);
create index product_versions_product_idx on public.product_versions(product_id,version_number desc);
create index review_submissions_queue_idx on public.review_submissions(status,submitted_at);
create index purchases_buyer_idx on public.purchases(buyer_id,created_at desc);
create index purchase_items_creator_idx on public.purchase_items(creator_id,created_at desc);
create index ledger_user_created_idx on public.ledger_entries(user_id,created_at desc);
create index payout_requests_user_idx on public.payout_requests(user_id,requested_at desc);
create index product_reviews_product_idx on public.product_reviews(product_id,status,created_at desc);
create index support_tickets_requester_idx on public.support_tickets(requester_id,created_at desc);
alter table public.listings enable row level security;
alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.product_versions enable row level security;
alter table public.review_submissions enable row level security;
alter table public.review_events enable row level security;
alter table public.commission_rules enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payout_requests enable row level security;
alter table public.product_reviews enable row level security;
alter table public.support_tickets enable row level security;
alter table public.referral_codes enable row level security;
alter table public.campaign_attributions enable row level security;
alter table public.app_config enable row level security;
alter table public.audit_logs enable row level security;
create policy listings_select_own on public.listings for select to authenticated using(auth.uid()=user_id);
create policy listings_insert_own on public.listings for insert to authenticated with check(auth.uid()=user_id);
create policy listings_update_own on public.listings for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy listings_delete_own on public.listings for delete to authenticated using(auth.uid()=user_id);
create policy profiles_select_self_or_admin on public.profiles for select to authenticated using(auth.uid()=id or auth.jwt()->'app_metadata'->>'role'='admin');
create policy profiles_insert_self on public.profiles for insert to authenticated with check(auth.uid()=id);
create policy profiles_update_self on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy creator_profiles_public_read on public.creator_profiles for select to anon,authenticated using(is_public or auth.uid()=user_id or auth.jwt()->'app_metadata'->>'role'='admin');
create policy creator_profiles_insert_self on public.creator_profiles for insert to authenticated with check(auth.uid()=user_id);
create policy creator_profiles_update_self on public.creator_profiles for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy products_public_read on public.marketplace_products for select to anon,authenticated using(status='published' or creator_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy products_insert_creator on public.marketplace_products for insert to authenticated with check(creator_id=auth.uid());
create policy products_update_creator on public.marketplace_products for update to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy product_versions_read on public.product_versions for select to anon,authenticated using(exists(select 1 from public.marketplace_products p where p.id=product_id and (p.status='published' or p.creator_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin')));
create policy product_versions_insert_creator on public.product_versions for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.marketplace_products p where p.id=product_id and p.creator_id=auth.uid()));
create policy submissions_read_owner_or_admin on public.review_submissions for select to authenticated using(submitted_by=auth.uid() or auth.jwt()->'app_metadata'->>'role' in ('admin','reviewer'));
create policy submissions_insert_owner on public.review_submissions for insert to authenticated with check(submitted_by=auth.uid() and exists(select 1 from public.marketplace_products p where p.id=product_id and p.creator_id=auth.uid()));
create policy submissions_update_admin on public.review_submissions for update to authenticated using(auth.jwt()->'app_metadata'->>'role' in ('admin','reviewer')) with check(auth.jwt()->'app_metadata'->>'role' in ('admin','reviewer'));
create policy review_events_admin_read on public.review_events for select to authenticated using(auth.jwt()->'app_metadata'->>'role' in ('admin','reviewer'));
create policy review_events_admin_insert on public.review_events for insert to authenticated with check(auth.jwt()->'app_metadata'->>'role' in ('admin','reviewer'));
create policy commission_rules_admin_all on public.commission_rules for all to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin') with check(auth.jwt()->'app_metadata'->>'role'='admin');
create policy purchases_buyer_read on public.purchases for select to authenticated using(buyer_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy purchase_items_buyer_or_creator_read on public.purchase_items for select to authenticated using(exists(select 1 from public.purchases p where p.id=purchase_id and p.buyer_id=auth.uid()) or creator_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy ledger_owner_read on public.ledger_entries for select to authenticated using(user_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy payout_accounts_owner_read on public.payout_accounts for select to authenticated using(user_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy payout_accounts_owner_insert on public.payout_accounts for insert to authenticated with check(user_id=auth.uid());
create policy payout_accounts_owner_update on public.payout_accounts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy payout_requests_owner_read on public.payout_requests for select to authenticated using(user_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy payout_requests_owner_insert on public.payout_requests for insert to authenticated with check(user_id=auth.uid());
create policy product_reviews_public_read on public.product_reviews for select to anon,authenticated using(status='published' or buyer_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy product_reviews_buyer_insert on public.product_reviews for insert to authenticated with check(buyer_id=auth.uid() and exists(select 1 from public.purchase_items pi join public.purchases pu on pu.id=pi.purchase_id where pi.id=purchase_item_id and pi.product_id=product_id and pu.buyer_id=auth.uid() and pu.status='paid'));
create policy support_tickets_requester_read on public.support_tickets for select to authenticated using(requester_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy support_tickets_requester_insert on public.support_tickets for insert to authenticated with check(requester_id=auth.uid());
create policy support_tickets_admin_update on public.support_tickets for update to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin') with check(auth.jwt()->'app_metadata'->>'role'='admin');
create policy referral_codes_owner_read on public.referral_codes for select to authenticated using(owner_id=auth.uid() or auth.jwt()->'app_metadata'->>'role'='admin');
create policy referral_codes_owner_insert on public.referral_codes for insert to authenticated with check(owner_id=auth.uid());
create policy campaign_attributions_admin_read on public.campaign_attributions for select to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin');
create policy app_config_public_read on public.app_config for select to anon,authenticated using(is_public or auth.jwt()->'app_metadata'->>'role'='admin');
create policy app_config_admin_all on public.app_config for all to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin') with check(auth.jwt()->'app_metadata'->>'role'='admin');
create policy audit_logs_admin_read on public.audit_logs for select to authenticated using(auth.jwt()->'app_metadata'->>'role'='admin');
grant usage on schema public to anon,authenticated;
grant select,insert,update,delete on public.listings to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update on public.creator_profiles to anon,authenticated;
grant select,insert,update on public.marketplace_products to anon,authenticated;
grant select,insert on public.product_versions to anon,authenticated;
grant select,insert,update on public.review_submissions to authenticated;
grant select,insert on public.review_events to authenticated;
grant select,insert,update,delete on public.commission_rules to authenticated;
grant select on public.purchases to authenticated;
grant select on public.purchase_items to authenticated;
grant select on public.ledger_entries to authenticated;
grant select,insert,update on public.payout_accounts to authenticated;
grant select,insert on public.payout_requests to authenticated;
grant select,insert on public.product_reviews to anon,authenticated;
grant select,insert,update on public.support_tickets to authenticated;
grant select,insert on public.referral_codes to authenticated;
grant select on public.campaign_attributions to authenticated;
grant select,insert,update,delete on public.app_config to authenticated;
grant select on public.audit_logs to authenticated;
grant all on all tables in schema public to service_role;
