# Social Publisher - Setup Guide

Guía completa para configurar y usar el servidor de publicación en redes sociales.

## 📋 Tabla de Contenidos

1. [Instalación Rápida](#instalación-rápida)
2. [Configuración de Credenciales](#configuración-de-credenciales)
3. [Iniciar el Servidor](#iniciar-el-servidor)
4. [Integración con Angular](#integración-con-angular)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Instalación Rápida

```bash
# Navegar a la carpeta
cd apps/social-publisher

# Instalar dependencias
bun install

# Copiar .env
cp .env.example .env

# Editar .env con tus credenciales
nano .env  # o tu editor favorito

# Iniciar en desarrollo
bun run dev

# Ver en http://localhost:3001/health
```

---

## 🔐 Configuración de Credenciales

### 1️⃣ Facebook & Instagram

#### Obtener Facebook Page Access Token

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva aplicación (App)
3. Agrega el producto **Instagram Graph API**
4. Ve a **Configuración** > **Básica** para ver tu **App ID** y **App Secret**
5. Ve a **Facebook Graph API Explorer**
6. Selecciona tu aplicación y versión de API
7. Obtén un token de página accediendo a:
   ```
   GET /me/accounts?fields=access_token,name
   ```

#### Credenciales Necesarias

```env
# En apps/social-publisher/.env
FACEBOOK_PAGE_ID=123456789
FACEBOOK_PAGE_ACCESS_TOKEN=EAABsdfn...
INSTAGRAM_BUSINESS_ACCOUNT_ID=987654321
INSTAGRAM_ACCESS_TOKEN=IGQVJ...
```

### 2️⃣ LinkedIn

#### Obtener LinkedIn Access Token

1. Ve a [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Crea una nueva aplicación
3. Solicita acceso a:
   - `ugcPost` (Create UGC posts)
   - `media:read` (Read media)
   - `organizations:read` (Read organization info)
4. Una vez aprobado, genera un **personal access token**
5. Obtén tu **Organization ID** desde:
   ```
   GET https://api.linkedin.com/v2/organizationAcls?q=roleAssignee
   ```

#### Credenciales Necesarias

```env
# En apps/social-publisher/.env
LINKEDIN_ORGANIZATION_ID=123456789
LINKEDIN_ACCESS_TOKEN=eyJhbGciOi...
```

### 3️⃣ TikTok

#### Obtener TikTok Access Token

1. Ve a [TikTok Developer](https://developer.tiktok.com/)
2. Crea una nueva aplicación
3. Solicita acceso a **TikTok Business API**
4. Completa el proceso de verificación y aprobación
5. Configura **OAuth 2.0** con redirect URI
6. Después de aprobado, obtén tu **Business Account ID**

#### Credenciales Necesarias

```env
# En apps/social-publisher/.env
TIKTOK_BUSINESS_ACCOUNT_ID=987654321
TIKTOK_ACCESS_TOKEN=v1.123abc...
```

### Archivo .env Completo

```env
# ============================================
# Social Publisher Configuration
# ============================================

# Facebook & Instagram
FACEBOOK_PAGE_ID=123456789
FACEBOOK_PAGE_ACCESS_TOKEN=EAABsdfn...
INSTAGRAM_BUSINESS_ACCOUNT_ID=987654321
INSTAGRAM_ACCESS_TOKEN=IGQVJ...

# LinkedIn
LINKEDIN_ORGANIZATION_ID=123456789
LINKEDIN_ACCESS_TOKEN=eyJhbGciOi...

# TikTok
TIKTOK_BUSINESS_ACCOUNT_ID=987654321
TIKTOK_ACCESS_TOKEN=v1.123abc...

# Server Configuration
PORT=3001
SOCIAL_PUBLISHER_API_KEY=your-secure-api-key-here
NODE_ENV=development
```

---

## 🎯 Iniciar el Servidor

### Desarrollo (Con Hot Reload)

```bash
cd apps/social-publisher
bun run dev
```

```
🚀 Social Publisher Server running on http://localhost:3001
📝 Publish endpoint: POST /api/publish
📤 Upload endpoint: POST /api/publish/upload
📅 Scheduled posts: GET /api/scheduled
❌ Cancel scheduled: DELETE /api/scheduled/:postId
```

### Producción

```bash
cd apps/social-publisher
bun run build
bun run start
```

### Verificar Que Funciona

```bash
# Health check
curl http://localhost:3001/health

# Respuesta esperada:
# {"status":"ok","timestamp":"2025-01-16T10:30:00.000Z"}
```

---

## 🔌 Integración con Angular

### 1. Usar el Componente Standalone

```typescript
import { SocialPublisherComponent } from '@shared/components/social-publisher/social-publisher.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SocialPublisherComponent],
  template: `
    <app-social-publisher></app-social-publisher>
  `,
})
export class DashboardComponent {}
```

### 2. Configurar Variables en localStorage

Antes de usar el componente, configura en el `AppComponent` o servicio:

```typescript
// app.component.ts
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    // Configurar en desarrollo
    if (!environment.production) {
      localStorage.setItem('SOCIAL_PUBLISHER_API_KEY', 'dev-api-key-change-in-production');
      localStorage.setItem('SOCIAL_PUBLISHER_URL', 'http://localhost:3001');
    } else {
      // En producción, usar variables de entorno de Vercel/Netlify
      localStorage.setItem('SOCIAL_PUBLISHER_API_KEY', environment.socialPublisherApiKey);
      localStorage.setItem('SOCIAL_PUBLISHER_URL', environment.socialPublisherUrl);
    }
  }
}
```

### 3. Actualizar `environment.ts`

```typescript
// environment.ts
export const environment = {
  production: true,
  socialPublisherApiKey: 'your-production-api-key',
  socialPublisherUrl: 'https://your-domain.com/api',
};

// environment.development.ts
export const environment = {
  production: false,
  socialPublisherApiKey: 'dev-key',
  socialPublisherUrl: 'http://localhost:3001',
};
```

### 4. Alternativa: Usar el Cliente Directamente

```typescript
import { SocialPublisherClient } from '@social-publisher/client';

export class MyService {
  private client = new SocialPublisherClient(
    'http://localhost:3001',
    'dev-api-key'
  );

  async publishContent(platforms: string[], text: string, files: File[]) {
    return await this.client.publishWithFiles(
      platforms,
      text,
      files,
      ['business', 'marketing']
    );
  }
}
```

---

## 🧪 Testing

### Con cURL

```bash
# 1. Publicar texto inmediatamente
curl -X POST http://localhost:3001/api/publish \
  -H "Authorization: Bearer dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["facebook", "instagram", "linkedin"],
    "content": {
      "text": "Hello from Social Publisher! 🚀",
      "hashtags": ["test", "demo"]
    }
  }'

# 2. Publicar con archivos
curl -X POST http://localhost:3001/api/publish/upload \
  -H "Authorization: Bearer dev-api-key-change-in-production" \
  -F "platforms=facebook,instagram" \
  -F "text=Beautiful sunset 🌅" \
  -F "hashtags=travel,photography" \
  -F "media=@/path/to/image.jpg"

# 3. Obtener posts agendados
curl http://localhost:3001/api/scheduled \
  -H "Authorization: Bearer dev-api-key-change-in-production"

# 4. Cancelar post agendado
curl -X DELETE http://localhost:3001/api/scheduled/1705353600000-abc123 \
  -H "Authorization: Bearer dev-api-key-change-in-production"
```

### Con Postman

1. Importar colección (crear en Postman)
2. Variables de entorno:
   - `{{base_url}}` = http://localhost:3001
   - `{{api_key}}` = dev-api-key-change-in-production

### Con Node.js

```typescript
// test.ts
import { SocialPublisherClient } from './src/client';

const client = new SocialPublisherClient(
  'http://localhost:3001',
  'dev-api-key-change-in-production'
);

// Publicar texto
const result = await client.publishNow({
  platforms: ['facebook', 'instagram'],
  content: {
    text: 'Test post from Node.js! 🎉',
    hashtags: ['test', 'nodejs'],
  },
});

console.log('Published:', result);

// Ejecutar
// bun test.ts
```

---

## 🔧 Troubleshooting

### ❌ "Unauthorized" Error

```
Error: API Error: 401 Unauthorized
```

**Solución:**
- Verifica que el `SOCIAL_PUBLISHER_API_KEY` en el `.env` coincida con el que envías en `Authorization: Bearer`
- Asegúrate de enviar el header: `Authorization: Bearer your-api-key`

### ❌ "Port Already in Use"

```
error: listen EADDRINUSE: address already in use :::3001
```

**Solución:**
```bash
# Ver qué proceso usa el puerto
lsof -i :3001

# O cambiar puerto en .env
PORT=3002 bun run dev
```

### ❌ API Credentials Error

```
Error: Facebook API Error: Invalid OAuth access token
```

**Solución:**
- Regenera el token en Facebook Developers
- Verifica que el token no haya expirado
- Chequea que la page tenga los permisos necesarios

### ❌ CORS Error

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solución:**

Si consumes desde un dominio diferente, agrega CORS al servidor:

```typescript
// En src/index.ts
fetch(request) {
  // Agregar headers CORS
  const response = new Response(...);
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
```

### ❌ Video Upload Fails

```
Error: TikTok requires at least one video
```

**Solución:**
- TikTok requiere **videos**, no imágenes
- Formatos soportados: MP4, WebM
- Duración máxima: 60 segundos

### ✅ Verificar que Todo Funciona

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Publicar simple
curl -X POST http://localhost:3001/api/publish \
  -H "Authorization: Bearer dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["facebook"],
    "content": { "text": "Test" }
  }'

# 3. Ver logs del servidor
# El servidor debe mostrar: [TIMESTAMP] Publishing to facebook...
```

---

## 📚 Recursos

- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Instagram Graph API](https://developers.instagram.com/docs/instagram-api)
- [LinkedIn API](https://learn.microsoft.com/en-us/linkedin/shared/api-reference/api-reference-index)
- [TikTok Business API](https://business-api.tiktok.com/)
- [Bun Documentation](https://bun.sh/docs)

---

## 🎓 Próximos Pasos

1. ✅ Setup completado
2. 📝 Prueba con posts simples (texto)
3. 🖼️ Agrega imágenes
4. 🎬 Prueba con videos
5. 📅 Prueba agendamiento
6. 🔗 Integra en tu app Angular
7. 🚀 Deploy a producción

---

**¿Necesitas ayuda?**

- Revisa los logs del servidor: `bun run dev`
- Consulta README.md para documentación de API
- Prueba con cURL antes de integrar en la app

¡Exitoso! 🎉
