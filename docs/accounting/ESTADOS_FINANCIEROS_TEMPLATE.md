# Plantilla Estados Financieros AutoRenta (NIIF)

Este documento define la estructura mínima para preparar estados financieros mensuales y trimestrales. Copiá las secciones y reemplazá los valores con los obtenidos desde `tools/accounting/export-ledger.mjs` y las vistas `accounting_*`.

---

## 1. Encabezado
- **Entidad**: AutoRenta S.R.L.
- **Período**: `YYYY-MM-DD` al `YYYY-MM-DD`
- **Moneda funcional**: Peso argentino (ARS)
- **Fecha de emisión**: `YYYY-MM-DD`
- **Responsables**: Contador a cargo, CEO

## 2. Estado de Situación Financiera (Balance General)
| Código | Cuenta | Tipo | Saldo ARS |
|--------|--------|------|-----------|
| 1.1 | Efectivo y equivalentes | Activo corriente | |
| 1.2 | Activos por cobrar (comisiones) | Activo corriente | |
| 1.3 | Activos intangibles capitalizados | Activo no corriente | |
| 2.1 | Pasivos por wallet (fondos clientes) | Pasivo corriente | |
| 2.2 | Depósitos de garantía | Pasivo corriente | |
| 2.3 | Fondo de garantía operativo (FGO) | Pasivo restringido | |
| 3.1 | Patrimonio aportado | Patrimonio | |
| 3.2 | Resultados acumulados | Patrimonio | |

> Fuente: vista `accounting_balance_sheet` (columna `balance` en centavos).

## 3. Estado de Resultados Integral
| Código | Concepto | Tipo | Monto ARS |
|--------|----------|------|-----------|
| 4.1 | Ingresos por comisiones | Ingreso | |
| 4.2 | Ingresos por upgrades de seguro | Ingreso | |
| 4.3 | Ingresos por fees financieros | Ingreso | |
| 5.1 | Costos de procesamiento pagos | Gasto | |
| 5.2 | Pérdidas por siniestros (uso FGO) | Gasto | |
| 5.3 | Gasto amortización intangibles | Gasto | |
| 5.4 | Otros gastos operativos | Gasto | |
| | **Resultado operativo** | | |
| | **Resultado neto** | | |

> Fuente: vista `accounting_income_statement`. Convertir de centavos a ARS dividiendo por 100.

## 4. Estado de Flujo de Efectivo (Método indirecto)
1. **Flujos operativos**
   - Resultado neto del período
   - Ajustes por amortización intangibles
   - Variación pasivos wallet
   - Variación depósitos/FGO
2. **Flujos de inversión**
   - Capitalización de desarrollo
   - Compras de activos
3. **Flujos de financiamiento**
   - Aportes de capital
   - Préstamos recibidos/pagados
4. **Variación neta de efectivo**
   - Saldo inicial caja
   - Saldo final caja

> Fuente: vista `accounting_cash_flow` y ledger exportado.

## 5. Estado de Cambios en el Patrimonio
| Concepto | Patrimonio aportado | Resultados acumulados | Total |
|----------|---------------------|-----------------------|-------|
| Saldo inicial | | | |
| Aportes / retiros | | | |
| Resultado del período | | | |
| Otros movimientos | | | |
| Saldo final | | | |

## 6. Notas a los estados financieros
1. **Descripción de la entidad y modelo de negocio.**
2. **Política contable** (referencia a `POLITICA_CONTABLE_AUTORENTA.md`).  
3. **Riesgo de crédito y garantías**: detalle de FGO, siniestros pendientes, aging de depósitos.  
4. **Ingresos por segmentos**: seguro, comisión, fees.  
5. **Contingencias legales o fiscales**.  
6. **Eventos posteriores al cierre**.

## 7. Conciliaciones obligatorias (adjuntar en anexos)
- Export `summary_*.json` del script de ledger.  
- Resultado de `wallet-reconciliation` (logs).  
- Resumen de cuentas bancarias vs pasivos wallet.  
- Lista de reservas en curso (estado `confirmed`, `in_progress`).

## 8. Checklist de emisión
1. Ejecutar `node tools/accounting/export-ledger.mjs --start=YYYY-MM-01 --end=YYYY-MM-DD`.  
2. Validar que `balanced === true` en `summary_*.json`.  
3. Actualizar balances en Supabase (`refresh_accounting_balances`).  
4. Completar tablas/notes en este documento.  
5. Revisar con responsable contable; obtener aprobación.  
6. Archivar versión firmada en carpeta segura (drive/interno).

---

**Nota**: mantener esta plantilla bajo control de versiones. Cualquier cambio debe anotarse en un changelog con fecha, responsable y justificación.
