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
      ab_test_metrics: {
        Row: {
          clicks: number
          conversions: number
          cost_usd: number | null
          ctr: number | null
          cvr: number | null
          id: string
          impressions: number
          recorded_at: string
          test_id: string
          variant: string
        }
        Insert: {
          clicks?: number
          conversions?: number
          cost_usd?: number | null
          ctr?: number | null
          cvr?: number | null
          id?: string
          impressions?: number
          recorded_at?: string
          test_id: string
          variant: string
        }
        Update: {
          clicks?: number
          conversions?: number
          cost_usd?: number | null
          ctr?: number | null
          cvr?: number | null
          id?: string
          impressions?: number
          recorded_at?: string
          test_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_metrics_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          campaign_id: string
          completed_at: string | null
          confidence_level: number | null
          created_at: string
          id: string
          min_sample_size: number | null
          name: string
          statistical_significance: number | null
          status: string
          traffic_split: Json
          updated_at: string
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          min_sample_size?: number | null
          name: string
          statistical_significance?: number | null
          status?: string
          traffic_split?: Json
          updated_at?: string
          variant_a: Json
          variant_b: Json
          winner?: string | null
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          confidence_level?: number | null
          created_at?: string
          id?: string
          min_sample_size?: number | null
          name?: string
          statistical_significance?: number | null
          status?: string
          traffic_split?: Json
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_control_account: boolean | null
          name: string
          parent_account_id: string | null
          sub_type: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_control_account?: boolean | null
          name: string
          parent_account_id?: string | null
          sub_type: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_control_account?: boolean | null
          name?: string
          parent_account_id?: string | null
          sub_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_audit_log: {
        Row: {
          actual_value: number | null
          affected_account: string | null
          affected_period: string | null
          audit_type: string
          created_at: string | null
          description: string
          expected_value: number | null
          id: string
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          variance: number | null
        }
        Insert: {
          actual_value?: number | null
          affected_account?: string | null
          affected_period?: string | null
          audit_type: string
          created_at?: string | null
          description: string
          expected_value?: number | null
          id?: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          variance?: number | null
        }
        Update: {
          actual_value?: number | null
          affected_account?: string | null
          affected_period?: string | null
          audit_type?: string
          created_at?: string | null
          description?: string
          expected_value?: number | null
          id?: string
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          variance?: number | null
        }
        Relationships: []
      }
      accounting_chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          level: number | null
          name: string
          niif_reference: string | null
          parent_code: string | null
          requires_subsidiary: boolean | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name: string
          niif_reference?: string | null
          parent_code?: string | null
          requires_subsidiary?: boolean | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          name?: string
          niif_reference?: string | null
          parent_code?: string | null
          requires_subsidiary?: boolean | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      accounting_ledger: {
        Row: {
          account_code: string
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string
          fiscal_period: string | null
          id: string
          is_closing_entry: boolean | null
          is_reversed: boolean | null
          reference_id: string | null
          reference_type: string | null
          user_id: string | null
        }
        Insert: {
          account_code: string
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          fiscal_period?: string | null
          id?: string
          is_closing_entry?: boolean | null
          is_reversed?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Update: {
          account_code?: string
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          fiscal_period?: string | null
          id?: string
          is_closing_entry?: boolean | null
          is_reversed?: boolean | null
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ledger_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "accounting_chart_of_accounts"
            referencedColumns: ["code"]
          },
        ]
      }
      accounting_period_balances: {
        Row: {
          account_id: string
          closed_at: string | null
          closing_balance: number | null
          created_at: string | null
          id: string
          is_closed: boolean | null
          opening_balance: number | null
          period: string
          period_credits: number | null
          period_debits: number | null
        }
        Insert: {
          account_id: string
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          is_closed?: boolean | null
          opening_balance?: number | null
          period: string
          period_credits?: number | null
          period_debits?: number | null
        }
        Update: {
          account_id?: string
          closed_at?: string | null
          closing_balance?: number | null
          created_at?: string | null
          id?: string
          is_closed?: boolean | null
          opening_balance?: number | null
          period?: string
          period_credits?: number | null
          period_debits?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_period_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_period_closures: {
        Row: {
          balance_check: boolean | null
          closed_at: string | null
          closed_by: string | null
          closing_entries_batch_id: string | null
          created_at: string | null
          end_date: string
          id: string
          notes: string | null
          period_code: string
          period_type: string
          start_date: string
          status: string | null
          total_credits: number | null
          total_debits: number | null
        }
        Insert: {
          balance_check?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          closing_entries_batch_id?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          notes?: string | null
          period_code: string
          period_type: string
          start_date: string
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
        }
        Update: {
          balance_check?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          closing_entries_batch_id?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          period_code?: string
          period_type?: string
          start_date?: string
          status?: string | null
          total_credits?: number | null
          total_debits?: number | null
        }
        Relationships: []
      }
      accounting_provisions: {
        Row: {
          created_at: string | null
          current_balance: number | null
          id: string
          notes: string | null
          provision_amount: number
          provision_date: string | null
          provision_type: string
          reference_id: string | null
          reference_table: string | null
          release_date: string | null
          released_amount: number | null
          status: string | null
          utilized_amount: number | null
        }
        Insert: {
          created_at?: string | null
          current_balance?: number | null
          id?: string
          notes?: string | null
          provision_amount: number
          provision_date?: string | null
          provision_type: string
          reference_id?: string | null
          reference_table?: string | null
          release_date?: string | null
          released_amount?: number | null
          status?: string | null
          utilized_amount?: number | null
        }
        Update: {
          created_at?: string | null
          current_balance?: number | null
          id?: string
          notes?: string | null
          provision_amount?: number
          provision_date?: string | null
          provision_type?: string
          reference_id?: string | null
          reference_table?: string | null
          release_date?: string | null
          released_amount?: number | null
          status?: string | null
          utilized_amount?: number | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_role: Database["public"]["Enums"]["admin_role"]
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_role: Database["public"]["Enums"]["admin_role"]
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_role?: Database["public"]["Enums"]["admin_role"]
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_content_cache: {
        Row: {
          cache_key: string
          confidence: number | null
          content: string
          content_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          language: string | null
          metadata: Json | null
        }
        Insert: {
          cache_key: string
          confidence?: number | null
          content: string
          content_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
        }
        Update: {
          cache_key?: string
          confidence?: number | null
          content?: string
          content_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          environment: string
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          environment?: string
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder_id: string
          account_holder_name: string
          account_number: string
          account_type: string
          bank_code: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          account_holder_id: string
          account_holder_name: string
          account_number: string
          account_type: string
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          account_holder_id?: string
          account_holder_name?: string
          account_number?: string
          account_type?: string
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      bonus_protector_options: {
        Row: {
          created_at: string | null
          description: string
          id: string
          price_cents: number
          price_usd: number
          protection_level: number
          updated_at: string | null
          validity_days: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          price_cents: number
          price_usd: number
          protection_level: number
          updated_at?: string | null
          validity_days?: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          price_cents?: number
          price_usd?: number
          protection_level?: number
          updated_at?: string | null
          validity_days?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          auto_release_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          car_id: string
          completed_at: string | null
          coverage_snapshot: Json | null
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          deposit_amount_cents: number | null
          dispute_evidence: Json | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          dropoff_location_id: string | null
          end_at: string
          funds_released_at: string | null
          id: string
          inspection_comment: string | null
          inspection_evidence: Json | null
          inspection_status: string | null
          insurance_fee: number | null
          is_instant_booking: boolean | null
          notes: string | null
          owner_confirmed_delivery: boolean | null
          owner_fee: number | null
          owner_id: string
          payment_mode: string | null
          pickup_location_id: string | null
          renter_confirmed_payment: boolean | null
          renter_id: string
          returned_at: string | null
          service_fee: number | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"] | null
          subscription_tier_at_booking: string | null
          subtotal: number | null
          total_days: number | null
          total_price: number | null
          updated_at: string | null
          wallet_lock_id: string | null
          wallet_status: string | null
        }
        Insert: {
          auto_release_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          car_id: string
          completed_at?: string | null
          coverage_snapshot?: Json | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          deposit_amount_cents?: number | null
          dispute_evidence?: Json | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dropoff_location_id?: string | null
          end_at: string
          funds_released_at?: string | null
          id?: string
          inspection_comment?: string | null
          inspection_evidence?: Json | null
          inspection_status?: string | null
          insurance_fee?: number | null
          is_instant_booking?: boolean | null
          notes?: string | null
          owner_confirmed_delivery?: boolean | null
          owner_fee?: number | null
          owner_id: string
          payment_mode?: string | null
          pickup_location_id?: string | null
          renter_confirmed_payment?: boolean | null
          renter_id: string
          returned_at?: string | null
          service_fee?: number | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          subscription_tier_at_booking?: string | null
          subtotal?: number | null
          total_days?: number | null
          total_price?: number | null
          updated_at?: string | null
          wallet_lock_id?: string | null
          wallet_status?: string | null
        }
        Update: {
          auto_release_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          car_id?: string
          completed_at?: string | null
          coverage_snapshot?: Json | null
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          deposit_amount_cents?: number | null
          dispute_evidence?: Json | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dropoff_location_id?: string | null
          end_at?: string
          funds_released_at?: string | null
          id?: string
          inspection_comment?: string | null
          inspection_evidence?: Json | null
          inspection_status?: string | null
          insurance_fee?: number | null
          is_instant_booking?: boolean | null
          notes?: string | null
          owner_confirmed_delivery?: boolean | null
          owner_fee?: number | null
          owner_id?: string
          payment_mode?: string | null
          pickup_location_id?: string | null
          renter_confirmed_payment?: boolean | null
          renter_id?: string
          returned_at?: string | null
          service_fee?: number | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          subscription_tier_at_booking?: string | null
          subtotal?: number | null
          total_days?: number | null
          total_price?: number | null
          updated_at?: string | null
          wallet_lock_id?: string | null
          wallet_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          platform: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          platform: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          platform?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cta_text: string | null
          cta_url: string
          description: string | null
          description_content: string
          error_message: string | null
          id: string
          image_url: string | null
          is_scheduled: boolean | null
          name: string
          platforms: string[]
          post_ids: Json | null
          published_at: string | null
          scheduled_for: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          cta_url: string
          description?: string | null
          description_content: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          is_scheduled?: boolean | null
          name: string
          platforms?: string[]
          post_ids?: Json | null
          published_at?: string | null
          scheduled_for: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string
          description?: string | null
          description_content?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          is_scheduled?: boolean | null
          name?: string
          platforms?: string[]
          post_ids?: Json | null
          published_at?: string | null
          scheduled_for?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      car_blocked_dates: {
        Row: {
          blocked_from: string
          blocked_to: string
          car_id: string
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          updated_at: string | null
        }
        Insert: {
          blocked_from: string
          blocked_to: string
          car_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          updated_at?: string | null
        }
        Update: {
          blocked_from?: string
          blocked_to?: string
          car_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_blocked_dates_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_blocked_dates_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_blocked_dates_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_blocked_dates_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_photos: {
        Row: {
          car_id: string
          created_at: string | null
          id: string
          position: number | null
          sort_order: number | null
          stored_path: string | null
          url: string
        }
        Insert: {
          car_id: string
          created_at?: string | null
          id?: string
          position?: number | null
          sort_order?: number | null
          stored_path?: string | null
          url: string
        }
        Update: {
          car_id?: string
          created_at?: string | null
          id?: string
          position?: number | null
          sort_order?: number | null
          stored_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      car_pricing_matrix: {
        Row: {
          base_daily_price: number
          base_deposit: number
          base_monthly_price: number | null
          base_weekly_price: number | null
          car_id: string
          created_at: string
          id: string
          max_price: number | null
          min_price: number | null
          monthly_discount_pct: number | null
          owner_season_adjustment: number | null
          risk_category: string | null
          updated_at: string
          use_driver_risk_pricing: boolean | null
          use_dynamic_pricing: boolean | null
          use_season_pricing: boolean | null
          weekly_discount_pct: number | null
        }
        Insert: {
          base_daily_price: number
          base_deposit: number
          base_monthly_price?: number | null
          base_weekly_price?: number | null
          car_id: string
          created_at?: string
          id?: string
          max_price?: number | null
          min_price?: number | null
          monthly_discount_pct?: number | null
          owner_season_adjustment?: number | null
          risk_category?: string | null
          updated_at?: string
          use_driver_risk_pricing?: boolean | null
          use_dynamic_pricing?: boolean | null
          use_season_pricing?: boolean | null
          weekly_discount_pct?: number | null
        }
        Update: {
          base_daily_price?: number
          base_deposit?: number
          base_monthly_price?: number | null
          base_weekly_price?: number | null
          car_id?: string
          created_at?: string
          id?: string
          max_price?: number | null
          min_price?: number | null
          monthly_discount_pct?: number | null
          owner_season_adjustment?: number | null
          risk_category?: string | null
          updated_at?: string
          use_driver_risk_pricing?: boolean | null
          use_dynamic_pricing?: boolean | null
          use_season_pricing?: boolean | null
          weekly_discount_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_pricing_matrix_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_pricing_matrix_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_pricing_matrix_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_pricing_matrix_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_pricing_matrix_risk_category_fkey"
            columns: ["risk_category"]
            isOneToOne: false
            referencedRelation: "vehicle_risk_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      car_stats: {
        Row: {
          avg_rating: number | null
          car_id: string
          completed_bookings: number | null
          created_at: string | null
          last_booking_at: string | null
          review_count: number | null
          reviews_count: number | null
          total_bookings: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          avg_rating?: number | null
          car_id: string
          completed_bookings?: number | null
          created_at?: string | null
          last_booking_at?: string | null
          review_count?: number | null
          reviews_count?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_rating?: number | null
          car_id?: string
          completed_bookings?: number | null
          created_at?: string | null
          last_booking_at?: string | null
          review_count?: number | null
          reviews_count?: number | null
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "car_stats_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_stats_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_stats_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "car_stats_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          ai_condition_analysis: Json | null
          ai_condition_analyzed_at: string | null
          ai_condition_category: string | null
          ai_condition_score: number | null
          ai_recognition_at: string | null
          ai_recognition_confidence: number | null
          ai_recognition_validated: boolean | null
          ai_recognized_brand: string | null
          ai_recognized_model: string | null
          allow_pets: boolean | null
          allow_rideshare: boolean | null
          allow_second_driver: boolean | null
          allow_smoking: boolean | null
          allowed_provinces: string[] | null
          auto_approval: boolean | null
          availability_end_date: string | null
          availability_start_date: string | null
          brand: string | null
          brand_id: string | null
          brand_text_backup: string | null
          city: string | null
          color: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          deposit_required: boolean | null
          description: string | null
          doors: number | null
          extra_km_price: number | null
          features: Json | null
          fuel_policy: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          has_telemetry: boolean | null
          id: string
          instant_booking: boolean | null
          instant_booking_enabled: boolean | null
          instant_booking_min_score: number | null
          instant_booking_require_verified: boolean | null
          insurance_company: string | null
          insurance_deductible_usd: number | null
          insurance_expires_at: string | null
          insurance_included: boolean | null
          insurance_policy_number: string | null
          kill_switch_enabled: boolean | null
          last_heartbeat: string | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          location_province: string | null
          location_state: string | null
          location_street: string | null
          location_street_number: string | null
          max_anticipation_days: number | null
          max_distance_km: number | null
          max_rental_days: number | null
          mileage: number | null
          mileage_limit: number | null
          min_rental_days: number | null
          model: string | null
          model_id: string | null
          model_text_backup: string | null
          owner_id: string
          photos_quality_checked: boolean | null
          photos_quality_score: number | null
          plates_auto_blurred: boolean | null
          price_per_day: number | null
          province: string | null
          rating_avg: number | null
          review_count: number | null
          seats: number | null
          second_driver_cost: number | null
          status: Database["public"]["Enums"]["car_status"] | null
          telemetry_provider: string | null
          title: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string | null
          uses_dynamic_pricing: boolean | null
          value_usd: number | null
          vehicle_tier: Database["public"]["Enums"]["vehicle_tier"] | null
          year: number | null
        }
        Insert: {
          ai_condition_analysis?: Json | null
          ai_condition_analyzed_at?: string | null
          ai_condition_category?: string | null
          ai_condition_score?: number | null
          ai_recognition_at?: string | null
          ai_recognition_confidence?: number | null
          ai_recognition_validated?: boolean | null
          ai_recognized_brand?: string | null
          ai_recognized_model?: string | null
          allow_pets?: boolean | null
          allow_rideshare?: boolean | null
          allow_second_driver?: boolean | null
          allow_smoking?: boolean | null
          allowed_provinces?: string[] | null
          auto_approval?: boolean | null
          availability_end_date?: string | null
          availability_start_date?: string | null
          brand?: string | null
          brand_id?: string | null
          brand_text_backup?: string | null
          city?: string | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          doors?: number | null
          extra_km_price?: number | null
          features?: Json | null
          fuel_policy?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_telemetry?: boolean | null
          id?: string
          instant_booking?: boolean | null
          instant_booking_enabled?: boolean | null
          instant_booking_min_score?: number | null
          instant_booking_require_verified?: boolean | null
          insurance_company?: string | null
          insurance_deductible_usd?: number | null
          insurance_expires_at?: string | null
          insurance_included?: boolean | null
          insurance_policy_number?: string | null
          kill_switch_enabled?: boolean | null
          last_heartbeat?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          location_state?: string | null
          location_street?: string | null
          location_street_number?: string | null
          max_anticipation_days?: number | null
          max_distance_km?: number | null
          max_rental_days?: number | null
          mileage?: number | null
          mileage_limit?: number | null
          min_rental_days?: number | null
          model?: string | null
          model_id?: string | null
          model_text_backup?: string | null
          owner_id: string
          photos_quality_checked?: boolean | null
          photos_quality_score?: number | null
          plates_auto_blurred?: boolean | null
          price_per_day?: number | null
          province?: string | null
          rating_avg?: number | null
          review_count?: number | null
          seats?: number | null
          second_driver_cost?: number | null
          status?: Database["public"]["Enums"]["car_status"] | null
          telemetry_provider?: string | null
          title?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string | null
          uses_dynamic_pricing?: boolean | null
          value_usd?: number | null
          vehicle_tier?: Database["public"]["Enums"]["vehicle_tier"] | null
          year?: number | null
        }
        Update: {
          ai_condition_analysis?: Json | null
          ai_condition_analyzed_at?: string | null
          ai_condition_category?: string | null
          ai_condition_score?: number | null
          ai_recognition_at?: string | null
          ai_recognition_confidence?: number | null
          ai_recognition_validated?: boolean | null
          ai_recognized_brand?: string | null
          ai_recognized_model?: string | null
          allow_pets?: boolean | null
          allow_rideshare?: boolean | null
          allow_second_driver?: boolean | null
          allow_smoking?: boolean | null
          allowed_provinces?: string[] | null
          auto_approval?: boolean | null
          availability_end_date?: string | null
          availability_start_date?: string | null
          brand?: string | null
          brand_id?: string | null
          brand_text_backup?: string | null
          city?: string | null
          color?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_amount?: number | null
          deposit_required?: boolean | null
          description?: string | null
          doors?: number | null
          extra_km_price?: number | null
          features?: Json | null
          fuel_policy?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_telemetry?: boolean | null
          id?: string
          instant_booking?: boolean | null
          instant_booking_enabled?: boolean | null
          instant_booking_min_score?: number | null
          instant_booking_require_verified?: boolean | null
          insurance_company?: string | null
          insurance_deductible_usd?: number | null
          insurance_expires_at?: string | null
          insurance_included?: boolean | null
          insurance_policy_number?: string | null
          kill_switch_enabled?: boolean | null
          last_heartbeat?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_province?: string | null
          location_state?: string | null
          location_street?: string | null
          location_street_number?: string | null
          max_anticipation_days?: number | null
          max_distance_km?: number | null
          max_rental_days?: number | null
          mileage?: number | null
          mileage_limit?: number | null
          min_rental_days?: number | null
          model?: string | null
          model_id?: string | null
          model_text_backup?: string | null
          owner_id?: string
          photos_quality_checked?: boolean | null
          photos_quality_score?: number | null
          plates_auto_blurred?: boolean | null
          price_per_day?: number | null
          province?: string | null
          rating_avg?: number | null
          review_count?: number | null
          seats?: number | null
          second_driver_cost?: number | null
          status?: Database["public"]["Enums"]["car_status"] | null
          telemetry_provider?: string | null
          title?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string | null
          uses_dynamic_pricing?: boolean | null
          value_usd?: number | null
          vehicle_tier?: Database["public"]["Enums"]["vehicle_tier"] | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cars_fipe_history: {
        Row: {
          car_id: string
          fipe_code: string | null
          id: string
          is_changed: boolean | null
          previous_value_usd: number | null
          reference_month: string | null
          source: string | null
          synced_at: string
          value_ars: number | null
          value_brl: number | null
          value_usd: number | null
        }
        Insert: {
          car_id: string
          fipe_code?: string | null
          id?: string
          is_changed?: boolean | null
          previous_value_usd?: number | null
          reference_month?: string | null
          source?: string | null
          synced_at?: string
          value_ars?: number | null
          value_brl?: number | null
          value_usd?: number | null
        }
        Update: {
          car_id?: string
          fipe_code?: string | null
          id?: string
          is_changed?: boolean | null
          previous_value_usd?: number | null
          reference_month?: string | null
          source?: string | null
          synced_at?: string
          value_ars?: number | null
          value_brl?: number | null
          value_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cars_fipe_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_fipe_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_fipe_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_fipe_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_reports: {
        Row: {
          bcra_status: string | null
          bounced_checks_count: number | null
          country: string
          created_at: string
          credit_score: number | null
          document_number: string
          document_type: string
          employer_name: string | null
          employment_status: string | null
          error_code: string | null
          error_message: string | null
          estimated_annual_revenue: number | null
          estimated_monthly_income: number | null
          expires_at: string | null
          has_bankruptcy: boolean | null
          has_bounced_checks: boolean | null
          has_lawsuits: boolean | null
          has_social_security_debt: boolean | null
          has_tax_debt: boolean | null
          id: string
          lawsuits_count: number | null
          monthly_commitment: number | null
          provider: string
          raw_response: Json | null
          risk_level: string | null
          status: string
          total_debt_amount: number | null
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          bcra_status?: string | null
          bounced_checks_count?: number | null
          country?: string
          created_at?: string
          credit_score?: number | null
          document_number: string
          document_type: string
          employer_name?: string | null
          employment_status?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_annual_revenue?: number | null
          estimated_monthly_income?: number | null
          expires_at?: string | null
          has_bankruptcy?: boolean | null
          has_bounced_checks?: boolean | null
          has_lawsuits?: boolean | null
          has_social_security_debt?: boolean | null
          has_tax_debt?: boolean | null
          id?: string
          lawsuits_count?: number | null
          monthly_commitment?: number | null
          provider?: string
          raw_response?: Json | null
          risk_level?: string | null
          status?: string
          total_debt_amount?: number | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          bcra_status?: string | null
          bounced_checks_count?: number | null
          country?: string
          created_at?: string
          credit_score?: number | null
          document_number?: string
          document_type?: string
          employer_name?: string | null
          employment_status?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_annual_revenue?: number | null
          estimated_monthly_income?: number | null
          expires_at?: string | null
          has_bankruptcy?: boolean | null
          has_bounced_checks?: boolean | null
          has_lawsuits?: boolean | null
          has_social_security_debt?: boolean | null
          has_tax_debt?: boolean | null
          id?: string
          lawsuits_count?: number | null
          monthly_commitment?: number | null
          provider?: string
          raw_response?: Json | null
          risk_level?: string | null
          status?: string
          total_debt_amount?: number | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      cron_execution_log: {
        Row: {
          error: string | null
          executed_at: string | null
          id: number
          job_name: string
          response: Json | null
          status: string | null
        }
        Insert: {
          error?: string | null
          executed_at?: string | null
          id?: number
          job_name: string
          response?: Json | null
          status?: string | null
        }
        Update: {
          error?: string | null
          executed_at?: string | null
          id?: number
          job_name?: string
          response?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      daily_car_points: {
        Row: {
          acceptance_rate_30d: number
          base_points: number
          cancellation_rate_90d: number
          car_id: string
          created_at: string | null
          date: string
          demand_factor: number
          formula: string | null
          id: string
          is_eligible: boolean
          is_ready_to_book: boolean
          owner_id: string
          points: number
          price_deviation_pct: number | null
          rep_factor: number
          response_time_hours: number | null
          va_failure_reasons: string[] | null
          va_status: boolean
          value_factor: number
        }
        Insert: {
          acceptance_rate_30d?: number
          base_points?: number
          cancellation_rate_90d?: number
          car_id: string
          created_at?: string | null
          date: string
          demand_factor?: number
          formula?: string | null
          id?: string
          is_eligible?: boolean
          is_ready_to_book?: boolean
          owner_id: string
          points?: number
          price_deviation_pct?: number | null
          rep_factor?: number
          response_time_hours?: number | null
          va_failure_reasons?: string[] | null
          va_status?: boolean
          value_factor?: number
        }
        Update: {
          acceptance_rate_30d?: number
          base_points?: number
          cancellation_rate_90d?: number
          car_id?: string
          created_at?: string | null
          date?: string
          demand_factor?: number
          formula?: string | null
          id?: string
          is_eligible?: boolean
          is_ready_to_book?: boolean
          owner_id?: string
          points?: number
          price_deviation_pct?: number | null
          rep_factor?: number
          response_time_hours?: number | null
          va_failure_reasons?: string[] | null
          va_status?: boolean
          value_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_car_points_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_car_points_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_car_points_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_car_points_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_car_points_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_car_points_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_token_overrides: {
        Row: {
          context_type: string
          context_value: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          start_date: string | null
          tokens: Json
        }
        Insert: {
          context_type: string
          context_value: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          start_date?: string | null
          tokens: Json
        }
        Update: {
          context_type?: string
          context_value?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          start_date?: string | null
          tokens?: Json
        }
        Relationships: []
      }
      driver_risk_profile: {
        Row: {
          claims_with_fault: number
          class: number
          created_at: string
          driver_score: number
          good_years: number
          last_claim_at: string | null
          last_claim_with_fault: boolean | null
          last_class_update: string | null
          total_claims: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claims_with_fault?: number
          class?: number
          created_at?: string
          driver_score?: number
          good_years?: number
          last_claim_at?: string | null
          last_claim_with_fault?: boolean | null
          last_class_update?: string | null
          total_claims?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claims_with_fault?: number
          class?: number
          created_at?: string
          driver_score?: number
          good_years?: number
          last_claim_at?: string | null
          last_claim_with_fault?: boolean | null
          last_class_update?: string | null
          total_claims?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_risk_scores: {
        Row: {
          average_rating: number | null
          claims_against: number | null
          completed_bookings: number | null
          deposit_multiplier: number
          geofence_violations: number | null
          incidents: number | null
          kyc_verified: boolean | null
          late_returns: number | null
          payment_verified: boolean | null
          phone_verified: boolean | null
          price_multiplier: number
          risk_score: number
          risk_tier: string
          speed_violations: number | null
          total_bookings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_rating?: number | null
          claims_against?: number | null
          completed_bookings?: number | null
          deposit_multiplier?: number
          geofence_violations?: number | null
          incidents?: number | null
          kyc_verified?: boolean | null
          late_returns?: number | null
          payment_verified?: boolean | null
          phone_verified?: boolean | null
          price_multiplier?: number
          risk_score?: number
          risk_tier?: string
          speed_violations?: number | null
          total_bookings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_rating?: number | null
          claims_against?: number | null
          completed_bookings?: number | null
          deposit_multiplier?: number
          geofence_violations?: number | null
          incidents?: number | null
          kyc_verified?: boolean | null
          late_returns?: number | null
          payment_verified?: boolean | null
          phone_verified?: boolean | null
          price_multiplier?: number
          risk_score?: number
          risk_tier?: string
          speed_violations?: number | null
          total_bookings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_score_snapshots: {
        Row: {
          average_score: number
          class_distribution: Json
          created_at: string | null
          id: string
          snapshot_date: string
          total_drivers: number
        }
        Insert: {
          average_score: number
          class_distribution: Json
          created_at?: string | null
          id?: string
          snapshot_date: string
          total_drivers: number
        }
        Update: {
          average_score?: number
          class_distribution?: Json
          created_at?: string | null
          id?: string
          snapshot_date?: string
          total_drivers?: number
        }
        Relationships: []
      }
      edge_brain_memory: {
        Row: {
          base_branch: string | null
          change_percentage: number | null
          created_at: string | null
          error_message: string
          error_type: string
          execution_time_ms: number | null
          file_path: string | null
          file_pattern: string | null
          fix_branch: string | null
          fix_confidence: number | null
          human_approved: boolean | null
          id: string
          job_id: number | null
          lines_changed: number | null
          model_used: string
          patches_count: number | null
          pr_created: boolean | null
          pr_merged: boolean | null
          pr_number: number | null
          pr_outcome: string | null
          pr_outcome_at: string | null
          pr_url: string | null
          safety_check_passed: boolean | null
          safety_rejection_reason: string | null
          strategy_used: string
          temperature: number | null
          workflow_run_id: number | null
        }
        Insert: {
          base_branch?: string | null
          change_percentage?: number | null
          created_at?: string | null
          error_message: string
          error_type: string
          execution_time_ms?: number | null
          file_path?: string | null
          file_pattern?: string | null
          fix_branch?: string | null
          fix_confidence?: number | null
          human_approved?: boolean | null
          id?: string
          job_id?: number | null
          lines_changed?: number | null
          model_used: string
          patches_count?: number | null
          pr_created?: boolean | null
          pr_merged?: boolean | null
          pr_number?: number | null
          pr_outcome?: string | null
          pr_outcome_at?: string | null
          pr_url?: string | null
          safety_check_passed?: boolean | null
          safety_rejection_reason?: string | null
          strategy_used: string
          temperature?: number | null
          workflow_run_id?: number | null
        }
        Update: {
          base_branch?: string | null
          change_percentage?: number | null
          created_at?: string | null
          error_message?: string
          error_type?: string
          execution_time_ms?: number | null
          file_path?: string | null
          file_pattern?: string | null
          fix_branch?: string | null
          fix_confidence?: number | null
          human_approved?: boolean | null
          id?: string
          job_id?: number | null
          lines_changed?: number | null
          model_used?: string
          patches_count?: number | null
          pr_created?: boolean | null
          pr_merged?: boolean | null
          pr_number?: number | null
          pr_outcome?: string | null
          pr_outcome_at?: string | null
          pr_url?: string | null
          safety_check_passed?: boolean | null
          safety_rejection_reason?: string | null
          strategy_used?: string
          temperature?: number | null
          workflow_run_id?: number | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          link_url: string | null
          raw_payload: Json | null
          send_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          link_url?: string | null
          raw_payload?: Json | null
          send_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          link_url?: string | null
          raw_payload?: Json | null
          send_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          provider: string
          provider_message_id: string | null
          sent_at: string | null
          sequence_id: string | null
          status: string
          step_id: string | null
          subject: string
          subscriber_id: string
          to_email: string
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_id?: string | null
          subject: string
          subscriber_id: string
          to_email: string
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_id?: string | null
          subject?: string
          subscriber_id?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "v_sequence_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "email_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "v_inactive_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          created_at: string
          delay_days: number
          delay_hours: number
          html_content: string | null
          id: string
          is_active: boolean
          preview_text: string | null
          send_conditions: Json | null
          sequence_id: string
          step_number: number
          subject: string
          template_id: string | null
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_days?: number
          delay_hours?: number
          html_content?: string | null
          id?: string
          is_active?: boolean
          preview_text?: string | null
          send_conditions?: Json | null
          sequence_id: string
          step_number: number
          subject: string
          template_id?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_days?: number
          delay_hours?: number
          html_content?: string | null
          id?: string
          is_active?: boolean
          preview_text?: string | null
          send_conditions?: Json | null
          sequence_id?: string
          step_number?: number
          subject?: string
          template_id?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "v_sequence_performance"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          send_time_utc: string | null
          sequence_type: string
          slug: string
          target_audience: string
          timezone: string | null
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
          total_subscribers: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          send_time_utc?: string | null
          sequence_type: string
          slug: string
          target_audience: string
          timezone?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_subscribers?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          send_time_utc?: string | null
          sequence_type?: string
          slug?: string
          target_audience?: string
          timezone?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_subscribers?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_subscribers: {
        Row: {
          active_sequences: Json | null
          created_at: string
          email: string
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          first_name: string | null
          id: string
          last_activity_at: string | null
          last_email_clicked_at: string | null
          last_email_opened_at: string | null
          last_email_sent_at: string | null
          last_name: string | null
          preferences: Json | null
          source: string | null
          source_campaign_id: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          active_sequences?: Json | null
          created_at?: string
          email: string
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_email_clicked_at?: string | null
          last_email_opened_at?: string | null
          last_email_sent_at?: string | null
          last_name?: string | null
          preferences?: Json | null
          source?: string | null
          source_campaign_id?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          active_sequences?: Json | null
          created_at?: string
          email?: string
          emails_clicked?: number | null
          emails_opened?: number | null
          emails_sent?: number | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_email_clicked_at?: string | null
          last_email_opened_at?: string | null
          last_email_sent_at?: string | null
          last_name?: string | null
          preferences?: Json | null
          source?: string | null
          source_campaign_id?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscribers_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_audit_log: {
        Row: {
          attempted_operation: string
          created_at: string
          email_verified: boolean
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempted_operation: string
          created_at?: string
          email_verified: boolean
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempted_operation?: string
          created_at?: string
          email_verified?: boolean
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          algorithm: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          rotated_at: string | null
        }
        Insert: {
          algorithm?: string
          created_at?: string
          id: string
          is_active?: boolean
          key: string
          rotated_at?: string | null
        }
        Update: {
          algorithm?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          rotated_at?: string | null
        }
        Relationships: []
      }
      ev_policies: {
        Row: {
          average_range_km: number | null
          car_id: string
          charger_usage_included: boolean | null
          charging_instructions: string | null
          compatible_chargers: string[] | null
          created_at: string
          critical_soc: number
          deep_discharge_fee: number | null
          deep_discharge_soc: number
          id: string
          is_active: boolean | null
          low_return_fee_per_pct: number | null
          min_return_soc: number
          require_return_charged: boolean | null
          updated_at: string
        }
        Insert: {
          average_range_km?: number | null
          car_id: string
          charger_usage_included?: boolean | null
          charging_instructions?: string | null
          compatible_chargers?: string[] | null
          created_at?: string
          critical_soc?: number
          deep_discharge_fee?: number | null
          deep_discharge_soc?: number
          id?: string
          is_active?: boolean | null
          low_return_fee_per_pct?: number | null
          min_return_soc?: number
          require_return_charged?: boolean | null
          updated_at?: string
        }
        Update: {
          average_range_km?: number | null
          car_id?: string
          charger_usage_included?: boolean | null
          charging_instructions?: string | null
          compatible_chargers?: string[] | null
          created_at?: string
          critical_soc?: number
          deep_discharge_fee?: number | null
          deep_discharge_soc?: number
          id?: string
          is_active?: boolean | null
          low_return_fee_per_pct?: number | null
          min_return_soc?: number
          require_return_charged?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_policies_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policies_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policies_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policies_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: true
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      ev_policy_violations: {
        Row: {
          booking_id: string
          charged_at: string | null
          created_at: string
          evidence_data: Json | null
          fee_amount: number
          fee_status: string | null
          id: string
          notes: string | null
          policy_id: string
          recorded_soc: number | null
          required_soc: number | null
          violation_type: string
        }
        Insert: {
          booking_id: string
          charged_at?: string | null
          created_at?: string
          evidence_data?: Json | null
          fee_amount: number
          fee_status?: string | null
          id?: string
          notes?: string | null
          policy_id: string
          recorded_soc?: number | null
          required_soc?: number | null
          violation_type: string
        }
        Update: {
          booking_id?: string
          charged_at?: string | null
          created_at?: string
          evidence_data?: Json | null
          fee_amount?: number
          fee_status?: string | null
          id?: string
          notes?: string | null
          policy_id?: string
          recorded_soc?: number | null
          required_soc?: number | null
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ev_policy_violations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policy_violations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policy_violations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ev_policy_violations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "ev_policy_violations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "ev_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_items: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          description: string | null
          event_at: string
          evidence_type: string
          file_hash: string | null
          file_size: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          package_id: string
          title: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          event_at: string
          evidence_type: string
          file_hash?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          package_id: string
          title: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          event_at?: string
          evidence_type?: string
          file_hash?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          package_id?: string
          title?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "evidence_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_packages: {
        Row: {
          booking_id: string
          case_reference: string | null
          created_at: string
          id: string
          integrity_hash: string | null
          notes: string | null
          purpose: string
          sealed_at: string | null
          sealed_by: string | null
          status: string
          submitted_at: string | null
          submitted_to: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          case_reference?: string | null
          created_at?: string
          id?: string
          integrity_hash?: string | null
          notes?: string | null
          purpose: string
          sealed_at?: string | null
          sealed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          case_reference?: string | null
          created_at?: string
          id?: string
          integrity_hash?: string | null
          notes?: string | null
          purpose?: string
          sealed_at?: string | null
          sealed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_packages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      exchange_rate_sync_log: {
        Row: {
          binance_rate: number | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          id: string
          pair: string
          platform_rate: number | null
          success: boolean
          sync_method: string
          synced_at: string
        }
        Insert: {
          binance_rate?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          pair: string
          platform_rate?: number | null
          success: boolean
          sync_method: string
          synced_at?: string
        }
        Update: {
          binance_rate?: number | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          pair?: string
          platform_rate?: number | null
          success?: boolean
          sync_method?: string
          synced_at?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          id: number
          is_active: boolean | null
          last_updated: string | null
          pair: string
          rate: number
          source: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          is_active?: boolean | null
          last_updated?: string | null
          pair: string
          rate: number
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          is_active?: boolean | null
          last_updated?: string | null
          pair?: string
          rate?: number
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fb_posts_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          group_url: string | null
          id: string
          post_content: string
          post_type: string
          posted_at: string | null
          screenshot_url: string | null
          success: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          group_url?: string | null
          id?: string
          post_content: string
          post_type: string
          posted_at?: string | null
          screenshot_url?: string | null
          success?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          group_url?: string | null
          id?: string
          post_content?: string
          post_type?: string
          posted_at?: string | null
          screenshot_url?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      fb_prospects: {
        Row: {
          car_brand: string | null
          car_model: string | null
          car_year: number | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string | null
          facebook_name: string | null
          facebook_user_id: string | null
          id: string
          notes: string | null
          photos_count: number | null
          responded_at: string | null
          source_group: string | null
          source_post_url: string | null
          status: string | null
        }
        Insert: {
          car_brand?: string | null
          car_model?: string | null
          car_year?: number | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          facebook_name?: string | null
          facebook_user_id?: string | null
          id?: string
          notes?: string | null
          photos_count?: number | null
          responded_at?: string | null
          source_group?: string | null
          source_post_url?: string | null
          status?: string | null
        }
        Update: {
          car_brand?: string | null
          car_model?: string | null
          car_year?: number | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          facebook_name?: string | null
          facebook_user_id?: string | null
          id?: string
          notes?: string | null
          photos_count?: number | null
          responded_at?: string | null
          source_group?: string | null
          source_post_url?: string | null
          status?: string | null
        }
        Relationships: []
      }
      feature_flag_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          feature_flag_id: string | null
          feature_flag_name: string
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          feature_flag_id?: string | null
          feature_flag_name: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          feature_flag_id?: string | null
          feature_flag_name?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_events: {
        Row: {
          anonymous_id: string | null
          context: Json | null
          created_at: string | null
          enabled: boolean
          flag_id: string | null
          flag_name: string | null
          id: string
          user_id: string | null
          variant: string | null
        }
        Insert: {
          anonymous_id?: string | null
          context?: Json | null
          created_at?: string | null
          enabled: boolean
          flag_id?: string | null
          flag_name?: string | null
          id?: string
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          anonymous_id?: string | null
          context?: Json | null
          created_at?: string | null
          enabled?: boolean
          flag_id?: string | null
          flag_name?: string | null
          id?: string
          user_id?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_events_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          feature_flag_id: string
          id: string
          reason: string | null
          user_id: string
          variant: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled: boolean
          expires_at?: string | null
          feature_flag_id: string
          id?: string
          reason?: string | null
          user_id: string
          variant?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_flag_id?: string
          id?: string
          reason?: string | null
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          environment: string
          expires_at: string | null
          id: string
          key: string | null
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          targeting_rules: Json | null
          updated_at: string
          updated_by: string | null
          user_segments: Json | null
          variants: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          expires_at?: string | null
          id?: string
          key?: string | null
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          targeting_rules?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_segments?: Json | null
          variants?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          expires_at?: string | null
          id?: string
          key?: string | null
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          targeting_rules?: Json | null
          updated_at?: string
          updated_by?: string | null
          user_segments?: Json | null
          variants?: Json | null
        }
        Relationships: []
      }
      fgo_claims: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          booking_id: string | null
          claim_type: string
          claimant_id: string
          created_at: string | null
          evidence_urls: string[] | null
          id: string
          paid_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_requested: number
          booking_id?: string | null
          claim_type: string
          claimant_id: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          paid_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          booking_id?: string | null
          claim_type?: string
          claimant_id?: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          paid_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fgo_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "fgo_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fgo_contributions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fgo_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgo_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      fgo_fund: {
        Row: {
          balance: number | null
          id: string
          total_claims_paid: number | null
          total_collected: number | null
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          id?: string
          total_claims_paid?: number | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          total_claims_paid?: number | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      fgo_metrics: {
        Row: {
          alpha_percentage: number
          avg_recovery_rate: number | null
          coverage_ratio: number | null
          id: boolean
          last_calculated_at: string
          loss_ratio: number | null
          lr_365d: number | null
          lr_90d: number | null
          meta: Json
          pem_cents: number | null
          pem_window_days: number | null
          status: string
          target_balance_cents: number | null
          target_months_coverage: number
          total_contributions_cents: number
          total_events_90d: number | null
          total_siniestros_count: number
          total_siniestros_paid_cents: number
          updated_at: string
        }
        Insert: {
          alpha_percentage?: number
          avg_recovery_rate?: number | null
          coverage_ratio?: number | null
          id?: boolean
          last_calculated_at?: string
          loss_ratio?: number | null
          lr_365d?: number | null
          lr_90d?: number | null
          meta?: Json
          pem_cents?: number | null
          pem_window_days?: number | null
          status?: string
          target_balance_cents?: number | null
          target_months_coverage?: number
          total_contributions_cents?: number
          total_events_90d?: number | null
          total_siniestros_count?: number
          total_siniestros_paid_cents?: number
          updated_at?: string
        }
        Update: {
          alpha_percentage?: number
          avg_recovery_rate?: number | null
          coverage_ratio?: number | null
          id?: boolean
          last_calculated_at?: string
          loss_ratio?: number | null
          lr_365d?: number | null
          lr_90d?: number | null
          meta?: Json
          pem_cents?: number | null
          pem_window_days?: number | null
          status?: string
          target_balance_cents?: number | null
          target_months_coverage?: number
          total_contributions_cents?: number
          total_events_90d?: number | null
          total_siniestros_count?: number
          total_siniestros_paid_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      fgo_parameters: {
        Row: {
          alpha: number
          alpha_max: number
          alpha_min: number
          bucket: string
          country_code: string
          event_cap_usd: number
          id: string
          loss_ratio_target: number
          monthly_payout_cap: number
          per_user_limit: number
          rc_floor: number
          rc_hard_floor: number
          rc_soft_ceiling: number
          updated_at: string
        }
        Insert: {
          alpha?: number
          alpha_max?: number
          alpha_min?: number
          bucket: string
          country_code: string
          event_cap_usd?: number
          id?: string
          loss_ratio_target?: number
          monthly_payout_cap?: number
          per_user_limit?: number
          rc_floor?: number
          rc_hard_floor?: number
          rc_soft_ceiling?: number
          updated_at?: string
        }
        Update: {
          alpha?: number
          alpha_max?: number
          alpha_min?: number
          bucket?: string
          country_code?: string
          event_cap_usd?: number
          id?: string
          loss_ratio_target?: number
          monthly_payout_cap?: number
          per_user_limit?: number
          rc_floor?: number
          rc_hard_floor?: number
          rc_soft_ceiling?: number
          updated_at?: string
        }
        Relationships: []
      }
      fgo_subfunds: {
        Row: {
          balance_cents: number
          created_at: string
          id: string
          meta: Json
          subfund_type: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          id?: string
          meta?: Json
          subfund_type: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          id?: string
          meta?: Json
          subfund_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fipe_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          from_currency: string
          id: string
          is_active: boolean
          metadata: Json | null
          rate: number
          source: string | null
          source_reference: string | null
          to_currency: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          from_currency: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          rate: number
          source?: string | null
          source_reference?: string | null
          to_currency: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          from_currency?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          rate?: number
          source?: string | null
          source_reference?: string | null
          to_currency?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          connected_at: string | null
          created_at: string | null
          expires_at: string
          last_synced_at: string | null
          primary_calendar_id: string | null
          refresh_token: string
          scope: string
          sync_enabled: boolean | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          created_at?: string | null
          expires_at: string
          last_synced_at?: string | null
          primary_calendar_id?: string | null
          refresh_token: string
          scope: string
          sync_enabled?: boolean | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string
          last_synced_at?: string | null
          primary_calendar_id?: string | null
          refresh_token?: string
          scope?: string
          sync_enabled?: boolean | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      immobilizer_commands: {
        Row: {
          acknowledged_at: string | null
          approval_required: boolean | null
          approved_by: string | null
          booking_id: string | null
          car_id: string
          command_type: string
          created_at: string
          device_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          location_at_command: Json | null
          notes: string | null
          reason: string
          requested_by: string
          sent_at: string | null
          status: string
          vehicle_speed_at_command: number | null
          vehicle_stationary_confirmed: boolean | null
        }
        Insert: {
          acknowledged_at?: string | null
          approval_required?: boolean | null
          approved_by?: string | null
          booking_id?: string | null
          car_id: string
          command_type: string
          created_at?: string
          device_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          location_at_command?: Json | null
          notes?: string | null
          reason: string
          requested_by: string
          sent_at?: string | null
          status?: string
          vehicle_speed_at_command?: number | null
          vehicle_stationary_confirmed?: boolean | null
        }
        Update: {
          acknowledged_at?: string | null
          approval_required?: boolean | null
          approved_by?: string | null
          booking_id?: string | null
          car_id?: string
          command_type?: string
          created_at?: string
          device_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          location_at_command?: Json | null
          notes?: string | null
          reason?: string
          requested_by?: string
          sent_at?: string | null
          status?: string
          vehicle_speed_at_command?: number | null
          vehicle_stationary_confirmed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "immobilizer_commands_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "immobilizer_commands_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "immobilizer_commands_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_device_heartbeats: {
        Row: {
          battery_level: number | null
          device_id: string
          id: string
          metadata: Json | null
          received_at: string
          signal_strength: number | null
          status: string | null
          temperature: number | null
        }
        Insert: {
          battery_level?: number | null
          device_id: string
          id?: string
          metadata?: Json | null
          received_at?: string
          signal_strength?: number | null
          status?: string | null
          temperature?: number | null
        }
        Update: {
          battery_level?: number | null
          device_id?: string
          id?: string
          metadata?: Json | null
          received_at?: string
          signal_strength?: number | null
          status?: string | null
          temperature?: number | null
        }
        Relationships: []
      }
      iot_devices: {
        Row: {
          alert_on_tamper: boolean | null
          api_key_hash: string | null
          capabilities: string[] | null
          car_id: string | null
          certificate_fingerprint: string | null
          config: Json | null
          created_at: string
          device_id: string
          device_type: string
          firmware_version: string | null
          id: string
          installed_at: string | null
          installed_by: string | null
          last_location_at: string | null
          last_seen_at: string | null
          last_telemetry_at: string | null
          manufacturer: string | null
          model: string | null
          offline_threshold_minutes: number | null
          status: string
          updated_at: string
        }
        Insert: {
          alert_on_tamper?: boolean | null
          api_key_hash?: string | null
          capabilities?: string[] | null
          car_id?: string | null
          certificate_fingerprint?: string | null
          config?: Json | null
          created_at?: string
          device_id: string
          device_type: string
          firmware_version?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          last_location_at?: string | null
          last_seen_at?: string | null
          last_telemetry_at?: string | null
          manufacturer?: string | null
          model?: string | null
          offline_threshold_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          alert_on_tamper?: boolean | null
          api_key_hash?: string | null
          capabilities?: string[] | null
          car_id?: string | null
          certificate_fingerprint?: string | null
          config?: Json | null
          created_at?: string
          device_id?: string
          device_type?: string
          firmware_version?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          last_location_at?: string | null
          last_seen_at?: string | null
          last_telemetry_at?: string | null
          manufacturer?: string | null
          model?: string | null
          offline_threshold_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iot_devices_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_devices_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_devices_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_devices_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_alerts: {
        Row: {
          alert_type: string
          content_id: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          persona_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          persona_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          alert_type?: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          persona_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_alerts_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_alerts_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "marketing_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_authority_concepts: {
        Row: {
          created_at: string | null
          engagement_rate: number | null
          extra_hashtags: string[] | null
          financial_analogy: string
          first_comment_template: string | null
          full_caption_template: string | null
          hook_line: string | null
          id: string
          image_reference: string | null
          image_scene_concept: string
          is_active: boolean | null
          last_used_at: string | null
          parenting_pain_point: string
          performance_score: number | null
          term_name: string
          times_used: number | null
          total_engagements: number | null
          total_impressions: number | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          engagement_rate?: number | null
          extra_hashtags?: string[] | null
          financial_analogy: string
          first_comment_template?: string | null
          full_caption_template?: string | null
          hook_line?: string | null
          id?: string
          image_reference?: string | null
          image_scene_concept: string
          is_active?: boolean | null
          last_used_at?: string | null
          parenting_pain_point: string
          performance_score?: number | null
          term_name: string
          times_used?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          engagement_rate?: number | null
          extra_hashtags?: string[] | null
          financial_analogy?: string
          first_comment_template?: string | null
          full_caption_template?: string | null
          hook_line?: string | null
          id?: string
          image_reference?: string | null
          image_scene_concept?: string
          is_active?: boolean | null
          last_used_at?: string | null
          parenting_pain_point?: string
          performance_score?: number | null
          term_name?: string
          times_used?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      marketing_bio_links: {
        Row: {
          click_count: number | null
          created_at: string | null
          description: string | null
          display_order: number
          ends_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          platform: string
          starts_at: string | null
          title: string
          updated_at: string | null
          url: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          ends_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          starts_at?: string | null
          title: string
          updated_at?: string | null
          url: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          ends_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          starts_at?: string | null
          title?: string
          updated_at?: string | null
          url?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget_usd: number | null
          campaign_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          platforms: string[]
          start_date: string
          status: string
          target_audience: string
          template_id: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          budget_usd?: number | null
          campaign_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          platforms: string[]
          start_date: string
          status?: string
          target_audience: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          budget_usd?: number | null
          campaign_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          platforms?: string[]
          start_date?: string
          status?: string
          target_audience?: string
          template_id?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      marketing_content: {
        Row: {
          ai_model: string | null
          content_type: string
          context: Json
          created_at: string | null
          engagement: Json | null
          error_message: string | null
          generated_content: string
          id: string
          persona_id: string | null
          platform: string
          post_url: string | null
          posted_at: string | null
          screenshot_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_model?: string | null
          content_type: string
          context?: Json
          created_at?: string | null
          engagement?: Json | null
          error_message?: string | null
          generated_content: string
          id?: string
          persona_id?: string | null
          platform: string
          post_url?: string | null
          posted_at?: string | null
          screenshot_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_model?: string | null
          content_type?: string
          context?: Json
          created_at?: string | null
          engagement?: Json | null
          error_message?: string | null
          generated_content?: string
          id?: string
          persona_id?: string | null
          platform?: string
          post_url?: string | null
          posted_at?: string | null
          screenshot_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "marketing_personas"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_content_dlq: {
        Row: {
          all_errors: Json | null
          content_type: string | null
          hashtags: string[] | null
          id: string
          last_error: string | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          moved_to_dlq_at: string | null
          original_queue_id: string
          original_scheduled_for: string | null
          platform: string
          resolution_notes: string | null
          resolved_at: string | null
          text_content: string | null
          total_attempts: number | null
        }
        Insert: {
          all_errors?: Json | null
          content_type?: string | null
          hashtags?: string[] | null
          id?: string
          last_error?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          moved_to_dlq_at?: string | null
          original_queue_id: string
          original_scheduled_for?: string | null
          platform: string
          resolution_notes?: string | null
          resolved_at?: string | null
          text_content?: string | null
          total_attempts?: number | null
        }
        Update: {
          all_errors?: Json | null
          content_type?: string | null
          hashtags?: string[] | null
          id?: string
          last_error?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          moved_to_dlq_at?: string | null
          original_queue_id?: string
          original_scheduled_for?: string | null
          platform?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          text_content?: string | null
          total_attempts?: number | null
        }
        Relationships: []
      }
      marketing_content_queue: {
        Row: {
          attempts: number | null
          authority_concept_id: string | null
          call_to_action: string | null
          content_type: string
          created_at: string | null
          error_history: Json | null
          error_message: string | null
          hashtags: string[] | null
          hook_variant_id: string | null
          id: string
          last_error_at: string | null
          max_attempts: number | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          next_retry_at: string | null
          platform: string
          published_at: string | null
          scheduled_for: string
          status: string | null
          text_content: string
        }
        Insert: {
          attempts?: number | null
          authority_concept_id?: string | null
          call_to_action?: string | null
          content_type: string
          created_at?: string | null
          error_history?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          hook_variant_id?: string | null
          id?: string
          last_error_at?: string | null
          max_attempts?: number | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          platform: string
          published_at?: string | null
          scheduled_for: string
          status?: string | null
          text_content: string
        }
        Update: {
          attempts?: number | null
          authority_concept_id?: string | null
          call_to_action?: string | null
          content_type?: string
          created_at?: string | null
          error_history?: Json | null
          error_message?: string | null
          hashtags?: string[] | null
          hook_variant_id?: string | null
          id?: string
          last_error_at?: string | null
          max_attempts?: number | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          next_retry_at?: string | null
          platform?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string | null
          text_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_content_queue_authority_concept_id_fkey"
            columns: ["authority_concept_id"]
            isOneToOne: false
            referencedRelation: "marketing_authority_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_queue_authority_concept_id_fkey"
            columns: ["authority_concept_id"]
            isOneToOne: false
            referencedRelation: "v_authority_posts_ready"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_content_queue_hook_variant_id_fkey"
            columns: ["hook_variant_id"]
            isOneToOne: false
            referencedRelation: "marketing_hook_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_engagement: {
        Row: {
          content_id: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number | null
          recorded_at: string | null
        }
        Insert: {
          content_id?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Update: {
          content_id?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_engagement_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_generation_jobs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          request_payload: Json
          result: Json | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          request_payload: Json
          result?: Json | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          request_payload?: Json
          result?: Json | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_hook_variants: {
        Row: {
          content_type: string
          created_at: string | null
          description: string | null
          engagement_rate: number | null
          engagements: number | null
          hook_template: string
          id: string
          impressions: number | null
          is_active: boolean | null
          link_clicks: number | null
          saves: number | null
          shares: number | null
          updated_at: string | null
          variant_name: string
          weight: number | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          description?: string | null
          engagement_rate?: number | null
          engagements?: number | null
          hook_template: string
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          link_clicks?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
          variant_name: string
          weight?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          description?: string | null
          engagement_rate?: number | null
          engagements?: number | null
          hook_template?: string
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          link_clicks?: number | null
          saves?: number | null
          shares?: number | null
          updated_at?: string | null
          variant_name?: string
          weight?: number | null
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          ad_id: string | null
          adgroup_id: string | null
          advertiser_id: string | null
          campaign_id: string | null
          car_brand: string | null
          car_model: string | null
          car_year: number | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          form_id: string | null
          full_name: string | null
          has_car: boolean | null
          id: string
          last_name: string | null
          lead_id: string | null
          lead_type: string | null
          metadata: Json | null
          phone: string | null
          platform: string
          raw_payload: Json
          received_at: string | null
          region: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id?: string | null
          adgroup_id?: string | null
          advertiser_id?: string | null
          campaign_id?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          form_id?: string | null
          full_name?: string | null
          has_car?: boolean | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          lead_type?: string | null
          metadata?: Json | null
          phone?: string | null
          platform: string
          raw_payload?: Json
          received_at?: string | null
          region?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string | null
          adgroup_id?: string | null
          advertiser_id?: string | null
          campaign_id?: string | null
          car_brand?: string | null
          car_model?: string | null
          car_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          form_id?: string | null
          full_name?: string | null
          has_car?: boolean | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          lead_type?: string | null
          metadata?: Json | null
          phone?: string | null
          platform?: string
          raw_payload?: Json
          received_at?: string | null
          region?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_metrics_daily: {
        Row: {
          campaign_id: string
          clicks: number | null
          conversions: number | null
          created_at: string
          facebook_impressions: number | null
          id: string
          impressions: number | null
          instagram_impressions: number | null
          metric_date: string
          revenue_usd: number | null
          tiktok_impressions: number | null
          twitter_impressions: number | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          facebook_impressions?: number | null
          id?: string
          impressions?: number | null
          instagram_impressions?: number | null
          metric_date: string
          revenue_usd?: number | null
          tiktok_impressions?: number | null
          twitter_impressions?: number | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          facebook_impressions?: number | null
          id?: string
          impressions?: number | null
          instagram_impressions?: number | null
          metric_date?: string
          revenue_usd?: number | null
          tiktok_impressions?: number | null
          twitter_impressions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_metrics_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_monitors: {
        Row: {
          check_frequency_minutes: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[]
          last_check_at: string | null
          name: string
          platform: string
          posts_found_today: number | null
          rss_feed_url: string | null
          target_groups: string[] | null
          target_hashtags: string[] | null
          updated_at: string | null
        }
        Insert: {
          check_frequency_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords: string[]
          last_check_at?: string | null
          name: string
          platform: string
          posts_found_today?: number | null
          rss_feed_url?: string | null
          target_groups?: string[] | null
          target_hashtags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          check_frequency_minutes?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[]
          last_check_at?: string | null
          name?: string
          platform?: string
          posts_found_today?: number | null
          rss_feed_url?: string | null
          target_groups?: string[] | null
          target_hashtags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_personas: {
        Row: {
          comments_today: number | null
          cookies_encrypted: string | null
          created_at: string | null
          facebook_account_id: string | null
          id: string
          instagram_account_id: string | null
          is_active: boolean | null
          is_shadowbanned: boolean | null
          last_comment_at: string | null
          last_post_at: string | null
          name: string
          posts_today: number | null
          profile_metadata: Json
          proxy_assigned: string | null
          shadowban_detected_at: string | null
          twitter_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          comments_today?: number | null
          cookies_encrypted?: string | null
          created_at?: string | null
          facebook_account_id?: string | null
          id?: string
          instagram_account_id?: string | null
          is_active?: boolean | null
          is_shadowbanned?: boolean | null
          last_comment_at?: string | null
          last_post_at?: string | null
          name: string
          posts_today?: number | null
          profile_metadata?: Json
          proxy_assigned?: string | null
          shadowban_detected_at?: string | null
          twitter_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comments_today?: number | null
          cookies_encrypted?: string | null
          created_at?: string | null
          facebook_account_id?: string | null
          id?: string
          instagram_account_id?: string | null
          is_active?: boolean | null
          is_shadowbanned?: boolean | null
          last_comment_at?: string | null
          last_post_at?: string | null
          name?: string
          posts_today?: number | null
          profile_metadata?: Json
          proxy_assigned?: string | null
          shadowban_detected_at?: string | null
          twitter_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_posts_log: {
        Row: {
          content_type: string | null
          engagement: Json | null
          engagement_updated_at: string | null
          hashtags: string[] | null
          id: string
          media_url: string | null
          metadata: Json | null
          platform: string
          post_id: string | null
          post_url: string | null
          published_at: string | null
          queue_id: string | null
          text_content: string | null
        }
        Insert: {
          content_type?: string | null
          engagement?: Json | null
          engagement_updated_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
          platform: string
          post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          queue_id?: string | null
          text_content?: string | null
        }
        Update: {
          content_type?: string | null
          engagement?: Json | null
          engagement_updated_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
          platform?: string
          post_id?: string | null
          post_url?: string | null
          published_at?: string | null
          queue_id?: string | null
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_posts_log_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "marketing_content_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          booking_id: string | null
          car_id: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          is_flagged: boolean | null
          is_system_message: boolean | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          car_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_flagged?: boolean | null
          is_system_message?: boolean | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          car_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          is_flagged?: boolean | null
          is_system_message?: boolean | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "messages_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_editions: {
        Row: {
          created_at: string
          created_by: string | null
          edition_number: number
          html_content: string
          id: string
          preview_text: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          target_audience: string
          title: string
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          edition_number: number
          html_content: string
          id?: string
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          target_audience?: string
          title: string
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          edition_number?: number
          html_content?: string
          id?: string
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          target_audience?: string
          title?: string
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          action_taken: string | null
          body: string
          channels_used: string[]
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          id: string
          read_at: string | null
          template_code: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          body: string
          channels_used: string[]
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          template_code?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          body?: string
          channels_used?: string[]
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read_at?: string | null
          template_code?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          booking_updates: boolean | null
          chat_messages: boolean | null
          created_at: string | null
          digest_mode: boolean | null
          digest_time: string | null
          email_enabled: boolean | null
          id: string
          payment_alerts: boolean | null
          price_alerts: boolean | null
          promotional: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          review_reminders: boolean | null
          sms_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          vehicle_alerts: boolean | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          booking_updates?: boolean | null
          chat_messages?: boolean | null
          created_at?: string | null
          digest_mode?: boolean | null
          digest_time?: string | null
          email_enabled?: boolean | null
          id?: string
          payment_alerts?: boolean | null
          price_alerts?: boolean | null
          promotional?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          review_reminders?: boolean | null
          sms_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_alerts?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          booking_updates?: boolean | null
          chat_messages?: boolean | null
          created_at?: string | null
          digest_mode?: boolean | null
          digest_time?: string | null
          email_enabled?: boolean | null
          id?: string
          payment_alerts?: boolean | null
          price_alerts?: boolean | null
          promotional?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          review_reminders?: boolean | null
          sms_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_alerts?: boolean | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          channels: string[] | null
          created_at: string | null
          data: Json
          delivery_results: Json | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          priority: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          template_code: string
          user_id: string
        }
        Insert: {
          channels?: string[] | null
          created_at?: string | null
          data?: Json
          delivery_results?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          priority?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_code: string
          user_id: string
        }
        Update: {
          channels?: string[] | null
          created_at?: string | null
          data?: Json
          delivery_results?: Json | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          priority?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      notification_settings: {
        Row: {
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_url_template: string | null
          body_template: string
          buttons: Json | null
          category: string
          code: string
          created_at: string | null
          icon: string | null
          id: string
          image_url_template: string | null
          is_active: boolean | null
          priority: string | null
          title_template: string
          updated_at: string | null
        }
        Insert: {
          action_url_template?: string | null
          body_template: string
          buttons?: Json | null
          category: string
          code: string
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url_template?: string | null
          is_active?: boolean | null
          priority?: string | null
          title_template: string
          updated_at?: string | null
        }
        Update: {
          action_url_template?: string | null
          body_template?: string
          buttons?: Json | null
          category?: string
          code?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          image_url_template?: string | null
          is_active?: boolean | null
          priority?: string | null
          title_template?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          cta_link: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          cta_link?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_link?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      otp_delivery_logs: {
        Row: {
          channel: string
          created_at: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          phone: string
          provider_message_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          phone: string
          provider_message_id?: string | null
          sent_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          phone?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      outreach_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          messages_delivered: number | null
          messages_read: number | null
          messages_sent: number | null
          name: string
          responses_received: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          target_tags: string[] | null
          template_message: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          messages_delivered?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          name: string
          responses_received?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          target_tags?: string[] | null
          template_message: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          messages_delivered?: number | null
          messages_read?: number | null
          messages_sent?: number | null
          name?: string
          responses_received?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          target_tags?: string[] | null
          template_message?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      outreach_contacts: {
        Row: {
          created_at: string | null
          first_name: string | null
          followup_sent: boolean | null
          followup_sent_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_message_sent_at: string | null
          last_outreach_at: string | null
          last_response_at: string | null
          messages_sent: number | null
          metadata: Json | null
          notes: string | null
          phone: string
          requires_human: boolean | null
          source: string | null
          status: string | null
          tags: string[] | null
          tiktok_lead_id: string | null
          updated_at: string | null
          whatsapp_id: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          followup_sent?: boolean | null
          followup_sent_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_message_sent_at?: string | null
          last_outreach_at?: string | null
          last_response_at?: string | null
          messages_sent?: number | null
          metadata?: Json | null
          notes?: string | null
          phone: string
          requires_human?: boolean | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tiktok_lead_id?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          followup_sent?: boolean | null
          followup_sent_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_message_sent_at?: string | null
          last_outreach_at?: string | null
          last_response_at?: string | null
          messages_sent?: number | null
          metadata?: Json | null
          notes?: string | null
          phone?: string
          requires_human?: boolean | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          tiktok_lead_id?: string | null
          updated_at?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contacts_tiktok_lead_id_fkey"
            columns: ["tiktok_lead_id"]
            isOneToOne: false
            referencedRelation: "marketing_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          contact_id: string | null
          content: string
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          contact_id?: string | null
          content: string
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_cooldowns: {
        Row: {
          booking_id: string | null
          car_id: string | null
          created_at: string | null
          ends_at: string
          id: string
          owner_id: string
          reason: string
          starts_at: string
        }
        Insert: {
          booking_id?: string | null
          car_id?: string | null
          created_at?: string | null
          ends_at: string
          id?: string
          owner_id: string
          reason: string
          starts_at?: string
        }
        Update: {
          booking_id?: string | null
          car_id?: string | null
          created_at?: string | null
          ends_at?: string
          id?: string
          owner_id?: string
          reason?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_cooldowns_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "owner_cooldowns_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_cooldowns_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_gaming_signals: {
        Row: {
          action_taken: string | null
          details: Json | null
          detected_at: string | null
          id: string
          notes: string | null
          owner_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_score: number
          signal_type: string
          status: string
        }
        Insert: {
          action_taken?: string | null
          details?: Json | null
          detected_at?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          signal_type: string
          status?: string
        }
        Update: {
          action_taken?: string | null
          details?: Json | null
          detected_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_score?: number
          signal_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_gaming_signals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_gaming_signals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_gaming_signals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_gaming_signals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_monthly_summary: {
        Row: {
          calculated_at: string | null
          capped_share: number
          cars_capped: number
          cars_contributing: number
          created_at: string | null
          eligibility_reasons: string[] | null
          eligible_days: number
          gaming_risk_score: number | null
          id: string
          is_eligible: boolean
          month: string
          owner_id: string
          paid_at: string | null
          payout_status: string
          payout_usd: number
          points_used: number
          raw_share: number
          total_points: number
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          capped_share?: number
          cars_capped?: number
          cars_contributing?: number
          created_at?: string | null
          eligibility_reasons?: string[] | null
          eligible_days?: number
          gaming_risk_score?: number | null
          id?: string
          is_eligible?: boolean
          month: string
          owner_id: string
          paid_at?: string | null
          payout_status?: string
          payout_usd?: number
          points_used?: number
          raw_share?: number
          total_points?: number
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          capped_share?: number
          cars_capped?: number
          cars_contributing?: number
          created_at?: string | null
          eligibility_reasons?: string[] | null
          eligible_days?: number
          gaming_risk_score?: number | null
          id?: string
          is_eligible?: boolean
          month?: string
          owner_id?: string
          paid_at?: string | null
          payout_status?: string
          payout_usd?: number
          points_used?: number
          raw_share?: number
          total_points?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_monthly_summary_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_monthly_summary_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passkey_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_captures_queue: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string | null
          currency: string | null
          error_log: Json | null
          id: string
          processed_at: string | null
          reason: string | null
          status: string | null
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string | null
          currency?: string | null
          error_log?: Json | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string | null
          currency?: string | null
          error_log?: Json | null
          id?: string
          processed_at?: string | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_captures_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_captures_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_captures_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_captures_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      pending_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string | null
          target_url: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          status?: string | null
          target_url: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string | null
          target_url?: string
        }
        Relationships: []
      }
      phone_otp_codes: {
        Row: {
          attempts: number | null
          channel: string
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          channel?: string
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          channel?: string
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      photo_quality_logs: {
        Row: {
          area_coverage: number | null
          car_id: string | null
          created_at: string | null
          detected_subject: string | null
          expected_position: string | null
          expected_subject: string
          id: string
          image_url: string
          is_acceptable: boolean | null
          issues: Json | null
          position_detected: string | null
          quality_score: number | null
          recommendations: Json | null
          user_id: string | null
        }
        Insert: {
          area_coverage?: number | null
          car_id?: string | null
          created_at?: string | null
          detected_subject?: string | null
          expected_position?: string | null
          expected_subject: string
          id?: string
          image_url: string
          is_acceptable?: boolean | null
          issues?: Json | null
          position_detected?: string | null
          quality_score?: number | null
          recommendations?: Json | null
          user_id?: string | null
        }
        Update: {
          area_coverage?: number | null
          car_id?: string | null
          created_at?: string | null
          detected_subject?: string | null
          expected_position?: string | null
          expected_subject?: string
          id?: string
          image_url?: string
          is_acceptable?: boolean | null
          issues?: Json | null
          position_detected?: string | null
          quality_score?: number | null
          recommendations?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_quality_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_quality_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_quality_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_quality_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      plate_detection_logs: {
        Row: {
          blurred_image_url: string | null
          car_id: string | null
          created_at: string | null
          id: string
          image_url: string
          plates_detected: number | null
          plates_masked: Json | null
          user_id: string | null
          was_blurred: boolean | null
        }
        Insert: {
          blurred_image_url?: string | null
          car_id?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          plates_detected?: number | null
          plates_masked?: Json | null
          user_id?: string | null
          was_blurred?: boolean | null
        }
        Update: {
          blurred_image_url?: string | null
          car_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          plates_detected?: number | null
          plates_masked?: Json | null
          user_id?: string | null
          was_blurred?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "plate_detection_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plate_detection_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plate_detection_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plate_detection_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_config: {
        Row: {
          category: string | null
          created_at: string | null
          data_type: string
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          data_type: string
          description?: string | null
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          data_type?: string
          description?: string | null
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      playbook_executions: {
        Row: {
          booking_id: string | null
          completed_at: string | null
          created_at: string
          current_step: number | null
          id: string
          playbook_id: string
          recovery_case_id: string | null
          started_at: string
          status: string
          steps_completed: Json | null
          ticket_id: string | null
        }
        Insert: {
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          playbook_id: string
          recovery_case_id?: string | null
          started_at?: string
          status?: string
          steps_completed?: Json | null
          ticket_id?: string | null
        }
        Update: {
          booking_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number | null
          id?: string
          playbook_id?: string
          recovery_case_id?: string | null
          started_at?: string
          status?: string
          steps_completed?: Json | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_executions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "playbook_executions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "support_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_recovery_case_id_fkey"
            columns: ["recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_executions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_steps: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string
          description: string | null
          escalate_to: string | null
          id: string
          playbook_id: string
          required: boolean | null
          step_order: number
          title: string
          wait_duration_minutes: number | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string
          description?: string | null
          escalate_to?: string | null
          id?: string
          playbook_id: string
          required?: boolean | null
          step_order: number
          title: string
          wait_duration_minutes?: number | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string
          description?: string | null
          escalate_to?: string | null
          id?: string
          playbook_id?: string
          required?: boolean | null
          step_order?: number
          title?: string
          wait_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playbook_steps_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "support_playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_class_factors: {
        Row: {
          class: number
          created_at: string
          description: string | null
          fee_multiplier: number
          guarantee_multiplier: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          class: number
          created_at?: string
          description?: string | null
          fee_multiplier: number
          guarantee_multiplier: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          class?: number
          created_at?: string
          description?: string | null
          fee_multiplier?: number
          guarantee_multiplier?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      pricing_demand_snapshots: {
        Row: {
          active_bookings: number
          created_at: string | null
          demand_ratio: number
          id: string
          price_multiplier: number
          region: string
          region_id: string | null
          total_cars: number
        }
        Insert: {
          active_bookings: number
          created_at?: string | null
          demand_ratio: number
          id?: string
          price_multiplier: number
          region: string
          region_id?: string | null
          total_cars: number
        }
        Update: {
          active_bookings?: number
          created_at?: string | null
          demand_ratio?: number
          id?: string
          price_multiplier?: number
          region?: string
          region_id?: string | null
          total_cars?: number
        }
        Relationships: []
      }
      pricing_seasons: {
        Row: {
          country: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          multiplier: number
          name: string
          recurring_yearly: boolean | null
          region: string | null
          start_date: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number
          name: string
          recurring_yearly?: boolean | null
          region?: string | null
          start_date?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number
          name?: string
          recurring_yearly?: boolean | null
          region?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_rating: number | null
          cancellation_count_90d: number | null
          cancelled_rentals_count: number | null
          completed_rentals_count: number | null
          created_at: string
          default_currency: string
          disputes_count: number | null
          email_verified: boolean | null
          email_verified_at: string | null
          full_name: string
          id: string
          id_verified: boolean | null
          is_admin: boolean
          last_cancellation_check: string | null
          onboarding: Database["public"]["Enums"]["onboarding_status"]
          phone: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          rating_avg: number | null
          rating_count: number | null
          renter_level: string | null
          renter_level_updated_at: string | null
          risk_score: number | null
          risk_score_updated_at: string | null
          role: string
          updated_at: string | null
          visibility_penalty_until: string | null
        }
        Insert: {
          avatar_url?: string | null
          average_rating?: number | null
          cancellation_count_90d?: number | null
          cancelled_rentals_count?: number | null
          completed_rentals_count?: number | null
          created_at?: string
          default_currency?: string
          disputes_count?: number | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name: string
          id: string
          id_verified?: boolean | null
          is_admin?: boolean
          last_cancellation_check?: string | null
          onboarding?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          renter_level?: string | null
          renter_level_updated_at?: string | null
          risk_score?: number | null
          risk_score_updated_at?: string | null
          role?: string
          updated_at?: string | null
          visibility_penalty_until?: string | null
        }
        Update: {
          avatar_url?: string | null
          average_rating?: number | null
          cancellation_count_90d?: number | null
          cancelled_rentals_count?: number | null
          completed_rentals_count?: number | null
          created_at?: string
          default_currency?: string
          disputes_count?: number | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          full_name?: string
          id?: string
          id_verified?: boolean | null
          is_admin?: boolean
          last_cancellation_check?: string | null
          onboarding?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          renter_level?: string | null
          renter_level_updated_at?: string | null
          risk_score?: number | null
          risk_score_updated_at?: string | null
          role?: string
          updated_at?: string | null
          visibility_penalty_until?: string | null
        }
        Relationships: []
      }
      promos: {
        Row: {
          amount_off: number | null
          code: string
          id: string
          max_redemptions: number | null
          percent_off: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          amount_off?: number | null
          code: string
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          amount_off?: number | null
          code?: string
          id?: string
          max_redemptions?: number | null
          percent_off?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      query_performance_log: {
        Row: {
          caller_function: string | null
          created_at: string
          execution_time_ms: number
          id: string
          params_summary: Json | null
          planning_time_ms: number | null
          query_hash: string | null
          query_name: string
          rows_returned: number | null
          rows_scanned: number | null
          user_id: string | null
        }
        Insert: {
          caller_function?: string | null
          created_at?: string
          execution_time_ms: number
          id?: string
          params_summary?: Json | null
          planning_time_ms?: number | null
          query_hash?: string | null
          query_name: string
          rows_returned?: number | null
          rows_scanned?: number | null
          user_id?: string | null
        }
        Update: {
          caller_function?: string | null
          created_at?: string
          execution_time_ms?: number
          id?: string
          params_summary?: Json | null
          planning_time_ms?: number | null
          query_hash?: string | null
          query_name?: string
          rows_returned?: number | null
          rows_scanned?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      recovery_cases: {
        Row: {
          assigned_at: string | null
          assigned_role: string | null
          assigned_to: string | null
          booking_id: string
          contact_attempts: Json | null
          created_at: string
          escalation_t24h_at: string | null
          escalation_t2h_at: string | null
          escalation_t48h_at: string | null
          evidence_package_id: string | null
          grace_period_ends_at: string | null
          id: string
          last_contact_attempt_at: string | null
          last_known_at: string | null
          last_known_latitude: number | null
          last_known_longitude: number | null
          renter_responded: boolean | null
          renter_response_at: string | null
          resolution_notes: string | null
          resolution_type: string | null
          resolved_at: string | null
          severity: string
          status: string
          trigger_reason: string
          triggered_at: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          booking_id: string
          contact_attempts?: Json | null
          created_at?: string
          escalation_t24h_at?: string | null
          escalation_t2h_at?: string | null
          escalation_t48h_at?: string | null
          evidence_package_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_contact_attempt_at?: string | null
          last_known_at?: string | null
          last_known_latitude?: number | null
          last_known_longitude?: number | null
          renter_responded?: boolean | null
          renter_response_at?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          trigger_reason: string
          triggered_at?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          booking_id?: string
          contact_attempts?: Json | null
          created_at?: string
          escalation_t24h_at?: string | null
          escalation_t2h_at?: string | null
          escalation_t48h_at?: string | null
          evidence_package_id?: string | null
          grace_period_ends_at?: string | null
          id?: string
          last_contact_attempt_at?: string | null
          last_known_at?: string | null
          last_known_latitude?: number | null
          last_known_longitude?: number | null
          renter_responded?: boolean | null
          renter_response_at?: string | null
          resolution_notes?: string | null
          resolution_type?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          trigger_reason?: string
          triggered_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          amount_cents: number
          approved_at: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          referral_id: string | null
          reward_type: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          approved_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          referral_id?: string | null
          reward_type?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          referral_id?: string | null
          reward_type?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          first_booking_at: string | null
          first_car_at: string | null
          id: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          registered_at: string
          reward_paid_at: string | null
          source: string | null
          status: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          verified_at: string | null
        }
        Insert: {
          first_booking_at?: string | null
          first_car_at?: string | null
          id?: string
          referral_code_id: string
          referred_id: string
          referrer_id: string
          registered_at?: string
          reward_paid_at?: string | null
          source?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified_at?: string | null
        }
        Update: {
          first_booking_at?: string | null
          first_car_at?: string | null
          id?: string
          referral_code_id?: string
          referred_id?: string
          referrer_id?: string
          registered_at?: string
          reward_paid_at?: string | null
          source?: string | null
          status?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_car_review: boolean | null
          is_renter_review: boolean | null
          is_visible: boolean | null
          rating: number | null
          rating_accuracy: number | null
          rating_care: number | null
          rating_checkin: number | null
          rating_cleanliness: number | null
          rating_communication: number | null
          rating_location: number | null
          rating_punctuality: number | null
          rating_recommend: number | null
          rating_rules: number | null
          rating_value: number | null
          review_type: string | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_car_review?: boolean | null
          is_renter_review?: boolean | null
          is_visible?: boolean | null
          rating?: number | null
          rating_accuracy?: number | null
          rating_care?: number | null
          rating_checkin?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_punctuality?: number | null
          rating_recommend?: number | null
          rating_rules?: number | null
          rating_value?: number | null
          review_type?: string | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_car_review?: boolean | null
          is_renter_review?: boolean | null
          is_visible?: boolean | null
          rating?: number | null
          rating_accuracy?: number | null
          rating_care?: number | null
          rating_checkin?: number | null
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_location?: number | null
          rating_punctuality?: number | null
          rating_recommend?: number | null
          rating_rules?: number | null
          rating_value?: number | null
          review_type?: string | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      reward_pool_balances: {
        Row: {
          created_at: string | null
          distributed_at: string | null
          id: string
          period_end: string
          period_start: string
          status: string | null
          total_collected: number | null
          total_distributed: number | null
        }
        Insert: {
          created_at?: string | null
          distributed_at?: string | null
          id?: string
          period_end: string
          period_start: string
          status?: string | null
          total_collected?: number | null
          total_distributed?: number | null
        }
        Update: {
          created_at?: string | null
          distributed_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: string | null
          total_collected?: number | null
          total_distributed?: number | null
        }
        Relationships: []
      }
      reward_pool_config: {
        Row: {
          created_at: string | null
          distributed_at: string | null
          id: string
          max_cars_per_owner: number
          max_share_per_owner: number
          month: string
          source: string
          status: string
          total_pool_usd: number
          updated_at: string | null
          va_max_cancellation_rate: number
          va_max_response_hours: number
          va_min_acceptance_rate: number
        }
        Insert: {
          created_at?: string | null
          distributed_at?: string | null
          id?: string
          max_cars_per_owner?: number
          max_share_per_owner?: number
          month: string
          source?: string
          status?: string
          total_pool_usd: number
          updated_at?: string | null
          va_max_cancellation_rate?: number
          va_max_response_hours?: number
          va_min_acceptance_rate?: number
        }
        Update: {
          created_at?: string | null
          distributed_at?: string | null
          id?: string
          max_cars_per_owner?: number
          max_share_per_owner?: number
          month?: string
          source?: string
          status?: string
          total_pool_usd?: number
          updated_at?: string | null
          va_max_cancellation_rate?: number
          va_max_response_hours?: number
          va_min_acceptance_rate?: number
        }
        Relationships: []
      }
      reward_pool_contributions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          owner_id: string
          pool_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          owner_id: string
          pool_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_pool_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "reward_pool_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_contributions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "v_current_reward_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_pool_payouts: {
        Row: {
          amount: number
          created_at: string | null
          error_message: string | null
          id: string
          mercadopago_payout_id: string | null
          owner_id: string
          paid_at: string | null
          payout_status: string | null
          pool_id: string
          share_percentage: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          mercadopago_payout_id?: string | null
          owner_id: string
          paid_at?: string | null
          payout_status?: string | null
          pool_id: string
          share_percentage?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          mercadopago_payout_id?: string | null
          owner_id?: string
          paid_at?: string | null
          payout_status?: string | null
          pool_id?: string
          share_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_pool_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_payouts_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "reward_pool_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_pool_payouts_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "v_current_reward_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          risk_factors: Json | null
          risk_score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          risk_factors?: Json | null
          risk_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          risk_factors?: Json | null
          risk_score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      risk_events: {
        Row: {
          booking_id: string | null
          created_at: string
          details: Json | null
          id: string
          owner_id: string | null
          renter_id: string | null
          risk_score: number | null
          risk_type: string
          status: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          owner_id?: string | null
          renter_id?: string | null
          risk_score?: number | null
          risk_type: string
          status?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          owner_id?: string | null
          renter_id?: string | null
          risk_score?: number | null
          risk_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      risk_score_history: {
        Row: {
          created_at: string | null
          factors: Json | null
          id: string
          new_score: number
          old_score: number | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          factors?: Json | null
          id?: string
          new_score: number
          old_score?: number | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          factors?: Json | null
          id?: string
          new_score?: number
          old_score?: number | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      sdui_analytics: {
        Row: {
          component_id: string
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      sdui_layouts: {
        Row: {
          components: Json
          created_at: string | null
          created_by: string | null
          environment: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          page_id: string
          updated_at: string | null
          version: number
        }
        Insert: {
          components?: Json
          created_at?: string | null
          created_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          page_id: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          components?: Json
          created_at?: string | null
          created_by?: string | null
          environment?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          page_id?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      social_media_credentials: {
        Row: {
          access_token: string
          account_id: string | null
          account_name: string | null
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_used_at: string | null
          metadata: Json | null
          page_id: string | null
          platform: string
          refresh_token: string | null
          token_expires_at: string | null
          token_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          account_id?: string | null
          account_name?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          page_id?: string | null
          platform: string
          refresh_token?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string | null
          account_name?: string | null
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_used_at?: string | null
          metadata?: Json | null
          page_id?: string | null
          platform?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_publishing_log: {
        Row: {
          attempted_at: string
          campaign_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          platform: string
          post_id: string | null
          post_url: string | null
          status: string
        }
        Insert: {
          attempted_at?: string
          campaign_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          platform: string
          post_id?: string | null
          post_url?: string | null
          status: string
        }
        Update: {
          attempted_at?: string
          campaign_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          platform?: string
          post_id?: string | null
          post_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publishing_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_publishing_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "recently_published_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_publishing_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "upcoming_scheduled_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      social_publishing_scheduler_log: {
        Row: {
          campaigns_processed: number | null
          campaigns_published: number | null
          created_at: string
          error_message: string | null
          execution_time: string
          id: string
          job_name: string
          status: string
        }
        Insert: {
          campaigns_processed?: number | null
          campaigns_published?: number | null
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          job_name: string
          status: string
        }
        Update: {
          campaigns_processed?: number | null
          campaigns_published?: number | null
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          job_name?: string
          status?: string
        }
        Relationships: []
      }
      special_events: {
        Row: {
          countries: string[] | null
          created_at: string | null
          created_by: string | null
          discount: number | null
          end_date: string
          id: string
          is_active: boolean | null
          message: string | null
          metadata: Json | null
          name: string
          start_date: string
          theme: string | null
          type: string
        }
        Insert: {
          countries?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          metadata?: Json | null
          name: string
          start_date: string
          theme?: string | null
          type: string
        }
        Update: {
          countries?: string[] | null
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          metadata?: Json | null
          name?: string
          start_date?: string
          theme?: string | null
          type?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_interval: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price_cents: number
          slug: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name: string
          price_cents: number
          slug: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_interval?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price_cents?: number
          slug?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_policies: {
        Row: {
          base_guarantee_usd: number
          max_gap_coverage_annual_usd: number | null
          min_clean_trips_required: number | null
          price_monthly_usd: number
          reduced_guarantee_usd: number
          telemetry_required: boolean | null
          tier_id: string
          updated_at: string | null
          waiting_period_hours: number | null
        }
        Insert: {
          base_guarantee_usd: number
          max_gap_coverage_annual_usd?: number | null
          min_clean_trips_required?: number | null
          price_monthly_usd: number
          reduced_guarantee_usd: number
          telemetry_required?: boolean | null
          tier_id: string
          updated_at?: string | null
          waiting_period_hours?: number | null
        }
        Update: {
          base_guarantee_usd?: number
          max_gap_coverage_annual_usd?: number | null
          min_clean_trips_required?: number | null
          price_monthly_usd?: number
          reduced_guarantee_usd?: number
          telemetry_required?: boolean | null
          tier_id?: string
          updated_at?: string | null
          waiting_period_hours?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          coverage_limit_cents: number
          created_at: string
          expires_at: string
          id: string
          metadata: Json | null
          payment_external_id: string | null
          payment_provider: string
          payment_transaction_id: string | null
          plan_id: string | null
          remaining_balance_cents: number
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coverage_limit_cents: number
          created_at?: string
          expires_at: string
          id?: string
          metadata?: Json | null
          payment_external_id?: string | null
          payment_provider: string
          payment_transaction_id?: string | null
          plan_id?: string | null
          remaining_balance_cents: number
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coverage_limit_cents?: number
          created_at?: string
          expires_at?: string
          id?: string
          metadata?: Json | null
          payment_external_id?: string | null
          payment_provider?: string
          payment_transaction_id?: string | null
          plan_id?: string | null
          remaining_balance_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_history"
            referencedColumns: ["legacy_transaction_id"]
          },
          {
            foreignKeyName: "subscriptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_playbooks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string
          sender_role: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id: string
          sender_role?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_team: string | null
          assigned_to: string | null
          booking_id: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
          recovery_case_id: string | null
          resolution_summary: string | null
          resolved_at: string | null
          satisfaction_rating: number | null
          sla_deadline_at: string | null
          source: string | null
          status: string
          subcategory: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_team?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          recovery_case_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          sla_deadline_at?: string | null
          source?: string | null
          status?: string
          subcategory?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_team?: string | null
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          recovery_case_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          satisfaction_rating?: number | null
          sla_deadline_at?: string | null
          source?: string | null
          status?: string
          subcategory?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "support_tickets_recovery_case_id_fkey"
            columns: ["recovery_case_id"]
            isOneToOne: false
            referencedRelation: "recovery_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      system_flags: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          analyzed_at: string | null
          created_at: string
          id: number
          kind: Database["public"]["Enums"]["document_kind"]
          metadata: Json | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string
          id?: number
          kind: Database["public"]["Enums"]["document_kind"]
          metadata?: Json | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string
          id?: number
          kind?: Database["public"]["Enums"]["document_kind"]
          metadata?: Json | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_identity_levels: {
        Row: {
          country: string | null
          created_at: string | null
          cuil: string | null
          current_level: number | null
          document_ai_score: number | null
          document_number: string | null
          document_province: string | null
          document_type: string | null
          document_verified_at: string | null
          driver_license_ai_score: number | null
          driver_license_categories: string[] | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          driver_license_points: number | null
          driver_license_professional: boolean | null
          driver_license_verified_at: string | null
          email_verified_at: string | null
          extracted_birth_date: string | null
          extracted_full_name: string | null
          extracted_gender: string | null
          extracted_nationality: string | null
          face_match_score: number | null
          id_verified_at: string | null
          last_ocr_confidence: number | null
          last_ocr_face_confidence: number | null
          last_ocr_has_face: boolean | null
          last_ocr_text_preview: string | null
          liveness_score: number | null
          manual_review_decision: string | null
          manual_review_required: boolean | null
          manual_reviewed_at: string | null
          manual_reviewed_by: string | null
          phone_number: string | null
          phone_verified_at: string | null
          selfie_url: string | null
          selfie_verified_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          cuil?: string | null
          current_level?: number | null
          document_ai_score?: number | null
          document_number?: string | null
          document_province?: string | null
          document_type?: string | null
          document_verified_at?: string | null
          driver_license_ai_score?: number | null
          driver_license_categories?: string[] | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          driver_license_points?: number | null
          driver_license_professional?: boolean | null
          driver_license_verified_at?: string | null
          email_verified_at?: string | null
          extracted_birth_date?: string | null
          extracted_full_name?: string | null
          extracted_gender?: string | null
          extracted_nationality?: string | null
          face_match_score?: number | null
          id_verified_at?: string | null
          last_ocr_confidence?: number | null
          last_ocr_face_confidence?: number | null
          last_ocr_has_face?: boolean | null
          last_ocr_text_preview?: string | null
          liveness_score?: number | null
          manual_review_decision?: string | null
          manual_review_required?: boolean | null
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          selfie_url?: string | null
          selfie_verified_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string | null
          cuil?: string | null
          current_level?: number | null
          document_ai_score?: number | null
          document_number?: string | null
          document_province?: string | null
          document_type?: string | null
          document_verified_at?: string | null
          driver_license_ai_score?: number | null
          driver_license_categories?: string[] | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          driver_license_points?: number | null
          driver_license_professional?: boolean | null
          driver_license_verified_at?: string | null
          email_verified_at?: string | null
          extracted_birth_date?: string | null
          extracted_full_name?: string | null
          extracted_gender?: string | null
          extracted_nationality?: string | null
          face_match_score?: number | null
          id_verified_at?: string | null
          last_ocr_confidence?: number | null
          last_ocr_face_confidence?: number | null
          last_ocr_has_face?: boolean | null
          last_ocr_text_preview?: string | null
          liveness_score?: number | null
          manual_review_decision?: string | null
          manual_review_required?: boolean | null
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          selfie_url?: string | null
          selfie_verified_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_risk_scores: {
        Row: {
          account_age_months: number | null
          average_rating: number | null
          cancellations_late: number | null
          created_at: string | null
          current_score: number | null
          damages_reported: number | null
          disputes_lost: number | null
          disputes_won: number | null
          id: string
          last_calculated_at: string | null
          rentals_without_incidents: number | null
          score_percentage: number | null
          total_rentals: number | null
          traffic_infractions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_age_months?: number | null
          average_rating?: number | null
          cancellations_late?: number | null
          created_at?: string | null
          current_score?: number | null
          damages_reported?: number | null
          disputes_lost?: number | null
          disputes_won?: number | null
          id?: string
          last_calculated_at?: string | null
          rentals_without_incidents?: number | null
          score_percentage?: number | null
          total_rentals?: number | null
          traffic_infractions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_age_months?: number | null
          average_rating?: number | null
          cancellations_late?: number | null
          created_at?: string | null
          current_score?: number | null
          damages_reported?: number | null
          disputes_lost?: number | null
          disputes_won?: number | null
          id?: string
          last_calculated_at?: string | null
          rentals_without_incidents?: number | null
          score_percentage?: number | null
          total_rentals?: number | null
          traffic_infractions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_risk_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_risk_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_risk_stats: {
        Row: {
          clean_trips_count: number | null
          gap_coverage_used_usd: number | null
          last_claim_date: string | null
          strikes_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clean_trips_count?: number | null
          gap_coverage_used_usd?: number | null
          last_claim_date?: string | null
          strikes_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clean_trips_count?: number | null
          gap_coverage_used_usd?: number | null
          last_claim_date?: string | null
          strikes_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          badges: Json | null
          cancellation_count: number | null
          cancellation_rate: number | null
          is_super_host: boolean | null
          is_top_host: boolean | null
          is_verified_renter: boolean | null
          last_review_received_at: string | null
          owner_rating_accuracy_avg: number | null
          owner_rating_avg: number | null
          owner_rating_checkin_avg: number | null
          owner_rating_cleanliness_avg: number | null
          owner_rating_communication_avg: number | null
          owner_rating_location_avg: number | null
          owner_rating_value_avg: number | null
          owner_response_rate: number | null
          owner_response_time_hours: number | null
          owner_reviews_count: number | null
          renter_rating_accuracy_avg: number | null
          renter_rating_avg: number | null
          renter_rating_checkin_avg: number | null
          renter_rating_cleanliness_avg: number | null
          renter_rating_communication_avg: number | null
          renter_reviews_count: number | null
          total_bookings_as_owner: number | null
          total_bookings_as_renter: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges?: Json | null
          cancellation_count?: number | null
          cancellation_rate?: number | null
          is_super_host?: boolean | null
          is_top_host?: boolean | null
          is_verified_renter?: boolean | null
          last_review_received_at?: string | null
          owner_rating_accuracy_avg?: number | null
          owner_rating_avg?: number | null
          owner_rating_checkin_avg?: number | null
          owner_rating_cleanliness_avg?: number | null
          owner_rating_communication_avg?: number | null
          owner_rating_location_avg?: number | null
          owner_rating_value_avg?: number | null
          owner_response_rate?: number | null
          owner_response_time_hours?: number | null
          owner_reviews_count?: number | null
          renter_rating_accuracy_avg?: number | null
          renter_rating_avg?: number | null
          renter_rating_checkin_avg?: number | null
          renter_rating_cleanliness_avg?: number | null
          renter_rating_communication_avg?: number | null
          renter_reviews_count?: number | null
          total_bookings_as_owner?: number | null
          total_bookings_as_renter?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges?: Json | null
          cancellation_count?: number | null
          cancellation_rate?: number | null
          is_super_host?: boolean | null
          is_top_host?: boolean | null
          is_verified_renter?: boolean | null
          last_review_received_at?: string | null
          owner_rating_accuracy_avg?: number | null
          owner_rating_avg?: number | null
          owner_rating_checkin_avg?: number | null
          owner_rating_cleanliness_avg?: number | null
          owner_rating_communication_avg?: number | null
          owner_rating_location_avg?: number | null
          owner_rating_value_avg?: number | null
          owner_response_rate?: number | null
          owner_response_time_hours?: number | null
          owner_reviews_count?: number | null
          renter_rating_accuracy_avg?: number | null
          renter_rating_avg?: number | null
          renter_rating_checkin_avg?: number | null
          renter_rating_cleanliness_avg?: number | null
          renter_rating_communication_avg?: number | null
          renter_reviews_count?: number | null
          total_bookings_as_owner?: number | null
          total_bookings_as_renter?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          created_at: string | null
          document_type: string
          expires_at: string | null
          id: string
          metadata: Json | null
          missing_docs: string[] | null
          notes: string | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          missing_docs?: string[] | null
          notes?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          missing_docs?: string[] | null
          notes?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          available_balance_cents: number
          balance_cents: number
          created_at: string
          currency: string
          id: string
          locked_balance_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance_cents?: number
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          locked_balance_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance_cents?: number
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          locked_balance_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          active: boolean
          base_daily_rate_pct: number
          code: string
          created_at: string
          depreciation_rate_annual: number
          description: string | null
          display_order: number
          id: string
          name: string
          name_es: string | null
          surge_sensitivity: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_daily_rate_pct?: number
          code: string
          created_at?: string
          depreciation_rate_annual?: number
          description?: string | null
          display_order?: number
          id?: string
          name: string
          name_es?: string | null
          surge_sensitivity?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_daily_rate_pct?: number
          code?: string
          created_at?: string
          depreciation_rate_annual?: number
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          name_es?: string | null
          surge_sensitivity?: number
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          blue_card_ai_metadata: Json | null
          blue_card_ai_score: number | null
          blue_card_authorized_name: string | null
          blue_card_url: string | null
          blue_card_verified_at: string | null
          created_at: string
          green_card_ai_metadata: Json | null
          green_card_ai_score: number | null
          green_card_owner_name: string | null
          green_card_url: string | null
          green_card_vehicle_domain: string | null
          green_card_verified_at: string | null
          id: string
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_url: string | null
          insurance_verified_at: string | null
          is_owner: boolean
          manual_review_decision: string | null
          manual_review_notes: string | null
          manual_review_required: boolean | null
          manual_reviewed_at: string | null
          manual_reviewed_by: string | null
          status: string | null
          updated_at: string
          user_id: string
          vehicle_id: string
          vtv_expiry: string | null
          vtv_url: string | null
          vtv_verified_at: string | null
        }
        Insert: {
          blue_card_ai_metadata?: Json | null
          blue_card_ai_score?: number | null
          blue_card_authorized_name?: string | null
          blue_card_url?: string | null
          blue_card_verified_at?: string | null
          created_at?: string
          green_card_ai_metadata?: Json | null
          green_card_ai_score?: number | null
          green_card_owner_name?: string | null
          green_card_url?: string | null
          green_card_vehicle_domain?: string | null
          green_card_verified_at?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_url?: string | null
          insurance_verified_at?: string | null
          is_owner?: boolean
          manual_review_decision?: string | null
          manual_review_notes?: string | null
          manual_review_required?: boolean | null
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          vehicle_id: string
          vtv_expiry?: string | null
          vtv_url?: string | null
          vtv_verified_at?: string | null
        }
        Update: {
          blue_card_ai_metadata?: Json | null
          blue_card_ai_score?: number | null
          blue_card_authorized_name?: string | null
          blue_card_url?: string | null
          blue_card_verified_at?: string | null
          created_at?: string
          green_card_ai_metadata?: Json | null
          green_card_ai_score?: number | null
          green_card_owner_name?: string | null
          green_card_url?: string | null
          green_card_vehicle_domain?: string | null
          green_card_verified_at?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_url?: string | null
          insurance_verified_at?: string | null
          is_owner?: boolean
          manual_review_decision?: string | null
          manual_review_notes?: string | null
          manual_review_required?: boolean | null
          manual_reviewed_at?: string | null
          manual_reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          vtv_expiry?: string | null
          vtv_url?: string | null
          vtv_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_pricing_models: {
        Row: {
          active: boolean
          base_value_usd: number
          brand: string
          category_id: string
          confidence_level: string
          created_at: string
          data_source: string
          id: string
          last_updated: string
          model: string
          notes: string | null
          updated_at: string
          year_from: number
          year_to: number
        }
        Insert: {
          active?: boolean
          base_value_usd: number
          brand: string
          category_id: string
          confidence_level?: string
          created_at?: string
          data_source?: string
          id?: string
          last_updated?: string
          model: string
          notes?: string | null
          updated_at?: string
          year_from: number
          year_to: number
        }
        Update: {
          active?: boolean
          base_value_usd?: number
          brand?: string
          category_id?: string
          confidence_level?: string
          created_at?: string
          data_source?: string
          id?: string
          last_updated?: string
          model?: string
          notes?: string | null
          updated_at?: string
          year_from?: number
          year_to?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_pricing_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_recognition_logs: {
        Row: {
          car_id: string | null
          confidence: number | null
          created_at: string | null
          id: string
          image_url: string | null
          recognized_body_type: string | null
          recognized_brand: string | null
          recognized_color: string | null
          recognized_model: string | null
          recognized_year_range: unknown
          suggestions: Json | null
          validation_result: Json | null
        }
        Insert: {
          car_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          recognized_body_type?: string | null
          recognized_brand?: string | null
          recognized_color?: string | null
          recognized_model?: string | null
          recognized_year_range?: unknown
          suggestions?: Json | null
          validation_result?: Json | null
        }
        Update: {
          car_id?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          recognized_body_type?: string | null
          recognized_brand?: string | null
          recognized_color?: string | null
          recognized_model?: string | null
          recognized_year_range?: unknown
          suggestions?: Json | null
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_recognition_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recognition_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recognition_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_recognition_logs_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_risk_categories: {
        Row: {
          base_multiplier: number
          created_at: string
          deposit_multiplier: number
          description: string | null
          id: string
          min_driver_age: number | null
          min_driver_experience_years: number | null
          name: string
          requires_premium_insurance: boolean | null
        }
        Insert: {
          base_multiplier?: number
          created_at?: string
          deposit_multiplier?: number
          description?: string | null
          id?: string
          min_driver_age?: number | null
          min_driver_experience_years?: number | null
          name: string
          requires_premium_insurance?: boolean | null
        }
        Update: {
          base_multiplier?: number
          created_at?: string
          deposit_multiplier?: number
          description?: string | null
          id?: string
          min_driver_age?: number | null
          min_driver_experience_years?: number | null
          name?: string
          requires_premium_insurance?: boolean | null
        }
        Relationships: []
      }
      vehicle_telemetry: {
        Row: {
          battery_soc: number | null
          battery_soh: number | null
          battery_temp_celsius: number | null
          booking_id: string | null
          car_id: string
          charging_power_kw: number | null
          connection_type: string | null
          device_id: string
          dtc_codes: string[] | null
          estimated_range_km: number | null
          heading: number | null
          id: string
          is_charging: boolean | null
          is_locked: boolean | null
          is_running: boolean | null
          latitude: number | null
          longitude: number | null
          odometer_km: number | null
          received_at: string
          recorded_at: string
          signal_strength: number | null
          speed_kmh: number | null
          time_to_full_minutes: number | null
          warnings: Json | null
        }
        Insert: {
          battery_soc?: number | null
          battery_soh?: number | null
          battery_temp_celsius?: number | null
          booking_id?: string | null
          car_id: string
          charging_power_kw?: number | null
          connection_type?: string | null
          device_id: string
          dtc_codes?: string[] | null
          estimated_range_km?: number | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          is_locked?: boolean | null
          is_running?: boolean | null
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          received_at?: string
          recorded_at?: string
          signal_strength?: number | null
          speed_kmh?: number | null
          time_to_full_minutes?: number | null
          warnings?: Json | null
        }
        Update: {
          battery_soc?: number | null
          battery_soh?: number | null
          battery_temp_celsius?: number | null
          booking_id?: string | null
          car_id?: string
          charging_power_kw?: number | null
          connection_type?: string | null
          device_id?: string
          dtc_codes?: string[] | null
          estimated_range_km?: number | null
          heading?: number | null
          id?: string
          is_charging?: boolean | null
          is_locked?: boolean | null
          is_running?: boolean | null
          latitude?: number | null
          longitude?: number | null
          odometer_km?: number | null
          received_at?: string
          recorded_at?: string
          signal_strength?: number | null
          speed_kmh?: number | null
          time_to_full_minutes?: number | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_telemetry_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_telemetry_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_tier_config: {
        Row: {
          created_at: string | null
          description: string | null
          hold_base_usd: number
          tier: Database["public"]["Enums"]["vehicle_tier"]
          updated_at: string | null
          value_max_usd: number | null
          value_min_usd: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hold_base_usd: number
          tier: Database["public"]["Enums"]["vehicle_tier"]
          updated_at?: string | null
          value_max_usd?: number | null
          value_min_usd?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hold_base_usd?: number
          tier?: Database["public"]["Enums"]["vehicle_tier"]
          updated_at?: string | null
          value_max_usd?: number | null
          value_min_usd?: number | null
        }
        Relationships: []
      }
      wallet_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallet_split_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          custom_fee_percent: number | null
          id: string
          locador_id: string | null
          platform_fee_percent: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          custom_fee_percent?: number | null
          id?: string
          locador_id?: string | null
          platform_fee_percent?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          custom_fee_percent?: number | null
          id?: string
          locador_id?: string | null
          platform_fee_percent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      wallet_transaction_backups: {
        Row: {
          backup_date: string
          created_at: string | null
          data_snapshot: Json | null
          id: string
          total_transactions: number | null
          total_volume: number | null
        }
        Insert: {
          backup_date: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          total_transactions?: number | null
          total_volume?: number | null
        }
        Update: {
          backup_date?: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          total_transactions?: number | null
          total_volume?: number | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          balance_after_cents: number | null
          category: string | null
          completed_at: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          idempotency_key: string | null
          is_withdrawable: boolean
          provider: string | null
          provider_metadata: Json | null
          provider_transaction_id: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          balance_after_cents?: number | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          is_withdrawable?: boolean
          provider?: string | null
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          balance_after_cents?: number | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          is_withdrawable?: boolean
          provider?: string | null
          provider_metadata?: Json | null
          provider_transaction_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          locked_balance: number | null
          pending_balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          locked_balance?: number | null
          pending_balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          locked_balance?: number | null
          pending_balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_retry_queue: {
        Row: {
          created_at: string | null
          error_history: Json | null
          event_id: string
          headers: Json | null
          id: string
          last_error_details: Json | null
          last_error_message: string | null
          last_retry_at: string | null
          max_retries: number | null
          mp_payment_id: string | null
          next_retry_at: string | null
          payload: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_count: number | null
          status: string
          updated_at: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_history?: Json | null
          event_id: string
          headers?: Json | null
          id?: string
          last_error_details?: Json | null
          last_error_message?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          mp_payment_id?: string | null
          next_retry_at?: string | null
          payload: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_history?: Json | null
          event_id?: string
          headers?: Json | null
          id?: string
          last_error_details?: Json | null
          last_error_message?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          mp_payment_id?: string | null
          next_retry_at?: string | null
          payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
      whatsapp_debounce: {
        Row: {
          last_timestamp: number
          phone: string
          updated_at: string | null
        }
        Insert: {
          last_timestamp: number
          phone: string
          updated_at?: string | null
        }
        Update: {
          last_timestamp?: number
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_registration: {
        Row: {
          created_at: string | null
          email: string | null
          phone: string
          state: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          phone: string
          state?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          phone?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string | null
          completed_at: string | null
          created_at: string | null
          currency: string
          id: string
          processed_at: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          error_message: string | null
          id: string
          mercadopago_transfer_id: string | null
          metadata: Json | null
          request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          mercadopago_transfer_id?: string | null
          metadata?: Json | null
          request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          mercadopago_transfer_id?: string | null
          metadata?: Json | null
          request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounting_provisions_report: {
        Row: {
          created_at: string | null
          current_balance: number | null
          id: string | null
          notes: string | null
          provision_amount: number | null
          provision_date: string | null
          provision_type: string | null
          reference_id: string | null
          reference_table: string | null
          release_date: string | null
          released_amount: number | null
          status: string | null
          utilized_amount: number | null
        }
        Relationships: []
      }
      authority_performance_dashboard: {
        Row: {
          engagement_rate_pct: number | null
          last_used_at: string | null
          performance_score: number | null
          selection_probability_pct: number | null
          term_name: string | null
          tier: string | null
          times_used: number | null
          total_engagements: number | null
          total_impressions: number | null
        }
        Insert: {
          engagement_rate_pct?: never
          last_used_at?: string | null
          performance_score?: never
          selection_probability_pct?: never
          term_name?: string | null
          tier?: never
          times_used?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
        }
        Update: {
          engagement_rate_pct?: never
          last_used_at?: string | null
          performance_score?: never
          selection_probability_pct?: never
          term_name?: string | null
          tier?: never
          times_used?: number | null
          total_engagements?: number | null
          total_impressions?: number | null
        }
        Relationships: []
      }
      bonus_malus_cron_jobs: {
        Row: {
          active: boolean | null
          jobid: number | null
          jobname: string | null
          ran_recently: boolean | null
          schedule: string | null
        }
        Insert: {
          active?: boolean | null
          jobid?: number | null
          jobname?: string | null
          ran_recently?: never
          schedule?: string | null
        }
        Update: {
          active?: boolean | null
          jobid?: number | null
          jobname?: string | null
          ran_recently?: never
          schedule?: string | null
        }
        Relationships: []
      }
      booking_stats_daily: {
        Row: {
          active_bookings: number | null
          avg_booking_value: number | null
          avg_daily_rate: number | null
          avg_total_days: number | null
          cancelled_bookings: number | null
          completed_bookings: number | null
          damage_reported_bookings: number | null
          day: string | null
          disputed_bookings: number | null
          inspected_good_bookings: number | null
          instant_bookings: number | null
          insurance_fee_total: number | null
          owner_fee_total: number | null
          payment_failed_bookings: number | null
          pending_bookings: number | null
          returned_bookings: number | null
          service_fee_total: number | null
          subtotal_gmv: number | null
          total_bookings: number | null
          total_gmv: number | null
          total_rental_days: number | null
          unique_cars: number | null
          unique_renters: number | null
        }
        Relationships: []
      }
      campaign_performance: {
        Row: {
          budget_usd: number | null
          campaign_type: string | null
          clicks: number | null
          conversion_rate_percentage: number | null
          conversions: number | null
          ctr_percentage: number | null
          end_date: string | null
          first_bookings: number | null
          id: string | null
          impressions: number | null
          name: string | null
          roi_percentage: number | null
          signups: number | null
          start_date: string | null
          status: string | null
          target_audience: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
      content_mix_calendar: {
        Row: {
          content_category: string | null
          day_name: string | null
          day_num: number | null
          description: string | null
          emoji: string | null
        }
        Relationships: []
      }
      cron_jobs_status: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobname: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Relationships: []
      }
      edge_brain_strategy_performance: {
        Row: {
          avg_confidence: number | null
          avg_execution_time_ms: number | null
          error_type: string | null
          merge_rate_percent: number | null
          prs_closed: number | null
          prs_created: number | null
          prs_merged: number | null
          strategy_used: string | null
          total_attempts: number | null
        }
        Relationships: []
      }
      edge_brain_strategy_stats: {
        Row: {
          avg_confidence: number | null
          avg_execution_time_ms: number | null
          error_type: string | null
          prs_created: number | null
          prs_merged: number | null
          strategy_used: string | null
          success_rate_percent: number | null
          total_attempts: number | null
        }
        Relationships: []
      }
      marketing_daily_metrics: {
        Row: {
          avg_hashtags: number | null
          content_type: string | null
          failed: number | null
          pending: number | null
          platform: string | null
          post_date: string | null
          published: number | null
          reels_count: number | null
          total_posts: number | null
          with_alt_text: number | null
        }
        Relationships: []
      }
      marketing_platforms_status: {
        Row: {
          platform: string | null
          status: string | null
          suspended_since: string | null
          suspension_reason: string | null
        }
        Relationships: []
      }
      marketing_system_health: {
        Row: {
          category: string | null
          metrics: Json | null
        }
        Relationships: []
      }
      me_profile: {
        Row: {
          avatar_url: string | null
          can_book_cars: boolean | null
          can_publish_cars: boolean | null
          cancellation_count_90d: number | null
          created_at: string | null
          default_currency: string | null
          full_name: string | null
          id: string | null
          is_admin: boolean | null
          last_cancellation_check: string | null
          renter_level: string | null
          renter_level_updated_at: string | null
          role: string | null
          visibility_penalty_until: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_book_cars?: never
          can_publish_cars?: never
          cancellation_count_90d?: number | null
          created_at?: string | null
          default_currency?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          last_cancellation_check?: string | null
          renter_level?: string | null
          renter_level_updated_at?: string | null
          role?: string | null
          visibility_penalty_until?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_book_cars?: never
          can_publish_cars?: never
          cancellation_count_90d?: number | null
          created_at?: string | null
          default_currency?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          last_cancellation_check?: string | null
          renter_level?: string | null
          renter_level_updated_at?: string | null
          role?: string | null
          visibility_penalty_until?: string | null
        }
        Relationships: []
      }
      my_bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          car_brand: string | null
          car_city: string | null
          car_id: string | null
          car_model: string | null
          car_owner_id: string | null
          car_province: string | null
          car_title: string | null
          car_year: number | null
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          end_at: string | null
          id: string | null
          inspection_status: string | null
          insurance_fee: number | null
          main_photo_url: string | null
          notes: string | null
          owner_avatar: string | null
          owner_id: string | null
          owner_name: string | null
          payment_mode: string | null
          payment_status: string | null
          renter_id: string | null
          returned_at: string | null
          service_fee: number | null
          start_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number | null
          total_amount: number | null
          total_days: number | null
          total_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["car_owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["car_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          car_brand: string | null
          car_city: string | null
          car_id: string | null
          car_model: string | null
          car_province: string | null
          car_title: string | null
          car_year: number | null
          completion_status: string | null
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          deposit_status: string | null
          dispute_status: string | null
          end_at: string | null
          id: string | null
          inspection_status: string | null
          insurance_fee: number | null
          main_photo_url: string | null
          notes: string | null
          owner_confirmed_delivery: boolean | null
          owner_fee: number | null
          owner_id: string | null
          payment_mode: string | null
          payment_status: string | null
          renter_avatar: string | null
          renter_id: string | null
          renter_name: string | null
          returned_at: string | null
          service_fee: number | null
          start_at: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          subtotal: number | null
          total_amount: number | null
          total_days: number | null
          total_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_pending_approvals: {
        Row: {
          booking_created_at: string | null
          booking_id: string | null
          car_id: string | null
          car_name: string | null
          car_year: number | null
          currency: string | null
          days_count: number | null
          end_at: string | null
          renter_avatar: string | null
          renter_id: string | null
          renter_name: string | null
          start_at: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_published_campaigns: {
        Row: {
          id: string | null
          name: string | null
          post_ids: Json | null
          published_at: string | null
          status: string | null
          time_since_publish: string | null
          title: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          post_ids?: Json | null
          published_at?: string | null
          status?: string | null
          time_since_publish?: never
          title?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          post_ids?: Json | null
          published_at?: string | null
          status?: string | null
          time_since_publish?: never
          title?: string | null
        }
        Relationships: []
      }
      upcoming_scheduled_campaigns: {
        Row: {
          id: string | null
          name: string | null
          platforms: string[] | null
          scheduled_for: string | null
          status: string | null
          time_until_publish: string | null
          title: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          platforms?: string[] | null
          scheduled_for?: string | null
          status?: string | null
          time_until_publish?: never
          title?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          platforms?: string[] | null
          scheduled_for?: string | null
          status?: string | null
          time_until_publish?: never
          title?: string | null
        }
        Relationships: []
      }
      v_advisory_locks_held: {
        Row: {
          granted: boolean | null
          lock_key: unknown
          locktype: string | null
          mode: string | null
          pid: number | null
          queried_at: string | null
        }
        Relationships: []
      }
      v_authority_posts_ready: {
        Row: {
          all_hashtags: string[] | null
          caption: string | null
          engagement_rate: number | null
          first_comment: string | null
          hook_line: string | null
          id: string | null
          image_prompt: string | null
          image_reference: string | null
          instagram_ready_caption: string | null
          term_name: string | null
          times_used: number | null
          weight: number | null
        }
        Insert: {
          all_hashtags?: never
          caption?: string | null
          engagement_rate?: number | null
          first_comment?: string | null
          hook_line?: string | null
          id?: string | null
          image_prompt?: string | null
          image_reference?: string | null
          instagram_ready_caption?: never
          term_name?: string | null
          times_used?: number | null
          weight?: number | null
        }
        Update: {
          all_hashtags?: never
          caption?: string | null
          engagement_rate?: number | null
          first_comment?: string | null
          hook_line?: string | null
          id?: string | null
          image_prompt?: string | null
          image_reference?: string | null
          instagram_ready_caption?: never
          term_name?: string | null
          times_used?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      v_car_reviews: {
        Row: {
          booking_id: string | null
          car_brand: string | null
          car_id: string | null
          car_model: string | null
          car_title: string | null
          comment: string | null
          created_at: string | null
          id: string | null
          is_car_review: boolean | null
          is_visible: boolean | null
          rating: number | null
          review_type: string | null
          reviewee_id: string | null
          reviewer_avatar: string | null
          reviewer_id: string | null
          reviewer_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_guarantee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_cars_with_main_photo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "v_instant_booking_cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "my_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "owner_pending_approvals"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      v_cars_with_guarantee: {
        Row: {
          fgo_cap_usd: number | null
          hold_con_membresia_usd: number | null
          hold_sin_membresia_usd: number | null
          id: string | null
          membership_coverage_usd: number | null
          price_per_day: number | null
          proteccion_total_con_membresia_usd: number | null
          proteccion_total_sin_membresia_usd: number | null
          tier: string | null
          tier_name: string | null
          title: string | null
          value_usd: number | null
        }
        Relationships: []
      }
      v_cars_with_main_photo: {
        Row: {
          ai_condition_analysis: Json | null
          ai_condition_analyzed_at: string | null
          ai_condition_category: string | null
          ai_condition_score: number | null
          ai_recognition_at: string | null
          ai_recognition_confidence: number | null
          ai_recognition_validated: boolean | null
          ai_recognized_brand: string | null
          ai_recognized_model: string | null
          allow_pets: boolean | null
          allow_rideshare: boolean | null
          allow_second_driver: boolean | null
          allow_smoking: boolean | null
          allowed_provinces: string[] | null
          auto_approval: boolean | null
          availability_end_date: string | null
          availability_start_date: string | null
          brand: string | null
          brand_id: string | null
          brand_text_backup: string | null
          city: string | null
          color: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          deposit_required: boolean | null
          description: string | null
          doors: number | null
          extra_km_price: number | null
          features: Json | null
          fuel_policy: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          has_telemetry: boolean | null
          id: string | null
          instant_booking: boolean | null
          instant_booking_enabled: boolean | null
          instant_booking_min_score: number | null
          instant_booking_require_verified: boolean | null
          insurance_company: string | null
          insurance_deductible_usd: number | null
          insurance_expires_at: string | null
          insurance_included: boolean | null
          insurance_policy_number: string | null
          kill_switch_enabled: boolean | null
          last_heartbeat: string | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          location_province: string | null
          location_state: string | null
          location_street: string | null
          location_street_number: string | null
          main_photo_url: string | null
          max_anticipation_days: number | null
          max_distance_km: number | null
          max_rental_days: number | null
          mileage: number | null
          mileage_limit: number | null
          min_rental_days: number | null
          model: string | null
          model_id: string | null
          model_text_backup: string | null
          owner_id: string | null
          owner_verified: boolean | null
          photo_gallery: Json | null
          photos_quality_checked: boolean | null
          photos_quality_score: number | null
          plates_auto_blurred: boolean | null
          price_per_day: number | null
          province: string | null
          rating_avg: number | null
          review_count: number | null
          seats: number | null
          second_driver_cost: number | null
          status: Database["public"]["Enums"]["car_status"] | null
          telemetry_provider: string | null
          title: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string | null
          uses_dynamic_pricing: boolean | null
          value_usd: number | null
          vehicle_tier: Database["public"]["Enums"]["vehicle_tier"] | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cars_owner_id_profiles_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_current_reward_pool: {
        Row: {
          created_at: string | null
          distributed_at: string | null
          id: string | null
          participating_owners: number | null
          period_end: string | null
          period_start: string | null
          status: string | null
          total_collected: number | null
          total_contributions: number | null
          total_distributed: number | null
          verified_total: number | null
        }
        Relationships: []
      }
      v_fgo_parameters_summary: {
        Row: {
          alpha_pct: number | null
          bucket: string | null
          country_code: string | null
          event_cap_usd: number | null
          monthly_cap_pct: number | null
          per_user_limit: number | null
          rc_floor: number | null
          rc_hard_floor: number | null
          rc_soft_ceiling: number | null
          updated_at: string | null
        }
        Insert: {
          alpha_pct?: never
          bucket?: string | null
          country_code?: string | null
          event_cap_usd?: number | null
          monthly_cap_pct?: never
          per_user_limit?: number | null
          rc_floor?: number | null
          rc_hard_floor?: number | null
          rc_soft_ceiling?: number | null
          updated_at?: string | null
        }
        Update: {
          alpha_pct?: never
          bucket?: string | null
          country_code?: string | null
          event_cap_usd?: number | null
          monthly_cap_pct?: never
          per_user_limit?: number | null
          rc_floor?: number | null
          rc_hard_floor?: number | null
          rc_soft_ceiling?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_fgo_status: {
        Row: {
          approved_claims: number | null
          balance: number | null
          id: string | null
          pending_claims: number | null
          total_claims_paid: number | null
          total_collected: number | null
          total_paid_claims: number | null
          updated_at: string | null
        }
        Insert: {
          approved_claims?: never
          balance?: number | null
          id?: string | null
          pending_claims?: never
          total_claims_paid?: number | null
          total_collected?: number | null
          total_paid_claims?: never
          updated_at?: string | null
        }
        Update: {
          approved_claims?: never
          balance?: number | null
          id?: string | null
          pending_claims?: never
          total_claims_paid?: number | null
          total_collected?: number | null
          total_paid_claims?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_fgo_status_v1_1: {
        Row: {
          alpha_percentage: number | null
          avg_recovery_rate: number | null
          capitalization_balance_cents: number | null
          coverage_ratio: number | null
          last_calculated_at: string | null
          liquidity_balance_cents: number | null
          loss_ratio: number | null
          lr_365d: number | null
          lr_90d: number | null
          pem_cents: number | null
          profitability_balance_cents: number | null
          status: string | null
          target_balance_cents: number | null
          target_months_coverage: number | null
          total_contributions_cents: number | null
          total_events_90d: number | null
          total_fgo_balance_cents: number | null
          total_siniestros_count: number | null
          total_siniestros_paid_cents: number | null
          updated_at: string | null
        }
        Insert: {
          alpha_percentage?: number | null
          avg_recovery_rate?: number | null
          capitalization_balance_cents?: never
          coverage_ratio?: number | null
          last_calculated_at?: string | null
          liquidity_balance_cents?: never
          loss_ratio?: number | null
          lr_365d?: number | null
          lr_90d?: number | null
          pem_cents?: number | null
          profitability_balance_cents?: never
          status?: string | null
          target_balance_cents?: number | null
          target_months_coverage?: number | null
          total_contributions_cents?: number | null
          total_events_90d?: number | null
          total_fgo_balance_cents?: never
          total_siniestros_count?: number | null
          total_siniestros_paid_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          alpha_percentage?: number | null
          avg_recovery_rate?: number | null
          capitalization_balance_cents?: never
          coverage_ratio?: number | null
          last_calculated_at?: string | null
          liquidity_balance_cents?: never
          loss_ratio?: number | null
          lr_365d?: number | null
          lr_90d?: number | null
          pem_cents?: number | null
          profitability_balance_cents?: never
          status?: string | null
          target_balance_cents?: number | null
          target_months_coverage?: number | null
          total_contributions_cents?: number | null
          total_events_90d?: number | null
          total_fgo_balance_cents?: never
          total_siniestros_count?: number | null
          total_siniestros_paid_cents?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_fx_rates_current: {
        Row: {
          age: unknown
          from_currency: string | null
          id: string | null
          is_expired: boolean | null
          metadata: Json | null
          rate: number | null
          snapshot_timestamp: string | null
          source: string | null
          to_currency: string | null
        }
        Insert: {
          age?: never
          from_currency?: string | null
          id?: string | null
          is_expired?: never
          metadata?: Json | null
          rate?: number | null
          snapshot_timestamp?: string | null
          source?: string | null
          to_currency?: string | null
        }
        Update: {
          age?: never
          from_currency?: string | null
          id?: string | null
          is_expired?: never
          metadata?: Json | null
          rate?: number | null
          snapshot_timestamp?: string | null
          source?: string | null
          to_currency?: string | null
        }
        Relationships: []
      }
      v_guarantee_tiers: {
        Row: {
          fgo_cap_usd: number | null
          hold_with_membership_usd: number | null
          hold_without_membership_usd: number | null
          max_vehicle_value_usd: number | null
          membership_coverage_usd: number | null
          membership_price_usd: number | null
          min_vehicle_value_usd: number | null
          tier: string | null
          tier_name: string | null
          total_protection_usd: number | null
        }
        Relationships: []
      }
      v_inactive_subscribers: {
        Row: {
          active_sequences: Json | null
          created_at: string | null
          days_inactive: number | null
          email: string | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          first_name: string | null
          id: string | null
          last_activity_at: string | null
          last_email_clicked_at: string | null
          last_email_opened_at: string | null
          last_email_sent_at: string | null
          last_name: string | null
          preferences: Json | null
          profile_name: string | null
          profile_role: string | null
          source: string | null
          source_campaign_id: string | null
          status: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_subscribers_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_subscribers_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      v_instant_booking_cars: {
        Row: {
          brand: string | null
          city: string | null
          id: string | null
          instant_booking_enabled: boolean | null
          instant_booking_min_score: number | null
          instant_booking_require_verified: boolean | null
          model: string | null
          owner_avatar: string | null
          owner_name: string | null
          price_per_day: number | null
          province: string | null
          title: string | null
          year: number | null
        }
        Relationships: []
      }
      v_insurance_ready_metrics: {
        Row: {
          avg_booking_value: number | null
          avg_claim_severity: number | null
          claim_frequency_percent: number | null
          fleet_size: number | null
          loss_ratio_percent: number | null
          snapshot_at: string | null
          total_bookings: number | null
          total_claims: number | null
          total_claims_paid: number | null
          total_gmv: number | null
        }
        Relationships: []
      }
      v_outreach_daily_summary: {
        Row: {
          date: string | null
          failed: number | null
          fb_comments: number | null
          fb_dms: number | null
          fb_posts: number | null
          successful: number | null
        }
        Relationships: []
      }
      v_prospect_funnel: {
        Row: {
          count: number | null
          percentage: number | null
          status: string | null
        }
        Relationships: []
      }
      v_sequence_performance: {
        Row: {
          active_steps: number | null
          click_rate: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          open_rate: number | null
          sequence_type: string | null
          slug: string | null
          target_audience: string | null
          total_clicked: number | null
          total_opened: number | null
          total_sent: number | null
          total_subscribers: number | null
        }
        Insert: {
          active_steps?: never
          click_rate?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_rate?: never
          sequence_type?: string | null
          slug?: string | null
          target_audience?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_subscribers?: number | null
        }
        Update: {
          active_steps?: never
          click_rate?: never
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          open_rate?: never
          sequence_type?: string | null
          slug?: string | null
          target_audience?: string | null
          total_clicked?: number | null
          total_opened?: number | null
          total_sent?: number | null
          total_subscribers?: number | null
        }
        Relationships: []
      }
      v_subscription_tiers: {
        Row: {
          coverage_limit_cents: number | null
          coverage_limit_usd: number | null
          description: string | null
          name: string | null
          price_cents: number | null
          price_usd: number | null
          target_segment: string | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
        }
        Relationships: []
      }
      v_wallet_history: {
        Row: {
          amount_cents: number | null
          booking_id: string | null
          currency: string | null
          id: string | null
          ledger_created_at: string | null
          ledger_entry_id: string | null
          ledger_ref: string | null
          legacy_completed_at: string | null
          legacy_transaction_id: string | null
          metadata: Json | null
          source_system: string | null
          status: string | null
          transaction_date: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: never
          booking_id?: never
          currency?: string | null
          id?: string | null
          ledger_created_at?: never
          ledger_entry_id?: never
          ledger_ref?: never
          legacy_completed_at?: string | null
          legacy_transaction_id?: string | null
          metadata?: never
          source_system?: never
          status?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: never
          booking_id?: never
          currency?: string | null
          id?: string | null
          ledger_created_at?: never
          ledger_entry_id?: never
          ledger_ref?: never
          legacy_completed_at?: string | null
          legacy_transaction_id?: string | null
          metadata?: never
          source_system?: never
          status?: string | null
          transaction_date?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_history: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          reference_id: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          reference_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          reference_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "me_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      account_bonus_protector_sale: {
        Args: {
          p_addon_id: string
          p_price_cents: number
          p_protection_level: number
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      account_protection_credit_breakage: {
        Args: {
          p_expired_cents: number
          p_reason: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      account_protection_credit_consumption: {
        Args: {
          p_claim_id: string
          p_consumed_cents: number
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      account_protection_credit_issuance: {
        Args: {
          p_amount_cents: number
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      account_protection_credit_renewal: {
        Args: {
          p_amount_cents: number
          p_transaction_id: string
          p_user_id: string
        }
        Returns: string
      }
      accounting_auto_audit: { Args: never; Returns: Json }
      accounting_balance_sheet: {
        Args: { p_date?: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          balance: number
        }[]
      }
      accounting_daily_closure: { Args: never; Returns: Json }
      accounting_income_statement: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          account_code: string
          account_name: string
          account_type: string
          amount: number
        }[]
      }
      accounting_monthly_closure: { Args: never; Returns: Json }
      accounting_verify_wallet_liabilities: { Args: never; Returns: undefined }
      activate_insurance_coverage: {
        Args: { p_addon_ids?: string[]; p_booking_id: string }
        Returns: string
      }
      add_subscriber_to_sequence: {
        Args: { p_sequence_slug: string; p_subscriber_id: string }
        Returns: Json
      }
      add_webhook_to_retry_queue: {
        Args: {
          p_error_details?: Json
          p_error_message?: string
          p_event_id: string
          p_headers?: Json
          p_mp_payment_id: string
          p_payload: Json
          p_webhook_type: string
        }
        Returns: string
      }
      adjust_alpha_dynamic: {
        Args: { p_bucket?: string; p_country_code?: string }
        Returns: Json
      }
      admin_approve_verification: {
        Args: {
          p_notes?: string
          p_user_id: string
          p_verification_level: number
        }
        Returns: Json
      }
      admin_flag_verification_suspicious: {
        Args: { p_notes: string; p_user_id: string }
        Returns: Json
      }
      admin_get_pending_verifications: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_verification_type?: string
        }
        Returns: {
          created_at: string
          current_level: number
          document_ai_score: number
          document_back_url: string
          document_front_url: string
          document_number: string
          document_type: string
          document_verified_at: string
          email: string
          extracted_birth_date: string
          extracted_full_name: string
          face_match_score: number
          full_name: string
          liveness_score: number
          manual_review_decision: string
          manual_review_notes: string
          manual_review_required: boolean
          manual_reviewed_at: string
          manual_reviewed_by: string
          selfie_url: string
          selfie_verified_at: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_get_verification_stats: { Args: never; Returns: Json }
      admin_get_wallet_metrics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      admin_reject_verification: {
        Args: {
          p_reason: string
          p_user_id: string
          p_verification_level: number
        }
        Returns: Json
      }
      admin_request_additional_documents: {
        Args: { p_requested_docs: string; p_user_id: string }
        Returns: Json
      }
      admin_wallet_health_check: { Args: never; Returns: Json }
      advance_playbook_step: {
        Args: { p_execution_id: string; p_notes?: string; p_skip?: boolean }
        Returns: Json
      }
      analyze_collusion_risk: {
        Args: { p_owner_id: string; p_renter_id: string }
        Returns: Json
      }
      app_is_admin: { Args: never; Returns: boolean }
      apply_referral_code: {
        Args: { p_code: string; p_referred_user_id: string; p_source?: string }
        Returns: string
      }
      approve_booking_v2: { Args: { p_booking_id: string }; Returns: Json }
      autoclose_tracking_if_returned: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      booking_force_start: {
        Args: { p_booking_id: string; p_owner_id: string }
        Returns: Json
      }
      booking_v2_auto_complete_inspection: {
        Args: { p_booking_id: string; p_inspector_id: string }
        Returns: Json
      }
      booking_v2_confirm_completion: {
        Args: { p_booking_id: string; p_renter_id: string }
        Returns: Json
      }
      booking_v2_resolve_conclusion: {
        Args: {
          p_accept_damage: boolean
          p_booking_id: string
          p_renter_id: string
        }
        Returns: Json
      }
      booking_v2_return_vehicle: {
        Args: { p_booking_id: string; p_returned_by: string }
        Returns: Json
      }
      booking_v2_start_rental: {
        Args: { p_booking_id: string; p_renter_id: string }
        Returns: Json
      }
      booking_v2_submit_inspection: {
        Args: {
          p_booking_id: string
          p_damage_amount_cents?: number
          p_description?: string
          p_evidence?: Json
          p_has_damage: boolean
          p_inspector_id: string
        }
        Returns: Json
      }
      calc_hold_and_buydown: {
        Args: {
          p_membership_plan?: string
          p_vehicle_tier: Database["public"]["Enums"]["vehicle_tier"]
        }
        Returns: {
          base_hold_usd: number
          buy_down_fgo_usd: number
          discount_pct: number
          hold_usd: number
        }[]
      }
      calculate_batch_dynamic_prices: {
        Args: {
          p_region_ids: string[]
          p_rental_hours: number
          p_rental_start: string
          p_user_id: string
        }
        Returns: Json[]
      }
      calculate_bonus_malus: { Args: { p_user_id: string }; Returns: Json }
      calculate_credit_risk_level: { Args: { score: number }; Returns: string }
      calculate_distance_based_pricing: {
        Args: { p_base_guarantee_usd?: number; p_distance_km: number }
        Returns: Json
      }
      calculate_distance_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number }
        Returns: number
      }
      calculate_dynamic_price: {
        Args: {
          p_car_id?: string
          p_region_id: string
          p_rental_hours: number
          p_rental_start: string
          p_user_id: string
        }
        Returns: Json
      }
      calculate_fgo_metrics: { Args: never; Returns: Json }
      calculate_full_price: {
        Args: {
          p_car_id: string
          p_end_date: string
          p_renter_id: string
          p_start_date: string
        }
        Returns: Json
      }
      calculate_guarantee_hold: {
        Args: { p_has_membership?: boolean; p_vehicle_value_usd: number }
        Returns: {
          fgo_cap_usd: number
          hold_amount_usd: number
          membership_coverage_usd: number
          tier: string
          tier_name: string
          total_protection_usd: number
        }[]
      }
      calculate_payment_split: {
        Args: { p_total_amount_cents: number }
        Returns: {
          fgo_cents: number
          owner_direct_cents: number
          platform_fee_cents: number
          reward_pool_cents: number
          total_cents: number
        }[]
      }
      calculate_pem: {
        Args: {
          p_bucket?: string
          p_country_code?: string
          p_window_days?: number
        }
        Returns: {
          avg_event_cents: number
          bucket: string
          country_code: string
          event_count: number
          pem_cents: number
          total_paid_cents: number
          total_recovered_cents: number
        }[]
      }
      calculate_preauthorization: {
        Args: { p_user_id?: string; p_vehicle_value_usd: number }
        Returns: Json
      }
      calculate_preauthorization_with_snapshot: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      calculate_rc_v1_1: {
        Args: { p_bucket?: string; p_country_code?: string }
        Returns: Json
      }
      calculate_renter_risk_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_suggested_daily_rate: {
        Args: { p_category_id: string; p_country?: string; p_value_usd: number }
        Returns: Json
      }
      calculate_telemetry_score: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: number
      }
      calculate_trip_score: {
        Args: {
          p_hard_brakes: number
          p_night_driving_hours: number
          p_risk_zones_visited: number
          p_speed_violations: number
          p_total_km: number
        }
        Returns: number
      }
      calculate_vehicle_base_price: {
        Args: { p_car_id: string; p_region_id: string }
        Returns: Json
      }
      can_instant_book: {
        Args: { p_car_id: string; p_renter_id: string }
        Returns: Json
      }
      can_leave_review: {
        Args: { p_booking_id: string; p_user_id?: string }
        Returns: {
          can_review: boolean
          reason: string
          reviews_remaining: number
          reviews_today: number
        }[]
      }
      can_persona_post: { Args: { p_persona_id: string }; Returns: boolean }
      can_publish_car: { Args: { p_user_id: string }; Returns: boolean }
      cancel_conflicting_pending_by_renter: {
        Args: {
          p_end: string
          p_expiration_threshold_minutes?: number
          p_renter_id: string
          p_start: string
        }
        Returns: number
      }
      cancel_payment_authorization: {
        Args: { p_payment_id: string }
        Returns: {
          canceled_at: string
          message: string
          success: boolean
        }[]
      }
      cancel_preauth: { Args: { p_intent_id: string }; Returns: undefined }
      cancel_with_fee: {
        Args: { p_booking_id: string }
        Returns: {
          cancel_fee: number
        }[]
      }
      capture_mp_preauth_order: {
        Args: {
          p_amount_cents: number
          p_description: string
          p_mp_order_id: string
        }
        Returns: {
          error: string
          mp_order_id: string
          mp_order_status: string
          success: boolean
        }[]
      }
      capture_payment_authorization: {
        Args: { p_amount_cents: number; p_payment_id: string }
        Returns: {
          captured_amount_cents: number
          captured_at: string
          message: string
          success: boolean
        }[]
      }
      capture_preauth: {
        Args: { p_amount: number; p_intent_id: string }
        Returns: undefined
      }
      check_abandoned_bookings: { Args: never; Returns: undefined }
      check_booking_overlap: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string }
        Returns: boolean
      }
      check_credit_eligibility: {
        Args: { p_rental_daily_price?: number; p_user_id: string }
        Returns: {
          credit_score: number
          eligible: boolean
          reason: string
          requires_higher_deposit: boolean
          risk_level: string
          suggested_deposit_multiplier: number
        }[]
      }
      check_device_connections: { Args: never; Returns: undefined }
      check_level_requirements: {
        Args: { p_required_level?: number }
        Returns: Json
      }
      check_mercadopago_connection: { Args: never; Returns: Json }
      check_snapshot_revalidation: {
        Args: { p_booking_id: string }
        Returns: {
          days_since_snapshot: number
          new_fx: number
          old_fx: number
          reason: string
          requires_revalidation: boolean
        }[]
      }
      check_social_media_tokens: {
        Args: never
        Returns: {
          action_required: boolean
          days_until_expiry: number
          last_error: string
          platform: string
          status: string
        }[]
      }
      check_subscription_coverage: {
        Args: { p_franchise_amount_cents: number; p_user_id: string }
        Returns: Json
      }
      check_user_pending_deposits_limit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      cleanup_expired_ai_cache: { Args: never; Returns: undefined }
      cleanup_expired_passkey_challenges: { Args: never; Returns: undefined }
      cleanup_fipe_cache: { Args: never; Returns: number }
      cleanup_old_pending_deposits: {
        Args: never
        Returns: {
          cleaned_count: number
          message: string
        }[]
      }
      cleanup_old_performance_logs: { Args: never; Returns: number }
      close_accounting_period: {
        Args: { p_period: string }
        Returns: undefined
      }
      complete_referral_milestone: {
        Args: { p_milestone: string; p_referred_user_id: string }
        Returns: boolean
      }
      compute_fee_with_class: {
        Args: {
          p_base_fee_cents: number
          p_telematic_score?: number
          p_user_id: string
        }
        Returns: number
      }
      compute_guarantee_with_class: {
        Args: {
          p_base_guarantee_cents: number
          p_has_card?: boolean
          p_user_id: string
        }
        Returns: number
      }
      config_get_boolean: { Args: { p_key: string }; Returns: boolean }
      config_get_json: { Args: { p_key: string }; Returns: Json }
      config_get_number: { Args: { p_key: string }; Returns: number }
      config_get_public: {
        Args: never
        Returns: {
          category: string
          data_type: string
          description: string
          key: string
          value: Json
        }[]
      }
      config_get_string: { Args: { p_key: string }; Returns: string }
      config_update: {
        Args: { p_key: string; p_value: Json }
        Returns: {
          category: string | null
          created_at: string | null
          data_type: string
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        SetofOptions: {
          from: "*"
          to: "platform_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      connect_mercadopago: {
        Args: {
          p_access_token: string
          p_account_type?: string
          p_collector_id: string
          p_country?: string
          p_expires_at: string
          p_public_key: string
          p_refresh_token: string
          p_site_id?: string
        }
        Returns: Json
      }
      consume_autorentar_credit_for_claim: {
        Args: {
          p_booking_id: string
          p_claim_amount_cents: number
          p_claim_id?: string
          p_user_id: string
        }
        Returns: {
          autorentar_credit_used_cents: number
          message: string
          new_autorentar_credit_balance: number
          new_wallet_balance: number
          remaining_claim_cents: number
          success: boolean
          wallet_balance_used_cents: number
        }[]
      }
      consume_protection_credit_for_claim: {
        Args: {
          p_booking_id: string
          p_claim_amount_cents: number
          p_user_id: string
        }
        Returns: {
          cp_used_cents: number
          remaining_claim_cents: number
          wr_used_cents: number
        }[]
      }
      create_evidence_package: {
        Args: { p_booking_id: string; p_purpose?: string }
        Returns: string
      }
      create_journal_entry: {
        Args: {
          p_description: string
          p_entries: Json
          p_reference_id: string
          p_reference_table: string
          p_transaction_type: string
        }
        Returns: string
      }
      create_mp_preauth_order:
        | {
            Args: {
              p_amount_cents: number
              p_booking_id?: string
              p_description: string
              p_intent_id: string
            }
            Returns: {
              error: string
              mp_order_id: string
              mp_order_status: string
              success: boolean
            }[]
          }
        | {
            Args: {
              p_amount_cents: number
              p_booking_id?: string
              p_description: string
              p_intent_id: string
              p_token?: string
            }
            Returns: {
              error: string
              mp_order_id: string
              mp_order_status: string
              success: boolean
            }[]
          }
      create_payment_authorization: {
        Args: {
          p_amount_ars?: number
          p_amount_usd?: number
          p_booking_id?: string
          p_description?: string
          p_external_reference?: string
          p_fx_rate?: number
          p_user_id: string
        }
        Returns: Json
      }
      create_review: {
        Args: {
          p_booking_id: string
          p_car_id?: string
          p_comment?: string
          p_rating: number
          p_review_type?: string
          p_reviewee_id: string
          p_reviewer_id: string
        }
        Returns: string
      }
      create_review_v2: {
        Args: {
          p_booking_id: string
          p_car_id: string
          p_comment_private?: string
          p_comment_public?: string
          p_rating_accuracy: number
          p_rating_checkin: number
          p_rating_cleanliness: number
          p_rating_communication: number
          p_rating_location: number
          p_rating_value: number
          p_review_type: string
          p_reviewee_id: string
          p_reviewer_id: string
        }
        Returns: string
      }
      create_subscription: {
        Args: {
          p_external_id: string
          p_meta?: Json
          p_payment_provider: string
          p_tier: Database["public"]["Enums"]["subscription_tier"]
          p_user_id: string
        }
        Returns: string
      }
      create_subscription_with_wallet: {
        Args: {
          p_description?: string
          p_meta?: Json
          p_ref: string
          p_tier: Database["public"]["Enums"]["subscription_tier"]
          p_user_id: string
        }
        Returns: Json
      }
      cron_check_overdue_bookings: { Args: never; Returns: number }
      cron_execute_scheduled_events: { Args: never; Returns: number }
      decrypt_message: { Args: { ciphertext: string }; Returns: string }
      deduct_from_subscription: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_description?: string
          p_performed_by?: string
          p_reason: string
          p_subscription_id: string
        }
        Returns: Json
      }
      disconnect_mercadopago: { Args: never; Returns: Json }
      distribute_monthly_rewards: {
        Args: { p_pool_id: string }
        Returns: {
          amount: number
          owner_id: string
          share_percentage: number
        }[]
      }
      earth: { Args: never; Returns: number }
      encrypt_message: { Args: { plaintext: string }; Returns: string }
      end_location_tracking: {
        Args: { p_status?: string; p_tracking_id: string }
        Returns: boolean
      }
      estimate_vehicle_value_usd: {
        Args: { p_brand: string; p_model: string; p_year: number }
        Returns: {
          category_id: string
          confidence_level: string
          data_source: string
          estimated_value: number
        }[]
      }
      evaluate_feature_flag: {
        Args: { p_context?: Json; p_flag_name: string; p_user_id?: string }
        Returns: Json
      }
      expire_subscriptions: { Args: never; Returns: number }
      extend_autorentar_credit_for_good_history: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          message: string
          new_balance_cents: number
          renewed: boolean
          success: boolean
        }[]
      }
      extend_protection_credit_for_good_history: {
        Args: { p_user_id: string }
        Returns: {
          eligible: boolean
          new_expires_at: string
          reason: string
          renewed_amount_cents: number
          renewed_amount_usd: number
        }[]
      }
      fgo_assess_eligibility: {
        Args: { p_booking_id: string; p_claim_amount_cents: number }
        Returns: Json
      }
      fgo_contribute_from_deposit: {
        Args: {
          p_deposit_amount_cents: number
          p_ref?: string
          p_user_id: string
          p_wallet_ledger_id?: string
        }
        Returns: Json
      }
      fgo_execute_waterfall: {
        Args: {
          p_booking_id: string
          p_description: string
          p_evidence_url?: string
          p_total_claim_cents: number
        }
        Returns: Json
      }
      fgo_pay_siniestro: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_description: string
          p_ref?: string
        }
        Returns: Json
      }
      fgo_transfer_between_subfunds: {
        Args: {
          p_admin_id: string
          p_amount_cents: number
          p_from_subfund: string
          p_reason: string
          p_to_subfund: string
        }
        Returns: Json
      }
      fx_rate_needs_revalidation: {
        Args: {
          p_max_age_days?: number
          p_new_rate?: number
          p_old_rate?: number
          p_rate_timestamp: string
          p_variation_threshold?: number
        }
        Returns: {
          needs_revalidation: boolean
          reason: string
        }[]
      }
      generate_daily_content_batch: { Args: never; Returns: undefined }
      generate_referral_code: { Args: { p_user_id: string }; Returns: string }
      get_ab_testing_report: {
        Args: { p_content_type?: string }
        Returns: {
          content_type: string
          engagement_rate: number
          engagements: number
          hook_template: string
          impressions: number
          link_clicks: number
          saves: number
          shares: number
          variant_name: string
          winner_score: number
        }[]
      }
      get_active_bonus_protector: {
        Args: { p_user_id: string }
        Returns: {
          addon_id: string
          days_until_expiry: number
          expires_at: string
          price_paid_usd: number
          protection_level: number
          purchase_date: string
          remaining_protected_claims: number
        }[]
      }
      get_active_calendar_token: {
        Args: { user_uuid: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
        }[]
      }
      get_active_events: { Args: { p_country?: string }; Returns: Json }
      get_active_subscription: { Args: never; Returns: Json }
      get_active_subscription_for_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_active_tokens_for_user: {
        Args: { p_user_id: string }
        Returns: {
          platform: string
          token: string
        }[]
      }
      get_active_tracking_for_booking: {
        Args: { p_booking_id: string }
        Returns: {
          accuracy: number
          distance_remaining: number
          estimated_arrival: string
          heading: number
          last_updated: string
          latitude: number
          longitude: number
          speed: number
          tracking_id: string
          user_id: string
          user_name: string
          user_photo: string
          user_role: string
        }[]
      }
      get_admin_roles: {
        Args: { check_user_id?: string }
        Returns: Database["public"]["Enums"]["admin_role"][]
      }
      get_all_seo_urls: {
        Args: never
        Returns: {
          changefreq: string
          lastmod: string
          priority: number
          url_path: string
        }[]
      }
      get_app_config: {
        Args: { p_environment?: string }
        Returns: {
          category: string
          key: string
          value: Json
        }[]
      }
      get_authority_performance_report: {
        Args: never
        Returns: {
          engagement_rate: number
          last_used_at: string
          performance_score: number
          status: string
          term_name: string
          times_used: number
          total_engagements: number
          total_impressions: number
        }[]
      }
      get_available_cars: {
        Args: {
          p_end_date: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_max_price?: number
          p_min_price?: number
          p_no_credit_card?: boolean
          p_offset?: number
          p_start_date: string
          p_transmission?: string[]
          p_verified_owner?: boolean
        }
        Returns: {
          avg_rating: number
          brand: string
          created_at: string
          currency: string
          features: Json
          id: string
          images: string[]
          location: Json
          model: string
          owner_id: string
          plate: string
          price_per_day: number
          score: number
          status: string
          updated_at: string
          year: number
        }[]
      }
      get_booking_distance: { Args: { p_booking_id: string }; Returns: number }
      get_buckets_without_policies: {
        Args: never
        Returns: {
          bucket_name: string
          is_public: boolean
        }[]
      }
      get_car_blocked_dates: {
        Args: { p_car_id: string; p_end_date?: string; p_start_date?: string }
        Returns: {
          booking_id: string
          end_date: string
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      get_car_conversation_participants: {
        Args: { p_car_id: string; p_user_id: string }
        Returns: {
          last_message_at: string
          unread_count: number
          user_id: string
        }[]
      }
      get_car_stats: {
        Args: { p_car_id: string }
        Returns: {
          cancellation_rate: number
          cancelled_bookings: number
          car_id: string
          completed_bookings: number
          last_review_at: string
          rating_accuracy_avg: number
          rating_avg: number
          rating_checkin_avg: number
          rating_cleanliness_avg: number
          rating_communication_avg: number
          rating_location_avg: number
          rating_value_avg: number
          reviews_count: number
          total_bookings: number
          updated_at: string
        }[]
      }
      get_cars_needing_quality_check: {
        Args: { limit_count?: number }
        Returns: {
          ai_condition_analysis: Json | null
          ai_condition_analyzed_at: string | null
          ai_condition_category: string | null
          ai_condition_score: number | null
          ai_recognition_at: string | null
          ai_recognition_confidence: number | null
          ai_recognition_validated: boolean | null
          ai_recognized_brand: string | null
          ai_recognized_model: string | null
          allow_pets: boolean | null
          allow_rideshare: boolean | null
          allow_second_driver: boolean | null
          allow_smoking: boolean | null
          allowed_provinces: string[] | null
          auto_approval: boolean | null
          availability_end_date: string | null
          availability_start_date: string | null
          brand: string | null
          brand_id: string | null
          brand_text_backup: string | null
          city: string | null
          color: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          deposit_amount: number | null
          deposit_required: boolean | null
          description: string | null
          doors: number | null
          extra_km_price: number | null
          features: Json | null
          fuel_policy: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          has_telemetry: boolean | null
          id: string
          instant_booking: boolean | null
          instant_booking_enabled: boolean | null
          instant_booking_min_score: number | null
          instant_booking_require_verified: boolean | null
          insurance_company: string | null
          insurance_deductible_usd: number | null
          insurance_expires_at: string | null
          insurance_included: boolean | null
          insurance_policy_number: string | null
          kill_switch_enabled: boolean | null
          last_heartbeat: string | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          location_province: string | null
          location_state: string | null
          location_street: string | null
          location_street_number: string | null
          max_anticipation_days: number | null
          max_distance_km: number | null
          max_rental_days: number | null
          mileage: number | null
          mileage_limit: number | null
          min_rental_days: number | null
          model: string | null
          model_id: string | null
          model_text_backup: string | null
          owner_id: string
          photos_quality_checked: boolean | null
          photos_quality_score: number | null
          plates_auto_blurred: boolean | null
          price_per_day: number | null
          province: string | null
          rating_avg: number | null
          review_count: number | null
          seats: number | null
          second_driver_cost: number | null
          status: Database["public"]["Enums"]["car_status"] | null
          telemetry_provider: string | null
          title: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string | null
          uses_dynamic_pricing: boolean | null
          value_usd: number | null
          vehicle_tier: Database["public"]["Enums"]["vehicle_tier"] | null
          year: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "cars"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_cars_within_radius: {
        Args: {
          p_end_date?: string
          p_limit?: number
          p_offset?: number
          p_radius_km: number
          p_start_date?: string
          p_user_lat: number
          p_user_lng: number
        }
        Returns: {
          avg_rating: number
          brand_text_backup: string
          currency: string
          distance_km: number
          id: string
          location_city: string
          location_formatted_address: string
          location_lat: number
          location_lng: number
          location_state: string
          model_text_backup: string
          owner_id: string
          photos_count: number
          price_per_day: number
          status: string
          title: string
          value_usd: number
          year: number
        }[]
      }
      get_claim_charge_summary: { Args: { p_claim_id: string }; Returns: Json }
      get_claims_stats: { Args: never; Returns: Json }
      get_class_benefits: {
        Args: { p_class: number }
        Returns: {
          class: number
          description: string
          fee_discount_pct: number
          fee_multiplier: number
          guarantee_discount_pct: number
          guarantee_multiplier: number
          is_discount: boolean
        }[]
      }
      get_conversation_messages: {
        Args: {
          p_booking_id?: string
          p_car_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          body: string
          booking_id: string
          car_id: string
          created_at: string
          delivered_at: string
          id: string
          read_at: string
          recipient_id: string
          sender_id: string
          updated_at: string
        }[]
      }
      get_conversion_stats: {
        Args: {
          p_car_id?: string
          p_event_type?: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          event_count: number
          event_type: string
          first_event: string
          last_event: string
          unique_users: number
        }[]
      }
      get_current_fx_rate: {
        Args: { p_from_currency: string; p_to_currency: string }
        Returns: number
      }
      get_design_tokens: {
        Args: { p_country?: string; p_event?: string; p_time_of_day?: string }
        Returns: Json
      }
      get_dispute_details: { Args: { p_booking_id: string }; Returns: Json }
      get_driver_profile: {
        Args: { p_user_id: string }
        Returns: {
          claims_with_fault: number
          class: number
          class_description: string
          created_at: string
          driver_score: number
          fee_multiplier: number
          good_years: number
          guarantee_multiplier: number
          last_claim_at: string
          last_claim_with_fault: boolean
          last_class_update: string
          total_claims: number
          updated_at: string
          user_id: string
        }[]
      }
      get_driver_telemetry_average: {
        Args: { p_months?: number; p_user_id: string }
        Returns: {
          avg_score: number
          period_end: string
          period_start: string
          total_hard_brakes: number
          total_km: number
          total_night_hours: number
          total_risk_zones: number
          total_speed_violations: number
          total_trips: number
        }[]
      }
      get_enum_values: {
        Args: { enum_name: string }
        Returns: {
          enumlabel: string
        }[]
      }
      get_expiring_holds: {
        Args: { p_hours_ahead?: number }
        Returns: {
          booking_id: string
          hold_authorization_id: string
          hold_expires_at: string
          hours_until_expiry: number
        }[]
      }
      get_insurance_metrics: {
        Args: { p_from_date?: string; p_to_date?: string }
        Returns: Json
      }
      get_marketing_dashboard: { Args: { p_days_back?: number }; Returns: Json }
      get_mp_onboarding_notifications: {
        Args: { p_user_id: string }
        Returns: {
          car_id: string
          car_name: string
          created_at: string
          notification_id: string
          published_at: string
        }[]
      }
      get_next_content_schedule: {
        Args: { days_ahead?: number }
        Returns: {
          content_category: string
          content_types: string[]
          day_name: string
          emoji: string
          scheduled_date: string
        }[]
      }
      get_next_email_for_subscriber: {
        Args: { p_subscriber_id: string }
        Returns: {
          delay_met: boolean
          html_content: string
          sequence_id: string
          step_id: string
          step_number: number
          subject: string
          template_id: string
        }[]
      }
      get_onboarding_status: { Args: never; Returns: Json }
      get_or_create_current_pool: { Args: never; Returns: string }
      get_owner_penalties: { Args: { p_owner_id: string }; Returns: Json }
      get_owner_visibility_factor: {
        Args: { p_owner_id: string }
        Returns: number
      }
      get_pending_marketing_posts: {
        Args: { max_posts?: number }
        Returns: {
          attempts: number | null
          authority_concept_id: string | null
          call_to_action: string | null
          content_type: string
          created_at: string | null
          error_history: Json | null
          error_message: string | null
          hashtags: string[] | null
          hook_variant_id: string | null
          id: string
          last_error_at: string | null
          max_attempts: number | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          next_retry_at: string | null
          platform: string
          published_at: string | null
          scheduled_for: string
          status: string | null
          text_content: string
        }[]
        SetofOptions: {
          from: "*"
          to: "marketing_content_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_pending_notifications: {
        Args: { p_limit?: number }
        Returns: {
          body: string
          channels: string[]
          data: Json
          notification_id: string
          priority: string
          template_code: string
          title: string
          tokens: string[]
          user_id: string
        }[]
      }
      get_pending_webhook_retries: {
        Args: never
        Returns: {
          event_id: string
          id: string
          mp_payment_id: string
          payload: Json
          retry_count: number
          webhook_type: string
        }[]
      }
      get_query_performance_stats: {
        Args: { p_hours?: number }
        Returns: {
          avg_time_ms: number
          max_time_ms: number
          min_time_ms: number
          p95_time_ms: number
          query_name: string
          slow_calls: number
          total_calls: number
          total_rows_returned: number
        }[]
      }
      get_query_performance_trends: {
        Args: { p_days?: number; p_query_name: string }
        Returns: {
          avg_time_ms: number
          call_count: number
          hour_bucket: string
          max_time_ms: number
        }[]
      }
      get_referral_stats_by_user: { Args: never; Returns: Json }
      get_renter_analysis: {
        Args: { p_booking_id?: string; p_renter_id: string }
        Returns: Json
      }
      get_renter_level: { Args: { p_user_id: string }; Returns: Json }
      get_renter_profile_badge: { Args: { p_renter_id: string }; Returns: Json }
      get_renter_verification_for_owner: {
        Args: { p_booking_id: string }
        Returns: {
          class_description: string
          documents: Json
          driver_class: number
          driver_license_class: string
          driver_license_country: string
          driver_license_expiry: string
          driver_license_points: number
          driver_license_professional: boolean
          driver_license_verified_at: string
          driver_score: number
          email_verified: boolean
          fee_multiplier: number
          full_name: string
          gov_id_number: string
          gov_id_type: string
          guarantee_multiplier: number
          id_verified: boolean
          location_verified_at: string
          phone: string
          phone_verified: boolean
          renter_id: string
          whatsapp: string
        }[]
      }
      get_rls_coverage_report: { Args: never; Returns: Json }
      get_sdui_layout: { Args: { p_page_id: string }; Returns: Json }
      get_seo_health_score: { Args: never; Returns: Json }
      get_slowest_queries: {
        Args: { p_limit?: number; p_min_time_ms?: number }
        Returns: {
          caller_function: string
          created_at: string
          execution_time_ms: number
          id: string
          params_summary: Json
          query_name: string
          rows_returned: number
        }[]
      }
      get_subscription_usage_history: {
        Args: { p_limit?: number; p_subscription_id?: string }
        Returns: Json
      }
      get_tables_missing_policies: {
        Args: never
        Returns: {
          rls_enabled: boolean
          table_name: string
          table_schema: string
        }[]
      }
      get_tables_without_rls: {
        Args: never
        Returns: {
          table_name: string
          table_schema: string
          table_type: string
        }[]
      }
      get_telemetry_history: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          booking_id: string
          car_brand: string
          car_model: string
          car_title: string
          driver_score: number
          hard_brakes: number
          night_driving_hours: number
          risk_zones_visited: number
          speed_violations: number
          telemetry_id: string
          total_km: number
          trip_date: string
        }[]
      }
      get_telemetry_insights: {
        Args: { p_user_id: string }
        Returns: {
          current_score: number
          main_issue: string
          recommendation: string
          score_trend: string
          trips_analyzed: number
        }[]
      }
      get_unread_messages_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_club_benefits: { Args: { p_user_id?: string }; Returns: Json }
      get_user_credit_report: {
        Args: { p_user_id: string }
        Returns: {
          bcra_status: string
          credit_score: number
          estimated_monthly_income: number
          expires_at: string
          has_bankruptcy: boolean
          has_bounced_checks: boolean
          has_lawsuits: boolean
          id: string
          is_valid: boolean
          risk_level: string
          verified_at: string
        }[]
      }
      get_user_documents: {
        Args: { p_user_id?: string }
        Returns: {
          analyzed_at: string | null
          created_at: string
          id: number
          kind: Database["public"]["Enums"]["document_kind"]
          metadata: Json | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          storage_path: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_feature_flags: { Args: { p_user_id?: string }; Returns: Json }
      get_user_public_stats: { Args: { target_user_id: string }; Returns: Json }
      get_user_risk_score: { Args: { p_user_id: string }; Returns: Json }
      get_user_stats: {
        Args: { p_user_id: string }
        Returns: {
          badges: Json
          cancellation_count: number
          cancellation_rate: number
          is_super_host: boolean
          is_top_host: boolean
          is_verified_renter: boolean
          last_review_received_at: string
          owner_rating_accuracy_avg: number
          owner_rating_avg: number
          owner_rating_checkin_avg: number
          owner_rating_cleanliness_avg: number
          owner_rating_communication_avg: number
          owner_rating_location_avg: number
          owner_rating_value_avg: number
          owner_response_rate: number
          owner_response_time_hours: number
          owner_reviews_count: number
          renter_rating_accuracy_avg: number
          renter_rating_avg: number
          renter_rating_checkin_avg: number
          renter_rating_cleanliness_avg: number
          renter_rating_communication_avg: number
          renter_reviews_count: number
          total_bookings_as_owner: number
          total_bookings_as_renter: number
          updated_at: string
          user_id: string
        }[]
      }
      get_user_wallet_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json
          provider: string
          reference_id: string
          status: string
          type: string
        }[]
      }
      get_vehicle_base_price_simple: {
        Args: { p_car_id: string; p_region_id: string }
        Returns: number
      }
      get_vehicle_tier: {
        Args: { p_value_usd: number }
        Returns: Database["public"]["Enums"]["vehicle_tier"]
      }
      get_verification_progress: { Args: never; Returns: Json }
      has_admin_role: {
        Args: {
          check_role: Database["public"]["Enums"]["admin_role"]
          check_user_id?: string
        }
        Returns: boolean
      }
      improve_driver_class_annual: {
        Args: never
        Returns: {
          good_years: number
          new_class: number
          old_class: number
          user_id: string
        }[]
      }
      ingest_iot_data: {
        Args: {
          p_api_key: string
          p_device_id: string
          p_location?: Json
          p_telemetry: Json
        }
        Returns: Json
      }
      initialize_driver_profile: {
        Args: { p_user_id: string }
        Returns: string
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_google_calendar_connected: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_in_cooldown: {
        Args: { p_car_id?: string; p_owner_id: string }
        Returns: boolean
      }
      is_verified_owner: { Args: never; Returns: boolean }
      issue_autorentar_credit: {
        Args: { p_amount_cents?: number; p_user_id: string }
        Returns: {
          credit_balance_cents: number
          expires_at: string
          issued_at: string
          message: string
          success: boolean
        }[]
      }
      issue_protection_credit: {
        Args: {
          p_amount_cents?: number
          p_user_id: string
          p_validity_days?: number
        }
        Returns: {
          expires_at: string
          issued_amount_cents: number
          issued_amount_usd: number
        }[]
      }
      list_bonus_protector_options: {
        Args: never
        Returns: {
          description: string
          price_cents: number
          price_usd: number
          protection_level: number
          validity_days: number
        }[]
      }
      lock_price_for_booking: {
        Args: {
          p_car_id: string
          p_rental_hours: number
          p_rental_start: string
          p_user_id: string
        }
        Returns: Json
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: unknown
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_cron_execution: {
        Args: {
          p_error?: string
          p_job_name: string
          p_response?: Json
          p_status: string
        }
        Returns: undefined
      }
      log_payment_event: {
        Args: {
          p_actor_id?: string
          p_actor_type?: string
          p_amount_cents?: number
          p_booking_id: string
          p_correlation_id?: string
          p_currency?: string
          p_error_code?: string
          p_error_message?: string
          p_event_data?: Json
          p_event_type: string
          p_idempotency_key?: string
          p_new_status?: string
          p_payment_provider?: string
          p_previous_status?: string
          p_provider_response?: Json
          p_provider_transaction_id?: string
        }
        Returns: string
      }
      log_query_performance: {
        Args: {
          p_caller_function?: string
          p_execution_time_ms: number
          p_params_summary?: Json
          p_query_name: string
          p_rows_returned?: number
        }
        Returns: string
      }
      log_token_expiration_alerts: { Args: never; Returns: undefined }
      mark_car_as_non_fipe_validatable: {
        Args: { p_car_id: string; p_reason?: string }
        Returns: Json
      }
      mark_conversation_as_read: {
        Args: { p_booking_id?: string; p_car_id?: string; p_user_id?: string }
        Returns: number
      }
      mark_marketing_post_failed: {
        Args: { p_error_message: string; p_queue_id: string }
        Returns: undefined
      }
      mark_marketing_post_published: {
        Args: { p_post_id: string; p_post_url?: string; p_queue_id: string }
        Returns: undefined
      }
      mark_notification_sent: {
        Args: {
          p_delivery_results?: Json
          p_error_message?: string
          p_notification_id: string
          p_success: boolean
        }
        Returns: undefined
      }
      measure_execution_time: {
        Args: { p_function_name: string; p_start_time: string }
        Returns: undefined
      }
      move_to_marketing_dlq: {
        Args: { p_error: string; p_queue_id: string }
        Returns: string
      }
      open_dispute: {
        Args: {
          p_booking_id: string
          p_claimed_amount_cents?: number
          p_evidence_urls?: string[]
          p_reason: string
          p_reporter_id: string
        }
        Returns: Json
      }
      owner_cancel_booking: {
        Args: { p_booking_id: string; p_owner_id: string; p_reason?: string }
        Returns: Json
      }
      populate_car_estimates: { Args: { p_car_id: string }; Returns: undefined }
      preview_booking_pricing: {
        Args: {
          p_car_id: string
          p_end_at: string
          p_has_card?: boolean
          p_start_at: string
          p_user_id: string
        }
        Returns: {
          adjusted_fee_cents: number
          adjusted_guarantee_cents: number
          base_fee_cents: number
          base_guarantee_cents: number
          base_price_cents: number
          car_id: string
          currency: string
          days: number
          driver_class: number
          driver_score: number
          fee_discount_pct: number
          guarantee_discount_pct: number
          total_amount_cents: number
          user_id: string
        }[]
      }
      process_booking_v2_timeouts: { Args: never; Returns: Json }
      process_claim_charge:
        | {
            Args: {
              p_booking_id: string
              p_claim_id: string
              p_damage_amount_cents: number
              p_description?: string
              p_renter_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_booking_id: string
              p_claim_id: string
              p_damage_amount_cents: number
              p_description?: string
              p_performed_by?: string
              p_renter_id: string
            }
            Returns: Json
          }
      process_comodato_booking_payment: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      process_email_event: {
        Args: {
          p_event_type: string
          p_ip_address?: unknown
          p_link_url?: string
          p_provider_message_id: string
          p_raw_payload?: Json
          p_user_agent?: string
        }
        Returns: Json
      }
      process_instant_booking: {
        Args: {
          p_car_id: string
          p_dropoff_location_id?: string
          p_end_at: string
          p_pickup_location_id?: string
          p_renter_id: string
          p_start_at: string
        }
        Returns: Json
      }
      process_marketing_retries: { Args: never; Returns: undefined }
      process_recovery_escalations: { Args: never; Returns: undefined }
      process_split_payment: {
        Args: { p_booking_id: string; p_total_amount: number }
        Returns: {
          locador_amount: number
          locador_transaction_id: string
          platform_amount: number
          platform_transaction_id: string
          split_payment_id: string
        }[]
      }
      process_subscription_expirations: { Args: never; Returns: undefined }
      process_wallet_transaction: {
        Args: {
          p_amount_cents: number
          p_category: string
          p_description: string
          p_idempotency_key?: string
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      process_withdrawal: {
        Args: { p_request_id: string; p_transfer_id: string }
        Returns: Json
      }
      publish_scheduled_campaigns: { Args: never; Returns: undefined }
      purchase_bonus_protector: {
        Args: { p_protection_level: number; p_user_id: string }
        Returns: {
          addon_id: string
          expiration_date: string
          message: string
          price_paid_cents: number
          price_paid_usd: number
          success: boolean
        }[]
      }
      queue_notification: {
        Args: {
          p_channels?: string[]
          p_data?: Json
          p_idempotency_key?: string
          p_scheduled_for?: string
          p_template_code: string
          p_user_id: string
        }
        Returns: string
      }
      quote_booking: {
        Args: {
          p_car_id: string
          p_end: string
          p_promo?: string
          p_start: string
        }
        Returns: {
          discount: number
          price_subtotal: number
          service_fee: number
          total: number
        }[]
      }
      recalculate_all_driver_scores: {
        Args: never
        Returns: {
          avg_score_change: number
          users_updated: number
        }[]
      }
      recognize_autorentar_credit_breakage: {
        Args: { p_user_id: string }
        Returns: {
          breakage_amount_cents: number
          message: string
          reason: string
          success: boolean
        }[]
      }
      recognize_protection_credit_breakage: {
        Args: { p_user_id: string }
        Returns: {
          breakage_amount_cents: number
          breakage_amount_usd: number
        }[]
      }
      record_email_send: {
        Args: {
          p_provider_message_id: string
          p_sequence_id: string
          p_step_id: string
          p_subject: string
          p_subscriber_id: string
          p_to_email: string
        }
        Returns: string
      }
      record_telemetry: {
        Args: { p_booking_id: string; p_telemetry_data: Json }
        Returns: string
      }
      refresh_accounting_balances: { Args: never; Returns: undefined }
      refresh_booking_stats_daily: { Args: never; Returns: undefined }
      refresh_marketing_metrics: { Args: never; Returns: undefined }
      register_comodato_payment: {
        Args: {
          p_booking_id: string
          p_mercadopago_payment_id?: string
          p_total_cents: number
        }
        Returns: Json
      }
      register_payment_split: {
        Args: {
          p_booking_id: string
          p_currency?: string
          p_mp_payment_id: string
          p_total_amount_cents: number
        }
        Returns: string
      }
      reject_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      release_advisory_lock: { Args: { p_lock_key: number }; Returns: boolean }
      release_advisory_lock_shared: {
        Args: { p_lock_key: number }
        Returns: boolean
      }
      release_mp_preauth_order: {
        Args: { p_description: string; p_mp_order_id: string }
        Returns: {
          error: string
          mp_order_id: string
          mp_order_status: string
          success: boolean
        }[]
      }
      request_booking:
        | {
            Args: {
              p_car_id: string
              p_end: string
              p_idempotency_key?: string
              p_payment_method?: string
              p_renter_id: string
              p_start: string
            }
            Returns: {
              booking_id: string
              status: string
            }[]
          }
        | {
            Args: { p_car_id: string; p_end: string; p_start: string }
            Returns: {
              auto_release_at: string | null
              cancellation_reason: string | null
              cancelled_at: string | null
              cancelled_by: string | null
              car_id: string
              completed_at: string | null
              coverage_snapshot: Json | null
              created_at: string | null
              currency: string | null
              daily_rate: number | null
              deposit_amount_cents: number | null
              dispute_evidence: Json | null
              dispute_reason: string | null
              dispute_resolved_at: string | null
              dropoff_location_id: string | null
              end_at: string
              funds_released_at: string | null
              id: string
              inspection_comment: string | null
              inspection_evidence: Json | null
              inspection_status: string | null
              insurance_fee: number | null
              is_instant_booking: boolean | null
              notes: string | null
              owner_confirmed_delivery: boolean | null
              owner_fee: number | null
              owner_id: string
              payment_mode: string | null
              pickup_location_id: string | null
              renter_confirmed_payment: boolean | null
              renter_id: string
              returned_at: string | null
              service_fee: number | null
              start_at: string
              status: Database["public"]["Enums"]["booking_status"] | null
              subscription_tier_at_booking: string | null
              subtotal: number | null
              total_days: number | null
              total_price: number | null
              updated_at: string | null
              wallet_lock_id: string | null
              wallet_status: string | null
            }
            SetofOptions: {
              from: "*"
              to: "bookings"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_car_id: string
              p_delivery_distance_km?: number
              p_delivery_fee_cents?: number
              p_delivery_required?: boolean
              p_distance_risk_tier?: string
              p_driver_age?: number
              p_dropoff_lat?: number
              p_dropoff_lng?: number
              p_end: string
              p_payment_method?: string
              p_pickup_lat?: number
              p_pickup_lng?: number
              p_start: string
              p_total_price?: number
            }
            Returns: Json
          }
      request_immobilizer_command: {
        Args: {
          p_booking_id?: string
          p_car_id: string
          p_command_type: string
          p_reason: string
        }
        Returns: Json
      }
      reset_marketing_daily_counters: { Args: never; Returns: undefined }
      resolve_dispute: {
        Args: {
          p_admin_id: string
          p_booking_id: string
          p_charge_renter_cents?: number
          p_refund_renter_cents?: number
          p_resolution: string
          p_resolution_notes?: string
        }
        Returns: Json
      }
      retry_fipe_validation_batch: {
        Args: { p_delay_seconds?: number; p_limit?: number }
        Returns: {
          brand: string
          car_id: string
          error_message: string
          model: string
          success: boolean
          value_usd: number
          year: number
        }[]
      }
      retry_fipe_validation_for_car: {
        Args: { p_car_id: string }
        Returns: Json
      }
      rotate_encryption_key: { Args: never; Returns: string }
      schedule_booking_reminders: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      seal_evidence_package: { Args: { p_package_id: string }; Returns: Json }
      select_authority_concept: {
        Args: never
        Returns: {
          concept_id: string
          financial_analogy: string
          image_scene_concept: string
          parenting_pain_point: string
          term_name: string
        }[]
      }
      select_hook_variant: {
        Args: { p_content_type: string }
        Returns: {
          hook_template: string
          variant_id: string
          variant_name: string
        }[]
      }
      send_booking_completion_reminders: { Args: never; Returns: undefined }
      send_booking_reminders: { Args: never; Returns: undefined }
      send_car_recommendations: { Args: never; Returns: undefined }
      send_car_views_milestone_notification: { Args: never; Returns: undefined }
      send_document_expiry_reminders: { Args: never; Returns: undefined }
      send_encrypted_message: {
        Args: {
          p_body?: string
          p_booking_id?: string
          p_car_id?: string
          p_recipient_id?: string
        }
        Returns: string
      }
      send_favorite_car_available: { Args: never; Returns: undefined }
      send_inactive_owner_reminders: { Args: never; Returns: undefined }
      send_monthly_depreciation_notifications: {
        Args: never
        Returns: undefined
      }
      send_nearby_cars_notifications: { Args: never; Returns: undefined }
      send_optimization_tips: { Args: never; Returns: undefined }
      send_pending_requests_reminder: { Args: never; Returns: undefined }
      send_renter_tips: { Args: never; Returns: undefined }
      send_system_message: {
        Args: { p_body: string; p_booking_id: string; p_recipient_id: string }
        Returns: string
      }
      set_primary_goal: { Args: { p_goal: string }; Returns: Json }
      simulate_insurance_quote: {
        Args: {
          p_rental_days?: number
          p_renter_reputation_score?: number
          p_vehicle_value_usd: number
        }
        Returns: Json
      }
      start_location_tracking: {
        Args: { p_booking_id: string; p_tracking_type: string }
        Returns: string
      }
      start_recovery_case: {
        Args: {
          p_booking_id: string
          p_severity?: string
          p_trigger_reason: string
        }
        Returns: string
      }
      sync_binance_rates_direct: { Args: never; Returns: Json }
      sync_binance_rates_via_edge_function: { Args: never; Returns: undefined }
      track_bio_link_click: { Args: { link_id: string }; Returns: undefined }
      track_hook_engagement: {
        Args: {
          p_engagements?: number
          p_link_clicks?: number
          p_saves?: number
          p_shares?: number
          p_variant_id: string
        }
        Returns: undefined
      }
      track_hook_impression: {
        Args: { p_variant_id: string }
        Returns: undefined
      }
      transfer_profit_to_equity: {
        Args: { p_period: string }
        Returns: undefined
      }
      trigger_authority_report: { Args: never; Returns: undefined }
      trigger_marketing_scheduler: { Args: never; Returns: undefined }
      try_advisory_lock: { Args: { p_lock_key: number }; Returns: boolean }
      try_advisory_lock_shared: {
        Args: { p_lock_key: number }
        Returns: boolean
      }
      unlock_expired_wallet_locks: {
        Args: { p_batch_size?: number }
        Returns: {
          affected_users: string[]
          has_more: boolean
          total_amount_unlocked: number
          unlocked_count: number
        }[]
      }
      update_authority_metrics: { Args: never; Returns: undefined }
      update_driver_class_on_event: {
        Args: {
          p_claim_with_fault: boolean
          p_severity?: number
          p_user_id: string
        }
        Returns: {
          class_change: number
          new_class: number
          old_class: number
        }[]
      }
      update_driver_risk_score: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_location: {
        Args: {
          p_accuracy?: number
          p_heading?: number
          p_latitude: number
          p_longitude: number
          p_speed?: number
          p_tracking_id: string
        }
        Returns: boolean
      }
      update_my_profile: { Args: { payload: Json }; Returns: Json }
      update_payment_intent_status: {
        Args: {
          p_card_last4?: string
          p_metadata?: Json
          p_mp_payment_id: string
          p_mp_status: string
          p_mp_status_detail?: string
          p_payment_method_id?: string
        }
        Returns: Json
      }
      update_persona_stats: {
        Args: { p_action_type: string; p_persona_id: string }
        Returns: undefined
      }
      update_profile_from_ocr: {
        Args: {
          p_country: string
          p_date_of_birth: string
          p_document_number: string
          p_full_name: string
          p_ocr_confidence: number
          p_user_id: string
        }
        Returns: Json
      }
      update_user_cars_payment_status: {
        Args: { p_user_id: string }
        Returns: number
      }
      update_user_stats_v2_for_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      update_webhook_retry_attempt: {
        Args: {
          p_error_details?: Json
          p_error_message?: string
          p_queue_id: string
          p_success: boolean
        }
        Returns: undefined
      }
      upgrade_subscription_with_wallet: {
        Args: {
          p_description?: string
          p_meta?: Json
          p_new_tier: Database["public"]["Enums"]["subscription_tier"]
          p_ref: string
          p_user_id: string
        }
        Returns: Json
      }
      upsert_user_document: {
        Args: {
          p_kind: string
          p_status?: string
          p_storage_path: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_can_receive_payments: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      validate_and_confirm_split_payment: {
        Args: {
          p_booking_id: string
          p_collector_id: string
          p_currency_id: string
          p_date_approved: string
          p_marketplace_fee: number
          p_metadata?: Json
          p_mp_payment_id: string
          p_mp_status: string
          p_mp_status_detail: string
          p_payment_method_id: string
          p_transaction_amount: number
        }
        Returns: Json
      }
      validate_bonus_malus_migration: {
        Args: never
        Returns: {
          check_name: string
          details: string
          passed: boolean
        }[]
      }
      validate_claim_anti_fraud: {
        Args: {
          p_booking_id: string
          p_owner_id: string
          p_total_estimated_usd: number
        }
        Returns: Json
      }
      verify_accounting_integrity: {
        Args: never
        Returns: {
          details: string
          passed: boolean
          test_name: string
        }[]
      }
      verify_bank_account: {
        Args: { p_account_number: string; p_user_id: string }
        Returns: Json
      }
      verify_phone_otp_code: {
        Args: { p_code: string; p_phone: string }
        Returns: Json
      }
      wallet_charge_rental: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_meta?: Json
          p_ref: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_charge_subscription: {
        Args: {
          p_amount_cents: number
          p_description?: string
          p_meta?: Json
          p_ref: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_confirm_deposit_admin: {
        Args: {
          p_provider_metadata?: Json
          p_provider_transaction_id: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: {
          message: string
          new_available_balance: number
          new_total_balance: number
          new_withdrawable_balance: number
          success: boolean
        }[]
      }
      wallet_debit_for_damage: {
        Args: {
          p_amount_usd: number
          p_booking_id: string
          p_claim_id: string
          p_description?: string
        }
        Returns: {
          debited_amount_usd: number
          error_message: string
          remaining_balance_usd: number
          success: boolean
          transaction_id: string
        }[]
      }
      wallet_deduct_damage_atomic: {
        Args: {
          p_booking_id: string
          p_car_id: string
          p_damage_amount_cents: number
          p_damage_description: string
          p_owner_id: string
          p_renter_id: string
        }
        Returns: Json
      }
      wallet_deposit: {
        Args: {
          p_amount_cents: number
          p_description: string
          p_ref_id?: string
        }
        Returns: Json
      }
      wallet_deposit_funds_admin: {
        Args: {
          p_amount_cents: number
          p_description: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: {
          error_message: string
          success: boolean
          transaction_id: string
        }[]
      }
      wallet_deposit_ledger: {
        Args: {
          p_amount_cents: number
          p_meta?: Json
          p_provider?: string
          p_ref: string
          p_user_id: string
        }
        Returns: Json
      }
      wallet_get_balance: {
        Args: { p_user_id?: string }
        Returns: {
          available_balance: number
          currency: string
          locked_balance: number
          total_balance: number
          user_id: string
        }[]
      }
      wallet_get_balance_with_lock: {
        Args: never
        Returns: {
          autorentar_credit_balance: number
          available_balance: number
          cash_deposit_balance: number
          locked_balance: number
          protected_credit_balance: number
          total_balance: number
          transferable_balance: number
          withdrawable_balance: number
        }[]
      }
      wallet_hold_funds: {
        Args: { p_amount_cents: number; p_booking_id: string }
        Returns: Json
      }
      wallet_initiate_deposit: {
        Args: { p_amount: number; p_provider?: string; p_user_id: string }
        Returns: string
      }
      wallet_lock_funds:
        | {
            Args: {
              p_amount: number
              p_booking_id: string
              p_description?: string
            }
            Returns: {
              message: string
              new_available_balance: number
              new_locked_balance: number
              success: boolean
              transaction_id: string
            }[]
          }
        | {
            Args: { p_amount_cents: number; p_booking_id: string }
            Returns: string
          }
      wallet_lock_rental_and_deposit: {
        Args: {
          p_booking_id: string
          p_deposit_amount?: number
          p_rental_amount: number
        }
        Returns: {
          deposit_lock_transaction_id: string
          message: string
          new_available_balance: number
          new_locked_balance: number
          rental_lock_transaction_id: string
          success: boolean
          total_locked: number
        }[]
      }
      wallet_record_rental_payment: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_meta?: Json
          p_owner_id: string
          p_ref: string
        }
        Returns: undefined
      }
      wallet_release_funds: {
        Args: { p_amount_cents: number; p_booking_id: string }
        Returns: Json
      }
      wallet_request_topup: {
        Args: {
          p_amount_needed_usd: number
          p_booking_id: string
          p_claim_id: string
          p_description?: string
        }
        Returns: {
          amount_requested_usd: number
          error_message: string
          request_id: string
          status: string
          success: boolean
        }[]
      }
      wallet_transfer: {
        Args: {
          p_amount_cents: number
          p_from_user: string
          p_meta?: Json
          p_ref: string
          p_to_user: string
        }
        Returns: Json
      }
      wallet_unlock_funds: {
        Args: { p_booking_id: string; p_description?: string }
        Returns: {
          message: string
          new_available_balance: number
          new_locked_balance: number
          success: boolean
          transaction_id: string
          unlocked_amount: number
        }[]
      }
      whatsapp_debounce_check: {
        Args: { p_phone: string; p_timestamp: number }
        Returns: boolean
      }
      whatsapp_debounce_set: {
        Args: { p_phone: string; p_timestamp: number }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "operations" | "support" | "finance"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "cancelled_owner"
        | "cancelled_renter"
        | "pending_return"
        | "dispute"
        | "payment_validation_failed"
        | "returned"
        | "inspected_good"
        | "damage_reported"
        | "disputed"
        | "pending_payment"
        | "pending_approval"
        | "pending_dispute_resolution"
        | "pending_owner_approval"
        | "pending_review"
        | "resolved"
        | "cancelled_system"
        | "rejected"
        | "no_show"
        | "expired"
      cancel_policy: "flex" | "moderate" | "strict"
      car_status: "draft" | "active" | "paused" | "deleted" | "pending"
      claim_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "paid"
        | "processing"
      damage_severity: "minor" | "moderate" | "severe"
      damage_type:
        | "scratch"
        | "dent"
        | "broken_glass"
        | "tire_damage"
        | "mechanical"
        | "interior"
        | "missing_item"
        | "other"
      dispute_kind: "damage" | "no_show" | "late_return" | "other"
      dispute_status: "open" | "in_review" | "resolved" | "rejected"
      document_kind:
        | "gov_id_front"
        | "gov_id_back"
        | "driver_license"
        | "utility_bill"
        | "selfie"
        | "license_front"
        | "license_back"
        | "vehicle_registration"
        | "vehicle_insurance"
        | "criminal_record"
      fuel_type: "nafta" | "gasoil" | "gnc" | "electrico" | "hibrido"
      kyc_status: "not_started" | "pending" | "verified" | "rejected"
      notification_type:
        | "new_booking_for_owner"
        | "booking_cancelled_for_owner"
        | "booking_cancelled_for_renter"
        | "new_chat_message"
        | "payment_successful"
        | "payout_successful"
        | "inspection_reminder"
        | "generic_announcement"
        | "protector_expiring_soon"
        | "protector_expiring_tomorrow"
        | "protector_expired"
        | "pending_requests_reminder"
      onboarding_status: "incomplete" | "complete" | "skipped"
      payment_event_type:
        | "payment_initiated"
        | "payment_processing"
        | "payment_approved"
        | "payment_rejected"
        | "payment_failed"
        | "payment_cancelled"
        | "hold_created"
        | "hold_captured"
        | "hold_released"
        | "hold_expired"
        | "hold_reauthorized"
        | "refund_initiated"
        | "refund_processing"
        | "refund_completed"
        | "refund_failed"
        | "partial_refund_completed"
        | "split_initiated"
        | "split_owner_payment"
        | "split_platform_fee"
        | "split_completed"
        | "wallet_lock_created"
        | "wallet_lock_released"
        | "wallet_funds_transferred"
        | "dispute_opened"
        | "dispute_evidence_submitted"
        | "dispute_resolved"
        | "webhook_received"
        | "status_sync"
        | "manual_intervention"
      payment_provider: "mock" | "mercadopago" | "stripe"
      payment_status:
        | "pending"
        | "processing"
        | "approved"
        | "rejected"
        | "refunded"
        | "cancelled"
      recovery_status:
        | "normal"
        | "grace_period"
        | "contact_attempt"
        | "escalated_ops"
        | "escalated_legal"
        | "recovery_active"
        | "recovered"
        | "claim_filed"
      subscription_status:
        | "active"
        | "inactive"
        | "depleted"
        | "expired"
        | "cancelled"
      subscription_tier: "club_standard" | "club_black"
      transmission_type: "manual" | "automatico"
      vehicle_tier:
        | "starter"
        | "economy"
        | "standard"
        | "silver"
        | "premium"
        | "luxury"
      wallet_tx_status: "pending" | "completed" | "failed" | "cancelled"
      wallet_tx_type:
        | "deposit"
        | "withdrawal"
        | "charge"
        | "refund"
        | "lock"
        | "unlock"
        | "transfer_in"
        | "transfer_out"
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
      admin_role: ["super_admin", "operations", "support", "finance"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "cancelled_owner",
        "cancelled_renter",
        "pending_return",
        "dispute",
        "payment_validation_failed",
        "returned",
        "inspected_good",
        "damage_reported",
        "disputed",
        "pending_payment",
        "pending_approval",
        "pending_dispute_resolution",
        "pending_owner_approval",
        "pending_review",
        "resolved",
        "cancelled_system",
        "rejected",
        "no_show",
        "expired",
      ],
      cancel_policy: ["flex", "moderate", "strict"],
      car_status: ["draft", "active", "paused", "deleted", "pending"],
      claim_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "paid",
        "processing",
      ],
      damage_severity: ["minor", "moderate", "severe"],
      damage_type: [
        "scratch",
        "dent",
        "broken_glass",
        "tire_damage",
        "mechanical",
        "interior",
        "missing_item",
        "other",
      ],
      dispute_kind: ["damage", "no_show", "late_return", "other"],
      dispute_status: ["open", "in_review", "resolved", "rejected"],
      document_kind: [
        "gov_id_front",
        "gov_id_back",
        "driver_license",
        "utility_bill",
        "selfie",
        "license_front",
        "license_back",
        "vehicle_registration",
        "vehicle_insurance",
        "criminal_record",
      ],
      fuel_type: ["nafta", "gasoil", "gnc", "electrico", "hibrido"],
      kyc_status: ["not_started", "pending", "verified", "rejected"],
      notification_type: [
        "new_booking_for_owner",
        "booking_cancelled_for_owner",
        "booking_cancelled_for_renter",
        "new_chat_message",
        "payment_successful",
        "payout_successful",
        "inspection_reminder",
        "generic_announcement",
        "protector_expiring_soon",
        "protector_expiring_tomorrow",
        "protector_expired",
        "pending_requests_reminder",
      ],
      onboarding_status: ["incomplete", "complete", "skipped"],
      payment_event_type: [
        "payment_initiated",
        "payment_processing",
        "payment_approved",
        "payment_rejected",
        "payment_failed",
        "payment_cancelled",
        "hold_created",
        "hold_captured",
        "hold_released",
        "hold_expired",
        "hold_reauthorized",
        "refund_initiated",
        "refund_processing",
        "refund_completed",
        "refund_failed",
        "partial_refund_completed",
        "split_initiated",
        "split_owner_payment",
        "split_platform_fee",
        "split_completed",
        "wallet_lock_created",
        "wallet_lock_released",
        "wallet_funds_transferred",
        "dispute_opened",
        "dispute_evidence_submitted",
        "dispute_resolved",
        "webhook_received",
        "status_sync",
        "manual_intervention",
      ],
      payment_provider: ["mock", "mercadopago", "stripe"],
      payment_status: [
        "pending",
        "processing",
        "approved",
        "rejected",
        "refunded",
        "cancelled",
      ],
      recovery_status: [
        "normal",
        "grace_period",
        "contact_attempt",
        "escalated_ops",
        "escalated_legal",
        "recovery_active",
        "recovered",
        "claim_filed",
      ],
      subscription_status: [
        "active",
        "inactive",
        "depleted",
        "expired",
        "cancelled",
      ],
      subscription_tier: ["club_standard", "club_black"],
      transmission_type: ["manual", "automatico"],
      vehicle_tier: [
        "starter",
        "economy",
        "standard",
        "silver",
        "premium",
        "luxury",
      ],
      wallet_tx_status: ["pending", "completed", "failed", "cancelled"],
      wallet_tx_type: [
        "deposit",
        "withdrawal",
        "charge",
        "refund",
        "lock",
        "unlock",
        "transfer_in",
        "transfer_out",
      ],
    },
  },
} as const
