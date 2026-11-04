-- Crew cover photos: any member can set one; it's the face of the crew's
-- card on the Crew tab.

alter table public.crews add column cover_url text;

create policy "crew members update their crew"
  on public.crews for update to authenticated
  using (public.is_crew_member(id))
  with check (public.is_crew_member(id));

-- One public bucket, a folder per crew (`<crew id>/cover.jpg`), writable by
-- that crew's members.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "covers are public to read"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "crew members upload their crew cover"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_crew_member(((storage.foldername(name))[1])::uuid));

create policy "crew members replace their crew cover"
  on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_crew_member(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'covers' and public.is_crew_member(((storage.foldername(name))[1])::uuid));

create policy "crew members delete their crew cover"
  on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_crew_member(((storage.foldername(name))[1])::uuid));
