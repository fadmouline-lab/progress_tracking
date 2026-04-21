-- USERS (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROJECT MEMBERS (join table)
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member', -- 'owner' | 'member'
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- SCOPE BULLETS (the summary bullets on each user's scope card)
create table public.scope_bullets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TASKS (central task entity — used across Scope, Progress, and Test tabs)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  priority integer not null default 3 check (priority between 1 and 5),
    -- 1 = Critical/Breaking
    -- 2 = Priority
    -- 3 = UX Improvement
    -- 4 = Cosmetic/UI only
    -- 5 = Can Wait (V2)
  status text not null default 'assigned' check (status in ('assigned','working_on','waiting_review','completed')),
  is_pinned boolean default false,
  created_by uuid references public.profiles(id),
  sort_order integer not null default 0,
  -- Fields that appear when status = 'waiting_review'
  review_platform text check (review_platform in ('mobile','web')),
  review_role text check (review_role in ('super','foreman','admin','project_manager','other')),
  review_page text,
  review_test_step text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TASK ASSIGNEES (a task can be assigned to 1+ users)
create table public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, user_id)
);

-- TEST CHECKLIST ITEMS
create table public.test_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  tab text not null check (tab in ('core','new','completed')),
  source_task_id uuid references public.tasks(id) on delete set null, -- if auto-populated from progress
  platform text check (platform in ('mobile','web')),
  role text check (role in ('super','foreman','admin','project_manager','other')),
  account text, -- free-text label for the specific account used
  page_tab text,
  test_step text,
  result text default 'pending' check (result in ('pending','pass','fail','fixed')),
  comments text,
  fix text,
  sort_order integer not null default 0,
  completed_at timestamptz,
  -- When a "New Feature" row passes/fixes → it can be marked complete
  -- When a "Core" checklist is submitted → store the batch id
  checklist_batch_id uuid, -- groups rows belonging to one "Close and Submit" session
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TEST CHECKLIST BATCHES (each "Close and Submit" creates one)
create table public.test_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz default now(),
  batch_type text not null check (batch_type in ('core','new')),
  created_at timestamptz default now()
);

-- AUTO-UPDATE updated_at TRIGGER
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to all tables with updated_at
create trigger set_updated_at before update on public.profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function update_updated_at();
create trigger set_updated_at before update on public.scope_bullets for each row execute function update_updated_at();
create trigger set_updated_at before update on public.tasks for each row execute function update_updated_at();
create trigger set_updated_at before update on public.test_items for each row execute function update_updated_at();

-- ROW LEVEL SECURITY (basic — all authenticated users can do everything, this is an internal tool)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.scope_bullets enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.test_items enable row level security;
alter table public.test_batches enable row level security;

-- Policies: any authenticated user can CRUD (small trusted team)
create policy "Authenticated access" on public.profiles for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.projects for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.project_members for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.scope_bullets for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.tasks for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.task_assignees for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.test_items for all using (auth.role() = 'authenticated');
create policy "Authenticated access" on public.test_batches for all using (auth.role() = 'authenticated');
