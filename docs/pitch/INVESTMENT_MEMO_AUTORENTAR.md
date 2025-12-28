# AutoRentar - Investment Memo

**Documento Confidencial**
**Diciembre 2025**
**Contacto:** Eduardo Marques | +54 11 6656-5599

---

## 1. Resumen Ejecutivo

**AutoRentar** es un marketplace peer-to-peer de alquiler de vehiculos para America Latina. Conecta propietarios de autos subutilizados con personas que necesitan alquilar un vehiculo, sin intermediarios tradicionales.

### Que problema resuelve

En LATAM, el 95% de los autos privados permanecen estacionados la mayor parte del tiempo. Sus duenos pagan seguro, patente, cochera y depreciacion sin retorno. Del otro lado, las agencias de alquiler tradicionales son caras, burocraticas y con poca variedad.

AutoRentar crea un sistema donde:
- El propietario monetiza su auto cuando no lo usa
- El arrendatario accede a vehiculos a menor costo
- La plataforma gestiona pagos, verificacion y riesgo

### Estado actual

- **MVP 100% funcional**: flujo completo de reservas, pagos y verificacion
- **Sin traccion publica**: el producto no ha sido lanzado al mercado
- **Infraestructura productiva**: lista para escalar

### Que busco

Una conversacion para explorar posibles sinergias: capital, flota inicial, o ambas. No es una oferta cerrada. Es una invitacion a evaluar si tiene sentido trabajar juntos.

---

## 2. Contexto y Origen del Proyecto

### Por que existe AutoRentar

Durante los ultimos 18 meses, he operado **EcuCondor**, una fintech de cambio de divisas para la comunidad latinoamericana en Argentina. En ese proceso aprendi tres cosas:

1. **Hay demanda real de servicios financieros confiables** en comunidades de inmigrantes
2. **La confianza se construye con operaciones repetidas**, no con marketing
3. **Los latinoamericanos buscan alternativas** a los canales tradicionales

AutoRentar nace de observar que muchas personas en estas comunidades necesitan vehiculos (para trabajo, mudanzas, viajes) pero no acceden a agencias tradicionales. Y que muchos propietarios tienen autos parados que podrian generar ingresos.

### Relacion con EcuCondor

EcuCondor no es parte de AutoRentar. Son negocios separados.

Pero EcuCondor demuestra:
- Que puedo operar un negocio real en LATAM
- Que puedo generar ingresos (USD 140.000 facturados en 2025)
- Que tengo acceso a comunidades activas en 5 paises
- Que entiendo los problemas de confianza y pagos en la region

---

## 3. El Problema

### 3.1 Para Propietarios

| Situacion | Impacto |
|-----------|---------|
| Auto estacionado 95% del tiempo | Depreciacion sin retorno |
| Costos fijos mensuales | Seguro, patente, cochera (~$150-300 USD/mes) |
| Sin mecanismo seguro para alquilar | Riesgo de danos, robos, impagos |
| Alquiler informal ("a un conocido") | Sin proteccion legal ni garantias |

**Ejemplo concreto:** Un propietario en Buenos Aires con un sedan compacto paga aproximadamente $180 USD/mes en costos fijos. Si el auto esta parado, son $2.160 USD/ano perdidos.

### 3.2 Para Arrendatarios

| Situacion | Impacto |
|-----------|---------|
| Agencias tradicionales caras | $40-80 USD/dia para autos basicos |
| Requisitos rigidos | Tarjeta de credito internacional, depositos altos |
| Poca variedad | Stock limitado en zonas perifericas |
| Proceso burocratico | Papeles, firmas, demoras |

**Ejemplo concreto:** Un trabajador independiente que necesita un auto por 3 dias para un proyecto paga $150-240 USD en una agencia. En AutoRentar, pagaria $75-100 USD.

---

## 4. La Solucion: AutoRentar

### Concepto central

Un marketplace donde propietarios publican sus vehiculos y arrendatarios los reservan. La plataforma se encarga de:

- **Verificacion de identidad** (biometria facial, licencia de conducir)
- **Gestion de pagos** (cobro, retencion, distribucion)
- **Documentacion legal** (contratos digitales)
- **Resolucion de disputas** (fondo de garantia)

### Flujo de una reserva

```
1. REGISTRO
   Propietario: publica su auto (fotos, precio, disponibilidad)
   Arrendatario: verifica identidad (selfie + licencia)

2. RESERVA
   Arrendatario busca vehiculos por ubicacion y fechas
   Selecciona un auto y solicita reserva
   Propietario aprueba (o tiene aprobacion automatica)

3. PAGO
   Arrendatario paga el total al momento de reservar
   El dinero queda retenido en la plataforma
   Propietario NO recibe hasta que termine el alquiler

4. ENTREGA
   Check-in digital: video del estado del auto
   Ambas partes confirman en la app
   Seguro activo durante el periodo de uso

5. DEVOLUCION
   Check-out digital: video del estado final
   Propietario confirma recepcion
   Si no hay danos: pago liberado al propietario
   Si hay danos: resolucion via plataforma

6. CIERRE
   Ambas partes dejan resenas
   Historial afecta futuras reservas (bonus/malus)
```

### Que pasa con el dinero

El dinero del arrendatario se retiene hasta que el alquiler finaliza sin incidentes. Esto protege a ambas partes:

- El propietario sabe que el pago esta asegurado
- El arrendatario sabe que puede reclamar si hay problemas
- La plataforma tiene fondos para resolver disputas

---

## 5. Modelo de Negocio

### Estructura de comisiones

| Concepto | Porcentaje |
|----------|------------|
| Propietario recibe | 85% |
| Plataforma retiene | 15% |

La comision del 15% cubre:
- Procesamiento de pagos (MercadoPago: ~3.5%)
- Aporte al Fondo de Garantia Operativa (~3%)
- Operacion de la plataforma (~8.5%)

### Ejemplo real de una reserva

**Sedan compacto alquilado por 4 dias a $25 USD/dia**

| Concepto | Monto |
|----------|-------|
| Precio bruto | $100 USD |
| Comision plataforma (15%) | -$15 USD |
| **Propietario recibe** | **$85 USD** |

### Proyeccion para un propietario activo

Si un propietario alquila su auto 8 dias al mes a $25 USD/dia:

| Concepto | Monto |
|----------|-------|
| Ingresos brutos | $200 USD/mes |
| Comision plataforma | -$30 USD/mes |
| **Ingreso neto** | **$170 USD/mes** |
| Equivalente ARS (tipo cambio blue) | ~$200.000 ARS/mes |

Este ingreso puede cubrir la totalidad de los costos fijos del vehiculo y generar ganancia adicional.

---

## 6. Gestion del Riesgo: Fondo de Garantia Operativa (FGO)

### Que es el FGO

Es un fondo interno que se alimenta de un porcentaje de cada transaccion. Su objetivo es cubrir incidentes sin depender de aseguradoras tradicionales para operaciones menores.

### Que cubre

| Tipo de incidente | Cobertura FGO |
|-------------------|---------------|
| Danos menores | Reparaciones hasta $500 USD |
| Disputas de pago | Mediacion y compensacion |
| Cancelaciones injustificadas | Penalizacion al responsable |
| Retrasos en devolucion | Cobro proporcional automatico |

### Que NO cubre

| Tipo de incidente | Tratamiento |
|-------------------|-------------|
| Perdida total del vehiculo | Seguro tradicional obligatorio |
| Accidentes con lesiones | Seguro automotor del propietario |
| Robos | Denuncia policial + seguro |
| Fraude sistematico | Exclusion de plataforma + acciones legales |

### Como se controla

- **Coverage ratio monitoreado**: relacion entre fondos disponibles y reservas activas
- **Limites por reserva**: maximo $500 USD por incidente
- **Escalamiento automatico**: si el incidente supera el limite, se deriva a seguro tradicional
- **Historial de usuarios**: bonus/malus afecta depositos requeridos

### Por que no dependemos de aseguradoras hoy

Las aseguradoras tradicionales en LATAM:
- No cubren alquiler P2P (exclusion contractual)
- Requieren volumenes minimos que un MVP no tiene
- Tienen procesos lentos incompatibles con economia colaborativa

El FGO permite operar desde el dia uno. A medida que el volumen crezca, se pueden integrar productos de seguros especificos para mobility.

---

## 7. Estado Actual del Proyecto

### Lo que esta construido

| Componente | Estado |
|------------|--------|
| App web (Angular + Ionic) | 100% funcional |
| Backend (Supabase + Edge Functions) | 100% funcional |
| Integracion de pagos (MercadoPago) | 100% funcional |
| Sistema de verificacion biometrica | 100% funcional |
| Flujo completo de reservas | 100% funcional |
| Inspeccion por video | 100% funcional |
| App Android (Capacitor) | Lista para publicar |
| App iOS | Pendiente (requiere cuenta Apple Developer) |

### Lo que NO esta

| Componente | Estado |
|------------|--------|
| Usuarios reales en produccion | 0 |
| Reservas completadas | 0 |
| Ingresos por comisiones | $0 |
| Marketing/publicidad | No iniciado |

### Interpretacion honesta

El producto esta listo tecnicamente. No hay traccion porque no se ha lanzado al mercado. El lanzamiento requiere:

1. **Oferta inicial** (autos disponibles para alquilar)
2. **Demanda inicial** (personas buscando alquilar)
3. **Capital operativo** (marketing, soporte, contingencias)

El clasico problema de "huevo y gallina" del marketplace: sin autos no hay renters, sin renters no hay incentivo para publicar autos.

---

## 8. Traccion del Equipo y del Canal

### EcuCondor: prueba de capacidad operativa

| Metrica | Valor |
|---------|-------|
| Tiempo operando | +12 meses |
| Facturacion 2025 | USD 140.000 |
| Paises con operacion | Argentina, Ecuador, Brasil |
| Transacciones procesadas | Miles |
| Incidentes graves | 0 |

### Que demuestra esto

1. **Puedo operar un negocio real**: cobrar, pagar, resolver problemas
2. **Entiendo el mercado LATAM**: regulaciones, bancos, comportamiento del usuario
3. **Tengo acceso a comunidades**: grupos de WhatsApp con 5.000-10.000 personas
4. **Puedo generar demanda**: sin publicidad, solo boca a boca

### Canal de distribucion existente

| Activo | Alcance estimado |
|--------|------------------|
| Grupos WhatsApp comunidad ecuatoriana en Argentina | 2.000-5.000 personas |
| Grupos universitarios LATAM (UNLP, UBA) | 500-1.000 personas |
| Grupos compra/venta (OLX BA, marketplaces informales) | 1.000-2.000 personas |
| Contactos directos EcuCondor | 500+ personas |

Este canal no garantiza conversion, pero si acceso inicial a un mercado que confia en mi.

---

## 9. Plan de Lanzamiento: Piloto Controlado

### El problema del cold start

Un marketplace necesita oferta y demanda simultaneamente. Sin oferta inicial, los primeros usuarios no encuentran nada y abandonan. Sin demanda, los propietarios no ven sentido en publicar.

### Solucion: flota inicial controlada

| Elemento | Propuesta |
|----------|-----------|
| Vehiculos iniciales | 10 autos de flota privada |
| Propietarios | Aliados estrategicos (no publico general) |
| Arrendatarios | Comunidades existentes (EcuCondor, universitarios) |
| Duracion del piloto | 3 meses |
| Objetivo | Validar metricas reales |

### Metricas a observar

| Metrica | Target minimo |
|---------|---------------|
| Reservas completadas | 50 en 3 meses |
| Ticket promedio | $80-120 USD |
| Tasa de incidentes | <5% |
| NPS propietarios | >7 |
| NPS arrendatarios | >7 |
| Retencion (2da reserva) | >30% |

### Riesgo acotado

- **Capital en riesgo**: limitado al costo de adquisicion de usuarios y soporte
- **Flota en riesgo**: vehiculos de aliados con cobertura de seguro tradicional
- **Reputacion**: piloto cerrado, no publicidad masiva hasta validar

---

## 10. Propuesta de Conversacion

### Que busco

No tengo una oferta cerrada. Tengo una propuesta de explorar si hay fit para trabajar juntos.

### Posibles modalidades

| Modalidad | Descripcion |
|-----------|-------------|
| **Capital** | Inversion seed para marketing, operaciones y equipo |
| **Flota** | Vehiculos para resolver cold start del piloto |
| **Ambas** | Capital + flota como partnership estrategico |
| **Advisory** | Conocimiento del mercado automotor + red de contactos |

### Que ofrezco a cambio

| Aporte | Descripcion |
|--------|-------------|
| Producto construido | MVP 100% funcional, listo para operar |
| Canal de distribucion | Acceso a comunidades LATAM |
| Experiencia operativa | 12+ meses operando fintech en Argentina |
| Ejecucion | Dedicacion full-time al proyecto |

### Por que tiene sentido para alguien con flota

Si tenes vehiculos que podrian generar ingresos adicionales:

1. **Monetizacion directa**: tus autos generan revenue desde el dia uno
2. **Control del piloto**: vos decidis que vehiculos y bajo que condiciones
3. **Skin in the game alineado**: si el negocio funciona, tu flota vale mas
4. **Riesgo acotado**: seguro tradicional cubre perdidas mayores

---

## 11. Cierre

### Por que ahora

- El producto esta listo. No es una idea, es software funcionando.
- El mercado de car-sharing en LATAM crece 15-20% anual.
- No hay jugadores dominantes en el segmento P2P en Argentina.
- Tengo el canal para generar demanda inicial.

### Por que yo

- Construi el producto completo en 18 meses, solo.
- Opere EcuCondor y genere USD 140.000 en revenue real.
- Entiendo el mercado latinoamericano por experiencia directa.
- Estoy dispuesto a dedicar los proximos 3-5 anos a este proyecto.

### Proximo paso

Una llamada de 30-45 minutos para:
1. Responder preguntas sobre el modelo
2. Mostrar el producto funcionando
3. Explorar si hay fit para colaborar

Sin compromiso. Solo una conversacion.

---

**Eduardo Marques**
+54 11 6656-5599
Diciembre 2025

---

*Este documento es confidencial y esta destinado unicamente al receptor. No debe ser distribuido sin autorizacion expresa.*
