-- PrimeFit internal product codes
-- Safe additive migration; existing products remain valid with NULL codes.
alter table public.products add column if not exists internal_code text;

create unique index if not exists products_internal_code_unique
  on public.products (upper(btrim(internal_code)))
  where internal_code is not null and btrim(internal_code) <> '';
