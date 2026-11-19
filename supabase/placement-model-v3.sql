-- PrimeFit placement model v3: exactly three placements and six homepage rows
alter table public.products
  add column if not exists home_row text not null default 'Boshqa';

-- Drop the v2 constraint first so legacy values can be migrated safely.
alter table public.products drop constraint if exists products_placement_check;

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

-- Normalize old free-text categories into the new fixed category list.
update public.products
set category=case
  when lower(coalesce(category,'')) like '%oyoq%' or lower(coalesce(category,'')) like '%ayoq%' or lower(coalesce(category,'')) like '%kross%' or lower(coalesce(category,'')) like '%etik%' or lower(coalesce(category,'')) like '%tufli%' then 'Oyoq kiyimlar'
  when lower(coalesce(category,'')) like '%triko%' then 'Trikolar'
  when lower(coalesce(category,'')) like '%shim%' or lower(coalesce(category,'')) like '%ishton%' or lower(coalesce(category,'')) like '%trouser%' then 'Shimlar'
  when lower(coalesce(category,'')) like '%futbol%' or lower(coalesce(category,'')) like '%t-shirt%' or lower(coalesce(category,'')) like '%tshirt%' then 'T-shirtlar'
  when lower(coalesce(category,'')) like '%ko‘ylak%' or lower(coalesce(category,'')) like '%ko''ylak%' or lower(coalesce(category,'')) like '%shirt%' then 'Ko‘ylaklar'
  when lower(coalesce(category,'')) like '%jacket%' or lower(coalesce(category,'')) like '%jaket%' or lower(coalesce(category,'')) like '%pidjak%' then 'Jacketlar'
  when lower(coalesce(category,'')) like '%kurtka%' then 'Kurtkalar'
  when lower(coalesce(category,'')) like '%jemper%' or lower(coalesce(category,'')) like '%sviter%' then 'Jemperlar'
  when lower(coalesce(category,'')) like '%ichki%' or lower(coalesce(category,'')) like '%underwear%' then 'Ichki kiyim'
  when lower(coalesce(category,'')) like '%classic%' or lower(coalesce(category,'')) like '%klassik%' then 'Classic'
  when lower(coalesce(category,'')) like '%sport%' then 'Sport'
  when lower(coalesce(category,'')) like '%aksess%' then 'Aksessuarlar'
  else 'Boshqa'
end;

alter table public.products drop constraint if exists products_placement_check;
alter table public.products add constraint products_placement_check
  check (placement in ('catalog','home','recommended'));

alter table public.products drop constraint if exists products_home_row_check;
alter table public.products add constraint products_home_row_check
  check (home_row in ('T-shirt','Krasovka','Shim','Ko‘ylak','Jacket','Boshqa'));

-- Legacy text field is no longer used for homepage grouping.
update public.products set section_name='' where section_name is not null;
