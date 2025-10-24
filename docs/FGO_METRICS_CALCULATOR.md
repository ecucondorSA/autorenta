# 📊 Calculadora de Métricas FGO - Modelo Excel/Google Sheets

## 🎯 Objetivo

Este documento te permite crear una hoja de cálculo con fórmulas automáticas para calcular RC (Ratio de Cobertura), LR (Loss Ratio) y gestionar el FGO manualmente.

---

## 📋 Estructura de la Hoja de Cálculo

### Hoja 1: "Ledger" (Registro de Movimientos)

| Columna | Encabezado | Tipo | Fórmula/Validación |
|---------|------------|------|-------------------|
| A | Fecha | Fecha | - |
| B | Usuario ID | Texto | - |
| C | Usuario Nombre | Texto | - |
| D | Tipo Movimiento | Lista | Depósito, Siniestro, Transferencia, Ajuste |
| E | Subfondo | Lista | Liquidez, Capitalización, Rentabilidad |
| F | Monto Depósito USD | Número | - |
| G | Alpha % | Porcentaje | 15% (predeterminado) |
| H | Monto FGO USD | Calculado | `=F * G` (si es Depósito) |
| I | Operación | Lista | Crédito, Débito |
| J | Saldo Liquidez USD | Calculado | Ver fórmula abajo |
| K | Saldo Capitalización USD | Calculado | Ver fórmula abajo |
| L | Saldo Rentabilidad USD | Calculado | Ver fórmula abajo |
| M | Total FGO USD | Calculado | `=J + K + L` |
| N | Observaciones | Texto | - |

#### Fórmulas para Saldos (Fila 3 en adelante)

**Columna J (Saldo Liquidez)**:
```excel
=J2 + SI(Y(E3="Liquidez", I3="Crédito"), H3, SI(Y(E3="Liquidez", I3="Débito"), -H3, 0))
```

**Columna K (Saldo Capitalización)**:
```excel
=K2 + SI(Y(E3="Capitalización", I3="Crédito"), H3, SI(Y(E3="Capitalización", I3="Débito"), -H3, 0))
```

**Columna L (Saldo Rentabilidad)**:
```excel
=L2 + SI(Y(E3="Rentabilidad", I3="Crédito"), H3, SI(Y(E3="Rentabilidad", I3="Débito"), -H3, 0))
```

*Nota: En fila 2 (primera fila de datos), los saldos iniciales son 0.*

---

### Hoja 2: "Métricas FGO"

#### Sección A: Parámetros Configurables

| Celda | Parámetro | Valor Inicial | Descripción |
|-------|-----------|---------------|-------------|
| B2 | Alpha % | 15% | Porcentaje de reserva por depósito |
| B3 | Meses de Cobertura | 12 | Meta de meses que el fondo debe cubrir |

#### Sección B: Cálculos Automáticos

| Celda | Métrica | Fórmula |
|-------|---------|---------|
| B6 | Total Aportes USD | `=SUMAR.SI(Ledger!D:D, "Depósito", Ledger!H:H)` |
| B7 | Total Siniestros Pagados USD | `=SUMAR.SI(Ledger!D:D, "Siniestro", Ledger!H:H)` |
| B8 | Cantidad de Siniestros | `=CONTAR.SI(Ledger!D:D, "Siniestro")` |
| B9 | Promedio por Siniestro USD | `=SI(B8>0, B7/B8, 0)` |
| B10 | Meta de Saldo USD | `=B9 * B3` |
| B11 | Saldo Actual Total FGO USD | `=INDICE(Ledger!M:M, CONTARA(Ledger!M:M))` |
| B12 | **RC (Ratio de Cobertura)** | `=SI(B10>0, B11/B10, 0)` |
| B13 | **LR (Loss Ratio)** | `=SI(B6>0, B7/B6, 0)` |

#### Sección C: Estado del Fondo

| Celda | Métrica | Fórmula |
|-------|---------|---------|
| B16 | Estado | `=SI(B12>=1, "✅ Healthy", SI(B12>=0.7, "⚠️ Warning", "🔴 Critical"))` |
| B17 | Faltante/Excedente USD | `=B11 - B10` |
| B18 | % de Meta Alcanzado | `=SI(B10>0, (B11/B10)*100, 0) & "%"` |

#### Sección D: Recomendaciones Automáticas

| Celda | Recomendación | Fórmula |
|-------|---------------|---------|
| B21 | Ajuste de Alpha | `=SI(B12<0.9, "🔼 Incrementar α a " & REDONDEAR(B2*1.33, 0) & "%", SI(B12>1.2, "🔽 Reducir α a " & REDONDEAR(B2*0.85, 0) & "%", "✅ Mantener α en " & B2*100 & "%"))` |

---

### Hoja 3: "Resumen por Subfondo"

| Subfondo | Saldo Actual USD | % del Total | Propósito |
|----------|------------------|-------------|-----------|
| Liquidez | `=INDICE(Ledger!J:J, CONTARA(Ledger!J:J))` | `=(celda anterior / total) * 100 & "%"` | Efectivo disponible |
| Capitalización | `=INDICE(Ledger!K:K, CONTARA(Ledger!K:K))` | `=(celda anterior / total) * 100 & "%"` | Activo productivo |
| Rentabilidad | `=INDICE(Ledger!L:L, CONTARA(Ledger!L:L))` | `=(celda anterior / total) * 100 & "%"` | Resultado diferido |
| **Total** | `=SUMA(celdas anteriores)` | **100%** | |

---

### Hoja 4: "Dashboard Gráficos"

#### Gráfico 1: Evolución del Saldo Total FGO

- **Tipo**: Gráfico de líneas
- **Eje X**: Columna A de "Ledger" (Fecha)
- **Eje Y**: Columna M de "Ledger" (Total FGO USD)
- **Serie 2**: Meta de Saldo (línea horizontal de referencia)

#### Gráfico 2: Distribución por Subfondo

- **Tipo**: Gráfico de torta (pie chart)
- **Datos**: Saldos de Liquidez, Capitalización, Rentabilidad
- **Etiquetas**: Incluir porcentajes

#### Gráfico 3: RC y LR Histórico

- **Tipo**: Gráfico de columnas combinado
- **Eje X**: Meses
- **Eje Y Izquierdo**: RC (barras)
- **Eje Y Derecho**: LR (línea)

---

## 🚀 Instrucciones de Uso

### 1. Crear la Hoja de Cálculo

**Google Sheets**:
1. Abrí Google Sheets
2. Creá una hoja nueva: "Autorentar - FGO Ledger"
3. Creá 4 hojas: "Ledger", "Métricas FGO", "Resumen por Subfondo", "Dashboard Gráficos"

**Excel**:
1. Abrí Excel
2. Guardar como: `Autorentar_FGO_Ledger.xlsx`
3. Creá 4 hojas con los mismos nombres

### 2. Configurar Validaciones de Datos

**Hoja "Ledger"**:

- **Columna D (Tipo Movimiento)**:
  - Validación de lista: `Depósito, Siniestro, Transferencia, Ajuste`

- **Columna E (Subfondo)**:
  - Validación de lista: `Liquidez, Capitalización, Rentabilidad`

- **Columna I (Operación)**:
  - Validación de lista: `Crédito, Débito`

### 3. Aplicar Formato Condicional

**Hoja "Métricas FGO"**:

- **Celda B12 (RC)**:
  - Verde si ≥ 1.0
  - Amarillo si entre 0.7 y 1.0
  - Rojo si < 0.7

- **Celda B13 (LR)**:
  - Verde si < 0.10
  - Amarillo si entre 0.10 y 0.30
  - Rojo si ≥ 0.30

- **Celda B16 (Estado)**:
  - Verde si contiene "Healthy"
  - Amarillo si contiene "Warning"
  - Rojo si contiene "Critical"

### 4. Registrar Movimientos

**Ejemplo: Usuario deposita USD 100**

| Fecha | Usuario ID | Usuario Nombre | Tipo Movimiento | Subfondo | Monto Depósito USD | Alpha % | Monto FGO USD | Operación | Observaciones |
|-------|------------|----------------|-----------------|----------|-------------------|---------|---------------|-----------|---------------|
| 22/10/2025 | user_001 | Juan Pérez | Depósito | Liquidez | 100 | 15% | =100*15% | Crédito | Reserva inicial |

*Los saldos se actualizan automáticamente con las fórmulas.*

**Ejemplo: Pagar siniestro de USD 300**

| Fecha | Usuario ID | Usuario Nombre | Tipo Movimiento | Subfondo | Monto Depósito USD | Alpha % | Monto FGO USD | Operación | Observaciones |
|-------|------------|----------------|-----------------|----------|-------------------|---------|---------------|-----------|---------------|
| 22/10/2025 | booking_001 | Siniestro Auto 01 | Siniestro | Liquidez | - | - | 300 | Débito | Reparación parachoques |

### 5. Revisar Métricas Automáticamente

Al registrar cada movimiento:
1. La hoja "Métricas FGO" se actualiza automáticamente
2. Revisá el RC y LR
3. Verificá el estado del fondo
4. Seguí las recomendaciones de ajuste de α

---

## 📊 Ejemplo Completo de Uso

### Escenario: Primer mes de operación

**Movimientos**:

1. **Usuario 1 deposita USD 100**
   - Aporte FGO: USD 15 (15%)
   - Saldo Liquidez: USD 15

2. **Usuario 2 deposita USD 250**
   - Aporte FGO: USD 37.50 (15%)
   - Saldo Liquidez: USD 52.50

3. **Usuario 3 deposita USD 500**
   - Aporte FGO: USD 75 (15%)
   - Saldo Liquidez: USD 127.50

4. **Siniestro 1: USD 80**
   - Pago desde Liquidez: -USD 80
   - Saldo Liquidez: USD 47.50

**Métricas al final del mes**:
- Total Aportes: USD 127.50
- Total Siniestros Pagados: USD 80
- LR: 80 / 127.50 = **0.63 (63%)** ⚠️ Alto
- Promedio por Siniestro: USD 80
- Meta de Saldo (12 meses): USD 80 × 12 = USD 960
- Saldo Actual: USD 47.50
- RC: 47.50 / 960 = **0.049 (4.9%)** 🔴 Critical

**Recomendación**:
- 🔼 Incrementar α de 15% a 20%
- Monitorear más siniestros para mejorar estadísticas

---

## ✅ Checklist de Implementación

- [ ] Crear hoja de cálculo con 4 hojas
- [ ] Configurar encabezados y columnas
- [ ] Aplicar fórmulas de saldos acumulados
- [ ] Configurar hoja "Métricas FGO" con fórmulas
- [ ] Aplicar validaciones de datos
- [ ] Configurar formato condicional
- [ ] Crear gráficos en "Dashboard Gráficos"
- [ ] Registrar primer movimiento de prueba
- [ ] Verificar cálculos automáticos
- [ ] Compartir con equipo administrativo

---

## 🔗 Recursos Adicionales

- **Documentación Técnica**: `/docs/FGO_SISTEMA_CONTABLE.md`
- **Migración SQL**: `/supabase/migrations/20251022_create_fgo_system.sql`
- **Template CSV**: `/docs/FGO_LEDGER_TEMPLATE.csv`

---

**Última actualización**: 22 de octubre de 2025
**Versión**: 1.0
