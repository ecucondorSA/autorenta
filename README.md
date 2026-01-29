# 🚗 Autorenta | Plataforma P2P de Car Sharing

[![CI Status](https://github.com/ecucondorSA/autorenta/actions/workflows/ci.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/ci.yml)
[![Deployment](https://github.com/ecucondorSA/autorenta/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/build-and-deploy.yml)
[![Coverage](https://github.com/ecucondorSA/autorenta/actions/workflows/code-coverage.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/code-coverage.yml)
[![Security](https://github.com/ecucondorSA/autorenta/actions/workflows/security-scan.yml/badge.svg)](https://github.com/ecucondorSA/autorenta/actions/workflows/security-scan.yml)

> **La evolución de la movilidad en Latinoamérica.**  
> Autorenta no es solo una app de alquiler; es un ecosistema descentralizado que conecta a propietarios de vehículos con conductores verificados mediante tecnología segura, identidad digital y gestión financiera automatizada.

---

## 📑 Tabla de Contenidos

1.  [Arquitectura del Sistema](#-arquitectura-del-sistema)
2.  [Stack Tecnológico](#-stack-tecnológico)
3.  [Módulos Principales](#-módulos-principales)
    *   [Gestión de Identidad (KYC)](#gestión-de-identidad-kyc)
    *   [Motor de Reservas](#motor-de-reservas)
    *   [Billetera Digital & Pagos](#billetera-digital--pagos)
4.  [Modelo de Negocio y Legal](#-modelo-de-negocio-y-legal)
    *   [Suscripción (Autorentar Club)](#suscripción-autorentar-club)
    *   [Preautorización y Garantías](#preautorización-y-garantías)
    *   [Comodato Digital](#comodato-digital)
    *   [Fondo de Garantía (FGO)](#fondo-de-garantía-fgo)
5.  [Estructura del Proyecto](#-estructura-del-proyecto)
6.  [Configuración y Desarrollo](#-configuración-y-desarrollo)
7.  [Scripts y Herramientas](#-scripts-y-herramientas)
8.  [Despliegue e Infraestructura](#-despliegue-e-infraestructura)

---

## 🏛 Arquitectura del Sistema

Autorenta está construido sobre una arquitectura **Serverless** y **Event-Driven**, priorizando la escalabilidad y la seguridad de los datos.

*   **Frontend Agnostico:** Una aplicación web progresiva (PWA) construida con Angular e Ionic que sirve tanto para escritorio como para móvil (Android/iOS), utilizando un diseño "Mobile-First".
*   **Backend as a Service (BaaS):** Supabase actúa como el núcleo, proporcionando Base de Datos (PostgreSQL), Autenticación, Almacenamiento y Tiempo Real.
*   **Seguridad RLS (Row Level Security):** La lógica de acceso a los datos vive en la base de datos. Ninguna consulta sale del frontend sin pasar por políticas estrictas de seguridad que validan si el usuario es `renter`, `owner` o `admin`.
*   **Edge Computing:** La lógica de negocio compleja (procesamiento de pagos, webhooks, notificaciones) se ejecuta en Supabase Edge Functions (Deno), garantizando baja latencia.

---

## 💻 Stack Tecnológico

### Frontend (Apps/Web)
*   **Framework:** Angular 18+ (Standalone Components, Signals, Control Flow syntax `@if`, `@for`).
*   **UI/UX:** Ionic Framework 8 para componentes nativos y TailwindCSS para utilidades de diseño y sistema de diseño (tokens).
*   **Mapas:** Mapbox GL JS para geolocalización precisa de flota.
*   **Estado:** Gestión reactiva basada en Signals y RxJS.

### Backend (Supabase)
*   **Base de Datos:** PostgreSQL 15+ con extensiones PostGIS (geo) y pgvector (IA).
*   **API:** PostgREST (generada automáticamente) + Edge Functions (Deno/Node).
*   **Auth:** Supabase Auth (JWT, OAuth con Google/Apple, OTP).
*   **Storage:** Buckets seguros para documentos KYC e imágenes de vehículos.

### Integraciones Externas
*   **Pagos:** MercadoPago (SDK v2) para procesamiento de tarjetas, split payments y webhooks.
*   **IA/ML:** Integración con modelos Gemini para análisis de imágenes y asistencia al usuario.

---

## 📦 Módulos Principales

### Gestión de Identidad (KYC)
El sistema implementa un flujo de **Know Your Customer** riguroso. Antes de poder alquilar o publicar, los usuarios deben verificar:
1.  **Email y Teléfono:** Validación por OTP.
2.  **Documentos:** Carga de DNI/Pasaporte y Licencia de Conducir (frente y dorso).
3.  **Biometría:** (Roadmap) Validación facial contra documentos.
Los estados de verificación (`pending`, `verified`, `rejected`) controlan los permisos globales de la app mediante Guards de Angular.

### Motor de Reservas
Una máquina de estados finitos gestiona el ciclo de vida del alquiler:
1.  **Solicitud:** El conductor selecciona fechas. Se verifica disponibilidad (anti-collision).
2.  **Aprobación:** El propietario acepta o rechaza (o aprobación automática si está activada).
3.  **Pago:** Se procesa el cargo o se bloquea la garantía.
4.  **Check-in:** Inspección digital del vehículo (fotos, odómetro, combustible) firmada por ambas partes.
5.  **Viaje:** Período activo de renta con seguro vigente.
6.  **Check-out:** Inspección final y cálculo de cargos adicionales (combustible, daños).

### Billetera Digital & Pagos
Autorenta opera un sistema de **Ledger (Libro Mayor)** interno:
*   **Wallet:** Cada usuario tiene un saldo virtual en múltiples monedas (ARS/USD).
*   **Split Payments:** Al pagar una reserva, el dinero se divide automáticamente: una parte al propietario, una comisión a la plataforma y otra al fondo de seguros.
*   **Retiros:** Los propietarios pueden solicitar el retiro de sus ganancias a cuentas bancarias (CBU/CVU) integradas.

---

## 💼 Modelo de Negocio y Legal

Autorenta innova no solo en tecnología, sino en la estructura financiera y legal que permite el alquiler entre particulares de forma segura.

### Suscripción (Autorentar Club)
Para reducir la fricción de los altos depósitos de garantía, implementamos **Autorentar Club**.
*   **Concepto:** Los conductores pagan una membresía anual (Access, Silver, Black) que les otorga una "cobertura de franquicia".
*   **Beneficio:** Los miembros del club disfrutan de **depósitos reducidos o $0** al alquilar. La plataforma asume el riesgo de daños menores (deducibles) contra el saldo de cobertura del usuario.
*   **Técnico:** El sistema verifica el nivel de suscripción (`SubscriptionService`) al momento del checkout y ajusta dinámicamente el monto a pre-autorizar.

### Preautorización y Garantías
La seguridad financiera se gestiona mediante bloqueos temporales de fondos, no cobros directos.
*   **Mecanismo:** Utilizamos la API de MercadoPago para crear una **Preautorización (Hold)** en la tarjeta de crédito del conductor.
*   **Flujo:** Los fondos se reservan pero no se debitan. Si el viaje finaliza sin incidentes, el sistema libera automáticamente el bloqueo. Si hay daños, se captura (cobra) total o parcialmente el monto reservado.
*   **Alternativa:** También soportamos bloqueos de saldo en la **Wallet** interna para usuarios sin tarjeta de crédito.

### Comodato Digital
Legalmente, el alquiler se estructura bajo la figura de **Comodato Oneroso** (Préstamo de Uso).
*   **Contrato Dinámico:** Al confirmar la reserva, el sistema genera automáticamente un contrato digital PDF vinculante entre las partes.
*   **Firmas:** Se registran las firmas digitales y la aceptación de términos, junto con la evidencia del estado del vehículo (Check-in/Check-out).
*   **Validez:** Este documento protege al propietario ante multas de tránsito o uso indebido del vehículo durante el periodo de alquiler.

### Fondo de Garantía (FGO)
Un modelo innovador de autoseguro para la comunidad.
*   **Funcionamiento:** Una fracción de cada transacción alimenta el **Fondo de Garantía Operativa**.
*   **Cobertura:** Destinado a cubrir siniestros menores, franquicias no cobrables y eventualidades donde el seguro tradicional no responde o es lento, garantizando que el propietario siempre reciba su compensación.

---

## 📂 Estructura del Proyecto

El repositorio sigue una estructura de monorepo moderna tipo Nx:

```text
autorenta/
├── .github/                # Workflows de GitHub Actions (CI/CD)
├── apps/
│   └── web/                # Aplicación Angular Principal
│       ├── src/app/
│       │   ├── core/       # Servicios Singleton, Modelos, Interceptores, Guards
│       │   ├── features/   # Módulos Lazy-loaded (auth, cars, bookings, wallet, admin)
│       │   ├── layout/     # Componentes estructurales (Header, Sidebar, Footer)
│       │   └── shared/     # UI Kit, Pipes, Directivas, Componentes reusables
├── supabase/               # Infraestructura Backend
│   ├── functions/          # Edge Functions (Node/Deno)
│   ├── migrations/         # Esquema SQL versionado
│   └── seed/               # Datos de prueba
├── tools/                  # Scripts de mantenimiento, auditoría y generación
├── docs/                   # Documentación extendida
└── package.json            # Dependencias raíz y scripts globales
```

---

## ⚙️ Configuración y Desarrollo

### Prerrequisitos
*   **Node.js:** v20 (LTS recomendado).
*   **PNPM:** Gestor de paquetes obligatorio (`npm install -g pnpm`).
*   **Docker:** (Opcional) Para levantar Supabase localmente.

### Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/ecucondorSA/autorenta.git
    cd autorenta
    ```

2.  **Instalar dependencias:**
    ```bash
    pnpm install
    ```

3.  **Variables de Entorno:**
    Duplica el archivo `.env.example` a `.env.local` y completa las credenciales de Supabase y MercadoPago.

4.  **Iniciar Servidor de Desarrollo:**
    ```bash
    pnpm dev:web
    ```
    La aplicación estará disponible en `http://localhost:4200`.

---

## 🛠 Scripts y Herramientas

El proyecto incluye una suite de herramientas en la carpeta `tools/` y `scripts/` para automatizar tareas.

### Optimización de Modelos 3D (.glb)

Para la visualización de autos en 3D, utilizamos un script crítico de Python (`optimize_glb.py`) que prepara los activos para móviles.

**Características:**
*   Compresión de geometría **Draco**.
*   Redimensionamiento de texturas a **1K (1024x1024)**.
*   Conversión de texturas a formato **KTX2** (GPU friendly).

**Uso:**
```bash
# Requiere: pip install "gltf-transform[cli]"
python autorenta/optimize_glb.py assets/input.glb assets/output.glb
```

---

## 🚀 Despliegue e Infraestructura

### Frontend
El frontend se compila y despliega en **Cloudflare Pages** o **Vercel**, aprovechando su CDN global para la entrega de activos estáticos.

### Backend
Supabase gestiona la base de datos y la autenticación. Las migraciones de base de datos se aplican automáticamente mediante CI/CD al fusionar en `main`.

---

**© 2026 Autorenta S.A.**  
*Innovando la movilidad en Ecuador y Latinoamérica.*
