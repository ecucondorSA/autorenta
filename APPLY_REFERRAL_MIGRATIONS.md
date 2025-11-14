# Aplicar Migraciones del Sistema de Referidos

## Opción 1: Supabase Dashboard SQL Editor (Recomendado)

1. Abre [Supabase Dashboard](https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new)
2. Copia y pega el contenido de cada archivo en orden:

### Paso 1: Crear tablas y funciones
```bash
# Copiar contenido de:
supabase/migrations/20251111_create_referral_system.sql
```

### Paso 2: Crear triggers automáticos
```bash
# Copiar contenido de:
supabase/migrations/20251111_create_referral_triggers.sql
```

3. Ejecuta cada script haciendo clic en "Run"

## Opción 2: Línea de comandos con Supabase CLI

```bash
# Desde el directorio del proyecto
supabase db push --linked
```

## Verificar que funcionó

Después de aplicar las migraciones, verifica en el SQL Editor:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('referral_codes', 'referrals', 'referral_rewards');

-- Verificar que las funciones existen
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%referral%';
```

Deberías ver:
- ✅ 3 tablas: `referral_codes`, `referrals`, `referral_rewards`
- ✅ 3 funciones: `generate_referral_code`, `apply_referral_code`, `complete_referral_milestone`
- ✅ 1 vista: `referral_stats_by_user`

## Probar el sistema

Una vez aplicadas las migraciones:

1. Abre http://localhost:4200/referrals (debes estar logueado)
2. Se generará tu código automáticamente
3. Podrás compartir el link: http://localhost:4200/ref/TU_CODIGO
4. Verás tus estadísticas y ganancias

## Estructura de Recompensas

- **Usuario nuevo**: $500 ARS de bienvenida
- **Referido**: $1,000 ARS al publicar primer auto
- **Referidor**: $1,500 ARS cuando el referido publica

## Contacto de Supabase

- **Proyecto**: reinamosquera2003@gmail.com's Project
- **Reference ID**: pisqjmoklivzpwufhscx
- **URL**: https://pisqjmoklivzpwufhscx.supabase.co
- **Región**: South America (São Paulo)
