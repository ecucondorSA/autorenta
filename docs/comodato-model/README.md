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
