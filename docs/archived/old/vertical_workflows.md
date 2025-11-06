
# Workflows Verticales de la Plataforma AutorentA

Este documento describe los principales "workflows verticales" de la plataforma AutorentA. Un workflow vertical representa un flujo completo de principio a fin que un usuario sigue para completar una tarea de alto nivel. Comprender estos flujos es fundamental para realizar optimizaciones, depurar problemas y desarrollar nuevas funcionalidades.

---

## 1. Onboarding y Registro de Nuevo Usuario

Este workflow cubre la primera interacción de un usuario con la plataforma, desde que llega al sitio hasta que se convierte en un miembro registrado.

*   **Rol Principal:** Usuario Visitante (no autenticado).
*   **Objetivo Final:** Convertir un visitante en un usuario registrado y activo.

### Pasos del Flujo:

1.  **Llegada al Sitio:** El usuario aterriza en la página de inicio.
2.  **Tour de Bienvenida:** Se inicia el `TourService` (`startWelcomeTour`) para presentar la propuesta de valor y las acciones principales (alquilar/publicar).
3.  **Exploración Inicial:** El usuario puede explorar la lista de autos disponibles sin necesidad de registrarse.
4.  **Inicio de Acción Restringida:** El usuario intenta realizar una acción que requiere autenticación (e.g., hacer clic en "Solicitar Reserva" o "Publicar tu auto").
5.  **Redirección a Login/Registro:** El `AuthGuard` intercepta la acción y redirige al usuario a la página de autenticación.
6.  **Creación de Cuenta:** El usuario completa el formulario de registro.
7.  **Confirmación de Email:** (Supuesto) El usuario recibe un correo de Supabase Auth para confirmar su cuenta.
8.  **Primer Inicio de Sesión:** El usuario inicia sesión por primera vez.
9.  **Redirección a la Acción Original:** El sistema redirige al usuario a la acción que intentó realizar originalmente (e.g., la página de publicación de auto).

---

## 2. Alquiler de Vehículo (Flujo del Arrendatario)

Este es el workflow central para los usuarios que desean alquilar un auto. Está detalladamente cubierto por el `startGuidedBookingTour`.

*   **Rol Principal:** Arrendatario (`locatario`).
*   **Objetivo Final:** Completar una reserva de un vehículo de forma exitosa.

### Pasos del Flujo:

1.  **Búsqueda y Descubrimiento:**
    *   El usuario utiliza la barra de búsqueda y los filtros para encontrar vehículos.
    *   Interactúa con el mapa y la lista de resultados.
2.  **Selección de Vehículo:** El usuario hace clic en un auto para ver su perfil detallado.
3.  **Análisis del Vehículo:**
    *   Revisa la galería de fotos, descripción, características y reseñas de otros usuarios.
    *   Selecciona las fechas y horas deseadas en el calendario de disponibilidad.
4.  **Solicitud de Reserva:**
    *   El usuario hace clic en "Solicitar Reserva".
    *   El sistema crea una nueva entrada en la tabla `bookings` con estado "pendiente".
5.  **Aprobación del Propietario:** El propietario recibe una notificación y debe aprobar la solicitud.
6.  **Proceso de Pago:**
    *   Una vez aprobada, el arrendatario es notificado para proceder con el pago.
    *   Se utiliza la integración con MercadoPago (o el mock actual) para procesar el pago de forma segura.
    *   El `payments_webhook` confirma la transacción y actualiza el estado de la reserva a "confirmada".
7.  **Comunicación:** El arrendatario y el propietario coordinan la entrega a través del chat integrado en la página de la reserva.
8.  **Entrega y Finalización:**
    *   Se realiza la entrega del vehículo.
    *   Tras la finalización del período de alquiler, ambas partes pueden dejar una reseña.

---

## 3. Publicación de Vehículo (Flujo del Propietario)

Este workflow describe el proceso que sigue un propietario para listar su vehículo en la plataforma.

*   **Rol Principal:** Propietario (`locador`).
*   **Objetivo Final:** Publicar un nuevo anuncio de vehículo que sea visible para los arrendatarios.

### Pasos del Flujo:

1.  **Inicio de Publicación:** El usuario hace clic en "Publicar tu auto".
2.  **Formulario de Datos del Vehículo:** El usuario completa la información básica: marca, modelo, año, tipo, transmisión, etc.
3.  **Carga de Fotografías:** El usuario sube las imágenes del vehículo, que se almacenan en Supabase Storage en el bucket `car-images`.
4.  **Configuración de Precios:** El usuario define el precio por día/hora. Puede recibir sugerencias del sistema de "precio inteligente".
5.  **Calendario de Disponibilidad:** El propietario bloquea las fechas en las que el vehículo no estará disponible.
6.  **Selección de Seguro:** El usuario elige el plan de seguro que se aplicará a los alquileres.
7.  **Revisión y Publicación:** El usuario revisa toda la información y envía el anuncio para su aprobación.
8.  **Proceso de Verificación (Admin):** (Supuesto) Un administrador revisa el nuevo anuncio para asegurar que cumple con los estándares de calidad y seguridad de la plataforma.
9.  **Anuncio Activo:** Una vez aprobado, el estado del auto cambia a "activo" y se vuelve visible en los resultados de búsqueda.

---

## 4. Gestión de Reservas (Flujo Post-Solicitud)

Este workflow se activa después de que un arrendatario solicita una reserva y abarca las interacciones entre ambas partes y el sistema.

*   **Roles Involucrados:** Arrendatario, Propietario.
*   **Objetivo Final:** Gestionar el ciclo de vida de una reserva desde la solicitud hasta la finalización.

### Pasos del Flujo:

1.  **Notificación al Propietario:** El propietario es notificado (vía email, push, o en su panel) de una nueva solicitud de reserva.
2.  **Revisión de la Solicitud:** El propietario revisa el perfil del arrendatario y las fechas solicitadas.
3.  **Decisión del Propietario:**
    *   **Aceptar:** El estado de la reserva cambia a "aprobada, pendiente de pago".
    *   **Rechazar:** El estado cambia a "rechazada". El arrendatario es notificado.
4.  **Notificación al Arrendatario:** El arrendatario recibe la actualización del estado.
5.  **Pago (si fue aprobada):** El arrendatario realiza el pago.
6.  **Confirmación Final:** Una vez el pago es confirmado por el webhook, el estado cambia a "confirmada". Ambas partes reciben la confirmación final.
7.  **Coordinación de Entrega:** Ambas partes utilizan el chat para acordar los detalles de la entrega.
8.  **Proceso de Devolución:** Se gestiona la devolución del vehículo.
9.  **Cierre y Calificación:** La reserva se marca como "completada" y se habilita el sistema de reseñas para ambas partes.

---

## 5. Gestión de Billetera y Pagos (Flujo del Propietario)

Este workflow detalla cómo los propietarios gestionan las ganancias generadas por sus alquileres.

*   **Rol Principal:** Propietario.
*   **Objetivo Final:** Retirar las ganancias de la plataforma a una cuenta externa.

### Pasos del Flujo:

1.  **Acreditación de Fondos:** Después de una reserva completada exitosamente, los fondos correspondientes se acreditan en la `user_wallets` del propietario.
2.  **Consulta de Saldo:** El propietario puede ver su saldo disponible y el historial de transacciones en su panel de billetera.
3.  **Solicitud de Retiro:** El propietario inicia una solicitud de retiro, especificando el monto.
4.  **Verificación de Datos Bancarios:** (Supuesto) El sistema valida que el propietario haya configurado y verificado una cuenta bancaria para recibir los fondos.
5.  **Procesamiento del Retiro:**
    *   Se crea una transacción en `wallet_transactions` con estado "pendiente".
    *   Un proceso (manual de admin o automático) ejecuta el pago a través de un proveedor externo (e.g., MercadoPago Payouts).
6.  **Confirmación de Retiro:** Una vez que el proveedor confirma la transferencia, el estado de la transacción se actualiza a "completado" y el saldo de la billetera del usuario se descuenta.

---

## 6. Administración de la Plataforma (Flujo del Administrador)

Este workflow cubre las tareas de supervisión y gestión realizadas por los administradores de AutorentA.

*   **Rol Principal:** Administrador (`is_admin = true`).
*   **Objetivo Final:** Mantener la calidad, seguridad e integridad de la plataforma.

### Pasos del Flujo:

1.  **Acceso al Panel de Admin:** El administrador inicia sesión y accede a la ruta protegida `/admin`.
2.  **Dashboard de Supervisión:** El admin visualiza métricas clave: nuevos usuarios, reservas pendientes, anuncios por verificar, etc.
3.  **Gestión de Usuarios:**
    *   Buscar, ver, suspender o eliminar usuarios.
    *   Verificar perfiles de forma manual si es necesario.
4.  **Gestión de Vehículos:**
    *   Revisar y aprobar nuevos anuncios de vehículos.
    *   Suspender o eliminar anuncios que no cumplan las normas.
5.  **Gestión de Reservas:**
    *   Mediar en disputas entre propietarios y arrendatarios.
    *   Forzar la cancelación o el reembolso de una reserva si es necesario.
6.  **Gestión de Pagos:**
    *   Monitorear transacciones y retiros.
    *   Procesar retiros manuales si el sistema automático falla.

