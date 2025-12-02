# Reporte de Conciliación BD Autorenta
**Fecha:** 2025-12-01

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Migraciones en Producción | 91 |
| Archivos de migración locales | 229 |
| Migraciones en PROD sin archivo local | 84 |
| Archivos locales NO aplicados en PROD | 205 |

## Diagnóstico

**PROBLEMA CRÍTICO:** Hay una divergencia masiva entre el código local y producción.

1. **84 migraciones** fueron aplicadas directamente en producción sin crear archivos de migración locales
2. **205 archivos de migración** existen localmente pero nunca se aplicaron en producción

Esto sugiere que se han hecho cambios manuales extensivos en producción sin seguir el flujo de migraciones.

---

## Migraciones en PROD sin archivo local (84)

Estas migraciones se aplicaron directamente en producción:

### 20251115 - Seeders y configuración inicial
- `20251115072804` - create_onboarding_status_enum_and_column_final
- `20251115073313` - seed_exchange_rates_corrected
- `20251115073731` - seed_test_data_step1_cars
- `20251115074136` - fix_auto_complete_first_booking_milestone_trigger
- `20251115074146` - seed_bookings_final
- `20251115074240` - seed_payment_intents_and_payments
- `20251115074302` - seed_reviews
- `20251115074438` - seed_steps_5_to_6
- `20251115074642` - seed_steps_8_to_11_v3
- `20251115075142` - create_wallet_and_inspection_tables
- `20251115075158` - add_missing_booking_columns
- `20251115075210` - enable_rls_wallet_inspections
- `20251115075229` - create_wallet_rpc_functions
- `20251115075404` - fix_trigger_accounting_commission
- `20251115075457` - drop_problematic_trigger
- `20251115075459` - seed_final_attempt

### 20251115 - Sistema contable
- `20251115080038` - create_accounting_journal_entries
- `20251115080207` - fix_create_journal_entry_function
- `20251115080621` - fix_accounting_functions_table_names_v2
- `20251115081314` - create_accounting_frontend_views
- `20251115084725` - fix_wallet_get_balance_drop_first
- `20251115085937` - create_accounting_wallet_deposit_trigger
- `20251115090007` - fix_accounting_wallet_deposit_trigger_sequence
- `20251115090034` - fix_accounting_wallet_deposit_trigger_columns
- `20251115090110` - fix_accounting_wallet_deposit_trigger_account
- `20251115090224` - create_accounting_cancellation_fee_trigger
- `20251115090259` - create_accounting_delivery_fee_trigger
- `20251115090701` - drop_old_autorentar_credit_functions
- `20251115090727` - create_autorentar_credit_rpc_functions_v2
- `20251115090820` - update_wallet_transactions_constraints_for_credit
- `20251115090900` - create_autorentar_credit_accounting_accounts
- `20251115090935` - create_accounting_autorentar_credit_triggers
- `20251115221008` - fix_wallet_lock_rental_with_separated_balances

### 20251116 - Booking y scoring
- `20251116064015` - add_security_deposit_usd_to_cars
- `20251116065157` - fix_get_available_cars_reviews_join
- `20251116065214` - fix_get_available_cars_currency_type
- `20251116071105` - fix_request_booking_total_amount
- `20251116071609` - create_activate_insurance_coverage_function
- `20251116081507` - fix_request_booking_pending_payment_availability
- `20251116081745` - create_insurance_tables
- `20251116090217` - cancel_conflicting_pending_by_renter
- `20251116090325` - fix_request_booking_cancel_conflicting_v3
- `20251116090450` - add_metadata_column_to_bookings
- `20251116105054` - add_get_available_cars_scoring_20251116
- `20251116120206` - fix_scoring_weights_v2
- `20251116124510` - 20251116_fix_distance_priority_scoring
- `20251116124834` - 20251116_increase_close_distance_weight
- `20251116125010` - 20251116_aggressive_close_distance_priority
- `20251116131420` - 20251117_prioritize_close_distance_scoring
- `20251116131517` - 20251117_prioritize_close_distance_scoring_v2
- `20251116131604` - 20251117_reduce_price_weight_for_close_distance
- `20251116131637` - 20251117_maximize_close_distance_priority
- `20251116131912` - 20251117_fix_function_overload_conflict
- `20251116213050` - create_request_booking_rpc
- `20251116213310` - create_request_booking_rpc
- `20251116213348` - create_request_booking_rpc
- `20251116214001` - create_request_booking_rpc_v2
- `20251116214038` - create_request_booking_rpc_v3
- `20251116214659` - wallet_lock_stub
- `20251116214708` - check_availability

### 20251117-20251127 - Seguridad y optimizaciones
- `20251117164501` - 20251117_add_event_id_to_mp_webhook_logs
- `20251119222750` - add_wallet_transactions_amount_constraint
- `20251119222900` - add_admin_validation_to_wallet_confirm_deposit_admin
- `20251119225248` - add_security_validation_wallet_lock_funds
- `20251119225311` - add_security_validation_wallet_unlock_funds
- `20251119225339` - add_security_validation_wallet_initiate_deposit
- `20251119225409` - add_security_validation_wallet_deposit_ledger
- `20251119225440` - add_security_validation_process_split_payment
- `20251119230004` - add_security_validation_wallet_charge_refund_transfer
- `20251119230506` - add_security_validation_booking_functions_v3
- `20251120025949` - fix_total_amount_cents_schema_cache_refresh
- `20251126111509` - add_missing_fk_indexes
- `20251126112558` - optimize_rls_policies_batch1_simple_tables
- `20251126112630` - optimize_rls_policies_batch2_complex_tables
- `20251126112702` - optimize_rls_policies_batch3_booking_tables
- `20251126112717` - optimize_rls_policies_batch4_payment_tables
- `20251126113046` - create_rpc_batch_cars_availability
- `20251126113137` - fix_function_search_path_batch1
- `20251126113201` - fix_function_search_path_batch2_fixed
- `20251126113211` - fix_function_search_path_batch3
- `20251126113221` - fix_function_search_path_batch4
- `20251126113314` - add_missing_rls_policies_fixed
- `20251127005439` - wallet_debit_for_damage_rpc
- `20251127070010` - create_car_blocked_dates_table
- `20251127070550` - fix_car_blocked_dates_columns

---

## Archivos locales NO aplicados en PROD (205)

Estos archivos existen pero nunca se aplicaron. Agrupados por fecha:

### Migraciones críticas pendientes (después de 20251127)
- `20251127_create_feature_flags.sql`
- `20251130_create_organizations_and_security.sql`
- `20251130_data_migration.sql`
- `20251130_fix_profile_missing_fields.sql`
- `20251130_fleet_incentives.sql`
- `20251130_update_cars_rls_for_orgs.sql`
- `20251201120000_add_disputes_module.sql`
- `20251201123000_add_contracts_geofencing_module.sql`
- `20251201130000_add_pricing_cancellation_module.sql`
- `20251201140000_update_car_latest_location_view.sql`
- `20251201_create_notification_settings.sql`
- `20251215_create_user_stats_table.sql`

---

## Recomendaciones

### Opción 1: Sincronizar historial (más segura)
1. Marcar las migraciones de producción en el historial local
2. Crear archivos de migración para documentar los cambios manuales
3. Aplicar solo las migraciones nuevas pendientes

### Opción 2: Reset completo (más riesgosa)
1. Exportar datos de producción
2. Reconstruir BD desde migraciones locales
3. Reimportar datos

### Acción inmediata recomendada:
Aplicar las migraciones pendientes más recientes (20251127+) que añaden funcionalidad nueva sin conflicto con lo existente en producción.
