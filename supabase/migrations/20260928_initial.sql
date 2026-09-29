-- Run in a dedicated Supabase project. Monetary amounts in INR, dimensions in cm, weights in g.
create extension if not exists pgcrypto;
create table public.suppliers(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),name text not null,contact_name text,phone text,email text,notes text,created_at timestamptz not null default now());
create table public.products(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),sku text not null,name text not null,category text not null check(category in ('Ceramic','Lighting','Photo Frames','Other')),description text,supplier_id uuid references public.suppliers(id) on delete set null,image_path text,cost_price numeric(12,2) not null default 0 check(cost_price>=0),retail_price numeric(12,2) not null default 0 check(retail_price>=0),amazon_price numeric(12,2) check(amazon_price>=0),flipkart_price numeric(12,2) check(flipkart_price>=0),wholesale_price numeric(12,2) check(wholesale_price>=0),stock_on_hand integer not null default 0 check(stock_on_hand>=0),reorder_level integer not null default 5 check(reorder_level>=0),reorder_quantity integer not null default 20 check(reorder_quantity>=0),material text,color text,fragile boolean not null default false,pieces_per_set integer not null default 1 check(pieces_per_set>=1),product_length_cm numeric(10,2) check(product_length_cm>=0),product_width_cm numeric(10,2) check(product_width_cm>=0),product_height_cm numeric(10,2) check(product_height_cm>=0),diameter_cm numeric(10,2) check(diameter_cm>=0),net_weight_g numeric(10,2) check(net_weight_g>=0),package_length_cm numeric(10,2) check(package_length_cm>=0),package_width_cm numeric(10,2) check(package_width_cm>=0),package_height_cm numeric(10,2) check(package_height_cm>=0),packed_weight_g numeric(10,2) check(packed_weight_g>=0),created_at timestamptz not null default now(),unique(owner_id,sku));
create table public.orders(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),order_number bigint generated always as identity,product_id uuid not null references public.products(id),product_category text not null,quantity integer not null check(quantity>0),channel text not null,customer_name text,unit_price numeric(12,2) not null check(unit_price>=0),total numeric(12,2) not null,product_cost numeric(12,2) not null,packaging_cost numeric(12,2) not null default 0,shipping_cost numeric(12,2) not null default 0,marketplace_fee numeric(12,2) not null default 0,discount numeric(12,2) not null default 0,status text not null default 'new' check(status in ('new','packed','shipped','delivered','cancelled','returned')),note text,created_at timestamptz not null default now());
create table public.purchases(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),product_id uuid not null references public.products(id),supplier_id uuid references public.suppliers(id) on delete set null,quantity integer not null check(quantity>0),unit_cost numeric(12,2) not null check(unit_cost>=0),extra_cost numeric(12,2) not null default 0 check(extra_cost>=0),note text,created_at timestamptz not null default now());
create table public.expenses(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),category text not null,amount numeric(12,2) not null check(amount>=0),description text,spent_at date not null default current_date,created_at timestamptz not null default now());
create table public.stock_movements(id uuid primary key default gen_random_uuid(),owner_id uuid not null default auth.uid() references auth.users(id),product_id uuid not null references public.products(id),quantity_delta integer not null check(quantity_delta<>0),reason text not null,note text,created_at timestamptz not null default now());
create index on public.products(owner_id);create index on public.orders(owner_id,created_at desc);create index on public.stock_movements(owner_id,created_at desc);
-- All exposed tables have tenant ownership policies. Stock and order writes use validated RPCs only.
alter table public.suppliers enable row level security;alter table public.products enable row level security;alter table public.orders enable row level security;alter table public.purchases enable row level security;alter table public.expenses enable row level security;alter table public.stock_movements enable row level security;
create policy suppliers_select on public.suppliers for select to authenticated using(owner_id=(select auth.uid()));
create policy suppliers_insert on public.suppliers for insert to authenticated with check(owner_id=(select auth.uid()));
create policy suppliers_update on public.suppliers for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy products_select on public.products for select to authenticated using(owner_id=(select auth.uid()));
create policy products_insert on public.products for insert to authenticated with check(owner_id=(select auth.uid()) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select auth.uid()))));
create policy products_update on public.products for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select auth.uid()))));
create policy orders_select on public.orders for select to authenticated using(owner_id=(select auth.uid()));
create policy purchases_select on public.purchases for select to authenticated using(owner_id=(select auth.uid()));
create policy expenses_select on public.expenses for select to authenticated using(owner_id=(select auth.uid()));
create policy expenses_insert on public.expenses for insert to authenticated with check(owner_id=(select auth.uid()));
create policy movements_select on public.stock_movements for select to authenticated using(owner_id=(select auth.uid()));
-- Revoke direct mutation of stock and financial facts; expose narrow, atomic functions below.
revoke all on public.orders,public.purchases,public.stock_movements from anon,authenticated;
grant select on public.orders,public.purchases,public.stock_movements to authenticated;
grant select,insert,update on public.products,public.suppliers to authenticated;
grant select,insert on public.expenses to authenticated;
create or replace function public.create_order(p_product_id uuid,p_quantity integer,p_channel text,p_customer_name text,p_unit_price numeric,p_packaging_cost numeric,p_shipping_cost numeric,p_marketplace_fee numeric,p_discount numeric,p_note text) returns uuid language plpgsql security definer set search_path='' as $$declare v_owner uuid:=auth.uid(); v_product public.products%rowtype;v_id uuid;begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_quantity is null or p_quantity<1 or p_unit_price is null or p_unit_price<0 or p_packaging_cost<0 or p_shipping_cost<0 or p_marketplace_fee<0 or p_discount<0 or p_discount>p_quantity*p_unit_price then raise exception 'Invalid order values';end if;
 select * into v_product from public.products where id=p_product_id and owner_id=v_owner for update;
 if not found then raise exception 'Product not found';end if;
 if v_product.stock_on_hand<p_quantity then raise exception 'Not enough stock available';end if;
 update public.products set stock_on_hand=stock_on_hand-p_quantity where id=p_product_id;
 insert into public.orders(owner_id,product_id,product_category,quantity,channel,customer_name,unit_price,total,product_cost,packaging_cost,shipping_cost,marketplace_fee,discount,note) values(v_owner,p_product_id,v_product.category,p_quantity,coalesce(nullif(p_channel,''),'Website'),nullif(p_customer_name,''),p_unit_price,p_quantity*p_unit_price-p_discount,p_quantity*v_product.cost_price,p_packaging_cost,p_shipping_cost,p_marketplace_fee,p_discount,p_note) returning id into v_id;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,-p_quantity,'Order',v_id::text);return v_id;end$$;
create or replace function public.change_order_status(p_order_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$declare v_owner uuid:=auth.uid();v_order public.orders%rowtype;begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_status not in ('new','packed','shipped','delivered','cancelled','returned') then raise exception 'Invalid status';end if;
 select * into v_order from public.orders where id=p_order_id and owner_id=v_owner for update;
 if not found then raise exception 'Order not found';end if;
 if v_order.status in ('cancelled','returned') then raise exception 'Closed orders cannot be reopened';end if;
 if p_status='cancelled' then
  if v_order.status not in ('new','packed') then raise exception 'Only new or packed orders can be cancelled; record a return instead';end if;
  update public.products set stock_on_hand=stock_on_hand+v_order.quantity where id=v_order.product_id and owner_id=v_owner;
  insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,v_order.product_id,v_order.quantity,'Cancellation',p_order_id::text);
 end if;
 if p_status='returned' and v_order.status not in ('shipped','delivered') then raise exception 'Only shipped or delivered orders can be returned';end if;
 update public.orders set status=p_status where id=p_order_id;end$$;
create or replace function public.receive_purchase(p_product_id uuid,p_supplier_id uuid,p_quantity integer,p_unit_cost numeric,p_extra_cost numeric,p_note text) returns uuid language plpgsql security definer set search_path='' as $$declare v_owner uuid:=auth.uid();v_id uuid;begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_quantity is null or p_quantity<1 or p_unit_cost is null or p_unit_cost<0 or p_extra_cost is null or p_extra_cost<0 then raise exception 'Invalid purchase values';end if;
 if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and owner_id=v_owner) then raise exception 'Supplier not found';end if;
 update public.products set stock_on_hand=stock_on_hand+p_quantity,cost_price=round(p_unit_cost+p_extra_cost/p_quantity,2) where id=p_product_id and owner_id=v_owner;
 if not found then raise exception 'Product not found';end if;
 insert into public.purchases(owner_id,product_id,supplier_id,quantity,unit_cost,extra_cost,note) values(v_owner,p_product_id,p_supplier_id,p_quantity,p_unit_cost,p_extra_cost,p_note) returning id into v_id;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,p_quantity,'Purchase',v_id::text);return v_id;end$$;
create or replace function public.adjust_stock(p_product_id uuid,p_delta integer,p_note text) returns void language plpgsql security definer set search_path='' as $$declare v_owner uuid:=auth.uid();begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_delta is null or p_delta=0 or nullif(trim(p_note),'') is null then raise exception 'Quantity and reason required';end if;
 update public.products set stock_on_hand=stock_on_hand+p_delta where id=p_product_id and owner_id=v_owner and stock_on_hand+p_delta>=0;
 if not found then raise exception 'Product not found or stock would be negative';end if;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,p_delta,'Adjustment',p_note);end$$;
revoke all on function public.create_order(uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,text),public.change_order_status(uuid,text),public.receive_purchase(uuid,uuid,integer,numeric,numeric,text),public.adjust_stock(uuid,integer,text) from public,anon;
grant execute on function public.create_order(uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,text),public.change_order_status(uuid,text),public.receive_purchase(uuid,uuid,integer,numeric,numeric,text),public.adjust_stock(uuid,integer,text) to authenticated;
-- Private product images are served by short-lived signed URLs; owner path limits uploads and mutations.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy product_image_select on storage.objects for select to authenticated using(bucket_id='product-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy product_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy product_image_update on storage.objects for update to authenticated using(bucket_id='product-images' and owner_id=(select auth.uid())::text) with check(bucket_id='product-images' and owner_id=(select auth.uid())::text);
create policy product_image_delete on storage.objects for delete to authenticated using(bucket_id='product-images' and owner_id=(select auth.uid())::text);
