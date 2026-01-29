# Marketing Automation - Setup Guide

## Prerrequisitos

### 1. Proxies Residenciales
Necesitas proxies residenciales para evitar shadowban. Recomendaciones:
- **Bright Data**: https://brightdata.com (free trial disponible)
- **ProxyMesh**: https://proxymesh.com ($10/month tier)
- **Smartproxy**: https://smartproxy.com

Configurar en: `config/proxy-pool.json`

### 2. API Keys
Agregar a tus secrets de GitHub y `.env`:
```bash
GROQ_API_KEY=gsk_xxx                    # API de Groq para IA
GITHUB_TOKEN=ghp_xxx                    # GitHub Personal Access Token
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Cuentas de Facebook
Necesitas 32 cuentas de Facebook verificadas:
- Crear manualmente (NO con bots)
- Verificación por email/teléfono
- Perfil completo con foto, amigos, actividad previa
- Esperar al menos 30 días antes de usar para automatización

### 4. Cookies de Sesión
Extraer cookies de cada cuenta:
1. Login manual a Facebook en browser
2. Usar extensión "EditThisCookie" o similar
3. Exportar cookies como JSON
4. Guardar en `cookies/{persona-id}.json`

**IMPORTANTE**: Encriptar cookies antes de subir a Supabase.

## Instalación

### 1. Instalar dependencias
```bash
cd tools/marketing-automation
pnpm install
```

### 2. Aplicar migración de base de datos
```bash
cd ../../
supabase db push
```

### 3. Deploy de Edge Function
```bash
supabase functions deploy marketing-webhook --no-verify-jwt
```

### 4. Configurar secrets en GitHub
```bash
gh secret set GROQ_API_KEY -b "gsk_xxx"
gh secret set SUPABASE_URL -b "https://xxx.supabase.co"
gh secret set SUPABASE_SERVICE_ROLE_KEY -b "xxx"
gh secret set GITHUB_TOKEN -b "ghp_xxx"
```

### 5. Configurar n8n
1. Importar workflow: `n8n/workflows/guerrilla-content.json`
2. Configurar credenciales de Supabase
3. Actualizar URL de RSS feeds con grupos objetivo
4. Activar workflow

## Testing

### 1. Probar generación de contenido
```bash
cd tools/marketing-automation/scripts
node generate-content.js "Alguien sabe dónde alquilar un auto seguro en CABA?" --platform facebook
```

### 2. Probar proxy rotation
```bash
node proxy-rotator.js check
node proxy-rotator.js status
node proxy-rotator.js assign persona-001
```

### 3. Probar posting (DRY RUN - headless false)
```bash
export HEADLESS=false
node post-comment.js persona-001 "https://facebook.com/groups/..." "Test comment"
```

## Deployment Faseado

### Semana 1: Prueba Piloto
- 1 persona activa
- 1 grupo de Facebook de prueba
- Máximo 3 comentarios/día
- Monitoreo intensivo de shadowban

### Semana 2: Escala Gradual
- 5 personas activas
- 3 grupos objetivo
- 10-15 comentarios/día total
- Verificar engagement y respuestas

### Semana 3: Escala Media
- 16 personas activas
- 10 grupos objetivo
- 30-40 comentarios/día total

### Semana 4: Full Capacity
- 32 personas activas
- 20+ grupos objetivo
- 60-80 comentarios/día total

## Monitoreo

### Dashboard de Métricas (Supabase)
```sql
-- Posts por día
SELECT DATE(created_at), COUNT(*) 
FROM marketing_content 
WHERE status = 'posted' 
GROUP BY DATE(created_at);

-- Engagement promedio
SELECT AVG((engagement->>'likes')::int) as avg_likes
FROM marketing_content 
WHERE status = 'posted';

-- Shadowbans detectados
SELECT COUNT(*) FROM marketing_personas WHERE is_shadowbanned = true;
```

### Alertas Críticas
Revisar diariamente: `marketing_alerts` donde `severity = 'critical'`

## Seguridad

### Encriptación de Cookies
Antes de guardar cookies en Supabase:
```javascript
import crypto from 'crypto';

function encryptCookies(cookies, secret) {
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(JSON.stringify(cookies), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### Backup de Personas
Backup semanal de `marketing_personas` a storage encriptado.

## Troubleshooting

### Shadowban Detectado
1. Pausar persona inmediatamente
2. Esperar 7-14 días
3. Cambiar proxy
4. Reactivar gradualmente

### Comentario No Publicado
1. Verificar screenshot en GitHub Actions artifacts
2. Revisar logs de Playwright
3. Validar cookies
4. Check proxy health

### Proxy Fallido
1. Ejecutar `pnpm proxy:check`
2. Remover proxies unhealthy del pool
3. Agregar nuevos proxies

## Costos Estimados

| Recurso | Costo/mes |
|---------|-----------|
| Proxies (32) | $50-100 |
| Groq API | $0 (free tier) |
| n8n | $0 (self-hosted) |
| GitHub Actions | $0 (2000 min free) |
| Supabase | $0 (free tier) |
| **TOTAL** | **$50-100** |

## Ethics & Legal

⚠️ **ADVERTENCIA**: Este sistema automatiza comportamiento en redes sociales. Puede violar los ToS de Facebook/Instagram. Úsalo bajo tu propio riesgo.

Recomendaciones:
- NO hacer spam
- Aportar valor genuino
- Respetar reglas de grupos
- Pausar ante primera señal de shadowban

## Soporte

Para issues técnicos, revisar logs en:
- GitHub Actions: https://github.com/ecucondorSA/autorenta/actions
- Supabase Logs: Dashboard → Logs → Edge Functions
- n8n Executions: n8n Dashboard → Executions

---

**Última actualización**: 2026-01-27
