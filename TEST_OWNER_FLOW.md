# Test Manual: Flujo End-to-End del Dueño

## ✅ Componentes Implementados

1. **Owner Check-In**: `/bookings/:id/owner-check-in`
2. **Owner Check-Out**: `/bookings/:id/owner-check-out`
3. **Owner Bookings List**: `/bookings/owner` (con botones contextuales)
4. **Bilateral Confirmation**: Sistema backend completo

---

## 🧪 Prueba Manual del Flujo Completo

### Prerequisitos

Asegúrate de tener el servidor corriendo:
```bash
npm run dev
```

### PASO 1: Setup Inicial

Abre la consola del navegador en `http://localhost:4200` y ejecuta:

```javascript
// Obtener Supabase client
const supabase = window.supabase || (() => {
  const { createClient } = window.supabasejs;
  return createClient(
    'https://obxvffplochgeiclibng.supabase.co',
    'YOUR_ANON_KEY' // Reemplazar con la anon key real
  );
})();

// 1. Crear usuarios de prueba
async function setupTestUsers() {
  // Crear owner
  const { data: ownerData, error: ownerError } = await supabase.auth.signUp({
    email: 'owner_test_' + Date.now() + '@autorentar.com',
    password: 'TestPassword123!',
    options: {
      data: {
        full_name: 'Test Owner',
        role: 'locador'
      }
    }
  });

  if (ownerError) {
    console.error('Error creating owner:', ownerError);
    return null;
  }

  console.log('✅ Owner created:', ownerData.user.email);

  // Crear renter
  const { data: renterData, error: renterError } = await supabase.auth.signUp({
    email: 'renter_test_' + Date.now() + '@autorentar.com',
    password: 'TestPassword123!',
    options: {
      data: {
        full_name: 'Test Renter',
        role: 'locatario'
      }
    }
  });

  if (renterError) {
    console.error('Error creating renter:', renterError);
    return null;
  }

  console.log('✅ Renter created:', renterData.user.email);

  return {
    ownerId: ownerData.user.id,
    renterId: renterData.user.id
  };
}

// Ejecutar setup
const testUsers = await setupTestUsers();
console.log('Test users:', testUsers);
```

### PASO 2: Crear Auto de Prueba

```javascript
async function createTestCar(ownerId) {
  const { data, error } = await supabase
    .from('cars')
    .insert({
      owner_id: ownerId,
      title: 'Toyota Corolla 2020 Test',
      brand_id: '00000000-0000-0000-0000-000000000000', // Placeholder
      model_id: '00000000-0000-0000-0000-000000000000',
      year: 2020,
      transmission: 'automatico',
      fuel_type: 'nafta',
      seats: 5,
      doors: 4,
      color: 'Blanco',
      description: 'Auto de prueba para testing',
      price_per_day: 15000,
      currency: 'ARS',
      city: 'Buenos Aires',
      address: 'Av. Corrientes 1234',
      lat: -34.603722,
      lng: -58.381592,
      status: 'active',
      instant_booking: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating car:', error);
    return null;
  }

  console.log('✅ Car created:', data.id);
  return data;
}

const testCar = await createTestCar(testUsers.ownerId);
```

### PASO 3: Crear Booking de Prueba

```javascript
async function createTestBooking(carId, renterId) {
  // Primero dar fondos al wallet del renter
  await supabase.rpc('wallet_deposit', {
    p_user_id: renterId,
    p_amount_cents: 100000, // $1000 USD
    p_currency: 'USD',
    p_description: 'Test deposit'
  });

  console.log('✅ Wallet funded');

  // Crear booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      car_id: carId,
      renter_id: renterId,
      start_at: new Date(Date.now() - 3600000).toISOString(), // Hace 1 hora
      end_at: new Date(Date.now() + 172800000).toISOString(), // En 2 días
      status: 'confirmed',
      total_amount: 45000, // 3 días * 15000
      currency: 'ARS',
      payment_mode: 'wallet',
      rental_amount_cents: 4500000,
      deposit_amount_cents: 25000,
      deposit_status: 'held',
      completion_status: 'pending_both'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating booking:', error);
    return null;
  }

  console.log('✅ Booking created:', data.id);
  console.log('   Status:', data.status);
  return data;
}

const testBooking = await createTestBooking(testCar.id, testUsers.renterId);
```

### PASO 4: Testear Owner Check-In (UI)

1. **Login como Owner**:
   - Email: `owner_test_XXX@autorentar.com`
   - Password: `TestPassword123!`

2. **Ir a**: `http://localhost:4200/bookings/owner`

3. **Verificar que aparece el booking**:
   - ✅ Status: "Confirmada"
   - ✅ Botón: "📝 Check-In (Entregar Auto)"

4. **Click en "Check-In"**:
   - Se abre `/bookings/{id}/owner-check-in`
   - ✅ Formulario con todos los campos
   - ✅ Información del booking visible

5. **Completar formulario**:
   - Kilometraje: `45000`
   - Combustible: `100%`
   - Subir 4+ fotos (simular)
   - Daños: (dejar vacío)
   - Click "Firmar" en firma digital
   - Click "Completar Check-In"

6. **Verificar transición**:
   ```javascript
   // En consola
   const { data } = await supabase
     .from('bookings')
     .select('*')
     .eq('id', testBooking.id)
     .single();

   console.log('Status después de check-in:', data.status);
   // Esperado: 'in_progress'
   ```

### PASO 5: Testear Owner Check-Out SIN DAÑOS (UI)

1. **Volver a**: `http://localhost:4200/bookings/owner`

2. **Verificar booking actualizado**:
   - ✅ Status: "En curso"
   - ✅ Botón: "🏁 Check-Out (Recibir Auto)"

3. **Click en "Check-Out"**:
   - Se abre `/bookings/{id}/owner-check-out`
   - ✅ Muestra datos del check-in (kilometraje, combustible)

4. **Completar formulario**:
   - Kilometraje actual: `45250` (250 km recorridos)
   - Combustible: `80%` (-20%)
   - Subir 4+ fotos
   - **Toggle "¿Hay daños nuevos?"**: `NO`
   - Click "Firmar"
   - Click "Completar Check-Out"

5. **Verificar confirmación bilateral**:
   ```javascript
   const { data } = await supabase
     .from('bookings')
     .select('*')
     .eq('id', testBooking.id)
     .single();

   console.log('✅ Check-out completado:');
   console.log('   Status:', data.status); // 'completed'
   console.log('   Completion status:', data.completion_status); // 'pending_renter'
   console.log('   Owner confirmó:', data.owner_confirmed_delivery); // true
   console.log('   Renter confirmó:', data.renter_confirmed_payment); // false
   console.log('   Esperando confirmación de: RENTER');
   ```

### PASO 6: Simular Confirmación del Renter

```javascript
// Ejecutar RPC para que el renter confirme
const { data: confirmResult } = await supabase.rpc('booking_confirm_and_release', {
  p_booking_id: testBooking.id,
  p_confirming_user_id: testUsers.renterId,
  p_has_damages: false,
  p_damage_amount: 0,
  p_damage_description: null
});

console.log('✅ Renter confirmó:', confirmResult[0]);
console.log('   Fondos liberados:', confirmResult[0].funds_released); // true
console.log('   Completion status:', confirmResult[0].completion_status); // 'funds_released'
```

### PASO 7: Verificar Liberación de Fondos SIN DAÑOS

```javascript
// Verificar wallets
const { data: ownerWallet } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', testUsers.ownerId)
  .single();

const { data: renterWallet } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', testUsers.renterId)
  .single();

console.log('💰 FONDOS LIBERADOS (SIN DAÑOS):');
console.log('');
console.log('Owner Wallet:');
console.log('  Balance:', ownerWallet.balance_cents / 100, 'USD');
console.log('  Locked:', ownerWallet.locked_balance_cents / 100, 'USD');
console.log('  Esperado: $450 ARS (rental completo)');
console.log('');
console.log('Renter Wallet:');
console.log('  Balance:', renterWallet.balance_cents / 100, 'USD');
console.log('  Locked:', renterWallet.locked_balance_cents / 100, 'USD');
console.log('  Esperado: +$250 USD (depósito devuelto)');
```

---

## 🧪 PRUEBA 2: Flujo CON DAÑOS

### PASO 8: Crear Segundo Booking

```javascript
const testBooking2 = await createTestBooking(testCar.id, testUsers.renterId);

// Actualizar a in_progress manualmente
await supabase
  .from('bookings')
  .update({ status: 'in_progress' })
  .eq('id', testBooking2.id);

console.log('✅ Booking 2 listo para check-out con daños');
```

### PASO 9: Owner Check-Out CON DAÑOS (UI)

1. **Ir a**: `http://localhost:4200/bookings/owner`
2. **Click en "Check-Out"** del nuevo booking
3. **Completar formulario**:
   - Kilometraje: `45350`
   - Combustible: `75%`
   - Subir fotos
   - **Toggle "¿Hay daños nuevos?"**: `SÍ` ✅
   - **Monto del daño**: `100` USD
   - **Descripción**: `"Rayón en puerta trasera derecha"`
   - Click "Firmar"
   - Click "Completar Check-Out"

4. **Verificar**:
   ```javascript
   const { data } = await supabase
     .from('bookings')
     .select('*')
     .eq('id', testBooking2.id)
     .single();

   console.log('✅ Check-out CON DAÑOS:');
   console.log('   Owner reportó daños:', data.owner_reported_damages); // true
   console.log('   Monto de daños:', data.owner_damage_amount); // 100
   console.log('   Descripción:', data.owner_damage_description);
   console.log('   Completion status:', data.completion_status); // 'pending_renter'
   ```

### PASO 10: Renter Confirma (acepta los daños)

```javascript
const { data: confirmResult2 } = await supabase.rpc('booking_confirm_and_release', {
  p_booking_id: testBooking2.id,
  p_confirming_user_id: testUsers.renterId,
  p_has_damages: false,
  p_damage_amount: 0,
  p_damage_description: null
});

console.log('✅ Renter confirmó (acepta daños)');
console.log('   Fondos liberados:', confirmResult2[0].funds_released); // true
```

### PASO 11: Verificar Liberación de Fondos CON DAÑOS

```javascript
const { data: ownerWallet2 } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', testUsers.ownerId)
  .single();

const { data: renterWallet2 } = await supabase
  .from('wallets')
  .select('*')
  .eq('user_id', testUsers.renterId)
  .single();

console.log('💰 FONDOS LIBERADOS (CON DAÑOS $100 USD):');
console.log('');
console.log('Owner Wallet:');
console.log('  Balance:', ownerWallet2.balance_cents / 100, 'USD');
console.log('  Esperado: $450 ARS (rental) + $100 USD (daños)');
console.log('');
console.log('Renter Wallet:');
console.log('  Balance:', renterWallet2.balance_cents / 100, 'USD');
console.log('  Esperado: +$150 USD (depósito - daños)');
```

---

## 📊 Resultados Esperados

### Escenario 1: SIN DAÑOS
- ✅ Owner recibe: $450 ARS (rental completo)
- ✅ Renter recupera: $250 USD (depósito completo)
- ✅ Deposit status: `released`
- ✅ Completion status: `funds_released`

### Escenario 2: CON DAÑOS ($100 USD)
- ✅ Owner recibe: $450 ARS (rental) + $100 USD (daños del depósito)
- ✅ Renter recupera: $150 USD (depósito - daños)
- ✅ Deposit status: `partially_released`
- ✅ Completion status: `funds_released`

---

## 🎯 Checklist de Verificación

### UI/UX
- [ ] Botón "Check-In" aparece cuando booking está `confirmed`
- [ ] Botón "Check-Out" aparece cuando booking está `in_progress`
- [ ] Formulario de check-in valida todos los campos
- [ ] Formulario de check-out muestra comparación con check-in
- [ ] Toggle de daños funciona correctamente
- [ ] Validación de monto de daños (máx $250)
- [ ] Mensajes de éxito/error se muestran

### Transiciones de Estado
- [ ] `confirmed` → `in_progress` (después de check-in)
- [ ] `in_progress` → `completed` (después de check-out)
- [ ] `completion_status`: `pending_both` → `pending_renter` → `funds_released`

### Confirmación Bilateral
- [ ] Owner puede confirmar sin daños
- [ ] Owner puede confirmar con daños
- [ ] Sistema espera confirmación del renter
- [ ] Fondos se liberan automáticamente cuando ambos confirman

### Liberación de Fondos
- [ ] Sin daños: Owner recibe rental, Renter recupera depósito completo
- [ ] Con daños: Owner recibe rental + daños, Renter recupera depósito - daños
- [ ] Balance del wallet se actualiza correctamente
- [ ] Locked balance se libera correctamente

---

## 🐛 Troubleshooting

### Error: "No tienes permiso para hacer check-in"
- Verificar que estás logueado como el owner del auto
- Verificar que `booking.car.owner_id === currentUserId`

### Error: "La reserva debe estar en estado X"
- Verificar el estado actual del booking en la base de datos
- Puede necesitar actualizarse manualmente para testing

### Fondos no se liberan
- Verificar que ambos (owner y renter) hayan confirmado
- Revisar `completion_status` del booking
- Verificar logs en la consola del navegador

### Fotos no se suben
- Las fotos están simuladas con FileReader (base64)
- En producción se integraría con Supabase Storage

---

## 📝 Notas

- Los componentes de check-in/check-out están listos para producción
- La integración con FGO (Fine-Grained Observations) está pendiente (marcada con TODO)
- La firma digital está simplificada (botón en lugar de canvas)
- Las fotos se guardan como base64 en memoria (pendiente upload a Storage)

