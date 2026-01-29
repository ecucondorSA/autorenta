# AUTORENTA CORE MANIFESTO (v2.0)
> **Filosofía:** "Cooperativa de Movilidad Descentralizada"

Este documento define la verdad técnica y de negocio del proyecto. Cualquier código que contradiga estos principios es deuda técnica o bug.

---

## 1. Modelo Económico: THE REWARD POOL (1B)
**"No pagamos por viaje, pagamos por disponibilidad."**

*   **Ingresos:** Todo el dinero cobrado a los usuarios (Renters) entra a una **Cuenta Central (Treasury)**.
*   **Distribución:**
*   **Fee Plataforma (Variable):** Costos operativos y profit según categoría.
    *   **10% FGO:** Fondo de Garantía Operativa (para cubrir franquicias).
    *   **75% Reward Pool:** Se distribuye mensualmente entre los Owners activos.
*   **Mecanismo de Reparto:** Los Owners acumulan **PUNTOS** basados en:
    1.  Valor del Auto (Gama).
    2.  Días de Disponibilidad Real.
    3.  Calificación de Usuario.
    *   *Fórmula:* `Share = (MisPuntos / PuntosTotales) * TamañoDelPool`

**IMPLICACIÓN TÉCNICA:**
*   Eliminar split de pagos en tiempo real (MercadoPago Split).
*   El checkout cobra el 100% a la cuenta de Autorentar.
*   Se necesita un "Ledger de Puntos" y un proceso batch mensual de liquidación.

---

## 2. Infraestructura de Pagos: FIAT NATIVO (2A)
**"Operamos en el sistema bancario local."**

*   **Pasarela:** MercadoPago (Argentina/Latam).
*   **Moneda:** ARS / Moneda Local (con referencia interna a USD para valorización de vehículos).
*   **Payouts:** Transferencias bancarias tradicionales desde la cuenta Treasury a los CBU de los Owners una vez al mes.

**IMPLICACIÓN TÉCNICA:**
*   El código P2P Crypto está archivado en `tools/archive_p2p`.
*   No hay conversión automática a USDT.

---

## 3. Modelo de Riesgo: COMODATO + FGO (3A)
**"El seguro es del dueño, nosotros cubrimos el hueco."**

*   **Figura Legal:** Comodato Oneroso (Préstamo de uso).
*   **Seguro Principal:** Póliza del Propietario (Todo Riesgo).
*   **Rol del FGO:** Cubrir **exclusivamente la Franquicia (Deducible)** o daños menores que no justifican activar el seguro principal.
*   **Límite FGO:** No es ilimitado. Tiene topes (ej. $800 USD) y reglas de solvencia (Co-pago si el fondo baja).

**IMPLICACIÓN TÉCNICA:**
*   Eliminar textos de "Seguro Total incluido". Reemplazar por "Cobertura de Franquicia".
*   El `FgoPolicyEngine` es el núcleo de la seguridad financiera.

---

## ARCHIVOS A REFACTORIZAR (DEPRECATED LOGIC)
Los siguientes módulos operan bajo el modelo antiguo (Pago Directo) y deben ser migrados al modelo de Pool:

1.  `SplitPaymentService` (Divide el pago en el momento -> Incorrecto).
2.  `BookingBreakdown` (Calcula "Ganancia del dueño" por viaje -> Incorrecto, debe mostrar "Puntos Estimados").
3.  `EarningsCalculator` (Proyecta ingresos directos -> Incorrecto).
