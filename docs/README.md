# 🚗 Autorenta

> **La plataforma P2P de alquiler de autos líder en Latinoamérica.**  
> Similar a Turo/Airbnb, conectando propietarios de vehículos con conductores verificados.

[![CI](https://github.com/ecucondorSA/autorenta/actions/workflows/ci.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/ci.yml)
[![Build and Deploy](https://github.com/ecucondorSA/autorenta/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/build-and-deploy.yml)
[![Code Coverage](https://github.com/ecucondorSA/autorenta/actions/workflows/code-coverage.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/code-coverage.yml)

---

## 🌟 Visión General

Autorenta es una plataforma moderna de car-sharing que democratiza el alquiler de vehículos. Permite a los propietarios rentabilizar sus autos y a los conductores acceder a vehículos de calidad sin la burocracia de las agencias tradicionales.

### Características Principales

-   **🔐 Identidad Verificada:** Validación biométrica y de documentos (KYC) para conductores y propietarios.
-   **💳 Billetera Digital (Wallet):** Gestión de saldos, depósitos en garantía y pagos P2P integrados.
-   **🛡️ Seguro FGO (Fondo de Garantía Operativa):** Sistema propio de cobertura para proteger los vehículos durante los viajes.
-   **📲 Flujo de Reserva Completo:** Solicitud, Aprobación, Check-in digital (fotos/estado), Viaje y Devolución.
-   **🤖 Automatización:** Scripts y herramientas para gestión de flota y precios dinámicos.
-   **🌎 Pagos Locales:** Integración profunda con MercadoPago para operaciones en LATAM.

---

## 🛠️ Tech Stack

El proyecto utiliza tecnologías de vanguardia para asegurar rendimiento, escalabilidad y una excelente experiencia de desarrollador.

### Frontend (Web & Mobile)
-   **Framework:** Angular 18+ (Standalone Components, Signals, Control Flow).
-   **UI Library:** Ionic Framework 8 (Componentes móviles nativos).
-   **Estilos:** TailwindCSS (Diseño utilitario y responsive).
-   **Estado:** Signals nativos de Angular + RxJS.
-   **Mapas:** Mapbox GL JS.

### Backend & Infraestructura
-   **Plataforma:** Supabase (BaaS).
-   **Base de Datos:** PostgreSQL con RLS (Row Level Security) robusto.
-   **API:** PostgREST (generada automáticamente) + Edge Functions (Deno/Node).
-   **Almacenamiento:** Supabase Storage (imágenes de autos, documentos, inspecciones).
-   **Autenticación:** Supabase Auth (Email, Social, OTP).

### Herramientas de Desarrollo
-   **Monorepo:** Estructura tipo Nx (`apps/`, `tools/`, `packages/`).
-   **Package Manager:** PNPM.
-   **Testing:** Vitest (Unitario), Playwright (E2E).
-   **Linter/Formatter:** ESLint, Prettier.

---

## 🚀 Comenzando (Getting Started)

Sigue estos pasos para levantar el entorno de desarrollo local.

### Prerrequisitos
-   Node.js v20+
-   PNPM (`npm install -g pnpm`)
-   Docker (opcional, para emular Supabase localmente)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/ecucondorSA/autorenta.git
cd autorenta

# 2. Instalar dependencias
pnpm install
```

### Configuración de Entorno

Copia el archivo de ejemplo y configura tus variables de entorno (Supabase URL, Keys, etc.).

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

### Ejecutar Servidor de Desarrollo

```bash
# Levantar la aplicación web (Angular)
pnpm dev:web
# Accede a http://localhost:4200
```

### Otros Comandos Útiles

| Comando | Descripción |
| :--- | :--- |
| `pnpm build` | Compila la aplicación para producción. |
| `pnpm test:unit` | Ejecuta tests unitarios con Vitest. |
| `pnpm test:e2e` | Ejecuta tests E2E con Playwright. |
| `pnpm lint` | Analiza el código en busca de errores. |
| `pnpm format` | Formatea el código automáticamente. |

---

## 📂 Estructura del Proyecto

```text
autorenta/
├── apps/
│   └── web/              # Aplicación principal Angular/Ionic
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/         # Servicios singleton, modelos, guardas
│       │   │   ├── features/     # Módulos funcionales (booking, cars, wallet)
│       │   │   ├── layout/       # Componentes estructurales (header, footer)
│       │   │   └── shared/       # Componentes reusables (UI kit)
│       │   └── assets/
│       └── ...
├── supabase/             # Configuración de Backend
│   ├── migrations/       # Esquema de base de datos SQL
│   ├── functions/        # Edge Functions (Backend logic)
│   └── tests/            # Tests de base de datos
├── tools/                # Scripts de automatización y CI/CD
├── docs/                 # Documentación detallada
└── package.json
```

---

## 📚 Documentación

Para mantener orden y descubribilidad, la documentación principal quedó agrupada por dominio:

- `docs/engineering/`: backend, arquitectura técnica, despliegue, testing y troubleshooting.
- `docs/operations/`: operación del sistema, runbooks y seguimiento operativo.
- `docs/product/`: flujos funcionales de reservas y pagos.
- `docs/security/`: políticas y auditorías de seguridad.
- `docs/business/`: documentación ejecutiva e inversores.
- `docs/mobile/`: guías Android/Play Store y optimización móvil.
- `docs/marketing/`: playbooks de contenido, social y campañas.
- `docs/strategy/`: roadmap, manifiesto y planes de implementación.
- `docs/compliance/`: material regulatorio y contractual.

Entradas recomendadas:

- [**Sistema de Reservas**](./product/BOOKING_SYSTEM.md): Flujos de estados y ciclo de reserva.
- [**Pagos y Billetera**](./product/PAYMENT_FLOWS.md): Integración de pagos y garantías.
- [**Base de Datos**](./engineering/DATABASE_SCHEMA.md): Modelo de datos, RLS y triggers.
- [**Edge Functions**](./engineering/EDGE_FUNCTIONS.md): Lógica de servidor y webhooks.
- [**Despliegue**](./engineering/DEPLOYMENT.md): CI/CD y publicación.
- [**Roadmap General**](./strategy/ROADMAP-2026.md): prioridades y secuencia de entrega.
- [**Guía Mobile**](./mobile/ANDROID_OPTIMIZATION_GUIDE.md): optimizaciones para Android.

---

## 🤝 Contribución

1.  Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`).
2.  Realiza tus cambios siguiendo las convenciones de código.
3.  Asegúrate de que los tests pasen (`pnpm test`).
4.  Abre un Pull Request (PR) describiendo tus cambios.

---

**© 2026 Autorenta.** Todos los derechos reservados.
