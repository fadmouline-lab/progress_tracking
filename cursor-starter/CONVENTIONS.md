# Project Conventions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (CSS-based config in `globals.css`)
- **Components**: shadcn/ui (all components pre-installed)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Theme**: next-themes (light/dark/system)
- **Toasts**: Sonner (via `@/components/ui/sonner`)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Project Structure

```
src/
  app/                    # Next.js App Router
    layout.tsx            # Root layout (fonts, providers, metadata)
    page.tsx              # Landing page (/)
    loading.tsx           # Global loading state
    error.tsx             # Global error boundary
    (app)/                # Route group for authenticated/app pages
      layout.tsx          # App layout (sidebar + topbar)
      dashboard/          # /dashboard
        page.tsx
        loading.tsx
  components/
    ui/                   # shadcn/ui primitives (DO NOT edit directly)
    layout/               # Layout components (sidebar, topbar)
    providers.tsx          # Global providers (theme, tooltips, toaster)
    theme-toggle.tsx       # Dark mode toggle
  hooks/
    index.ts              # Barrel export for all hooks
    use-local-storage.ts  # Persistent state in localStorage
    use-media-query.ts    # Responsive breakpoint detection
    use-debounce.ts       # Debounce values
    use-mobile.ts         # Mobile detection (from shadcn)
  lib/
    utils.ts              # cn() utility for className merging
```

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files/folders | kebab-case | `use-local-storage.ts` |
| React components | PascalCase | `AppSidebar` |
| Hooks | camelCase with `use` prefix | `useLocalStorage` |
| Utilities | camelCase | `cn()` |
| CSS variables | kebab-case with `--` prefix | `--brand` |
| Route groups | parentheses | `(app)` |

## Adding New Pages

1. **App pages** (with sidebar): Add under `src/app/(app)/your-page/page.tsx`
2. **Public pages** (no sidebar): Add under `src/app/your-page/page.tsx`
3. Always add a `loading.tsx` for pages with data fetching
4. Add the route to `src/components/layout/app-sidebar.tsx` nav arrays

## Adding New Components

1. **UI primitives**: Use `npx shadcn@latest add <component>` — they go in `components/ui/`
2. **Feature components**: Create in `src/components/<feature>/` (e.g., `src/components/dashboard/stats-card.tsx`)
3. **Shared components**: Create in `src/components/` root level
4. Always use the `cn()` utility from `@/lib/utils` for conditional classes

## Styling Rules

- Use Tailwind utility classes exclusively — no custom CSS files per component
- Use design system tokens from `globals.css` (e.g., `bg-brand`, `text-muted-foreground`)
- Available semantic colors: `primary`, `secondary`, `muted`, `accent`, `destructive`, `brand`, `success`, `warning`, `info`
- Use `rounded-lg` (or `rounded-sm`, `rounded-md`, `rounded-xl`) for consistent border radius
- Use shadcn/ui components as building blocks rather than raw HTML elements

## Import Aliases

```ts
@/components  → src/components
@/lib         → src/lib
@/hooks       → src/hooks
@/app         → src/app
```

## Key Patterns

- **Client Components**: Add `"use client"` directive at the top when using hooks, event handlers, or browser APIs
- **Server Components**: Default — no directive needed. Prefer server components for data fetching
- **Providers**: All global providers are in `src/components/providers.tsx`
- **Toasts**: Use `import { toast } from "sonner"` then `toast.success("Done!")`
- **Animations**: Use Framer Motion's `motion` components for entrance/exit animations
