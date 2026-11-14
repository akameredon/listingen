-- Preserve the exact commission rule used by each purchase item (remote version 20261114091800).
alter table public.purchase_items add column commission_rule_id uuid references public.commission_rules(id);
create index purchase_items_commission_rule_idx on public.purchase_items(commission_rule_id);
