-- Link payout ledger debits to payout requests for idempotent settlement (remote version 20261114091500).
alter table public.ledger_entries add column payout_request_id uuid references public.payout_requests(id);
create unique index ledger_one_payout_debit on public.ledger_entries(payout_request_id) where entry_type='payout_debit';
create index ledger_payout_request_idx on public.ledger_entries(payout_request_id);
