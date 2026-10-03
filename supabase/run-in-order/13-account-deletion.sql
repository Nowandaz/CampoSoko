-- Account deletion: keep receipts as anonymised records instead of blocking the deletion.
alter table receipts add column if not exists seller_name text;
alter table receipts alter column seller_id drop not null;
alter table receipts drop constraint if exists receipts_seller_id_fkey;
alter table receipts add constraint receipts_seller_id_fkey foreign key (seller_id) references profiles(id) on delete set null;

-- Public verification keeps working after the seller account is gone.
create or replace function get_public_receipt(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'receipt_no', r.receipt_no,
    'sale_date', r.sale_date,
    'created_at', r.created_at,
    'seller', coalesce(sp.shop_name, r.seller_name, 'Seller'),
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
