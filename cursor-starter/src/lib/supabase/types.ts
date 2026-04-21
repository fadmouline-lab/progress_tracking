export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      scope_bullets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          content: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          content: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          content?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          priority: number;
          status: string;
          is_pinned: boolean | null;
          created_by: string | null;
          sort_order: number;
          review_platform: string | null;
          review_role: string | null;
          review_page: string | null;
          review_test_step: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          priority?: number;
          status?: string;
          is_pinned?: boolean | null;
          created_by?: string | null;
          sort_order?: number;
          review_platform?: string | null;
          review_role?: string | null;
          review_page?: string | null;
          review_test_step?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          priority?: number;
          status?: string;
          is_pinned?: boolean | null;
          created_by?: string | null;
          sort_order?: number;
          review_platform?: string | null;
          review_role?: string | null;
          review_page?: string | null;
          review_test_step?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_assignees: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      test_items: {
        Row: {
          id: string;
          project_id: string;
          tab: string;
          source_task_id: string | null;
          platform: string | null;
          role: string | null;
          account: string | null;
          page_tab: string | null;
          test_step: string | null;
          result: string;
          comments: string | null;
          fix: string | null;
          sort_order: number;
          completed_at: string | null;
          checklist_batch_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          tab: string;
          source_task_id?: string | null;
          platform?: string | null;
          role?: string | null;
          account?: string | null;
          page_tab?: string | null;
          test_step?: string | null;
          result?: string;
          comments?: string | null;
          fix?: string | null;
          sort_order?: number;
          completed_at?: string | null;
          checklist_batch_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          tab?: string;
          source_task_id?: string | null;
          platform?: string | null;
          role?: string | null;
          account?: string | null;
          page_tab?: string | null;
          test_step?: string | null;
          result?: string;
          comments?: string | null;
          fix?: string | null;
          sort_order?: number;
          completed_at?: string | null;
          checklist_batch_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      test_batches: {
        Row: {
          id: string;
          project_id: string;
          submitted_by: string | null;
          submitted_at: string;
          batch_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          submitted_by?: string | null;
          submitted_at?: string;
          batch_type: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          submitted_by?: string | null;
          submitted_at?: string;
          batch_type?: string;
          created_at?: string;
        };
      };
    };
  };
}
