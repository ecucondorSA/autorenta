# Migraciones de AutoRenta

## Estado Actual
- **Punto de partida**: `20251201000000_init_baseline.sql`
- **Migraciones antiguas**: Archivadas en `migrations_archive_20251201/`

## Cómo Crear Nuevas Migraciones

1. **Generar archivo**:
   ```bash
   supabase migration new nombre_descriptivo
   ```
   Esto crea: `YYYYMMDDHHMMSS_nombre_descriptivo.sql`

2. **Escribir SQL** en el archivo generado

3. **Aplicar a producción**:
   ```bash
   # Opción A: Usando supabase CLI
   supabase db push --linked
   
   # Opción B: Manualmente
   PGPASSWORD='...' psql -h ... -f supabase/migrations/ARCHIVO.sql
   ```

4. **Registrar en historial** (si se aplicó manualmente):
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name) 
   VALUES ('YYYYMMDDHHMMSS', 'nombre');
   ```

## Convención de Nombres

```
YYYYMMDDHHMMSS_accion_modulo.sql
```

Ejemplos:
- `20251202120000_add_user_preferences.sql`
- `20251203090000_fix_booking_validation.sql`
- `20251204150000_create_reports_table.sql`

## Notas
- Las migraciones anteriores al 2025-12-01 están en el archivo
- No eliminar `20251201000000_init_baseline.sql`
