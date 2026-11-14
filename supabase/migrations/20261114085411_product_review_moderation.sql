-- Restrict publication of buyer reviews to administrators after moderation.
grant update on public.product_reviews to authenticated;
create policy product_reviews_admin_update on public.product_reviews for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role')='admin');
