import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { config } from "https://deno.land/x/dotenv/mod.ts";

// Cargar variables de entorno si estamos en local
const env = config();
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || env.SUPABASE_URL;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || env.SUPABASE_SERVICE_ROLE_KEY;

// Simulación de ruta (Buenos Aires)
const ROUTE = [
    { lat: -34.6037, lng: -58.3816, speed: 0 },   // Obelisco (Quieto)
    { lat: -34.6040, lng: -58.3820, speed: 20 },  // Arrancando
    { lat: -34.6050, lng: -58.3830, speed: 45 },  // Av. 9 de Julio
    { lat: -34.6060, lng: -58.3840, speed: 60 },  // Acelerando
    { lat: -34.6070, lng: -58.3850, speed: 120 }, // Exceso de velocidad (Alerta)
    { lat: -34.6080, lng: -58.3860, speed: 0 },   // Frenada brusca
];

async function simulateTracker() {
    console.log("📡 Iniciando simulación de dispositivo IoT (Teltonika FMB920)...");
    
    // 1. Definir ID del dispositivo simulado
    const DEVICE_ID = "IMEI_123456789012345";
    
    console.log(`🔒 Dispositivo: ${DEVICE_ID}`);
    console.log(`📍 Enviando ${ROUTE.length} puntos de telemetría a la nube...`);

    for (const point of ROUTE) {
        const payload = {
            device_id: DEVICE_ID,
            lat: point.lat,
            lng: point.lng,
            speed: point.speed,
            battery: 12.4,
            ignition: point.speed > 0,
            timestamp: new Date().toISOString()
        };

        // Enviar a la Edge Function local o remota
        // Nota: En producción esto iría a tu URL de Supabase Functions
        const FUNCTION_URL = "http://localhost:54321/functions/v1/telemetry-ingest";
        
        try {
            console.log(`📤 Enviando: Speed ${point.speed}km/h en [${point.lat}, ${point.lng}]`);
            
            // Simular delay de red
            await new Promise(r => setTimeout(r, 2000));

            // Aquí haríamos el fetch real si la función estuviera corriendo
            // const res = await fetch(FUNCTION_URL, {
            //     method: 'POST',
            //     body: JSON.stringify(payload),
            //     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` }
            // });
            // console.log(`   ✅ Respuesta: ${res.status}`);
            
        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        }
    }
    console.log("🏁 Simulación finalizada.");
}

simulateTracker();
