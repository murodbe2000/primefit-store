-- PrimeFit placement model v3: exactly three placements and six homepage rows
alter table public.products
  add column if not exists home_row text not null default 'Boshqa';

-- Migrate legacy placement values without losing products.
update public.products set placement='recommended' where placement='featured';
update public.products
set placement='home',
    home_row=case
      when lower(coalesce(section_name,'')) like '%t-shirt%' or lower(coalesce(section_name,'')) like '%futbol%' then 'T-shirt'
      when lower(coalesce(section_name,'')) like '%kross%' then 'Krasovka'
      when lower(coalesce(section_name,'')) like '%shim%' or lower(coalesce(section_name,'')) like '%trouser%' then 'Shim'
      when lower(coalesce(section_name,'')) like '%ko‘ylak%' or lower(coalesce(section_name,'')) like '%ko''ylak%' or lower(coalesce(section_name,'')) like '%shirt%' then 'Ko‘ylak'
      when lower(coalesce(section_name,'')) like '%jacket%' or lower(coalesce(section_name,'')) like '%jaket%' then 'Jacket'
      else 'Boshqa'
    end
where placement='row';
update public.products set placement='catalog' where placement is null or placement not in ('catalog','home','recommended');
update public.products set home_row='Boshqa' where home_row is null or home_row not in ('T-shirt','Krasovka','Shim','Ko‘ylak','Jacket','Boshqa');

alter table public.products drop constraint if exists products_placement_check;
alter table public.products add constraint products_placement_check
  check (placement in ('catalog','home','recommended'));

alter table public.products drop constraint if exists products_home_row_check;
alter table public.products add constraint products_home_row_check
  check (home_row in ('T-shirt','Krasovka','Shim','Ko‘ylak','Jacket','Boshqa'));

-- Legacy text field is no longer used for homepage grouping.
update public.products set section_name='' where section_name is not null;
