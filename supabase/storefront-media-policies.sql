-- Applied migration: storefront_media_staff_uploads
create policy storefront_media_staff_insert on storage.objects for insert to authenticated with check (bucket_id='storefront-media' and (storage.foldername(name))[1]=(select public.workspace_owner())::text and (select public.workspace_role()) in ('owner','manager'));
create policy storefront_media_staff_select on storage.objects for select to authenticated using (bucket_id='storefront-media' and (storage.foldername(name))[1]=(select public.workspace_owner())::text and (select public.workspace_role()) in ('owner','manager'));
