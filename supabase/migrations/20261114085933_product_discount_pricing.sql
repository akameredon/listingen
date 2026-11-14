-- Add optional compare-at and scheduled discount pricing to marketplace products.
alter table public.marketplace_products add column compare_at_price_amount integer;
alter table public.marketplace_products add column discount_starts_at timestamptz;
alter table public.marketplace_products add column discount_ends_at timestamptz;
alter table public.marketplace_products add constraint marketplace_products_compare_price_check
check (compare_at_price_amount is null or compare_at_price_amount > price_amount);
alter table public.marketplace_products add constraint marketplace_products_discount_window_check
check (discount_ends_at is null or discount_starts_at is null or discount_ends_at > discount_starts_at);
