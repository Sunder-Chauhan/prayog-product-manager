-- One Prayog workspace uses the original catalog owner's ID. Existing business rows stay in place.
create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager','employee')),
  accepted_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (owner_id,email),
  constraint normalized_email check (email=lower(trim(email)))
);
create index team_invitations_user_idx on public.team_invitations(accepted_user_id);
create index team_invitations_email_idx on public.team_invitations(email) where accepted_user_id is null;
alter table public.team_invitations enable row level security;
revoke all on public.team_invitations from anon,authenticated;

create function public.workspace_owner() returns uuid language sql stable security definer set search_path='' as $$
 select coalesce((select t.owner_id from public.team_invitations t where t.accepted_user_id=(select auth.uid()) limit 1),auth.uid())
$$;
create function public.workspace_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select t.role from public.team_invitations t where t.accepted_user_id=(select auth.uid()) limit 1),'owner')
$$;
revoke all on function public.workspace_owner(),public.workspace_role() from public,anon;
grant execute on function public.workspace_owner(),public.workspace_role() to authenticated;

create function public.workspace_context() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('owner_id',public.workspace_owner(),'role',public.workspace_role())
$$;
revoke all on function public.workspace_context() from public,anon;
grant execute on function public.workspace_context() to authenticated;

-- Invitations do not grant access until the invitee verifies the matching email and accepts.
create function public.invite_team_member(p_email text,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_email text:=lower(trim(p_email));
begin
 if auth.uid() is null or public.workspace_role()<>'owner' then raise exception 'Only the workspace owner can invite team members'; end if;
 if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_role not in ('manager','employee') then raise exception 'Valid email and role required'; end if;
 if v_email=lower((select u.email from auth.users u where u.id=auth.uid())) then raise exception 'You already own this workspace'; end if;
 insert into public.team_invitations(owner_id,email,role) values(auth.uid(),v_email,p_role)
 on conflict(owner_id,email) do update set role=excluded.role
 returning id into v_id;
 return v_id;
end$$;
create function public.accept_team_invite() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_email text; v_confirmed timestamptz; v_invite public.team_invitations%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select lower(u.email),u.email_confirmed_at into v_email,v_confirmed from auth.users u where u.id=auth.uid();
 if v_confirmed is null then raise exception 'Verify your email before joining'; end if;
 if exists(select 1 from public.team_invitations t where t.accepted_user_id=auth.uid()) then return public.workspace_context(); end if;
 select * into v_invite from public.team_invitations t where t.email=v_email and t.accepted_user_id is null order by t.created_at desc limit 1 for update;
 if not found then return public.workspace_context(); end if;
 -- An existing owner cannot accidentally leave a workspace containing business records.
 if exists(select 1 from public.products p where p.owner_id=auth.uid()) then raise exception 'This account already owns a product catalog'; end if;
 update public.team_invitations set accepted_user_id=auth.uid(),accepted_at=now() where id=v_invite.id;
 return public.workspace_context();
end$$;
create function public.list_team_members() returns table(id uuid,email text,role text,accepted boolean,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.workspace_role()<>'owner' then raise exception 'Only the workspace owner can manage the team'; end if;
 return query select t.id,t.email,t.role,t.accepted_user_id is not null,t.created_at from public.team_invitations t where t.owner_id=auth.uid() order by t.created_at desc;
end$$;
create function public.remove_team_member(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.workspace_role()<>'owner' then raise exception 'Only the workspace owner can remove team members'; end if;
 delete from public.team_invitations where id=p_id and owner_id=auth.uid();
 if not found then raise exception 'Team member not found'; end if;
end$$;
revoke all on function public.invite_team_member(text,text),public.accept_team_invite(),public.list_team_members(),public.remove_team_member(uuid) from public,anon;
grant execute on function public.invite_team_member(text,text),public.accept_team_invite(),public.list_team_members(),public.remove_team_member(uuid) to authenticated;

-- Employees use narrow RPCs, never direct table SELECT with costs or margin columns.
drop policy products_select on public.products;
create policy products_select on public.products for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy products_insert on public.products;
create policy products_insert on public.products for insert to authenticated with check(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager') and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select public.workspace_owner()))));
drop policy products_update on public.products;
create policy products_update on public.products for update to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager')) with check(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager') and (supplier_id is null or exists(select 1 from public.suppliers s where s.id=supplier_id and s.owner_id=(select public.workspace_owner()))));
drop policy suppliers_select on public.suppliers;
create policy suppliers_select on public.suppliers for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy suppliers_insert on public.suppliers;
create policy suppliers_insert on public.suppliers for insert to authenticated with check(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy suppliers_update on public.suppliers;
create policy suppliers_update on public.suppliers for update to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager')) with check(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy purchases_select on public.purchases;
create policy purchases_select on public.purchases for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated with check(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));
drop policy movements_select on public.stock_movements;
create policy movements_select on public.stock_movements for select to authenticated using(owner_id=(select public.workspace_owner()) and (select public.workspace_role()) in ('owner','manager'));

create function public.employee_products() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p) - array['owner_id','cost_price','amazon_price','flipkart_price','wholesale_price','supplier_id'] order by p.created_at desc),'[]'::jsonb)
 from public.products p where p.owner_id=public.workspace_owner() and auth.uid() is not null and public.workspace_role()='employee'
$$;
create function public.employee_orders() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(o) - array['owner_id','product_cost','packaging_cost','shipping_cost','marketplace_fee','discount'] order by o.created_at desc),'[]'::jsonb)
 from public.orders o where o.owner_id=public.workspace_owner() and auth.uid() is not null and public.workspace_role()='employee'
$$;
create function public.employee_movements() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'product_id',m.product_id,'quantity_delta',m.quantity_delta,'reason',m.reason,'note',m.note,'created_at',m.created_at) order by m.created_at desc),'[]'::jsonb)
 from public.stock_movements m where m.owner_id=public.workspace_owner() and auth.uid() is not null and public.workspace_role()='employee'
$$;
revoke all on function public.employee_products(),public.employee_orders(),public.employee_movements() from public,anon;
grant execute on function public.employee_products(),public.employee_orders(),public.employee_movements() to authenticated;

-- Signed URLs can read workspace images. Uploads are limited to managers and owner.
drop policy product_image_select on storage.objects;
create policy product_image_select on storage.objects for select to authenticated using(bucket_id='product-images' and (storage.foldername(name))[1]=(select public.workspace_owner())::text);
drop policy product_image_insert on storage.objects;
create policy product_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and (storage.foldername(name))[1]=(select public.workspace_owner())::text and (select public.workspace_role()) in ('owner','manager'));

-- Keep the original atomic stock/order operations, resolving the shared workspace first.
create or replace function public.create_order(p_product_id uuid,p_quantity integer,p_channel text,p_customer_name text,p_unit_price numeric,p_packaging_cost numeric,p_shipping_cost numeric,p_marketplace_fee numeric,p_discount numeric,p_note text) returns uuid language plpgsql security definer set search_path='' as $$declare v_owner uuid:=public.workspace_owner(); v_product public.products%rowtype;v_id uuid;begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_quantity is null or p_quantity<1 or p_unit_price is null or p_unit_price<0 or p_packaging_cost<0 or p_shipping_cost<0 or p_marketplace_fee<0 or p_discount<0 or p_discount>p_quantity*p_unit_price then raise exception 'Invalid order values';end if;
 select * into v_product from public.products where id=p_product_id and owner_id=v_owner for update;
 if not found then raise exception 'Product not found';end if;
 if v_product.stock_on_hand<p_quantity then raise exception 'Not enough stock available';end if;
 update public.products set stock_on_hand=stock_on_hand-p_quantity where id=p_product_id;
 insert into public.orders(owner_id,product_id,product_category,quantity,channel,customer_name,unit_price,total,product_cost,packaging_cost,shipping_cost,marketplace_fee,discount,note) values(v_owner,p_product_id,v_product.category,p_quantity,coalesce(nullif(p_channel,''),'Website'),nullif(p_customer_name,''),p_unit_price,p_quantity*p_unit_price-p_discount,p_quantity*v_product.cost_price,p_packaging_cost,p_shipping_cost,p_marketplace_fee,p_discount,p_note) returning id into v_id;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,-p_quantity,'Order',v_id::text);return v_id;end$$;
create or replace function public.change_order_status(p_order_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$declare v_owner uuid:=public.workspace_owner();v_order public.orders%rowtype;begin
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
create or replace function public.receive_purchase(p_product_id uuid,p_supplier_id uuid,p_quantity integer,p_unit_cost numeric,p_extra_cost numeric,p_note text) returns uuid language plpgsql security definer set search_path='' as $$declare v_owner uuid:=public.workspace_owner();v_id uuid;begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if public.workspace_role() not in ('owner','manager') then raise exception 'Manager access required';end if;
 if p_quantity is null or p_quantity<1 or p_unit_cost is null or p_unit_cost<0 or p_extra_cost is null or p_extra_cost<0 then raise exception 'Invalid purchase values';end if;
 if p_supplier_id is not null and not exists(select 1 from public.suppliers where id=p_supplier_id and owner_id=v_owner) then raise exception 'Supplier not found';end if;
 update public.products set stock_on_hand=stock_on_hand+p_quantity,cost_price=round(p_unit_cost+p_extra_cost/p_quantity,2) where id=p_product_id and owner_id=v_owner;
 if not found then raise exception 'Product not found';end if;
 insert into public.purchases(owner_id,product_id,supplier_id,quantity,unit_cost,extra_cost,note) values(v_owner,p_product_id,p_supplier_id,p_quantity,p_unit_cost,p_extra_cost,p_note) returning id into v_id;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,p_quantity,'Purchase',v_id::text);return v_id;end$$;
create or replace function public.adjust_stock(p_product_id uuid,p_delta integer,p_note text) returns void language plpgsql security definer set search_path='' as $$declare v_owner uuid:=public.workspace_owner();begin
 if v_owner is null then raise exception 'Sign in required';end if;
 if p_delta is null or p_delta=0 or nullif(trim(p_note),'') is null then raise exception 'Quantity and reason required';end if;
 update public.products set stock_on_hand=stock_on_hand+p_delta where id=p_product_id and owner_id=v_owner and stock_on_hand+p_delta>=0;
 if not found then raise exception 'Product not found or stock would be negative';end if;
 insert into public.stock_movements(owner_id,product_id,quantity_delta,reason,note) values(v_owner,p_product_id,p_delta,'Adjustment',p_note);end$$;
