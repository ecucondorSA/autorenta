# AutoRenta - Car Rental Marketplace

AutoRenta es una plataforma de alquiler de autos para Argentina construida con Angular 17, Supabase y MercadoPago.

## 🚀 Características Principales

- **Sistema de Wallet** con depósitos y retiros via MercadoPago
- **Gestión de Reservas** con garantías bilaterales
- **Autenticación** con Supabase Auth
- **Pagos** integrados con MercadoPago (Argentina)
- **Panel de Administración** para gestión de usuarios y transacciones

## 💳 Integración con MercadoPago

### Configuración Actual
- **País:** Argentina
- **Moneda:** ARS (Pesos Argentinos)
- **Public Key:** `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd`
- **Access Token:** Configurado en Supabase

### Edge Functions Desplegadas
- `mercadopago-create-preference` - Crea preferencias de pago para depósitos
- `mercadopago-webhook` - Procesa notificaciones IPN de MercadoPago

Para más detalles, ver [MERCADOPAGO_SETUP.md](./MERCADOPAGO_SETUP.md)

## 🗺️ Integración con Mapbox

El componente de mapa interactivo utiliza Mapbox GL para mostrar la ubicación de los autos disponibles.

### Configuración del Token

**Desarrollo:**
```bash
# .env.development.local
NG_APP_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiWU9VUl9VU0VSTkFNRSIsImEiOiJjbGV2ZXJ0b2tlbiJ9...
```

**Producción (Cloudflare Pages):**
```bash
# Variables de entorno en Cloudflare Pages dashboard
NG_APP_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiWU9VUl9VU0VSTkFNRSIsImEiOiJjbGV2ZXJ0b2tlbiJ9...
```

**Obtener un token:**
1. Crear cuenta en [mapbox.com](https://www.mapbox.com/)
2. Ir a Account → Access tokens
3. Crear un nuevo token con scope `styles:read` y `fonts:read`
4. Copiar el token y configurarlo en las variables de entorno

⚠️ **Sin un token válido, el mapa mostrará un mensaje de error al usuario.**

## 🛠️ Tecnologías

- **Frontend:** Angular 17 (Standalone Components)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Pagos:** MercadoPago (Argentina)
- **Maps:** Mapbox GL JS
- **Styling:** Tailwind CSS
- **Deployment:** Cloudflare Pages

## 📚 Documentación

- [MERCADOPAGO_SETUP.md](./MERCADOPAGO_SETUP.md) - Configuración de pagos
- [WALLET_BILATERAL_RELEASE_SYSTEM.md](./WALLET_BILATERAL_RELEASE_SYSTEM.md) - Sistema de wallet
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guía de despliegue

---

## Development

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
