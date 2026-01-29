# 🚨 RESOLUCIÓN: El Problema del Seguro en AutoRenta

## El Diagnóstico es Correcto

El análisis del perito identifica un **problema estructural real**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EL MURO DE LA NO-ASEGURABILIDAD                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ❌ Póliza Particular → Excluye "alquiler sin chofer"             │
│   ❌ Póliza Comercial Individual → No existe en Argentina          │
│   ❌ Póliza Flota → Inviable (requiere ser Agencia)                │
│   ❌ FGO sin INAES → Ilegal para siniestros millonarios            │
│                                                                     │
│   RESULTADO: Ante siniestro grave, NO HAY COBERTURA               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Las 4 Opciones Viables

### Opción 1: Mutual con Matrícula INAES

**Concepto**: Constituir una mutual registrada que pueda autoasegurarse legalmente.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODELO MUTUAL INAES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Propietarios ─────► MUTUAL AUTORENTA (matrícula INAES)           │
│        │                      │                                     │
│        │                      ├── Fondo de Ayuda Mutua             │
│   Aportan vehículos           │   (capital real, auditado)         │
│   + cuotas                    │                                     │
│        │                      ├── Cobertura de siniestros          │
│        ▼                      │   (hasta límite del fondo)         │
│                               │                                     │
│   Usuarios pagan ────────────►├── Reservas legales                 │
│   "cuota de acceso"           │   (exigidas por INAES)             │
│                               │                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Aspecto | Detalle |
|---------|---------|
| **Legalidad** | ✅ 100% legal bajo Ley 20.321 |
| **Requisitos** | Matrícula INAES, estatutos, capital mínimo |
| **Tiempo** | 6-12 meses para constituir |
| **Costo inicial** | Alto (abogados + capital + trámites) |
| **Ventaja** | Puede autoasegurarse sin SSN |
| **Riesgo** | FGO debe tener solvencia REAL (~$50M ARS mínimo) |

**Viabilidad**: ⭐⭐⭐ Media - Requiere inversión y tiempo

---

### Opción 2: Propietarios como Monotributistas + Póliza de Afinidad

**Concepto**: Cada propietario se inscribe como "alquilador de vehículos" y AutoRenta negocia seguro colectivo.

```
┌─────────────────────────────────────────────────────────────────────┐
│              MODELO MONOTRIBUTISTAS + AFINIDAD                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PROPIETARIO A          PROPIETARIO B          PROPIETARIO C      │
│   (Monotributo 771000)   (Monotributo 771000)   (Monotributo 771000)│
│        │                      │                      │              │
│        └──────────────────────┼──────────────────────┘              │
│                               │                                     │
│                               ▼                                     │
│                    ┌─────────────────────┐                         │
│                    │   GRUPO DE AFINIDAD │                         │
│                    │   "Propietarios     │                         │
│                    │    AutoRenta"       │                         │
│                    └──────────┬──────────┘                         │
│                               │                                     │
│                               ▼                                     │
│                    ┌─────────────────────┐                         │
│                    │  PÓLIZA COLECTIVA   │                         │
│                    │  DE AFINIDAD        │                         │
│                    │  (Aseguradora X)    │                         │
│                    └─────────────────────┘                         │
│                                                                     │
│   Cada propietario tiene cobertura comercial legítima              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Aspecto | Detalle |
|---------|---------|
| **Legalidad** | ✅ Legal si propietario está inscripto en AFIP |
| **Requisitos** | Monotributo categoría adecuada, alta en actividad |
| **Tiempo** | 1-3 meses para implementar |
| **Costo** | Prima de seguro comercial (mayor que particular) |
| **Ventaja** | Cada propietario tiene cobertura real |
| **Desafío** | Convencer a propietarios de inscribirse |

**Póliza de Afinidad**: Es un seguro colectivo para grupos con característica común (como seguros de colegios profesionales, clubes, etc.). Se negocia con la aseguradora para el grupo.

**Viabilidad**: ⭐⭐⭐⭐ Alta - Más rápido de implementar

---

### Opción 3: Seguro Contratado por el USUARIO

**Concepto**: El usuario contrata seguro temporal cada vez que usa un vehículo.

```
┌─────────────────────────────────────────────────────────────────────┐
│              MODELO SEGURO DEL USUARIO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   USUARIO quiere usar auto                                         │
│        │                                                           │
│        ▼                                                           │
│   ┌─────────────────────────────────────┐                          │
│   │  CHECKOUT en AutoRenta              │                          │
│   │  ┌─────────────────────────────┐    │                          │
│   │  │ Contribución base:  $100   │    │                          │
│   │  │ + Seguro temporal:  $15    │    │                          │
│   │  │ ─────────────────────────  │    │                          │
│   │  │ TOTAL:              $115   │    │                          │
│   │  └─────────────────────────────┘    │                          │
│   └─────────────────────────────────────┘                          │
│        │                                                           │
│        ▼                                                           │
│   ┌─────────────────────────────────────┐                          │
│   │  Aseguradora emite póliza temporal  │                          │
│   │  • Vigencia: duración del viaje     │                          │
│   │  • Conductor: Usuario (DNI)         │                          │
│   │  • Vehículo: Patente XXX            │                          │
│   │  • Cobertura: RC + Daños            │                          │
│   └─────────────────────────────────────┘                          │
│                                                                     │
│   El PROPIETARIO no necesita seguro comercial                      │
│   El USUARIO asume y paga su cobertura                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Aspecto | Detalle |
|---------|---------|
| **Legalidad** | ✅ Legal - Usuario contrata su seguro |
| **Requisitos** | Convenio con aseguradora para seguros temporales |
| **Tiempo** | 2-4 meses (negociación con aseguradora) |
| **Costo** | Lo paga el usuario (se suma a la contribución) |
| **Ventaja** | Propietario NO necesita cambiar su póliza |
| **Modelo** | Similar a Hertz/Avis que ofrecen seguro adicional |

**Aseguradoras que hacen seguros temporales/on-demand**:
- Me Curo (digital)
- Triunfo (por día)
- Otras insurtech

**Viabilidad**: ⭐⭐⭐⭐⭐ Muy Alta - No requiere cambio del propietario

---

### Opción 4: Rent With Driver (Pivot)

**Concepto**: El propietario conduce el vehículo durante el uso.

```
┌─────────────────────────────────────────────────────────────────────┐
│              MODELO RENT WITH DRIVER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ANTES (actual):                                                  │
│   Usuario usa auto SOLO → Propietario no participa                 │
│                                                                     │
│   DESPUÉS (pivot):                                                 │
│   Usuario + Propietario → Propietario conduce/acompaña             │
│                                                                     │
│   VENTAJA:                                                         │
│   • Seguro de "Remis/App" SÍ existe                                │
│   • El propietario mantiene control del vehículo                   │
│   • No hay "transferencia de guarda"                               │
│                                                                     │
│   DESVENTAJA:                                                      │
│   • Cambia completamente el producto                               │
│   • Limita casos de uso (usuario quiere auto sin chofer)           │
│   • Compite con Uber/Cabify                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Viabilidad**: ⭐⭐ Baja - Cambia el modelo de negocio

---

## Mi Recomendación: COMBINACIÓN de Opciones 2 y 3

### Implementación en 2 Fases

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLAN DE IMPLEMENTACIÓN                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   FASE 1 (Inmediata - 0 a 3 meses):                                │
│   ═══════════════════════════════════                              │
│   Implementar OPCIÓN 3: Seguro del Usuario                         │
│                                                                     │
│   • Negociar con aseguradora (Me Curo, Triunfo, otra)              │
│   • Integrar checkout con emisión de póliza temporal               │
│   • Usuario paga seguro como parte de la contribución              │
│   • Propietario NO necesita cambiar nada                           │
│                                                                     │
│   RESULTADO: Cobertura REAL desde día 1                            │
│                                                                     │
│   ───────────────────────────────────────────────────────────────  │
│                                                                     │
│   FASE 2 (Mediano plazo - 3 a 12 meses):                           │
│   ═══════════════════════════════════════                          │
│   Implementar OPCIÓN 2: Póliza de Afinidad                         │
│                                                                     │
│   • Crear "Club de Propietarios AutoRenta"                         │
│   • Propietarios frecuentes se inscriben como Monotributistas      │
│   • Negociar póliza colectiva de afinidad                          │
│   • Ofrecerles mejor porcentaje del pool (incentivo)               │
│                                                                     │
│   RESULTADO: Propietarios profesionales con cobertura propia       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estructura Propuesta: Modelo Híbrido

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODELO HÍBRIDO AUTORENTA                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   PROPIETARIOS:                                                    │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │  TIER 1: Propietario Ocasional                              │  │
│   │  • Mantiene póliza particular                               │  │
│   │  • Usuario contrata seguro temporal (Opción 3)              │  │
│   │  • Recibe % menor del pool                                  │  │
│   │                                                             │  │
│   │  TIER 2: Propietario Profesional                            │  │
│   │  • Inscripto como Monotributista 771000                     │  │
│   │  • Tiene póliza comercial (Afinidad)                        │  │
│   │  • Recibe % mayor del pool (incentivo)                      │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   COBERTURA:                                                       │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                                                             │  │
│   │  CAPA 1: Seguro del Usuario (temporal)                      │  │
│   │          RC obligatoria + RC excedente                      │  │
│   │                                                             │  │
│   │  CAPA 2: Póliza del Propietario (si es Tier 2)              │  │
│   │          Daños propios + Robo + etc.                        │  │
│   │                                                             │  │
│   │  CAPA 3: FGO                                                │  │
│   │          Deducibles + Incidentes menores                    │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Acción Inmediata: Buscar Aseguradora para Seguros Temporales

### Contactar:

1. **Me Curo** (Insurtech argentina)
   - Especializada en seguros digitales on-demand
   - Puede tener producto para "conductor temporal"

2. **Triunfo Seguros**
   - Tiene productos por día
   - Consultar si cubren conductor no titular

3. **Prudential/MetLife/otras**
   - Seguros de viaje que incluyen RC auto
   - Podría adaptarse

4. **Broker especializado**
   - Contactar broker que trabaje con flotas
   - Pueden conocer opciones no públicas

### Propuesta para la aseguradora:

```
┌─────────────────────────────────────────────────────────────────────┐
│              PROPUESTA A ASEGURADORA                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   "Somos AutoRenta, plataforma de movilidad compartida.            │
│                                                                     │
│   Necesitamos un producto de SEGURO TEMPORAL para:                 │
│   • Usuarios que acceden a vehículos de la red                     │
│   • Duración: 1 a 30 días por viaje                                │
│   • Cobertura: RC terceros + Daños propios (opcional)              │
│   • Emisión: Digital, integrada a nuestra plataforma               │
│   • Volumen estimado: X pólizas/mes                                │
│                                                                     │
│   El usuario paga la prima como parte del checkout.                │
│   AutoRenta no asume riesgo asegurador (ustedes sí).               │
│   Ustedes reciben prima real por riesgo real.                      │
│                                                                     │
│   ¿Tienen producto o pueden desarrollarlo?"                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Conclusión

El problema del seguro es **real pero solucionable**.

La clave es **NO depender del seguro particular del propietario**:

| Estrategia | Viabilidad | Tiempo |
|------------|------------|--------|
| Usuario contrata seguro temporal | ⭐⭐⭐⭐⭐ | 1-3 meses |
| Propietarios como Monotributistas | ⭐⭐⭐⭐ | 3-6 meses |
| Mutual INAES | ⭐⭐⭐ | 6-12 meses |
| Pivot a Rent With Driver | ⭐⭐ | Cambia producto |

**Recomendación**: Implementar **Opción 3 (Seguro del Usuario)** inmediatamente mientras se desarrolla **Opción 2 (Póliza de Afinidad)** para propietarios profesionales.

---

*Documento de resolución - AutoRenta*
*Fecha: Enero 2026*
