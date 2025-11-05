# 🐛 Debug: Error al Eliminar Auto

## Problema Reportado
```
❌ Error al eliminar el auto. Por favor intenta nuevamente
```

## Diagnóstico Realizado

### 1. Causa Raíz Identificada ✅
**Foreign Key Constraint Violation** (código 23503)

```
update or delete on table "cars" violates foreign key constraint 
"bookings_car_id_fkey" on table "bookings"
```

**Explicación**: No se puede eliminar un auto que tiene reservas asociadas porque la foreign key no tiene `ON DELETE CASCADE`.

### 2. Solución Implementada

#### hasActiveBookings() mejorado:
- Verifica TODAS las reservas (no solo activas)
- Retorna el conteo total de reservas
- Identifica reservas activas para el mensaje

#### onDeleteCar() mejorado:
- Try-catch alrededor de hasActiveBookings para evitar bloqueos
- Logging detallado del error con code, message, details, hint
- Detección específica de error 23503 (foreign key)
- Mensaje descriptivo explicando por qué no se puede eliminar

### 3. Mensajes Actualizados

#### Si hay reservas activas:
```
❌ No puedes eliminar este auto

Tiene X reserva(s) activa(s).
Próxima reserva: DD/MM/YYYY

Los autos con reservas no pueden eliminarse para mantener el historial.
Podés desactivar el auto en su lugar.
```

#### Si hay reservas históricas:
```
❌ No se puede eliminar este auto

Este auto tiene X reservas asociadas en el sistema.
Para mantener el historial, no es posible eliminarlo.

Podés desactivar el auto si no querés que aparezca en las búsquedas.
```

#### Error con detalles (para debugging):
```
❌ Error al eliminar el auto

Detalles: [mensaje del error]

Por favor intenta nuevamente o contacta soporte.
```

## 📝 Testing

### Para probar localmente:

1. Ir a http://localhost:4200/cars/my
2. Intentar eliminar un auto
3. Observar el mensaje en el alert
4. Revisar la consola del navegador (F12) para ver los logs:
   ```javascript
   Error deleting car: {...}
   Error details: {
     code: '23503',
     message: '...',
     details: '...',
     hint: null
   }
   ```

### Autos de prueba con reservas:
- **Hyundai Creta 2025**: Tiene 1 reserva
- **Volkswagen Gol Trend**: Tiene reservas

### Autos que SÍ se pueden eliminar:
- Autos sin reservas (nuevos, sin uso)

## 🔧 Alternativa: Desactivar en lugar de Eliminar

Si un auto no se puede eliminar:

1. **Cambiar status a 'inactive'**:
   ```typescript
   await this.carsService.updateCarStatus(carId, 'inactive');
   ```

2. **Toggle en UI**: Buscar el switch "Activo/Inactivo" en la tarjeta del auto

3. **Resultado**: El auto no aparecerá en búsquedas pero se mantiene en el historial

## 📊 Solución Permanente (Backend)

Para permitir eliminar autos con reservas en el futuro:

```sql
-- Opción 1: Cambiar foreign key a ON DELETE CASCADE
ALTER TABLE bookings 
DROP CONSTRAINT bookings_car_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_car_id_fkey 
FOREIGN KEY (car_id) REFERENCES cars(id) 
ON DELETE CASCADE;

-- Opción 2: Soft delete (recomendado)
ALTER TABLE cars ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_cars_deleted_at ON cars(deleted_at) WHERE deleted_at IS NOT NULL;
```

⚠️ **IMPORTANTE**: ON DELETE CASCADE eliminará TODAS las reservas asociadas. Esto puede no ser deseable para el historial contable.

**Recomendación**: Usar soft delete (`deleted_at`) en lugar de eliminación física.

## 📁 Archivos Modificados

1. `src/app/core/services/cars.service.ts` (línea 504-550)
   - Método `hasActiveBookings()` mejorado

2. `src/app/features/cars/my-cars/my-cars.page.ts` (línea 55-130)
   - Método `onDeleteCar()` con mejor manejo de errores

## 🚀 Deployment

Cambios deployados en:
- ✅ Localhost (recompilado automáticamente)
- ⏳ Cloudflare Pages (hacer nuevo deploy)

```bash
cd /home/edu/autorenta/apps/web
npm run build && npm run deploy:pages
```

---

**Última actualización**: 2025-10-27T00:30:00Z
