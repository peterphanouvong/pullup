-- Sticker avatars: a selfie cut out and die-cut on the phone, uploaded as
-- a PNG so crewmates can see it. The profile carries the public URL.

alter table public.profiles add column avatar_url text;

-- One public bucket; each user writes only inside their own folder
-- (`<user id>/sticker.png`). Reading is public: the URLs are unguessable
-- enough for a sticker, and it keeps crew screens to a plain image load.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png'])
on conflict (id) do nothing;

create policy "avatars are public to read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
