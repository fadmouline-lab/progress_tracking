import type { Database } from "@/lib/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"];
export type ScopeBullet = Database["public"]["Tables"]["scope_bullets"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskAssignee = Database["public"]["Tables"]["task_assignees"]["Row"];
export type TestItem = Database["public"]["Tables"]["test_items"]["Row"];
export type TestBatch = Database["public"]["Tables"]["test_batches"]["Row"];

export type ProjectWithMeta = Project & {
  member_count: number;
};

export type TaskWithAssignees = Task & {
  task_assignees: Pick<TaskAssignee, "id" | "user_id" | "task_id">[];
};
