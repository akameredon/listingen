-- Grant buyers access only to the exact prompt version attached to a paid purchase (remote version 20261114092000).
create policy purchased_version_access on public.product_versions for select to authenticated using (
 exists (
  select 1 from public.purchase_items pi
  join public.purchases pu on pu.id=pi.purchase_id
  where pi.version_id=product_versions.id and pu.buyer_id=(select auth.uid()) and pu.status='paid'
 )
);
