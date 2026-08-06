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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          recipients_count: number
          send_email: boolean
          sent_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          recipients_count?: number
          send_email?: boolean
          sent_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          recipients_count?: number
          send_email?: boolean
          sent_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      apk_builds: {
        Row: {
          apk_url: string | null
          created_at: string
          error: string | null
          icon_url: string | null
          id: string
          logs: Json
          platform: string
          progress: number
          project_id: string
          project_name: string | null
          stage: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apk_url?: string | null
          created_at?: string
          error?: string | null
          icon_url?: string | null
          id?: string
          logs?: Json
          platform?: string
          progress?: number
          project_id: string
          project_name?: string | null
          stage?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apk_url?: string | null
          created_at?: string
          error?: string | null
          icon_url?: string | null
          id?: string
          logs?: Json
          platform?: string
          progress?: number
          project_id?: string
          project_name?: string | null
          stage?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apk_builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          created_at: string
          html: string
          id: string
          logs: Json
          project_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
          username: string
          visits: number
        }
        Insert: {
          created_at?: string
          html?: string
          id?: string
          logs?: Json
          project_id?: string | null
          slug: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id: string
          username: string
          visits?: number
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          logs?: Json
          project_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          username?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          announcement_id: string | null
          created_at: string
          error: string | null
          event_id: string | null
          id: string
          kind: string
          recipient: string
          status: string
          subject: string
        }
        Insert: {
          announcement_id?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          kind?: string
          recipient: string
          status?: string
          subject: string
        }
        Update: {
          announcement_id?: string | null
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          kind?: string
          recipient?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          kind: string
          name: string
          sender: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          kind?: string
          name: string
          sender?: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          kind?: string
          name?: string
          sender?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      events: {
        Row: {
          broadcast_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          promo_code: string | null
          published: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          broadcast_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          promo_code?: string | null
          published?: boolean
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          broadcast_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          promo_code?: string | null
          published?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mcp_servers: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          package: string
          project_id: string | null
          status: string
          transport: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          package: string
          project_id?: string | null
          status?: string
          transport?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          package?: string
          project_id?: string | null
          status?: string
          transport?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_servers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          codeverse_username: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_banned: boolean
          is_suspended: boolean
          is_verified: boolean
          plan: Database["public"]["Enums"]["app_plan"]
          referral_code: string | null
          referred_by: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          codeverse_username?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          plan?: Database["public"]["Enums"]["app_plan"]
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          codeverse_username?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_banned?: boolean
          is_suspended?: boolean
          is_verified?: boolean
          plan?: Database["public"]["Enums"]["app_plan"]
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          code_content: string | null
          created_at: string
          description: string | null
          forks: number
          id: string
          is_published: boolean
          language: string | null
          likes: number
          name: string
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          code_content?: string | null
          created_at?: string
          description?: string | null
          forks?: number
          id?: string
          is_published?: boolean
          language?: string | null
          likes?: number
          name: string
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          code_content?: string | null
          created_at?: string
          description?: string | null
          forks?: number
          id?: string
          is_published?: boolean
          language?: string | null
          likes?: number
          name?: string
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          referred_amount: number
          referred_user_id: string
          referrer_amount: number
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_amount?: number
          referred_user_id: string
          referrer_amount?: number
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_amount?: number
          referred_user_id?: string
          referrer_amount?: number
          referrer_user_id?: string
        }
        Relationships: []
      }
      shared_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          share_code: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          share_code?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          share_code?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      token_balances: {
        Row: {
          balance: number
          id: string
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      token_pricing: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price: number
          tier: string
          tokens: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price: number
          tier: string
          tokens: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price?: number
          tier?: string
          tokens?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          action: string
          amount: number
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          path: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          os: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          consumed: boolean
          created_at: string
          email: string
          expires_at: string
          id: string
          purpose: string
        }
        Insert: {
          code: string
          consumed?: boolean
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          purpose?: string
        }
        Update: {
          code?: string
          consumed?: boolean
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          purpose?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          type: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier: string
          type: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_plan: "free" | "pro"
      app_role: "admin" | "moderator" | "user"
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
      app_plan: ["free", "pro"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
