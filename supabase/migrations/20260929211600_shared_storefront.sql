-- Shared products and stock stay in public.products. Marketing snapshots contain public fields only.
alter table public.products add column storefront_draft jsonb;
alter table public.products add column storefront_published jsonb;
alter table public.products add column storefront_published_at timestamptz;
alter table public.orders add column customer_user_id uuid references auth.users(id);
alter table public.orders add column storefront_order_id uuid;
alter table public.orders add column shipping_address jsonb;
create index orders_customer_idx on public.orders(customer_user_id,created_at desc);
CREATE TABLE public.storefront_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_business BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
alter table public.storefront_profiles enable row level security;
revoke all on public.storefront_profiles from anon,authenticated;
grant select,insert,update,delete on public.storefront_profiles to authenticated;
create policy own_profiles on public.storefront_profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
CREATE TABLE public.storefront_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
alter table public.storefront_addresses enable row level security;
revoke all on public.storefront_addresses from anon,authenticated;
grant select,insert,update,delete on public.storefront_addresses to authenticated;
create policy own_addresses on public.storefront_addresses for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index storefront_addresses_user_idx on public.storefront_addresses(user_id);
CREATE TABLE public.storefront_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  gst_number TEXT,
  business_type text NOT NULL DEFAULT 'other',
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
alter table public.storefront_organizations enable row level security;
revoke all on public.storefront_organizations from anon,authenticated;
grant select,insert,update,delete on public.storefront_organizations to authenticated;
create policy own_organizations on public.storefront_organizations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index storefront_organizations_user_idx on public.storefront_organizations(user_id);
CREATE TABLE public.storefront_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
alter table public.storefront_wishlist enable row level security;
revoke all on public.storefront_wishlist from anon,authenticated;
grant select,insert,update,delete on public.storefront_wishlist to authenticated;
create policy own_wishlist on public.storefront_wishlist for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index storefront_wishlist_user_idx on public.storefront_wishlist(user_id);
CREATE TABLE public.storefront_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL DEFAULT ('QT-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6)),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.storefront_organizations(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  company_name TEXT,
  business_type text,
  project_type TEXT,
  estimated_quantity TEXT,
  timeline TEXT,
  message TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
alter table public.storefront_quotations enable row level security;
revoke all on public.storefront_quotations from anon,authenticated;
grant select,insert,update,delete on public.storefront_quotations to authenticated;
create policy own_quotations on public.storefront_quotations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index storefront_quotations_user_idx on public.storefront_quotations(user_id);
revoke update,delete on public.storefront_quotations from authenticated;
create policy staff_quotes on public.storefront_quotations for select to authenticated using ((select public.workspace_role()) in ('owner','manager'));

create function public.storefront_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('products',coalesce(jsonb_agg(p.storefront_published || jsonb_build_object('id',p.id,'sku',p.sku,'stock_on_hand',p.stock_on_hand,'is_published',true,'updated_at',p.storefront_published_at)),'[]'::jsonb))
 from public.products p where p.storefront_published is not null;
$$;
revoke all on function public.storefront_catalog() from public;
grant execute on function public.storefront_catalog() to anon,authenticated;

create function public.publish_storefront(p_product_id uuid,p_publish boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare p public.products%rowtype; payload jsonb;
begin
 if auth.uid() is null or public.workspace_role() not in ('owner','manager') then raise exception 'Manager access required'; end if;
 select * into p from public.products where id=p_product_id and owner_id=public.workspace_owner() for update;
 if not found then raise exception 'Product not found';end if;
 if not p_publish then update public.products set storefront_published=null,storefront_published_at=now() where id=p.id;return;end if;
 if p.storefront_draft is null or nullif(p.storefront_draft->>'slug','') is null then raise exception 'Storefront details are required';end if;
 select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) into payload from jsonb_each(p.storefront_draft) e(k,v)
 where k=any(array['slug','tagline','story','hero_image_url','gallery','specifications','scenes','cutout_image_url','collection_id','collections','is_featured','sort_order']);
 payload:=payload||jsonb_build_object('name',p.name,'description',p.description,'base_price',p.retail_price,'currency','INR');
 update public.products set storefront_published=payload,storefront_published_at=now() where id=p.id;
end;$$;
revoke all on function public.publish_storefront(uuid,boolean) from public,anon;
grant execute on function public.publish_storefront(uuid,boolean) to authenticated;

create function public.storefront_orders() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(g),'[]'::jsonb) from (
 select storefront_order_id as id, min(order_number)::text as order_number, auth.uid() as user_id, min(o.created_at) as created_at,
 case when count(distinct status)=1 then min(status) else 'processing' end as status,
 sum(quantity) as items_count,sum(total) as subtotal,
 jsonb_agg(jsonb_build_object('product_name',p.name,'quantity',o.quantity,'unit_price',o.unit_price,'line_total',o.total,'status',o.status)) as order_items
 from public.orders o join public.products p on p.id=o.product_id
 where o.customer_user_id=auth.uid() and o.storefront_order_id is not null group by storefront_order_id) g;
$$;
revoke all on function public.storefront_orders() from public,anon;
grant execute on function public.storefront_orders() to authenticated;

create function public.place_storefront_order(p_items jsonb,p_customer jsonb,p_address jsonb,p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare item jsonb; p public.products%rowtype; qty integer; price numeric; oid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email before ordering';end if;
 if p_request_id is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 or nullif(trim(p_customer->>'name'),'') is null then raise exception 'Invalid order';end if;
 -- Serialize retries for the same request; stock and order writes occur in one transaction.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 if exists(select 1 from public.orders where storefront_order_id=p_request_id and customer_user_id=auth.uid()) then return p_request_id;end if;
 -- Lock all products in deterministic order, then process duplicates against current stock.
 perform 1 from public.products where id in (select (x->>'productId')::uuid from jsonb_array_elements(p_items) x) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  qty:=(item->>'quantity')::integer;
  select * into p from public.products where id=(item->>'productId')::uuid and storefront_published is not null for update;
  if not found or qty is null or qty<1 or qty>999 or p.stock_on_hand is null or p.cost_price is null or not p.details_complete or p.stock_on_hand<qty then raise exception 'Product unavailable or insufficient stock';end if;
  price:=(p.storefront_published->>'base_price')::numeric;
  if price is null or price<=0 then raise exception 'Product price unavailable';end if;
  update public.products set stock_on_hand=stock_on_hand-qty where id=p.id;
  insert into public.orders(owner_id,product_id,product_category,quantity,channel,customer_name,unit_price,total,product_cost,note,customer_user_id,storefront_order_id,shipping_address)
  values(p.owner_id,p.id,p.category,qty,'Website',left(p_customer->>'name',200),price,price*qty,p.cost_price*qty,'Website order — awaiting staff confirmation',auth.uid(),p_request_id,p_address||jsonb_build_object('phone',p_customer->>'phone','email',p_customer->>'email')) returning id into oid;
  insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(p.owner_id,p.id,-qty,'Website order',oid::text);
 end loop;
 return p_request_id;
end;$$;
revoke all on function public.place_storefront_order(jsonb,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.place_storefront_order(jsonb,jsonb,jsonb,uuid) to authenticated;
