-- Realtime + missing trigger (run on fresh Supabase; skip lines that error if already applied)
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.scope_bullets;
alter publication supabase_realtime add table public.test_items;
alter publication supabase_realtime add table public.test_batches;
alter publication supabase_realtime add table public.task_assignees;

create trigger set_updated_at
before update on public.test_batches
for each row
execute function update_updated_at();
