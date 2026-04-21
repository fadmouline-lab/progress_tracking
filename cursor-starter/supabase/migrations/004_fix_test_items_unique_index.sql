-- Replace the partial unique index with a full one so that
-- ON CONFLICT (project_id, source_task_id) works from the Supabase client.
-- Postgres treats NULL as distinct for uniqueness, so rows with
-- source_task_id IS NULL (manually-added items) still coexist freely.
drop index if exists public.test_items_project_source_task_unique;

create unique index test_items_project_source_task_unique
  on public.test_items (project_id, source_task_id);
