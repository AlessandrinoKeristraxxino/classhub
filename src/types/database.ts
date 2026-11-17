export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      lessons: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          subject: string;
          date: string;
          description: string;
          chapters: Json;
          attachment_path: string | null;
          attachment_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          subject: string;
          date: string;
          description: string;
          chapters?: Json;
          attachment_path?: string | null;
          attachment_name?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          subject?: string;
          date?: string;
          description?: string;
          chapters?: Json;
          attachment_path?: string | null;
          attachment_name?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          email: string;
          display_name: string;
          avatar_path: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          display_name?: string;
          avatar_path?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          display_name?: string;
          avatar_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          permission_key: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          permission_key: string;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          permission_key?: string;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          assigned_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          starts_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string;
          starts_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string;
          starts_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dashboard_blocks: {
        Row: {
          id: string;
          block_type: string;
          title: string;
          body: string;
          link_url: string | null;
          link_label: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          block_type: string;
          title: string;
          body?: string;
          link_url?: string | null;
          link_label?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          block_type?: string;
          title?: string;
          body?: string;
          link_url?: string | null;
          link_label?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_classhub_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_classhub_permission: {
        Args: { permission_name: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
