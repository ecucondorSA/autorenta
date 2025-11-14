# Migration Documentation

Esta carpeta contiene **documentación y guías** para aplicar migraciones específicas de Supabase.

## Archivos en esta carpeta

### Guías de Aplicación

- **`APPLY_MIGRATIONS_INSTRUCTIONS.md`** - Guía general de cómo aplicar migraciones manualmente
- **`APPLY_20251106_MIGRATION.md`** - Instrucciones específicas para migraciones de Nov 2025
- **`APPLY_PROFILE_MIGRATIONS.md`** - Instrucciones para migraciones de perfil de usuario

### READMEs de Features

- **`README_20251027_SECURITY_FIXES.md`** - Documentación de fixes de seguridad aplicados
- **`RLS_OPTIMIZATION_PHASE1_README.md`** - Documentación de optimización de RLS (Row Level Security)

## Cuándo usar estos archivos

Usa estas guías cuando:
- ✅ El comando `supabase db push` falla
- ✅ Necesitas aplicar migraciones manualmente en producción
- ✅ Quieres entender qué hace una migración antes de aplicarla
- ✅ Necesitas coordinar aplicación de múltiples migraciones relacionadas

## Estructura típica de una guía

```markdown
# Instrucciones para Aplicar Migración X

## Contexto
Qué problema resuelve esta migración

## Archivos afectados
- migration_file_1.sql
- migration_file_2.sql

## Método 1: Supabase Dashboard
1. Abrir SQL Editor
2. Copiar contenido de migration_file_1.sql
3. Ejecutar
4. Verificar resultado

## Método 2: Supabase CLI
```bash
supabase db push
```

## Verificación
Cómo verificar que la migración se aplicó correctamente
```

## Ver también

- [supabase/migrations/](../../supabase/migrations/) - Migraciones reales
- [supabase/helpers/](../../supabase/helpers/) - Scripts SQL de ayuda
- [CLAUDE_WORKFLOWS.md](../../CLAUDE_WORKFLOWS.md) - Workflows de desarrollo
