-- Track full Paystack refunds as pending until the signed provider webhook confirms settlement.
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
check (status in ('pending','paid','failed','refund_pending','refunded','partially_refunded','disputed'));
