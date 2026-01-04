# Analisis: categorias de reseñas por rol (Owner vs Renter)

## Estado real en el codigo
**En el repo actual las categorias SI son diferentes** segun el tipo de reseña.

### Evidencia (UI)
El formulario define dos listas distintas y selecciona una segun `reviewType`:
- `apps/web/src/app/shared/components/review-form/review-form.component.ts:38-121`
  - `renterToOwnerCategories` (limpieza, comunicación, precisión, ubicación, check-in, valor).
  - `ownerToRenterCategories` (comunicación, puntualidad, cuidado, reglas, recomendación).
  - `ratingCategories` se setea en `ngOnInit` segun `reviewType`.

### Evidencia (backend/guardado)
El servicio de reseñas calcula rating y guarda **campos diferentes** segun `review_type`:
- `apps/web/src/app/core/services/cars/reviews.service.ts:66-149`
  - `renter_to_owner`: setea 6 categorías del auto y deja null las 5 de owner→renter.
  - `owner_to_renter`: setea 5 categorías del renter y deja null las de auto.

### Evidencia (asignacion del tipo de reseña)
`reviewType` se define por rol real del usuario en la reserva:
- `apps/web/src/app/features/bookings/booking-detail/review-management.component.ts:249-300`
  - `isRenter` => `renter_to_owner`
  - `isOwner` => `owner_to_renter`

## Conclusión
En el código actual, **la UI no debería ser idéntica** para Owner→Renter y Renter→Owner.  
Si en producción ves las mismas categorías para ambos roles, el problema **no está en el formulario** sino en el valor de `reviewType` o en el build desplegado.

## Posibles causas si la UI aparece igual en la app
1) **`reviewType` siempre llega con el mismo valor**  
   - La lógica depende de `booking.renter_id` y `car.owner_id`.  
   - Si el booking no trae `renter_id` o el `car.owner_id` está mal/ausente, el rol se resuelve mal.
2) **UI vieja/desincronizada**  
   - Sólo hay un formulario de reseñas (no hay otro componente alternativo).  
   - Si la app muestra categorías iguales, puede estar ejecutando un build anterior.
3) **Datos de sesión/rol incorrectos**  
   - Si `currentUser` no coincide con `renter_id` u `owner_id`, se cae la lógica de rol.

## Verificación rápida recomendada (sin cambios)
- Loggear `reviewType`, `booking.renter_id` y `car.owner_id` al abrir el modal.  
  (Archivo: `apps/web/src/app/features/bookings/booking-detail/review-management.component.ts`)
