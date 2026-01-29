-- Wallet rental payment recording RPC
-- Ensures consistency and reuse between app/web and worker

create or replace function public.wallet_record_rental_payment(
  p_owner_id uuid,
  p_booking_id uuid,
  p_amount_cents integer,
  p_ref text,
  p_meta jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_exists boolean;
begin
  -- Basic validation
  if p_owner_id is null then
    raise exception 'owner_id is required';
  end if;

  if p_booking_id is null then
    raise exception 'booking_id is required';
  end if;

  if coalesce(p_amount_cents, 0) <= 0 then
    raise exception 'amount_cents must be > 0';
  end if;

  -- Ensure owner exists
  select exists(select 1 from users u where u.id = p_owner_id) into v_owner_exists;
  if not v_owner_exists then
    raise exception 'owner not found';
  end if;

  -- Insert ledger entry
  insert into wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) values (
    p_owner_id,
    'rental_payment',
    p_amount_cents,
    coalesce(p_ref, concat('rental-payment-', p_booking_id)),
    p_booking_id,
    p_meta || jsonb_build_object('created_by', 'wallet_record_rental_payment')
  );
end;
$$;

grant execute on function public.wallet_record_rental_payment(uuid, uuid, integer, text, jsonb) to authenticated;
grant execute on function public.wallet_record_rental_payment(uuid, uuid, integer, text, jsonb) to service_role;
