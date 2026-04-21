-- Prevent duplicate test_items rows for the same task.
-- A task should produce at most one test_item row per project, regardless of
-- how many times the user toggles the task status back to waiting_review.
create unique index if not exists test_items_project_source_task_unique
  on public.test_items (project_id, source_task_id)
  where source_task_id is not null;
