-- PrimeFit inventory, customer profiles and safe order approval
alter table public.products
  add column if not exists stock_quantity integer,
  add column if not exists is_available boolean not null default true,
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table public.products drop constraint if exists products_stock_quantity_check;
alter table public.products add constraint products_stock_quantity_check
  check (stock_quantity is null or stock_quantity >= 0);
alter table public.products drop constraint if exists products_variants_array_check;
alter table public.products add constraint products_variants_array_check
  check (jsonb_typeof(variants) = 'array');

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
drop policy if exists "Customers read own profile" on public.customer_profiles;
create policy "Customers read own profile" on public.customer_profiles
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Customers insert own profile" on public.customer_profiles;
create policy "Customers insert own profile" on public.customer_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Customers update own profile" on public.customer_profiles;
create policy "Customers update own profile" on public.customer_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.customer_profiles to authenticated;

create or replace function public.primefit_new_customer_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.customer_profiles(user_id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();
  return new;
end;
$$;
drop trigger if exists primefit_auth_user_profile on auth.users;
create trigger primefit_auth_user_profile
after insert on auth.users
for each row execute procedure public.primefit_new_customer_profile();

create or replace function public.primefit_approve_order_and_reduce_inventory(p_order_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_qty integer;
  v_color text;
  v_size text;
  v_idx integer;
  v_stock integer;
  v_variants jsonb;
  v_total integer;
begin
  if not public.is_admin() then
    raise exception 'Admin huquqi talab qilinadi';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Buyurtma topilmadi'; end if;
  if v_order.status = 'approved' then return; end if;
  if v_order.status = 'rejected' then raise exception 'Rad etilgan buyurtmani tasdiqlab bo‘lmaydi'; end if;

  for v_item in select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
  loop
    v_product_id := nullif(v_item->>'product_id','')::uuid;
    if v_product_id is null then continue; end if;
    v_qty := greatest(1, coalesce(nullif(v_item->>'quantity','')::integer, 1));
    v_color := coalesce(v_item->>'color','');
    v_size := coalesce(v_item->>'size','');

    select * into v_product from public.products where id = v_product_id for update;
    if not found then raise exception 'Buyurtmadagi mahsulot topilmadi'; end if;
    v_variants := coalesce(v_product.variants, '[]'::jsonb);

    if jsonb_array_length(v_variants) > 0 then
      select ordinality::integer, greatest(0, coalesce(nullif(value->>'stock','')::integer,0))
      into v_idx, v_stock
      from jsonb_array_elements(v_variants) with ordinality
      where coalesce(value->>'color','') = v_color
        and coalesce(value->>'size','') = v_size
      limit 1;
      if v_idx is null then raise exception 'Tanlangan rang yoki o‘lcham topilmadi'; end if;
      if v_stock < v_qty then raise exception 'Tanlangan rang yoki o‘lcham omborda yetarli emas'; end if;
      v_variants := jsonb_set(v_variants, array[(v_idx-1)::text,'stock'], to_jsonb(v_stock-v_qty), true);
      select coalesce(sum(greatest(0,coalesce(nullif(value->>'stock','')::integer,0))),0)
      into v_total from jsonb_array_elements(v_variants);
      update public.products
      set variants = v_variants, stock_quantity = v_total,
          is_available = (v_total > 0), updated_at = now()
      where id = v_product_id;
    elsif v_product.stock_quantity is not null then
      if v_product.stock_quantity < v_qty then raise exception 'Mahsulot omborda yetarli emas'; end if;
      update public.products
      set stock_quantity = stock_quantity-v_qty,
          is_available = (stock_quantity-v_qty > 0), updated_at = now()
      where id = v_product_id;
    end if;
  end loop;

  update public.orders set status='approved', updated_at=now() where id=p_order_id;
end;
$$;
grant execute on function public.primefit_approve_order_and_reduce_inventory(uuid) to authenticated;
