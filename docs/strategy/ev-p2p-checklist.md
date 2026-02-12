# Autorentar EV P2P Checklist (Perfecto)

## P0 - Bloqueantes (sin esto no se lanza)
- [ ] Contrato digital P2P EV con aceptacion granular (GPS, geocerca, mora, deposito, bateria)
- [ ] KYC fuerte (documento + prueba de vida + bloqueo ante mismatch)
- [ ] Tracking activo con logs inviolables (ubicacion + velocidad + timestamps)
- [ ] Protocolo de siniestro EV (paso a paso, con concesionario oficial)
- [ ] Deposito escalado por riesgo/perfil y valor del auto
- [ ] Check-in/out fotografico obligatorio (danio pre/post)

## P1 - Operativo pro (para que funcione bien)
- [x] Geocercas configurables por reserva (no solo default) ✅ `20260123100000_p1_geofences_alerts.sql`
- [x] Alertas automaticas (salida de zona, exceso de velocidad, retorno tardio) ✅ `20260123100000_p1_geofences_alerts.sql`
- [x] Plan de recuperacion con tiempos maximos (y escalamiento) ✅ `20260123100100_p1_recovery_support.sql`
- [x] Pipeline de evidencia (KYC + GPS + contrato + fotos) listo para reclamo ✅ `20260123100200_p1_evidence_pricing.sql`
- [x] Soporte 24/7 con playbooks (accidente, bateria baja, mora) ✅ `20260123100100_p1_recovery_support.sql`
- [x] Matriz de tarifas por auto/temporada/riesgo (no precio fijo) ✅ `20260123100200_p1_evidence_pricing.sql`
- [x] Politica EV clara (minimo de carga, multas por descarga profunda) ✅ `20260123100300_p1_ev_telemetry_iot.sql`

## P1 - Tecnologico EV (sin humo)
- [x] Telemetria real del auto (SOC bateria, estado de carga) no solo del telefono ✅ `20260123100300_p1_ev_telemetry_iot.sql`
- [x] Integracion con dispositivo IoT aprobado (OBD/CAN/arnes plug-and-play) ✅ `20260123100300_p1_ev_telemetry_iot.sql`
- [x] Kill switch seguro (solo inmoviliza con vehiculo detenido) ✅ `20260123100300_p1_ev_telemetry_iot.sql`
- [x] Verificacion de conexion (si el tracker cae, alerta inmediata) ✅ `20260123100300_p1_ev_telemetry_iot.sql`
- [x] Registro de trazas firmadas (defensa legal) ✅ `20260123100400_p1_signed_traces_warranty.sql`

## P1 - Garantia / Valor del activo
- [x] Reparaciones solo en red oficial (service autorizado) ✅ `20260123100400_p1_signed_traces_warranty.sql`
- [x] Certificado post-siniestro (salud de bateria / integridad) ✅ `20260123100400_p1_signed_traces_warranty.sql`
- [x] Regla de peritaje EV coordinada con service oficial ✅ `20260123100400_p1_signed_traces_warranty.sql`

## P2 - Escala y confianza (para que sea perfecto)
- [x] Score de conductor en tiempo real (riesgo dinamico) ✅ `20260123100200_p1_evidence_pricing.sql` (driver_risk_scores)
- [x] Dynamic pricing segun riesgo + demanda ✅ `20260123100200_p1_evidence_pricing.sql` (calculate_full_price)
- [ ] Historial de cumplimiento visible al dueno
- [ ] Transparencia de costos (seguro, mantenimiento, downtime)
- [ ] SLA de pagos al dueno (24-48h)
- [ ] Programa de fidelidad (renter y owner)

## Definicion de perfecto por stakeholder
**Dueno**
- [ ] Pago rapido + seguro real + valor de reventa protegido

**Renter**
- [ ] Reserva simple + reglas claras + soporte 24/7 + confianza

**Aseguradora**
- [ ] Riesgo medible + evidencia inmediata + control operativo real

**Plataforma**
- [ ] Margen positivo + recuperacion rapida + reputacion blindada

---

## Migraciones P1 Creadas

| Archivo | Contenido |
|---------|-----------|
| `20260123100000_p1_geofences_alerts.sql` | Geocercas múltiples, alertas automáticas (geofence, velocidad, retorno) |
| `20260123100100_p1_recovery_support.sql` | Plan recuperación, tickets soporte, playbooks |
| `20260123100200_p1_evidence_pricing.sql` | Pipeline evidencia, matriz tarifas, driver risk score |
| `20260123100300_p1_ev_telemetry_iot.sql` | Política EV, telemetría real, IoT, kill switch |
| `20260123100400_p1_signed_traces_warranty.sql` | Trazas firmadas, red reparaciones, certificados, peritaje EV |
