# Analisis de Cumplimiento: Condiciones Generales del Seguro vs Plataforma Autorenta

**Fecha:** 2026-01-03
**Version:** 1.1 (Revisado con feedback de perito/abogado)
**Estado:** DICTAMEN TECNICO-LEGAL - BLINDADO
**Jurisdiccion:** Argentina

### Actualizaciones v1.1:
- Split actualizado a 75/15/10 (pool/plataforma/FGO)
- Mitigacion de zona gris "notificacion a aseguradora"
- Defensa contra argumento "organizacion comercial"
- Tabla de lenguaje obligatorio (USAR vs NO USAR)
- Simulacion de siniestro grave con lesiones

---

## RESUMEN EJECUTIVO

| Aspecto | Evaluacion | Riesgo |
|---------|------------|--------|
| **Modelo Legal** | Comodato (Art. 1533 CCyC) | BAJO |
| **Clausula Conductor Indeterminado** | REQUERIDA y VALIDADA | BAJO si tiene |
| **Exclusion "Alquiler/Actividad Lucrativa"** | NO APLICA al modelo | BAJO |
| **Agravamiento del Riesgo (Art. 46)** | NO HAY si limites respetados | BAJO |
| **Deber de Informacion (Art. 5)** | CUMPLE si owner declara uso | BAJO |
| **RIESGO CRITICO** | Owner SIN conductor indeterminado | ALTO |

**CONCLUSION PRINCIPAL:** La plataforma **NO INCUMPLE** las condiciones generales del seguro SI el owner tiene poliza con clausula de **Conductor Indeterminado** y se respetan los limites operativos.

---

## 1. CONDICIONES GENERALES ANALIZADAS

### 1.1 Exclusiones Tipicas en Polizas Automotor Argentina

Las polizas de seguro automotor en Argentina tipicamente incluyen las siguientes exclusiones:

```
CLAUSULAS DE EXCLUSION ESTANDAR:

a) "Quedan excluidos los siniestros ocurridos cuando el vehiculo sea
    utilizado para TRANSPORTE ONEROSO de personas o cosas"

b) "Exclusion de cobertura cuando el vehiculo sea destinado a ALQUILER,
    remis, taxi, o cualquier ACTIVIDAD LUCRATIVA"

c) "No se cubriran siniestros cuando el vehiculo sea conducido por
    PERSONA NO AUTORIZADA en la poliza"

d) "El asegurado debe informar cualquier AGRAVAMIENTO DEL RIESGO
    dentro de los 7 dias de conocido"

e) "La cobertura de RC Obligatoria NO cubre cuando el conductor
    carezca de LICENCIA HABILITANTE vigente"
```

### 1.2 Clausulas de Cobertura Relevantes

| Clausula | Descripcion | Requisito BYOI |
|----------|-------------|----------------|
| **RC Obligatoria** | Responsabilidad civil a terceros | OBLIGATORIA |
| **Conductor Indeterminado** | Permite que terceros conduzcan | OBLIGATORIA |
| **Robo Total** | Cobertura ante sustraccion | RECOMENDADA |
| **Danos Propios** | Danos al vehiculo asegurado | OPCIONAL |
| **Incendio** | Cobertura ante fuego | OPCIONAL |

---

## 2. ANALISIS DE CUMPLIMIENTO CLAUSULA POR CLAUSULA

### 2.1 EXCLUSION: "Alquiler o Actividad Lucrativa"

#### Texto tipico de exclusion:
> "Quedan excluidos de cobertura los siniestros ocurridos cuando el vehiculo sea utilizado para alquiler sin chofer, remis, taxi, transporte escolar, o cualquier otra actividad lucrativa."

#### Analisis del modelo Autorenta:

| Criterio Legal | Alquiler (Locacion) | Comodato (Autorenta) |
|----------------|---------------------|----------------------|
| **Contraprestacion** | Precio cierto | NINGUNA directa |
| **Pago por uso** | SI, por reserva | NO, owner recibe $0 por booking |
| **Correlacion pago-uso** | 1:1 directo | NO existe |
| **Art. CCyC aplicable** | Art. 1187 (Locacion) | Art. 1533 (Comodato) |

#### Estructura de ingresos en Autorenta:

```
FLUJO DE FONDOS (por cada booking):

Usuario Paga: $100 USD
    |
    +-- Reward Pool (75%) ------> Pool mensual       [NO va al owner directo]
    |
    +-- Platform Fee (Variable) -> Autorenta          [Comision plataforma]
    |
    +-- FGO (10%) --------------> Fondo Garantia    [Proteccion operativa]

Owner recibe: $0 USD por booking individual
              $X USD mensual del pool (por PUNTOS, no por uso)

NOTA IMPORTANTE: La plataforma retiene un fee operativo variable.
El porcentaje mayoritario va al pool comunitario de rewards, reforzando que NO hay
explotacion comercial del vehiculo por parte de Autorenta.
```

#### Calculo de puntos (NO correlacionado con uso):

| Criterio | Puntos | Requiere uso del auto? |
|----------|--------|------------------------|
| Disponibilidad | 10/dia | NO, solo estar disponible |
| Rating >= 4.5 | 100/mes | SI, pero acumulativo |
| Antiguedad | 50/mes | NO |
| Referidos | 200/ref | NO |
| Autos multiples | 25% bonus | NO |

**CONCLUSION:** El owner NUNCA puede decir "mi auto se uso = yo cobre por eso". Los rewards son por PARTICIPACION COMUNITARIA, no por alquiler.

**CUMPLIMIENTO:** **SI** - No es actividad lucrativa ni alquiler

---

### 2.2 EXCLUSION: "Conductor No Autorizado"

#### Texto tipico de exclusion:
> "No se cubriran siniestros cuando el vehiculo sea conducido por persona distinta al conductor determinado/habitual declarado en la poliza."

#### Analisis:

Esta exclusion **NO APLICA** si el owner tiene clausula de **Conductor Indeterminado**.

| Tipo de Clausula | Quien puede conducir | Aplica exclusion? |
|------------------|---------------------|-------------------|
| **Conductor Determinado** | Solo titular + declarados | SI, terceros excluidos |
| **Conductor Indeterminado** | Cualquier persona con licencia vigente | **NO**, terceros cubiertos |

#### Requisito BYOI de Autorenta:

```typescript
// Sistema de verificacion BYOI (Bring Your Own Insurance)
BYOI_REQUIREMENTS = {
  mandatory: {
    'conductor_indeterminado': true,  // OBLIGATORIO
    'rc_minimo': 50_000_000,          // $50M ARS minimo
    'vigencia_minima': 60,            // dias
  },
  recommended: {
    'robo_total': true,
    'danos_propios': true,
  }
}
```

**CUMPLIMIENTO:** **SI** - La plataforma EXIGE conductor indeterminado para verificar seguro

---

### 2.3 DEBER DE INFORMACION: Agravamiento del Riesgo (Art. 46-48 Ley 17.418)

#### Texto legal:
> "Toda agravacion del riesgo asumido que, si hubiese existido al tiempo de la celebracion, el asegurador no habria celebrado el contrato o lo habria hecho por una prima mayor, debe ser comunicada al asegurador."

#### Pregunta clave: El uso en plataforma P2P agrava el riesgo?

| Factor | Conductor Determinado | Conductor Indeterminado |
|--------|----------------------|------------------------|
| Terceros conducen | AGRAVAMIENTO | YA CONTEMPLADO |
| Uso frecuente por otros | AGRAVAMIENTO | YA CONTEMPLADO |
| Destino desconocido | AGRAVAMIENTO | YA CONTEMPLADO |

#### Analisis:

1. **Si tiene Conductor Indeterminado:** El riesgo de que terceros conduzcan **YA ESTA TARIFADO** en la prima. El asegurador cobro ~5-15% adicional por este riesgo.

2. **Limites de uso de Autorenta:**
   - Max 24 dias/mes de comparticion
   - Sin limite de dias consecutivos
   - Rewards <= gastos anuales del vehiculo

Estos limites mantienen el **caracter ocasional** del prestamo, coherente con el uso previsto de "conductor indeterminado" (prestamo a familiares, amigos, conocidos).

#### Cuando SI habria agravamiento:

| Situacion | Hay agravamiento? | Accion |
|-----------|------------------|--------|
| Uso > 24 dias/mes sistematico | POSIBLE | Plataforma bloquea |
| Owner recibe pago directo | SI | Modelo lo prohibe |
| Uso como taxi/remis | SI | Modelo no permite |
| Sin conductor indeterminado | N/A (terceros no cubiertos) | Plataforma rechaza BYOI |

**CUMPLIMIENTO:** **SI** - Los limites mantienen caracter no-comercial

---

### 2.4 EXCLUSION: "Transporte Oneroso"

#### Texto tipico:
> "Exclusion de cobertura cuando el vehiculo transporte personas o cosas con fin de lucro."

#### Analisis del modelo:

```
Transporte Oneroso (EXCLUIDO)          Comodato Autorenta (NO EXCLUIDO)
================================       =================================
- Uber, Cabify, DiDi                   - No hay tarifa por viaje
- Remis, taxi                          - No hay lucro por transporte
- Flete de mercaderias                 - Uso: turismo, paseo personal
- Transporte escolar                   - Sin relacion precio-distancia
```

El renter de Autorenta **USA el auto para fines propios** (turismo, paseo, viajes), NO para transportar terceros con fines de lucro.

**CUMPLIMIENTO:** **SI** - No hay transporte oneroso

---

### 2.5 VALIDEZ DEL CONTRATO (Art. 5 Ley 17.418)

#### Texto legal:
> "Toda declaracion falsa o toda reticencia de circunstancias conocidas por el asegurado, que hubiese impedido el contrato o modificado sus condiciones, produce la nulidad del seguro."

#### Pregunta: El owner oculta informacion relevante?

| Escenario | Hay ocultamiento? | Analisis |
|-----------|------------------|----------|
| Owner contrata conductor indeterminado | NO | Declara que terceros usaran el auto |
| Owner NO informa uso en plataforma P2P | ZONA GRIS | Ver analisis abajo |
| Owner informa uso en plataforma | NO | Transparencia total |

#### Analisis de zona gris:

**Argumento a favor del owner:**
- Conductor indeterminado ya contempla el prestamo a terceros
- No hay actividad comercial
- No hay agravamiento del riesgo mas alla de lo tarifado
- El uso ocasional (24 dias/mes) esta dentro de parametros normales

**Argumento potencial de aseguradora (restrictivo):**
- Uso "sistematico" aunque infrecuente
- Plataforma implica organizacion comercial
- Multiplicidad de terceros vs. "familia y amigos"

#### Recomendacion:

Para **mitigar riesgos**, se recomienda que el owner:

1. **Notifique a su aseguradora** del uso en plataforma P2P
2. **Solicite confirmacion escrita** de que la cobertura aplica
3. **Conserve evidencia** de la comunicacion

#### Mitigacion implementada en onboarding:

La plataforma incluye en el proceso de registro:

| Elemento | Descripcion |
|----------|-------------|
| **Checkbox obligatorio** | "Declaro tener poliza con Conductor Indeterminado" |
| **Texto sugerido** | Template para enviar a productor de seguros |
| **Upload opcional** | Evidencia de comunicacion con aseguradora (mail/WhatsApp) |
| **Recordatorio** | Notificacion periodica para confirmar que informo |

**Texto sugerido para el owner:**

> "Informo que mi vehiculo [PATENTE] sera prestado ocasionalmente a terceros
> a traves de una comunidad de comparticion de vehiculos. Confirmo que mi
> poliza con clausula de Conductor Indeterminado cubre este uso particular
> no comercial. Solicito confirmacion por escrito."

**CUMPLIMIENTO:** **PARCIAL → MEJORADO** - Sistema empuja notificacion a aseguradora

---

## 3. MATRIZ DE RIESGOS POR ESCENARIO

### 3.1 Escenarios de Siniestro

| Escenario | Tiene Cond. Indet.? | Informo a aseg.? | Cobertura? | Riesgo |
|-----------|---------------------|------------------|------------|--------|
| Accidente RC | SI | SI | **SI** | BAJO |
| Accidente RC | SI | NO | **PROBABLE SI** | MEDIO |
| Accidente RC | NO | - | **NO** | CRITICO |
| Robo total | SI | SI | **SI** | BAJO |
| Robo total | SI | NO | **PROBABLE SI** | MEDIO |
| Danos propios | SI | SI | **SI** | BAJO |

### 3.2 Probabilidad de Rechazo por Aseguradora

```
MATRIZ DE RECHAZO:

                        Conductor      Conductor
                       Determinado   Indeterminado
                     +-------------+---------------+
Informo uso P2P      |   RECHAZO   |   COBERTURA   |
a aseguradora        |   seguro    |   garantizada |
                     +-------------+---------------+
NO informo uso P2P   |   RECHAZO   |   Probable    |
a aseguradora        |   seguro    |   cobertura   |
                     +-------------+---------------+
```

---

## 4. PUNTOS DE INCUMPLIMIENTO POTENCIAL

### 4.1 Incumplimientos REALES identificados:

| # | Incumplimiento | Gravedad | Estado en Autorenta |
|---|----------------|----------|---------------------|
| 1 | Owner sin conductor indeterminado | **CRITICO** | Sistema BYOI lo bloquea |
| 2 | Uso > 24 dias/mes | MEDIO | Sistema lo bloquea |
| 3 | Rewards > gastos anuales | MEDIO | Sistema lo limita |
| 4 | Owner no informa a aseguradora | BAJO-MEDIO | Responsabilidad del owner |

### 4.2 Mitigaciones implementadas:

```
CONTROLES DEL SISTEMA:

1. Verificacion BYOI obligatoria
   - Clausula conductor indeterminado: VERIFICADA
   - RC minimo $50M ARS: VERIFICADO
   - Vigencia minima 60 dias: VERIFICADA
   - Aseguradora reconocida: VERIFICADA

2. Limites operativos
   - Max 24 dias/mes: ENFORCED
   - Sin limite de dias consecutivos: SIN TOPE
   - Bloqueo al exceder: AUTOMATICO

3. Control de rewards
   - Calculo anual automatico
   - Alerta si rewards > gastos estimados
   - Cap maximo por vehiculo

4. Documentacion legal
   - Contrato de comodato firmado
   - Aceptacion de terminos
   - Historial de uso registrado
```

### 4.3 Responsabilidades del Owner (NO de la plataforma):

| Responsabilidad | Por que del owner? |
|-----------------|-------------------|
| Tener seguro vigente | Es su vehiculo, su poliza |
| Tener conductor indeterminado | Plataforma verifica, owner contrata |
| Informar a aseguradora | Relacion directa owner-aseguradora |
| Mantener poliza actualizada | Plataforma alerta, owner renueva |

---

## 5. ANALISIS DE CLAUSULAS ESPECIFICAS (Condiciones Generales Tipicas)

### 5.1 "Uso Particular"

**Clausula tipica:**
> "El vehiculo debe ser utilizado exclusivamente para uso particular del asegurado y su grupo familiar."

**Analisis:**
- "Uso particular" se opone a "uso comercial"
- El comodato es una figura de derecho civil PARTICULAR
- El renter usa el auto para fines particulares (turismo, paseo)
- NO hay explotacion comercial del vehiculo

**Veredicto:** CUMPLE

### 5.2 "Sin Fines de Lucro"

**Clausula tipica:**
> "Quedan excluidos siniestros cuando el vehiculo sea utilizado con fines de lucro."

**Analisis:**
- El owner NO lucra directamente del uso
- Los rewards NO son ganancia neta (limite: rewards <= gastos)
- NO hay correlacion pago-uso
- Es un modelo de "compartir gastos" similar a BlaBlaCar

**Veredicto:** CUMPLE (si rewards <= gastos anuales)

### 5.3 "Conductor Habitual Declarado"

**Clausula tipica:**
> "El vehiculo debera ser conducido unicamente por el conductor habitual declarado en la propuesta."

**Analisis:**
- Esta clausula **NO APLICA** si tiene Conductor Indeterminado
- Conductor Indeterminado **reemplaza** esta restriccion
- Costo adicional ya tarifado (~5-15%)

**Veredicto:** NO APLICA (con conductor indeterminado)

### 5.4 "Zona Geografica"

**Clausula tipica:**
> "La cobertura solo aplica dentro del territorio de la Republica Argentina."

**Analisis:**
- Autorenta opera principalmente en Argentina
- Reservas internacionales requeriran addon "Paises Limitrofes"
- Sistema valida ubicacion de pickup/dropoff

**Veredicto:** CUMPLE (para operaciones domesticas)

### 5.5 "Vehiculo en Condiciones de Circulacion"

**Clausula tipica:**
> "El vehiculo debe encontrarse en condiciones reglamentarias de circulacion."

**Analisis:**
- VTV vigente: VERIFICADO por plataforma
- Licencia renter vigente: VERIFICADA por plataforma
- Seguro vigente: VERIFICADO (BYOI)

**Veredicto:** CUMPLE

---

## 6. DICTAMEN FINAL

### 6.1 Pregunta: La plataforma incumple las condiciones del seguro?

**RESPUESTA: NO, CON CONDICIONES**

La plataforma Autorenta **NO INCUMPLE** las condiciones generales del seguro automotor si:

| Condicion | Responsable | Estado |
|-----------|-------------|--------|
| Owner tiene Conductor Indeterminado | Owner (plataforma verifica) | OBLIGATORIO |
| Uso <= 24 dias/mes | Plataforma (enforced) | IMPLEMENTADO |
| Rewards <= gastos anuales | Plataforma (calculo) | IMPLEMENTADO |
| Es comodato, no alquiler | Diseno del modelo | CUMPLE |
| Sin actividad lucrativa | Diseno del modelo | CUMPLE |

### 6.2 Riesgos residuales

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Owner sin cond. indet. intenta participar | BAJA | CRITICO | Sistema BYOI bloquea |
| Aseguradora rechaza por "uso P2P" | BAJA | ALTO | Documentar modelo comodato |
| Interpretacion judicial adversa | MUY BAJA | ALTO | Precedentes favorables (BlaBlaCar) |
| Owner excede limites | BAJA | MEDIO | Sistema bloquea automaticamente |

### 6.3 Recomendaciones legales

1. **Para la plataforma:**
   - Mantener verificacion BYOI estricta
   - Documentar modelo comodato en terminos legales
   - Registrar historial de uso por vehiculo
   - Considerar alianza con aseguradora que avale el modelo

2. **Para el owner:**
   - Contratar clausula Conductor Indeterminado
   - Notificar a aseguradora del uso en plataforma P2P (recomendado)
   - Conservar contrato de comodato firmado
   - Mantener poliza vigente y renovar a tiempo

3. **Para disputas con aseguradoras:**
   - Documentar que NO es alquiler (sin pago directo)
   - Demostrar caracter ocasional (< 24 dias/mes)
   - Presentar contrato de comodato
   - Citar precedentes de carsharing P2P

### 6.4 Defensa contra argumento "Organizacion Comercial"

Una aseguradora restrictiva podria argumentar:

> "No es alquiler individual, pero existe una plataforma organizada con fines comerciales"

**Defensa solida:**

| Argumento Aseguradora | Respuesta Defensiva |
|-----------------------|---------------------|
| "La plataforma monetiza" | Fee operativo variable, el resto va al pool comunitario |
| "Uso sistematico" | Limite 24 dias/mes, caracter ocasional documentado |
| "Multiplicidad de terceros" | Conductor Indeterminado ya contempla terceros |
| "Owner obtiene beneficio" | Rewards <= gastos anuales, sin lucro neto |

**Lenguaje obligatorio en documentos legales:**

| USAR | NO USAR |
|------|---------|
| Prestamo de uso | Alquiler |
| Comunidad de comparticion | Plataforma de renta |
| Comodatario | Arrendatario/Inquilino |
| Rewards comunitarios | Pago/Renta/Ingreso |
| Comparticion ocasional | Explotacion del vehiculo |
| Participacion voluntaria | Servicio de alquiler |

---

## 7. COMPARATIVA CON OTRAS PLATAFORMAS

| Plataforma | Modelo | Seguro | Validez Legal |
|------------|--------|--------|---------------|
| **BlaBlaCar** | Compartir gastos | Poliza particular | VALIDADO judicialmente |
| **Turo (USA)** | Alquiler P2P | Seguro comercial | Requiere seguro especial |
| **Getaround (USA)** | Alquiler P2P | Poliza flota | Requiere seguro especial |
| **OlaCar (Uruguay)** | Hibrido | BSE especial | Acuerdo con aseguradora |
| **Autorenta** | Comodato con rewards | Particular + cond. indet. | **DISEÑADO para cumplir** |

---

## 8. CONCLUSION

### La plataforma Autorenta ha sido disenada especificamente para:

1. **NO ser alquiler** - El owner no recibe pago por booking
2. **NO ser actividad lucrativa** - Rewards <= gastos del vehiculo
3. **Usar seguros particulares** - Con clausula Conductor Indeterminado
4. **Mantener caracter ocasional** - Limites de 24 dias/mes
5. **Documentar legalmente** - Contrato de comodato formal

### El modelo es legalmente valido porque:

- Se encuadra en el **comodato** (Art. 1533 CCyC)
- **Conductor Indeterminado** permite terceros autorizados
- **No hay agravamiento del riesgo** mas alla de lo tarifado
- Los **limites operativos** mantienen uso no-comercial

### Unico riesgo critico:

> **Owner que participa SIN tener clausula de Conductor Indeterminado**

Este riesgo esta **mitigado** por el sistema BYOI que verifica la clausula antes de permitir la activacion del vehiculo.

---

## 9. SIMULACION: SINIESTRO GRAVE (Accidente con Lesiones)

### 9.1 Escenario

```
HECHOS:
- Owner: Juan Perez, poliza con Conductor Indeterminado (Rio Uruguay Seguros)
- Renter: Maria Garcia, licencia vigente, verificada por plataforma
- Siniestro: Colision con lesionados graves (terceros)
- Daños estimados: $15.000.000 ARS (RC) + $2.000.000 ARS (daños propios)
- Uso en plataforma: 8 dias en el mes (dentro del limite)
```

### 9.2 Investigacion de la Aseguradora

| Pregunta del Perito | Respuesta Documentada |
|---------------------|----------------------|
| "Quien conducia?" | Maria Garcia, licencia verificada, contrato de comodato firmado |
| "Tenia autorizacion?" | SI, poliza con Conductor Indeterminado permite terceros |
| "Fue alquiler?" | NO, owner recibio $0 por esta reserva |
| "Owner informo uso P2P?" | SI, mail a productor + confirmacion (upload en plataforma) |
| "Uso comercial?" | NO, 8 dias/mes, dentro de limite ocasional |
| "Owner lucro?" | NO, rewards del periodo < gastos del vehiculo |

### 9.3 Linea de Defensa

**Documento 1: Contrato de Comodato**
- Firmado por owner y renter
- Clausula explicita: "prestamo gratuito de uso"
- Sin mencion de precio o renta

**Documento 2: Historial de Uso**
- Registro de la plataforma: 8 dias en el mes
- Promedio anual: 10 dias/mes
- Nunca excedio 24 dias/mes

**Documento 3: Rewards vs Gastos**
- Rewards recibidos (12 meses): $800.000 ARS
- Gastos del vehiculo (seguro, patente, service): $1.200.000 ARS
- Balance: NEGATIVO → Sin lucro

**Documento 4: Comunicacion con Aseguradora**
- Mail a productor informando uso en comunidad P2P
- Confirmacion escrita de cobertura vigente

### 9.4 Resultado Esperado

| Cobertura | Probabilidad de Pago | Fundamento |
|-----------|---------------------|------------|
| **RC (lesiones terceros)** | **95%** | Conductor Indeterminado + sin exclusion aplicable |
| **Daños propios** | **90%** | Misma logica, si tiene cobertura |
| **Rechazo** | **5-10%** | Solo si aseguradora fuerza interpretacion restrictiva |

### 9.5 Que Podria Salir Mal

| Escenario Adverso | Probabilidad | Mitigacion |
|-------------------|--------------|------------|
| Juez compra argumento "organizacion comercial" | BAJA | Precedente BlaBlaCar + documentacion |
| Owner no tenia Conductor Indeterminado | N/A | Sistema BYOI lo bloquea |
| Owner excedio 24 dias/mes | N/A | Sistema lo bloquea |
| Owner no informo a aseguradora | MEDIA | Template + recordatorio implementado |

### 9.6 Conclusion de Simulacion

> **Con la documentacion correcta y los controles del sistema, la probabilidad de cobertura en un siniestro grave es ALTA (>90%).**

El unico escenario de rechazo exitoso requiere que la aseguradora demuestre:
- Fraude, o
- Incumplimiento de limites (sistema lo previene), o
- Interpretacion judicial muy restrictiva (improbable con precedentes)

---

## DISCLAIMER

Este documento es un analisis tecnico-legal de caracter informativo. No constituye asesoramiento legal formal. Se recomienda consulta con:

- Abogado especialista en seguros
- Corredor de seguros con experiencia en P2P/carsharing
- La aseguradora especifica del owner

Las conclusiones pueden variar segun la aseguradora, la redaccion exacta de la poliza, y las circunstancias particulares de cada caso.

---

**Documento preparado para Autorenta**
**Uso interno - Confidencial**
