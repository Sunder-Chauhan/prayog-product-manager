-- This installation has one established Prayog catalog. New accounts must join by invitation.
create or replace function public.workspace_owner() returns uuid language sql stable security definer set search_path='' as $$
 select coalesce(
  (select t.owner_id from public.team_invitations t where t.accepted_user_id=(select auth.uid()) limit 1),
  (select p.owner_id from public.products p where p.owner_id=(select auth.uid()) limit 1)
 )
$$;
create or replace function public.workspace_role() returns text language sql stable security definer set search_path='' as $$
 select coalesce(
  (select t.role from public.team_invitations t where t.accepted_user_id=(select auth.uid()) limit 1),
  (select 'owner'::text from public.products p where p.owner_id=(select auth.uid()) limit 1),
  'unassigned'
 )
$$;
