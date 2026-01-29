/**
 * Script para generar fotos con IA para todos los autos sin fotos
 * 
 * Uso:
 *   npx tsx scripts/generate-photos-bulk.ts [--method stock-photos|cloudflare-ai] [--limit N]
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });
config({ path: '../../.env.test' }); // Para SERVICE_ROLE_KEY

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL!;
// Usar service role key si está disponible, sino anon key (requiere políticas de storage adecuadas)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NG_APP_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Estilos EXTERIOR - auto ESTACIONADO (no en medio de la calle)
// IMPORTANTE: Siempre "PARKED ON THE SIDE" o en estacionamiento/entrada
const EXTERIOR_STYLES_LATAM = [
  // Estacionado en vereda/cordón
  'phone photo, car PARKED ON THE SIDE of residential street, by the curb, latin american neighborhood, afternoon light, houses in background',
  'amateur iphone photo, car PARKED AGAINST THE CURB on quiet street, Uruguay/Argentina border town vibe, overcast sky, slightly dusty',
  'samsung photo, car PARKED BY THE SIDEWALK, small shops in background, latin american town, golden hour light',
  // En entrada de casa / driveway
  'phone camera photo, car PARKED IN DRIVEWAY of modest latin american house, concrete floor, afternoon shade',
  'amateur photo, car PARKED IN FRONT OF HOUSE, residential neighborhood, latin america, cloudy day, some dust on car',
  // En estacionamiento
  'phone photo, car PARKED IN PARKING LOT, shopping area visible, latin american city, daytime',
  'iphone photo, car PARKED IN GAS STATION, pumps visible in background, latin america, afternoon',
  // Rural pero ESTACIONADO al costado
  'phone photo, car PARKED ON SHOULDER of rural road, safely off the road, countryside of Uruguay/Argentina, golden hour',
  'amateur photo, car PARKED ON GRAVEL PULLOUT next to country road, fence and fields in background, soft afternoon light',
];

// Estilos INTERIOR - foto desde asiento trasero mostrando tablero
// IMPORTANTE: Auto ESTACIONADO, volante a la IZQUIERDA (LATAM), motor apagado
const INTERIOR_STYLES_LATAM = [
  // ESTACIONADO en calle residencial
  'interior photo of PARKED CAR taken from backseat, LEFT HAND DRIVE, ENGINE OFF, showing dashboard and steering wheel on left side, phone camera quality, water bottle in cupholder, PARKED on quiet residential street, houses visible outside, no traffic',
  'amateur interior photo from rear seat of STATIONARY CAR, LEFT HAND DRIVE, dashboard view with steering wheel on left, earbuds on passenger seat, PARKED by the curb, empty street outside',
  'phone photo of PARKED car interior from backseat, LEFT SIDE STEERING WHEEL, sunglasses on dashboard, coffee cup in holder, CAR PARKED in front of house, driveway visible',
  // ESTACIONADO en estacionamiento
  'interior shot of PARKED VEHICLE from behind driver seat, LEFT HAND DRIVE, showing full dashboard, phone charging cable visible, CAR PARKED IN PARKING LOT, other parked cars visible outside',
  'backseat perspective of STATIONARY CAR interior, STEERING WHEEL ON LEFT, facemask hanging from mirror, hand sanitizer in door pocket, PARKED in shopping center lot, stores visible',
  'amateur photo of PARKED car interior from rear, LEFT HAND DRIVE, energy drink in cupholder, CAR PARKED AT GAS STATION, pumps visible through windshield, engine off',
  // ESTACIONADO - limpio
  'interior photo from backseat of PARKED CAR, LEFT HAND DRIVE, steering wheel on left side, clean interior, afternoon light, CAR STATIONARY on suburban street, no movement',
  'phone camera interior shot of STATIONARY vehicle from rear seat, LEFT SIDE STEERING, dusty air vents, sun visor down, PARKED on empty street, calm scene outside',
  // ESTACIONADO - diferentes ubicaciones
  'interior photo of CAR PARKED at beach, taken from backseat, LEFT HAND DRIVE, golden sunset light on dashboard, steering wheel on left, STATIONARY in beach parking lot',
  'rainy day interior of PARKED CAR from backseat, LEFT HAND DRIVE, water droplets on windows, ENGINE OFF, parked on residential street, quiet rainy scene',
  'night time interior of STATIONARY CAR from rear seat, LEFT SIDE STEERING WHEEL, dashboard lights off, PARKED on quiet street, street lamps visible, engine off',
];

// Autos populares en LATAM para usar cuando no hay nombre
const RANDOM_CARS_LATAM = [
  { brand: 'Toyota', model: 'Corolla', color: 'silver' },
  { brand: 'Toyota', model: 'Hilux', color: 'white' },
  { brand: 'Toyota', model: 'Etios', color: 'gray' },
  { brand: 'Volkswagen', model: 'Gol', color: 'red' },
  { brand: 'Volkswagen', model: 'Polo', color: 'white' },
  { brand: 'Volkswagen', model: 'Virtus', color: 'silver' },
  { brand: 'Chevrolet', model: 'Onix', color: 'black' },
  { brand: 'Chevrolet', model: 'Cruze', color: 'gray' },
  { brand: 'Chevrolet', model: 'S10', color: 'white' },
  { brand: 'Ford', model: 'Ka', color: 'red' },
  { brand: 'Ford', model: 'Ranger', color: 'black' },
  { brand: 'Ford', model: 'EcoSport', color: 'silver' },
  { brand: 'Fiat', model: 'Cronos', color: 'white' },
  { brand: 'Fiat', model: 'Argo', color: 'red' },
  { brand: 'Fiat', model: 'Strada', color: 'white' },
  { brand: 'Renault', model: 'Sandero', color: 'silver' },
  { brand: 'Renault', model: 'Logan', color: 'gray' },
  { brand: 'Renault', model: 'Duster', color: 'black' },
  { brand: 'Honda', model: 'Civic', color: 'silver' },
  { brand: 'Honda', model: 'HR-V', color: 'white' },
  { brand: 'Hyundai', model: 'HB20', color: 'red' },
  { brand: 'Hyundai', model: 'Creta', color: 'gray' },
  { brand: 'Nissan', model: 'Versa', color: 'silver' },
  { brand: 'Nissan', model: 'Kicks', color: 'black' },
  { brand: 'Peugeot', model: '208', color: 'white' },
  { brand: 'Peugeot', model: '2008', color: 'gray' },
  { brand: 'Citroën', model: 'C3', color: 'red' },
  { brand: 'Jeep', model: 'Renegade', color: 'black' },
  { brand: 'Jeep', model: 'Compass', color: 'white' },
];

// Configuración desde argumentos
const args = process.argv.slice(2);
const method = args.includes('--method')
  ? args[args.indexOf('--method') + 1] as 'stock-photos' | 'cloudflare-ai'
  : 'stock-photos';
const limit = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1])
  : 10; // Por defecto procesar 10 autos

interface Car {
  id: string;
  brand: string;
  model: string;
  brand_text_backup: string | null;
  model_text_backup: string | null;
  year: number;
  color: string | null;
  transmission: string;
  fuel: string;
}

interface CarPhoto {
  id: string;
  car_id: string;
  photo_url: string;
}

/**
 * Obtiene todos los autos que NO tienen fotos
 */
async function getCarsWithoutPhotos(limitCount: number): Promise<Car[]> {
  console.log(`\n🔍 Buscando autos sin fotos (límite: ${limitCount})...`);

  // Obtener todos los IDs de autos que tienen fotos
  const { data: carsWithPhotos, error: photosError } = await supabase
    .from('car_photos')
    .select('car_id');

  if (photosError) {
    throw new Error(`Error obteniendo car_photos: ${photosError.message}`);
  }

  const carIdsWithPhotos = new Set(carsWithPhotos?.map(p => p.car_id) || []);

  // Obtener todos los autos
  const { data: allCars, error: carsError } = await supabase
    .from('cars')
    .select('id, brand, model, brand_text_backup, model_text_backup, year, color, transmission, fuel')
    .eq('status', 'active');

  if (carsError) {
    throw new Error(`Error obteniendo cars: ${carsError.message}`);
  }

  // Filtrar autos sin fotos
  const carsWithoutPhotos = (allCars || []).filter(
    car => !carIdsWithPhotos.has(car.id)
  ).slice(0, limitCount);

  console.log(`✅ Encontrados ${carsWithoutPhotos.length} autos sin fotos`);
  return carsWithoutPhotos;
}

/**
 * Descarga una imagen desde URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error downloading image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Busca fotos de stock de Unsplash
 */
async function searchStockPhotosWithParams(brand: string, model: string, year: number, count: number = 3): Promise<string[]> {
  const query = `${brand} ${model} ${year} car`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

  // Unsplash requiere API key - usar acceso público limitado
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Client-ID YOUR_UNSPLASH_ACCESS_KEY' // Necesitarás configurar esto
    }
  });

  if (!response.ok) {
    console.warn(`⚠️  No se pudieron buscar fotos de stock para ${brand} ${model}`);
    return [];
  }

  const data = await response.json();
  return data.results.map((photo: any) => photo.urls.regular);
}

/**
 * Genera fotos para un auto usando el método especificado
 */
async function generatePhotosForCar(car: Car, method: 'stock-photos' | 'cloudflare-ai'): Promise<void> {
  // Verificar si el auto tiene nombre válido
  const hasBrand = car.brand_text_backup || car.brand;
  const hasModel = car.model_text_backup || car.model;

  let brand: string;
  let model: string;
  let color: string;

  if (!hasBrand || !hasModel) {
    // Usar modelo aleatorio de LATAM cuando no hay nombre
    const randomCar = RANDOM_CARS_LATAM[Math.floor(Math.random() * RANDOM_CARS_LATAM.length)];
    brand = randomCar.brand;
    model = randomCar.model;
    color = car.color || randomCar.color;
    console.log(`   ⚡ Auto sin nombre, usando modelo aleatorio: ${brand} ${model}`);
  } else {
    brand = car.brand_text_backup || car.brand;
    model = car.model_text_backup || car.model;
    color = car.color || 'silver';
  }

  // Seleccionar estilos aleatorios para este auto
  // Un estilo exterior (mismo para 3/4-front y side para coherencia de ubicación)
  // Un estilo interior separado
  const exteriorStyle = EXTERIOR_STYLES_LATAM[Math.floor(Math.random() * EXTERIOR_STYLES_LATAM.length)];
  const interiorStyle = INTERIOR_STYLES_LATAM[Math.floor(Math.random() * INTERIOR_STYLES_LATAM.length)];

  console.log(`\n📸 Generando fotos para: ${brand} ${model} ${car.year}`);
  console.log(`   Método: ${method}`);
  console.log(`   Exterior: ${exteriorStyle.substring(0, 60)}...`);
  console.log(`   Interior: ${interiorStyle.substring(0, 60)}...`);

  try {
    const photoUrls: Array<{ url: string; stored_path: string }> = [];

    // Método principal: Generar con Cloudflare AI (Gemini)
    if (method === 'cloudflare-ai') {
      // Ángulos: 3/4-front, side (exteriores) + interior (desde asiento trasero)
      const angles = ['3/4-front', 'side', 'interior'] as const;

      for (const angle of angles) {
        console.log(`   🎨 Generando vista ${angle}...`);

        // Construir payload según el ángulo
        const payload: Record<string, unknown> = {
          brand: brand,
          model: model,
          year: car.year,
          color: color,
          angle: angle,
          num_steps: 4
        };

        if (angle === 'interior') {
          // Interior: style con LEFT HAND DRIVE + asiento trasero
          payload.style = interiorStyle;
        } else {
          // Exteriores: style con auto ESTACIONADO (no en medio de la calle)
          payload.style = exteriorStyle;
        }

        const response = await fetch('https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.success && data.image) {
          // Convertir base64 a buffer
          const imageBuffer = Buffer.from(data.image, 'base64');
          
          // Subir a Supabase Storage
          const fileName = `car-${car.id}-${angle}-${Date.now()}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('car-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            console.error(`   ❌ Error subiendo ${angle}:`, uploadError.message);
            continue;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('car-images')
            .getPublicUrl(fileName);

          photoUrls.push({ url: publicUrl, stored_path: fileName });
          console.log(`   ✅ ${angle} generada y subida`);
        } else {
          console.error(`   ❌ Error generando ${angle}:`, data.error);
        }
      }
    } else {
      // Método stock-photos requiere Unsplash API key configurada
      console.log(`   ⚠️  Método stock-photos no disponible. Usa --method cloudflare-ai`);
    }

    // Insertar referencias en car_photos
    if (photoUrls.length > 0) {
      const photoRecords = photoUrls.map((photo, index) => ({
        car_id: car.id,
        url: photo.url,
        stored_path: photo.stored_path,
        position: index,
        sort_order: index
      }));

      const { error: insertError } = await supabase
        .from('car_photos')
        .insert(photoRecords);

      if (insertError) {
        console.error(`   ❌ Error insertando referencias:`, insertError.message);
      } else {
        console.log(`   ✅ ${photoUrls.length} fotos guardadas en la base de datos`);
      }
    } else {
      console.log(`   ⚠️  No se pudieron generar fotos para este auto`);
    }

  } catch (error) {
    console.error(`   ❌ Error generando fotos:`, error);
  }
}

/**
 * Verifica que el bucket car-images exista (ya debe existir en producción)
 */
async function ensureCarImagesBucket(): Promise<void> {
  console.log('\n🪣 Verificando bucket car-images...');

  // El bucket car-images ya existe en producción
  // Con ANON_KEY no podemos listar buckets, así que asumimos que existe
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    // Con ANON_KEY no tenemos permisos para listar buckets
    // Asumimos que el bucket ya existe
    console.log('⚠️  No se puede verificar bucket (permisos), asumiendo que existe...');
    return;
  }

  const bucketExists = buckets?.some(b => b.id === 'car-images');

  if (bucketExists) {
    console.log('✅ Bucket car-images existe');
  } else {
    console.log('⚠️  Bucket car-images no encontrado en lista, pero puede existir');
  }
}

/**
 * Main
 */
async function main() {
  console.log('\n🚀 GENERACIÓN MASIVA DE FOTOS CON IA');
  console.log('====================================');
  console.log(`Método: ${method}`);
  console.log(`Límite: ${limit} autos`);

  try {
    // 0. Asegurar que existe el bucket
    await ensureCarImagesBucket();
    
    // 1. Obtener autos sin fotos
    const cars = await getCarsWithoutPhotos(limit);

    if (cars.length === 0) {
      console.log('\n✅ ¡Todos los autos ya tienen fotos!');
      return;
    }

    // 2. Generar fotos para cada auto
    console.log(`\n🔄 Procesando ${cars.length} autos...`);
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      console.log(`\n[${i + 1}/${cars.length}] Procesando...`);
      
      try {
        await generatePhotosForCar(car, method);
        successCount++;
      } catch (error) {
        console.error(`❌ Error procesando auto:`, error);
        failCount++;
      }

      // Pequeña pausa entre autos para no saturar la API
      if (i < cars.length - 1) {
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 3. Resumen final
    console.log('\n\n====================================');
    console.log('📊 RESUMEN FINAL');
    console.log('====================================');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Fallidos: ${failCount}`);
    console.log(`📁 Total procesados: ${cars.length}`);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
