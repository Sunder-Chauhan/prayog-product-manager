alter table public.products add column if not exists guide_published jsonb;
create or replace function public.publish_product_guide(p_product_id uuid, p_publish boolean default true)
returns void language plpgsql security definer set search_path='' as $$
declare p public.products%rowtype; guide jsonb;
begin
 if auth.uid() is null or public.workspace_role() not in ('owner','manager') then raise exception 'Manager access required'; end if;
 select * into p from public.products where id=p_product_id and owner_id=public.workspace_owner() for update;
 if not found then raise exception 'Product not found'; end if;
 if not p_publish then update public.products set guide_published=null where id=p.id; return; end if;
 guide := (p.storefront_draft->'specifications'->>'_assembly_guide')::jsonb;
 if guide is null or jsonb_typeof(guide->'steps') is distinct from 'array' then raise exception 'Add assembly steps first'; end if;
 if jsonb_array_length(guide->'steps')=0 then raise exception 'Add assembly steps first'; end if;
 update public.products set guide_published=jsonb_build_object('sku',p.sku,'name',p.name,'guide',guide) where id=p.id;
end; $$;
revoke all on function public.publish_product_guide(uuid,boolean) from public,anon;
grant execute on function public.publish_product_guide(uuid,boolean) to authenticated;
create or replace function public.storefront_guides()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(g order by g->>'sku'),'[]'::jsonb) from (
 select coalesce(p.guide_published, jsonb_build_object('sku',p.sku,'name',p.storefront_published->>'name','guide',(p.storefront_published->'specifications'->>'_assembly_guide')::jsonb)) g
 from public.products p
 where p.guide_published is not null or p.storefront_published->'specifications'->>'_assembly_guide' is not null
 ) s;
$$;
revoke all on function public.storefront_guides() from public;
grant execute on function public.storefront_guides() to anon,authenticated;
