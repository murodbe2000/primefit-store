-- PrimeFit admin panel migration. Run once in Supabase SQL Editor.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Boshqa',
  description text not null default '',
  price_krw numeric(14,2) not null default 0 check (price_krw >= 0),
  price_uzs numeric(14,2) not null default 0 check (price_uzs >= 0),
  image_url text not null default '',
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products
for select to anon, authenticated using (is_active = true or public.is_admin());
drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
for delete to authenticated using (public.is_admin());

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders" on public.orders
for select to authenticated using (public.is_admin());
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can view payment receipts" on storage.objects;
create policy "Admins can view payment receipts" on storage.objects
for select to authenticated using (bucket_id = 'payment-receipts' and public.is_admin());

grant select, insert, update, delete on public.products to authenticated;
grant select on public.products to anon;
