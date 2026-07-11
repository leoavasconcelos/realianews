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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      crawl_monitor_runs: {
        Row: {
          alert_sent: boolean
          changed: boolean
          error_count: number
          id: string
          notes: string | null
          ok_count: number
          ran_at: string
          redirect_count: number
          total_urls: number
        }
        Insert: {
          alert_sent?: boolean
          changed?: boolean
          error_count?: number
          id?: string
          notes?: string | null
          ok_count?: number
          ran_at?: string
          redirect_count?: number
          total_urls?: number
        }
        Update: {
          alert_sent?: boolean
          changed?: boolean
          error_count?: number
          id?: string
          notes?: string | null
          ok_count?: number
          ran_at?: string
          redirect_count?: number
          total_urls?: number
        }
        Relationships: []
      }
      crawl_monitor_urls: {
        Row: {
          category: string
          changed: boolean
          checked_at: string
          error: string | null
          final_url: string | null
          id: string
          previous_category: string | null
          previous_status_code: number | null
          run_id: string
          status_code: number | null
          url: string
        }
        Insert: {
          category: string
          changed?: boolean
          checked_at?: string
          error?: string | null
          final_url?: string | null
          id?: string
          previous_category?: string | null
          previous_status_code?: number | null
          run_id: string
          status_code?: number | null
          url: string
        }
        Update: {
          category?: string
          changed?: boolean
          checked_at?: string
          error?: string | null
          final_url?: string | null
          id?: string
          previous_category?: string | null
          previous_status_code?: number | null
          run_id?: string
          status_code?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_monitor_urls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "crawl_monitor_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_publications: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          image_count: number
          metadata: Json
          news_ids: string[]
          post_type: string
          primary_news_id: string | null
          published_at: string | null
          section_label: string | null
          selected_image_urls: string[]
          sent_at: string | null
          slides_urls: string[]
          source_snapshot: string | null
          status: string
          title_snapshot: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          image_count?: number
          metadata?: Json
          news_ids?: string[]
          post_type?: string
          primary_news_id?: string | null
          published_at?: string | null
          section_label?: string | null
          selected_image_urls?: string[]
          sent_at?: string | null
          slides_urls?: string[]
          source_snapshot?: string | null
          status?: string
          title_snapshot?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          image_count?: number
          metadata?: Json
          news_ids?: string[]
          post_type?: string
          primary_news_id?: string | null
          published_at?: string | null
          section_label?: string | null
          selected_image_urls?: string[]
          sent_at?: string | null
          slides_urls?: string[]
          source_snapshot?: string | null
          status?: string
          title_snapshot?: string | null
        }
        Relationships: []
      }
      instagram_settings: {
        Row: {
          auto_enqueue_enabled: boolean
          brand_style: string
          carousel_when_multiple_images: boolean
          created_at: string
          enabled: boolean
          id: string
          max_caption_length: number
          min_interval_minutes: number
          mode: string
          schedule_hour: number
          single_post_default: boolean
          top_n: number
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          auto_enqueue_enabled?: boolean
          brand_style?: string
          carousel_when_multiple_images?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          max_caption_length?: number
          min_interval_minutes?: number
          mode?: string
          schedule_hour?: number
          single_post_default?: boolean
          top_n?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          auto_enqueue_enabled?: boolean
          brand_style?: string
          carousel_when_multiple_images?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          max_caption_length?: number
          min_interval_minutes?: number
          mode?: string
          schedule_hour?: number
          single_post_default?: boolean
          top_n?: number
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      news: {
        Row: {
          audio_url: string | null
          created_at: string
          full_analysis: string | null
          full_text: string | null
          id: string
          image_url: string | null
          is_trending: boolean
          published_at: string
          read_time: string | null
          region: string | null
          source_id: string | null
          source_url: string
          summary_ai: string | null
          title: string
          title_original: string | null
          topics: Json | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          full_analysis?: string | null
          full_text?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean
          published_at?: string
          read_time?: string | null
          region?: string | null
          source_id?: string | null
          source_url: string
          summary_ai?: string | null
          title: string
          title_original?: string | null
          topics?: Json | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          full_analysis?: string | null
          full_text?: string | null
          id?: string
          image_url?: string | null
          is_trending?: boolean
          published_at?: string
          read_time?: string | null
          region?: string | null
          source_id?: string | null
          source_url?: string
          summary_ai?: string | null
          title?: string
          title_original?: string | null
          topics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "news_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blocked_sources: Json | null
          created_at: string
          display_name: string | null
          email_notifications_enabled: boolean
          id: string
          interests: Json | null
          notification_time: string
          preferred_regions: Json | null
          push_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          blocked_sources?: Json | null
          created_at?: string
          display_name?: string | null
          email_notifications_enabled?: boolean
          id?: string
          interests?: Json | null
          notification_time?: string
          preferred_regions?: Json | null
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          blocked_sources?: Json | null
          created_at?: string
          display_name?: string | null
          email_notifications_enabled?: boolean
          id?: string
          interests?: Json | null
          notification_time?: string
          preferred_regions?: Json | null
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          base_url: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_read_news: {
        Row: {
          id: string
          news_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          news_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          news_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_read_news_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_saved_items: {
        Row: {
          id: string
          news_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          news_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          news_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_items_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_system_notification: {
        Args: {
          _body?: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
    Enums: {
      app_role: ["admin", "moderator"],
    },
  },
} as const
