# Prompting Guide for Cursor AI

Tips for getting the best results when prompting Cursor's AI in this codebase.

## Adding New Pages

```
Prompt: "Create a /settings page with a form for updating user profile
(name, email, avatar). Use the app layout with sidebar. Add form
validation with zod."
```

Key context to include:
- New app pages go in `src/app/(app)/your-page/page.tsx` (inherits sidebar layout)
- New public pages go in `src/app/your-page/page.tsx` (standalone)
- Mention "add it to the sidebar nav" if you want it linked

## Building Features

```
Prompt: "Add a notification bell to the topbar that shows a dropdown
with recent notifications. Use the DropdownMenu and Badge components."
```

Key context to include:
- Reference specific shadcn/ui components by name (Button, Card, Dialog, etc.)
- All shadcn/ui components are already installed at `@/components/ui/`
- Use `lucide-react` for icons

## Creating Forms

```
Prompt: "Create a contact form with name, email, and message fields.
Use react-hook-form with zod validation. Show success toast on submit."
```

- React Hook Form and Zod are already installed
- shadcn Form components are at `@/components/ui/form`
- Toasts: `import { toast } from "sonner"`

## Data Display

```
Prompt: "Create a data table for the users page with columns for name,
email, role, and status. Add sorting and filtering."
```

- shadcn Table is at `@/components/ui/table`
- Use Card components for stat displays
- Recharts is installed for charts

## Styling Tips for Prompts

- Say "use Tailwind classes" — the AI sometimes tries to create CSS modules
- Say "use the existing design system colors" for consistent look
- Reference specific tokens: `bg-brand`, `text-muted-foreground`, `border-border`
- Say "use the cn() utility" for conditional classes

## Common Prompt Patterns

### New CRUD feature
```
"Create a [resource] management page at /dashboard/[resource] with:
- A data table listing all [resources]
- A dialog/sheet for creating new [resources]
- Edit and delete actions per row
- Use Card, Table, Dialog, Button from shadcn/ui
- Add the route to the sidebar nav"
```

### New dashboard widget
```
"Add a [widget name] card to the dashboard page that shows [data].
Use the Card component and match the existing stat card style."
```

### API integration
```
"Create a server action in src/app/(app)/[feature]/actions.ts that
[does something]. Call it from the client component using useTransition."
```

## What NOT to Do

- Don't ask the AI to install shadcn components — they're ALL already installed
- Don't ask for CSS modules or styled-components — this project uses Tailwind only
- Don't ask for Pages Router patterns — this uses App Router exclusively
- Don't create new utility functions that duplicate what `@/lib/utils.ts` or the hooks already provide
