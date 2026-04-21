-- Storage for profile avatars and project logos (run after 001; not duplicated in spec schema file)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

create policy "Authenticated access avatars"
on storage.objects for all
to authenticated
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

create policy "Authenticated access project-logos"
on storage.objects for all
to authenticated
using (bucket_id = 'project-logos')
with check (bucket_id = 'project-logos');
