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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      campaign_attributions: {
        Row: {
          campaign_medium: string | null
          campaign_name: string | null
          campaign_source: string | null
          created_at: string
          id: string
          landing_path: string | null
          product_id: string | null
          purchase_id: string | null
          referral_code_id: string | null
          visitor_key: string | null
        }
        Insert: {
          campaign_medium?: string | null
          campaign_name?: string | null
          campaign_source?: string | null
          created_at?: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          purchase_id?: string | null
          referral_code_id?: string | null
          visitor_key?: string | null
        }
        Update: {
          campaign_medium?: string | null
          campaign_name?: string | null
          campaign_source?: string | null
          created_at?: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          purchase_id?: string | null
          referral_code_id?: string | null
          visitor_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_attributions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_attributions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_attributions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          created_at: string
          created_by: string | null
          creator_share_bps: number | null
          currency: string
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean
          name: string
          platform_fee_bps: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          creator_share_bps?: number | null
          currency?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          name: string
          platform_fee_bps?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          creator_share_bps?: number | null
          currency?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          name?: string
          platform_fee_bps?: number | null
        }
        Relationships: []
      }
      creator_profiles: {
        Row: {
          about: string | null
          created_at: string
          headline: string | null
          is_public: boolean
          slug: string
          social_links: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          created_at?: string
          headline?: string | null
          is_public?: boolean
          slug: string
          social_links?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          created_at?: string
          headline?: string | null
          is_public?: boolean
          slug?: string
          social_links?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          commission_rule_id: string | null
          created_at: string
          currency: string
          description: string
          entry_type: string
          id: string
          payout_request_id: string | null
          purchase_item_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          commission_rule_id?: string | null
          created_at?: string
          currency: string
          description?: string
          entry_type: string
          id?: string
          payout_request_id?: string | null
          purchase_item_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          commission_rule_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          entry_type?: string
          id?: string
          payout_request_id?: string | null
          purchase_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payout_request_id_fkey"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          idea: string
          input: Json
          output: string
          score: number | null
          score_report: Json | null
          status: string
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          idea?: string
          input?: Json
          output?: string
          score?: number | null
          score_report?: Json | null
          status?: string
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          idea?: string
          input?: Json
          output?: string
          score?: number | null
          score_report?: Json | null
          status?: string
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_products: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          currency: string
          current_version_id: string | null
          description: string
          id: string
          preview_content: string
          price_amount: number
          published_at: string | null
          short_description: string
          slug: string
          source_listing_id: string | null
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          creator_id: string
          currency?: string
          current_version_id?: string | null
          description?: string
          id?: string
          preview_content?: string
          price_amount: number
          published_at?: string | null
          short_description: string
          slug: string
          source_listing_id?: string | null
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          currency?: string
          current_version_id?: string | null
          description?: string
          id?: string
          preview_content?: string
          price_amount?: number
          published_at?: string | null
          short_description?: string
          slug?: string
          source_listing_id?: string | null
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_products_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_products_source_listing_id_fkey"
            columns: ["source_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          payload_hash: string | null
          processed_at: string
          provider: string
          provider_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload_hash?: string | null
          processed_at?: string
          provider: string
          provider_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload_hash?: string | null
          processed_at?: string
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_label: string | null
          created_at: string
          id: string
          metadata: Json
          provider: string
          provider_account_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider: string
          provider_account_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_account_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          currency: string
          id: string
          payout_account_id: string | null
          processed_at: string | null
          provider_transfer_ref: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          currency: string
          id?: string
          payout_account_id?: string | null
          processed_at?: string | null
          provider_transfer_ref?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          currency?: string
          id?: string
          payout_account_id?: string | null
          processed_at?: string | null
          provider_transfer_ref?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue_entries: {
        Row: {
          amount: number
          commission_rule_id: string | null
          created_at: string
          currency: string
          description: string
          entry_type: string
          id: string
          purchase_item_id: string | null
        }
        Insert: {
          amount: number
          commission_rule_id?: string | null
          created_at?: string
          currency: string
          description?: string
          entry_type: string
          id?: string
          purchase_item_id?: string | null
        }
        Update: {
          amount?: number
          commission_rule_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          entry_type?: string
          id?: string
          purchase_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_entries_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_entries_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string
          purchase_item_id: string
          rating: number
          review_text: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id: string
          purchase_item_id: string
          rating: number
          review_text?: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string
          purchase_item_id?: string
          rating?: number
          review_text?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: true
            referencedRelation: "purchase_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_versions: {
        Row: {
          changelog: string
          created_at: string
          created_by: string
          id: string
          instructions: string
          product_id: string
          prompt_content: string
          verification_evidence: Json
          verification_state: string
          version_number: number
        }
        Insert: {
          changelog?: string
          created_at?: string
          created_by: string
          id?: string
          instructions?: string
          product_id: string
          prompt_content: string
          verification_evidence?: Json
          verification_state?: string
          version_number: number
        }
        Update: {
          changelog?: string
          created_at?: string
          created_by?: string
          id?: string
          instructions?: string
          product_id?: string
          prompt_content?: string
          verification_evidence?: Json
          verification_state?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          commission_rule_id: string | null
          created_at: string
          creator_amount: number
          creator_id: string
          currency: string
          id: string
          platform_amount: number
          product_id: string
          product_title_snapshot: string
          purchase_id: string
          unit_amount: number
          version_id: string
        }
        Insert: {
          commission_rule_id?: string | null
          created_at?: string
          creator_amount?: number
          creator_id: string
          currency: string
          id?: string
          platform_amount?: number
          product_id: string
          product_title_snapshot: string
          purchase_id: string
          unit_amount: number
          version_id: string
        }
        Update: {
          commission_rule_id?: string | null
          created_at?: string
          creator_amount?: number
          creator_id?: string
          currency?: string
          id?: string
          platform_amount?: number
          product_id?: string
          product_title_snapshot?: string
          purchase_id?: string
          unit_amount?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          platform_fee_amount: number
          provider: string
          provider_checkout_id: string | null
          provider_payment_id: string | null
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency: string
          id?: string
          paid_at?: string | null
          platform_fee_amount?: number
          provider: string
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          status?: string
          subtotal_amount: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          platform_fee_amount?: number
          provider?: string
          provider_checkout_id?: string | null
          provider_payment_id?: string | null
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          owner_id?: string
        }
        Relationships: []
      }
      review_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          submission_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          submission_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "review_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      review_submissions: {
        Row: {
          completeness_report: Json
          compliance_report: Json
          id: string
          originality_report: Json
          product_id: string
          quality_score: number | null
          reproducibility_report: Json
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          submitted_by: string
          version_id: string
        }
        Insert: {
          completeness_report?: Json
          compliance_report?: Json
          id?: string
          originality_report?: Json
          product_id: string
          quality_score?: number | null
          reproducibility_report?: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          submitted_by: string
          version_id: string
        }
        Update: {
          completeness_report?: Json
          compliance_report?: Json
          id?: string
          originality_report?: Json
          product_id?: string
          quality_score?: number | null
          reproducibility_report?: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_submissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_submissions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "product_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string
          product_id: string | null
          purchase_id: string | null
          requester_id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          product_id?: string | null
          purchase_id?: string | null
          requester_id: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          product_id?: string | null
          purchase_id?: string | null
          requester_id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      request_creator_payout: {
        Args: {
          p_amount: number
          p_currency: string
          p_payout_account_id: string
          p_user_id: string
        }
        Returns: {
          amount: number
          available_balance: number
          currency: string
          id: string
          requested_at: string
          status: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
