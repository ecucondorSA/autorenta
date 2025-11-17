/**
 * Database Types para AutoRenta
 *
 * IMPORTANTE: Este archivo es auto-generado desde el schema de Supabase.
 * NO editar manualmente.
 *
 * Para regenerar:
 *   npm run sync:types        # Desde proyecto local
 *   npm run sync:types:remote # Desde proyecto remoto
 *
 * Última actualización: 2025-11-12 19:23:29
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      accounting_accounts: {
        Row: {
          account_type: string;
          code: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          is_control_account: boolean | null;
          name: string;
          parent_account_id: string | null;
          sub_type: string;
        };
        Insert: {
          account_type: string;
          code: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_control_account?: boolean | null;
          name: string;
          parent_account_id?: string | null;
          sub_type: string;
        };
        Update: {
          account_type?: string;
          code?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_control_account?: boolean | null;
          name?: string;
          parent_account_id?: string | null;
          sub_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'accounting_accounts_parent_account_id_fkey';
            columns: ['parent_account_id'];
            isOneToOne: false;
            referencedRelation: 'accounting_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      accounting_audit_log: {
        Row: {
          actual_value: number | null;
          affected_account: string | null;
          affected_period: string | null;
          audit_type: string;
          created_at: string | null;
          description: string;
          expected_value: number | null;
          id: string;
          resolution_status: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string | null;
          variance: number | null;
        };
        Insert: {
          actual_value?: number | null;
          affected_account?: string | null;
          affected_period?: string | null;
          audit_type: string;
          created_at?: string | null;
          description: string;
          expected_value?: number | null;
          id?: string;
          resolution_status?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          variance?: number | null;
        };
        Update: {
          actual_value?: number | null;
          affected_account?: string | null;
          affected_period?: string | null;
          audit_type?: string;
          created_at?: string | null;
          description?: string;
          expected_value?: number | null;
          id?: string;
          resolution_status?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          variance?: number | null;
        };
        Relationships: [];
      };
      accounting_chart_of_accounts: {
        Row: {
          account_type: string;
          code: string;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          level: number | null;
          name: string;
          niif_reference: string | null;
          parent_code: string | null;
          requires_subsidiary: boolean | null;
          sub_type: string | null;
          updated_at: string | null;
        };
        Insert: {
          account_type: string;
          code: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          level?: number | null;
          name: string;
          niif_reference?: string | null;
          parent_code?: string | null;
          requires_subsidiary?: boolean | null;
          sub_type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          account_type?: string;
          code?: string;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          level?: number | null;
          name?: string;
          niif_reference?: string | null;
          parent_code?: string | null;
          requires_subsidiary?: boolean | null;
          sub_type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      accounting_ledger: {
        Row: {
          account_code: string;
          batch_id: string | null;
          created_at: string | null;
          created_by: string | null;
          credit: number | null;
          debit: number | null;
          description: string | null;
          entry_date: string;
          fiscal_period: string | null;
          id: string;
          is_closing_entry: boolean | null;
          is_reversed: boolean | null;
          reference_id: string | null;
          reference_type: string | null;
          user_id: string | null;
        };
        Insert: {
          account_code: string;
          batch_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit?: number | null;
          debit?: number | null;
          description?: string | null;
          entry_date?: string;
          fiscal_period?: string | null;
          id?: string;
          is_closing_entry?: boolean | null;
          is_reversed?: boolean | null;
          reference_id?: string | null;
          reference_type?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_code?: string;
          batch_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          credit?: number | null;
          debit?: number | null;
          description?: string | null;
          entry_date?: string;
          fiscal_period?: string | null;
          id?: string;
          is_closing_entry?: boolean | null;
          is_reversed?: boolean | null;
          reference_id?: string | null;
          reference_type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'accounting_ledger_account_code_fkey';
            columns: ['account_code'];
            isOneToOne: false;
            referencedRelation: 'accounting_chart_of_accounts';
            referencedColumns: ['code'];
          },
        ];
      };
      accounting_period_balances: {
        Row: {
          account_id: string;
          closed_at: string | null;
          closing_balance: number | null;
          created_at: string | null;
          id: string;
          is_closed: boolean | null;
          opening_balance: number | null;
          period: string;
          period_credits: number | null;
          period_debits: number | null;
        };
        Insert: {
          account_id: string;
          closed_at?: string | null;
          closing_balance?: number | null;
          created_at?: string | null;
          id?: string;
          is_closed?: boolean | null;
          opening_balance?: number | null;
          period: string;
          period_credits?: number | null;
          period_debits?: number | null;
        };
        Update: {
          account_id?: string;
          closed_at?: string | null;
          closing_balance?: number | null;
          created_at?: string | null;
          id?: string;
          is_closed?: boolean | null;
          opening_balance?: number | null;
          period?: string;
          period_credits?: number | null;
          period_debits?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'accounting_period_balances_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounting_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      accounting_period_closures: {
        Row: {
          balance_check: boolean | null;
          closed_at: string | null;
          closed_by: string | null;
          closing_entries_batch_id: string | null;
          created_at: string | null;
          end_date: string;
          id: string;
          notes: string | null;
          period_code: string;
          period_type: string;
          start_date: string;
          status: string | null;
          total_credits: number | null;
          total_debits: number | null;
        };
        Insert: {
          balance_check?: boolean | null;
          closed_at?: string | null;
          closed_by?: string | null;
          closing_entries_batch_id?: string | null;
          created_at?: string | null;
          end_date: string;
          id?: string;
          notes?: string | null;
          period_code: string;
          period_type: string;
          start_date: string;
          status?: string | null;
          total_credits?: number | null;
          total_debits?: number | null;
        };
        Update: {
          balance_check?: boolean | null;
          closed_at?: string | null;
          closed_by?: string | null;
          closing_entries_batch_id?: string | null;
          created_at?: string | null;
          end_date?: string;
          id?: string;
          notes?: string | null;
          period_code?: string;
          period_type?: string;
          start_date?: string;
          status?: string | null;
          total_credits?: number | null;
          total_debits?: number | null;
        };
        Relationships: [];
      };
      accounting_provisions: {
        Row: {
          created_at: string | null;
          current_balance: number | null;
          id: string;
          notes: string | null;
          provision_amount: number;
          provision_date: string | null;
          provision_type: string;
          reference_id: string | null;
          reference_table: string | null;
          release_date: string | null;
          released_amount: number | null;
          status: string | null;
          utilized_amount: number | null;
        };
        Insert: {
          created_at?: string | null;
          current_balance?: number | null;
          id?: string;
          notes?: string | null;
          provision_amount: number;
          provision_date?: string | null;
          provision_type: string;
          reference_id?: string | null;
          reference_table?: string | null;
          release_date?: string | null;
          released_amount?: number | null;
          status?: string | null;
          utilized_amount?: number | null;
        };
        Update: {
          created_at?: string | null;
          current_balance?: number | null;
          id?: string;
          notes?: string | null;
          provision_amount?: number;
          provision_date?: string | null;
          provision_type?: string;
          reference_id?: string | null;
          reference_table?: string | null;
          release_date?: string | null;
          released_amount?: number | null;
          status?: string | null;
          utilized_amount?: number | null;
        };
        Relationships: [];
      };
      accounting_revenue_recognition: {
        Row: {
          booking_id: string;
          booking_status: string | null;
          commission_amount: number;
          created_at: string | null;
          currency: string | null;
          gross_amount: number;
          id: string;
          is_recognized: boolean | null;
          ledger_batch_id: string | null;
          notes: string | null;
          owner_amount: number;
          performance_obligation_met: boolean | null;
          recognition_date: string | null;
          revenue_type: string;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          booking_status?: string | null;
          commission_amount: number;
          created_at?: string | null;
          currency?: string | null;
          gross_amount: number;
          id?: string;
          is_recognized?: boolean | null;
          ledger_batch_id?: string | null;
          notes?: string | null;
          owner_amount: number;
          performance_obligation_met?: boolean | null;
          recognition_date?: string | null;
          revenue_type: string;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          booking_status?: string | null;
          commission_amount?: number;
          created_at?: string | null;
          currency?: string | null;
          gross_amount?: number;
          id?: string;
          is_recognized?: boolean | null;
          ledger_batch_id?: string | null;
          notes?: string | null;
          owner_amount?: number;
          performance_obligation_met?: boolean | null;
          recognition_date?: string | null;
          revenue_type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'accounting_revenue_recognition_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'accounting_revenue_recognition_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'accounting_revenue_recognition_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      bank_accounts: {
        Row: {
          account_holder_id: string;
          account_holder_name: string;
          account_number: string;
          account_number_encrypted: string | null;
          account_type: string;
          alias_encrypted: string | null;
          bank_code: string | null;
          bank_name: string | null;
          bank_name_encrypted: string | null;
          cbu_encrypted: string | null;
          created_at: string | null;
          id: string;
          is_default: boolean | null;
          updated_at: string | null;
          user_id: string;
          verified: boolean | null;
          verified_at: string | null;
        };
        Insert: {
          account_holder_id: string;
          account_holder_name: string;
          account_number: string;
          account_number_encrypted?: string | null;
          account_type: string;
          alias_encrypted?: string | null;
          bank_code?: string | null;
          bank_name?: string | null;
          bank_name_encrypted?: string | null;
          cbu_encrypted?: string | null;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          updated_at?: string | null;
          user_id: string;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Update: {
          account_holder_id?: string;
          account_holder_name?: string;
          account_number?: string;
          account_number_encrypted?: string | null;
          account_type?: string;
          alias_encrypted?: string | null;
          bank_code?: string | null;
          bank_name?: string | null;
          bank_name_encrypted?: string | null;
          cbu_encrypted?: string | null;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      booking_claims: {
        Row: {
          booking_id: string;
          claim_amount_cents: number | null;
          claim_currency: string;
          created_at: string | null;
          damage_type: string | null;
          description: string | null;
          evidence_photos: Json | null;
          fault_attributed: boolean | null;
          id: string;
          police_report_url: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: number | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          booking_id: string;
          claim_amount_cents?: number | null;
          claim_currency?: string;
          created_at?: string | null;
          damage_type?: string | null;
          description?: string | null;
          evidence_photos?: Json | null;
          fault_attributed?: boolean | null;
          id?: string;
          police_report_url?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: number | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          booking_id?: string;
          claim_amount_cents?: number | null;
          claim_currency?: string;
          created_at?: string | null;
          damage_type?: string | null;
          description?: string | null;
          evidence_photos?: Json | null;
          fault_attributed?: boolean | null;
          id?: string;
          police_report_url?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: number | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_risk_snapshot: {
        Row: {
          booking_id: string;
          bucket: string;
          car_location_lat: number | null;
          car_location_lng: number | null;
          country_code: string;
          created_at: string | null;
          currency: string;
          distance_km: number | null;
          distance_risk_multiplier: number | null;
          distance_risk_tier: string | null;
          estimated_deposit: number | null;
          estimated_hold_amount: number | null;
          franchise_usd: number;
          fx_snapshot: number;
          fx_snapshot_date: string | null;
          guarantee_amount_ars: number | null;
          guarantee_amount_usd: number | null;
          guarantee_type: string | null;
          has_card: boolean;
          has_wallet_security: boolean;
          meta: Json | null;
          min_hold_ars: number | null;
          renter_location_lat: number | null;
          renter_location_lng: number | null;
          requires_revalidation: boolean | null;
          revalidation_reason: string | null;
          rollover_franchise_usd: number | null;
          standard_franchise_usd: number | null;
        };
        Insert: {
          booking_id: string;
          bucket: string;
          car_location_lat?: number | null;
          car_location_lng?: number | null;
          country_code: string;
          created_at?: string | null;
          currency?: string;
          distance_km?: number | null;
          distance_risk_multiplier?: number | null;
          distance_risk_tier?: string | null;
          estimated_deposit?: number | null;
          estimated_hold_amount?: number | null;
          franchise_usd: number;
          fx_snapshot?: number;
          fx_snapshot_date?: string | null;
          guarantee_amount_ars?: number | null;
          guarantee_amount_usd?: number | null;
          guarantee_type?: string | null;
          has_card?: boolean;
          has_wallet_security?: boolean;
          meta?: Json | null;
          min_hold_ars?: number | null;
          renter_location_lat?: number | null;
          renter_location_lng?: number | null;
          requires_revalidation?: boolean | null;
          revalidation_reason?: string | null;
          rollover_franchise_usd?: number | null;
          standard_franchise_usd?: number | null;
        };
        Update: {
          booking_id?: string;
          bucket?: string;
          car_location_lat?: number | null;
          car_location_lng?: number | null;
          country_code?: string;
          created_at?: string | null;
          currency?: string;
          distance_km?: number | null;
          distance_risk_multiplier?: number | null;
          distance_risk_tier?: string | null;
          estimated_deposit?: number | null;
          estimated_hold_amount?: number | null;
          franchise_usd?: number;
          fx_snapshot?: number;
          fx_snapshot_date?: string | null;
          guarantee_amount_ars?: number | null;
          guarantee_amount_usd?: number | null;
          guarantee_type?: string | null;
          has_card?: boolean;
          has_wallet_security?: boolean;
          meta?: Json | null;
          min_hold_ars?: number | null;
          renter_location_lat?: number | null;
          renter_location_lng?: number | null;
          requires_revalidation?: boolean | null;
          revalidation_reason?: string | null;
          rollover_franchise_usd?: number | null;
          standard_franchise_usd?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_waitlist: {
        Row: {
          car_id: string;
          created_at: string;
          end_date: string;
          expires_at: string;
          id: string;
          notified_at: string | null;
          start_date: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          car_id: string;
          created_at?: string;
          end_date: string;
          expires_at?: string;
          id?: string;
          notified_at?: string | null;
          start_date: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          end_date?: string;
          expires_at?: string;
          id?: string;
          notified_at?: string | null;
          start_date?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_waitlist_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_waitlist_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_waitlist_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          authorized_payment_id: string | null;
          breakdown: Json | null;
          calendar_sync_enabled: boolean | null;
          calendar_synced_at: string | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_id: string;
          coverage_upgrade: string | null;
          created_at: string;
          currency: string;
          days_count: number | null;
          delivery_distance_km: number | null;
          delivery_fee_cents: number | null;
          delivery_required: boolean | null;
          discounts_cents: number | null;
          distance_risk_tier: string | null;
          dropoff_location_lat: number | null;
          dropoff_location_lng: number | null;
          dynamic_price_snapshot: Json | null;
          end_at: string;
          expires_at: string | null;
          fees_cents: number | null;
          google_calendar_event_id: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          has_dynamic_pricing: boolean | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          insurance_cents: number | null;
          nightly_rate_cents: number | null;
          owner_payment_amount: number | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_init_point: string | null;
          payment_mode: string | null;
          payment_preference_id: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          pickup_location_lat: number | null;
          pickup_location_lng: number | null;
          platform_fee: number | null;
          price_lock_token: string | null;
          price_locked_until: string | null;
          provider_collector_id: string | null;
          provider_split_payment_id: string | null;
          reauthorization_count: number | null;
          renter_id: string;
          requires_revalidation: boolean | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          subtotal_cents: number | null;
          total_amount: number;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string;
          wallet_lock_id: string | null;
        };
        Insert: {
          authorized_payment_id?: string | null;
          breakdown?: Json | null;
          calendar_sync_enabled?: boolean | null;
          calendar_synced_at?: string | null;
          cancellation_fee_cents?: number | null;
          cancellation_policy_id?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          car_id: string;
          coverage_upgrade?: string | null;
          created_at?: string;
          currency?: string;
          days_count?: number | null;
          delivery_distance_km?: number | null;
          delivery_fee_cents?: number | null;
          delivery_required?: boolean | null;
          discounts_cents?: number | null;
          distance_risk_tier?: string | null;
          dropoff_location_lat?: number | null;
          dropoff_location_lng?: number | null;
          dynamic_price_snapshot?: Json | null;
          end_at: string;
          expires_at?: string | null;
          fees_cents?: number | null;
          google_calendar_event_id?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          has_dynamic_pricing?: boolean | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          insurance_cents?: number | null;
          nightly_rate_cents?: number | null;
          owner_payment_amount?: number | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_init_point?: string | null;
          payment_mode?: string | null;
          payment_preference_id?: string | null;
          payment_provider?: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed?: boolean | null;
          payment_split_validated_at?: string | null;
          pickup_location_lat?: number | null;
          pickup_location_lng?: number | null;
          platform_fee?: number | null;
          price_lock_token?: string | null;
          price_locked_until?: string | null;
          provider_collector_id?: string | null;
          provider_split_payment_id?: string | null;
          reauthorization_count?: number | null;
          renter_id: string;
          requires_revalidation?: boolean | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          start_at: string;
          status?: Database['public']['Enums']['booking_status'];
          subtotal_cents?: number | null;
          total_amount: number;
          total_cents?: number | null;
          total_price_ars?: number | null;
          updated_at?: string;
          wallet_lock_id?: string | null;
        };
        Update: {
          authorized_payment_id?: string | null;
          breakdown?: Json | null;
          calendar_sync_enabled?: boolean | null;
          calendar_synced_at?: string | null;
          cancellation_fee_cents?: number | null;
          cancellation_policy_id?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          car_id?: string;
          coverage_upgrade?: string | null;
          created_at?: string;
          currency?: string;
          days_count?: number | null;
          delivery_distance_km?: number | null;
          delivery_fee_cents?: number | null;
          delivery_required?: boolean | null;
          discounts_cents?: number | null;
          distance_risk_tier?: string | null;
          dropoff_location_lat?: number | null;
          dropoff_location_lng?: number | null;
          dynamic_price_snapshot?: Json | null;
          end_at?: string;
          expires_at?: string | null;
          fees_cents?: number | null;
          google_calendar_event_id?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          has_dynamic_pricing?: boolean | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          insurance_cents?: number | null;
          nightly_rate_cents?: number | null;
          owner_payment_amount?: number | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_init_point?: string | null;
          payment_mode?: string | null;
          payment_preference_id?: string | null;
          payment_provider?: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed?: boolean | null;
          payment_split_validated_at?: string | null;
          pickup_location_lat?: number | null;
          pickup_location_lng?: number | null;
          platform_fee?: number | null;
          price_lock_token?: string | null;
          price_locked_until?: string | null;
          provider_collector_id?: string | null;
          provider_split_payment_id?: string | null;
          reauthorization_count?: number | null;
          renter_id?: string;
          requires_revalidation?: boolean | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          start_at?: string;
          status?: Database['public']['Enums']['booking_status'];
          subtotal_cents?: number | null;
          total_amount?: number;
          total_cents?: number | null;
          total_price_ars?: number | null;
          updated_at?: string;
          wallet_lock_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_intents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fk_bookings_risk_snapshot';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      calendar_sync_log: {
        Row: {
          booking_id: string | null;
          car_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          error_code: string | null;
          error_message: string | null;
          google_calendar_event_id: string | null;
          id: string;
          operation: string;
          request_payload: Json | null;
          response_payload: Json | null;
          retry_count: number | null;
          status: string;
          sync_direction: string | null;
          user_id: string | null;
        };
        Insert: {
          booking_id?: string | null;
          car_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          google_calendar_event_id?: string | null;
          id?: string;
          operation: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          retry_count?: number | null;
          status: string;
          sync_direction?: string | null;
          user_id?: string | null;
        };
        Update: {
          booking_id?: string | null;
          car_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          google_calendar_event_id?: string | null;
          id?: string;
          operation?: string;
          request_payload?: Json | null;
          response_payload?: Json | null;
          retry_count?: number | null;
          status?: string;
          sync_direction?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'calendar_sync_log_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_sync_log_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_sync_log_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_sync_log_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_sync_log_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calendar_sync_log_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      car_brands: {
        Row: {
          country: string | null;
          created_at: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          country?: string | null;
          created_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          country?: string | null;
          created_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      car_google_calendars: {
        Row: {
          calendar_description: string | null;
          calendar_name: string;
          car_id: string;
          created_at: string | null;
          google_calendar_id: string;
          last_synced_at: string | null;
          owner_id: string | null;
          sync_enabled: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          calendar_description?: string | null;
          calendar_name: string;
          car_id: string;
          created_at?: string | null;
          google_calendar_id: string;
          last_synced_at?: string | null;
          owner_id?: string | null;
          sync_enabled?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          calendar_description?: string | null;
          calendar_name?: string;
          car_id?: string;
          created_at?: string | null;
          google_calendar_id?: string;
          last_synced_at?: string | null;
          owner_id?: string | null;
          sync_enabled?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'car_google_calendars_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_google_calendars_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_google_calendars_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      car_models: {
        Row: {
          brand_id: string | null;
          category: string | null;
          created_at: string | null;
          doors: number | null;
          id: string;
          name: string;
          seats: number | null;
          updated_at: string | null;
        };
        Insert: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          doors?: number | null;
          id?: string;
          name: string;
          seats?: number | null;
          updated_at?: string | null;
        };
        Update: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          doors?: number | null;
          id?: string;
          name?: string;
          seats?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'car_models_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'car_brands';
            referencedColumns: ['id'];
          },
        ];
      };
      car_photos: {
        Row: {
          car_id: string;
          created_at: string;
          id: string;
          is_cover: boolean;
          position: number;
          sort_order: number;
          stored_path: string;
          url: string;
        };
        Insert: {
          car_id: string;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          position?: number;
          sort_order?: number;
          stored_path: string;
          url: string;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          id?: string;
          is_cover?: boolean;
          position?: number;
          sort_order?: number;
          stored_path?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      cars: {
        Row: {
          auto_approval: boolean | null;
          brand: string | null;
          brand_id: string | null;
          brand_text_backup: string | null;
          category_id: string | null;
          city: string;
          color: string | null;
          country: string;
          created_at: string;
          currency: string;
          custom_daily_rate_pct: number | null;
          deleted_at: string | null;
          delivery_options: Json | null;
          deposit_amount: number | null;
          deposit_required: boolean | null;
          description: string | null;
          doors: number | null;
          estimated_value_usd: number | null;
          features: Json | null;
          fipe_code: string | null;
          fipe_last_sync: string | null;
          fuel: string | null;
          fuel_type: string | null;
          id: string;
          insurance_included: boolean | null;
          location_city: string | null;
          location_country: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_neighborhood: string | null;
          location_postal_code: string | null;
          location_province: string | null;
          location_state: string | null;
          location_street: string | null;
          location_street_number: string | null;
          max_rental_days: number | null;
          mileage: number | null;
          min_rental_days: number | null;
          model: string | null;
          model_id: string | null;
          model_text_backup: string | null;
          owner_id: string;
          payment_methods: Json | null;
          plate: string | null;
          price_per_day: number;
          price_per_day_cents: number | null;
          province: string;
          rating_avg: number | null;
          rating_count: number | null;
          region_id: string | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'];
          terms_and_conditions: string | null;
          title: string;
          transmission: string | null;
          updated_at: string;
          uses_dynamic_pricing: boolean | null;
          value_ars: number | null;
          value_auto_sync_enabled: boolean | null;
          value_brl: number | null;
          value_usd: number | null;
          value_usd_source: string | null;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          auto_approval?: boolean | null;
          brand?: string | null;
          brand_id?: string | null;
          brand_text_backup?: string | null;
          category_id?: string | null;
          city: string;
          color?: string | null;
          country?: string;
          created_at?: string;
          currency?: string;
          custom_daily_rate_pct?: number | null;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          estimated_value_usd?: number | null;
          features?: Json | null;
          fipe_code?: string | null;
          fipe_last_sync?: string | null;
          fuel?: string | null;
          fuel_type?: string | null;
          id?: string;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_neighborhood?: string | null;
          location_postal_code?: string | null;
          location_province?: string | null;
          location_state?: string | null;
          location_street?: string | null;
          location_street_number?: string | null;
          max_rental_days?: number | null;
          mileage?: number | null;
          min_rental_days?: number | null;
          model?: string | null;
          model_id?: string | null;
          model_text_backup?: string | null;
          owner_id: string;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day: number;
          price_per_day_cents?: number | null;
          province: string;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'];
          terms_and_conditions?: string | null;
          title: string;
          transmission?: string | null;
          updated_at?: string;
          uses_dynamic_pricing?: boolean | null;
          value_ars?: number | null;
          value_auto_sync_enabled?: boolean | null;
          value_brl?: number | null;
          value_usd?: number | null;
          value_usd_source?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          auto_approval?: boolean | null;
          brand?: string | null;
          brand_id?: string | null;
          brand_text_backup?: string | null;
          category_id?: string | null;
          city?: string;
          color?: string | null;
          country?: string;
          created_at?: string;
          currency?: string;
          custom_daily_rate_pct?: number | null;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          estimated_value_usd?: number | null;
          features?: Json | null;
          fipe_code?: string | null;
          fipe_last_sync?: string | null;
          fuel?: string | null;
          fuel_type?: string | null;
          id?: string;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_neighborhood?: string | null;
          location_postal_code?: string | null;
          location_province?: string | null;
          location_state?: string | null;
          location_street?: string | null;
          location_street_number?: string | null;
          max_rental_days?: number | null;
          mileage?: number | null;
          min_rental_days?: number | null;
          model?: string | null;
          model_id?: string | null;
          model_text_backup?: string | null;
          owner_id?: string;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day?: number;
          price_per_day_cents?: number | null;
          province?: string;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'];
          terms_and_conditions?: string | null;
          title?: string;
          transmission?: string | null;
          updated_at?: string;
          uses_dynamic_pricing?: boolean | null;
          value_ars?: number | null;
          value_auto_sync_enabled?: boolean | null;
          value_brl?: number | null;
          value_usd?: number | null;
          value_usd_source?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_decrypted';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      conversion_events: {
        Row: {
          car_id: string | null;
          created_at: string;
          event_data: Json | null;
          event_type: string;
          id: string;
          user_id: string | null;
        };
        Insert: {
          car_id?: string | null;
          created_at?: string;
          event_data?: Json | null;
          event_type: string;
          id?: string;
          user_id?: string | null;
        };
        Update: {
          car_id?: string | null;
          created_at?: string;
          event_data?: Json | null;
          event_type?: string;
          id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversion_events_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversion_events_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversion_events_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      driver_class_history: {
        Row: {
          booking_id: string | null;
          claim_id: string | null;
          class_change: number;
          created_at: string | null;
          id: string;
          new_class: number;
          notes: string | null;
          old_class: number;
          reason: string;
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          claim_id?: string | null;
          class_change: number;
          created_at?: string | null;
          id?: string;
          new_class: number;
          notes?: string | null;
          old_class: number;
          reason: string;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          claim_id?: string | null;
          class_change?: number;
          created_at?: string | null;
          id?: string;
          new_class?: number;
          notes?: string | null;
          old_class?: number;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_class_history_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_class_history_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_class_history_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_class_history_claim_id_fkey';
            columns: ['claim_id'];
            isOneToOne: false;
            referencedRelation: 'booking_claims';
            referencedColumns: ['id'];
          },
        ];
      };
      driver_protection_addons: {
        Row: {
          addon_type: string;
          claims_used: number | null;
          created_at: string | null;
          currency: string;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          max_protected_claims: number | null;
          price_paid_cents: number;
          protection_level: number | null;
          purchase_date: string | null;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          addon_type: string;
          claims_used?: number | null;
          created_at?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_protected_claims?: number | null;
          price_paid_cents: number;
          protection_level?: number | null;
          purchase_date?: string | null;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          addon_type?: string;
          claims_used?: number | null;
          created_at?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_protected_claims?: number | null;
          price_paid_cents?: number;
          protection_level?: number | null;
          purchase_date?: string | null;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      driver_risk_profile: {
        Row: {
          claims_with_fault: number | null;
          class: number;
          clean_bookings: number | null;
          created_at: string | null;
          driver_score: number | null;
          good_years: number | null;
          last_claim_at: string | null;
          last_claim_with_fault: boolean | null;
          last_class_update: string | null;
          total_bookings: number | null;
          total_claims: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          claims_with_fault?: number | null;
          class?: number;
          clean_bookings?: number | null;
          created_at?: string | null;
          driver_score?: number | null;
          good_years?: number | null;
          last_claim_at?: string | null;
          last_claim_with_fault?: boolean | null;
          last_class_update?: string | null;
          total_bookings?: number | null;
          total_claims?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          claims_with_fault?: number | null;
          class?: number;
          clean_bookings?: number | null;
          created_at?: string | null;
          driver_score?: number | null;
          good_years?: number | null;
          last_claim_at?: string | null;
          last_claim_with_fault?: boolean | null;
          last_class_update?: string | null;
          total_bookings?: number | null;
          total_claims?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      driver_score_snapshots: {
        Row: {
          average_score: number;
          class_distribution: Json;
          created_at: string | null;
          id: string;
          snapshot_date: string;
          total_drivers: number;
        };
        Insert: {
          average_score: number;
          class_distribution: Json;
          created_at?: string | null;
          id?: string;
          snapshot_date: string;
          total_drivers: number;
        };
        Update: {
          average_score?: number;
          class_distribution?: Json;
          created_at?: string | null;
          id?: string;
          snapshot_date?: string;
          total_drivers?: number;
        };
        Relationships: [];
      };
      driver_telemetry: {
        Row: {
          booking_id: string | null;
          created_at: string | null;
          driver_score: number | null;
          hard_brakes: number | null;
          id: string;
          night_driving_hours: number | null;
          risk_zones_visited: number | null;
          speed_violations: number | null;
          telemetry_data: Json | null;
          total_km: number | null;
          trip_date: string | null;
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string | null;
          driver_score?: number | null;
          hard_brakes?: number | null;
          id?: string;
          night_driving_hours?: number | null;
          risk_zones_visited?: number | null;
          speed_violations?: number | null;
          telemetry_data?: Json | null;
          total_km?: number | null;
          trip_date?: string | null;
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string | null;
          driver_score?: number | null;
          hard_brakes?: number | null;
          id?: string;
          night_driving_hours?: number | null;
          risk_zones_visited?: number | null;
          speed_violations?: number | null;
          telemetry_data?: Json | null;
          total_km?: number | null;
          trip_date?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'driver_telemetry_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_telemetry_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'driver_telemetry_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      encryption_audit_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          operation: string;
          success: boolean;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          operation: string;
          success: boolean;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          operation?: string;
          success?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'encryption_audit_log_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'encryption_audit_log_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages_decrypted';
            referencedColumns: ['id'];
          },
        ];
      };
      encryption_keys: {
        Row: {
          algorithm: string;
          created_at: string;
          id: string;
          is_active: boolean;
          key: string;
          rotated_at: string | null;
        };
        Insert: {
          algorithm?: string;
          created_at?: string;
          id: string;
          is_active?: boolean;
          key: string;
          rotated_at?: string | null;
        };
        Update: {
          algorithm?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          key?: string;
          rotated_at?: string | null;
        };
        Relationships: [];
      };
      exchange_rate_sync_log: {
        Row: {
          binance_rate: number | null;
          created_at: string;
          error_message: string | null;
          execution_time_ms: number | null;
          id: string;
          pair: string;
          platform_rate: number | null;
          success: boolean;
          sync_method: string;
          synced_at: string;
        };
        Insert: {
          binance_rate?: number | null;
          created_at?: string;
          error_message?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          pair: string;
          platform_rate?: number | null;
          success: boolean;
          sync_method: string;
          synced_at?: string;
        };
        Update: {
          binance_rate?: number | null;
          created_at?: string;
          error_message?: string | null;
          execution_time_ms?: number | null;
          id?: string;
          pair?: string;
          platform_rate?: number | null;
          success?: boolean;
          sync_method?: string;
          synced_at?: string;
        };
        Relationships: [];
      };
      exchange_rates: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          last_updated: string;
          pair: string;
          rate: number;
          source: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_updated?: string;
          pair: string;
          rate: number;
          source?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          last_updated?: string;
          pair?: string;
          rate?: number;
          source?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fgo_metrics: {
        Row: {
          alpha_percentage: number;
          avg_recovery_rate: number | null;
          coverage_ratio: number | null;
          id: boolean;
          last_calculated_at: string;
          loss_ratio: number | null;
          lr_365d: number | null;
          lr_90d: number | null;
          meta: Json;
          pem_cents: number | null;
          pem_window_days: number | null;
          status: string;
          target_balance_cents: number | null;
          target_months_coverage: number;
          total_contributions_cents: number;
          total_events_90d: number | null;
          total_siniestros_count: number;
          total_siniestros_paid_cents: number;
          updated_at: string;
        };
        Insert: {
          alpha_percentage?: number;
          avg_recovery_rate?: number | null;
          coverage_ratio?: number | null;
          id?: boolean;
          last_calculated_at?: string;
          loss_ratio?: number | null;
          lr_365d?: number | null;
          lr_90d?: number | null;
          meta?: Json;
          pem_cents?: number | null;
          pem_window_days?: number | null;
          status?: string;
          target_balance_cents?: number | null;
          target_months_coverage?: number;
          total_contributions_cents?: number;
          total_events_90d?: number | null;
          total_siniestros_count?: number;
          total_siniestros_paid_cents?: number;
          updated_at?: string;
        };
        Update: {
          alpha_percentage?: number;
          avg_recovery_rate?: number | null;
          coverage_ratio?: number | null;
          id?: boolean;
          last_calculated_at?: string;
          loss_ratio?: number | null;
          lr_365d?: number | null;
          lr_90d?: number | null;
          meta?: Json;
          pem_cents?: number | null;
          pem_window_days?: number | null;
          status?: string;
          target_balance_cents?: number | null;
          target_months_coverage?: number;
          total_contributions_cents?: number;
          total_events_90d?: number | null;
          total_siniestros_count?: number;
          total_siniestros_paid_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fgo_parameters: {
        Row: {
          alpha: number;
          alpha_max: number;
          alpha_min: number;
          bucket: string;
          country_code: string;
          event_cap_usd: number;
          id: string;
          loss_ratio_target: number;
          monthly_payout_cap: number;
          per_user_limit: number;
          rc_floor: number;
          rc_hard_floor: number;
          rc_soft_ceiling: number;
          updated_at: string;
        };
        Insert: {
          alpha?: number;
          alpha_max?: number;
          alpha_min?: number;
          bucket: string;
          country_code: string;
          event_cap_usd?: number;
          id?: string;
          loss_ratio_target?: number;
          monthly_payout_cap?: number;
          per_user_limit?: number;
          rc_floor?: number;
          rc_hard_floor?: number;
          rc_soft_ceiling?: number;
          updated_at?: string;
        };
        Update: {
          alpha?: number;
          alpha_max?: number;
          alpha_min?: number;
          bucket?: string;
          country_code?: string;
          event_cap_usd?: number;
          id?: string;
          loss_ratio_target?: number;
          monthly_payout_cap?: number;
          per_user_limit?: number;
          rc_floor?: number;
          rc_hard_floor?: number;
          rc_soft_ceiling?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fgo_subfunds: {
        Row: {
          balance_cents: number;
          created_at: string;
          id: string;
          meta: Json;
          subfund_type: string;
          updated_at: string;
        };
        Insert: {
          balance_cents?: number;
          created_at?: string;
          id?: string;
          meta?: Json;
          subfund_type: string;
          updated_at?: string;
        };
        Update: {
          balance_cents?: number;
          created_at?: string;
          id?: string;
          meta?: Json;
          subfund_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fx_rates: {
        Row: {
          created_at: string;
          from_currency: string;
          id: string;
          is_active: boolean;
          metadata: Json | null;
          rate: number;
          source: string | null;
          source_reference: string | null;
          to_currency: string;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          from_currency: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json | null;
          rate: number;
          source?: string | null;
          source_reference?: string | null;
          to_currency: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          from_currency?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json | null;
          rate?: number;
          source?: string | null;
          source_reference?: string | null;
          to_currency?: string;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      google_calendar_tokens: {
        Row: {
          access_token: string;
          connected_at: string | null;
          created_at: string | null;
          expires_at: string;
          last_synced_at: string | null;
          primary_calendar_id: string | null;
          refresh_token: string;
          scope: string;
          sync_enabled: boolean | null;
          token_type: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          access_token: string;
          connected_at?: string | null;
          created_at?: string | null;
          expires_at: string;
          last_synced_at?: string | null;
          primary_calendar_id?: string | null;
          refresh_token: string;
          scope: string;
          sync_enabled?: boolean | null;
          token_type?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string;
          connected_at?: string | null;
          created_at?: string | null;
          expires_at?: string;
          last_synced_at?: string | null;
          primary_calendar_id?: string | null;
          refresh_token?: string;
          scope?: string;
          sync_enabled?: boolean | null;
          token_type?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          booking_id: string | null;
          car_id: string | null;
          created_at: string;
          delivered_at: string | null;
          id: string;
          read_at: string | null;
          recipient_id: string;
          sender_id: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          booking_id?: string | null;
          car_id?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          sender_id: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          booking_id?: string | null;
          car_id?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          sender_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      monitoring_alerts: {
        Row: {
          alert_type: string;
          created_at: string;
          id: string;
          message: string;
          metadata: Json | null;
          resolved_at: string | null;
          severity: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          alert_type: string;
          created_at?: string;
          id?: string;
          message: string;
          metadata?: Json | null;
          resolved_at?: string | null;
          severity: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          alert_type?: string;
          created_at?: string;
          id?: string;
          message?: string;
          metadata?: Json | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      monitoring_performance_metrics: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json | null;
          metric_name: string;
          metric_unit: string;
          metric_value: number;
          recorded_at: string;
          resource_name: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          metric_name: string;
          metric_unit: string;
          metric_value: number;
          recorded_at?: string;
          resource_name?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          metric_name?: string;
          metric_unit?: string;
          metric_value?: number;
          recorded_at?: string;
          resource_name?: string | null;
        };
        Relationships: [];
      };
      mp_webhook_logs: {
        Row: {
          booking_id: string | null;
          id: string;
          ip_address: unknown;
          payload: Json;
          payment_id: string | null;
          processed: boolean | null;
          processed_at: string | null;
          processing_error: string | null;
          received_at: string | null;
          resource_id: string | null;
          resource_type: string | null;
          split_id: string | null;
          user_agent: string | null;
          webhook_type: string;
        };
        Insert: {
          booking_id?: string | null;
          id?: string;
          ip_address?: unknown;
          payload: Json;
          payment_id?: string | null;
          processed?: boolean | null;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          split_id?: string | null;
          user_agent?: string | null;
          webhook_type: string;
        };
        Update: {
          booking_id?: string | null;
          id?: string;
          ip_address?: unknown;
          payload?: Json;
          payment_id?: string | null;
          processed?: boolean | null;
          processed_at?: string | null;
          processing_error?: string | null;
          received_at?: string | null;
          resource_id?: string | null;
          resource_type?: string | null;
          split_id?: string | null;
          user_agent?: string | null;
          webhook_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mp_webhook_logs_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mp_webhook_logs_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mp_webhook_logs_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mp_webhook_logs_split_id_fkey';
            columns: ['split_id'];
            isOneToOne: false;
            referencedRelation: 'payment_splits';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          cta_link: string | null;
          id: string;
          is_read: boolean;
          metadata: Json | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          cta_link?: string | null;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          cta_link?: string | null;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [];
      };
      outbound_requests: {
        Row: {
          body: Json | null;
          created_at: string;
          endpoint: string;
          error: string | null;
          headers: Json | null;
          id: string;
          method: string;
          response_body: Json | null;
          response_status: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          body?: Json | null;
          created_at?: string;
          endpoint: string;
          error?: string | null;
          headers?: Json | null;
          id?: string;
          method?: string;
          response_body?: Json | null;
          response_status?: number | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          body?: Json | null;
          created_at?: string;
          endpoint?: string;
          error?: string | null;
          headers?: Json | null;
          id?: string;
          method?: string;
          response_body?: Json | null;
          response_status?: number | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_intents: {
        Row: {
          amount: number;
          amount_authorized_cents: number | null;
          amount_captured_cents: number | null;
          authorized_at: string | null;
          booking_id: string;
          canceled_at: string | null;
          capture: boolean | null;
          captured_at: string | null;
          card_last4: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          metadata: Json | null;
          payment_method_id: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_intent_id: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          amount_authorized_cents?: number | null;
          amount_captured_cents?: number | null;
          authorized_at?: string | null;
          booking_id: string;
          canceled_at?: string | null;
          capture?: boolean | null;
          captured_at?: string | null;
          card_last4?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json | null;
          payment_method_id?: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_intent_id?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          amount_authorized_cents?: number | null;
          amount_captured_cents?: number | null;
          authorized_at?: string | null;
          booking_id?: string;
          canceled_at?: string | null;
          capture?: boolean | null;
          captured_at?: string | null;
          card_last4?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json | null;
          payment_method_id?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_intent_id?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_issues: {
        Row: {
          booking_id: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
          issue_type: string;
          payment_id: string | null;
          priority: number | null;
          resolution_notes: string | null;
          resolved: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string | null;
          updated_at: string | null;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          issue_type: string;
          payment_id?: string | null;
          priority?: number | null;
          resolution_notes?: string | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          issue_type?: string;
          payment_id?: string | null;
          priority?: number | null;
          resolution_notes?: string | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_splits: {
        Row: {
          booking_id: string;
          collector_id: string;
          created_at: string | null;
          currency: string;
          id: string;
          marketplace_id: string | null;
          metadata: Json | null;
          owner_amount_cents: number;
          payment_id: string;
          platform_fee_cents: number;
          status: string | null;
          total_amount_cents: number;
          transferred_at: string | null;
          updated_at: string | null;
          validated_at: string | null;
        };
        Insert: {
          booking_id: string;
          collector_id: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          marketplace_id?: string | null;
          metadata?: Json | null;
          owner_amount_cents: number;
          payment_id: string;
          platform_fee_cents: number;
          status?: string | null;
          total_amount_cents: number;
          transferred_at?: string | null;
          updated_at?: string | null;
          validated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          collector_id?: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          marketplace_id?: string | null;
          metadata?: Json | null;
          owner_amount_cents?: number;
          payment_id?: string;
          platform_fee_cents?: number;
          status?: string | null;
          total_amount_cents?: number;
          transferred_at?: string | null;
          updated_at?: string | null;
          validated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          amount_authorized_cents: number | null;
          amount_captured_cents: number | null;
          authorized_at: string | null;
          booking_id: string;
          canceled_at: string | null;
          captured_at: string | null;
          card_last4: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          is_hold: boolean | null;
          metadata: Json | null;
          payment_intent_id: string | null;
          payment_method_id: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_payment_id: string | null;
          status: Database['public']['Enums']['payment_status'];
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          amount_authorized_cents?: number | null;
          amount_captured_cents?: number | null;
          authorized_at?: string | null;
          booking_id: string;
          canceled_at?: string | null;
          captured_at?: string | null;
          card_last4?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          is_hold?: boolean | null;
          metadata?: Json | null;
          payment_intent_id?: string | null;
          payment_method_id?: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_payment_id?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          amount_authorized_cents?: number | null;
          amount_captured_cents?: number | null;
          authorized_at?: string | null;
          booking_id?: string;
          canceled_at?: string | null;
          captured_at?: string | null;
          card_last4?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          is_hold?: boolean | null;
          metadata?: Json | null;
          payment_intent_id?: string | null;
          payment_method_id?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_payment_id?: string | null;
          status?: Database['public']['Enums']['payment_status'];
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_payment_intent_id_fkey';
            columns: ['payment_intent_id'];
            isOneToOne: false;
            referencedRelation: 'payment_intents';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_config: {
        Row: {
          category: string | null;
          created_at: string | null;
          data_type: string;
          description: string | null;
          is_public: boolean | null;
          key: string;
          updated_at: string | null;
          value: Json;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          data_type: string;
          description?: string | null;
          is_public?: boolean | null;
          key: string;
          updated_at?: string | null;
          value: Json;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          data_type?: string;
          description?: string | null;
          is_public?: boolean | null;
          key?: string;
          updated_at?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      pricing_calculations: {
        Row: {
          base_price: number;
          booking_id: string | null;
          calculation_details: Json | null;
          created_at: string | null;
          day_factor: number;
          demand_factor: number;
          event_factor: number;
          final_price: number;
          hour_factor: number;
          id: string;
          region_id: string | null;
          user_factor: number;
          user_id: string | null;
        };
        Insert: {
          base_price: number;
          booking_id?: string | null;
          calculation_details?: Json | null;
          created_at?: string | null;
          day_factor: number;
          demand_factor: number;
          event_factor?: number;
          final_price: number;
          hour_factor: number;
          id?: string;
          region_id?: string | null;
          user_factor: number;
          user_id?: string | null;
        };
        Update: {
          base_price?: number;
          booking_id?: string | null;
          calculation_details?: Json | null;
          created_at?: string | null;
          day_factor?: number;
          demand_factor?: number;
          event_factor?: number;
          final_price?: number;
          hour_factor?: number;
          id?: string;
          region_id?: string | null;
          user_factor?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_calculations_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_class_factors: {
        Row: {
          class: number;
          created_at: string | null;
          description: string | null;
          fee_multiplier: number;
          guarantee_multiplier: number;
          is_active: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          class: number;
          created_at?: string | null;
          description?: string | null;
          fee_multiplier: number;
          guarantee_multiplier: number;
          is_active?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          class?: number;
          created_at?: string | null;
          description?: string | null;
          fee_multiplier?: number;
          guarantee_multiplier?: number;
          is_active?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pricing_cron_health: {
        Row: {
          created_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          id: string;
          job_name: string;
          last_run_at: string;
          regions_updated: number | null;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          job_name: string;
          last_run_at?: string;
          regions_updated?: number | null;
          status: string;
        };
        Update: {
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          id?: string;
          job_name?: string;
          last_run_at?: string;
          regions_updated?: number | null;
          status?: string;
        };
        Relationships: [];
      };
      pricing_day_factors: {
        Row: {
          created_at: string | null;
          day_of_week: number;
          factor: number;
          id: string;
          region_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          day_of_week: number;
          factor?: number;
          id?: string;
          region_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          day_of_week?: number;
          factor?: number;
          id?: string;
          region_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_day_factors_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_demand_snapshots: {
        Row: {
          active_bookings: number;
          created_at: string | null;
          demand_ratio: number;
          id: string;
          price_multiplier: number;
          region: string;
          surge_factor: number | null;
          total_cars: number;
        };
        Insert: {
          active_bookings: number;
          created_at?: string | null;
          demand_ratio: number;
          id?: string;
          price_multiplier: number;
          region: string;
          surge_factor?: number | null;
          total_cars: number;
        };
        Update: {
          active_bookings?: number;
          created_at?: string | null;
          demand_ratio?: number;
          id?: string;
          price_multiplier?: number;
          region?: string;
          surge_factor?: number | null;
          total_cars?: number;
        };
        Relationships: [];
      };
      pricing_hour_factors: {
        Row: {
          created_at: string | null;
          description: string | null;
          factor: number;
          hour_end: number;
          hour_start: number;
          id: string;
          region_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          factor?: number;
          hour_end: number;
          hour_start: number;
          id?: string;
          region_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          factor?: number;
          hour_end?: number;
          hour_start?: number;
          id?: string;
          region_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_hour_factors_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_regions: {
        Row: {
          active: boolean | null;
          base_price_per_hour: number;
          country_code: string;
          created_at: string | null;
          currency: string;
          fuel_cost_multiplier: number | null;
          id: string;
          inflation_rate: number | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          base_price_per_hour: number;
          country_code: string;
          created_at?: string | null;
          currency: string;
          fuel_cost_multiplier?: number | null;
          id?: string;
          inflation_rate?: number | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          base_price_per_hour?: number;
          country_code?: string;
          created_at?: string | null;
          currency?: string;
          fuel_cost_multiplier?: number | null;
          id?: string;
          inflation_rate?: number | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      pricing_special_events: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          end_date: string;
          factor: number;
          id: string;
          name: string;
          region_id: string | null;
          start_date: string;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          end_date: string;
          factor?: number;
          id?: string;
          name: string;
          region_id?: string | null;
          start_date: string;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          end_date?: string;
          factor?: number;
          id?: string;
          name?: string;
          region_id?: string | null;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_special_events_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_user_factors: {
        Row: {
          created_at: string | null;
          description: string | null;
          factor: number;
          id: string;
          min_rentals: number | null;
          user_type: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          factor?: number;
          id?: string;
          min_rentals?: number | null;
          user_type: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          factor?: number;
          id?: string;
          min_rentals?: number | null;
          user_type?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address_line1_encrypted: string | null;
          address_line2_encrypted: string | null;
          avatar_url: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          dni_encrypted: string | null;
          driver_license_number_encrypted: string | null;
          email: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          gov_id_number_encrypted: string | null;
          home_latitude: number | null;
          home_longitude: number | null;
          id: string;
          id_verified: boolean | null;
          is_admin: boolean | null;
          location_verified_at: string | null;
          mercadopago_collector_id: string | null;
          mp_onboarding_completed: boolean | null;
          mp_onboarding_url: string | null;
          phone: string | null;
          phone_encrypted: string | null;
          phone_verified: boolean | null;
          postal_code_encrypted: string | null;
          preferred_search_radius_km: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: string | null;
          updated_at: string | null;
          whatsapp_encrypted: string | null;
        };
        Insert: {
          address_line1_encrypted?: string | null;
          address_line2_encrypted?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          dni_encrypted?: string | null;
          driver_license_number_encrypted?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number_encrypted?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          id: string;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          location_verified_at?: string | null;
          mercadopago_collector_id?: string | null;
          mp_onboarding_completed?: boolean | null;
          mp_onboarding_url?: string | null;
          phone?: string | null;
          phone_encrypted?: string | null;
          phone_verified?: boolean | null;
          postal_code_encrypted?: string | null;
          preferred_search_radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: string | null;
          updated_at?: string | null;
          whatsapp_encrypted?: string | null;
        };
        Update: {
          address_line1_encrypted?: string | null;
          address_line2_encrypted?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          dni_encrypted?: string | null;
          driver_license_number_encrypted?: string | null;
          email?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number_encrypted?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          id?: string;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          location_verified_at?: string | null;
          mercadopago_collector_id?: string | null;
          mp_onboarding_completed?: boolean | null;
          mp_onboarding_url?: string | null;
          phone?: string | null;
          phone_encrypted?: string | null;
          phone_verified?: boolean | null;
          postal_code_encrypted?: string | null;
          preferred_search_radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: string | null;
          updated_at?: string | null;
          whatsapp_encrypted?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string;
          id: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      referral_codes: {
        Row: {
          code: string;
          created_at: string;
          current_uses: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_uses: number | null;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          current_uses?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          current_uses?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_uses?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      referral_rewards: {
        Row: {
          admin_notes: string | null;
          amount_cents: number;
          approved_at: string | null;
          created_at: string;
          currency: string;
          expires_at: string | null;
          id: string;
          notes: string | null;
          paid_at: string | null;
          referral_id: string;
          reward_type: string;
          status: string;
          user_id: string;
          wallet_transaction_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          amount_cents: number;
          approved_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          notes?: string | null;
          paid_at?: string | null;
          referral_id: string;
          reward_type: string;
          status?: string;
          user_id: string;
          wallet_transaction_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          amount_cents?: number;
          approved_at?: string | null;
          created_at?: string;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          notes?: string | null;
          paid_at?: string | null;
          referral_id?: string;
          reward_type?: string;
          status?: string;
          user_id?: string;
          wallet_transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'referral_rewards_referral_id_fkey';
            columns: ['referral_id'];
            isOneToOne: false;
            referencedRelation: 'referrals';
            referencedColumns: ['id'];
          },
        ];
      };
      referrals: {
        Row: {
          first_booking_at: string | null;
          first_car_at: string | null;
          id: string;
          referral_code_id: string;
          referred_id: string;
          referrer_id: string;
          registered_at: string;
          reward_paid_at: string | null;
          source: string | null;
          status: string;
          utm_campaign: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          verified_at: string | null;
        };
        Insert: {
          first_booking_at?: string | null;
          first_car_at?: string | null;
          id?: string;
          referral_code_id: string;
          referred_id: string;
          referrer_id: string;
          registered_at?: string;
          reward_paid_at?: string | null;
          source?: string | null;
          status?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          verified_at?: string | null;
        };
        Update: {
          first_booking_at?: string | null;
          first_car_at?: string | null;
          id?: string;
          referral_code_id?: string;
          referred_id?: string;
          referrer_id?: string;
          registered_at?: string;
          reward_paid_at?: string | null;
          source?: string | null;
          status?: string;
          utm_campaign?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'referrals_referral_code_id_fkey';
            columns: ['referral_code_id'];
            isOneToOne: false;
            referencedRelation: 'referral_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      reviews: {
        Row: {
          booking_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          is_car_review: boolean;
          is_renter_review: boolean;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
          updated_at: string;
        };
        Insert: {
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_car_review?: boolean;
          is_renter_review?: boolean;
          rating: number;
          reviewee_id: string;
          reviewer_id: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_car_review?: boolean;
          is_renter_review?: boolean;
          rating?: number;
          reviewee_id?: string;
          reviewer_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      system_flags: {
        Row: {
          key: string;
          updated_at: string | null;
          value: Json | null;
        };
        Insert: {
          key: string;
          updated_at?: string | null;
          value?: Json | null;
        };
        Update: {
          key?: string;
          updated_at?: string | null;
          value?: Json | null;
        };
        Relationships: [];
      };
      user_documents: {
        Row: {
          created_at: string;
          id: number;
          kind: Database['public']['Enums']['document_kind'];
          notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database['public']['Enums']['kyc_status'];
          storage_path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          kind: Database['public']['Enums']['document_kind'];
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['kyc_status'];
          storage_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          kind?: Database['public']['Enums']['document_kind'];
          notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database['public']['Enums']['kyc_status'];
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_identity_levels: {
        Row: {
          created_at: string | null;
          current_level: number | null;
          driver_license_verified_at: string | null;
          email_verified_at: string | null;
          id_verified_at: string | null;
          phone_verified_at: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          current_level?: number | null;
          driver_license_verified_at?: string | null;
          email_verified_at?: string | null;
          id_verified_at?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          current_level?: number | null;
          driver_license_verified_at?: string | null;
          email_verified_at?: string | null;
          id_verified_at?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_verifications: {
        Row: {
          created_at: string;
          metadata: Json | null;
          missing_docs: Json;
          notes: string | null;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          metadata?: Json | null;
          missing_docs?: Json;
          notes?: string | null;
          role: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          metadata?: Json | null;
          missing_docs?: Json;
          notes?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_categories: {
        Row: {
          active: boolean;
          base_daily_rate_pct: number;
          code: string;
          created_at: string;
          depreciation_rate_annual: number;
          description: string | null;
          display_order: number;
          id: string;
          name: string;
          name_es: string | null;
          surge_sensitivity: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          base_daily_rate_pct?: number;
          code: string;
          created_at?: string;
          depreciation_rate_annual?: number;
          description?: string | null;
          display_order?: number;
          id?: string;
          name: string;
          name_es?: string | null;
          surge_sensitivity?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          base_daily_rate_pct?: number;
          code?: string;
          created_at?: string;
          depreciation_rate_annual?: number;
          description?: string | null;
          display_order?: number;
          id?: string;
          name?: string;
          name_es?: string | null;
          surge_sensitivity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_model_equivalents: {
        Row: {
          active: boolean;
          brand: string;
          confidence_level: string;
          created_at: string;
          id: string;
          model_argentina: string;
          model_brazil: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          brand: string;
          confidence_level?: string;
          created_at?: string;
          id?: string;
          model_argentina: string;
          model_brazil: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          brand?: string;
          confidence_level?: string;
          created_at?: string;
          id?: string;
          model_argentina?: string;
          model_brazil?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicle_pricing_models: {
        Row: {
          active: boolean;
          base_value_usd: number;
          brand: string;
          category_id: string;
          confidence_level: string;
          created_at: string;
          data_source: string;
          id: string;
          last_updated: string;
          model: string;
          notes: string | null;
          updated_at: string;
          year_from: number;
          year_to: number;
        };
        Insert: {
          active?: boolean;
          base_value_usd: number;
          brand: string;
          category_id: string;
          confidence_level?: string;
          created_at?: string;
          data_source?: string;
          id?: string;
          last_updated?: string;
          model: string;
          notes?: string | null;
          updated_at?: string;
          year_from: number;
          year_to: number;
        };
        Update: {
          active?: boolean;
          base_value_usd?: number;
          brand?: string;
          category_id?: string;
          confidence_level?: string;
          created_at?: string;
          data_source?: string;
          id?: string;
          last_updated?: string;
          model?: string;
          notes?: string | null;
          updated_at?: string;
          year_from?: number;
          year_to?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_pricing_models_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_audit_log: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          transaction_id: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          transaction_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          transaction_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      wallet_split_config: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          custom_fee_percent: number | null;
          id: string;
          locador_id: string | null;
          platform_fee_percent: number;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          custom_fee_percent?: number | null;
          id?: string;
          locador_id?: string | null;
          platform_fee_percent?: number;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          custom_fee_percent?: number | null;
          id?: string;
          locador_id?: string | null;
          platform_fee_percent?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      wallet_transaction_backups: {
        Row: {
          backup_date: string;
          created_at: string | null;
          data_snapshot: Json | null;
          id: string;
          total_transactions: number | null;
          total_volume: number | null;
        };
        Insert: {
          backup_date: string;
          created_at?: string | null;
          data_snapshot?: Json | null;
          id?: string;
          total_transactions?: number | null;
          total_volume?: number | null;
        };
        Update: {
          backup_date?: string;
          created_at?: string | null;
          data_snapshot?: Json | null;
          id?: string;
          total_transactions?: number | null;
          total_volume?: number | null;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          bank_account_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          currency: string;
          id: string;
          processed_at: string | null;
          rejection_reason: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          bank_account_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          id?: string;
          processed_at?: string | null;
          rejection_reason?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          bank_account_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          id?: string;
          processed_at?: string | null;
          rejection_reason?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'withdrawal_requests_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'withdrawal_requests_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts_decrypted';
            referencedColumns: ['id'];
          },
        ];
      };
      withdrawal_transactions: {
        Row: {
          amount: number;
          created_at: string | null;
          currency: string;
          error_message: string | null;
          id: string;
          mercadopago_transfer_id: string | null;
          metadata: Json | null;
          request_id: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          currency?: string;
          error_message?: string | null;
          id?: string;
          mercadopago_transfer_id?: string | null;
          metadata?: Json | null;
          request_id: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          currency?: string;
          error_message?: string | null;
          id?: string;
          mercadopago_transfer_id?: string | null;
          metadata?: Json | null;
          request_id?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'withdrawal_transactions_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: false;
            referencedRelation: 'withdrawal_requests';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      accounting_provisions_report: {
        Row: {
          created_at: string | null;
          current_balance: number | null;
          id: string | null;
          notes: string | null;
          provision_amount: number | null;
          provision_date: string | null;
          provision_type: string | null;
          reference_id: string | null;
          reference_table: string | null;
          release_date: string | null;
          released_amount: number | null;
          status: string | null;
          utilized_amount: number | null;
        };
        Relationships: [];
      };
      bank_accounts_decrypted: {
        Row: {
          account_holder_id: string | null;
          account_holder_name: string | null;
          account_number: string | null;
          account_type: string | null;
          alias: string | null;
          bank_code: string | null;
          bank_name: string | null;
          cbu: string | null;
          created_at: string | null;
          id: string | null;
          is_default: boolean | null;
          updated_at: string | null;
          user_id: string | null;
          verified: boolean | null;
          verified_at: string | null;
        };
        Insert: {
          account_holder_id?: string | null;
          account_holder_name?: string | null;
          account_number?: never;
          account_type?: string | null;
          alias?: never;
          bank_code?: string | null;
          bank_name?: never;
          cbu?: never;
          created_at?: string | null;
          id?: string | null;
          is_default?: boolean | null;
          updated_at?: string | null;
          user_id?: string | null;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Update: {
          account_holder_id?: string | null;
          account_holder_name?: string | null;
          account_number?: never;
          account_type?: string | null;
          alias?: never;
          bank_code?: string | null;
          bank_name?: never;
          cbu?: never;
          created_at?: string | null;
          id?: string | null;
          is_default?: boolean | null;
          updated_at?: string | null;
          user_id?: string | null;
          verified?: boolean | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      cars_multi_currency: {
        Row: {
          brand_text_backup: string | null;
          fipe_code: string | null;
          fipe_last_sync: string | null;
          id: string | null;
          implied_brl_usd_rate: number | null;
          implied_usd_ars_rate: number | null;
          location_country: string | null;
          model_text_backup: string | null;
          value_ars: number | null;
          value_brl: number | null;
          value_usd: number | null;
          value_usd_source: string | null;
          year: number | null;
        };
        Insert: {
          brand_text_backup?: string | null;
          fipe_code?: string | null;
          fipe_last_sync?: string | null;
          id?: string | null;
          implied_brl_usd_rate?: never;
          implied_usd_ars_rate?: never;
          location_country?: string | null;
          model_text_backup?: string | null;
          value_ars?: number | null;
          value_brl?: number | null;
          value_usd?: number | null;
          value_usd_source?: string | null;
          year?: number | null;
        };
        Update: {
          brand_text_backup?: string | null;
          fipe_code?: string | null;
          fipe_last_sync?: string | null;
          id?: string | null;
          implied_brl_usd_rate?: never;
          implied_usd_ars_rate?: never;
          location_country?: string | null;
          model_text_backup?: string | null;
          value_ars?: number | null;
          value_brl?: number | null;
          value_usd?: number | null;
          value_usd_source?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      me_profile: {
        Row: {
          avatar_url: string | null;
          can_book_cars: boolean | null;
          can_publish_cars: boolean | null;
          created_at: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          id: string | null;
          id_verified: boolean | null;
          is_admin: boolean | null;
          phone: string | null;
          phone_verified: boolean | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          can_book_cars?: never;
          can_publish_cars?: never;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          can_book_cars?: never;
          can_publish_cars?: never;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      messages_decrypted: {
        Row: {
          body: string | null;
          body_encrypted: string | null;
          booking_id: string | null;
          car_id: string | null;
          created_at: string | null;
          delivered_at: string | null;
          id: string | null;
          read_at: string | null;
          recipient_id: string | null;
          sender_id: string | null;
        };
        Insert: {
          body?: never;
          body_encrypted?: string | null;
          booking_id?: string | null;
          car_id?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          id?: string | null;
          read_at?: string | null;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          body?: never;
          body_encrypted?: string | null;
          booking_id?: string | null;
          car_id?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          id?: string | null;
          read_at?: string | null;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      my_bookings: {
        Row: {
          authorized_payment_id: string | null;
          breakdown: Json | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_brand: string | null;
          car_city: string | null;
          car_id: string | null;
          car_model: string | null;
          car_province: string | null;
          car_title: string | null;
          car_year: number | null;
          coverage_upgrade: string | null;
          created_at: string | null;
          currency: string | null;
          days_count: number | null;
          delivery_distance_km: number | null;
          delivery_fee_cents: number | null;
          delivery_required: boolean | null;
          discounts_cents: number | null;
          distance_risk_tier: string | null;
          dropoff_location_lat: number | null;
          dropoff_location_lng: number | null;
          end_at: string | null;
          expires_at: string | null;
          fees_cents: number | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string | null;
          idempotency_key: string | null;
          insurance_cents: number | null;
          main_photo_url: string | null;
          nightly_rate_cents: number | null;
          owner_payment_amount: number | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_init_point: string | null;
          payment_mode: string | null;
          payment_preference_id: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          payment_status: Database['public']['Enums']['payment_status'] | null;
          pickup_location_lat: number | null;
          pickup_location_lng: number | null;
          platform_fee: number | null;
          provider_collector_id: string | null;
          provider_split_payment_id: string | null;
          reauthorization_count: number | null;
          renter_id: string | null;
          requires_revalidation: boolean | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          subtotal_cents: number | null;
          total_amount: number | null;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string | null;
          wallet_lock_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_intents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fk_bookings_risk_snapshot';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      owner_bookings: {
        Row: {
          authorized_payment_id: string | null;
          breakdown: Json | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_brand: string | null;
          car_id: string | null;
          car_model: string | null;
          car_title: string | null;
          coverage_upgrade: string | null;
          created_at: string | null;
          currency: string | null;
          days_count: number | null;
          delivery_distance_km: number | null;
          delivery_fee_cents: number | null;
          delivery_required: boolean | null;
          discounts_cents: number | null;
          distance_risk_tier: string | null;
          dropoff_location_lat: number | null;
          dropoff_location_lng: number | null;
          end_at: string | null;
          expires_at: string | null;
          fees_cents: number | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string | null;
          idempotency_key: string | null;
          insurance_cents: number | null;
          nightly_rate_cents: number | null;
          owner_payment_amount: number | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_init_point: string | null;
          payment_mode: string | null;
          payment_preference_id: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          payment_status: Database['public']['Enums']['payment_status'] | null;
          pickup_location_lat: number | null;
          pickup_location_lng: number | null;
          platform_fee: number | null;
          provider_collector_id: string | null;
          provider_split_payment_id: string | null;
          reauthorization_count: number | null;
          renter_avatar: string | null;
          renter_id: string | null;
          renter_name: string | null;
          requires_revalidation: boolean | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          subtotal_cents: number | null;
          total_amount: number | null;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string | null;
          wallet_lock_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_intents';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_multi_currency';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fk_bookings_risk_snapshot';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      profiles_decrypted: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          home_latitude: number | null;
          home_longitude: number | null;
          id: string | null;
          id_verified: boolean | null;
          is_admin: boolean | null;
          location_verified_at: string | null;
          phone: string | null;
          phone_verified: boolean | null;
          preferred_search_radius_km: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          location_verified_at?: string | null;
          phone?: never;
          phone_verified?: boolean | null;
          preferred_search_radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          home_latitude?: number | null;
          home_longitude?: number | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          location_verified_at?: string | null;
          phone?: never;
          phone_verified?: boolean | null;
          preferred_search_radius_km?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          id: string | null;
          id_verified: boolean | null;
          is_admin: boolean | null;
          mercadopago_collector_id: string | null;
          mp_onboarding_completed: boolean | null;
          mp_onboarding_url: string | null;
          phone: string | null;
          phone_verified: boolean | null;
          role: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          mercadopago_collector_id?: string | null;
          mp_onboarding_completed?: boolean | null;
          mp_onboarding_url?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          mercadopago_collector_id?: string | null;
          mp_onboarding_completed?: boolean | null;
          mp_onboarding_url?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      v_cars_with_main_photo: {
        Row: {
          auto_approval: boolean | null;
          brand: string | null;
          brand_id: string | null;
          brand_text_backup: string | null;
          city: string | null;
          color: string | null;
          country: string | null;
          created_at: string | null;
          currency: string | null;
          deleted_at: string | null;
          delivery_options: Json | null;
          deposit_amount: number | null;
          deposit_required: boolean | null;
          description: string | null;
          doors: number | null;
          features: Json | null;
          fuel: string | null;
          fuel_type: string | null;
          id: string | null;
          insurance_included: boolean | null;
          location_city: string | null;
          location_country: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_neighborhood: string | null;
          location_postal_code: string | null;
          location_province: string | null;
          location_state: string | null;
          location_street: string | null;
          location_street_number: string | null;
          main_photo_url: string | null;
          max_rental_days: number | null;
          mileage: number | null;
          min_rental_days: number | null;
          model: string | null;
          model_id: string | null;
          model_text_backup: string | null;
          owner_id: string | null;
          payment_methods: Json | null;
          plate: string | null;
          price_per_day: number | null;
          province: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          terms_and_conditions: string | null;
          title: string | null;
          transmission: string | null;
          updated_at: string | null;
          value_usd: number | null;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          auto_approval?: boolean | null;
          brand?: string | null;
          brand_id?: string | null;
          brand_text_backup?: string | null;
          city?: string | null;
          color?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: string | null;
          fuel_type?: string | null;
          id?: string | null;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_neighborhood?: string | null;
          location_postal_code?: string | null;
          location_province?: string | null;
          location_state?: string | null;
          location_street?: string | null;
          location_street_number?: string | null;
          main_photo_url?: never;
          max_rental_days?: number | null;
          mileage?: number | null;
          min_rental_days?: number | null;
          model?: string | null;
          model_id?: string | null;
          model_text_backup?: string | null;
          owner_id?: string | null;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day?: number | null;
          province?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          terms_and_conditions?: string | null;
          title?: string | null;
          transmission?: string | null;
          updated_at?: string | null;
          value_usd?: number | null;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          auto_approval?: boolean | null;
          brand?: string | null;
          brand_id?: string | null;
          brand_text_backup?: string | null;
          city?: string | null;
          color?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: string | null;
          fuel_type?: string | null;
          id?: string | null;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_neighborhood?: string | null;
          location_postal_code?: string | null;
          location_province?: string | null;
          location_state?: string | null;
          location_street?: string | null;
          location_street_number?: string | null;
          main_photo_url?: never;
          max_rental_days?: number | null;
          mileage?: number | null;
          min_rental_days?: number | null;
          model?: string | null;
          model_id?: string | null;
          model_text_backup?: string | null;
          owner_id?: string | null;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day?: number | null;
          province?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          terms_and_conditions?: string | null;
          title?: string | null;
          transmission?: string | null;
          updated_at?: string | null;
          value_usd?: number | null;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles_decrypted';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      v_fgo_parameters_summary: {
        Row: {
          alpha_pct: number | null;
          bucket: string | null;
          country_code: string | null;
          event_cap_usd: number | null;
          monthly_cap_pct: number | null;
          per_user_limit: number | null;
          rc_floor: number | null;
          rc_hard_floor: number | null;
          rc_soft_ceiling: number | null;
          updated_at: string | null;
        };
        Insert: {
          alpha_pct?: never;
          bucket?: string | null;
          country_code?: string | null;
          event_cap_usd?: number | null;
          monthly_cap_pct?: never;
          per_user_limit?: number | null;
          rc_floor?: number | null;
          rc_hard_floor?: number | null;
          rc_soft_ceiling?: number | null;
          updated_at?: string | null;
        };
        Update: {
          alpha_pct?: never;
          bucket?: string | null;
          country_code?: string | null;
          event_cap_usd?: number | null;
          monthly_cap_pct?: never;
          per_user_limit?: number | null;
          rc_floor?: number | null;
          rc_hard_floor?: number | null;
          rc_soft_ceiling?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      v_fgo_status: {
        Row: {
          alpha_percentage: number | null;
          capitalization_balance_cents: number | null;
          coverage_ratio: number | null;
          last_calculated_at: string | null;
          liquidity_balance_cents: number | null;
          loss_ratio: number | null;
          profitability_balance_cents: number | null;
          status: string | null;
          target_balance_cents: number | null;
          target_months_coverage: number | null;
          total_contributions_cents: number | null;
          total_fgo_balance_cents: number | null;
          total_siniestros_count: number | null;
          total_siniestros_paid_cents: number | null;
          updated_at: string | null;
        };
        Insert: {
          alpha_percentage?: number | null;
          capitalization_balance_cents?: never;
          coverage_ratio?: number | null;
          last_calculated_at?: string | null;
          liquidity_balance_cents?: never;
          loss_ratio?: number | null;
          profitability_balance_cents?: never;
          status?: string | null;
          target_balance_cents?: number | null;
          target_months_coverage?: number | null;
          total_contributions_cents?: number | null;
          total_fgo_balance_cents?: never;
          total_siniestros_count?: number | null;
          total_siniestros_paid_cents?: number | null;
          updated_at?: string | null;
        };
        Update: {
          alpha_percentage?: number | null;
          capitalization_balance_cents?: never;
          coverage_ratio?: number | null;
          last_calculated_at?: string | null;
          liquidity_balance_cents?: never;
          loss_ratio?: number | null;
          profitability_balance_cents?: never;
          status?: string | null;
          target_balance_cents?: number | null;
          target_months_coverage?: number | null;
          total_contributions_cents?: number | null;
          total_fgo_balance_cents?: never;
          total_siniestros_count?: number | null;
          total_siniestros_paid_cents?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      v_fgo_status_v1_1: {
        Row: {
          alpha_percentage: number | null;
          avg_recovery_rate: number | null;
          capitalization_balance_cents: number | null;
          coverage_ratio: number | null;
          last_calculated_at: string | null;
          liquidity_balance_cents: number | null;
          loss_ratio: number | null;
          lr_365d: number | null;
          lr_90d: number | null;
          pem_cents: number | null;
          profitability_balance_cents: number | null;
          status: string | null;
          target_balance_cents: number | null;
          target_months_coverage: number | null;
          total_contributions_cents: number | null;
          total_events_90d: number | null;
          total_fgo_balance_cents: number | null;
          total_siniestros_count: number | null;
          total_siniestros_paid_cents: number | null;
          updated_at: string | null;
        };
        Insert: {
          alpha_percentage?: number | null;
          avg_recovery_rate?: number | null;
          capitalization_balance_cents?: never;
          coverage_ratio?: number | null;
          last_calculated_at?: string | null;
          liquidity_balance_cents?: never;
          loss_ratio?: number | null;
          lr_365d?: number | null;
          lr_90d?: number | null;
          pem_cents?: number | null;
          profitability_balance_cents?: never;
          status?: string | null;
          target_balance_cents?: number | null;
          target_months_coverage?: number | null;
          total_contributions_cents?: number | null;
          total_events_90d?: number | null;
          total_fgo_balance_cents?: never;
          total_siniestros_count?: number | null;
          total_siniestros_paid_cents?: number | null;
          updated_at?: string | null;
        };
        Update: {
          alpha_percentage?: number | null;
          avg_recovery_rate?: number | null;
          capitalization_balance_cents?: never;
          coverage_ratio?: number | null;
          last_calculated_at?: string | null;
          liquidity_balance_cents?: never;
          loss_ratio?: number | null;
          lr_365d?: number | null;
          lr_90d?: number | null;
          pem_cents?: number | null;
          profitability_balance_cents?: never;
          status?: string | null;
          target_balance_cents?: number | null;
          target_months_coverage?: number | null;
          total_contributions_cents?: number | null;
          total_events_90d?: number | null;
          total_fgo_balance_cents?: never;
          total_siniestros_count?: number | null;
          total_siniestros_paid_cents?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      v_fx_rates_current: {
        Row: {
          age: unknown;
          from_currency: string | null;
          id: string | null;
          is_expired: boolean | null;
          metadata: Json | null;
          rate: number | null;
          snapshot_timestamp: string | null;
          source: string | null;
          to_currency: string | null;
        };
        Insert: {
          age?: never;
          from_currency?: string | null;
          id?: string | null;
          is_expired?: never;
          metadata?: Json | null;
          rate?: number | null;
          snapshot_timestamp?: string | null;
          source?: string | null;
          to_currency?: string | null;
        };
        Update: {
          age?: never;
          from_currency?: string | null;
          id?: string | null;
          is_expired?: never;
          metadata?: Json | null;
          rate?: number | null;
          snapshot_timestamp?: string | null;
          source?: string | null;
          to_currency?: string | null;
        };
        Relationships: [];
      };
      v_wallet_history: {
        Row: {
          amount_cents: number | null;
          booking_id: string | null;
          currency: string | null;
          id: string | null;
          metadata: Json | null;
          source_system: string | null;
          status: string | null;
          transaction_date: string | null;
          transaction_type: string | null;
          user_id: string | null;
        };
        Insert: {
          amount_cents?: never;
          booking_id?: string | null;
          currency?: never;
          id?: string | null;
          metadata?: never;
          source_system?: never;
          status?: never;
          transaction_date?: string | null;
          transaction_type?: never;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: never;
          booking_id?: string | null;
          currency?: never;
          id?: string | null;
          metadata?: never;
          source_system?: never;
          status?: never;
          transaction_date?: string | null;
          transaction_type?: never;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      account_bonus_protector_sale: {
        Args: {
          p_addon_id: string;
          p_price_cents: number;
          p_protection_level: number;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      account_protection_credit_breakage: {
        Args: {
          p_expired_cents: number;
          p_reason: string;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      account_protection_credit_consumption: {
        Args: {
          p_claim_id: string;
          p_consumed_cents: number;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      account_protection_credit_issuance: {
        Args: {
          p_amount_cents: number;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      account_protection_credit_renewal: {
        Args: {
          p_amount_cents: number;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
      accounting_auto_audit: { Args: never; Returns: Json };
      accounting_balance_sheet: {
        Args: { p_date?: string };
        Returns: {
          account_code: string;
          account_name: string;
          account_type: string;
          balance: number;
        }[];
      };
      accounting_daily_closure: { Args: never; Returns: Json };
      accounting_income_statement: {
        Args: { p_end_date: string; p_start_date: string };
        Returns: {
          account_code: string;
          account_name: string;
          account_type: string;
          amount: number;
        }[];
      };
      accounting_monthly_closure: { Args: never; Returns: Json };
      accounting_verify_wallet_liabilities: { Args: never; Returns: undefined };
      add_bank_account_with_encryption: {
        Args: {
          p_account_holder_id?: string;
          p_account_holder_name?: string;
          p_account_number: string;
          p_account_type: string;
          p_alias: string;
          p_bank_code?: string;
          p_bank_name?: string;
          p_cbu: string;
        };
        Returns: string;
      };
      add_to_waitlist: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: {
          car_id: string;
          created_at: string;
          end_date: string;
          expires_at: string;
          id: string;
          notified_at: string | null;
          start_date: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'booking_waitlist';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      adjust_alpha_dynamic: {
        Args: { p_bucket?: string; p_country_code?: string };
        Returns: Json;
      };
      admin_get_refund_requests: {
        Args: { p_limit?: number; p_offset?: number; p_status?: string };
        Returns: {
          admin_notes: string;
          approved_at: string;
          booking_id: string;
          booking_total: number;
          car_title: string;
          created_at: string;
          currency: string;
          destination: string;
          id: string;
          processed_at: string;
          refund_amount: number;
          rejection_reason: string;
          status: string;
          user_email: string;
          user_id: string;
          user_name: string;
        }[];
      };
      apply_referral_code: {
        Args: { p_code: string; p_referred_user_id: string; p_source?: string };
        Returns: string;
      };
      calculate_age: { Args: { birth_date: string }; Returns: number };
      calculate_batch_dynamic_prices: {
        Args: {
          p_region_ids: string[];
          p_rental_hours: number;
          p_rental_start: string;
          p_user_id: string;
        };
        Returns: Json[];
      };
      calculate_distance_based_pricing: {
        Args: { p_base_guarantee_usd?: number; p_distance_km: number };
        Returns: Json;
      };
      calculate_distance_km: {
        Args: { p_lat1: number; p_lat2: number; p_lng1: number; p_lng2: number };
        Returns: number;
      };
      calculate_dynamic_price: {
        Args: {
          p_region_id: string;
          p_rental_hours: number;
          p_rental_start: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      calculate_fgo_metrics: { Args: never; Returns: Json };
      calculate_payment_split: {
        Args: { p_platform_fee_percent?: number; p_total_amount: number };
        Returns: {
          owner_amount: number;
          platform_fee: number;
          platform_fee_percent: number;
          total_amount: number;
        }[];
      };
      calculate_pem: {
        Args: {
          p_bucket?: string;
          p_country_code?: string;
          p_window_days?: number;
        };
        Returns: {
          avg_event_cents: number;
          bucket: string;
          country_code: string;
          event_count: number;
          pem_cents: number;
          total_paid_cents: number;
          total_recovered_cents: number;
        }[];
      };
      calculate_rc_v1_1: {
        Args: { p_bucket?: string; p_country_code?: string };
        Returns: Json;
      };
      calculate_suggested_daily_rate: {
        Args: { p_category_id: string; p_country?: string; p_value_usd: number };
        Returns: Json;
      };
      calculate_telemetry_score: {
        Args: { p_booking_id: string; p_user_id: string };
        Returns: number;
      };
      calculate_trip_score: {
        Args: {
          p_hard_brakes: number;
          p_night_driving_hours: number;
          p_risk_zones_visited: number;
          p_speed_violations: number;
          p_total_km: number;
        };
        Returns: number;
      };
      cancel_payment_authorization: {
        Args: { p_payment_id: string };
        Returns: {
          canceled_at: string;
          message: string;
          success: boolean;
        }[];
      };
      cancel_preauth: { Args: { p_intent_id: string }; Returns: undefined };
      capture_payment_authorization: {
        Args: { p_amount_cents: number; p_payment_id: string };
        Returns: {
          captured_amount_cents: number;
          captured_at: string;
          message: string;
          success: boolean;
        }[];
      };
      capture_preauth: {
        Args: { p_amount: number; p_intent_id: string };
        Returns: undefined;
      };
      check_car_availability: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: boolean;
      };
      check_mercadopago_connection: { Args: never; Returns: Json };
      check_snapshot_revalidation: {
        Args: { p_booking_id: string };
        Returns: {
          days_since_snapshot: number;
          new_fx: number;
          old_fx: number;
          reason: string;
          requires_revalidation: boolean;
        }[];
      };
      check_user_pending_deposits_limit: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      cleanup_expired_waitlist: {
        Args: never;
        Returns: {
          expired_count: number;
        }[];
      };
      cleanup_old_pending_deposits: {
        Args: never;
        Returns: {
          cleaned_count: number;
          message: string;
        }[];
      };
      close_accounting_period: {
        Args: { p_period: string };
        Returns: undefined;
      };
      complete_payment_split: {
        Args: {
          p_mercadopago_payment_id: string;
          p_split_id: string;
          p_webhook_data?: Json;
        };
        Returns: boolean;
      };
      complete_referral_milestone: {
        Args: { p_milestone: string; p_referred_user_id: string };
        Returns: boolean;
      };
      compute_fee_with_class: {
        Args: {
          p_base_fee_cents: number;
          p_telematic_score?: number;
          p_user_id: string;
        };
        Returns: number;
      };
      compute_guarantee_with_class: {
        Args: {
          p_base_guarantee_cents: number;
          p_has_card?: boolean;
          p_user_id: string;
        };
        Returns: number;
      };
      config_get_boolean: { Args: { p_key: string }; Returns: boolean };
      config_get_json: { Args: { p_key: string }; Returns: Json };
      config_get_number: { Args: { p_key: string }; Returns: number };
      config_get_public: {
        Args: never;
        Returns: {
          category: string;
          data_type: string;
          description: string;
          key: string;
          value: Json;
        }[];
      };
      config_get_string: { Args: { p_key: string }; Returns: string };
      config_update: {
        Args: { p_key: string; p_value: Json };
        Returns: {
          category: string | null;
          created_at: string | null;
          data_type: string;
          description: string | null;
          is_public: boolean | null;
          key: string;
          updated_at: string | null;
          value: Json;
        };
        SetofOptions: {
          from: '*';
          to: 'platform_config';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      connect_mercadopago: {
        Args: {
          p_access_token: string;
          p_account_type?: string;
          p_collector_id: string;
          p_country?: string;
          p_expires_at: string;
          p_public_key: string;
          p_refresh_token: string;
          p_site_id?: string;
        };
        Returns: Json;
      };
      consume_autorentar_credit_for_claim: {
        Args: {
          p_booking_id: string;
          p_claim_amount_cents: number;
          p_claim_id?: string;
          p_user_id: string;
        };
        Returns: {
          autorentar_credit_used_cents: number;
          message: string;
          new_autorentar_credit_balance: number;
          new_wallet_balance: number;
          remaining_claim_cents: number;
          success: boolean;
          wallet_balance_used_cents: number;
        }[];
      };
      consume_protection_credit_for_claim: {
        Args: {
          p_booking_id: string;
          p_claim_amount_cents: number;
          p_user_id: string;
        };
        Returns: {
          cp_used_cents: number;
          remaining_claim_cents: number;
          wr_used_cents: number;
        }[];
      };
      create_journal_entry: {
        Args: {
          p_description: string;
          p_entries: Json;
          p_reference_id: string;
          p_reference_table: string;
          p_transaction_type: string;
        };
        Returns: string;
      };
      create_payment_authorization: {
        Args: {
          p_amount_ars?: number;
          p_amount_usd?: number;
          p_booking_id?: string;
          p_description?: string;
          p_external_reference?: string;
          p_fx_rate?: number;
          p_user_id: string;
        };
        Returns: Json;
      };
      decrypt_message: { Args: { ciphertext: string }; Returns: string };
      decrypt_pii: { Args: { ciphertext: string }; Returns: string };
      disconnect_mercadopago: { Args: never; Returns: Json };
      encrypt_message: { Args: { plaintext: string }; Returns: string };
      encrypt_pii: { Args: { plaintext: string }; Returns: string };
      estimate_vehicle_value_usd: {
        Args: { p_brand: string; p_model: string; p_year: number };
        Returns: {
          category_id: string;
          confidence_level: string;
          data_source: string;
          estimated_value: number;
        }[];
      };
      expire_pending_bookings: {
        Args: never;
        Returns: {
          expired_count: number;
        }[];
      };
      extend_autorentar_credit_for_good_history: {
        Args: { p_user_id: string };
        Returns: {
          expires_at: string;
          message: string;
          new_balance_cents: number;
          renewed: boolean;
          success: boolean;
        }[];
      };
      extend_protection_credit_for_good_history: {
        Args: { p_user_id: string };
        Returns: {
          eligible: boolean;
          new_expires_at: string;
          reason: string;
          renewed_amount_cents: number;
          renewed_amount_usd: number;
        }[];
      };
      fgo_assess_eligibility: {
        Args: { p_booking_id: string; p_claim_amount_cents: number };
        Returns: Json;
      };
      fgo_contribute_from_deposit: {
        Args: {
          p_deposit_amount_cents: number;
          p_ref?: string;
          p_user_id: string;
          p_wallet_ledger_id?: string;
        };
        Returns: Json;
      };
      fgo_execute_waterfall: {
        Args: {
          p_booking_id: string;
          p_description: string;
          p_evidence_url?: string;
          p_total_claim_cents: number;
        };
        Returns: Json;
      };
      fgo_pay_siniestro: {
        Args: {
          p_amount_cents: number;
          p_booking_id: string;
          p_description: string;
          p_ref?: string;
        };
        Returns: Json;
      };
      fgo_transfer_between_subfunds: {
        Args: {
          p_admin_id: string;
          p_amount_cents: number;
          p_from_subfund: string;
          p_reason: string;
          p_to_subfund: string;
        };
        Returns: Json;
      };
      find_brazil_model_equivalent: {
        Args: { p_brand: string; p_model_argentina: string };
        Returns: {
          confidence: string;
          model_brazil: string;
        }[];
      };
      fx_rate_needs_revalidation: {
        Args: {
          p_max_age_days?: number;
          p_new_rate?: number;
          p_old_rate?: number;
          p_rate_timestamp: string;
          p_variation_threshold?: number;
        };
        Returns: {
          needs_revalidation: boolean;
          reason: string;
        }[];
      };
      generate_referral_code: { Args: { p_user_id: string }; Returns: string };
      get_active_calendar_token: {
        Args: { user_uuid: string };
        Returns: {
          access_token: string;
          expires_at: string;
          refresh_token: string;
        }[];
      };
      get_available_cars: {
        Args: {
          p_end_date: string;
          p_limit?: number;
          p_offset?: number;
          p_start_date: string;
        };
        Returns: {
          avg_rating: number;
          brand: string;
          created_at: string;
          currency: string;
          features: Json;
          id: string;
          images: string[];
          location: Json;
          model: string;
          owner_id: string;
          plate: string;
          price_per_day: number;
          status: string;
          total_bookings: number;
          updated_at: string;
          year: number;
        }[];
      };
      get_booking_distance: { Args: { p_booking_id: string }; Returns: number };
      get_car_blocked_dates: {
        Args: { p_car_id: string; p_end_date?: string; p_start_date?: string };
        Returns: {
          booking_id: string;
          end_date: string;
          start_date: string;
          status: Database['public']['Enums']['booking_status'];
        }[];
      };
      get_car_conversation_participants: {
        Args: { p_car_id: string; p_user_id: string };
        Returns: {
          last_message_at: string;
          unread_count: number;
          user_id: string;
        }[];
      };
      get_car_price_in_currency: {
        Args: { p_car_id: string; p_currency?: string };
        Returns: number;
      };
      get_cars_within_radius: {
        Args: {
          p_end_date?: string;
          p_limit?: number;
          p_offset?: number;
          p_radius_km: number;
          p_start_date?: string;
          p_user_lat: number;
          p_user_lng: number;
        };
        Returns: {
          avg_rating: number;
          brand_text_backup: string;
          currency: string;
          distance_km: number;
          id: string;
          location_city: string;
          location_formatted_address: string;
          location_lat: number;
          location_lng: number;
          location_state: string;
          model_text_backup: string;
          owner_id: string;
          photos_count: number;
          price_per_day: number;
          status: string;
          title: string;
          value_usd: number;
          year: number;
        }[];
      };
      get_class_benefits: {
        Args: { p_class: number };
        Returns: {
          class: number;
          description: string;
          fee_discount_pct: number;
          fee_multiplier: number;
          guarantee_discount_pct: number;
          guarantee_multiplier: number;
          is_discount: boolean;
        }[];
      };
      get_conversation_messages: {
        Args: {
          p_booking_id?: string;
          p_car_id?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          body: string;
          booking_id: string;
          car_id: string;
          created_at: string;
          delivered_at: string;
          id: string;
          read_at: string;
          recipient_id: string;
          sender_id: string;
          updated_at: string;
        }[];
      };
      get_conversion_stats: {
        Args: {
          p_car_id?: string;
          p_event_type?: string;
          p_from_date?: string;
          p_to_date?: string;
        };
        Returns: {
          event_count: number;
          event_type: string;
          first_event: string;
          last_event: string;
          unique_users: number;
        }[];
      };
      get_current_fx_rate: {
        Args: { p_from_currency: string; p_to_currency: string };
        Returns: number;
      };
      get_driver_profile: {
        Args: { p_user_id: string };
        Returns: {
          claims_with_fault: number;
          class: number;
          class_description: string;
          created_at: string;
          driver_score: number;
          fee_multiplier: number;
          good_years: number;
          guarantee_multiplier: number;
          last_claim_at: string;
          last_claim_with_fault: boolean;
          last_class_update: string;
          total_claims: number;
          updated_at: string;
          user_id: string;
        }[];
      };
      get_driver_telemetry_average: {
        Args: { p_months?: number; p_user_id: string };
        Returns: {
          avg_score: number;
          period_end: string;
          period_start: string;
          total_hard_brakes: number;
          total_km: number;
          total_night_hours: number;
          total_risk_zones: number;
          total_speed_violations: number;
          total_trips: number;
        }[];
      };
      get_effective_daily_rate_pct: {
        Args: { p_car_id: string };
        Returns: number;
      };
      get_effective_vehicle_value: {
        Args: { p_car_id: string };
        Returns: number;
      };
      get_expiring_holds: {
        Args: { p_hours_ahead?: number };
        Returns: {
          booking_id: string;
          hold_authorization_id: string;
          hold_expires_at: string;
          hours_until_expiry: number;
        }[];
      };
      get_marketplace_approved_owners: {
        Args: never;
        Returns: {
          approved_at: string;
          collector_id: string;
          email: string;
          full_name: string;
          total_bookings: number;
          total_earnings: number;
          user_id: string;
        }[];
      };
      get_my_profile_decrypted: { Args: never; Returns: Json };
      get_my_waitlist: {
        Args: never;
        Returns: {
          car_brand: string;
          car_id: string;
          car_model: string;
          created_at: string;
          end_date: string;
          id: string;
          notified_at: string;
          start_date: string;
          status: string;
        }[];
      };
      get_next_available_date: {
        Args: { p_car_id: string; p_min_days?: number; p_start_date?: string };
        Returns: string;
      };
      get_telemetry_history: {
        Args: { p_limit?: number; p_user_id: string };
        Returns: {
          booking_id: string;
          car_brand: string;
          car_model: string;
          car_title: string;
          driver_score: number;
          hard_brakes: number;
          night_driving_hours: number;
          risk_zones_visited: number;
          speed_violations: number;
          telemetry_id: string;
          total_km: number;
          trip_date: string;
        }[];
      };
      get_telemetry_insights: {
        Args: { p_user_id: string };
        Returns: {
          current_score: number;
          main_issue: string;
          recommendation: string;
          score_trend: string;
          trips_analyzed: number;
        }[];
      };
      get_unread_messages_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_user_conversations: {
        Args: { user_id: string };
        Returns: {
          booking_id: string;
          car_brand: string;
          car_id: string;
          car_model: string;
          car_year: number;
          conversation_id: string;
          last_message: string;
          last_message_at: string;
          other_user_avatar: string;
          other_user_id: string;
          other_user_name: string;
          unread_count: number;
        }[];
      };
      get_user_public_stats: { Args: { target_user_id: string }; Returns: Json };
      get_verification_progress: { Args: never; Returns: Json };
      get_waitlist_count: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: number;
      };
      improve_driver_class_annual: {
        Args: never;
        Returns: {
          good_years: number;
          new_class: number;
          old_class: number;
          user_id: string;
        }[];
      };
      initialize_driver_profile: {
        Args: { p_user_id: string };
        Returns: string;
      };
      is_at_least_18: { Args: { birth_date: string }; Returns: boolean };
      is_car_available: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: boolean;
      };
      is_car_owner: { Args: { p_car_id: string }; Returns: boolean };
      is_google_calendar_connected: {
        Args: { user_uuid: string };
        Returns: boolean;
      };
      issue_autorentar_credit: {
        Args: { p_amount_cents?: number; p_user_id: string };
        Returns: {
          credit_balance_cents: number;
          expires_at: string;
          issued_at: string;
          message: string;
          success: boolean;
        }[];
      };
      issue_protection_credit: {
        Args: {
          p_amount_cents?: number;
          p_user_id: string;
          p_validity_days?: number;
        };
        Returns: {
          expires_at: string;
          issued_amount_cents: number;
          issued_amount_usd: number;
        }[];
      };
      lock_price_for_booking: {
        Args: {
          p_car_id: string;
          p_rental_hours: number;
          p_rental_start: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      mark_conversation_as_read: {
        Args: { p_booking_id?: string; p_car_id?: string; p_user_id?: string };
        Returns: number;
      };
      monitoring_check_database_metrics: { Args: never; Returns: undefined };
      monitoring_create_alert: {
        Args: {
          p_alert_type: string;
          p_message: string;
          p_metadata?: Json;
          p_severity: string;
          p_title: string;
        };
        Returns: string;
      };
      populate_car_estimates: { Args: { p_car_id: string }; Returns: undefined };
      preview_booking_pricing: {
        Args: {
          p_car_id: string;
          p_end_at: string;
          p_has_card?: boolean;
          p_start_at: string;
          p_user_id: string;
        };
        Returns: {
          adjusted_fee_cents: number;
          adjusted_guarantee_cents: number;
          base_fee_cents: number;
          base_guarantee_cents: number;
          base_price_cents: number;
          car_id: string;
          currency: string;
          days: number;
          driver_class: number;
          driver_score: number;
          fee_discount_pct: number;
          guarantee_discount_pct: number;
          total_amount_cents: number;
          user_id: string;
        }[];
      };
      pricing_recalculate: {
        Args: { p_booking_id: string };
        Returns: {
          authorized_payment_id: string | null;
          breakdown: Json | null;
          calendar_sync_enabled: boolean | null;
          calendar_synced_at: string | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_id: string;
          coverage_upgrade: string | null;
          created_at: string;
          currency: string;
          days_count: number | null;
          delivery_distance_km: number | null;
          delivery_fee_cents: number | null;
          delivery_required: boolean | null;
          discounts_cents: number | null;
          distance_risk_tier: string | null;
          dropoff_location_lat: number | null;
          dropoff_location_lng: number | null;
          dynamic_price_snapshot: Json | null;
          end_at: string;
          expires_at: string | null;
          fees_cents: number | null;
          google_calendar_event_id: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          has_dynamic_pricing: boolean | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          insurance_cents: number | null;
          nightly_rate_cents: number | null;
          owner_payment_amount: number | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_init_point: string | null;
          payment_mode: string | null;
          payment_preference_id: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          pickup_location_lat: number | null;
          pickup_location_lng: number | null;
          platform_fee: number | null;
          price_lock_token: string | null;
          price_locked_until: string | null;
          provider_collector_id: string | null;
          provider_split_payment_id: string | null;
          reauthorization_count: number | null;
          renter_id: string;
          requires_revalidation: boolean | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          subtotal_cents: number | null;
          total_amount: number;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string;
          wallet_lock_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      process_split_payment: {
        Args: { p_booking_id: string; p_total_amount: number };
        Returns: {
          locador_amount: number;
          locador_transaction_id: string;
          platform_amount: number;
          platform_transaction_id: string;
          split_payment_id: string;
        }[];
      };
      process_withdrawal: {
        Args: { p_request_id: string; p_transfer_id: string };
        Returns: Json;
      };
      purchase_bonus_protector: {
        Args: { p_protection_level: number; p_user_id: string };
        Returns: {
          addon_id: string;
          expires_at: string;
          message: string;
          price_paid_cents: number;
          price_paid_usd: number;
          success: boolean;
        }[];
      };
      quote_booking: {
        Args: {
          p_car_id: string;
          p_delivery_required?: boolean;
          p_end: string;
          p_promo_code?: string;
          p_start: string;
          p_user_lat?: number;
          p_user_lng?: number;
        };
        Returns: Json;
      };
      recalculate_all_driver_scores: {
        Args: never;
        Returns: {
          avg_score_change: number;
          users_updated: number;
        }[];
      };
      recognize_autorentar_credit_breakage: {
        Args: { p_user_id: string };
        Returns: {
          breakage_amount_cents: number;
          message: string;
          reason: string;
          success: boolean;
        }[];
      };
      recognize_protection_credit_breakage: {
        Args: { p_user_id: string };
        Returns: {
          breakage_amount_cents: number;
          breakage_amount_usd: number;
        }[];
      };
      record_telemetry: {
        Args: { p_booking_id: string; p_telemetry_data: Json };
        Returns: string;
      };
      refresh_accounting_balances: { Args: never; Returns: undefined };
      register_payment_split:
        | {
            Args: {
              p_booking_id: string;
              p_mercadopago_payment_id?: string;
              p_owner_amount: number;
              p_owner_collector_id: string;
              p_payment_id: string;
              p_platform_fee: number;
              p_total_amount: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_booking_id: string;
              p_currency?: string;
              p_mp_payment_id: string;
              p_total_amount_cents: number;
            };
            Returns: string;
          };
      remove_from_waitlist: {
        Args: { p_waitlist_id: string };
        Returns: boolean;
      };
      request_booking:
        | {
            Args: {
              p_car_id: string;
              p_delivery_distance_km?: number;
              p_delivery_fee_cents?: number;
              p_delivery_required?: boolean;
              p_distance_risk_tier?: string;
              p_driver_age?: number;
              p_dropoff_lat?: number;
              p_dropoff_lng?: number;
              p_end: string;
              p_payment_method?: string;
              p_pickup_lat?: number;
              p_pickup_lng?: number;
              p_start: string;
              p_total_price?: number;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_car_id: string;
              p_delivery_required?: boolean;
              p_dropoff_lat?: number;
              p_dropoff_lng?: number;
              p_dynamic_price_snapshot?: Json;
              p_end: string;
              p_pickup_lat?: number;
              p_pickup_lng?: number;
              p_price_lock_token?: string;
              p_start: string;
              p_use_dynamic_pricing?: boolean;
            };
            Returns: {
              authorized_payment_id: string | null;
              breakdown: Json | null;
              calendar_sync_enabled: boolean | null;
              calendar_synced_at: string | null;
              cancellation_fee_cents: number | null;
              cancellation_policy_id: number | null;
              cancellation_reason: string | null;
              cancelled_at: string | null;
              car_id: string;
              coverage_upgrade: string | null;
              created_at: string;
              currency: string;
              days_count: number | null;
              delivery_distance_km: number | null;
              delivery_fee_cents: number | null;
              delivery_required: boolean | null;
              discounts_cents: number | null;
              distance_risk_tier: string | null;
              dropoff_location_lat: number | null;
              dropoff_location_lng: number | null;
              dynamic_price_snapshot: Json | null;
              end_at: string;
              expires_at: string | null;
              fees_cents: number | null;
              google_calendar_event_id: string | null;
              guarantee_amount_cents: number | null;
              guarantee_type: string | null;
              has_dynamic_pricing: boolean | null;
              hold_authorization_id: string | null;
              hold_expires_at: string | null;
              id: string;
              idempotency_key: string | null;
              insurance_cents: number | null;
              nightly_rate_cents: number | null;
              owner_payment_amount: number | null;
              paid_at: string | null;
              payment_id: string | null;
              payment_init_point: string | null;
              payment_mode: string | null;
              payment_preference_id: string | null;
              payment_provider: Database['public']['Enums']['payment_provider'] | null;
              payment_split_completed: boolean | null;
              payment_split_validated_at: string | null;
              pickup_location_lat: number | null;
              pickup_location_lng: number | null;
              platform_fee: number | null;
              price_lock_token: string | null;
              price_locked_until: string | null;
              provider_collector_id: string | null;
              provider_split_payment_id: string | null;
              reauthorization_count: number | null;
              renter_id: string;
              requires_revalidation: boolean | null;
              risk_snapshot_booking_id: string | null;
              risk_snapshot_date: string | null;
              start_at: string;
              status: Database['public']['Enums']['booking_status'];
              subtotal_cents: number | null;
              total_amount: number;
              total_cents: number | null;
              total_price_ars: number | null;
              updated_at: string;
              wallet_lock_id: string | null;
            };
            SetofOptions: {
              from: '*';
              to: 'bookings';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      rotate_encryption_key: { Args: never; Returns: string };
      send_encrypted_message: {
        Args: {
          p_body?: string;
          p_booking_id?: string;
          p_car_id?: string;
          p_recipient_id?: string;
        };
        Returns: string;
      };
      sync_binance_rates_direct: { Args: never; Returns: Json };
      sync_binance_rates_via_edge_function: { Args: never; Returns: undefined };
      transfer_profit_to_equity: {
        Args: { p_period: string };
        Returns: undefined;
      };
      update_all_demand_snapshots: { Args: never; Returns: undefined };
      update_demand_snapshot: {
        Args: { p_region_id: string };
        Returns: undefined;
      };
      update_driver_class_on_event: {
        Args: {
          p_claim_with_fault: boolean;
          p_severity?: number;
          p_user_id: string;
        };
        Returns: {
          class_change: number;
          new_class: number;
          old_class: number;
        }[];
      };
      update_payment_intent_status: {
        Args: {
          p_card_last4?: string;
          p_metadata?: Json;
          p_mp_payment_id: string;
          p_mp_status: string;
          p_mp_status_detail?: string;
          p_payment_method_id?: string;
        };
        Returns: Json;
      };
      update_profile_with_encryption: {
        Args: { p_updates: Json; p_user_id: string };
        Returns: Json;
      };
      validate_bonus_malus_migration: {
        Args: never;
        Returns: {
          check_name: string;
          details: string;
          passed: boolean;
        }[];
      };
      verify_accounting_integrity: {
        Args: never;
        Returns: {
          details: string;
          passed: boolean;
          test_name: string;
        }[];
      };
      verify_bank_account: {
        Args: { p_account_number: string; p_user_id: string };
        Returns: Json;
      };
      wallet_confirm_deposit_admin: {
        Args: {
          p_provider_metadata?: Json;
          p_provider_transaction_id: string;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: {
          message: string;
          new_available_balance: number;
          new_total_balance: number;
          new_withdrawable_balance: number;
          success: boolean;
        }[];
      };
      wallet_deposit_ledger: {
        Args: {
          p_amount_cents: number;
          p_meta?: Json;
          p_provider?: string;
          p_ref: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      wallet_get_balance: {
        Args: never;
        Returns: {
          available_balance: number;
          currency: string;
          locked_balance: number;
          non_withdrawable_balance: number;
          total_balance: number;
          withdrawable_balance: number;
        }[];
      };
    };
    Enums: {
      booking_status:
        | 'pending_payment'
        | 'pending'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show'
        | 'expired';
      car_status: 'draft' | 'pending' | 'active' | 'suspended' | 'deleted';
      document_kind: 'gov_id_front' | 'gov_id_back' | 'driver_license' | 'utility_bill' | 'selfie';
      kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected';
      notification_type:
        | 'new_booking_for_owner'
        | 'booking_cancelled_for_owner'
        | 'booking_cancelled_for_renter'
        | 'new_chat_message'
        | 'payment_successful'
        | 'payout_successful'
        | 'inspection_reminder'
        | 'generic_announcement';
      payment_provider: 'mock' | 'mercadopago' | 'stripe';
      payment_status: 'pending' | 'processing' | 'approved' | 'rejected' | 'refunded' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        'pending_payment',
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'expired',
      ],
      car_status: ['draft', 'pending', 'active', 'suspended', 'deleted'],
      document_kind: ['gov_id_front', 'gov_id_back', 'driver_license', 'utility_bill', 'selfie'],
      kyc_status: ['not_started', 'pending', 'verified', 'rejected'],
      notification_type: [
        'new_booking_for_owner',
        'booking_cancelled_for_owner',
        'booking_cancelled_for_renter',
        'new_chat_message',
        'payment_successful',
        'payout_successful',
        'inspection_reminder',
        'generic_announcement',
      ],
      payment_provider: ['mock', 'mercadopago', 'stripe'],
      payment_status: ['pending', 'processing', 'approved', 'rejected', 'refunded', 'cancelled'],
    },
  },
} as const;

// ============================================================================
// CUSTOM ENUMS (for backward compatibility)
// These types are used throughout the app but not generated by Supabase
// ============================================================================

export type UserRole = 'renter' | 'owner' | 'admin' | 'both';
export type CarStatus = 'draft' | 'pending' | 'active' | 'suspended' | 'deleted';
export type FuelType = 'nafta' | 'gasoil' | 'hibrido' | 'electrico';
export type Transmission = 'manual' | 'automatic';
export type CancelPolicy = 'flex' | 'moderate' | 'strict';
export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';
export type PaymentProvider = 'mock' | 'mercadopago' | 'stripe';
