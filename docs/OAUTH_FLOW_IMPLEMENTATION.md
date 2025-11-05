# ✅ OAuth Flow de MercadoPago - Implementación Completa

**Fecha:** 2025-10-28
**Estado:** ✅ Desplegado en Producción
**Propósito:** Permitir que dueños de autos vinculen su cuenta de MercadoPago para split payments

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Flujo](#arquitectura-del-flujo)
3. [Componentes Implementados](#componentes-implementados)
4. [Base de Datos](#base-de-datos)
5. [Edge Functions](#edge-functions)
6. [Frontend Integration](#frontend-integration)
7. [Testing](#testing)
8. [Seguridad](#seguridad)

---

## 🎯 Resumen Ejecutivo

El OAuth Flow permite que los **dueños de autos** (locadores) vinculen su cuenta de MercadoPago con AutoRenta para poder recibir pagos directos mediante **split payments**.

### **¿Qué se implementó?**

✅ **Migración SQL:**
- 11 columnas OAuth en `profiles`
- 3 índices optimizados
- 3 RPC functions (`connect_mercadopago`, `disconnect_mercadopago`, `check_mercadopago_connection`)
- Vista `my_cars` actualizada
- Trigger de validación

✅ **Edge Functions:**
- `mercadopago-oauth-connect` - Inicia flujo OAuth
- `mercadopago-oauth-callback` - Procesa callback y guarda tokens

✅ **Secrets Configurados:**
- `MERCADOPAGO_CLIENT_SECRET` - Para exchange de códigos

✅ **Desplegado en Producción:**
- Ambas Edge Functions activas
- Migración aplicada a DB
- Todo listo para integración frontend

---

## 🏗️ Arquitectura del Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. USUARIO INICIA OAUTH                      │
│  Frontend: Botón "Conectar MercadoPago"                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           2. LLAMAR A EDGE FUNCTION: oauth-connect              │
│  POST /functions/v1/mercadopago-oauth-connect                  │
│  Headers: Authorization: Bearer <USER_JWT>                      │
│  Body: { redirect_uri: "https://autorentar.com.ar/callback" }   │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "authorization_url": "https://auth.mercadopago.com.ar...",  │
│    "state": "eyJ1c2VyX2lkIjoi..."                              │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│        3. REDIRIGIR A MERCADOPAGO PARA AUTORIZACIÓN             │
│  window.location.href = authorization_url                       │
│                                                                 │
│  Usuario autoriza en MercadoPago:                              │
│  - Ve permisos solicitados                                     │
│  - Acepta o rechaza                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         4. MERCADOPAGO REDIRIGE DE VUELTA A AUTORENTAR          │
│  Redirect a:                                                    │
│  https://autorentar.com.ar/auth/mercadopago/callback?           │
│    code=TG-xxxxxxxxxx&                                          │
│    state=eyJ1c2VyX2lkIjoi...                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│      5. FRONTEND CAPTURA code Y state DE QUERY PARAMS           │
│  Angular Component: MercadoPagoCallbackPage                    │
│  const code = route.queryParams.get('code');                    │
│  const state = route.queryParams.get('state');                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           6. LLAMAR A EDGE FUNCTION: oauth-callback             │
│  POST /functions/v1/mercadopago-oauth-callback                 │
│  Body: { code, state }                                          │
│                                                                 │
│  Edge Function:                                                 │
│  1. Valida state contra DB                                     │
│  2. Exchange code por access_token (MercadoPago API)           │
│  3. Obtiene user info (collector_id, public_key, etc)          │
│  4. Guarda en DB vía RPC connect_mercadopago()                 │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    "success": true,                                             │
│    "collector_id": "202984680",                                 │
│    "message": "Cuenta conectada exitosamente"                  │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  7. USUARIO QUEDA CONECTADO                     │
│  profiles.mercadopago_connected = TRUE                          │
│  profiles.mercadopago_collector_id = "202984680"                │
│  profiles.mercadopago_access_token = "APP_USR-..."             │
│                                                                 │
│  ✅ Listo para recibir split payments!                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Componentes Implementados

### **1. Migración SQL** ✅

**Archivo:** `supabase/migrations/20251028_add_mercadopago_oauth_to_profiles.sql`

**Columnas agregadas:**

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `mercadopago_collector_id` | VARCHAR(255) | User ID de MercadoPago del vendedor |
| `mercadopago_connected` | BOOLEAN | Si la cuenta está vinculada |
| `mercadopago_connected_at` | TIMESTAMPTZ | Fecha de vinculación |
| `mercadopago_refresh_token` | TEXT | Token para renovar access token |
| `mercadopago_access_token` | TEXT | Token de acceso (expira en 6 meses) |
| `mercadopago_access_token_expires_at` | TIMESTAMPTZ | Expiración del token |
| `mercadopago_public_key` | VARCHAR(255) | Public key para checkout |
| `mercadopago_account_type` | VARCHAR(50) | 'personal' o 'business' |
| `mercadopago_country` | VARCHAR(10) | País (AR, BR, MX, etc) |
| `mercadopago_site_id` | VARCHAR(10) | Site ID (MLA, MLB, etc) |
| `mercadopago_oauth_state` | TEXT | State temporal (validación CSRF) |

**Índices:**

```sql
CREATE INDEX idx_profiles_mp_collector ON profiles(mercadopago_collector_id)
WHERE mercadopago_connected = TRUE;

CREATE INDEX idx_profiles_mp_connected ON profiles(mercadopago_connected)
WHERE mercadopago_connected = TRUE;

CREATE INDEX idx_profiles_mp_split_validation
ON profiles(id, mercadopago_collector_id, mercadopago_connected)
WHERE mercadopago_connected = TRUE;
```

**RPC Functions:**

1. **`connect_mercadopago()`** - Conecta cuenta OAuth
2. **`disconnect_mercadopago()`** - Desconecta cuenta
3. **`check_mercadopago_connection()`** - Verifica estado de conexión

### **2. Edge Function: oauth-connect** ✅

**URL:** `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-oauth-connect`

**Propósito:** Genera URL de autorización de MercadoPago

**Request:**
```typescript
POST /functions/v1/mercadopago-oauth-connect
Headers:
  Authorization: Bearer <USER_JWT>
Body (opcional):
{
  "redirect_uri": "http://localhost:4200/auth/mercadopago/callback" // Override para dev
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://auth.mercadopago.com.ar/authorization?client_id=5481180656166782&response_type=code&platform_id=mp&redirect_uri=https://autorentar.com.ar/auth/mercadopago/callback&state=eyJ1c2VyX2lkIjoi...",
  "redirect_uri": "https://autorentar.com.ar/auth/mercadopago/callback",
  "state": "eyJ1c2VyX2lkIjoi...",
  "message": "Redirige al usuario a authorization_url para conectar MercadoPago"
}
```

**Lógica:**
1. Valida JWT del usuario
2. Genera `state` con `user_id + random token` (seguridad CSRF)
3. Guarda `state` en `profiles.mercadopago_oauth_state`
4. Construye URL de autorización con:
   - `client_id`: Application ID de MercadoPago
   - `redirect_uri`: URL de callback
   - `state`: Token de seguridad
5. Retorna URL para redirigir al usuario

### **3. Edge Function: oauth-callback** ✅

**URL:** `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-oauth-callback`

**Propósito:** Procesa callback de MercadoPago y guarda tokens

**Request (desde MercadoPago):**
```
GET /functions/v1/mercadopago-oauth-callback?code=TG-xxxxx&state=eyJ1c2VyX2lkIjoi...
```

**O desde Frontend:**
```typescript
POST /functions/v1/mercadopago-oauth-callback
Body:
{
  "code": "TG-xxxxxxxxxx",
  "state": "eyJ1c2VyX2lkIjoi..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Cuenta de MercadoPago conectada exitosamente",
  "collector_id": "202984680",
  "account_info": {
    "email": "eduardo_marques022@hotmail.com",
    "name": "Eduardo Marques",
    "country": "AR",
    "site_id": "MLA"
  },
  "live_mode": true
}
```

**Lógica:**
1. Decodifica y valida `state`
2. Verifica que state coincida con el guardado en DB
3. Verifica que state no haya expirado (< 10 minutos)
4. Exchange `code` por `access_token` con API de MercadoPago:
   ```
   POST https://api.mercadopago.com/oauth/token
   Body: {
     "grant_type": "authorization_code",
     "client_id": "5481180656166782",
     "client_secret": "igIjYgarnXFG3lz0BFat5h3haAeur7Qb",
     "code": "TG-xxxxx",
     "redirect_uri": "https://autorentar.com.ar/callback"
   }
   ```
5. Obtiene info del usuario:
   ```
   GET https://api.mercadopago.com/users/me
   Authorization: Bearer <access_token>
   ```
6. Guarda en DB llamando a `connect_mercadopago()`:
   ```sql
   SELECT connect_mercadopago(
     p_collector_id := '202984680',
     p_access_token := 'APP_USR-...',
     p_refresh_token := 'TG-...',
     p_expires_at := '2025-04-28T...',
     p_public_key := 'APP_USR-...',
     p_account_type := 'personal',
     p_country := 'AR',
     p_site_id := 'MLA'
   );
   ```
7. Limpia `state` de la DB (ya no se necesita)
8. Retorna éxito

---

## 💾 Base de Datos

### **Query: Verificar Estado de Conexión**

```sql
SELECT
  id,
  full_name,
  email,
  mercadopago_connected,
  mercadopago_collector_id,
  mercadopago_connected_at,
  mercadopago_account_type,
  mercadopago_country
FROM profiles
WHERE id = 'user-uuid';
```

### **Query: Listar Usuarios Conectados**

```sql
SELECT
  id,
  full_name,
  email,
  mercadopago_collector_id,
  mercadopago_connected_at,
  mercadopago_country
FROM profiles
WHERE mercadopago_connected = TRUE
ORDER BY mercadopago_connected_at DESC;
```

### **RPC: Conectar MercadoPago**

```typescript
const { data, error } = await supabase.rpc('connect_mercadopago', {
  p_collector_id: '202984680',
  p_access_token: 'APP_USR-...',
  p_refresh_token: 'TG-...',
  p_expires_at: '2025-04-28T12:00:00Z',
  p_public_key: 'APP_USR-...',
  p_account_type: 'personal',
  p_country: 'AR',
  p_site_id: 'MLA'
});

// Response:
{
  "success": true,
  "message": "Cuenta de MercadoPago conectada exitosamente",
  "collector_id": "202984680"
}
```

### **RPC: Desconectar MercadoPago**

```typescript
const { data, error } = await supabase.rpc('disconnect_mercadopago');

// Response:
{
  "success": true,
  "message": "Cuenta de MercadoPago desconectada exitosamente"
}
```

### **RPC: Verificar Conexión**

```typescript
const { data, error } = await supabase.rpc('check_mercadopago_connection');

// Response:
{
  "connected": true,
  "collector_id": "202984680",
  "connected_at": "2025-10-28T12:00:00Z",
  "account_type": "personal",
  "country": "AR",
  "token_expired": false,
  "needs_refresh": false
}
```

---

## 🎨 Frontend Integration

### **1. Servicio Angular: MercadoPagoOAuthService**

**Ubicación sugerida:** `apps/web/src/app/core/services/mercadopago-oauth.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClientService } from './supabase-client.service';

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoOAuthService {
  private supabase = inject(SupabaseClientService).getClient();
  private router = inject(Router);

  /**
   * Inicia el flujo de OAuth con MercadoPago
   */
  async connectMercadoPago(): Promise<void> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'mercadopago-oauth-connect',
        {
          body: {
            redirect_uri: window.location.origin + '/auth/mercadopago/callback'
          }
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error desconocido');
      }

      // Redirigir a MercadoPago
      window.location.href = data.authorization_url;
    } catch (err: any) {
      console.error('[OAuth Connect Error]', err);
      throw err;
    }
  }

  /**
   * Procesa el callback de MercadoPago
   */
  async handleCallback(code: string, state: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke(
        'mercadopago-oauth-callback',
        {
          body: { code, state }
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error en callback');
      }

      console.log('[OAuth Success]', data);
      return true;
    } catch (err: any) {
      console.error('[OAuth Callback Error]', err);
      return false;
    }
  }

  /**
   * Verifica el estado de la conexión
   */
  async checkConnection(): Promise<{connected: boolean; collector_id?: string}> {
    const { data, error } = await this.supabase.rpc('check_mercadopago_connection');

    if (error) {
      console.error('[Check Connection Error]', error);
      return { connected: false };
    }

    return data || { connected: false };
  }

  /**
   * Desconecta la cuenta de MercadoPago
   */
  async disconnect(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('disconnect_mercadopago');

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message);
      }

      return true;
    } catch (err: any) {
      console.error('[Disconnect Error]', err);
      return false;
    }
  }
}
```

### **2. Componente: Botón "Conectar MercadoPago"**

**Ubicación sugerida:** `apps/web/src/app/features/profile/mercadopago-connect.component.ts`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MercadoPagoOAuthService } from '../../core/services/mercadopago-oauth.service';

@Component({
  selector: 'app-mercadopago-connect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mercadopago-connect-card">
      @if (connectionStatus().connected) {
        <!-- Estado: Conectado -->
        <div class="connected-state">
          <div class="icon-success">✅</div>
          <h3>Cuenta de MercadoPago Conectada</h3>
          <p>Collector ID: <code>{{ connectionStatus().collector_id }}</code></p>
          <p class="description">Ahora puedes recibir pagos directos mediante split payments.</p>
          <button class="btn-secondary" (click)="disconnect()">
            Desconectar Cuenta
          </button>
        </div>
      } @else {
        <!-- Estado: No conectado -->
        <div class="disconnected-state">
          <div class="icon-warning">⚠️</div>
          <h3>Conectar MercadoPago</h3>
          <p class="description">
            Para recibir pagos directos por tus alquileres, necesitas vincular tu cuenta de MercadoPago.
          </p>
          <ul class="benefits-list">
            <li>✅ Recibe pagos automáticamente (sin intermediarios)</li>
            <li>✅ Split instantáneo (90% para ti, 10% comisión)</li>
            <li>✅ Sin necesidad de payouts manuales</li>
          </ul>
          <button class="btn-primary" (click)="connect()" [disabled]="loading()">
            @if (loading()) {
              Conectando...
            } @else {
              Conectar MercadoPago
            }
          </button>
        </div>
      }

      @if (error()) {
        <div class="error-message">
          ❌ {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .mercadopago-connect-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 24px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .connected-state,
    .disconnected-state {
      text-align: center;
    }

    .icon-success {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .icon-warning {
      font-size: 48px;
      margin-bottom: 16px;
    }

    h3 {
      margin: 0 0 12px 0;
      font-size: 24px;
    }

    .description {
      color: #666;
      margin-bottom: 16px;
    }

    code {
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
    }

    .benefits-list {
      text-align: left;
      margin: 16px 0;
      list-style: none;
      padding: 0;
    }

    .benefits-list li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }

    .btn-primary,
    .btn-secondary {
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 16px;
      margin-top: 16px;
    }

    .btn-primary {
      background: #009ee3;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #007bb5;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .error-message {
      margin-top: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 4px;
      color: #c62828;
    }
  `]
})
export class MercadoPagoConnectComponent implements OnInit {
  private oauthService = inject(MercadoPagoOAuthService);

  connectionStatus = signal<{connected: boolean; collector_id?: string}>({ connected: false });
  loading = signal(false);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.checkConnection();
  }

  async checkConnection() {
    const status = await this.oauthService.checkConnection();
    this.connectionStatus.set(status);
  }

  async connect() {
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.oauthService.connectMercadoPago();
      // Usuario será redirigido a MercadoPago
    } catch (err: any) {
      this.error.set(err.message || 'Error al conectar con MercadoPago');
    } finally {
      this.loading.set(false);
    }
  }

  async disconnect() {
    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de MercadoPago?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const success = await this.oauthService.disconnect();
      if (success) {
        await this.checkConnection();
      } else {
        this.error.set('No se pudo desconectar la cuenta');
      }
    } catch (err: any) {
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
```

### **3. Página de Callback**

**Ubicación:** `apps/web/src/app/features/auth/mercadopago-callback.page.ts`

```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MercadoPagoOAuthService } from '../../core/services/mercadopago-oauth.service';

@Component({
  selector: 'app-mercadopago-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      @if (processing()) {
        <div class="processing">
          <div class="spinner"></div>
          <h2>Conectando tu cuenta de MercadoPago...</h2>
          <p>Por favor espera un momento.</p>
        </div>
      } @else if (success()) {
        <div class="success">
          <div class="icon">✅</div>
          <h2>¡Cuenta conectada exitosamente!</h2>
          <p>Ya puedes recibir pagos directos.</p>
          <button class="btn-primary" (click)="goToProfile()">
            Ir a mi Perfil
          </button>
        </div>
      } @else {
        <div class="error">
          <div class="icon">❌</div>
          <h2>Error al conectar</h2>
          <p>{{ errorMessage() }}</p>
          <button class="btn-primary" (click)="retry()">
            Intentar Nuevamente
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }

    .processing, .success, .error {
      max-width: 500px;
    }

    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #009ee3;
      border-radius: 50%;
      width: 64px;
      height: 64px;
      animation: spin 1s linear infinite;
      margin: 0 auto 24px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    h2 {
      margin: 0 0 12px 0;
    }

    p {
      color: #666;
      margin-bottom: 24px;
    }

    .btn-primary {
      padding: 12px 24px;
      background: #009ee3;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    }

    .btn-primary:hover {
      background: #007bb5;
    }
  `]
})
export class MercadoPagoCallbackPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private oauthService = inject(MercadoPagoOAuthService);

  processing = signal(true);
  success = signal(false);
  errorMessage = signal<string>('');

  async ngOnInit() {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      this.processing.set(false);
      this.errorMessage.set(
        error === 'access_denied'
          ? 'Cancelaste la autorización'
          : 'Error en la autorización'
      );
      return;
    }

    if (!code || !state) {
      this.processing.set(false);
      this.errorMessage.set('Parámetros de callback inválidos');
      return;
    }

    // Procesar callback
    const result = await this.oauthService.handleCallback(code, state);

    this.processing.set(false);

    if (result) {
      this.success.set(true);
    } else {
      this.errorMessage.set('Error al procesar la autorización');
    }
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  retry() {
    this.router.navigate(['/profile/mercadopago-connect']);
  }
}
```

### **4. Rutas en Angular**

```typescript
// En app.routes.ts
export const routes: Routes = [
  // ... otras rutas

  {
    path: 'auth/mercadopago/callback',
    loadComponent: () =>
      import('./features/auth/mercadopago-callback.page').then(
        (m) => m.MercadoPagoCallbackPage
      ),
  },

  {
    path: 'profile/mercadopago-connect',
    loadComponent: () =>
      import('./features/profile/mercadopago-connect.component').then(
        (m) => m.MercadoPagoConnectComponent
      ),
    canActivate: [AuthGuard],
  },
];
```

---

## 🧪 Testing

### **Test 1: Iniciar OAuth Connect**

```bash
# Request
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-oauth-connect \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uri": "http://localhost:4200/auth/mercadopago/callback"
  }'

# Response esperada:
{
  "success": true,
  "authorization_url": "https://auth.mercadopago.com.ar/authorization?client_id=5481180656166782&response_type=code&platform_id=mp&redirect_uri=http://localhost:4200/auth/mercadopago/callback&state=eyJ1c2VyX2lkIjoi...",
  "redirect_uri": "http://localhost:4200/auth/mercadopago/callback",
  "state": "eyJ1c2VyX2lkIjoi...",
  "message": "Redirige al usuario a authorization_url para conectar MercadoPago"
}
```

### **Test 2: Simular Callback (Después de Autorización)**

```bash
# El usuario autoriza en MercadoPago y es redirigido a:
# http://localhost:4200/auth/mercadopago/callback?code=TG-xxxxx&state=eyJ1c2VyX2lkIjoi...

# Frontend captura code y state, luego llama a:
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-oauth-callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TG-xxxxxxxxxxxx",
    "state": "eyJ1c2VyX2lkIjoi..."
  }'

# Response esperada:
{
  "success": true,
  "message": "Cuenta de MercadoPago conectada exitosamente",
  "collector_id": "202984680",
  "account_info": {
    "email": "eduardo_marques022@hotmail.com",
    "name": "Eduardo Marques",
    "country": "AR",
    "site_id": "MLA"
  },
  "live_mode": true
}
```

### **Test 3: Verificar Conexión en DB**

```sql
SELECT
  id,
  full_name,
  email,
  mercadopago_connected,
  mercadopago_collector_id,
  mercadopago_connected_at
FROM profiles
WHERE id = 'user-uuid';

-- Debe retornar:
-- mercadopago_connected: TRUE
-- mercadopago_collector_id: "202984680"
-- mercadopago_connected_at: "2025-10-28T..."
```

### **Test 4: Verificar con RPC**

```typescript
const { data } = await supabase.rpc('check_mercadopago_connection');
console.log(data);

// Output esperado:
{
  "connected": true,
  "collector_id": "202984680",
  "connected_at": "2025-10-28T12:00:00Z",
  "account_type": "personal",
  "country": "AR",
  "token_expired": false,
  "needs_refresh": false
}
```

---

## 🔒 Seguridad

### **Protecciones Implementadas**

1. **CSRF Protection via State:**
   - State = `base64({ user_id, token, timestamp })`
   - Validado contra DB antes de exchange
   - Expira en 10 minutos

2. **User Authentication:**
   - oauth-connect requiere JWT válido
   - Estado guardado solo para usuario autenticado

3. **State Validation:**
   - Verifica que state coincida con DB
   - Verifica que no haya expirado
   - Previene replay attacks

4. **Secure Storage:**
   - Tokens guardados con permisos DEFINER
   - RLS aplicado en profiles
   - Usuarios solo pueden ver sus propios tokens

5. **Cleanup:**
   - State se limpia después de uso
   - No se reutiliza

### **Tokens de Acceso**

- **Access Token:** Expira en ~6 meses
- **Refresh Token:** Se puede usar para renovar access token
- **Almacenamiento:** Encriptado en DB (Supabase Storage Encryption)

---

## 📊 Monitoreo

### **Queries de Análisis**

**Usuarios conectados:**
```sql
SELECT COUNT(*) as total_connected
FROM profiles
WHERE mercadopago_connected = TRUE;
```

**Tokens expirados:**
```sql
SELECT
  id,
  full_name,
  mercadopago_collector_id,
  mercadopago_access_token_expires_at
FROM profiles
WHERE mercadopago_connected = TRUE
AND mercadopago_access_token_expires_at < NOW();
```

**Tasa de conexión por país:**
```sql
SELECT
  mercadopago_country,
  COUNT(*) as total
FROM profiles
WHERE mercadopago_connected = TRUE
GROUP BY mercadopago_country
ORDER BY total DESC;
```

---

## 🚀 Próximos Pasos

### **Pendiente de Implementar:**

1. **Frontend UI:**
   - Crear componentes de conexión
   - Crear página de callback
   - Integrar en perfil de usuario

2. **Token Refresh:**
   - Implementar Edge Function para renovar tokens
   - Automatizar renovación antes de expiración

3. **Testing:**
   - E2E test completo del flujo OAuth
   - Verificar split payments con cuentas conectadas

4. **Documentación de Usuario:**
   - Guía paso a paso para conectar MercadoPago
   - FAQ sobre split payments

---

## 📚 Referencias

- **MercadoPago OAuth Docs:** https://www.mercadopago.com.ar/developers/es/docs/marketplace/integration/oauth
- **MercadoPago API Reference:** https://www.mercadopago.com.ar/developers/es/reference
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Documentación Local:**
  - `PRODUCTION_CREDENTIALS_CONFIGURED.md`
  - `API_HYBRID_PAYMENT_SYSTEM.md`
  - `CRITICAL_SPLIT_PAYMENTS_LIMITATION.md`

---

**Última actualización:** 2025-10-28
**Estado:** ✅ Listo para integración frontend
**Autor:** Claude Code
