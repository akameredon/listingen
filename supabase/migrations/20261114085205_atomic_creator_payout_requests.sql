-- Atomically reserve payout requests against the creator's available ledger balance.
-- This SECURITY INVOKER RPC is executable only by service_role after the Edge Function authenticates the user.
create or replace function public.request_creator_payout(
  p_user_id uuid,p_payout_account_id uuid,p_amount integer,p_currency text
)
returns table(id uuid,status text,amount integer,currency text,requested_at timestamptz,available_balance bigint)
language plpgsql security invoker set search_path=public
as $$
declare
  v_balance bigint;
  v_reserved bigint;
  v_available bigint;
  v_account_ok boolean;
  v_request public.payout_requests%rowtype;
begin
  if p_amount is null or p_amount<=0 or p_currency is null or length(trim(p_currency))<>3 then
    raise exception 'Invalid payout amount or currency';
  end if;
  insert into public.profiles(id) values(p_user_id) on conflict(id) do nothing;
  perform 1 from public.profiles where profiles.id=p_user_id for update;
  select exists(select 1 from public.payout_accounts where id=p_payout_account_id and user_id=p_user_id and provider='paystack' and status='verified') into v_account_ok;
  if not v_account_ok then raise exception 'A verified Paystack payout account is required'; end if;
  select coalesce(sum(amount),0) into v_balance from public.ledger_entries where user_id=p_user_id and currency=upper(p_currency);
  select coalesce(sum(amount),0) into v_reserved from public.payout_requests where user_id=p_user_id and currency=upper(p_currency) and status in ('requested','approved','processing');
  v_available:=v_balance-v_reserved;
  if p_amount>v_available then raise exception 'Requested payout exceeds available balance'; end if;
  insert into public.payout_requests(user_id,payout_account_id,amount,currency,status)
  values(p_user_id,p_payout_account_id,p_amount,upper(p_currency),'requested') returning * into v_request;
  return query select v_request.id,v_request.status,v_request.amount,v_request.currency,v_request.requested_at,v_available-p_amount;
end;
$$;
revoke all on function public.request_creator_payout(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.request_creator_payout(uuid,uuid,integer,text) to service_role;
