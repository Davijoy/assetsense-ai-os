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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json
          entity: string
          entity_id: string | null
          id: string
          ts: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json
          entity: string
          entity_id?: string | null
          id?: string
          ts?: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          ts?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          id: string
          logo_url: string | null
          logo_url_dark: string | null
          tenant_key: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          tenant_key?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          tenant_key?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_global: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          jurisdiction: string | null
          metadata: Json
          name: string
          published_at: string | null
          publisher: string | null
          size_bytes: number
          storage_path: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type?: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json
          name: string
          published_at?: string | null
          publisher?: string | null
          size_bytes?: number
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          jurisdiction?: string | null
          metadata?: Json
          name?: string
          published_at?: string | null
          publisher?: string | null
          size_bytes?: number
          storage_path?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kie_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          metadata: Json
          polygon: Json | null
          region: string | null
          updated_at: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          polygon?: Json | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          polygon?: Json | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      market_data: {
        Row: {
          created_at: string
          id: string
          location_id: string
          metadata: Json
          metric: string
          period_end: string
          period_start: string
          source: string | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          metadata?: Json
          metric: string
          period_end: string
          period_start: string
          source?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          metadata?: Json
          metric?: string
          period_end?: string
          period_start?: string
          source?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_data_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
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
          workspace_id: string
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
          workspace_id?: string
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
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      properties_global: {
        Row: {
          area_sqft: number | null
          asset_class: string | null
          attributes: Json
          created_at: string
          description: string | null
          developer: string | null
          id: string
          location_id: string | null
          name: string
          price_inr: number | null
          property_type: string
          rera_id: string | null
          slug: string | null
          source_property_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area_sqft?: number | null
          asset_class?: string | null
          attributes?: Json
          created_at?: string
          description?: string | null
          developer?: string | null
          id?: string
          location_id?: string | null
          name: string
          price_inr?: number | null
          property_type: string
          rera_id?: string | null
          slug?: string | null
          source_property_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area_sqft?: number | null
          asset_class?: string | null
          attributes?: Json
          created_at?: string
          description?: string | null
          developer?: string | null
          id?: string
          location_id?: string | null
          name?: string
          price_inr?: number | null
          property_type?: string
          rera_id?: string | null
          slug?: string | null
          source_property_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_global_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_global_source_property_id_fkey"
            columns: ["source_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_embeddings: {
        Row: {
          created_at: string
          embedding: string
          id: string
          model: string
          property_id: string
          source_text: string | null
        }
        Insert: {
          created_at?: string
          embedding: string
          id?: string
          model?: string
          property_id: string
          source_text?: string | null
        }
        Update: {
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          property_id?: string
          source_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_embeddings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_global"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          property_id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          property_id: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          property_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_global"
            referencedColumns: ["id"]
          },
        ]
      }
      property_relationships: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          created_at: string
          id: string
          metadata: Json
          property_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          since: string | null
          until: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          property_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          since?: string | null
          until?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          property_id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          since?: string | null
          until?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_relationships_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_global"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_relationships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuation_models: {
        Row: {
          code: string
          created_at: string
          description: string | null
          family: string
          features: Json
          id: string
          is_active: boolean
          metrics: Json
          name: string
          updated_at: string
          version: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          family: string
          features?: Json
          id?: string
          is_active?: boolean
          metrics?: Json
          name: string
          updated_at?: string
          version?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          family?: string
          features?: Json
          id?: string
          is_active?: boolean
          metrics?: Json
          name?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          category: Database["public"]["Enums"]["workspace_category"]
          created_at: string
          id: string
          name: string
          parent_id: string | null
          settings: Json
          slug: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["workspace_category"]
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          settings?: Json
          slug: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["workspace_category"]
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          settings?: Json
          slug?: string
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_workspace_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
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
      match_properties: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          city: string
          name: string
          property_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "agent"
        | "viewer"
        | "builder"
        | "developer"
      member_status: "active" | "invited" | "suspended"
      relationship_type:
        | "OWNER"
        | "LENDER"
        | "BROKER"
        | "BUYER"
        | "TENANT"
        | "INVESTOR"
        | "MANAGER"
        | "ARCHITECT"
        | "CONTRACTOR"
        | "REGULATOR"
      workspace_category: "INTERNAL" | "CUSTOMER" | "PARTNER"
      workspace_type:
        | "BUYER"
        | "CHANNEL_PARTNER"
        | "COMPANY"
        | "PLATFORM_ADMIN"
        | "EXECUTIVE"
        | "OPERATIONS"
        | "CUSTOMER_SUCCESS"
        | "DATA_OPERATIONS"
        | "COMPLIANCE"
        | "SUPPORT"
        | "BANK"
        | "LENDER"
        | "LEGAL_FIRM"
        | "INSURANCE_PROVIDER"
        | "PROPERTY_MANAGER"
        | "VALUATION_AGENCY"
        | "ESCROW_PROVIDER"
        | "INSPECTION_AGENCY"
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
      app_role: ["admin", "manager", "agent", "viewer", "builder", "developer"],
      member_status: ["active", "invited", "suspended"],
      relationship_type: [
        "OWNER",
        "LENDER",
        "BROKER",
        "BUYER",
        "TENANT",
        "INVESTOR",
        "MANAGER",
        "ARCHITECT",
        "CONTRACTOR",
        "REGULATOR",
      ],
      workspace_category: ["INTERNAL", "CUSTOMER", "PARTNER"],
      workspace_type: [
        "BUYER",
        "CHANNEL_PARTNER",
        "COMPANY",
        "PLATFORM_ADMIN",
        "EXECUTIVE",
        "OPERATIONS",
        "CUSTOMER_SUCCESS",
        "DATA_OPERATIONS",
        "COMPLIANCE",
        "SUPPORT",
        "BANK",
        "LENDER",
        "LEGAL_FIRM",
        "INSURANCE_PROVIDER",
        "PROPERTY_MANAGER",
        "VALUATION_AGENCY",
        "ESCROW_PROVIDER",
        "INSPECTION_AGENCY",
      ],
    },
  },
} as const
