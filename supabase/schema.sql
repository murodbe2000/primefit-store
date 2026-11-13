-- PrimeFit Supabase schema
-- Run this entire file in Supabase Dashboard > SQL Editor > New query.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  language text not null default 'uz' check (language in ('uz')),
  country text not null default 'UZ' check (country in ('UZ','KR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null check (country in ('UZ','KR')),
  customer_name text not null,
  phone text not null,
  address text not null,
  items jsonb not null,
  total numeric(14,2) not null check (total >= 0),
  currency text not null check (currency in ('UZS','KRW')),
  status text not null default 'awaiting_receipt'
    check (status in ('awaiting_receipt','under_review','approved','rejected')),
  receipt_path text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx
  on public.orders(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read their own orders" on public.orders;
create policy "Users can read their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own orders" on public.orders;
create policy "Users can create their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users can upload their own payment receipts" on storage.objects;
create policy "Users can upload their own payment receipts"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can view their own payment receipts" on storage.objects;
create policy "Users can view their own payment receipts"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
