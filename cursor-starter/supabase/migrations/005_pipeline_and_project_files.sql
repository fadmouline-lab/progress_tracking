-- Long-running project pipeline (ideas / backlog lines)
create table public.project_pipeline_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

create index project_pipeline_entries_project_id_created_at_idx
  on public.project_pipeline_entries (project_id, created_at desc);

-- Metadata for files in storage bucket project-files
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  display_name text not null,
  storage_path text not null unique,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

create index project_files_project_id_created_at_idx
  on public.project_files (project_id, created_at desc);

alter table public.project_pipeline_entries enable row level security;
alter table public.project_files enable row level security;

create policy "Authenticated access"
  on public.project_pipeline_entries for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated access"
  on public.project_files for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Private bucket: clients use signed URLs to download
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "Authenticated access project-files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'project-files')
  with check (bucket_id = 'project-files');

alter publication supabase_realtime add table public.project_pipeline_entries;
alter publication supabase_realtime add table public.project_files;
