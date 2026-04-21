export const PRIORITIES = [
  {
    value: 1,
    label: "Critical/Breaking",
    color: "red",
    bgClass: "bg-red-500",
    textClass: "text-red-500",
  },
  {
    value: 2,
    label: "Priority",
    color: "orange",
    bgClass: "bg-orange-500",
    textClass: "text-orange-500",
  },
  {
    value: 3,
    label: "UX Improvement",
    color: "yellow",
    bgClass: "bg-yellow-500",
    textClass: "text-yellow-500",
  },
  {
    value: 4,
    label: "Cosmetic/UI only",
    color: "blue",
    bgClass: "bg-blue-400",
    textClass: "text-blue-400",
  },
  {
    value: 5,
    label: "Can Wait (V2)",
    color: "gray",
    bgClass: "bg-zinc-400",
    textClass: "text-zinc-400",
  },
] as const;

export const TASK_STATUSES = [
  "assigned",
  "working_on",
  "waiting_review",
  "completed",
] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  working_on: "Working On",
  waiting_review: "Waiting on Review",
  completed: "Completed",
};

export const PLATFORMS = ["mobile", "web"] as const;
export const ROLES = [
  "super",
  "foreman",
  "admin",
  "project_manager",
  "shop_manager",
  "other",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  super: "Super",
  foreman: "Foreman",
  admin: "Admin",
  project_manager: "Project Manager",
  shop_manager: "Shop Manager",
  other: "Other",
};

export const TEST_RESULTS = ["pending", "pass", "fail", "fixed"] as const;

export type TestResult = (typeof TEST_RESULTS)[number];

export const TEST_RESULT_LABELS: Record<string, string> = {
  pending: "Pending",
  pass: "Pass",
  fail: "Fail",
  fixed: "Fixed",
};

/** Tailwind classes for result dropdown / badges (functional color) */
export const TEST_RESULT_STYLES: Record<
  string,
  { trigger: string; badge: string }
> = {
  pending: {
    trigger: "border-muted-foreground/30",
    badge: "bg-muted text-muted-foreground",
  },
  pass: {
    trigger: "border-emerald-500/40",
    badge: "bg-emerald-600 text-white",
  },
  fail: {
    trigger: "border-destructive/50",
    badge: "bg-destructive text-destructive-foreground",
  },
  fixed: {
    trigger: "border-sky-500/40",
    badge: "bg-sky-600 text-white",
  },
};

export const TEST_CHECKLIST_SUBTABS = [
  { id: "new" as const, label: "New Features" },
  { id: "core" as const, label: "Core Features" },
  { id: "completed" as const, label: "Completed" },
];
