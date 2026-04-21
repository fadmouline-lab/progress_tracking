## Context

We have a **Next.js 16** starter (React 19, TypeScript, Tailwind 4, shadcn/ui) inside `cursor-starter/`. The app router lives at `src/app/`, UI primitives are already in `src/components/ui/`, and layout components (sidebar, topbar) are in `src/components/layout/`. We need to turn this into a **Team Development Progress Tracking** tool — think of it as "a few spreadsheets on steroids" for a small internal team.

---

## 1 — Tech Stack & Architecture Decisions

Use the following stack. Do NOT introduce anything outside this list unless explicitly told to:

| Layer | Choice |
|---|---|
| Framework | Next.js App Router (already set up) |
| Language | TypeScript (strict) |
| Styling | Tailwind 4 + shadcn/ui components already in repo |
| Database | **Supabase** (Postgres) — hosted BaaS |
| Auth | **Supabase Auth** with **Magic Link** (email-based passwordless login) |
| ORM / Client | `@supabase/supabase-js` — use the **Supabase client** directly, no Prisma |
| Real-time | Supabase Realtime subscriptions (for auto-save & live sync) |
| State | React state + Supabase real-time — NO global state libraries |
| Drag & Drop / Reorder | `@dnd-kit/core` + `@dnd-kit/sortable` (for task reordering) |
| Animations | `framer-motion` (for slide/swoosh transitions described in spec) |
| File uploads | Supabase Storage (project logos, profile pictures) |
| Deployment | Vercel (default Next.js target) |

### Key Architectural Principles

- **Auto-save everything.** No "Save" button anywhere. Every mutation (typing, reordering, status change) debounces 500ms then writes to Supabase. Use the `useDebounce` hook already in `src/hooks/`.
- **Optimistic UI.** Update local state immediately, sync to DB in background. Roll back on error with a toast.
- **Real-time sync.** Subscribe to Supabase Realtime on project-scoped channels so all team members see changes live.
- **Scoped by project.** Almost every query filters by `project_id`. Users are scoped per-project via a `project_members` join table.
- **Keep it simple.** This is an internal tool for a very small team. Don't over-engineer. Prefer flat components over deep abstraction. Minimal route nesting. One context provider for the current project.

---

## 2 — Supabase Database Schema

Create a migration file at `cursor-starter/supabase/migrations/001_initial_schema.sql` with the following schema. Use UUIDs for all primary keys. Add `created_at` and `updated_at` (with trigger) to every table.

```sql
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
```

---

## 3 — File & Folder Structure

Create the following structure inside `cursor-starter/src/`. Keep it flat and simple. Do NOT create barrel files or excessive abstractions.

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (providers, fonts, global styles)
│   ├── page.tsx                    # Landing / redirect to /login or /home
│   ├── globals.css
│   ├── login/
│   │   └── page.tsx                # Magic link login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts            # Supabase auth callback handler
│   ├── onboarding/
│   │   └── page.tsx                # First-time setup: name, password, avatar
│   ├── home/
│   │   └── page.tsx                # "Select Project" / "Create Project" — 2 big buttons
│   └── project/
│       └── [projectId]/
│           ├── layout.tsx          # Project shell: tabs (Scope, Progress, Test Checklist)
│           ├── page.tsx            # Redirects to /scope
│           ├── scope/
│           │   └── page.tsx
│           ├── progress/
│           │   └── page.tsx
│           └── test-checklist/
│               └── page.tsx
├── components/
│   ├── ui/                         # (EXISTING — shadcn primitives, do not touch)
│   ├── layout/                     # (EXISTING — sidebar, topbar)
│   ├── providers.tsx               # (EXISTING — extend with Supabase + ProjectProvider)
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── onboarding-form.tsx
│   ├── home/
│   │   ├── project-selector.tsx    # List of all projects
│   │   └── create-project-dialog.tsx
│   ├── project/
│   │   ├── project-tabs.tsx        # Tab navigation: Scope | Progress | Test Checklist
│   │   └── project-header.tsx      # Project name + logo at top
│   ├── scope/
│   │   ├── scope-view.tsx          # Main scope tab container
│   │   ├── user-scope-card.tsx     # One card per user: bullets + dropdown task list
│   │   ├── scope-bullet.tsx        # Individual editable bullet
│   │   └── task-input-bar.tsx      # Centered text field for creating & assigning tasks
│   ├── progress/
│   │   ├── progress-view.tsx       # Main progress tab container
│   │   ├── user-progress-card.tsx  # Clickable card showing user name + pic
│   │   ├── task-board.tsx          # 4-column board for a user's tasks
│   │   ├── task-row.tsx            # Single task row with arrow controls + pin
│   │   └── review-fields.tsx       # Platform/Role/Page/Step fields for "waiting_review"
│   ├── test-checklist/
│   │   ├── test-checklist-view.tsx # Main container with subtabs
│   │   ├── test-subtabs.tsx        # Core Features / New Features / Completed
│   │   ├── test-table.tsx          # Spreadsheet-like table of test items
│   │   ├── test-row.tsx            # Single row: Platform, Role, Account, Page, Step, Result, Comments, Fix
│   │   └── completed-list.tsx      # Completed batches / completed new-feature items
│   └── shared/
│       ├── priority-badge.tsx      # Color-coded priority label (1-5)
│       ├── user-avatar.tsx         # Avatar + name component
│       ├── confirm-dialog.tsx      # Reusable "Are you sure?" dialog
│       └── auto-save-indicator.tsx # Small dot/spinner in corner showing save state
├── lib/
│   ├── utils.ts                    # (EXISTING)
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client (createBrowserClient)
│   │   ├── server.ts              # Server Supabase client (createServerClient for RSC / route handlers)
│   │   ├── middleware.ts          # Session refresh middleware
│   │   └── types.ts               # Generated DB types (from Supabase CLI or manual)
│   └── constants.ts               # Priority labels, status labels, color maps
├── hooks/
│   ├── index.ts                    # (EXISTING)
│   ├── use-debounce.ts            # (EXISTING — use for auto-save)
│   ├── use-project.ts             # Hook: get current project context
│   ├── use-tasks.ts               # Hook: CRUD tasks with real-time subscription
│   ├── use-scope-bullets.ts       # Hook: CRUD scope bullets with real-time
│   ├── use-test-items.ts          # Hook: CRUD test checklist items with real-time
│   └── use-auto-save.ts           # Hook: debounced Supabase upsert wrapper
└── types/
    └── index.ts                    # App-level TypeScript types (Project, Task, TestItem, etc.)
```

---

## 4 — Supabase Client Setup

### `src/lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `src/lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### `src/lib/supabase/middleware.ts`
Create a Next.js middleware at `cursor-starter/src/middleware.ts` that:
1. Refreshes the Supabase session on every request.
2. Redirects unauthenticated users to `/login` (except for `/login` and `/auth/callback`).
3. Redirects authenticated users away from `/login` to `/home`.
4. Redirects authenticated users whose profile has no `full_name` to `/onboarding`.

---

## 5 — Auth Flow

### Login page (`/login`)
- Clean centered card with email input and "Send Magic Link" button.
- Calls `supabase.auth.signInWithOtp({ email })`.
- Shows "Check your email" confirmation message after sending.
- No password field on login. Password is set optionally during onboarding.

### Auth callback (`/auth/callback/route.ts`)
- Exchanges the `code` query param for a session via `supabase.auth.exchangeCodeForSession(code)`.
- Creates a `profiles` row if one doesn't exist (upsert using `auth.users.id`).
- Redirects to `/onboarding` if profile is incomplete, else `/home`.

### Onboarding (`/onboarding`)
- Only shown once (on first login, when `full_name` is null).
- Fields: Full Name (required), Password (optional — `supabase.auth.updateUser({ password })`), Avatar upload (Supabase Storage bucket `avatars`).
- On submit → update profile → redirect to `/home`.

### Profile editing
- Small avatar icon in top-right of app (topbar).
- Clicking opens a dropdown/popover with: name, avatar upload, password change.
- All changes auto-save on blur / after debounce.

---

## 6 — Home Page (`/home`)

Two large centered buttons, vertically stacked or side by side on desktop:

1. **Select Project** — opens a list/grid of all projects. Each project card shows: logo, name, member count. Clicking a project navigates to `/project/[projectId]/scope`.
2. **Create Project** — opens a dialog/modal with: project name input, logo upload (Supabase Storage bucket `project-logos`), "Create" button. On create → insert project + add current user as `owner` in `project_members` → navigate to `/project/[projectId]/scope`.

---

## 7 — Project View (`/project/[projectId]`)

### Layout
- **Project header**: logo + project name at top.
- **Tab bar** directly below: `Scope` | `Progress` | `Test Checklist`.
- Tabs are URL-based routes (not client-side tabs): `/project/[id]/scope`, `/project/[id]/progress`, `/project/[id]/test-checklist`.
- Wrap the project layout in a `ProjectProvider` context that fetches and holds: project details, project members, and provides `projectId` to all children.

---

### 7A — Scope Tab (`/project/[id]/scope`)

**Layout:**

1. **Centered task input bar** at the top — a text field where any user can type a new task. Below/beside the text field:
   - A multi-select of project members (to assign the task to 1+ users).
   - A priority dropdown (1–5, color-coded, labeled):
     - `1` — Red — "Critical/Breaking"
     - `2` — Orange — "Priority"
     - `3` — Yellow — "UX Improvement"
     - `4` — Blue — "Cosmetic/UI only"
     - `5` — Gray — "Can Wait (V2)"
   - After filling in text + assignees + priority → pressing Enter or clicking "Add" creates the task and it **slides** (animated with framer-motion) under each assigned user's card.

2. **User scope cards** — one per project member, arranged in a responsive grid. Each card contains:
   - User avatar + name at top.
   - **Scope bullets**: an editable bullet list summarizing what this user is supposed to work on. Users can add, remove, and drag-to-reorder bullets. Each bullet auto-saves on edit. Use `@dnd-kit` for reordering.
   - **Expandable task dropdown** (collapsed by default): clicking a toggle slides open a list of tasks currently assigned to this user (status = `assigned`), sorted by priority. Each task shows title + priority badge. This is a read-only reference list in the Scope tab (editing happens in Progress tab).

---

### 7B — Progress Tab (`/project/[id]/progress`)

**Layout:**

1. **User cards grid** at the top — one card per project member (avatar + name). Clicking a card expands/selects it and reveals that user's task board below.

2. **Task board** (for the selected user) — four columns displayed as a **list/table**, NOT a Kanban board. Think of it as a table where each row is a task, and the "column" is a status indicator. Columns:
   - `Assigned` | `Working On` | `Waiting on Review` | `Completed`

   Each task row contains:
   - **Left icon**: a pin icon — clicking it pins/unpins the task to the top of the list. Pinned tasks always sort to the top, then sort by priority.
   - **Task title** + **priority badge** (color-coded).
   - **Arrow controls** (left ← and right →): clicking right moves the task to the next status column. Clicking left moves it back. The row **slides** horizontally (framer-motion `layoutId` or `AnimatePresence`) to visually indicate the status change.
   - When a task reaches `Completed`, the row animates/slides all the way to the bottom of the list.
   - Statuses can always be moved back and forth. Nothing is ever locked.

   **When a task is in "Waiting on Review" status**, two dropdowns and two text inputs appear below the row:
   - Dropdown: **Platform** — `Mobile` | `Web`
   - Dropdown: **User Account / Role** — `Super` | `Foreman` | `Admin` | `Project Manager` | `Other`
   - Text input: **Page/Tab**
   - Text input: **Test Step**
   - These fields auto-save and are stored on the `tasks` table (`review_platform`, `review_role`, `review_page`, `review_test_step`).

3. **Add task button** (`+`): visible within each user's task board. Clicking it opens a small inline form to add a task directly to that user. Fields: title, priority. The task is created with `status = 'assigned'` and assigned to the currently viewed user.

---

### 7C — Test Checklist Tab (`/project/[id]/test-checklist`)

**Three subtabs:** `Core Features` | `New Features` | `Completed`

Each subtab is essentially a **spreadsheet** — a table with the following columns:
| Platform | Role | Account | Page/Tab | Test Step | Result | Comments | Fix |
|----------|------|---------|----------|-----------|--------|----------|-----|

- **Platform**: dropdown — `Mobile` | `Web`
- **Role**: dropdown — `Super` | `Foreman` | `Admin` | `Project Manager` | `Other`
- **Account**: text input (free text for the specific test account used)
- **Page/Tab**: text input
- **Test Step**: text input
- **Result**: dropdown — `Pending` | `Pass` | `Fail` | `Fixed` (color-coded: green/red/blue/gray)
- **Comments**: text input (expandable)
- **Fix**: text input (expandable — describes what was done to fix a failing test)

#### Core Features subtab
- A persistent spreadsheet of core features to test with every major release.
- Users can add rows with a `+` button (top or bottom of table).
- All fields are editable and auto-save.
- At the bottom: a **"Close and Submit"** button.
  - This button is **disabled** unless every row's Result is either `Pass` or `Fixed`.
  - On click: creates a `test_batches` entry, tags all rows with that `checklist_batch_id`, moves them to the Completed tab, and resets the Core Features subtab for the next round (or keeps rows as templates — decide based on UX feel, but the completed snapshot should be preserved).

#### New Features subtab
- Same spreadsheet layout.
- Users can manually add rows with `+`.
- **Auto-populate**: any task in the Progress tab that has `status = 'waiting_review'` AND has `review_platform`, `review_role`, `review_page`, `review_test_step` filled in should automatically create a corresponding row in this subtab with those fields pre-filled. Use a Supabase real-time subscription or a check-on-load to sync.
  - Store `source_task_id` on the test item so we know where it came from and avoid duplicates.
- When a row is marked `Pass` or `Fixed`, show a **confirmation dialog**: "Want to mark this complete?"
  - If yes: animate the row away (swoosh), move the test item to `tab = 'completed'`, and if there's a `source_task_id`, update the source task to `status = 'completed'` in the Progress tab.

#### Completed subtab
- Displays two types of completed items:
  1. **Completed test batches** (from Core Features "Close and Submit") — each batch is a clickable row showing the submission date and who submitted. Clicking expands/opens the full checklist snapshot (read-only by default, but can be edited).
  2. **Completed new feature items** — individual rows. Clicking a completed new-feature row shows a dialog: "Do you want to restore this row and clear the Fix field?" — if yes, moves the item back to `tab = 'new'` with `result = 'pending'` and `fix = null`.

---

## 8 — Auto-Save Pattern

Implement a reusable `useAutoSave` hook:

```ts
function useAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  delayMs = 500
) {
  // 1. Debounce the value using the existing useDebounce hook.
  // 2. On debounced value change, call saveFn.
  // 3. Track save state: 'idle' | 'saving' | 'saved' | 'error'.
  // 4. Return { saveState }.
}
```

Use an `AutoSaveIndicator` component in the topbar/corner that shows:
- Nothing when idle.
- A small spinner or pulsing dot when saving.
- A brief checkmark when saved.
- A red dot on error (with a retry option on hover).

---

## 9 — Constants & Priority System

### `src/lib/constants.ts`

```ts
export const PRIORITIES = [
  { value: 1, label: 'Critical/Breaking', color: 'red',    bgClass: 'bg-red-500',    textClass: 'text-red-500' },
  { value: 2, label: 'Priority',          color: 'orange', bgClass: 'bg-orange-500',  textClass: 'text-orange-500' },
  { value: 3, label: 'UX Improvement',    color: 'yellow', bgClass: 'bg-yellow-500',  textClass: 'text-yellow-500' },
  { value: 4, label: 'Cosmetic/UI only',  color: 'blue',   bgClass: 'bg-blue-400',    textClass: 'text-blue-400' },
  { value: 5, label: 'Can Wait (V2)',     color: 'gray',   bgClass: 'bg-zinc-400',    textClass: 'text-zinc-400' },
] as const

export const TASK_STATUSES = ['assigned', 'working_on', 'waiting_review', 'completed'] as const

export const TASK_STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  working_on: 'Working On',
  waiting_review: 'Waiting on Review',
  completed: 'Completed',
}

export const PLATFORMS = ['mobile', 'web'] as const
export const ROLES = ['super', 'foreman', 'admin', 'project_manager', 'other'] as const

export const ROLE_LABELS: Record<string, string> = {
  super: 'Super',
  foreman: 'Foreman',
  admin: 'Admin',
  project_manager: 'Project Manager',
  other: 'Other',
}
```

---

## 10 — UI / UX Guidelines

- **Simple, clean, utilitarian.** This is a productivity tool, not a marketing site. Use the existing shadcn components.
- **Color is functional**, not decorative. Priority colors should be the main color accents. Otherwise keep the palette neutral (shadcn defaults are fine).
- **Animations should be purposeful** — the "slide" when a task moves between statuses, the "swoosh" when a completed row disappears, the expand/collapse of scope dropdowns. Use `framer-motion`'s `layout` animations and `AnimatePresence`.
- **No empty states without guidance.** Every empty list should show a subtle message: "No tasks yet — add one above" or similar.
- **Responsive but desktop-first.** This will primarily be used on desktop. Make it usable on tablet. Don't worry about phone optimization.
- **Keyboard accessible.** Tab between fields, Enter to submit, Escape to cancel.

---

## 11 — Environment Variables

Create a `.env.local.example` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 12 — Implementation Order

Build in this order. Each step should result in a working (if incomplete) app:

1. **Supabase setup**: install `@supabase/supabase-js` and `@supabase/ssr`. Create client files. Set up middleware. Create the migration SQL file.
2. **Auth flow**: login page, callback route, onboarding page, middleware redirects. Get magic link working end-to-end.
3. **Home page**: project list, create project dialog. Navigation to `/project/[id]`.
4. **Project layout**: tabs, project context provider, header.
5. **Scope tab**: user cards with scope bullets (CRUD + reorder), task input bar with assign + priority, expandable task list.
6. **Progress tab**: user cards, task board with status arrows, pin functionality, review fields on "waiting_review", add task button.
7. **Test Checklist tab**: Core Features subtab with spreadsheet table, add row, Close and Submit. Then New Features with auto-populate from Progress. Then Completed subtab.
8. **Auto-save + real-time**: wire up debounced saves and Supabase Realtime subscriptions across all tabs.
9. **Animations**: add framer-motion transitions for task slides, swooshes, expand/collapse.
10. **Polish**: empty states, loading states, error handling, profile editing dropdown.

---

## 13 — Dependencies to Install

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Do NOT:
- Create a `lib/api/` folder or API route layer for DB operations. Use Supabase client directly in hooks and server components.
- Add a global state library (Redux, Zustand, Jotai). Use React state + context + Supabase Realtime.
- Over-abstract. No factory patterns, no generic CRUD builders, no "entity" abstractions. Write specific hooks for specific features.
- Add analytics, error tracking, or monitoring at this stage.
- Change the existing shadcn/ui component files. Use them as-is.
- Create tests at this stage. We'll add them later.

---

**Start with step 1 (Supabase setup + migration file) and step 2 (auth flow). Ask me if anything in this spec is unclear before building.**