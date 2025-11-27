# AutoRenta Runbooks

Guías de respuesta a incidentes para el equipo de operaciones.

## Estructura

| Runbook | Severidad | Descripción |
|---------|-----------|-------------|
| [booking-failures.md](./booking-failures.md) | P0/P1 | Fallos en el sistema de reservas |
| [payment-failures.md](./payment-failures.md) | P0 | Fallos en procesamiento de pagos |
| [database-issues.md](./database-issues.md) | P0/P1 | Problemas de base de datos |
| [high-traffic.md](./high-traffic.md) | P1/P2 | Alta carga y rendimiento |

## Niveles de Severidad

| Nivel | Descripción | Tiempo de Respuesta |
|-------|-------------|---------------------|
| P0 | Crítico - Sistema caído o pérdida de ingresos | < 15 minutos |
| P1 | Alto - Funcionalidad crítica degradada | < 1 hora |
| P2 | Medio - Funcionalidad no crítica afectada | < 4 horas |
| P3 | Bajo - Mejoras o bugs menores | < 24 horas |

## Canales de Comunicación

- **Slack**: #incidents (alertas automáticas)
- **Sentry**: https://sentry.io/organizations/autorenta/
- **Supabase Dashboard**: https://app.supabase.com/project/pisqjmoklivzpwufhscx
- **Cloudflare**: https://dash.cloudflare.com/

## Proceso de Escalamiento

1. **Detectar**: Alerta de Sentry/Monitoreo
2. **Evaluar**: Determinar severidad
3. **Comunicar**: Notificar en #incidents
4. **Mitigar**: Aplicar fix temporal si es posible
5. **Resolver**: Implementar solución permanente
6. **Documentar**: Post-mortem para P0/P1

## Contactos de Emergencia

| Rol | Contacto | Disponibilidad |
|-----|----------|----------------|
| On-call Lead | [Definir] | 24/7 |
| Backend Lead | [Definir] | Business hours |
| Frontend Lead | [Definir] | Business hours |
| DB Admin | [Definir] | Business hours |
