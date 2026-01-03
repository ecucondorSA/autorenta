# Modelo Comodato + Comunidad

## Objetivo
Transformar Autorenta de un modelo de alquiler tradicional a un modelo de **comodato con rewards por comunidad**, donde:

- El owner **NO recibe pago directo** por uso del vehículo
- El owner recibe **rewards mensuales** basados en participación en la comunidad
- El seguro particular del owner **no se invalida** (no hay "alquiler comercial")

---

## Documentación

| Archivo | Descripción |
|---------|-------------|
| [CREAR.md](./CREAR.md) | Nuevas tablas, funciones, vistas y triggers |
| [MODIFICAR.md](./MODIFICAR.md) | Cambios a tablas y funciones existentes |
| [ELIMINAR.md](./ELIMINAR.md) | Elementos a remover (mínimo en Fase 1) |
| [MIGRACION.md](./MIGRACION.md) | Scripts de migración de datos |
| [CRON_JOBS.md](./CRON_JOBS.md) | Tareas programadas |
| [FRONTEND.md](./FRONTEND.md) | Cambios en código Angular |

---

## Distribución de Pagos

```
Usuario Paga (100%)
    │
    ├──► Platform Fee (50%)     → Autorenta
    │
    ├──► Reward Pool (30%)      → Distribuido mensualmente a owners por puntos
    │
    └──► FGO (20%)              → Fondo de Garantía Operativo
```

**Owner recibe: $0 por booking** (todo va al pool de rewards mensuales)

---

## Sistema de Puntos

| Criterio | Puntos | Máximo/Mes |
|----------|--------|------------|
| Disponibilidad | 10/día | 300 |
| Rating >= 4.5 | 100 | 200 |
| Antigüedad | 50/mes | 600 |
| Referidos | 200/referido | - |
| Respuesta rápida | 5-100 | 150 |
| Participación | 50 | 100 |

---

## Límites de Uso (No-Comercial)

- **Máximo 15 días/mes** de compartición
- **Máximo 5 días consecutivos**
- **Rewards anuales <= gastos anuales** del vehículo
- **Verificación de uso personal** requerida

---

## Orden de Implementación

1. Crear tablas nuevas
2. Modificar tablas existentes
3. Crear funciones nuevas
4. Modificar funciones existentes
5. Crear vistas
6. Crear triggers
7. Insertar datos iniciales
8. Migrar datos existentes
9. Configurar cron jobs
10. Implementar cambios frontend

---

## Validez Legal

Este modelo se basa en:

- **California AB 1871**: Carsharing con recuperación de costos no es alquiler comercial
- **Modelo BlaBlaCar**: Compartir gastos sin lucro
- **Comodato (Art. 1533 CC Argentina)**: Préstamo gratuito de cosa mueble

El owner **nunca recibe pago por uso específico** del vehículo. Los rewards son por **participación en la comunidad**, no correlacionados con bookings individuales.

---

## Cobertura de Seguro

### Tipo de Poliza Requerida

Los owners mantienen su **seguro particular tradicional** con clausula de **"Conductor Indeterminado"**.

### Que es Conductor Indeterminado?

Es una clausula estandar en polizas argentinas que permite que **cualquier persona con licencia de conducir vigente** maneje el vehiculo, no solo el titular asegurado.

| Clausula | Descripcion |
|----------|-------------|
| **Conductor Determinado** | Solo el titular puede conducir |
| **Conductor Indeterminado** | Cualquier persona con licencia valida puede conducir |

### Por que es Compatible con el Modelo Comodato?

1. **No hay alquiler** - El comodato es prestamo gratuito, no actividad comercial
2. **El seguro cubre terceros** - La clausula de conductor indeterminado ya contempla que otras personas usen el auto
3. **No hay lucro directo** - El owner no recibe pago por la reserva individual
4. **Uso particular** - El vehiculo sigue siendo de uso particular, prestado ocasionalmente

### Requisitos Minimos del Seguro

| Cobertura | Requerido |
|-----------|-----------|
| Responsabilidad Civil (RC) | Obligatorio |
| Conductor Indeterminado | Obligatorio |
| Robo Total | Recomendado |
| Danos Propios | Opcional |

### Diferencia con "Alquiler sin Chofer"

| Aspecto | Conductor Indeterminado | Alquiler sin Chofer |
|---------|------------------------|---------------------|
| Tipo de poliza | Particular | Comercial |
| Costo adicional | ~5-15% sobre prima base | ~50-100% sobre prima base |
| Uso previsto | Prestamo ocasional a terceros | Actividad comercial de alquiler |
| Aplicable a | Comodato P2P | Rentadoras tradicionales |

### Advertencia Legal

> El modelo de comodato con rewards comunitarios **no constituye alquiler** segun la definicion del Art. 1187 del CCyC (cesion de uso a cambio de precio). El owner presta su vehiculo gratuitamente y recibe incentivos por participacion en una comunidad, no por el uso especifico de su auto.

Para mas detalle sobre implicaciones legales, ver: [ANALISIS_JURIDICO_SEGURO_COMODATO.md](../legal/ANALISIS_JURIDICO_SEGURO_COMODATO.md)
