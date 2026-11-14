-- Consolidate product version SELECT authorization and explicitly scope payment event access.
drop policy purchased_version_access on public.product_versions;
drop policy product_versions_read on public.product_versions;
create policy product_versions_read on public.product_versions for select to authenticated using (
  exists (
    select 1 from public.marketplace_products p
    where p.id = product_id
      and (p.status = 'published' or p.creator_id = (select auth.uid()) or ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  )
  or exists (
    select 1 from public.purchase_items pi
    join public.purchases pu on pu.id = pi.purchase_id
    where pi.version_id = product_versions.id and pu.buyer_id = (select auth.uid()) and pu.status = 'paid'
  )
);
create policy payment_events_service_role_only on public.payment_events for all to service_role using (true) with check (true);
create index if not exists platform_revenue_commission_rule_idx on public.platform_revenue_entries(commission_rule_id);
