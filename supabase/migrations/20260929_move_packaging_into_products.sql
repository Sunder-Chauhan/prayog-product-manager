-- Keep the supplied measurements in the existing product catalog. Missing commercial
-- fields stay NULL until the business owner completes each draft.
alter table public.products alter column cost_price drop not null;
alter table public.products alter column retail_price drop not null;
alter table public.products alter column stock_on_hand drop not null;
alter table public.products add column details_complete boolean not null default true;
alter table public.products add column packaging_spec jsonb;
alter table public.products add constraint completed_product_fields check
  (not details_complete or (cost_price is not null and retail_price is not null and stock_on_hand is not null));

insert into public.products (
 owner_id,sku,name,category,description,fragile,cost_price,retail_price,stock_on_hand,
 details_complete,packaging_spec,product_length_cm,product_width_cm,product_height_cm,
 diameter_cm,net_weight_g,package_length_cm,package_width_cm,package_height_cm
)
select p.owner_id,p.sku,p.sku || ' (add product name)','Ceramic',null,true,null,null,null,
 false,to_jsonb(p)-'owner_id',
 (regexp_match(p.product_size_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)'))[1]::numeric,
 (regexp_match(p.product_size_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)'))[2]::numeric,
 coalesce((regexp_match(p.product_size_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)'))[3]::numeric,
          (regexp_match(p.product_size_cm,'^Ø[0-9.]+ × ([0-9.]+) deep'))[1]::numeric),
 (regexp_match(p.product_size_cm,'^Ø([0-9.]+)'))[1]::numeric,
 (regexp_match(p.weight,'^([0-9]+) g$'))[1]::numeric,
 (regexp_match(p.standard_box_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)$'))[1]::numeric,
 (regexp_match(p.standard_box_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)$'))[2]::numeric,
 (regexp_match(p.standard_box_cm,'^([0-9.]+) × ([0-9.]+) × ([0-9.]+)$'))[3]::numeric
from public.packaging_specs p
on conflict(owner_id,sku) do update set
 packaging_spec=excluded.packaging_spec,
 product_length_cm=coalesce(public.products.product_length_cm,excluded.product_length_cm),
 product_width_cm=coalesce(public.products.product_width_cm,excluded.product_width_cm),
 product_height_cm=coalesce(public.products.product_height_cm,excluded.product_height_cm),
 diameter_cm=coalesce(public.products.diameter_cm,excluded.diameter_cm),
 net_weight_g=coalesce(public.products.net_weight_g,excluded.net_weight_g),
 package_length_cm=coalesce(public.products.package_length_cm,excluded.package_length_cm),
 package_width_cm=coalesce(public.products.package_width_cm,excluded.package_width_cm),
 package_height_cm=coalesce(public.products.package_height_cm,excluded.package_height_cm);

do $$ begin
 if (select count(*) from public.products where packaging_spec is not null) <> 34 then
   raise exception 'Packaging transfer incomplete';
 end if;
end $$;
drop table public.packaging_specs;
