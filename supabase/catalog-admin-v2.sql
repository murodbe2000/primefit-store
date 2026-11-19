-- PrimeFit catalog/admin v2: image storage and storefront placement
alter table public.products
  add column if not exists images text[] not null default '{}',
  add column if not exists placement text not null default 'catalog',
  add column if not exists section_name text not null default '',
  add column if not exists sort_order integer not null default 0;

alter table public.products drop constraint if exists products_placement_check;
alter table public.products add constraint products_placement_check
  check (placement in ('catalog','featured','row'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
