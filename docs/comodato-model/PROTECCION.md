# Estrategia de Proteccion Real para Owners en Autorenta

## LA VERDAD INCOMODA (Sin Marketing)

**Ningun seguro cubre automaticamente "apropiacion indebida"**.
La cobertura **depende de como el hecho sea CALIFICADO JURIDICAMENTE** y de **que GATILLOS CONTRACTUALES se cumplieron**.

Los seguros funcionan por **TIPIFICACION**, no por intencion moral.

---

## COMO CLASIFICAN LOS SEGUROS EL EVENTO (CRITICO)

Cuando un auto **no es devuelto**, el siniestro puede caer en 4 categorias:

| Categoria | Entrega voluntaria | Violencia | Intencion inicial | Suele cubrir? |
|-----------|-------------------|-----------|-------------------|----------------|
| **Furto (hurto)** | NO | NO | Apropiacion directa | SI |
| **Roubo (robo)** | NO | SI | Apropiacion directa | SI |
| **Estelionato (fraude)** | SI | NO | Engano previo | A veces |
| **Apropriacao indebita** | SI | NO | Intencion surge despues | Normalmente NO |

**El problema del carsharing P2P esta SIEMPRE en la ultima fila.**

---

## COMO HACEN LOS SEGUROS ON-DEMAND REALES (Turo, Drivana, Pegcar, OlaCar)

### NO cubren "apropiacion indebita" como tal

Lo que hacen es **RECLASIFICAR EL EVENTO** mediante **condiciones operativas obligatorias**.

### Mecanismo Real:

```
Entrega valida -> Fin de reserva
        |
NO devolucion dentro de X horas
        |
Protocolo OBLIGATORIO de plataforma
        |
Conversion contractual del hecho
        |
Clasificacion ASEGURABLE ("theft after failure to return")
```

---

## CONDICIONES PARA QUE EL SEGURO SI PAGUE

En casos donde **SI hubo indemnizacion**, se cumplieron **TODAS** estas condiciones:

### A) Limite Temporal Duro (NO negociable)
- **+24h o +48h** desde el fin de la reserva
- Superado ese plazo -> el evento **deja de ser "uso autorizado"**

### B) Protocolo Inmediato y Documentado
La plataforma **DEBE ejecutar AUTOMATICAMENTE**:
1. Bloqueo del usuario
2. Notificacion formal al conductor
3. Registro de intento de contacto
4. **Denuncia policial inmediata (BO)**

> **IMPORTANTE: Si el owner "espera unos dias", el seguro RECHAZA**

### C) Clausula de "Revocacion Automatica"
Los T&C dicen algo equivalente a:
> "Una vez vencido el plazo de devolucion, el usuario **pierde toda autorizacion de posesion** del vehiculo."

Esto **ROMPE juridicamente** la figura de apropiacion indebida y permite alegar **sustraccion**.

### D) Evidencia de Engano o Intencion Fraudulenta
- Usuario desconectado
- Datos falsos
- Cambio de ubicacion
- Intento de transferencia a tercero
- GPS apagado/manipulado

---

## PROTOCOLO OPERATIVO AUTORENTA

### Timeline Obligatorio Post-Vencimiento:

| Tiempo | Accion | Sistema | Owner |
|--------|--------|---------|-------|
| **T+0** | Fin de reserva | Registro automatico | - |
| **T+2h** | Alerta amarilla | Push + email a renter | Notificado |
| **T+6h** | Alerta naranja | Llamada automatica | Contactar renter |
| **T+12h** | SUSPENSION | Usuario bloqueado | Confirmar no-devolucion |
| **T+24h** | DENUNCIA | Generar BO automatico | Firmar BO |
| **T+24h** | ASEGURADORA | Notificar siniestro | - |
| **T+48h** | LEGAL | Escalamiento abogado | Documentacion |

### Lo que el Sistema DEBE registrar automaticamente:
- Timestamp exacto de fin de reserva
- Todos los intentos de contacto (push, email, llamada)
- Respuestas del renter (o ausencia)
- Ultima ubicacion GPS conocida
- Estado del vehiculo (si GPS activo)

---

## CLAUSULA LEGAL CORRECTA (No Fantasiosa)

### MAL (No usar):
> "Si el usuario no devuelve el vehiculo, se considerara ROBO."

### BIEN (Usar):
> "Vencido el plazo de devolucion establecido en la reserva, **la autorizacion de posesion del vehiculo se revoca automaticamente**. A partir de ese momento, la permanencia del usuario con el vehiculo constituye una **posesion no autorizada** sujeta a las acciones legales correspondientes, incluyendo denuncia penal inmediata."

### Clausula adicional:
> "El usuario reconoce y acepta que:
> 1. La plataforma iniciara denuncia penal automatica a las 24 horas del vencimiento
> 2. La plataforma notificara a la aseguradora del vehiculo
> 3. Todos los costos legales y de recuperacion seran a cargo del usuario
> 4. La informacion de identificacion sera compartida con autoridades"

---

## MENSAJE ESTANDAR AL CORREDOR/ASEGURADORA

### Para NO quemar el siniestro:

```
Asunto: Siniestro - Sustraccion de vehiculo post-autorizacion vencida

Estimado [Corredor/Aseguradora],

Reportamos un siniestro ocurrido en el vehiculo [Patente/Dominio].

HECHOS:
- Vehiculo entregado a traves de plataforma de movilidad compartida
- Plazo de uso autorizado: [Fecha inicio] a [Fecha fin]
- El vehiculo NO fue devuelto al vencimiento
- A las 24 horas del vencimiento se ejecuto protocolo de no-devolucion

ACCIONES TOMADAS:
1. [T+2h] Alerta al usuario - sin respuesta
2. [T+12h] Suspension de cuenta - usuario no contactable
3. [T+24h] Denuncia policial realizada (BO adjunto)
4. [T+24h] Usuario declarado con posesion no autorizada

CLASIFICACION DEL HECHO:
- Al vencimiento del plazo, la autorizacion de posesion quedo revocada
- El usuario mantiene el vehiculo SIN autorizacion del propietario
- Configuracion: Sustraccion / Apropiacion con dolo

DOCUMENTACION ADJUNTA:
- Contrato de prestamo (comodato)
- Logs de comunicacion
- Ultima ubicacion GPS
- Boletin de denuncia policial
- Identificacion del usuario

Quedamos a disposicion para cualquier informacion adicional.

Atentamente,
Autorenta - Equipo de Siniestros
```

---

## LO QUE NO FUNCIONA (Y Por Que)

| Intento | Por que falla |
|---------|---------------|
| "Firmar contrato diciendo que es robo" | El seguro no se subordina a contratos privados |
| "Declararlo como robo sin cumplir protocolo" | Rechazo por mala calificacion |
| "Esperar buena fe del renter" | El tiempo juega EN CONTRA |
| "Negociar por WhatsApp" | Sin registro formal = rechazo |
| "El owner decide cuando denunciar" | Debe ser AUTOMATICO de la plataforma |

---

## COMO LO TRATAN LAS PLATAFORMAS EXITOSAS

### Turo (USA)
- No lo llama "apropiacion indebida"
- Lo procesa como **"theft after failure to return"**
- Si se siguen los pasos en tiempo -> **paga como robo**

### Drivana (Mexico - GNP)
- Cubre **robo total incluido "abuso de confianza"**,
  **pero solo si**:
  - Se reporta en el plazo
  - Hay BO
  - Se activo el protocolo

### OlaCar (Uruguay - BSE)
- La poliza se activa **solo durante la reserva**
- Si no se devuelve:
  - Corte temporal
  - Denuncia
  - Reclasificacion como siniestro cubierto

### Pegcar (Brasil - MAPFRE)
- MAPFRE **si pago casos** cuando:
  - El no-retorno fue inmediato
  - La plataforma ejecuto el protocolo
- Casos donde el owner "negocio por WhatsApp" -> rechazo

---

## MODELO HIBRIDO AUTORENTA

### 1. Clausula Correcta en T&C
- Revocacion automatica de posesion
- No decir "robo", decir "posesion no autorizada"

### 2. Protocolo Automatico en Sistema
- Timeline estricto (T+2h, T+12h, T+24h, T+48h)
- Acciones ejecutadas por el SISTEMA, no por el owner
- Logs inmutables de todo

### 3. Evidencia Objetiva
- GPS
- Check-in/out fotografico
- Historial de comunicacion
- Intentos de contacto

### 4. FGO (Fondo de Garantia)
- 20% de cada booking
- Cubre el GAP cuando el seguro igual rechaza
- Cubre gastos legales de recuperacion

---

## IMPLEMENTACION TECNICA

### Tablas Nuevas:
- `return_protocol_events` - Log de cada accion del protocolo
- `police_reports` - Denuncias generadas
- `insurance_notifications` - Comunicaciones con aseguradoras

### Edge Functions:
- `return-protocol-scheduler` - Ejecuta acciones en timeline
- `generate-police-report` - Genera BO para firma
- `notify-insurance` - Envia notificacion estructurada

### Frontend:
- Panel de "No-devolucion" para admin
- Vista de protocolo en tiempo real
- Generacion de documentacion

---

## RESUMEN EJECUTIVO

**No podes "convertir" apropiacion indebida en robo solo con contrato.**

**SI podes crear las condiciones para que el hecho sea ASEGURABLE:**
1. Timeline automatico y estricto
2. Protocolo ejecutado por el SISTEMA
3. Revocacion de autorizacion contractual
4. Evidencia objetiva

**El seguro paga cuando la plataforma actua rapido y sin ambiguedad.**

**El peor enemigo es la tolerancia informal.**
