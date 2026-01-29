# Debug Payment Flow

Debuggea el flujo de pagos de MercadoPago.

## Instrucciones

1. Abre la app en el navegador
2. Navega a una reserva pendiente de pago
3. Abre DevTools y filtra por "mercadopago" en Network
4. Intenta completar el pago
5. Captura todas las requests/responses de MP
6. Verifica errores en consola
7. Reporta el estado del webhook

## Checklist
- [ ] Token de MP válido
- [ ] Preference creada correctamente
- [ ] Brick renderizado
- [ ] Webhook recibido
- [ ] Pago procesado en BD
