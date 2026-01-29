# AutoRenta: Master Plan (Deck para Email)

**Fecha:** Enero 2026  
**Versión:** 1.0  

> Objetivo: deck corto, “forwardable”, sin notas de orador.  
> Estilo: claims fuertes + evidencia + números.

---

## SLIDE 1: AutoRenta (La tesis)

- Movilidad compartida P2P en LatAm, desbloqueada por infraestructura.
- No somos “un marketplace”: somos un **Sistema Operativo** (Fintech + Trust + Legal).
- Claim: si resolvés **pago + confianza + rentabilidad**, el mercado se abre 10x.

---

## SLIDE 2: El Problema (3 barreras reales)

- **Acceso (Financiero):** la mayoría no tiene tarjetas con cupos altos (> USD 1500).
- **Confianza (Riesgo):** el dueño teme fraude/robos/daños sin culpables.
- **Rentabilidad (Inflación):** precios estáticos ⇒ pérdida del valor del activo.

---

## SLIDE 3: La Solución (Infraestructura vertical)

- **Motor de Pagos y Garantías:** ledger de doble entrada + split payments + depósitos/escrow lógico.
- **Trust OS:** KYC biométrico hard-gate + evidencia (video 360°) + detección de daños por IA.
- **Legal-Tech Engine:** contratos de comodato digitales + evidencia vinculante para disputas.

---

## SLIDE 4: Por qué ahora (Timing LatAm)

- **Inflación & estacionalidad:** pricing dinámico protege el valor del activo.
- **Exclusión financiera:** se necesitan flujos que no dependan de tarjetas bancarias tradicionales.
- **Riesgo del activo:** biometría + video + IA ya son baratos para mitigar fraude masivamente.

---

## SLIDE 5: Aprendizaje (Market failure: Fleety/Pegcar)

- **Failure Mode 1 – Payment Access Lockout:** exigir tarjeta bancaria con cupo alto rechazó ~80% de la demanda.
  - Correctivo AutoRenta: **Wallet propietaria + pre-auth fraccionada + FGO**.
- **Failure Mode 2 – Runway Trap:** burn-rate alto esperando densidad orgánica.
  - Correctivo AutoRenta: **unit economics positivos desde la reserva #1**.
- **Failure Mode 3 – Ops Friction:** verificación/disputas manuales ⇒ costos humanos destruyen margen.
  - Correctivo AutoRenta: **Trust OS automatizado (costo marginal ~0)**.

---

## SLIDE 6: Economía por reserva (Investor audit)

- **Ticket (GMV):** USD 120 (3–4 días)
- **Take rate (15%):** + USD 18.00 (revenue)
- **FGO (10%):** + USD 12.00 (fondo garantía)
- **Costos:** PSP - USD 4.20 (3.5%) | Riesgo/Soporte - USD 3.00 (2.5%)
- **Contribution Margin:** **+ USD 10.80 / reserva** (~60% margen)
- Stress test: si riesgo/soporte sube 50% ⇒ CM ~ USD 9.30 (sigue positivo).

---

## SLIDE 7: Embudo real + diagnóstico

- **Embudo (piloto):** 300 negociaciones → ~120 verificación iniciada → ~70 aprobados/pago → 50 reservas completadas
- **Conversión total:** ~**16%**
- Diagnóstico: el producto funciona (CM positivo). El capital es para **automatizar Trust OS** y subir conversión a **25–30%**.
- Conclusión: CAC se recupera en la **2da reserva** (LTV > 10x CAC).

---

## SLIDE 8: Risk Policy & Coverage (Trust OS)

- **FGO:** cubre daños menores (< USD 500), franquicias, lucro cesante.
  - Financiado por: 10% de cada reserva + aportes de owners (pool).
- **Robo total / destrucción:** póliza madre (partner) o póliza del owner (endosada); FGO cubre deducible.
- **Evidencia vinculante (video check-in/out):** sin check-out validado, el renter asume responsabilidad total.
- Flujo: **Incidente → Evidencia IA → FGO paga (instantáneo) → recobro al renter (diferido)**.

---

## SLIDE 9: Tecnología (validada y escalable)

- Arquitectura: Supabase Edge microservicios + RLS.
- Ledger: bloqueos optimistas, estabilidad transaccional.
- Omnicanal: Web + Android, despliegue continuo.
- Métricas sandbox: **p95 < 150ms** | **error rate < 0.1%** | **uptime 99.9%**.

---

## SLIDE 10: Go-to-market (Argentina primero)

- Canales activos:
  - 5,000+ contactos directos (waitlist)
  - alianzas con flotas locales
  - canal EcuCondor (audiencia validada)
- Ejecución inicial (Q1–Q2):
  - foco geográfico: CABA/GBA
  - estrategia: “Land & Expand” via comunidades
  - CAC objetivo: < USD 15

---

## SLIDE 11: KPIs piloto + Growth (Frontera WiFi)

- KPIs piloto (90 días): incidentes < 5% | NPS owners > 8.0 | verificación 45% | ticket USD 120 | disputas automatizadas 80%
- Growth experimento (1 nodo/mes):
  - 90,000 tráfico/mes → 9,000 opt-in (10%) → 1,350 registros (15%) → 607 verificados (45%)
  - Hipótesis: **CAC < USD 0.50 por usuario verificado** (replicable en LatAm)

---

## SLIDE 12: Equipo + Seed (Ask)

- Eduardo Marques (CEO): Producto & Tecnología (full-stack). Ex-Fintech. Arquitectura EcuCondor.
- Charles Rebollo (COO): Operaciones & Flota. Logística, siniestros, red de talleres.
- **Ronda Seed (placeholder):** USD [X]
- Uso de fondos (alto nivel): automatización Trust OS + liquidez inicial + crecimiento supply/demand + operaciones.

---

## APPENDIX (Opcional para email largo)

- Evidencia de producto (capturas reales): flujo reserva / wallet / garantía / check-in.
- Visión: el seguro migra del perfil del conductor al riesgo del activo; AutoRenta controla identidad + evidencia + pagos + reglas.
