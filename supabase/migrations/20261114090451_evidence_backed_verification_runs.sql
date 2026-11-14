-- Evidence-backed verification: manual passes can mark a version tested; only an isolated runner can mark it reproduced.
create table public.verification_runs (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.marketplace_products(id) on delete cascade,
 version_id uuid not null references public.product_versions(id) on delete cascade,
 runner_type text not null check(runner_type in ('manual','external_service','isolated_runner')),
 status text not null check(status in ('passed','failed','blocked')),
 test_input jsonb not null default '{}'::jsonb,
 expected_result text not null default '',
 actual_result text not null default '',
 evidence_url text, logs text,
 started_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.verification_runs enable row level security;
create policy verification_runs_read on public.verification_runs for select to authenticated using (
 ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','reviewer')
 or exists(select 1 from public.marketplace_products p where p.id=product_id and p.creator_id=(select auth.uid()))
);
create policy verification_runs_reviewer_insert on public.verification_runs for insert to authenticated with check (
 ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','reviewer') and started_by=(select auth.uid())
);
create policy verification_runs_reviewer_update on public.verification_runs for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','reviewer'))
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin','reviewer'));
grant select,insert,update on public.verification_runs to authenticated;
create index verification_runs_version_created_idx on public.verification_runs(version_id,created_at desc);
create index verification_runs_product_status_idx on public.verification_runs(product_id,status,created_at desc);

create or replace function public.enforce_product_verification_state()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.verification_state='tested' and not exists (
  select 1 from public.verification_runs vr where vr.version_id=new.id and vr.status='passed'
 ) then raise exception 'A passed verification run is required before marking a version tested'; end if;
 if new.verification_state='reproduced' and not exists (
  select 1 from public.verification_runs vr where vr.version_id=new.id and vr.status='passed' and vr.runner_type='isolated_runner'
 ) then raise exception 'An isolated runner pass is required before marking a version reproduced'; end if;
 return new;
end;
$$;
create trigger product_version_verification_guard
before update of verification_state on public.product_versions
for each row execute function public.enforce_product_verification_state();
