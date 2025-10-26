```mermaid
flowchart TB
    subgraph Entrada["1️⃣ ENTRADA DE FONDOS"]
        A1[Usuario deposita $100] --> A2[MercadoPago/Stripe]
        A2 --> A3{Trigger: wallet_transaction<br/>status=completed}
        A3 --> A4[ASIENTO AUTOMÁTICO<br/>DEBE: MercadoPago $100<br/>HABER: Depósitos Clientes $100]
        A4 --> A5[💼 PASIVO con usuario<br/>NIIF 15]
    end

    subgraph InicioAlquiler["2️⃣ INICIO DE ALQUILER"]
        B1[Booking cambia a<br/>in_progress] --> B2{Trigger: bookings<br/>status=in_progress}
        B2 --> B3[ASIENTO AUTOMÁTICO<br/>DEBE: Billetera Usuario $50<br/>HABER: Franquicia Bloqueada $50]
        B3 --> B4[💼 Reclasificación pasivo<br/>Garantía bloqueada]
    end

    subgraph Finalizacion["3️⃣ FINALIZACIÓN DE ALQUILER"]
        C1[Booking cambia a<br/>completed] --> C2{Trigger: bookings<br/>status=completed}
        
        C2 --> C3[ASIENTO 1: Ingreso<br/>DEBE: Ing. Diferidos $10<br/>HABER: Comisiones $10]
        C3 --> C31[💰 Solo comisión<br/>NIIF 15 Agente]
        
        C2 --> C4[ASIENTO 2: Locador<br/>DEBE: Billetera Inquilino $90<br/>HABER: Pago Locadores $90]
        C4 --> C41[💼 Obligación pago]
        
        C2 --> C5[ASIENTO 3: Garantía<br/>DEBE: Franquicia $50<br/>HABER: Billetera $50]
        C5 --> C51[💼 Liberación garantía]
        
        C2 --> C6[ASIENTO 4: FGO<br/>DEBE: Gasto Siniestros $5<br/>HABER: Provisión FGO $5]
        C6 --> C61[💼 Provisión NIIF 37]
    end

    subgraph Siniestro["4️⃣ SINIESTRO"]
        D1[Admin registra daño] --> D2[Function:<br/>accounting_record_fgo_claim]
        D2 --> D3[ASIENTO AUTOMÁTICO<br/>DEBE: Provisión FGO $50<br/>HABER: Banco $50]
        D3 --> D4[💸 Consumo provisión<br/>Pago efectivo]
    end

    subgraph Retiro["5️⃣ RETIRO DE FONDOS"]
        E1[Usuario solicita retiro] --> E2{Trigger: wallet_transaction<br/>type=withdrawal}
        E2 --> E3[ASIENTO AUTOMÁTICO<br/>DEBE: Billetera Usuario $100<br/>HABER: Banco $100]
        E3 --> E4[💸 Reducción pasivo<br/>Devolución fondos]
    end

    subgraph Cierres["🔄 PROCESOS AUTOMÁTICOS"]
        F1[⏰ DIARIO 23:59] --> F2[accounting_daily_close]
        F2 --> F21[Verifica balance<br/>Revisa pendientes]
        
        F3[⏰ CADA 6H] --> F4[wallet_reconciliation]
        F4 --> F41[Compara contabilidad<br/>vs sistema wallet]
        
        F5[⏰ LUNES 2AM] --> F6[integrity_audit]
        F6 --> F61[Partida doble<br/>Líneas huérfanas<br/>Reconciliaciones]
        
        F7[⏰ DÍA 1 DEL MES] --> F8[monthly_close]
        F8 --> F81[Calcula utilidad<br/>Traspasa a resultados]
    end

    subgraph Reportes["📊 REPORTES EN TIEMPO REAL"]
        G1[accounting_trial_balance] --> G11[Balance Comprobación]
        G2[accounting_balance_sheet] --> G21[Balance General]
        G3[accounting_income_statement] --> G31[Estado Resultados]
        G4[accounting_executive_dashboard] --> G41[Dashboard KPIs]
        G5[accounting_fgo_summary] --> G51[Estado FGO]
    end

    A5 -.-> B1
    B4 -.-> C1
    C61 -.-> D1
    A5 -.-> E1

    style A5 fill:#e1f5e1
    style B4 fill:#e1f5e1
    style C31 fill:#d4edda
    style C41 fill:#e1f5e1
    style C51 fill:#e1f5e1
    style C61 fill:#fff3cd
    style D4 fill:#f8d7da
    style E4 fill:#f8d7da
    style F21 fill:#d1ecf1
    style F41 fill:#d1ecf1
    style F61 fill:#d1ecf1
    style F81 fill:#d1ecf1
    style G11 fill:#cfe2ff
    style G21 fill:#cfe2ff
    style G31 fill:#cfe2ff
    style G41 fill:#cfe2ff
    style G51 fill:#cfe2ff
```

# 🎨 DIAGRAMA DE FLUJO CONTABLE AUTOMATIZADO

## 📍 Leyenda de Colores

- 🟢 **Verde claro**: Pasivos (obligaciones con usuarios)
- 🟩 **Verde oscuro**: Ingresos reconocidos
- 🟡 **Amarillo**: Provisiones (NIIF 37)
- 🔴 **Rojo claro**: Salidas de efectivo
- 🔵 **Azul claro**: Procesos automáticos y reportes

## 🔄 Flujo de Datos

```
Usuario → Plataforma → Trigger → Función Contable → Asiento Automático → Reportes
```

## 📋 Triggers Activos

1. **wallet_transactions** (INSERT/UPDATE)
   - Detecta: `status='completed'` y `type='deposit'`
   - Ejecuta: `accounting_record_wallet_deposit()`

2. **bookings** (UPDATE)
   - Detecta: `status='in_progress'`
   - Ejecuta: `accounting_record_booking_start()`

3. **bookings** (UPDATE)
   - Detecta: `status='completed'`
   - Ejecuta: `accounting_record_booking_completion()`
   - Ejecuta: `trigger_create_fgo_provision()`

## ⚙️ Cron Jobs Configurados

| Job | Frecuencia | Función |
|-----|-----------|---------|
| Cierre Diario | 23:59 diario | `accounting_daily_close()` |
| Reconciliación Wallet | Cada 6 horas | `accounting_wallet_reconciliation()` |
| Auditoría | Lunes 2am | `accounting_integrity_audit()` |
| Cierre Mensual | Día 1 3am | `accounting_monthly_close()` |
| Expirar FGO | Mensual | `accounting_release_fgo_provision()` |

## 🎯 Principios Clave

### NIIF 15 - Reconocimiento de Ingresos
- ✅ AutoRenta actúa como **AGENTE**, no principal
- ✅ Solo reconoce **comisión** como ingreso
- ✅ Fondos en billetera son **PASIVO** hasta completar servicio

### NIIF 37 - Provisiones
- ✅ FGO es una **PROVISIÓN** para siniestros esperados
- ✅ Se estima basado en experiencia histórica (5% del alquiler)
- ✅ Se consume al ocurrir siniestros reales

### Partida Doble
- ✅ Validación automática: DÉBITOS = CRÉDITOS
- ✅ Error si diferencia > $0.01
- ✅ Transacción atómica (rollback automático)

## 📊 Ecuación Contable Fundamental

```
ACTIVOS = PASIVOS + PATRIMONIO
```

Verificable en tiempo real:
```sql
SELECT * FROM accounting_executive_dashboard;
```

## 🔍 Monitoreo Continuo

### Alertas Automáticas
- 🚨 Asiento desbalanceado
- 🚨 Discrepancia wallet > $1
- 🚨 Fallo en auditoría de integridad
- 🚨 Provisión FGO insuficiente

### Dashboard de Alertas
```sql
SELECT * FROM accounting_active_alerts;
```

## 💡 Ventajas del Sistema

1. **Cero intervención manual** en operaciones normales
2. **Cumplimiento normativo** garantizado
3. **Trazabilidad completa** de cada movimiento
4. **Auditoría facilitada** con reportes instantáneos
5. **Escalabilidad** sin límite de transacciones
6. **Transparencia** para usuarios y reguladores

---

**Sistema diseñado para AutoRenta**  
Versión 1.0.0 | 2025-10-26
