export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_holder_document: string;
          account_holder_name: string;
          account_number: string;
          account_type: string;
          bank_name: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          is_verified: boolean | null;
          updated_at: string | null;
          user_id: string;
          verification_method: string | null;
          verified_at: string | null;
        };
        Insert: {
          account_holder_document: string;
          account_holder_name: string;
          account_number: string;
          account_type: string;
          bank_name?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_verified?: boolean | null;
          updated_at?: string | null;
          user_id: string;
          verification_method?: string | null;
          verified_at?: string | null;
        };
        Update: {
          account_holder_document?: string;
          account_holder_name?: string;
          account_number?: string;
          account_type?: string;
          bank_name?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          is_verified?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
          verification_method?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      booking_contracts: {
        Row: {
          accepted_at: string | null;
          accepted_by_renter: boolean;
          booking_id: string;
          created_at: string | null;
          id: string;
          pdf_url: string | null;
          terms_version: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by_renter?: boolean;
          booking_id: string;
          created_at?: string | null;
          id?: string;
          pdf_url?: string | null;
          terms_version: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by_renter?: boolean;
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          pdf_url?: string | null;
          terms_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_contracts_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      booking_inspections: {
        Row: {
          booking_id: string;
          created_at: string | null;
          fuel_level: number | null;
          id: string;
          inspector_id: string;
          latitude: number | null;
          longitude: number | null;
          odometer: number | null;
          photos: Json;
          signed_at: string | null;
          stage: string;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          fuel_level?: number | null;
          id?: string;
          inspector_id: string;
          latitude?: number | null;
          longitude?: number | null;
          odometer?: number | null;
          photos: Json;
          signed_at?: string | null;
          stage: string;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          fuel_level?: number | null;
          id?: string;
          inspector_id?: string;
          latitude?: number | null;
          longitude?: number | null;
          odometer?: number | null;
          photos?: Json;
          signed_at?: string | null;
          stage?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_inspections_inspector_id_fkey';
            columns: ['inspector_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_inspector_id_fkey';
            columns: ['inspector_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_inspector_id_fkey';
            columns: ['inspector_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_inspector_id_fkey';
            columns: ['inspector_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_inspections_inspector_id_fkey';
            columns: ['inspector_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_insurance_addons: {
        Row: {
          addon_id: string;
          booking_id: string;
          created_at: string | null;
          daily_cost: number;
          id: string;
          total_cost: number;
        };
        Insert: {
          addon_id: string;
          booking_id: string;
          created_at?: string | null;
          daily_cost: number;
          id?: string;
          total_cost: number;
        };
        Update: {
          addon_id?: string;
          booking_id?: string;
          created_at?: string | null;
          daily_cost?: number;
          id?: string;
          total_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_insurance_addons_addon_id_fkey';
            columns: ['addon_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_addons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_insurance_addons_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      booking_insurance_coverage: {
        Row: {
          activated_at: string | null;
          booking_id: string;
          certificate_number: string | null;
          certificate_url: string | null;
          coverage_end: string;
          coverage_start: string;
          created_at: string | null;
          daily_premium_charged: number | null;
          deductible_amount: number;
          id: string;
          liability_coverage: number;
          policy_id: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          activated_at?: string | null;
          booking_id: string;
          certificate_number?: string | null;
          certificate_url?: string | null;
          coverage_end: string;
          coverage_start: string;
          created_at?: string | null;
          daily_premium_charged?: number | null;
          deductible_amount: number;
          id?: string;
          liability_coverage: number;
          policy_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          activated_at?: string | null;
          booking_id?: string;
          certificate_number?: string | null;
          certificate_url?: string | null;
          coverage_end?: string;
          coverage_start?: string;
          created_at?: string | null;
          daily_premium_charged?: number | null;
          deductible_amount?: number;
          id?: string;
          liability_coverage?: number;
          policy_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_insurance_coverage_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_risk_snapshot: {
        Row: {
          booking_id: string;
          bucket: string;
          country_code: string;
          created_at: string | null;
          currency: string;
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
          requires_revalidation: boolean | null;
          revalidation_reason: string | null;
          rollover_franchise_usd: number | null;
          standard_franchise_usd: number | null;
        };
        Insert: {
          booking_id: string;
          bucket: string;
          country_code: string;
          created_at?: string | null;
          currency?: string;
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
          requires_revalidation?: boolean | null;
          revalidation_reason?: string | null;
          rollover_franchise_usd?: number | null;
          standard_franchise_usd?: number | null;
        };
        Update: {
          booking_id?: string;
          bucket?: string;
          country_code?: string;
          created_at?: string | null;
          currency?: string;
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
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
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'booking_risk_snapshot_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      bookings: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          authorized_payment_id: string | null;
          breakdown: Json | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_id: string;
          completion_status: string | null;
          coverage_upgrade: string | null;
          created_at: string;
          currency: string;
          days_count: number | null;
          deleted_at: string | null;
          deposit_amount_cents: number | null;
          deposit_held: boolean | null;
          deposit_lock_transaction_id: string | null;
          deposit_release_transaction_id: string | null;
          deposit_released_at: string | null;
          deposit_status: string | null;
          discounts_cents: number | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: unknown;
          end_at: string;
          expires_at: string | null;
          fees_cents: number | null;
          funds_released_at: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          has_active_claim: boolean | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          insurance_cents: number | null;
          insurance_coverage_id: string | null;
          insurance_premium_total: number | null;
          mercadopago_init_point: string | null;
          mercadopago_preference_id: string | null;
          metadata: Json;
          nightly_rate_cents: number | null;
          notes: string | null;
          owner_confirmation_at: string | null;
          owner_confirmed_delivery: boolean | null;
          owner_damage_amount: number | null;
          owner_damage_description: string | null;
          owner_payment_amount: number | null;
          owner_reported_damages: boolean | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_mode: string | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: unknown;
          platform_fee: number | null;
          reauthorization_count: number | null;
          rental_amount_cents: number | null;
          rental_lock_transaction_id: string | null;
          rental_payment_transaction_id: string | null;
          renter_confirmation_at: string | null;
          renter_confirmed_payment: boolean | null;
          renter_id: string;
          requires_revalidation: boolean | null;
          returned_at: string | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          security_deposit_amount: number | null;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          subtotal_cents: number | null;
          time_range: unknown;
          time_range_gen: unknown;
          total_amount: number;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string;
          wallet_amount_cents: number | null;
          wallet_charged_at: string | null;
          wallet_lock_id: string | null;
          wallet_lock_transaction_id: string | null;
          wallet_refunded_at: string | null;
          wallet_status: string | null;
        };
        Insert: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          authorized_payment_id?: string | null;
          breakdown?: Json | null;
          cancellation_fee_cents?: number | null;
          cancellation_policy_id?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          car_id: string;
          completion_status?: string | null;
          coverage_upgrade?: string | null;
          created_at?: string;
          currency?: string;
          days_count?: number | null;
          deleted_at?: string | null;
          deposit_amount_cents?: number | null;
          deposit_held?: boolean | null;
          deposit_lock_transaction_id?: string | null;
          deposit_release_transaction_id?: string | null;
          deposit_released_at?: string | null;
          deposit_status?: string | null;
          discounts_cents?: number | null;
          dropoff_confirmed_at?: string | null;
          dropoff_confirmed_by?: string | null;
          dropoff_location?: unknown;
          end_at: string;
          expires_at?: string | null;
          fees_cents?: number | null;
          funds_released_at?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          has_active_claim?: boolean | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          insurance_cents?: number | null;
          insurance_coverage_id?: string | null;
          insurance_premium_total?: number | null;
          mercadopago_init_point?: string | null;
          mercadopago_preference_id?: string | null;
          metadata?: Json;
          nightly_rate_cents?: number | null;
          notes?: string | null;
          owner_confirmation_at?: string | null;
          owner_confirmed_delivery?: boolean | null;
          owner_damage_amount?: number | null;
          owner_damage_description?: string | null;
          owner_payment_amount?: number | null;
          owner_reported_damages?: boolean | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_mode?: string | null;
          payment_split_completed?: boolean | null;
          payment_split_validated_at?: string | null;
          pickup_confirmed_at?: string | null;
          pickup_confirmed_by?: string | null;
          pickup_location?: unknown;
          platform_fee?: number | null;
          reauthorization_count?: number | null;
          rental_amount_cents?: number | null;
          rental_lock_transaction_id?: string | null;
          rental_payment_transaction_id?: string | null;
          renter_confirmation_at?: string | null;
          renter_confirmed_payment?: boolean | null;
          renter_id: string;
          requires_revalidation?: boolean | null;
          returned_at?: string | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          security_deposit_amount?: number | null;
          start_at: string;
          status?: Database['public']['Enums']['booking_status'];
          subtotal_cents?: number | null;
          time_range?: unknown;
          time_range_gen?: unknown;
          total_amount: number;
          total_cents?: number | null;
          total_price_ars?: number | null;
          updated_at?: string;
          wallet_amount_cents?: number | null;
          wallet_charged_at?: string | null;
          wallet_lock_id?: string | null;
          wallet_lock_transaction_id?: string | null;
          wallet_refunded_at?: string | null;
          wallet_status?: string | null;
        };
        Update: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          authorized_payment_id?: string | null;
          breakdown?: Json | null;
          cancellation_fee_cents?: number | null;
          cancellation_policy_id?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          car_id?: string;
          completion_status?: string | null;
          coverage_upgrade?: string | null;
          created_at?: string;
          currency?: string;
          days_count?: number | null;
          deleted_at?: string | null;
          deposit_amount_cents?: number | null;
          deposit_held?: boolean | null;
          deposit_lock_transaction_id?: string | null;
          deposit_release_transaction_id?: string | null;
          deposit_released_at?: string | null;
          deposit_status?: string | null;
          discounts_cents?: number | null;
          dropoff_confirmed_at?: string | null;
          dropoff_confirmed_by?: string | null;
          dropoff_location?: unknown;
          end_at?: string;
          expires_at?: string | null;
          fees_cents?: number | null;
          funds_released_at?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          has_active_claim?: boolean | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          insurance_cents?: number | null;
          insurance_coverage_id?: string | null;
          insurance_premium_total?: number | null;
          mercadopago_init_point?: string | null;
          mercadopago_preference_id?: string | null;
          metadata?: Json;
          nightly_rate_cents?: number | null;
          notes?: string | null;
          owner_confirmation_at?: string | null;
          owner_confirmed_delivery?: boolean | null;
          owner_damage_amount?: number | null;
          owner_damage_description?: string | null;
          owner_payment_amount?: number | null;
          owner_reported_damages?: boolean | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_mode?: string | null;
          payment_split_completed?: boolean | null;
          payment_split_validated_at?: string | null;
          pickup_confirmed_at?: string | null;
          pickup_confirmed_by?: string | null;
          pickup_location?: unknown;
          platform_fee?: number | null;
          reauthorization_count?: number | null;
          rental_amount_cents?: number | null;
          rental_lock_transaction_id?: string | null;
          rental_payment_transaction_id?: string | null;
          renter_confirmation_at?: string | null;
          renter_confirmed_payment?: boolean | null;
          renter_id?: string;
          requires_revalidation?: boolean | null;
          returned_at?: string | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          security_deposit_amount?: number | null;
          start_at?: string;
          status?: Database['public']['Enums']['booking_status'];
          subtotal_cents?: number | null;
          time_range?: unknown;
          time_range_gen?: unknown;
          total_amount?: number;
          total_cents?: number | null;
          total_price_ars?: number | null;
          updated_at?: string;
          wallet_amount_cents?: number | null;
          wallet_charged_at?: string | null;
          wallet_lock_id?: string | null;
          wallet_lock_transaction_id?: string | null;
          wallet_refunded_at?: string | null;
          wallet_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_coverage_id_fkey';
            columns: ['insurance_coverage_id'];
            isOneToOne: false;
            referencedRelation: 'booking_insurance_coverage';
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
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      bookings_cancellation: {
        Row: {
          booking_id: string;
          cancel_policy: string | null;
          cancel_policy_id: number | null;
          cancellation_fee_cents: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          created_at: string | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string;
          reauthorization_count: number | null;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          cancel_policy?: string | null;
          cancel_policy_id?: number | null;
          cancellation_fee_cents?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          reauthorization_count?: number | null;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          cancel_policy?: string | null;
          cancel_policy_id?: number | null;
          cancellation_fee_cents?: number | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          hold_authorization_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          reauthorization_count?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_cancellation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      bookings_confirmation: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          booking_id: string;
          created_at: string | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: string | null;
          funds_released_at: string | null;
          id: string;
          owner_confirmation_at: string | null;
          owner_confirmed_delivery: boolean | null;
          owner_damage_amount: number | null;
          owner_damage_description: string | null;
          owner_reported_damages: boolean | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: string | null;
          renter_confirmation_at: string | null;
          renter_confirmed_payment: boolean | null;
          returned_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          booking_id: string;
          created_at?: string | null;
          dropoff_confirmed_at?: string | null;
          dropoff_confirmed_by?: string | null;
          dropoff_location?: string | null;
          funds_released_at?: string | null;
          id?: string;
          owner_confirmation_at?: string | null;
          owner_confirmed_delivery?: boolean | null;
          owner_damage_amount?: number | null;
          owner_damage_description?: string | null;
          owner_reported_damages?: boolean | null;
          pickup_confirmed_at?: string | null;
          pickup_confirmed_by?: string | null;
          pickup_location?: string | null;
          renter_confirmation_at?: string | null;
          renter_confirmed_payment?: boolean | null;
          returned_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          booking_id?: string;
          created_at?: string | null;
          dropoff_confirmed_at?: string | null;
          dropoff_confirmed_by?: string | null;
          dropoff_location?: string | null;
          funds_released_at?: string | null;
          id?: string;
          owner_confirmation_at?: string | null;
          owner_confirmed_delivery?: boolean | null;
          owner_damage_amount?: number | null;
          owner_damage_description?: string | null;
          owner_reported_damages?: boolean | null;
          pickup_confirmed_at?: string | null;
          pickup_confirmed_by?: string | null;
          pickup_location?: string | null;
          renter_confirmation_at?: string | null;
          renter_confirmed_payment?: boolean | null;
          returned_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_confirmation_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      bookings_insurance: {
        Row: {
          booking_id: string;
          coverage_upgrade: string | null;
          created_at: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          id: string;
          insurance_coverage_id: string | null;
          insurance_premium_total: number;
          requires_revalidation: boolean | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          coverage_upgrade?: string | null;
          created_at?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          id?: string;
          insurance_coverage_id?: string | null;
          insurance_premium_total?: number;
          requires_revalidation?: boolean | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          coverage_upgrade?: string | null;
          created_at?: string | null;
          guarantee_amount_cents?: number | null;
          guarantee_type?: string | null;
          id?: string;
          insurance_coverage_id?: string | null;
          insurance_premium_total?: number;
          requires_revalidation?: boolean | null;
          risk_snapshot_booking_id?: string | null;
          risk_snapshot_date?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_insurance_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_insurance_insurance_coverage_id_fkey';
            columns: ['insurance_coverage_id'];
            isOneToOne: false;
            referencedRelation: 'booking_insurance_coverage';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings_payment: {
        Row: {
          booking_id: string;
          created_at: string | null;
          deposit_amount_cents: number | null;
          deposit_lock_transaction_id: string | null;
          deposit_status: string | null;
          id: string;
          mercadopago_init_point: string | null;
          mercadopago_preference_id: string | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_mode: string | null;
          rental_lock_transaction_id: string | null;
          rental_payment_transaction_id: string | null;
          security_deposit_amount: number | null;
          updated_at: string | null;
          wallet_amount_cents: number;
          wallet_charged_at: string | null;
          wallet_lock_id: string | null;
          wallet_lock_transaction_id: string | null;
          wallet_refunded_at: string | null;
          wallet_status: string | null;
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          deposit_amount_cents?: number | null;
          deposit_lock_transaction_id?: string | null;
          deposit_status?: string | null;
          id?: string;
          mercadopago_init_point?: string | null;
          mercadopago_preference_id?: string | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_mode?: string | null;
          rental_lock_transaction_id?: string | null;
          rental_payment_transaction_id?: string | null;
          security_deposit_amount?: number | null;
          updated_at?: string | null;
          wallet_amount_cents?: number;
          wallet_charged_at?: string | null;
          wallet_lock_id?: string | null;
          wallet_lock_transaction_id?: string | null;
          wallet_refunded_at?: string | null;
          wallet_status?: string | null;
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          deposit_amount_cents?: number | null;
          deposit_lock_transaction_id?: string | null;
          deposit_status?: string | null;
          id?: string;
          mercadopago_init_point?: string | null;
          mercadopago_preference_id?: string | null;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_mode?: string | null;
          rental_lock_transaction_id?: string | null;
          rental_payment_transaction_id?: string | null;
          security_deposit_amount?: number | null;
          updated_at?: string | null;
          wallet_amount_cents?: number;
          wallet_charged_at?: string | null;
          wallet_lock_id?: string | null;
          wallet_lock_transaction_id?: string | null;
          wallet_refunded_at?: string | null;
          wallet_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_payment_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_payment_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_payment_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings_pricing: {
        Row: {
          booking_id: string;
          breakdown: Json | null;
          created_at: string | null;
          days_count: number | null;
          discounts_cents: number;
          fees_cents: number;
          id: string;
          insurance_cents: number;
          nightly_rate_cents: number | null;
          subtotal_cents: number | null;
          total_cents: number | null;
          updated_at: string | null;
        };
        Insert: {
          booking_id: string;
          breakdown?: Json | null;
          created_at?: string | null;
          days_count?: number | null;
          discounts_cents?: number;
          fees_cents?: number;
          id?: string;
          insurance_cents?: number;
          nightly_rate_cents?: number | null;
          subtotal_cents?: number | null;
          total_cents?: number | null;
          updated_at?: string | null;
        };
        Update: {
          booking_id?: string;
          breakdown?: Json | null;
          created_at?: string | null;
          days_count?: number | null;
          discounts_cents?: number;
          fees_cents?: number;
          id?: string;
          insurance_cents?: number;
          nightly_rate_cents?: number | null;
          subtotal_cents?: number | null;
          total_cents?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'bookings_pricing_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      car_blackouts: {
        Row: {
          car_id: string;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          reason: string | null;
          starts_at: string;
        };
        Insert: {
          car_id: string;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_blackouts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      car_brands: {
        Row: {
          country: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
        };
        Insert: {
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
        };
        Update: {
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      car_handover_points: {
        Row: {
          car_id: string;
          created_at: string | null;
          id: string;
          kind: string;
          lat: number;
          lng: number;
          radius_m: number;
        };
        Insert: {
          car_id: string;
          created_at?: string | null;
          id?: string;
          kind: string;
          lat: number;
          lng: number;
          radius_m?: number;
        };
        Update: {
          car_id?: string;
          created_at?: string | null;
          id?: string;
          kind?: string;
          lat?: number;
          lng?: number;
          radius_m?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_handover_points_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      car_locations: {
        Row: {
          car_id: string;
          is_online: boolean;
          location: unknown;
          updated_at: string;
        };
        Insert: {
          car_id: string;
          is_online?: boolean;
          location?: unknown;
          updated_at?: string;
        };
        Update: {
          car_id?: string;
          is_online?: boolean;
          location?: unknown;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_locations_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      car_models: {
        Row: {
          brand_id: string;
          category: string | null;
          created_at: string;
          doors: number;
          id: string;
          name: string;
          seats: number;
        };
        Insert: {
          brand_id: string;
          category?: string | null;
          created_at?: string;
          doors: number;
          id?: string;
          name: string;
          seats: number;
        };
        Update: {
          brand_id?: string;
          category?: string | null;
          created_at?: string;
          doors?: number;
          id?: string;
          name?: string;
          seats?: number;
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
          position: number;
          sort_order: number | null;
          stored_path: string | null;
          url: string;
        };
        Insert: {
          car_id: string;
          created_at?: string;
          id?: string;
          position?: number;
          sort_order?: number | null;
          stored_path?: string | null;
          url: string;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          sort_order?: number | null;
          stored_path?: string | null;
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_photos_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
      car_stats: {
        Row: {
          acceptance_rate: number | null;
          avg_response_time_hours: number | null;
          cancellation_rate: number | null;
          cancelled_bookings: number | null;
          car_id: string;
          completed_bookings: number | null;
          last_review_at: string | null;
          rating_accuracy_avg: number | null;
          rating_avg: number | null;
          rating_checkin_avg: number | null;
          rating_cleanliness_avg: number | null;
          rating_communication_avg: number | null;
          rating_location_avg: number | null;
          rating_value_avg: number | null;
          reviews_count: number | null;
          total_bookings: number | null;
          updated_at: string | null;
        };
        Insert: {
          acceptance_rate?: number | null;
          avg_response_time_hours?: number | null;
          cancellation_rate?: number | null;
          cancelled_bookings?: number | null;
          car_id: string;
          completed_bookings?: number | null;
          last_review_at?: string | null;
          rating_accuracy_avg?: number | null;
          rating_avg?: number | null;
          rating_checkin_avg?: number | null;
          rating_cleanliness_avg?: number | null;
          rating_communication_avg?: number | null;
          rating_location_avg?: number | null;
          rating_value_avg?: number | null;
          reviews_count?: number | null;
          total_bookings?: number | null;
          updated_at?: string | null;
        };
        Update: {
          acceptance_rate?: number | null;
          avg_response_time_hours?: number | null;
          cancellation_rate?: number | null;
          cancelled_bookings?: number | null;
          car_id?: string;
          completed_bookings?: number | null;
          last_review_at?: string | null;
          rating_accuracy_avg?: number | null;
          rating_avg?: number | null;
          rating_checkin_avg?: number | null;
          rating_cleanliness_avg?: number | null;
          rating_communication_avg?: number | null;
          rating_location_avg?: number | null;
          rating_value_avg?: number | null;
          reviews_count?: number | null;
          total_bookings?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_stats_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: true;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
      };
      car_tracking_points: {
        Row: {
          id: string;
          lat: number;
          lng: number;
          recorded_at: string;
          session_id: string;
        };
        Insert: {
          id?: string;
          lat: number;
          lng: number;
          recorded_at?: string;
          session_id: string;
        };
        Update: {
          id?: string;
          lat?: number;
          lng?: number;
          recorded_at?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'car_tracking_points_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'car_tracking_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      car_tracking_sessions: {
        Row: {
          active: boolean;
          booking_id: string;
          created_at: string | null;
          ended_at: string | null;
          id: string;
          started_at: string;
        };
        Insert: {
          active?: boolean;
          booking_id: string;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
        };
        Update: {
          active?: boolean;
          booking_id?: string;
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'car_tracking_sessions_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      cars: {
        Row: {
          brand: string | null;
          brand_id: string;
          brand_text_backup: string;
          cancel_policy: Database['public']['Enums']['cancel_policy'];
          color: string | null;
          created_at: string;
          currency: string;
          deleted_at: string | null;
          delivery_options: Json | null;
          deposit_amount: number | null;
          deposit_required: boolean | null;
          description: string | null;
          doors: number | null;
          features: Json;
          fuel: Database['public']['Enums']['fuel_type'];
          has_owner_insurance: boolean | null;
          id: string;
          insurance_included: boolean | null;
          location_city: string | null;
          location_country: string | null;
          location_formatted_address: string | null;
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
          model_id: string;
          model_text_backup: string;
          owner_id: string;
          owner_insurance_policy_id: string | null;
          payment_methods: Json | null;
          plate: string | null;
          price_per_day: number;
          rating_avg: number | null;
          rating_count: number | null;
          region_id: string | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'];
          terms_and_conditions: string | null;
          title: string;
          transmission: Database['public']['Enums']['transmission'];
          updated_at: string;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          brand?: string | null;
          brand_id: string;
          brand_text_backup: string;
          cancel_policy?: Database['public']['Enums']['cancel_policy'];
          color?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          features?: Json;
          fuel: Database['public']['Enums']['fuel_type'];
          has_owner_insurance?: boolean | null;
          id?: string;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_formatted_address?: string | null;
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
          model_id: string;
          model_text_backup: string;
          owner_id: string;
          owner_insurance_policy_id?: string | null;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day: number;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'];
          terms_and_conditions?: string | null;
          title: string;
          transmission: Database['public']['Enums']['transmission'];
          updated_at?: string;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          brand?: string | null;
          brand_id?: string;
          brand_text_backup?: string;
          cancel_policy?: Database['public']['Enums']['cancel_policy'];
          color?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          delivery_options?: Json | null;
          deposit_amount?: number | null;
          deposit_required?: boolean | null;
          description?: string | null;
          doors?: number | null;
          features?: Json;
          fuel?: Database['public']['Enums']['fuel_type'];
          has_owner_insurance?: boolean | null;
          id?: string;
          insurance_included?: boolean | null;
          location_city?: string | null;
          location_country?: string | null;
          location_formatted_address?: string | null;
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
          model_id?: string;
          model_text_backup?: string;
          owner_id?: string;
          owner_insurance_policy_id?: string | null;
          payment_methods?: Json | null;
          plate?: string | null;
          price_per_day?: number;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'];
          terms_and_conditions?: string | null;
          title?: string;
          transmission?: Database['public']['Enums']['transmission'];
          updated_at?: string;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'car_brands';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'car_models';
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
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_insurance_policy_id_fkey';
            columns: ['owner_insurance_policy_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      coverage_fund: {
        Row: {
          balance_cents: number;
          id: boolean;
          meta: Json;
          updated_at: string;
        };
        Insert: {
          balance_cents?: number;
          id?: boolean;
          meta?: Json;
          updated_at?: string;
        };
        Update: {
          balance_cents?: number;
          id?: boolean;
          meta?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      cron_jobs_schedule: {
        Row: {
          created_at: string | null;
          execution_count: number | null;
          id: number;
          is_active: boolean | null;
          job_name: string;
          job_type: string;
          last_error: string | null;
          last_executed_at: string | null;
          next_execution_at: string | null;
          schedule_cron: string;
          target_function: string;
        };
        Insert: {
          created_at?: string | null;
          execution_count?: number | null;
          id?: number;
          is_active?: boolean | null;
          job_name: string;
          job_type: string;
          last_error?: string | null;
          last_executed_at?: string | null;
          next_execution_at?: string | null;
          schedule_cron: string;
          target_function: string;
        };
        Update: {
          created_at?: string | null;
          execution_count?: number | null;
          id?: number;
          is_active?: boolean | null;
          job_name?: string;
          job_type?: string;
          last_error?: string | null;
          last_executed_at?: string | null;
          next_execution_at?: string | null;
          schedule_cron?: string;
          target_function?: string;
        };
        Relationships: [];
      };
      db_changelog: {
        Row: {
          applied_by: string | null;
          change_date: string | null;
          change_type: string;
          description: string;
          duration_seconds: number | null;
          id: number;
          impact_summary: string | null;
          status: string | null;
          table_name: string | null;
        };
        Insert: {
          applied_by?: string | null;
          change_date?: string | null;
          change_type: string;
          description: string;
          duration_seconds?: number | null;
          id?: number;
          impact_summary?: string | null;
          status?: string | null;
          table_name?: string | null;
        };
        Update: {
          applied_by?: string | null;
          change_date?: string | null;
          change_type?: string;
          description?: string;
          duration_seconds?: number | null;
          id?: number;
          impact_summary?: string | null;
          status?: string | null;
          table_name?: string | null;
        };
        Relationships: [];
      };
      dispute_evidence: {
        Row: {
          created_at: string | null;
          dispute_id: string;
          id: string;
          note: string | null;
          path: string;
        };
        Insert: {
          created_at?: string | null;
          dispute_id: string;
          id?: string;
          note?: string | null;
          path: string;
        };
        Update: {
          created_at?: string | null;
          dispute_id?: string;
          id?: string;
          note?: string | null;
          path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dispute_evidence_dispute_id_fkey';
            columns: ['dispute_id'];
            isOneToOne: false;
            referencedRelation: 'disputes';
            referencedColumns: ['id'];
          },
        ];
      };
      disputes: {
        Row: {
          booking_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          kind: Database['public']['Enums']['dispute_kind'];
          opened_by: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database['public']['Enums']['dispute_status'];
        };
        Insert: {
          booking_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          kind: Database['public']['Enums']['dispute_kind'];
          opened_by: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
        };
        Update: {
          booking_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['dispute_kind'];
          opened_by?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: Database['public']['Enums']['dispute_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'disputes_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_opened_by_fkey';
            columns: ['opened_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
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
      exchange_rates: {
        Row: {
          binance_rate: number;
          created_at: string;
          id: string;
          is_active: boolean | null;
          last_updated: string;
          margin_absolute: number;
          margin_percent: number;
          pair: string;
          platform_rate: number;
          source: string;
          volatility_24h: number | null;
        };
        Insert: {
          binance_rate: number;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          last_updated?: string;
          margin_absolute: number;
          margin_percent?: number;
          pair: string;
          platform_rate: number;
          source?: string;
          volatility_24h?: number | null;
        };
        Update: {
          binance_rate?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean | null;
          last_updated?: string;
          margin_absolute?: number;
          margin_percent?: number;
          pair?: string;
          platform_rate?: number;
          source?: string;
          volatility_24h?: number | null;
        };
        Relationships: [];
      };
      fees: {
        Row: {
          amount: number;
          booking_id: string;
          created_at: string | null;
          id: string;
          kind: string;
          refundable: boolean;
        };
        Insert: {
          amount: number;
          booking_id: string;
          created_at?: string | null;
          id?: string;
          kind: string;
          refundable?: boolean;
        };
        Update: {
          amount?: number;
          booking_id?: string;
          created_at?: string | null;
          id?: string;
          kind?: string;
          refundable?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fees_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
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
      fgo_movements: {
        Row: {
          amount_cents: number;
          booking_id: string | null;
          country_code: string | null;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          fx_snapshot: number | null;
          id: string;
          meta: Json;
          movement_type: string;
          operation: string;
          ref: string;
          subfund_type: string;
          ts: string;
          user_id: string | null;
          wallet_ledger_id: string | null;
        };
        Insert: {
          amount_cents: number;
          booking_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          fx_snapshot?: number | null;
          id?: string;
          meta?: Json;
          movement_type: string;
          operation: string;
          ref: string;
          subfund_type: string;
          ts?: string;
          user_id?: string | null;
          wallet_ledger_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string | null;
          country_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          fx_snapshot?: number | null;
          id?: string;
          meta?: Json;
          movement_type?: string;
          operation?: string;
          ref?: string;
          subfund_type?: string;
          ts?: string;
          user_id?: string | null;
          wallet_ledger_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_subfund_type_fkey';
            columns: ['subfund_type'];
            isOneToOne: false;
            referencedRelation: 'fgo_subfunds';
            referencedColumns: ['subfund_type'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_deposits_with_fgo_contributions';
            referencedColumns: ['wallet_ledger_id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_ledger_history';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['ledger_entry_id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_ledger';
            referencedColumns: ['id'];
          },
        ];
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
      insurance_addons: {
        Row: {
          active: boolean | null;
          addon_type: string;
          benefit_amount: number | null;
          created_at: string | null;
          daily_cost: number;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean | null;
          addon_type: string;
          benefit_amount?: number | null;
          created_at?: string | null;
          daily_cost: number;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean | null;
          addon_type?: string;
          benefit_amount?: number | null;
          created_at?: string | null;
          daily_cost?: number;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      insurance_claims: {
        Row: {
          adjuster_contact: string | null;
          assigned_adjuster: string | null;
          booking_id: string;
          claim_type: string;
          closed_at: string | null;
          created_at: string | null;
          deductible_charged: number | null;
          description: string;
          estimated_damage_amount: number | null;
          id: string;
          incident_date: string;
          insurance_payout: number | null;
          location: string | null;
          metadata: Json | null;
          photos: Json | null;
          police_report_number: string | null;
          police_report_url: string | null;
          policy_id: string;
          reported_by: string;
          reporter_role: string | null;
          resolution_notes: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          adjuster_contact?: string | null;
          assigned_adjuster?: string | null;
          booking_id: string;
          claim_type: string;
          closed_at?: string | null;
          created_at?: string | null;
          deductible_charged?: number | null;
          description: string;
          estimated_damage_amount?: number | null;
          id?: string;
          incident_date: string;
          insurance_payout?: number | null;
          location?: string | null;
          metadata?: Json | null;
          photos?: Json | null;
          police_report_number?: string | null;
          police_report_url?: string | null;
          policy_id: string;
          reported_by: string;
          reporter_role?: string | null;
          resolution_notes?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          adjuster_contact?: string | null;
          assigned_adjuster?: string | null;
          booking_id?: string;
          claim_type?: string;
          closed_at?: string | null;
          created_at?: string | null;
          deductible_charged?: number | null;
          description?: string;
          estimated_damage_amount?: number | null;
          id?: string;
          incident_date?: string;
          insurance_payout?: number | null;
          location?: string | null;
          metadata?: Json | null;
          photos?: Json | null;
          police_report_number?: string | null;
          police_report_url?: string | null;
          policy_id?: string;
          reported_by?: string;
          reporter_role?: string | null;
          resolution_notes?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'insurance_claims_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'insurance_claims_policy_id_fkey';
            columns: ['policy_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      insurance_policies: {
        Row: {
          annual_premium: number | null;
          car_id: string | null;
          created_at: string | null;
          daily_premium: number | null;
          deductible_fixed_amount: number | null;
          deductible_min_amount: number | null;
          deductible_percentage: number | null;
          deductible_type: string | null;
          fire_coverage: boolean | null;
          id: string;
          insurer: string;
          liability_coverage_amount: number | null;
          metadata: Json | null;
          misappropriation_coverage: boolean | null;
          misappropriation_limit: number | null;
          own_damage_coverage: boolean | null;
          owner_id: string | null;
          owner_policy_document_url: string | null;
          owner_policy_end: string | null;
          owner_policy_number: string | null;
          owner_policy_start: string | null;
          platform_contract_end: string | null;
          platform_contract_start: string | null;
          platform_policy_number: string | null;
          policy_type: string;
          status: string | null;
          theft_coverage: boolean | null;
          updated_at: string | null;
          verification_date: string | null;
          verified_by_admin: boolean | null;
        };
        Insert: {
          annual_premium?: number | null;
          car_id?: string | null;
          created_at?: string | null;
          daily_premium?: number | null;
          deductible_fixed_amount?: number | null;
          deductible_min_amount?: number | null;
          deductible_percentage?: number | null;
          deductible_type?: string | null;
          fire_coverage?: boolean | null;
          id?: string;
          insurer: string;
          liability_coverage_amount?: number | null;
          metadata?: Json | null;
          misappropriation_coverage?: boolean | null;
          misappropriation_limit?: number | null;
          own_damage_coverage?: boolean | null;
          owner_id?: string | null;
          owner_policy_document_url?: string | null;
          owner_policy_end?: string | null;
          owner_policy_number?: string | null;
          owner_policy_start?: string | null;
          platform_contract_end?: string | null;
          platform_contract_start?: string | null;
          platform_policy_number?: string | null;
          policy_type: string;
          status?: string | null;
          theft_coverage?: boolean | null;
          updated_at?: string | null;
          verification_date?: string | null;
          verified_by_admin?: boolean | null;
        };
        Update: {
          annual_premium?: number | null;
          car_id?: string | null;
          created_at?: string | null;
          daily_premium?: number | null;
          deductible_fixed_amount?: number | null;
          deductible_min_amount?: number | null;
          deductible_percentage?: number | null;
          deductible_type?: string | null;
          fire_coverage?: boolean | null;
          id?: string;
          insurer?: string;
          liability_coverage_amount?: number | null;
          metadata?: Json | null;
          misappropriation_coverage?: boolean | null;
          misappropriation_limit?: number | null;
          own_damage_coverage?: boolean | null;
          owner_id?: string | null;
          owner_policy_document_url?: string | null;
          owner_policy_end?: string | null;
          owner_policy_number?: string | null;
          owner_policy_start?: string | null;
          platform_contract_end?: string | null;
          platform_contract_start?: string | null;
          platform_policy_number?: string | null;
          policy_type?: string;
          status?: string | null;
          theft_coverage?: boolean | null;
          updated_at?: string | null;
          verification_date?: string | null;
          verified_by_admin?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'insurance_policies_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
        ];
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      migration_logs: {
        Row: {
          applied_at: string | null;
          migration_name: string;
          status: string | null;
        };
        Insert: {
          applied_at?: string | null;
          migration_name: string;
          status?: string | null;
        };
        Update: {
          applied_at?: string | null;
          migration_name?: string;
          status?: string | null;
        };
        Relationships: [];
      };
      mv_refresh_log: {
        Row: {
          error_message: string | null;
          id: number;
          refresh_completed_at: string | null;
          refresh_started_at: string;
          refreshed_by: string | null;
          rows_affected: number | null;
          status: string | null;
          view_name: string;
        };
        Insert: {
          error_message?: string | null;
          id?: number;
          refresh_completed_at?: string | null;
          refresh_started_at: string;
          refreshed_by?: string | null;
          rows_affected?: number | null;
          status?: string | null;
          view_name: string;
        };
        Update: {
          error_message?: string | null;
          id?: number;
          refresh_completed_at?: string | null;
          refresh_started_at?: string;
          refreshed_by?: string | null;
          rows_affected?: number | null;
          status?: string | null;
          view_name?: string;
        };
        Relationships: [];
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
      payment_intents: {
        Row: {
          amount_ars: number;
          amount_captured_ars: number | null;
          amount_usd: number;
          authorized_at: string | null;
          booking_id: string | null;
          cancelled_at: string | null;
          captured_at: string | null;
          card_holder_name: string | null;
          card_last4: string | null;
          created_at: string;
          description: string | null;
          expired_at: string | null;
          external_reference: string | null;
          fx_rate: number;
          id: string;
          intent_type: string;
          is_preauth: boolean | null;
          metadata: Json | null;
          mp_payment_id: string | null;
          mp_status: string | null;
          mp_status_detail: string | null;
          payment_method_id: string | null;
          preauth_expires_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_ars: number;
          amount_captured_ars?: number | null;
          amount_usd: number;
          authorized_at?: string | null;
          booking_id?: string | null;
          cancelled_at?: string | null;
          captured_at?: string | null;
          card_holder_name?: string | null;
          card_last4?: string | null;
          created_at?: string;
          description?: string | null;
          expired_at?: string | null;
          external_reference?: string | null;
          fx_rate: number;
          id?: string;
          intent_type: string;
          is_preauth?: boolean | null;
          metadata?: Json | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          payment_method_id?: string | null;
          preauth_expires_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_ars?: number;
          amount_captured_ars?: number | null;
          amount_usd?: number;
          authorized_at?: string | null;
          booking_id?: string | null;
          cancelled_at?: string | null;
          captured_at?: string | null;
          card_holder_name?: string | null;
          card_last4?: string | null;
          created_at?: string;
          description?: string | null;
          expired_at?: string | null;
          external_reference?: string | null;
          fx_rate?: number;
          id?: string;
          intent_type?: string;
          is_preauth?: boolean | null;
          metadata?: Json | null;
          mp_payment_id?: string | null;
          mp_status?: string | null;
          mp_status_detail?: string | null;
          payment_method_id?: string | null;
          preauth_expires_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payment_intents_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payment_issues_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payment_splits_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
          deleted_at: string | null;
          description: string | null;
          expires_at: string | null;
          fee_amount: number | null;
          id: string;
          idempotency_key: string | null;
          is_hold: boolean | null;
          net_amount: number | null;
          payment_method_id: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          provider_intent_id: string | null;
          provider_payment_id: string | null;
          raw: Json;
          receipt_url: string | null;
          refund_reason: string | null;
          refunded_at: string | null;
          refunded_by: string | null;
          status: Database['public']['Enums']['payment_status'];
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
          deleted_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          fee_amount?: number | null;
          id?: string;
          idempotency_key?: string | null;
          is_hold?: boolean | null;
          net_amount?: number | null;
          payment_method_id?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          raw?: Json;
          receipt_url?: string | null;
          refund_reason?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
          status?: Database['public']['Enums']['payment_status'];
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
          deleted_at?: string | null;
          description?: string | null;
          expires_at?: string | null;
          fee_amount?: number | null;
          id?: string;
          idempotency_key?: string | null;
          is_hold?: boolean | null;
          net_amount?: number | null;
          payment_method_id?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_intent_id?: string | null;
          provider_payment_id?: string | null;
          raw?: Json;
          receipt_url?: string | null;
          refund_reason?: string | null;
          refunded_at?: string | null;
          refunded_by?: string | null;
          status?: Database['public']['Enums']['payment_status'];
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payments_refunded_by_fkey';
            columns: ['refunded_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_refunded_by_fkey';
            columns: ['refunded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_refunded_by_fkey';
            columns: ['refunded_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_refunded_by_fkey';
            columns: ['refunded_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_refunded_by_fkey';
            columns: ['refunded_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'pricing_calculations_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
          available_cars: number;
          created_at: string | null;
          demand_ratio: number;
          id: string;
          pending_requests: number;
          region_id: string | null;
          surge_factor: number;
          timestamp: string | null;
        };
        Insert: {
          active_bookings?: number;
          available_cars?: number;
          created_at?: string | null;
          demand_ratio?: number;
          id?: string;
          pending_requests?: number;
          region_id?: string | null;
          surge_factor?: number;
          timestamp?: string | null;
        };
        Update: {
          active_bookings?: number;
          available_cars?: number;
          created_at?: string | null;
          demand_ratio?: number;
          id?: string;
          pending_requests?: number;
          region_id?: string | null;
          surge_factor?: number;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_demand_snapshots_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
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
      pricing_overrides: {
        Row: {
          car_id: string;
          day: string;
          id: string;
          price_per_day: number;
        };
        Insert: {
          car_id: string;
          day: string;
          id?: string;
          price_per_day: number;
        };
        Update: {
          car_id?: string;
          day?: string;
          id?: string;
          price_per_day?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pricing_overrides_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
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
      profile_audit: {
        Row: {
          changed_by: string;
          changes: Json;
          created_at: string;
          id: number;
          user_id: string;
        };
        Insert: {
          changed_by: string;
          changes: Json;
          created_at?: string;
          id?: number;
          user_id: string;
        };
        Update: {
          changed_by?: string;
          changes?: Json;
          created_at?: string;
          id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_audit_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_audit_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_secrets_references: {
        Row: {
          created_at: string | null;
          id: string;
          mercadopago_access_token_secret_name: string | null;
          mercadopago_access_token_secret_version: number | null;
          profile_id: string;
          secret_created_at: string | null;
          secret_rotated_at: string | null;
          secret_rotation_schedule: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          mercadopago_access_token_secret_name?: string | null;
          mercadopago_access_token_secret_version?: number | null;
          profile_id: string;
          secret_created_at?: string | null;
          secret_rotated_at?: string | null;
          secret_rotation_schedule?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          mercadopago_access_token_secret_name?: string | null;
          mercadopago_access_token_secret_version?: number | null;
          profile_id?: string;
          secret_created_at?: string | null;
          secret_rotated_at?: string | null;
          secret_rotation_schedule?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_secrets_references_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_secrets_references_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_secrets_references_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_secrets_references_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_secrets_references_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          deleted_at: string | null;
          dni: string | null;
          driver_license_country: string | null;
          driver_license_expiry: string | null;
          driver_license_number: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          gov_id_number: string | null;
          gov_id_type: string | null;
          id: string;
          id_verified: boolean | null;
          is_admin: boolean | null;
          is_driver_verified: boolean | null;
          is_email_verified: boolean | null;
          is_phone_verified: boolean | null;
          kyc: Database['public']['Enums']['kyc_status'];
          locale: string | null;
          marketing_opt_in: boolean | null;
          mercadopago_access_token: string | null;
          mercadopago_access_token_expires_at: string | null;
          mercadopago_account_type: string | null;
          mercadopago_collector_id: string | null;
          mercadopago_connected: boolean | null;
          mercadopago_connected_at: string | null;
          mercadopago_country: string | null;
          mercadopago_oauth_state: string | null;
          mercadopago_public_key: string | null;
          mercadopago_refresh_token: string | null;
          mercadopago_site_id: string | null;
          notif_prefs: Json | null;
          onboarding: Database['public']['Enums']['onboarding_status'];
          phone: string | null;
          phone_verified: boolean | null;
          postal_code: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: Database['public']['Enums']['user_role'];
          state: string | null;
          stripe_customer_id: string | null;
          timezone: string | null;
          tos_accepted_at: string | null;
          updated_at: string;
          wallet_account_number: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          deleted_at?: string | null;
          dni?: string | null;
          driver_license_country?: string | null;
          driver_license_expiry?: string | null;
          driver_license_number?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number?: string | null;
          gov_id_type?: string | null;
          id: string;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          is_driver_verified?: boolean | null;
          is_email_verified?: boolean | null;
          is_phone_verified?: boolean | null;
          kyc?: Database['public']['Enums']['kyc_status'];
          locale?: string | null;
          marketing_opt_in?: boolean | null;
          mercadopago_access_token?: string | null;
          mercadopago_access_token_expires_at?: string | null;
          mercadopago_account_type?: string | null;
          mercadopago_collector_id?: string | null;
          mercadopago_connected?: boolean | null;
          mercadopago_connected_at?: string | null;
          mercadopago_country?: string | null;
          mercadopago_oauth_state?: string | null;
          mercadopago_public_key?: string | null;
          mercadopago_refresh_token?: string | null;
          mercadopago_site_id?: string | null;
          notif_prefs?: Json | null;
          onboarding?: Database['public']['Enums']['onboarding_status'];
          phone?: string | null;
          phone_verified?: boolean | null;
          postal_code?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: Database['public']['Enums']['user_role'];
          state?: string | null;
          stripe_customer_id?: string | null;
          timezone?: string | null;
          tos_accepted_at?: string | null;
          updated_at?: string;
          wallet_account_number?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          currency?: string | null;
          deleted_at?: string | null;
          dni?: string | null;
          driver_license_country?: string | null;
          driver_license_expiry?: string | null;
          driver_license_number?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number?: string | null;
          gov_id_type?: string | null;
          id?: string;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          is_driver_verified?: boolean | null;
          is_email_verified?: boolean | null;
          is_phone_verified?: boolean | null;
          kyc?: Database['public']['Enums']['kyc_status'];
          locale?: string | null;
          marketing_opt_in?: boolean | null;
          mercadopago_access_token?: string | null;
          mercadopago_access_token_expires_at?: string | null;
          mercadopago_account_type?: string | null;
          mercadopago_collector_id?: string | null;
          mercadopago_connected?: boolean | null;
          mercadopago_connected_at?: string | null;
          mercadopago_country?: string | null;
          mercadopago_oauth_state?: string | null;
          mercadopago_public_key?: string | null;
          mercadopago_refresh_token?: string | null;
          mercadopago_site_id?: string | null;
          notif_prefs?: Json | null;
          onboarding?: Database['public']['Enums']['onboarding_status'];
          phone?: string | null;
          phone_verified?: boolean | null;
          postal_code?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: Database['public']['Enums']['user_role'];
          state?: string | null;
          stripe_customer_id?: string | null;
          timezone?: string | null;
          tos_accepted_at?: string | null;
          updated_at?: string;
          wallet_account_number?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      promos: {
        Row: {
          amount_off: number | null;
          code: string;
          id: string;
          max_redemptions: number | null;
          percent_off: number | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          amount_off?: number | null;
          code: string;
          id?: string;
          max_redemptions?: number | null;
          percent_off?: number | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          amount_off?: number | null;
          code?: string;
          id?: string;
          max_redemptions?: number | null;
          percent_off?: number | null;
          valid_from?: string | null;
          valid_to?: string | null;
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
      reviews: {
        Row: {
          booking_id: string;
          car_id: string | null;
          comment: string | null;
          comment_private: string | null;
          comment_public: string | null;
          created_at: string;
          flag_reason: string | null;
          flagged_at: string | null;
          flagged_by: string | null;
          id: string;
          is_flagged: boolean | null;
          is_visible: boolean | null;
          moderated_at: string | null;
          moderated_by: string | null;
          moderation_notes: string | null;
          moderation_status: string | null;
          published_at: string | null;
          rating: number;
          rating_accuracy: number | null;
          rating_checkin: number | null;
          rating_cleanliness: number | null;
          rating_communication: number | null;
          rating_location: number | null;
          rating_value: number | null;
          review_type: string | null;
          reviewee_id: string;
          reviewer_id: string;
          role: Database['public']['Enums']['rating_role'];
          status: string | null;
        };
        Insert: {
          booking_id: string;
          car_id?: string | null;
          comment?: string | null;
          comment_private?: string | null;
          comment_public?: string | null;
          created_at?: string;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          id?: string;
          is_flagged?: boolean | null;
          is_visible?: boolean | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_notes?: string | null;
          moderation_status?: string | null;
          published_at?: string | null;
          rating: number;
          rating_accuracy?: number | null;
          rating_checkin?: number | null;
          rating_cleanliness?: number | null;
          rating_communication?: number | null;
          rating_location?: number | null;
          rating_value?: number | null;
          review_type?: string | null;
          reviewee_id: string;
          reviewer_id: string;
          role?: Database['public']['Enums']['rating_role'];
          status?: string | null;
        };
        Update: {
          booking_id?: string;
          car_id?: string | null;
          comment?: string | null;
          comment_private?: string | null;
          comment_public?: string | null;
          created_at?: string;
          flag_reason?: string | null;
          flagged_at?: string | null;
          flagged_by?: string | null;
          id?: string;
          is_flagged?: boolean | null;
          is_visible?: boolean | null;
          moderated_at?: string | null;
          moderated_by?: string | null;
          moderation_notes?: string | null;
          moderation_status?: string | null;
          published_at?: string | null;
          rating?: number;
          rating_accuracy?: number | null;
          rating_checkin?: number | null;
          rating_cleanliness?: number | null;
          rating_communication?: number | null;
          rating_location?: number | null;
          rating_value?: number | null;
          review_type?: string | null;
          reviewee_id?: string;
          reviewer_id?: string;
          role?: Database['public']['Enums']['rating_role'];
          status?: string | null;
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_flagged_by_fkey';
            columns: ['flagged_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_flagged_by_fkey';
            columns: ['flagged_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_flagged_by_fkey';
            columns: ['flagged_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_flagged_by_fkey';
            columns: ['flagged_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_flagged_by_fkey';
            columns: ['flagged_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_moderated_by_fkey';
            columns: ['moderated_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['reviewee_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey';
            columns: ['reviewer_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      secret_rotation_audit: {
        Row: {
          id: number;
          new_secret_hash: string | null;
          old_secret_hash: string | null;
          profile_id: string;
          reason: string | null;
          rotated_at: string | null;
          rotated_by: string | null;
          secret_type: string;
        };
        Insert: {
          id?: number;
          new_secret_hash?: string | null;
          old_secret_hash?: string | null;
          profile_id: string;
          reason?: string | null;
          rotated_at?: string | null;
          rotated_by?: string | null;
          secret_type: string;
        };
        Update: {
          id?: number;
          new_secret_hash?: string | null;
          old_secret_hash?: string | null;
          profile_id?: string;
          reason?: string | null;
          rotated_at?: string | null;
          rotated_by?: string | null;
          secret_type?: string;
        };
        Relationships: [];
      };
      soft_delete_audit_log: {
        Row: {
          deleted_at: string;
          deleted_by: string | null;
          entity_id: string;
          entity_type: string;
          id: number;
          permanent_delete_at: string | null;
          reason: string | null;
          restore_at: string | null;
          restored_by: string | null;
        };
        Insert: {
          deleted_at?: string;
          deleted_by?: string | null;
          entity_id: string;
          entity_type: string;
          id?: number;
          permanent_delete_at?: string | null;
          reason?: string | null;
          restore_at?: string | null;
          restored_by?: string | null;
        };
        Update: {
          deleted_at?: string;
          deleted_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: number;
          permanent_delete_at?: string | null;
          reason?: string | null;
          restore_at?: string | null;
          restored_by?: string | null;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
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
        Relationships: [
          {
            foreignKeyName: 'user_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_documents_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      user_stats: {
        Row: {
          badges: Json | null;
          cancellation_count: number | null;
          cancellation_rate: number | null;
          is_super_host: boolean | null;
          is_top_host: boolean | null;
          is_verified_renter: boolean | null;
          last_review_received_at: string | null;
          owner_rating_accuracy_avg: number | null;
          owner_rating_avg: number | null;
          owner_rating_checkin_avg: number | null;
          owner_rating_cleanliness_avg: number | null;
          owner_rating_communication_avg: number | null;
          owner_rating_location_avg: number | null;
          owner_rating_value_avg: number | null;
          owner_response_rate: number | null;
          owner_response_time_hours: number | null;
          owner_reviews_count: number | null;
          renter_rating_accuracy_avg: number | null;
          renter_rating_avg: number | null;
          renter_rating_checkin_avg: number | null;
          renter_rating_cleanliness_avg: number | null;
          renter_rating_communication_avg: number | null;
          renter_reviews_count: number | null;
          total_bookings_as_owner: number | null;
          total_bookings_as_renter: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          badges?: Json | null;
          cancellation_count?: number | null;
          cancellation_rate?: number | null;
          is_super_host?: boolean | null;
          is_top_host?: boolean | null;
          is_verified_renter?: boolean | null;
          last_review_received_at?: string | null;
          owner_rating_accuracy_avg?: number | null;
          owner_rating_avg?: number | null;
          owner_rating_checkin_avg?: number | null;
          owner_rating_cleanliness_avg?: number | null;
          owner_rating_communication_avg?: number | null;
          owner_rating_location_avg?: number | null;
          owner_rating_value_avg?: number | null;
          owner_response_rate?: number | null;
          owner_response_time_hours?: number | null;
          owner_reviews_count?: number | null;
          renter_rating_accuracy_avg?: number | null;
          renter_rating_avg?: number | null;
          renter_rating_checkin_avg?: number | null;
          renter_rating_cleanliness_avg?: number | null;
          renter_rating_communication_avg?: number | null;
          renter_reviews_count?: number | null;
          total_bookings_as_owner?: number | null;
          total_bookings_as_renter?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          badges?: Json | null;
          cancellation_count?: number | null;
          cancellation_rate?: number | null;
          is_super_host?: boolean | null;
          is_top_host?: boolean | null;
          is_verified_renter?: boolean | null;
          last_review_received_at?: string | null;
          owner_rating_accuracy_avg?: number | null;
          owner_rating_avg?: number | null;
          owner_rating_checkin_avg?: number | null;
          owner_rating_cleanliness_avg?: number | null;
          owner_rating_communication_avg?: number | null;
          owner_rating_location_avg?: number | null;
          owner_rating_value_avg?: number | null;
          owner_response_rate?: number | null;
          owner_response_time_hours?: number | null;
          owner_reviews_count?: number | null;
          renter_rating_accuracy_avg?: number | null;
          renter_rating_avg?: number | null;
          renter_rating_checkin_avg?: number | null;
          renter_rating_cleanliness_avg?: number | null;
          renter_rating_communication_avg?: number | null;
          renter_reviews_count?: number | null;
          total_bookings_as_owner?: number | null;
          total_bookings_as_renter?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_stats_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'user_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_verifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      user_wallets: {
        Row: {
          available_balance: number;
          created_at: string | null;
          currency: string;
          locked_balance: number;
          non_withdrawable_floor: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          available_balance?: number;
          created_at?: string | null;
          currency?: string;
          locked_balance?: number;
          non_withdrawable_floor?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          available_balance?: number;
          created_at?: string | null;
          currency?: string;
          locked_balance?: number;
          non_withdrawable_floor?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_documents: {
        Row: {
          car_id: string;
          created_at: string;
          expiry_date: string | null;
          id: string;
          kind: Database['public']['Enums']['vehicle_document_kind'];
          notes: string | null;
          status: string;
          storage_path: string;
          updated_at: string;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          car_id: string;
          created_at?: string;
          expiry_date?: string | null;
          id?: string;
          kind: Database['public']['Enums']['vehicle_document_kind'];
          notes?: string | null;
          status?: string;
          storage_path: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          car_id?: string;
          created_at?: string;
          expiry_date?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['vehicle_document_kind'];
          notes?: string | null;
          status?: string;
          storage_path?: string;
          updated_at?: string;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_documents_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_inspections: {
        Row: {
          ai_analysis: Json | null;
          ai_detected_damages: Json | null;
          booking_id: string;
          car_id: string;
          completed: boolean | null;
          created_at: string | null;
          damages_detected: Json | null;
          fuel_level: number | null;
          id: string;
          inspection_location: unknown;
          inspection_type: string;
          inspector_id: string;
          inspector_role: string | null;
          odometer_reading: number | null;
          photos_360: Json | null;
          signature_data: string | null;
          signed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          ai_analysis?: Json | null;
          ai_detected_damages?: Json | null;
          booking_id: string;
          car_id: string;
          completed?: boolean | null;
          created_at?: string | null;
          damages_detected?: Json | null;
          fuel_level?: number | null;
          id?: string;
          inspection_location?: unknown;
          inspection_type: string;
          inspector_id: string;
          inspector_role?: string | null;
          odometer_reading?: number | null;
          photos_360?: Json | null;
          signature_data?: string | null;
          signed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ai_analysis?: Json | null;
          ai_detected_damages?: Json | null;
          booking_id?: string;
          car_id?: string;
          completed?: boolean | null;
          created_at?: string | null;
          damages_detected?: Json | null;
          fuel_level?: number | null;
          id?: string;
          inspection_location?: unknown;
          inspection_type?: string;
          inspector_id?: string;
          inspector_role?: string | null;
          odometer_reading?: number | null;
          photos_360?: Json | null;
          signature_data?: string | null;
          signed_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vehicle_inspections_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
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
      wallet_ledger: {
        Row: {
          amount_cents: number;
          booking_id: string | null;
          created_at: string;
          exchange_rate: number | null;
          id: string;
          kind: Database['public']['Enums']['ledger_kind'];
          meta: Json;
          original_amount_cents: number | null;
          original_currency: string | null;
          ref: string;
          transaction_id: string | null;
          ts: string;
          user_id: string;
        };
        Insert: {
          amount_cents: number;
          booking_id?: string | null;
          created_at?: string;
          exchange_rate?: number | null;
          id?: string;
          kind: Database['public']['Enums']['ledger_kind'];
          meta?: Json;
          original_amount_cents?: number | null;
          original_currency?: string | null;
          ref: string;
          transaction_id?: string | null;
          ts?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          booking_id?: string | null;
          created_at?: string;
          exchange_rate?: number | null;
          id?: string;
          kind?: Database['public']['Enums']['ledger_kind'];
          meta?: Json;
          original_amount_cents?: number | null;
          original_currency?: string | null;
          ref?: string;
          transaction_id?: string | null;
          ts?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_transactions: {
        Row: {
          admin_notes: string | null;
          amount: number;
          completed_at: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          is_withdrawable: boolean;
          provider: string | null;
          provider_metadata: Json | null;
          provider_transaction_id: string | null;
          reference_id: string | null;
          reference_type: string | null;
          status: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          amount: number;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_withdrawable?: boolean;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number;
          completed_at?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_withdrawable?: boolean;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_transfers: {
        Row: {
          amount_cents: number;
          completed_at: string | null;
          created_at: string;
          from_user: string;
          id: string;
          meta: Json;
          ref: string;
          status: string;
          to_user: string;
        };
        Insert: {
          amount_cents: number;
          completed_at?: string | null;
          created_at?: string;
          from_user: string;
          id?: string;
          meta?: Json;
          ref: string;
          status?: string;
          to_user: string;
        };
        Update: {
          amount_cents?: number;
          completed_at?: string | null;
          created_at?: string;
          from_user?: string;
          id?: string;
          meta?: Json;
          ref?: string;
          status?: string;
          to_user?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_events: {
        Row: {
          error_message: string | null;
          event_type: string;
          id: string;
          idempotency_key: string;
          payload: Json;
          processed_at: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          received_at: string;
          status: Database['public']['Enums']['webhook_status'];
        };
        Insert: {
          error_message?: string | null;
          event_type: string;
          id?: string;
          idempotency_key: string;
          payload: Json;
          processed_at?: string | null;
          provider: Database['public']['Enums']['payment_provider'];
          received_at?: string;
          status?: Database['public']['Enums']['webhook_status'];
        };
        Update: {
          error_message?: string | null;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: Database['public']['Enums']['payment_provider'];
          received_at?: string;
          status?: Database['public']['Enums']['webhook_status'];
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          admin_notes: string | null;
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          bank_account_id: string;
          completed_at: string | null;
          created_at: string | null;
          currency: string;
          failed_at: string | null;
          failure_reason: string | null;
          fee_amount: number | null;
          id: string;
          net_amount: number | null;
          processed_at: string | null;
          provider: string | null;
          provider_metadata: Json | null;
          provider_transaction_id: string | null;
          rejection_reason: string | null;
          status: Database['public']['Enums']['withdrawal_status'];
          updated_at: string | null;
          user_id: string;
          user_notes: string | null;
          wallet_transaction_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          bank_account_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          failed_at?: string | null;
          failure_reason?: string | null;
          fee_amount?: number | null;
          id?: string;
          net_amount?: number | null;
          processed_at?: string | null;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          rejection_reason?: string | null;
          status?: Database['public']['Enums']['withdrawal_status'];
          updated_at?: string | null;
          user_id: string;
          user_notes?: string | null;
          wallet_transaction_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          bank_account_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string;
          failed_at?: string | null;
          failure_reason?: string | null;
          fee_amount?: number | null;
          id?: string;
          net_amount?: number | null;
          processed_at?: string | null;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          rejection_reason?: string | null;
          status?: Database['public']['Enums']['withdrawal_status'];
          updated_at?: string | null;
          user_id?: string;
          user_notes?: string | null;
          wallet_transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'withdrawal_requests_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      bookings_complete: {
        Row: {
          car_id: string | null;
          created_at: string | null;
          days_count: number | null;
          deleted_at: string | null;
          end_at: string | null;
          id: string | null;
          renter_id: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          total_amount: number | null;
          updated_at: string | null;
        };
        Insert: {
          car_id?: string | null;
          created_at?: string | null;
          days_count?: number | null;
          deleted_at?: string | null;
          end_at?: string | null;
          id?: string | null;
          renter_id?: string | null;
          start_at?: string | null;
          status?: Database['public']['Enums']['booking_status'] | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Update: {
          car_id?: string | null;
          created_at?: string | null;
          days_count?: number | null;
          deleted_at?: string | null;
          end_at?: string | null;
          id?: string | null;
          renter_id?: string | null;
          start_at?: string | null;
          status?: Database['public']['Enums']['booking_status'] | null;
          total_amount?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      car_latest_location: {
        Row: {
          lat: number | null;
          lng: number | null;
          recorded_at: string | null;
          session_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'car_tracking_points_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'car_tracking_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      cars_with_main_photo: {
        Row: {
          brand: string | null;
          color: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          doors: number | null;
          features: Json | null;
          fuel: Database['public']['Enums']['fuel_type'] | null;
          id: string | null;
          location_city: string | null;
          location_country: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_province: string | null;
          location_state: string | null;
          main_photo_id: string | null;
          main_photo_sort_order: number | null;
          main_photo_url: string | null;
          mileage: number | null;
          model: string | null;
          owner_id: string | null;
          plate: string | null;
          price_per_day: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
          transmission: Database['public']['Enums']['transmission'] | null;
          updated_at: string | null;
          vin: string | null;
          year: number | null;
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
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      cron_jobs_status: {
        Row: {
          current_state: string | null;
          execution_count: number | null;
          is_active: boolean | null;
          job_name: string | null;
          job_type: string | null;
          last_error: string | null;
          last_executed_at: string | null;
          schedule_cron: string | null;
          status: string | null;
        };
        Insert: {
          current_state?: never;
          execution_count?: number | null;
          is_active?: boolean | null;
          job_name?: string | null;
          job_type?: string | null;
          last_error?: string | null;
          last_executed_at?: string | null;
          schedule_cron?: string | null;
          status?: never;
        };
        Update: {
          current_state?: never;
          execution_count?: number | null;
          is_active?: boolean | null;
          job_name?: string | null;
          job_type?: string | null;
          last_error?: string | null;
          last_executed_at?: string | null;
          schedule_cron?: string | null;
          status?: never;
        };
        Relationships: [];
      };
      current_exchange_rates: {
        Row: {
          binance_rate: number | null;
          id: string | null;
          last_updated: string | null;
          margin_absolute: number | null;
          margin_percent: number | null;
          pair: string | null;
          platform_rate: number | null;
          source: string | null;
          volatility_24h: number | null;
        };
        Relationships: [];
      };
      deleted_bookings: {
        Row: {
          car_id: string | null;
          car_title: string | null;
          deleted_at: string | null;
          id: string | null;
          renter_id: string | null;
          renter_name: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          total_amount: number | null;
        };
        Insert: {
          car_id?: string | null;
          car_title?: never;
          deleted_at?: string | null;
          id?: string | null;
          renter_id?: string | null;
          renter_name?: never;
          status?: Database['public']['Enums']['booking_status'] | null;
          total_amount?: number | null;
        };
        Update: {
          car_id?: string | null;
          car_title?: never;
          deleted_at?: string | null;
          id?: string | null;
          renter_id?: string | null;
          renter_name?: never;
          status?: Database['public']['Enums']['booking_status'] | null;
          total_amount?: number | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      deleted_cars: {
        Row: {
          deleted_at: string | null;
          id: string | null;
          owner_id: string | null;
          owner_name: string | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
        };
        Insert: {
          deleted_at?: string | null;
          id?: string | null;
          owner_id?: string | null;
          owner_name?: never;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
        };
        Update: {
          deleted_at?: string | null;
          id?: string | null;
          owner_id?: string | null;
          owner_name?: never;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
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
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      me_profile: {
        Row: {
          address_line1: string | null;
          address_line2: string | null;
          avatar_url: string | null;
          can_book_cars: boolean | null;
          can_publish_cars: boolean | null;
          city: string | null;
          country: string | null;
          created_at: string | null;
          currency: string | null;
          dni: string | null;
          driver_license_country: string | null;
          driver_license_expiry: string | null;
          driver_license_number: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          gov_id_number: string | null;
          gov_id_type: string | null;
          id: string | null;
          id_verified: boolean | null;
          is_admin: boolean | null;
          is_driver_verified: boolean | null;
          is_email_verified: boolean | null;
          is_phone_verified: boolean | null;
          kyc: Database['public']['Enums']['kyc_status'] | null;
          locale: string | null;
          marketing_opt_in: boolean | null;
          notif_prefs: Json | null;
          onboarding: Database['public']['Enums']['onboarding_status'] | null;
          phone: string | null;
          phone_verified: boolean | null;
          postal_code: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: Database['public']['Enums']['user_role'] | null;
          state: string | null;
          stripe_customer_id: string | null;
          timezone: string | null;
          tos_accepted_at: string | null;
          updated_at: string | null;
          whatsapp: string | null;
        };
        Insert: {
          address_line1?: string | null;
          address_line2?: string | null;
          avatar_url?: string | null;
          can_book_cars?: never;
          can_publish_cars?: never;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          dni?: string | null;
          driver_license_country?: string | null;
          driver_license_expiry?: string | null;
          driver_license_number?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number?: string | null;
          gov_id_type?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          is_driver_verified?: boolean | null;
          is_email_verified?: boolean | null;
          is_phone_verified?: boolean | null;
          kyc?: Database['public']['Enums']['kyc_status'] | null;
          locale?: string | null;
          marketing_opt_in?: boolean | null;
          notif_prefs?: Json | null;
          onboarding?: Database['public']['Enums']['onboarding_status'] | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          postal_code?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          state?: string | null;
          stripe_customer_id?: string | null;
          timezone?: string | null;
          tos_accepted_at?: string | null;
          updated_at?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          address_line1?: string | null;
          address_line2?: string | null;
          avatar_url?: string | null;
          can_book_cars?: never;
          can_publish_cars?: never;
          city?: string | null;
          country?: string | null;
          created_at?: string | null;
          currency?: string | null;
          dni?: string | null;
          driver_license_country?: string | null;
          driver_license_expiry?: string | null;
          driver_license_number?: string | null;
          email_verified?: boolean | null;
          full_name?: string | null;
          gov_id_number?: string | null;
          gov_id_type?: string | null;
          id?: string | null;
          id_verified?: boolean | null;
          is_admin?: boolean | null;
          is_driver_verified?: boolean | null;
          is_email_verified?: boolean | null;
          is_phone_verified?: boolean | null;
          kyc?: Database['public']['Enums']['kyc_status'] | null;
          locale?: string | null;
          marketing_opt_in?: boolean | null;
          notif_prefs?: Json | null;
          onboarding?: Database['public']['Enums']['onboarding_status'] | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          postal_code?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          role?: Database['public']['Enums']['user_role'] | null;
          state?: string | null;
          stripe_customer_id?: string | null;
          timezone?: string | null;
          tos_accepted_at?: string | null;
          updated_at?: string | null;
          whatsapp?: string | null;
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'messages_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      mv_booking_metrics: {
        Row: {
          avg_booking_value: number | null;
          avg_days: number | null;
          booking_date: string | null;
          cars_booked: number | null;
          status: Database['public']['Enums']['booking_status'] | null;
          total_bookings: number | null;
          total_revenue: number | null;
          unique_renters: number | null;
        };
        Relationships: [];
      };
      mv_cars_availability: {
        Row: {
          active_bookings: number | null;
          blocked_ranges: unknown[] | null;
          id: string | null;
          location_city: string | null;
          location_lat: number | null;
          location_lng: number | null;
          price_per_day: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
        };
        Relationships: [];
      };
      mv_cars_search_index: {
        Row: {
          active_bookings_count: number | null;
          avg_booking_price: number | null;
          brand_id: string | null;
          completed_bookings_count: number | null;
          created_at: string | null;
          doors: number | null;
          fuel: Database['public']['Enums']['fuel_type'] | null;
          id: string | null;
          location_city: string | null;
          location_country: string | null;
          location_formatted_address: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_province: string | null;
          location_state: string | null;
          model_id: string | null;
          price_per_day: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
          transmission: Database['public']['Enums']['transmission'] | null;
          updated_at: string | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'car_brands';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'car_models';
            referencedColumns: ['id'];
          },
        ];
      };
      mv_payment_analytics: {
        Row: {
          avg_amount: number | null;
          max_amount: number | null;
          min_amount: number | null;
          payment_date: string | null;
          provider: Database['public']['Enums']['payment_provider'] | null;
          status: Database['public']['Enums']['payment_status'] | null;
          total_amount: number | null;
          total_payments: number | null;
          unique_bookings: number | null;
        };
        Relationships: [];
      };
      my_bookings: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
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
          completion_status: string | null;
          coverage_upgrade: string | null;
          created_at: string | null;
          currency: string | null;
          days_count: number | null;
          deposit_amount_cents: number | null;
          deposit_lock_transaction_id: string | null;
          deposit_release_transaction_id: string | null;
          deposit_status: string | null;
          discounts_cents: number | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: unknown;
          end_at: string | null;
          expires_at: string | null;
          fees_cents: number | null;
          funds_released_at: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string | null;
          idempotency_key: string | null;
          insurance_cents: number | null;
          main_photo_url: string | null;
          mercadopago_init_point: string | null;
          mercadopago_preference_id: string | null;
          metadata: Json | null;
          nightly_rate_cents: number | null;
          notes: string | null;
          owner_confirmation_at: string | null;
          owner_confirmed_delivery: boolean | null;
          owner_damage_amount: number | null;
          owner_damage_description: string | null;
          owner_reported_damages: boolean | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_mode: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_status: Database['public']['Enums']['payment_status'] | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: unknown;
          reauthorization_count: number | null;
          rental_amount_cents: number | null;
          rental_lock_transaction_id: string | null;
          rental_payment_transaction_id: string | null;
          renter_confirmation_at: string | null;
          renter_confirmed_payment: boolean | null;
          renter_id: string | null;
          requires_revalidation: boolean | null;
          returned_at: string | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          subtotal_cents: number | null;
          time_range: unknown;
          total_amount: number | null;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string | null;
          wallet_amount_cents: number | null;
          wallet_charged_at: string | null;
          wallet_lock_id: string | null;
          wallet_lock_transaction_id: string | null;
          wallet_refunded_at: string | null;
          wallet_status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
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
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      my_cars: {
        Row: {
          brand: string | null;
          brand_id: string | null;
          brand_text_backup: string | null;
          cancel_policy: Database['public']['Enums']['cancel_policy'] | null;
          color: string | null;
          created_at: string | null;
          currency: string | null;
          delivery_options: Json | null;
          deposit_amount: number | null;
          deposit_required: boolean | null;
          description: string | null;
          doors: number | null;
          features: Json | null;
          fuel: Database['public']['Enums']['fuel_type'] | null;
          has_owner_insurance: boolean | null;
          id: string | null;
          insurance_included: boolean | null;
          location_city: string | null;
          location_country: string | null;
          location_formatted_address: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_neighborhood: string | null;
          location_postal_code: string | null;
          location_province: string | null;
          location_state: string | null;
          location_street: string | null;
          location_street_number: string | null;
          max_rental_days: number | null;
          mercadopago_collector_id: string | null;
          mercadopago_connected: boolean | null;
          mercadopago_connected_at: string | null;
          mileage: number | null;
          min_rental_days: number | null;
          model: string | null;
          model_id: string | null;
          model_text_backup: string | null;
          mp_status: string | null;
          owner_id: string | null;
          owner_insurance_policy_id: string | null;
          payment_methods: Json | null;
          plate: string | null;
          price_per_day: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          region_id: string | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          terms_and_conditions: string | null;
          title: string | null;
          transmission: Database['public']['Enums']['transmission'] | null;
          updated_at: string | null;
          vin: string | null;
          year: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cars_brand_id_fkey';
            columns: ['brand_id'];
            isOneToOne: false;
            referencedRelation: 'car_brands';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_model_id_fkey';
            columns: ['model_id'];
            isOneToOne: false;
            referencedRelation: 'car_models';
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
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_insurance_policy_id_fkey';
            columns: ['owner_insurance_policy_id'];
            isOneToOne: false;
            referencedRelation: 'insurance_policies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      owner_bookings: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
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
          completion_status: string | null;
          coverage_upgrade: string | null;
          created_at: string | null;
          currency: string | null;
          days_count: number | null;
          deposit_amount_cents: number | null;
          deposit_lock_transaction_id: string | null;
          deposit_release_transaction_id: string | null;
          deposit_status: string | null;
          discounts_cents: number | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: unknown;
          end_at: string | null;
          expires_at: string | null;
          fees_cents: number | null;
          funds_released_at: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string | null;
          idempotency_key: string | null;
          insurance_cents: number | null;
          mercadopago_init_point: string | null;
          mercadopago_preference_id: string | null;
          metadata: Json | null;
          nightly_rate_cents: number | null;
          notes: string | null;
          owner_confirmation_at: string | null;
          owner_confirmed_delivery: boolean | null;
          owner_damage_amount: number | null;
          owner_damage_description: string | null;
          owner_reported_damages: boolean | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_mode: string | null;
          payment_provider: Database['public']['Enums']['payment_provider'] | null;
          payment_status: Database['public']['Enums']['payment_status'] | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: unknown;
          reauthorization_count: number | null;
          rental_amount_cents: number | null;
          rental_lock_transaction_id: string | null;
          rental_payment_transaction_id: string | null;
          renter_avatar: string | null;
          renter_confirmation_at: string | null;
          renter_confirmed_payment: boolean | null;
          renter_id: string | null;
          renter_name: string | null;
          requires_revalidation: boolean | null;
          returned_at: string | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          subtotal_cents: number | null;
          time_range: unknown;
          total_amount: number | null;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string | null;
          wallet_amount_cents: number | null;
          wallet_charged_at: string | null;
          wallet_lock_id: string | null;
          wallet_lock_transaction_id: string | null;
          wallet_refunded_at: string | null;
          wallet_status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_authorized_payment_id_fkey';
            columns: ['authorized_payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_lock_transaction_id_fkey';
            columns: ['deposit_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_deposit_release_transaction_id_fkey';
            columns: ['deposit_release_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
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
            foreignKeyName: 'bookings_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'v_payment_authorizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_lock_transaction_id_fkey';
            columns: ['rental_lock_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_rental_payment_transaction_id_fkey';
            columns: ['rental_payment_transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_risk_snapshot_booking_id_fkey';
            columns: ['risk_snapshot_booking_id'];
            isOneToOne: false;
            referencedRelation: 'booking_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          id: string | null;
          role: Database['public']['Enums']['user_role'] | null;
        };
        Insert: {
          id?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
        };
        Update: {
          id?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
        };
        Relationships: [];
      };
      user_ratings: {
        Row: {
          avg_rating: number | null;
          reviews_count: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_bookings_detailed: {
        Row: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          car_brand: string | null;
          car_id: string | null;
          car_model: string | null;
          car_plate: string | null;
          car_price_per_day: number | null;
          car_title: string | null;
          car_year: number | null;
          created_at: string | null;
          currency: string | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: unknown;
          end_at: string | null;
          id: string | null;
          metadata: Json | null;
          notes: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: unknown;
          renter_id: string | null;
          renter_name: string | null;
          renter_phone: string | null;
          start_at: string | null;
          status: Database['public']['Enums']['booking_status'] | null;
          time_range: unknown;
          total_amount: number | null;
          updated_at: string | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_dropoff_confirmed_by_fkey';
            columns: ['dropoff_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_pickup_confirmed_by_fkey';
            columns: ['pickup_confirmed_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['renter_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_bookings_with_risk_snapshot: {
        Row: {
          booking_id: string | null;
          booking_status: Database['public']['Enums']['booking_status'] | null;
          bucket: string | null;
          car_id: string | null;
          check_in_signed_at: string | null;
          check_out_signed_at: string | null;
          country_code: string | null;
          created_at: string | null;
          currency: string | null;
          end_date: string | null;
          estimated_deposit: number | null;
          estimated_hold_amount: number | null;
          franchise_usd: number | null;
          fx_snapshot: number | null;
          has_card: boolean | null;
          has_wallet_security: boolean | null;
          inspection_count: number | null;
          locador_id: string | null;
          locatario_id: string | null;
          start_date: string | null;
          total_price_cents: number | null;
          updated_at: string | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['locatario_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['locatario_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['locatario_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['locatario_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_renter_id_fkey';
            columns: ['locatario_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['locador_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['locador_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['locador_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['locador_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['locador_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_car_owner_info: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          full_name: string | null;
          id: string | null;
          rating_avg: number | null;
          rating_count: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          full_name?: string | null;
          id?: string | null;
          rating_avg?: number | null;
          rating_count?: number | null;
        };
        Relationships: [];
      };
      v_cars_public: {
        Row: {
          brand: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          doors: number | null;
          features: Json | null;
          fuel: Database['public']['Enums']['fuel_type'] | null;
          id: string | null;
          model: string | null;
          price_per_day: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
          transmission: Database['public']['Enums']['transmission'] | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          brand?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: Database['public']['Enums']['fuel_type'] | null;
          id?: string | null;
          model?: string | null;
          price_per_day?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
          transmission?: Database['public']['Enums']['transmission'] | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          brand?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: Database['public']['Enums']['fuel_type'] | null;
          id?: string | null;
          model?: string | null;
          price_per_day?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
          transmission?: Database['public']['Enums']['transmission'] | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      v_cars_with_main_photo: {
        Row: {
          brand: string | null;
          cancel_policy: Database['public']['Enums']['cancel_policy'] | null;
          color: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          doors: number | null;
          features: Json | null;
          fuel: Database['public']['Enums']['fuel_type'] | null;
          id: string | null;
          location_city: string | null;
          location_country: string | null;
          location_lat: number | null;
          location_lng: number | null;
          location_province: string | null;
          location_state: string | null;
          main_photo_url: string | null;
          mileage: number | null;
          model: string | null;
          owner_id: string | null;
          plate: string | null;
          price_per_day: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          region_id: string | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'] | null;
          title: string | null;
          transmission: Database['public']['Enums']['transmission'] | null;
          updated_at: string | null;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          brand?: string | null;
          cancel_policy?: Database['public']['Enums']['cancel_policy'] | null;
          color?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: Database['public']['Enums']['fuel_type'] | null;
          id?: string | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_province?: string | null;
          location_state?: string | null;
          main_photo_url?: never;
          mileage?: number | null;
          model?: string | null;
          owner_id?: string | null;
          plate?: string | null;
          price_per_day?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
          transmission?: Database['public']['Enums']['transmission'] | null;
          updated_at?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          brand?: string | null;
          cancel_policy?: Database['public']['Enums']['cancel_policy'] | null;
          color?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          doors?: number | null;
          features?: Json | null;
          fuel?: Database['public']['Enums']['fuel_type'] | null;
          id?: string | null;
          location_city?: string | null;
          location_country?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          location_province?: string | null;
          location_state?: string | null;
          main_photo_url?: never;
          mileage?: number | null;
          model?: string | null;
          owner_id?: string | null;
          plate?: string | null;
          price_per_day?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          region_id?: string | null;
          seats?: number | null;
          status?: Database['public']['Enums']['car_status'] | null;
          title?: string | null;
          transmission?: Database['public']['Enums']['transmission'] | null;
          updated_at?: string | null;
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
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cars_region_id_fkey';
            columns: ['region_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_regions';
            referencedColumns: ['id'];
          },
        ];
      };
      v_deposits_with_fgo_contributions: {
        Row: {
          alpha_percentage: number | null;
          deposit_cents: number | null;
          deposit_ref: string | null;
          deposit_timestamp: string | null;
          deposit_usd: number | null;
          fgo_contribution_cents: number | null;
          fgo_contribution_timestamp: string | null;
          fgo_contribution_usd: number | null;
          fgo_movement_id: string | null;
          fgo_ref: string | null;
          user_id: string | null;
          user_name: string | null;
          wallet_ledger_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_fgo_monthly_summary: {
        Row: {
          month: string | null;
          movement_count: number | null;
          movement_type: string | null;
          net_change_cents: number | null;
          subfund_type: string | null;
          total_credits_cents: number | null;
          total_debits_cents: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fgo_movements_subfund_type_fkey';
            columns: ['subfund_type'];
            isOneToOne: false;
            referencedRelation: 'fgo_subfunds';
            referencedColumns: ['subfund_type'];
          },
        ];
      };
      v_fgo_movements_detailed: {
        Row: {
          amount_cents: number | null;
          balance_change_cents: number | null;
          booking_id: string | null;
          car_id: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_name: string | null;
          id: string | null;
          meta: Json | null;
          movement_type: string | null;
          operation: string | null;
          ref: string | null;
          subfund_type: string | null;
          ts: string | null;
          user_id: string | null;
          user_name: string | null;
          wallet_ledger_id: string | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fgo_movements_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_subfund_type_fkey';
            columns: ['subfund_type'];
            isOneToOne: false;
            referencedRelation: 'fgo_subfunds';
            referencedColumns: ['subfund_type'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_deposits_with_fgo_contributions';
            referencedColumns: ['wallet_ledger_id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_ledger_history';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['ledger_entry_id'];
          },
          {
            foreignKeyName: 'fgo_movements_wallet_ledger_id_fkey';
            columns: ['wallet_ledger_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_ledger';
            referencedColumns: ['id'];
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
      v_payment_authorizations: {
        Row: {
          amount_authorized_cents: number | null;
          amount_captured_cents: number | null;
          amount_usd: number | null;
          authorization_status: string | null;
          authorized_at: string | null;
          booking_id: string | null;
          canceled_at: string | null;
          captured_at: string | null;
          card_last4: string | null;
          created_at: string | null;
          currency: string | null;
          expires_at: string | null;
          id: string | null;
          idempotency_key: string | null;
          is_expired: boolean | null;
          is_hold: boolean | null;
          payment_method_id: string | null;
          status: Database['public']['Enums']['payment_status'] | null;
          user_id: string | null;
          user_name: string | null;
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
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
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
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'payments_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
        ];
      };
      v_risk_analytics: {
        Row: {
          booking_id: string | null;
          booking_status: Database['public']['Enums']['booking_status'] | null;
          bucket: string | null;
          days_until_checkin: number | null;
          end_at: string | null;
          fx_outdated: boolean | null;
          fx_snapshot: number | null;
          fx_snapshot_date: string | null;
          guarantee_amount_ars: number | null;
          guarantee_amount_cents: number | null;
          guarantee_amount_usd: number | null;
          guarantee_type: string | null;
          has_card: boolean | null;
          hold_expired: boolean | null;
          rental_duration_days: number | null;
          requires_revalidation: boolean | null;
          rollover_franchise_usd: number | null;
          standard_franchise_usd: number | null;
          start_at: string | null;
          total_amount: number | null;
        };
        Relationships: [];
      };
      v_user_ledger_history: {
        Row: {
          amount_cents: number | null;
          balance_change_cents: number | null;
          booking_id: string | null;
          booking_status: Database['public']['Enums']['booking_status'] | null;
          car_id: string | null;
          created_at: string | null;
          id: string | null;
          kind: Database['public']['Enums']['ledger_kind'] | null;
          meta: Json | null;
          ref: string | null;
          transaction_id: string | null;
          ts: string | null;
          user_id: string | null;
        };
        Relationships: [
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
            referencedRelation: 'cars_with_main_photo';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_availability';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'mv_cars_search_index';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'my_cars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_car_id_fkey';
            columns: ['car_id'];
            isOneToOne: false;
            referencedRelation: 'v_cars_public';
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
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings_complete';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'deleted_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'my_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'owner_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_detailed';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_bookings_with_risk_snapshot';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'v_risk_analytics';
            referencedColumns: ['booking_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_history';
            referencedColumns: ['legacy_transaction_id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'v_wallet_transactions_legacy_compat';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'wallet_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_ledger_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_user_stats: {
        Row: {
          active_cars_count: number | null;
          cars_count: number | null;
          completed_bookings: number | null;
          full_name: string | null;
          id: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: Database['public']['Enums']['user_role'] | null;
          total_bookings_as_renter: number | null;
          total_spent: number | null;
        };
        Relationships: [];
      };
      v_wallet_history: {
        Row: {
          amount_cents: number | null;
          booking_id: string | null;
          currency: string | null;
          id: string | null;
          ledger_created_at: string | null;
          ledger_entry_id: string | null;
          ledger_ref: string | null;
          legacy_completed_at: string | null;
          legacy_transaction_id: string | null;
          metadata: Json | null;
          source_system: string | null;
          status: string | null;
          transaction_date: string | null;
          transaction_type: string | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      v_wallet_transactions_legacy_compat: {
        Row: {
          admin_notes: string | null;
          amount: number | null;
          completed_at: string | null;
          created_at: string | null;
          currency: string | null;
          description: string | null;
          id: string | null;
          is_withdrawable: boolean | null;
          ledger_id: string | null;
          migrated_to_ledger: boolean | null;
          provider: string | null;
          provider_metadata: Json | null;
          provider_transaction_id: string | null;
          reference_id: string | null;
          reference_type: string | null;
          status: string | null;
          type: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          amount?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string | null;
          is_withdrawable?: boolean | null;
          ledger_id?: never;
          migrated_to_ledger?: never;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number | null;
          completed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string | null;
          is_withdrawable?: boolean | null;
          ledger_id?: never;
          migrated_to_ledger?: never;
          provider?: string | null;
          provider_metadata?: Json | null;
          provider_transaction_id?: string | null;
          reference_id?: string | null;
          reference_type?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      v_wallet_transfers_summary: {
        Row: {
          amount_cents: number | null;
          completed_at: string | null;
          created_at: string | null;
          from_user: string | null;
          from_user_name: string | null;
          id: string | null;
          ref: string | null;
          status: string | null;
          to_user: string | null;
          to_user_name: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_from_user_fkey';
            columns: ['from_user'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transfers_to_user_fkey';
            columns: ['to_user'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
      wallet_user_aggregates: {
        Row: {
          locked_cents: number | null;
          protected_credit_cents: number | null;
          total_cents: number | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'me_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_car_owner_info';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'v_user_stats';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      activate_insurance_coverage: {
        Args: { p_addon_ids?: string[]; p_booking_id: string };
        Returns: string;
      };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      adjust_alpha_dynamic: {
        Args: { p_bucket?: string; p_country_code?: string };
        Returns: Json;
      };
      assign_wallet_account_number: {
        Args: { p_user_id: string };
        Returns: string;
      };
      auth_complete_registration:
        | {
            Args: { p_name: string; p_phone: string; p_role?: string };
            Returns: Json;
          }
        | {
            Args: {
              country_param?: string;
              dni_param: string;
              full_name_param: string;
              phone_param: string;
            };
            Returns: Json;
          };
      auth_get_current_profile: { Args: never; Returns: Json };
      auth_request_verification:
        | {
            Args: {
              p_id_back_url?: string;
              p_id_front_url?: string;
              p_id_number?: string;
              p_id_type?: string;
              p_verification_type: string;
            };
            Returns: Json;
          }
        | {
            Args: { user_id_param: string; verification_type_param: string };
            Returns: Json;
          };
      autoclose_tracking_if_returned: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      booking_charge_wallet_funds: {
        Args: { p_booking_id: string; p_description?: string };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      booking_confirm_and_release: {
        Args: {
          p_booking_id: string;
          p_confirming_user_id: string;
          p_damage_amount?: number;
          p_damage_description?: string;
          p_has_damages?: boolean;
        };
        Returns: {
          completion_status: string;
          funds_released: boolean;
          message: string;
          owner_confirmed: boolean;
          renter_confirmed: boolean;
          success: boolean;
          waiting_for: string;
        }[];
      };
      booking_mark_as_returned: {
        Args: { p_booking_id: string; p_returned_by: string };
        Returns: {
          completion_status: string;
          message: string;
          success: boolean;
        }[];
      };
      calculate_deductible: {
        Args: { p_car_id: string; p_policy_id: string };
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
      calculate_platform_fee: { Args: { p_amount: number }; Returns: number };
      calculate_rc_v1_1: {
        Args: { p_bucket?: string; p_country_code?: string };
        Returns: Json;
      };
      calculate_withdrawal_fee: { Args: { p_amount: number }; Returns: number };
      can_manage_car: { Args: { _car: string }; Returns: boolean };
      cancel_payment_authorization: {
        Args: { p_payment_id: string };
        Returns: {
          canceled_at: string;
          message: string;
          success: boolean;
        }[];
      };
      cancel_preauth: { Args: { p_intent_id: string }; Returns: undefined };
      cancel_with_fee: {
        Args: { p_booking_id: string };
        Returns: {
          cancel_fee: number;
        }[];
      };
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
      cleanup_e2e_test_data: { Args: never; Returns: undefined };
      cleanup_old_data: {
        Args: { days_to_keep?: number };
        Returns: {
          rows_deleted: number;
          table_name: string;
        }[];
      };
      cleanup_old_pending_deposits: {
        Args: never;
        Returns: {
          cleaned_count: number;
          message: string;
        }[];
      };
      compute_cancel_fee: {
        Args: { p_booking_id: string; p_now?: string };
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
      create_review: {
        Args: {
          p_booking_id: string;
          p_car_id: string;
          p_comment_private?: string;
          p_comment_public?: string;
          p_rating_accuracy: number;
          p_rating_checkin: number;
          p_rating_cleanliness: number;
          p_rating_communication: number;
          p_rating_location: number;
          p_rating_value: number;
          p_review_type: string;
          p_reviewee_id: string;
          p_reviewer_id: string;
        };
        Returns: string;
      };
      create_review_v2: {
        Args: {
          p_booking_id: string;
          p_car_id: string;
          p_comment_private?: string;
          p_comment_public?: string;
          p_rating_accuracy: number;
          p_rating_checkin: number;
          p_rating_cleanliness: number;
          p_rating_communication: number;
          p_rating_location: number;
          p_rating_value: number;
          p_review_type: string;
          p_reviewee_id: string;
          p_reviewer_id: string;
        };
        Returns: string;
      };
      create_test_user_profile: {
        Args: {
          p_balance?: number;
          p_full_name: string;
          p_is_admin?: boolean;
          p_phone: string;
          p_role: Database['public']['Enums']['user_role'];
          p_user_id: string;
        };
        Returns: undefined;
      };
      cron_execute_job: { Args: { job_name: string }; Returns: undefined };
      current_user_id: { Args: never; Returns: string };
      db_health_check: {
        Args: never;
        Returns: {
          metric: string;
          recommendation: string;
          status: string;
          value: string;
        }[];
      };
      db_statistics_detail: {
        Args: never;
        Returns: {
          dead_ratio: number;
          dead_rows: number;
          live_rows: number;
          status: string;
          table_name: string;
          total_size: string;
        }[];
      };
      decrypt_message: { Args: { ciphertext: string }; Returns: string };
      disablelongtransactions: { Args: never; Returns: string };
      disconnect_mercadopago: { Args: never; Returns: Json };
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          };
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          };
      enablelongtransactions: { Args: never; Returns: string };
      encrypt_message: { Args: { plaintext: string }; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      estimate_total_amount:
        | {
            Args: { p_car_id: string; p_end: string; p_start: string };
            Returns: number;
          }
        | { Args: { booking_id_param: string }; Returns: number };
      expire_pending_bookings: {
        Args: never;
        Returns: {
          expired_count: number;
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
      flag_review: {
        Args: { p_reason: string; p_review_id: string; p_user_id: string };
        Returns: boolean;
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
      generate_wallet_account_number: { Args: never; Returns: string };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
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
          price_per_day_cents: number;
          status: string;
          total_bookings: number;
          updated_at: string;
          year: number;
        }[];
      };
      get_car_availability: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: {
          booking_id: string;
          date: string;
          is_available: boolean;
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
      get_current_fx_rate: {
        Args: { p_from_currency: string; p_to_currency: string };
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
      get_latest_exchange_rate: {
        Args: { p_from_currency: string; p_to_currency: string };
        Returns: number;
      };
      get_mercadopago_token: { Args: { profile_id: string }; Returns: string };
      get_platform_rate: { Args: { p_pair: string }; Returns: number };
      get_unread_messages_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_user_public_stats: { Args: { target_user_id: string }; Returns: Json };
      get_user_wallet_history: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string };
        Returns: {
          amount_cents: number;
          booking_id: string;
          currency: string;
          description: string;
          id: string;
          source_system: string;
          status: string;
          transaction_date: string;
          transaction_type: string;
        }[];
      };
      get_wallet_balance: { Args: { p_user_id: string }; Returns: number };
      get_wallet_migration_stats: {
        Args: never;
        Returns: {
          ledger_only_entries: number;
          migrated_to_ledger: number;
          migration_percentage: number;
          pending_migration: number;
          total_legacy_transactions: number;
        }[];
      };
      gettransactionid: { Args: never; Returns: unknown };
      has_booking_conflict: {
        Args: { p_car_id: string; p_end: string; p_start: string };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_booking_owner: { Args: { booking_id_param: string }; Returns: boolean };
      is_booking_participant: {
        Args: { booking_id_param: string };
        Returns: boolean;
      };
      is_booking_renter: {
        Args: { booking_id_param: string };
        Returns: boolean;
      };
      is_car_available: {
        Args: { p_car_id: string; p_end_date: string; p_start_date: string };
        Returns: boolean;
      };
      is_car_owner: { Args: { car_id_param: string }; Returns: boolean };
      log_soft_delete: {
        Args: { p_entity_id: string; p_entity_type: string; p_reason?: string };
        Returns: undefined;
      };
      longtransactionsenabled: { Args: never; Returns: boolean };
      mark_conversation_as_read: {
        Args: { p_booking_id?: string; p_car_id?: string; p_user_id?: string };
        Returns: number;
      };
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      pricing_recalculate: {
        Args: { p_booking_id: string };
        Returns: {
          actual_end_at: string | null;
          actual_start_at: string | null;
          authorized_payment_id: string | null;
          breakdown: Json | null;
          cancellation_fee_cents: number | null;
          cancellation_policy_id: number | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          car_id: string;
          completion_status: string | null;
          coverage_upgrade: string | null;
          created_at: string;
          currency: string;
          days_count: number | null;
          deleted_at: string | null;
          deposit_amount_cents: number | null;
          deposit_held: boolean | null;
          deposit_lock_transaction_id: string | null;
          deposit_release_transaction_id: string | null;
          deposit_released_at: string | null;
          deposit_status: string | null;
          discounts_cents: number | null;
          dropoff_confirmed_at: string | null;
          dropoff_confirmed_by: string | null;
          dropoff_location: unknown;
          end_at: string;
          expires_at: string | null;
          fees_cents: number | null;
          funds_released_at: string | null;
          guarantee_amount_cents: number | null;
          guarantee_type: string | null;
          has_active_claim: boolean | null;
          hold_authorization_id: string | null;
          hold_expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          insurance_cents: number | null;
          insurance_coverage_id: string | null;
          insurance_premium_total: number | null;
          mercadopago_init_point: string | null;
          mercadopago_preference_id: string | null;
          metadata: Json;
          nightly_rate_cents: number | null;
          notes: string | null;
          owner_confirmation_at: string | null;
          owner_confirmed_delivery: boolean | null;
          owner_damage_amount: number | null;
          owner_damage_description: string | null;
          owner_payment_amount: number | null;
          owner_reported_damages: boolean | null;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_mode: string | null;
          payment_split_completed: boolean | null;
          payment_split_validated_at: string | null;
          pickup_confirmed_at: string | null;
          pickup_confirmed_by: string | null;
          pickup_location: unknown;
          platform_fee: number | null;
          reauthorization_count: number | null;
          rental_amount_cents: number | null;
          rental_lock_transaction_id: string | null;
          rental_payment_transaction_id: string | null;
          renter_confirmation_at: string | null;
          renter_confirmed_payment: boolean | null;
          renter_id: string;
          requires_revalidation: boolean | null;
          returned_at: string | null;
          risk_snapshot_booking_id: string | null;
          risk_snapshot_date: string | null;
          security_deposit_amount: number | null;
          start_at: string;
          status: Database['public']['Enums']['booking_status'];
          subtotal_cents: number | null;
          time_range: unknown;
          time_range_gen: unknown;
          total_amount: number;
          total_cents: number | null;
          total_price_ars: number | null;
          updated_at: string;
          wallet_amount_cents: number | null;
          wallet_charged_at: string | null;
          wallet_lock_id: string | null;
          wallet_lock_transaction_id: string | null;
          wallet_refunded_at: string | null;
          wallet_status: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'bookings';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      publish_pending_reviews: {
        Args: never;
        Returns: {
          published_count: number;
        }[];
      };
      publish_reviews_if_both_completed: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      quote_booking: {
        Args: {
          p_car_id: string;
          p_end: string;
          p_promo?: string;
          p_start: string;
        };
        Returns: {
          discount: number;
          price_subtotal: number;
          service_fee: number;
          total: number;
        }[];
      };
      refresh_all_materialized_views: { Args: never; Returns: undefined };
      refresh_cars_search_index: { Args: never; Returns: undefined };
      register_payment_split: {
        Args: {
          p_booking_id: string;
          p_currency?: string;
          p_mp_payment_id: string;
          p_total_amount_cents: number;
        };
        Returns: string;
      };
      report_insurance_claim: {
        Args: {
          p_booking_id: string;
          p_claim_type: string;
          p_description: string;
          p_incident_date: string;
          p_location?: string;
          p_photos?: Json;
        };
        Returns: string;
      };
      request_booking: {
        Args: { p_car_id: string; p_end: string; p_start: string };
        Returns: Json;
      };
      restore_deleted_booking: {
        Args: { booking_id: string };
        Returns: boolean;
      };
      restore_deleted_car: { Args: { car_id: string }; Returns: boolean };
      rotate_encryption_key: { Args: never; Returns: string };
      save_exchange_rate: {
        Args: {
          p_from_currency: string;
          p_metadata?: Json;
          p_rate: number;
          p_source?: string;
          p_to_currency: string;
        };
        Returns: string;
      };
      search_available_cars: {
        Args: {
          p_city?: string;
          p_end?: string;
          p_fuel_type?: Database['public']['Enums']['fuel_type'];
          p_max_price?: number;
          p_min_price?: number;
          p_min_seats?: number;
          p_start?: string;
          p_transmission?: Database['public']['Enums']['transmission'];
        };
        Returns: {
          brand: string | null;
          brand_id: string;
          brand_text_backup: string;
          cancel_policy: Database['public']['Enums']['cancel_policy'];
          color: string | null;
          created_at: string;
          currency: string;
          deleted_at: string | null;
          delivery_options: Json | null;
          deposit_amount: number | null;
          deposit_required: boolean | null;
          description: string | null;
          doors: number | null;
          features: Json;
          fuel: Database['public']['Enums']['fuel_type'];
          has_owner_insurance: boolean | null;
          id: string;
          insurance_included: boolean | null;
          location_city: string | null;
          location_country: string | null;
          location_formatted_address: string | null;
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
          model_id: string;
          model_text_backup: string;
          owner_id: string;
          owner_insurance_policy_id: string | null;
          payment_methods: Json | null;
          plate: string | null;
          price_per_day: number;
          rating_avg: number | null;
          rating_count: number | null;
          region_id: string | null;
          seats: number | null;
          status: Database['public']['Enums']['car_status'];
          terms_and_conditions: string | null;
          title: string;
          transmission: Database['public']['Enums']['transmission'];
          updated_at: string;
          vin: string | null;
          year: number | null;
        }[];
        SetofOptions: {
          from: '*';
          to: 'cars';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      search_transactions_by_payment_id: {
        Args: { p_payment_id: string };
        Returns: {
          amount_cents: number;
          id: string;
          metadata: Json;
          source_system: string;
          transaction_date: string;
          transaction_type: string;
          user_id: string;
        }[];
      };
      search_users_by_wallet_number: {
        Args: { p_query: string };
        Returns: {
          avatar_url: string;
          email: string;
          full_name: string;
          id: string;
          wallet_account_number: string;
        }[];
      };
      send_encrypted_message: {
        Args: {
          p_body?: string;
          p_booking_id?: string;
          p_car_id?: string;
          p_recipient_id?: string;
        };
        Returns: string;
      };
      set_avatar: { Args: { _public_url: string }; Returns: undefined };
      set_default_bank_account: {
        Args: { p_bank_account_id: string };
        Returns: boolean;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
      soft_delete_booking: { Args: { booking_id: string }; Returns: boolean };
      soft_delete_car: { Args: { car_id: string }; Returns: boolean };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      sync_binance_rates_direct: { Args: never; Returns: Json };
      sync_binance_rates_via_edge_function: { Args: never; Returns: undefined };
      trigger_poll_pending_payments: { Args: never; Returns: undefined };
      unaccent: { Args: { '': string }; Returns: string };
      unlockrows: { Args: { '': string }; Returns: number };
      update_all_demand_snapshots: { Args: never; Returns: undefined };
      update_car_stats: { Args: { p_car_id: string }; Returns: undefined };
      update_car_stats_for_booking: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      update_demand_snapshot: {
        Args: { p_region_id: string };
        Returns: undefined;
      };
      update_exchange_rates_manual: { Args: never; Returns: undefined };
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
      update_pricing_demand_snapshot: { Args: never; Returns: undefined };
      update_profile_safe: {
        Args: { _payload: Json };
        Returns: {
          address_line1: string | null;
          address_line2: string | null;
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          currency: string | null;
          deleted_at: string | null;
          dni: string | null;
          driver_license_country: string | null;
          driver_license_expiry: string | null;
          driver_license_number: string | null;
          email_verified: boolean | null;
          full_name: string | null;
          gov_id_number: string | null;
          gov_id_type: string | null;
          id: string;
          id_verified: boolean | null;
          is_admin: boolean | null;
          is_driver_verified: boolean | null;
          is_email_verified: boolean | null;
          is_phone_verified: boolean | null;
          kyc: Database['public']['Enums']['kyc_status'];
          locale: string | null;
          marketing_opt_in: boolean | null;
          mercadopago_access_token: string | null;
          mercadopago_access_token_expires_at: string | null;
          mercadopago_account_type: string | null;
          mercadopago_collector_id: string | null;
          mercadopago_connected: boolean | null;
          mercadopago_connected_at: string | null;
          mercadopago_country: string | null;
          mercadopago_oauth_state: string | null;
          mercadopago_public_key: string | null;
          mercadopago_refresh_token: string | null;
          mercadopago_site_id: string | null;
          notif_prefs: Json | null;
          onboarding: Database['public']['Enums']['onboarding_status'];
          phone: string | null;
          phone_verified: boolean | null;
          postal_code: string | null;
          rating_avg: number | null;
          rating_count: number | null;
          role: Database['public']['Enums']['user_role'];
          state: string | null;
          stripe_customer_id: string | null;
          timezone: string | null;
          tos_accepted_at: string | null;
          updated_at: string;
          wallet_account_number: string | null;
          whatsapp: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_user_stats: { Args: { p_user_id: string }; Returns: undefined };
      update_user_stats_for_booking: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      update_user_stats_v2_for_booking: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
      upsert_exchange_rate:
        | {
            Args: {
              p_binance_rate: number;
              p_margin_percent?: number;
              p_pair: string;
              p_source?: string;
            };
            Returns: Json;
          }
        | {
            Args: {
              p_binance_rate: number;
              p_margin_percent?: number;
              p_pair: string;
              p_volatility_24h?: number;
            };
            Returns: Json;
          };
      user_can_review: { Args: { _booking: string }; Returns: boolean };
      wallet_approve_withdrawal: {
        Args: { p_admin_notes?: string; p_request_id: string };
        Returns: {
          amount: number;
          message: string;
          provider: string;
          recipient: string;
          success: boolean;
        }[];
      };
      wallet_capture_hold: {
        Args: {
          p_amount: number;
          p_recipient_id: string;
          p_reference_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      wallet_charge_rental: {
        Args: {
          p_amount_cents: number;
          p_booking_id: string;
          p_meta?: Json;
          p_ref: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      wallet_complete_booking: {
        Args: { p_booking_id: string; p_completion_notes?: string };
        Returns: {
          amount_to_owner: number;
          amount_to_renter: number;
          deposit_release_transaction_id: string;
          message: string;
          platform_fee: number;
          platform_fee_transaction_id: string;
          rental_payment_transaction_id: string;
          success: boolean;
        }[];
      };
      wallet_complete_booking_with_damages: {
        Args: {
          p_booking_id: string;
          p_damage_amount: number;
          p_damage_description: string;
        };
        Returns: {
          amount_returned_to_renter: number;
          amount_to_owner: number;
          damage_charge_transaction_id: string;
          damage_charged: number;
          deposit_release_transaction_id: string;
          message: string;
          platform_fee: number;
          platform_fee_transaction_id: string;
          rental_payment_transaction_id: string;
          success: boolean;
        }[];
      };
      wallet_complete_withdrawal: {
        Args: {
          p_provider_metadata?: Json;
          p_provider_transaction_id: string;
          p_request_id: string;
        };
        Returns: {
          message: string;
          success: boolean;
          wallet_transaction_id: string;
        }[];
      };
      wallet_confirm_deposit: {
        Args: {
          p_provider_metadata?: Json;
          p_provider_transaction_id: string;
          p_transaction_id: string;
        };
        Returns: {
          message: string;
          new_available_balance: number;
          success: boolean;
        }[];
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
      wallet_convert_to_withdrawable: {
        Args: { p_reason?: string; p_transaction_id: string };
        Returns: {
          message: string;
          new_non_withdrawable_floor: number;
          success: boolean;
          transaction_id: string;
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
      wallet_expire_pending_deposits: {
        Args: { p_older_than?: unknown };
        Returns: {
          expired_count: number;
          message: string;
          total_amount: number;
        }[];
      };
      wallet_fail_withdrawal: {
        Args: { p_failure_reason: string; p_request_id: string };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      wallet_get_balance: {
        Args: never;
        Returns: {
          available_balance: number;
          currency: string;
          locked_balance: number;
          protected_credit_balance: number;
          total_balance: number;
          transferable_balance: number;
          withdrawable_balance: number;
        }[];
      };
      wallet_get_withdrawable_balance: {
        Args: never;
        Returns: {
          available_balance: number;
          locked_balance: number;
          non_withdrawable_floor: number;
          total_balance: number;
          withdrawable_balance: number;
        }[];
      };
      wallet_hold_funds: {
        Args: {
          p_amount: number;
          p_reference_id: string;
          p_reference_type: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      wallet_initiate_deposit: {
        Args: {
          p_allow_withdrawal?: boolean;
          p_amount: number;
          p_description?: string;
          p_provider?: string;
        };
        Returns: {
          is_withdrawable: boolean;
          message: string;
          payment_mobile_deep_link: string;
          payment_provider: string;
          payment_url: string;
          status: string;
          success: boolean;
          transaction_id: string;
        }[];
      };
      wallet_lock_funds: {
        Args: { p_amount: number; p_booking_id: string; p_description?: string };
        Returns: {
          message: string;
          new_available_balance: number;
          new_locked_balance: number;
          success: boolean;
          transaction_id: string;
        }[];
      };
      wallet_lock_rental_and_deposit: {
        Args: {
          p_booking_id: string;
          p_deposit_amount?: number;
          p_rental_amount: number;
        };
        Returns: {
          deposit_lock_transaction_id: string;
          message: string;
          new_available_balance: number;
          new_locked_balance: number;
          rental_lock_transaction_id: string;
          success: boolean;
          total_locked: number;
        }[];
      };
      wallet_release_hold: {
        Args: { p_amount: number; p_reference_id: string; p_user_id: string };
        Returns: Json;
      };
      wallet_request_withdrawal: {
        Args: {
          p_amount: number;
          p_bank_account_id: string;
          p_user_notes?: string;
        };
        Returns: {
          fee_amount: number;
          message: string;
          net_amount: number;
          new_available_balance: number;
          request_id: string;
          success: boolean;
        }[];
      };
      wallet_transfer: {
        Args: {
          p_amount_cents: number;
          p_from_user: string;
          p_meta?: Json;
          p_ref: string;
          p_to_user: string;
        };
        Returns: Json;
      };
      wallet_unlock_funds: {
        Args: { p_booking_id: string; p_description?: string };
        Returns: {
          message: string;
          new_available_balance: number;
          new_locked_balance: number;
          success: boolean;
          transaction_id: string;
          unlocked_amount: number;
        }[];
      };
    };
    Enums: {
      booking_status:
        | 'pending'
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show'
        | 'expired';
      cancel_policy: 'flex' | 'moderate' | 'strict';
      car_status: 'draft' | 'active' | 'suspended' | 'maintenance';
      dispute_kind: 'damage' | 'no_show' | 'late_return' | 'other';
      dispute_status: 'open' | 'in_review' | 'resolved' | 'rejected';
      document_kind: 'gov_id_front' | 'gov_id_back' | 'driver_license' | 'utility_bill' | 'selfie';
      fuel_type: 'nafta' | 'gasoil' | 'hibrido' | 'electrico';
      kyc_status: 'not_started' | 'pending' | 'verified' | 'rejected';
      ledger_kind:
        | 'deposit'
        | 'transfer_out'
        | 'transfer_in'
        | 'rental_charge'
        | 'rental_payment'
        | 'refund'
        | 'franchise_user'
        | 'franchise_fund'
        | 'withdrawal'
        | 'adjustment'
        | 'bonus'
        | 'fee';
      notification_type:
        | 'new_booking_for_owner'
        | 'booking_cancelled_for_owner'
        | 'booking_cancelled_for_renter'
        | 'new_chat_message'
        | 'payment_successful'
        | 'payout_successful'
        | 'inspection_reminder'
        | 'generic_announcement';
      onboarding_status: 'incomplete' | 'complete';
      payment_provider: 'mercadopago' | 'stripe' | 'otro';
      payment_status:
        | 'requires_payment'
        | 'processing'
        | 'succeeded'
        | 'failed'
        | 'refunded'
        | 'partial_refund'
        | 'chargeback';
      rating_role: 'owner_rates_renter' | 'renter_rates_owner';
      transmission: 'manual' | 'automatic';
      user_role: 'renter' | 'owner' | 'admin' | 'both';
      vehicle_document_kind:
        | 'registration'
        | 'insurance'
        | 'technical_inspection'
        | 'circulation_permit'
        | 'ownership_proof';
      wallet_transaction_type:
        | 'deposit'
        | 'withdrawal'
        | 'payment'
        | 'refund'
        | 'lock'
        | 'unlock'
        | 'rental_payment_lock'
        | 'rental_payment_transfer'
        | 'security_deposit_lock'
        | 'security_deposit_release'
        | 'security_deposit_charge';
      webhook_status: 'pending' | 'processed' | 'error';
      withdrawal_status:
        | 'pending'
        | 'approved'
        | 'processing'
        | 'completed'
        | 'failed'
        | 'rejected'
        | 'cancelled';
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
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
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'expired',
      ],
      cancel_policy: ['flex', 'moderate', 'strict'],
      car_status: ['draft', 'active', 'suspended', 'maintenance'],
      dispute_kind: ['damage', 'no_show', 'late_return', 'other'],
      dispute_status: ['open', 'in_review', 'resolved', 'rejected'],
      document_kind: ['gov_id_front', 'gov_id_back', 'driver_license', 'utility_bill', 'selfie'],
      fuel_type: ['nafta', 'gasoil', 'hibrido', 'electrico'],
      kyc_status: ['not_started', 'pending', 'verified', 'rejected'],
      ledger_kind: [
        'deposit',
        'transfer_out',
        'transfer_in',
        'rental_charge',
        'rental_payment',
        'refund',
        'franchise_user',
        'franchise_fund',
        'withdrawal',
        'adjustment',
        'bonus',
        'fee',
      ],
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
      onboarding_status: ['incomplete', 'complete'],
      payment_provider: ['mercadopago', 'stripe', 'otro'],
      payment_status: [
        'requires_payment',
        'processing',
        'succeeded',
        'failed',
        'refunded',
        'partial_refund',
        'chargeback',
      ],
      rating_role: ['owner_rates_renter', 'renter_rates_owner'],
      transmission: ['manual', 'automatic'],
      user_role: ['renter', 'owner', 'admin', 'both'],
      vehicle_document_kind: [
        'registration',
        'insurance',
        'technical_inspection',
        'circulation_permit',
        'ownership_proof',
      ],
      wallet_transaction_type: [
        'deposit',
        'withdrawal',
        'payment',
        'refund',
        'lock',
        'unlock',
        'rental_payment_lock',
        'rental_payment_transfer',
        'security_deposit_lock',
        'security_deposit_release',
        'security_deposit_charge',
      ],
      webhook_status: ['pending', 'processed', 'error'],
      withdrawal_status: [
        'pending',
        'approved',
        'processing',
        'completed',
        'failed',
        'rejected',
        'cancelled',
      ],
    },
  },
} as const;
