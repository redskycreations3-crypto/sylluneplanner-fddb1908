export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          notes: string | null
          position: number
          priority: string
          progress: number
          revision: string
          status: string
          subject_id: string
          target_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          name: string
          notes?: string | null
          position?: number
          priority?: string
          progress?: number
          revision?: string
          status?: string
          subject_id: string
          target_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          position?: number
          priority?: string
          progress?: number
          revision?: string
          status?: string
          subject_id?: string
          target_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_goals: {
        Row: {
          created_at: string
          day: string
          goal_minutes: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          goal_minutes?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          goal_minutes?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_complete_minutes: number
          auto_complete_sessions: number
          auto_progress_enabled: boolean
          auto_progress_rule: string
          auto_start_in_progress: boolean
          avatar_emoji: string
          avatar_url: string | null
          bio: string | null
          break_minutes: number
          created_at: string
          daily_goal_minutes: number
          default_countdown_minutes: number
          default_timer_mode: string
          display_name: string
          id: string
          notify_daily_goal: boolean
          notify_revision: boolean
          notify_streak: boolean
          notify_timetable: boolean
          pomodoro_focus_minutes: number
          pomodoro_long_break_minutes: number
          pomodoro_presets: Json
          pomodoro_sessions_before_long: number
          pomodoro_short_break_minutes: number
          seeded: boolean
          streak_min_minutes: number
          theme: string
          updated_at: string
          weekly_goal_minutes: number
        }
        Insert: {
          auto_complete_minutes?: number
          auto_complete_sessions?: number
          auto_progress_enabled?: boolean
          auto_progress_rule?: string
          auto_start_in_progress?: boolean
          avatar_emoji?: string
          avatar_url?: string | null
          bio?: string | null
          break_minutes?: number
          created_at?: string
          daily_goal_minutes?: number
          default_countdown_minutes?: number
          default_timer_mode?: string
          display_name?: string
          id: string
          notify_daily_goal?: boolean
          notify_revision?: boolean
          notify_streak?: boolean
          notify_timetable?: boolean
          pomodoro_focus_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_presets?: Json
          pomodoro_sessions_before_long?: number
          pomodoro_short_break_minutes?: number
          seeded?: boolean
          streak_min_minutes?: number
          theme?: string
          updated_at?: string
          weekly_goal_minutes?: number
        }
        Update: {
          auto_complete_minutes?: number
          auto_complete_sessions?: number
          auto_progress_enabled?: boolean
          auto_progress_rule?: string
          auto_start_in_progress?: boolean
          avatar_emoji?: string
          avatar_url?: string | null
          bio?: string | null
          break_minutes?: number
          created_at?: string
          daily_goal_minutes?: number
          default_countdown_minutes?: number
          default_timer_mode?: string
          display_name?: string
          id?: string
          notify_daily_goal?: boolean
          notify_revision?: boolean
          notify_streak?: boolean
          notify_timetable?: boolean
          pomodoro_focus_minutes?: number
          pomodoro_long_break_minutes?: number
          pomodoro_presets?: Json
          pomodoro_sessions_before_long?: number
          pomodoro_short_break_minutes?: number
          seeded?: boolean
          streak_min_minutes?: number
          theme?: string
          updated_at?: string
          weekly_goal_minutes?: number
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          break_seconds: number
          chapter_id: string | null
          created_at: string
          duration_seconds: number
          ended_at: string
          id: string
          note: string | null
          session_type: string
          source: string
          started_at: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          break_seconds?: number
          chapter_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          note?: string | null
          session_type?: string
          source?: string
          started_at?: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          break_seconds?: number
          chapter_id?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          note?: string | null
          session_type?: string
          source?: string
          started_at?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          daily_goal_minutes: number
          icon: string
          id: string
          name: string
          position: number
          user_id: string
          weekly_goal_minutes: number
        }
        Insert: {
          color?: string
          created_at?: string
          daily_goal_minutes?: number
          icon?: string
          id?: string
          name: string
          position?: number
          user_id: string
          weekly_goal_minutes?: number
        }
        Update: {
          color?: string
          created_at?: string
          daily_goal_minutes?: number
          icon?: string
          id?: string
          name?: string
          position?: number
          user_id?: string
          weekly_goal_minutes?: number
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          note: string | null
          position: number
          reminder: boolean
          start_time: string
          subject_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          note?: string | null
          position?: number
          reminder?: boolean
          start_time?: string
          subject_id?: string | null
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          note?: string | null
          position?: number
          reminder?: boolean
          start_time?: string
          subject_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
