# 🏢 Auditoría Integral de Plataforma AutoRenta
**Fecha de Revisión:** 02 de Diciembre de 2025
**Versión del Documento:** 1.0.0
**Estado del Sistema:** Beta Avanzada / Pre-Producción

Este documento detalla las capacidades **actualmente implementadas** en la plataforma AutoRenta. Se basa estrictamente en la evidencia encontrada en el código fuente (`apps/web`), base de datos (`supabase/migrations`) y documentación técnica reciente.

---

## 1. Resumen Ejecutivo

AutoRenta es una plataforma de alquiler de vehículos P2P (Peer-to-Peer) y B2C con una arquitectura moderna y descentralizada. A diferencia de un simple "tablón de anuncios", actúa como un **intermediario transaccional completo** que gestiona pagos, seguridad, identidad y disputas.

**Diferenciales Tecnológicos Confirmados:**
- **Pagos Divididos Automáticos:** El dinero no pasa por una cuenta central manual; se distribuye automáticamente (85% propietario / 15% plataforma) vía MercadoPago Marketplace.
- **Precios Dinámicos (Surge Pricing):** Sistema activo que ajusta precios por demanda, hora y eventos (similar a Uber/Airbnb).
- **Evidencia Digital Inmutable:** Sistema "Fine-Grained Observations" (FGO) para inspecciones de vehículos con fotos y firma digital.

---

## 2. Capacidades para Propietarios (Locadores)

### 🚗 Gestión de Inventario y Flotas
*   **Publicación Detallada:** Módulo completo para dar de alta vehículos con fotos, características y documentación legal.
*   **Calendario Inteligente:** Integración bidireccional con **Google Calendar**. Los bloqueos y reservas se sincronizan automáticamente para evitar overbooking.
*   **Precios Avanzados:**
    *   *Precio Fijo:* Tarifa base por día.
    *   *Precio Dinámico:* Algoritmo implementado que ajusta tarifas automáticamente (+10% fin de semana, +20% hora pico, descuentos por baja demanda).

### 💰 Finanzas y Pagos
*   **Split Payments (MercadoPago):** El propietario vincula su cuenta de MercadoPago. Al finalizar un alquiler, recibe su parte (85%) automáticamente.
*   **Wallet Digital:** Panel (`features/wallet`) para visualizar saldo disponible, retenido (en reservas activas) y retirables.
*   **Protección de Activos:** Cálculo automático de depreciación del vehículo vs. ganancias generadas (Notificaciones activas).

### 🛡️ Seguridad Operativa
*   **Check-in/Check-out Digital:** Aplicación web para realizar la entrega y devolución. Permite:
    *   Registrar nivel de combustible y odómetro.
    *   Tomar fotos de daños pre-existentes.
    *   Firmar digitalmente la entrega.
*   **Evaluación de Conductores:** Acceso al historial y calificaciones (Reviews) del solicitante antes de aceptar la reserva.

---

## 3. Capacidades para Arrendatarios (Locatarios)

### 🔍 Experiencia de Búsqueda
*   **Mapa Interactivo:** Búsqueda geoespacial de vehículos disponibles.
*   **Transparencia de Precios:** Desglose claro de tarifas. Si hay "Surge Pricing" (alta demanda), el sistema muestra un aviso y un contador de "Precio Bloqueado" por 15 minutos para completar la compra.
*   **Filtros:** Por tipo de vehículo, precio, características y ubicación.

### 🤝 Proceso de Alquiler
*   **Reserva Segura:** Flujo de estados: *Pendiente -> Confirmada -> En Curso -> Completada*.
*   **Validación de Identidad (KYC):** Módulo `features/verification` que exige carga de documentos (Licencia, DNI) antes de poder alquilar.
*   **Pagos Locales:** Integración nativa con métodos de pago argentinos vía MercadoPago.

---

## 4. Soluciones para Flotas y Organizaciones

*Evidencia Técnica: Directorio `apps/web/src/app/features/organizations`*

La plataforma soporta una estructura jerárquica que permite a empresas (no solo particulares) gestionar múltiples activos.

*   **Gestión Centralizada:** Capacidad para administrar múltiples vehículos bajo una misma cuenta "Organización".
*   **Métricas de Rendimiento:** Dashboard analítico (`features/dashboard`) con KPIs de ocupación, ingresos mensuales y crecimiento.
*   **Roles:** Distinción técnica entre el "Driver" (conductor final) y la "Organización" (dueña del activo).

---

## 5. Ecosistema para Aseguradoras y Legal

### ⚖️ Sistema de Disputas y Contratos
*   **Resolución de Conflictos:** Módulo `features/disputes` implementado para manejar desacuerdos sobre daños o cobros extra.
*   **Contratos Digitales:** Generación dinámica de contratos de alquiler (`features/contracts`) que incorporan los datos específicos de la reserva.

### 📸 Evidencia para Siniestros (FGO)
El sistema de "Fine-Grained Observations" es el núcleo de la cobertura de seguros.
*   **Trazabilidad:** Cada alquiler genera dos reportes inmutables (Entrega y Devolución).
*   **Contenido Probatorio:** Fotos geolocalizadas, timestamps, lecturas de instrumentos y firmas. Esto reduce el fraude y agiliza los reclamos.
*   **Seguros P2P:** Arquitectura de base de datos preparada para "Pólizas Flotantes" (`booking_insurance_coverage`), permitiendo activar seguros específicos por la duración exacta del alquiler.

---

## 6. Ficha Técnica (Tech Stack)

*   **Frontend:** Angular 18+ / Ionic (Soporte Híbrido Web/Móvil).
*   **Backend:** Supabase (PostgreSQL) con lógica de negocio en base de datos (RPCs) para máxima velocidad y seguridad.
*   **Seguridad:** Row Level Security (RLS) estricto. Ningún usuario puede leer datos que no le pertenecen, garantizado a nivel de motor de base de datos.
*   **Infraestructura:** Edge Functions para integraciones (Google, MercadoPago) y Cron Jobs para tareas automáticas (snapshots de demanda, notificaciones).

---

## 7. Conclusión del Auditor

La plataforma AutoRenta **no es un prototipo**. Es un sistema transaccional robusto con flujos financieros y legales complejos ya resueltos en código.

**Puntos Fuertes:**
1.  **Madurez Financiera:** El manejo de pagos divididos es una característica de nivel empresarial.
2.  **Prevención de Conflictos:** El énfasis en el Check-in/Check-out digital protege a ambas partes.
3.  **Escalabilidad:** La arquitectura basada en "Organizaciones" permite la entrada de flotas comerciales sin cambios estructurales.

**Áreas de Evolución (Roadmap):**
*   Refinamiento de la IA para detección automática de daños en fotos (Planificado).
*   Expansión de productos de seguros integrados (Arquitectura lista).
