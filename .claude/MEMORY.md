# AutoRenta - Memoria Persistente de Claude

> Este archivo contiene contexto importante que Claude debe recordar entre sesiones.

## Decisiones Arquitectónicas

### MercadoPago (v12 - FROZEN)
- **SDK removido** por incompatibilidad con Deno
- Usar `fetch()` directo a API REST
- NO modificar archivos en `supabase/functions/mercadopago-*`

### Angular
- **Standalone components** siempre
- **Signals** para estado reactivo
- **inject()** en lugar de constructores
- **NO usar BehaviorSubject** para estado de vista

### Estilos
- **Tailwind CSS** únicamente
- NO crear clases CSS custom
- NO usar SCSS

## Bugs Conocidos

### En Investigación
- [ ] Webhook MP ocasionalmente no llega (rate limiting?)
- [ ] Video inspection se congela en iOS Safari

### Resueltos Recientemente
- [x] Login loop en refresh token (fixed v2.19.0)
- [x] Preauth expiration no renovaba (fixed v2.18.5)

## Credenciales y Endpoints

### Supabase
- Project: `pisqjmoklivzpwufhscx`
- URL: `https://pisqjmoklivzpwufhscx.supabase.co`

### MercadoPago
- Sandbox: Usar tarjetas de test
- Producción: Configurado en secrets

## Comandos Frecuentes

```bash
# Desarrollo
pnpm dev                    # Servidor local
pnpm dev:fast              # Sin sourcemaps

# Testing
pnpm test:unit             # Vitest
pnpm test:e2e              # Playwright

# Supabase
supabase db diff -f <name> # Nueva migración
supabase gen types ts      # Regenerar tipos

# Deploy
git push origin main       # Trigger CI/CD
```

## Contactos del Equipo

- **Eduardo** - Lead Developer
- Repositorio: `ecucondorsa/autorenta`

## Notas de Sesiones Anteriores

<!-- Claude agregará notas aquí automáticamente -->

---
*Última actualización: 2026-01-26*
