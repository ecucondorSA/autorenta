# Ficha Técnica: Modelo Operativo AutoRentar

**Entidad:** ECUCONDOR S.A.S. (Sociedad BIC)  
**Proyecto:** AutoRentar - Plataforma de Carsharing P2P  
**Marco Regulatorio:** Res. SSN 551/2024  

---

## 1. Propuesta de Valor

AutoRentar no opera como una agencia de alquiler tradicional. Es un **ecosistema de movilidad compartida** diseñado bajo los principios de la economía colaborativa y la transparencia algorítmica.

---

## 2. Estructura de Distribución de Ingresos (Modelo 15/70/15)

| Componente | % | Función Estratégica |
|------------|---|---------------------|
| **Fee de Plataforma** | 15% | Sostenibilidad técnica, mantenimiento de infraestructura (Node.js/Supabase) y gestión de usuarios. |
| **Pool de Comunidad** | 70% | Recompensas dinámicas para propietarios basadas en disponibilidad verificada, métricas de reputación y tiempo de servicio. |
| **Fondo de Garantía (FGO)** | 15% | Fondo de Reserva Operativa destinado a la cobertura de daños menores, franquicias y contingencias de primera capa. |

```
Ingreso_Total = 15%_Operación + 70%_Incentivos + 15%_FGO
```

---

## 3. Sistema de Triple Capa de Riesgo

### Capa 1: Garantía del Locatario
- **Mecanismo:** Pre-autorización en tarjeta o saldo de membresía.
- **Función:** Cubre el deducible inmediato y daños menores por descuido.
- **Impacto:** Elimina el riesgo moral. El usuario cuida el auto porque su dinero está retenido.

### Capa 2: FGO (Fondo de Garantía Operativa)
- **Mecanismo:** El 15% retenido de cada transacción.
- **Función:** Buffer para daños que superen la garantía del usuario pero sigan siendo "operativos".
- **Impacto:** Protege la siniestralidad de RUS. Estos siniestros "no existen" para la aseguradora.

### Capa 3: Póliza RUS (Riesgos Catastróficos)
- **Mecanismo:** Póliza bajo Res. 551/2024.
- **Coberturas:**
  - Responsabilidad Civil (RC)
  - Robo y Destrucción Total
  - Apropiación Indebida
- **Impacto:** RUS solo interviene en riesgos de alta magnitud, optimizando recursos.

---

## 4. Protocolo de Gestión de Siniestros

### Etapa 1: Reporte Digital (0-10 min)
- Reporte desde la App con 4 fotos geolocalizadas.
- Declaración jurada digital.
- Algoritmo de valoración de daños.

### Etapa 2: Resolución por Capas
1. **Daño < Umbral:** Se ejecuta el FGO. RUS no interviene.
2. **Daño > Umbral:** Se escala a RUS con el "Evidence Pack" completo.

### Evidence Pack para RUS:
- Contrato de Locación firmado digitalmente
- Perfil KYC verificado (biometría)
- Fotos del Check-in vs. Siniestro
- Telemetría GPS (últimos 30 min)

---

## 5. Requerimientos de Integración Técnica

Buscamos una articulación vía **API REST** para automatizar:

1. **Emisión On-Demand:** Activación de cobertura en el microsegundo de inicio de la reserva.
2. **Cierre de Póliza:** Baja automática al finalizar la locación.
3. **Gestión de Siniestros Digital:** Reporte inmediato con evidencia desde la App.

---

## 6. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 18 (Signals), Ionic Framework |
| Backend | Supabase (PostgreSQL, Edge Functions, RLS) |
| IA/ML | Gemini API (análisis de documentos y daños) |
| Pagos | MercadoPago SDK / Integración P2P |

---

## 7. Por qué este modelo beneficia a RUS

| Beneficio | Descripción |
|-----------|-------------|
| **Siniestralidad Reducida** | El 80% de incidentes menores no llegan a RUS. |
| **Eficiencia Operativa** | Casos "masticados" con evidencia digital completa. |
| **Cumplimiento SSN** | Reducción del volumen de reclamos menores permite enfocarse en pagar rápido los siniestros grandes. |

---

**Contacto:**  
Eduardo Marques | Founder | AutoRentar  
ECUCONDOR S.A.S. (BIC)
