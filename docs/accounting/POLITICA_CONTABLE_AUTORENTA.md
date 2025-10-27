# Política Contable AutoRenta (NIIF)

## 1. Alcance y objetivo
Establecer criterios uniformes para registrar, medir y presentar las operaciones del marketplace AutoRenta bajo NIIF 15 (ingresos), NIIF 37 (provisiones) y NIIF 38 (intangibles). La política aplica a todos los entornos (producción, staging) y se interpreta conjuntamente con la documentación técnica del ledger (`WALLET_LEDGER_IMPLEMENTATION.md`).

## 2. Reconocimiento de ingresos
- **Naturaleza**: AutoRenta actúa como agente; reconoce ingresos netos (comisiones, fees, mark ups de seguros).  
- **Momento**: cuando el locador confirma la entrega y la reserva pasa a `completed`. Los upgrades de seguro se reconocen al activar la cobertura (`booking_insurance_coverage`).  
- **Medición**: se toma el importe en la moneda funcional (ARS/USD). Si el flujo se realiza en USD se convierte al cierre diario usando la tasa de `exchange_rates.rate_effective`.  
- **Presentación**: se registra asiento `Cuenta 4.1 Ingresos por comisiones` contra `Cuenta 2.3 Pasivo por wallet`. Las promociones o descuentos se reconocen como menor ingreso.

## 3. Garantías y provisiones (NIIF 37)
- **Fondo de Garantía Operativo (FGO)**: se reconoce como pasivo restringido.  
  - Aportes: débito `Caja/Bancos`, crédito `Pasivo FGO`.  
  - Consumo por siniestro: débito `Pasivo FGO`, crédito `Caja/Bancos` o `Cuentas por cobrar`.  
- **Depósitos en garantía de locatarios**: permanecen como pasivo hasta la devolución.  
  - Bloqueo: crédito `Pasivo Depósitos`, débito `Caja restringida`.  
  - Liberación: asiento inverso.  
- **Reclamaciones**: cuando existe probabilidad y se puede estimar, registrar provisión en `Pasivo Provisiones Siniestros` con cargo a `Gasto Pérdidas por siniestro`. Actualizar contra el FGO al ejecutar.

## 4. Capitalización de desarrollo (NIIF 38)
- Clasificar tareas según si generan activo identificable.  
  - **Capitalizable**: módulos de ledger, automatizaciones FGO, funcionalidades de monetización (fase listos para uso).  
  - **Gasto**: investigación, pruebas de mercado, soporte post-release.  
- Condiciones: viabilidad técnica, intención de finalizar, capacidad de uso, recursos disponibles y medición fiable.  
- Reconocimiento: capitalizar costos directos (sueldos internos, contratistas, infraestructura asignable). Amortizar lineal en 3 años desde la puesta en producción. Mantener hoja de seguimiento por funcionalidad.

## 5. Ledger automático y conciliaciones
- Fuente confiable: tablas `wallet_ledger`, `accounting_ledger`, vistas `accounting_balance_sheet`, `accounting_income_statement`.  
- Cada evento operacional dispara asientos dobles vía RPC (`wallet_charge_rental`, `wallet_deposit_ledger`, `wallet_transfer`).  
- Conciliación diaria obligatoria usando `tools/accounting/export-ledger.mjs` y `supabase/functions/wallet-reconciliation`. Guardar resúmenes en `reports/accounting/`.  
- Resolver diferencias > USD 1 o ARS equivalente antes de liberar pagos a locadores.

## 6. Presentación de estados financieros
- **Moneda funcional**: ARS, con notas en USD para inversionistas.  
- **Estados mínimos**: Balance (situación financiera), Estado de resultados, Flujo de efectivo indirecto, Cambios en patrimonio, Notas (ingresos por comisión, reservas FGO, riesgo crediticio).  
- **Cierre mensual**: ejecutar `refresh_accounting_balances`, exportar ledger y emitir estados dentro de los 5 días hábiles siguientes.  
- **Revisión**: Contador responsable valida balances; CEO aprueba antes de compartir con terceros.

## 7. Controles internos
- Doble aprobación para retiros > USD 1 000 o equivalente.  
- Logs de auditoría habilitados en Supabase (`wallet_ledger_logs`).  
- Versionado de políticas en repositorio Git (`docs/accounting/`).  
- Seguimiento de KPIs financieros en `accounting_dashboard` (rentabilidad, liquidez FGO, aging de depósitos).

## 8. Políticas específicas adicionales
- **Impuestos**: aplicar retenciones según jurisdicción (IVA, Impuesto al Cheque). Registrar impuestos por pagar en pasivo corriente.  
- **Ingresos diferidos**: reservas en estado `confirmed` sin check-in permanecen en `Pasivo ingresos diferidos`.  
- **Desarrollos externos**: capitalizar solo si el contrato transfiere propiedad intelectual a AutoRenta.  
- **Reclasificaciones**: movimientos legacy (`wallet_transactions`) deben migrarse al ledger antes de cierre mensual.

## 9. Revisión y actualización
- Revisar política cada trimestre o ante cambios regulatorios.  
- Documentar versiones en changelog interno con fecha, responsable y secciones modificadas.
