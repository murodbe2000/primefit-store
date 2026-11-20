-- PrimeFit internal product codes
-- Applied to the connected production database as add_primefit_product_internal_codes.
-- Nullable so existing catalog records and customer orders remain unchanged.
alter table public.products add column if not exists internal_code text;
create unique index if not exists products_internal_code_unique
  on public.products (upper(btrim(internal_code)))
  where internal_code is not null and btrim(internal_code) <> '';
