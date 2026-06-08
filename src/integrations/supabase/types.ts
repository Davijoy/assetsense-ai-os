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
      branding_settings: {
        Row: {
          id: string
          logo_url: string | null
          logo_url_dark: string | null
          tenant_key: string
          updated_at: string
        }
        Insert: {
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          tenant_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          agent: string
          created_at: string
          duration_sec: number
          id: string
          intent_label: string
          intent_score: number
          language: string
          lead_id: string | null
          qualified: boolean
          sentiment: string
        }
        Insert: {
          agent: string
          created_at?: string
          duration_sec?: number
          id?: string
          intent_label: string
          intent_score?: number
          language: string
          lead_id?: string | null
          qualified?: boolean
          sentiment?: string
        }
        Update: {
          agent?: string
          created_at?: string
          duration_sec?: number
          id?: string
          intent_label?: string
          intent_score?: number
          language?: string
          lead_id?: string | null
          qualified?: boolean
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      kie_doc_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string
          id: string
          token_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding: string
          id?: string
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string
          id?: string
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kie_doc_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kie_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kie_documents: {
        Row: {
          chunk_count: number
          confidence: number
          created_at: string
          doc_type: string
          entities: Json
          id: string
          insights: Json
          name: string
          project: string | null
          size_bytes: number
          status: string
          storage_path: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          chunk_count?: number
          confidence?: number
          created_at?: string
          doc_type?: string
          entities?: Json
          id?: string
          insights?: Json
          name: string
          project?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          chunk_count?: number
          confidence?: number
          created_at?: string
          doc_type?: string
          entities?: Json
          id?: string
          insights?: Json
          name?: string
          project?: string | null
          size_bytes?: number
          status?: string
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget_inr: number | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          owner: string | null
          phone: string | null
          project: string | null
          score: number
          source: string
          stage: string
        }
        Insert: {
          budget_inr?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner?: string | null
          phone?: string | null
          project?: string | null
          score?: number
          source: string
          stage?: string
        }
        Update: {
          budget_inr?: number | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner?: string | null
          phone?: string | null
          project?: string | null
          score?: number
          source?: string
          stage?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          ai_score: number
          city: string
          created_at: string
          developer: string | null
          id: string
          name: string
          price_inr: number
          property_type: string
          status: string
        }
        Insert: {
          ai_score?: number
          city: string
          created_at?: string
          developer?: string | null
          id?: string
          name: string
          price_inr: number
          property_type: string
          status?: string
        }
        Update: {
          ai_score?: number
          city?: string
          created_at?: string
          developer?: string | null
          id?: string
          name?: string
          price_inr?: number
          property_type?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_kie_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          document_id: string
          document_name: string
          id: string
          similarity: number
        }[]
      }
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
