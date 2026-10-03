-- Receipts: issued via RPC only (immutable), voidable with a reason, publicly verifiable (masked).
alter table receipts add column if not exists listing_qty int;

create or replace function create_receipt(
  p_prefix text, p_listing uuid, p_buyer_name text, p_buyer_phone text, p_buyer_email text,
  p_payment payment_method, p_mpesa text, p_notes text, p_date date, p_items jsonb
) returns table (id uuid, receipt_no text, public_token text)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  it jsonb;
  total numeric(12,2) := 0;
  n int;
  v_buyer uuid;
  v_no text;
  v_id uuid;
  v_token text;
  l listings;
  v_qty int;
begin
  if uid is null then raise exception 'Login required'; end if;
  if not is_active_user() then raise exception 'Account suspended'; end if;
  if not exists (select 1 from seller_profiles where user_id = uid) then raise exception 'Create a seller profile first'; end if;
  if p_prefix !~ '^[A-Z]{2,4}$' then raise exception 'Bad prefix'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Add 1 to 20 items'; end if;
  if p_buyer_phone is null and p_buyer_email is null then raise exception 'Enter the buyer phone or email'; end if;
  if p_date > current_date + 1 then raise exception 'Date cannot be in the future'; end if;
  select count(*) into n from receipts r where r.seller_id = uid and r.created_at > now() - interval '24 hours';
  if n >= 50 then raise exception 'Daily receipt limit reached'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    if coalesce(length(trim(it->>'name')), 0) not between 1 and 100 then raise exception 'Each item needs a name'; end if;
    if (it->>'quantity')::int < 1 or (it->>'quantity')::int > 9999 then raise exception 'Bad quantity'; end if;
    if (it->>'unit_price')::numeric < 0 or (it->>'unit_price')::numeric > 10000000 then raise exception 'Bad price'; end if;
    total := total + (it->>'quantity')::int * (it->>'unit_price')::numeric;
  end loop;

  if p_listing is not null then
    select * into l from listings where listings.id = p_listing and seller_id = uid for update;
    if not found then raise exception 'Listing not found'; end if;
    v_qty := (p_items->0->>'quantity')::int;
    if l.type = 'goods' then
      if l.quantity < v_qty then raise exception 'Only % in stock', l.quantity; end if;
    end if;
  end if;

  select pr.id into v_buyer from profiles pr
   where pr.id <> uid and not pr.suspended
     and ((p_buyer_email is not null and lower(pr.email) = lower(p_buyer_email))
       or (p_buyer_phone is not null and pr.whatsapp = p_buyer_phone))
   limit 1;

  v_no := p_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('receipt_seq')::text, 6, '0');
  insert into receipts (receipt_no, seller_id, listing_id, buyer_name, buyer_phone, buyer_email, buyer_id,
                        payment_method, mpesa_code, notes, total, sale_date, listing_qty)
  values (v_no, uid, p_listing, trim(p_buyer_name), p_buyer_phone, lower(p_buyer_email), v_buyer,
          p_payment, nullif(p_mpesa, ''), nullif(trim(p_notes), ''), total, p_date,
          case when p_listing is not null and l.type = 'goods' then v_qty end)
  returning receipts.id, receipts.public_token into v_id, v_token;

  insert into receipt_items (receipt_id, name, quantity, unit_price)
  select v_id, trim(e->>'name'), (e->>'quantity')::int, (e->>'unit_price')::numeric
  from jsonb_array_elements(p_items) e;

  if p_listing is not null and l.type = 'goods' then
    update listings set quantity = quantity - v_qty where listings.id = p_listing;  -- trigger marks sold at 0
  end if;

  return query select v_id, v_no, v_token;
end $$;
grant execute on function create_receipt(text, uuid, text, text, text, payment_method, text, text, date, jsonb) to authenticated;

create or replace function void_receipt(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r receipts;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if char_length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Enter a reason'; end if;
  select * into r from receipts where id = p_id;
  if not found then raise exception 'Receipt not found'; end if;
  if r.seller_id <> auth.uid() and not is_admin() then raise exception 'Not allowed'; end if;
  if r.voided then raise exception 'Already void'; end if;
  update receipts set voided = true, void_reason = trim(p_reason), voided_at = now() where id = p_id;
  if r.listing_id is not null and r.listing_qty is not null then
    update listings set quantity = quantity + r.listing_qty,
                        status = case when status = 'sold' then 'active' else status end
     where id = r.listing_id;
  end if;
  if is_admin() and r.seller_id <> auth.uid() then
    insert into admin_audit_log (admin_id, action, target_type, target_id, details)
    values (auth.uid(), 'void_receipt', 'receipt', p_id::text, jsonb_build_object('reason', p_reason));
  end if;
end $$;
grant execute on function void_receipt(uuid, text) to authenticated;

-- Public verification: returns masked data only (no full phone/email).
create or replace function get_public_receipt(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'receipt_no', r.receipt_no,
    'sale_date', r.sale_date,
    'created_at', r.created_at,
    'seller', coalesce(sp.shop_name, 'Seller'),
    'buyer', case when position(' ' in trim(r.buyer_name)) > 0
                  then split_part(trim(r.buyer_name), ' ', 1) || ' ' || upper(left(regexp_replace(trim(r.buyer_name), '^.*\s', ''), 1)) || '.'
                  else trim(r.buyer_name) end,
    'buyer_contact', case
        when r.buyer_phone is not null then left(r.buyer_phone, 4) || ' ' || substr(r.buyer_phone, 5, 1) || '** *** ' || right(r.buyer_phone, 3)
        when r.buyer_email is not null then left(split_part(r.buyer_email, '@', 1), 1) || '***@' || split_part(r.buyer_email, '@', 2) end,
    'payment_method', r.payment_method,
    'mpesa_code', case when r.mpesa_code is not null then left(r.mpesa_code, 2) || '*****' || right(r.mpesa_code, 2) end,
    'notes', r.notes,
    'total', r.total,
    'voided', r.voided,
    'void_reason', r.void_reason,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'quantity', i.quantity, 'unit_price', i.unit_price) order by i.id)
                       from receipt_items i where i.receipt_id = r.id), '[]'::jsonb)
  )
  from receipts r left join seller_profiles sp on sp.user_id = r.seller_id
  where r.public_token = p_token
$$;
grant execute on function get_public_receipt(text) to anon, authenticated;
