import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '../../.env.test' });

// Estilos INTERIOR LATAM - foto desde asiento trasero, volante a la izquierda
// IMPORTANTE: Auto ESTACIONADO, motor apagado, sin movimiento
const INTERIOR_STYLES_LATAM = [
  // ESTACIONADO en calle residencial
  'interior photo of PARKED CAR from backseat, LEFT HAND DRIVE, ENGINE OFF, dashboard and steering wheel on left, water bottle in cupholder, PARKED on quiet residential street, houses visible, no traffic',
  'amateur interior of STATIONARY CAR from rear seat, LEFT HAND DRIVE, earbuds on passenger seat, PARKED by the curb, latin american neighborhood, empty street outside',

  // ESTACIONADO en estacionamiento
  'interior shot of PARKED VEHICLE from behind driver seat, LEFT HAND DRIVE, phone charging cable visible, CAR PARKED IN PARKING LOT, other parked cars visible outside',
  'backseat view of STATIONARY CAR, STEERING WHEEL ON LEFT, facemask on mirror, hand sanitizer in door, PARKED in shopping center lot, stores visible',

  // ESTACIONADO en entrada de casa
  'phone photo of PARKED car interior from backseat, LEFT SIDE STEERING WHEEL, sunglasses on dashboard, coffee cup in holder, CAR PARKED in front of house, driveway visible',
  'interior from rear seat of PARKED CAR, LEFT HAND DRIVE, snack wrapper on floor, STATIONARY in residential driveway, afternoon light',

  // ESTACIONADO en gasolinera
  'amateur photo of PARKED car interior from rear, LEFT HAND DRIVE, energy drink in cupholder, CAR PARKED AT GAS STATION, pumps visible through windshield, engine off',
  'interior of STATIONARY CAR at gas station, LEFT SIDE STEERING, dashboard view, PARKED next to fuel pump, convenience store visible',

  // ESTACIONADO en playa/campo
  'interior photo of CAR PARKED at beach, from backseat, LEFT HAND DRIVE, golden sunset light, steering wheel on left, STATIONARY in beach parking lot, sand visible',
  'backseat interior of PARKED CAR in countryside, LEFT HAND DRIVE, rural fence visible outside, CAR STATIONARY on gravel, afternoon light',

  // ESTACIONADO - diferentes condiciones
  'rainy day interior of PARKED CAR from backseat, LEFT HAND DRIVE, water droplets on windows, ENGINE OFF, parked on residential street',
  'night interior of STATIONARY CAR from rear seat, LEFT SIDE STEERING WHEEL, dashboard lights dim, PARKED on quiet street, street lamps visible, engine off',
];

async function main() {
  const randomStyle = INTERIOR_STYLES_LATAM[Math.floor(Math.random() * INTERIOR_STYLES_LATAM.length)];

  console.log('🎨 Generando foto INTERIOR LATAM de Toyota Corolla Hybrid...');
  console.log('   Estilo:', randomStyle);

  const response = await fetch('https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brand: 'Toyota',
      model: 'Corolla Hybrid',
      year: 2024,
      color: 'silver',
      angle: 'interior',
      style: randomStyle,
      num_steps: 4
    })
  });

  const data = await response.json();

  if (data.success && data.image) {
    const fs = await import('fs');
    const buffer = Buffer.from(data.image, 'base64');
    fs.writeFileSync('/tmp/test-interior-latam.png', buffer);
    console.log('✅ Imagen generada y guardada en: /tmp/test-interior-latam.png');
    console.log('📊 Tamaño:', buffer.length, 'bytes');
  } else {
    console.error('❌ Error:', data.error);
  }
}

main();
