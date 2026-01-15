const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ROUTE = [
    { lat: -34.6037, lng: -58.3816, speed: 0 },
    { lat: -34.6040, lng: -58.3820, speed: 20 },
    { lat: -34.6050, lng: -58.3830, speed: 45 },
    { lat: -34.6060, lng: -58.3840, speed: 60 },
    { lat: -34.6070, lng: -58.3850, speed: 120 },
    { lat: -34.6080, lng: -58.3860, speed: 0 },
];

async function simulateTracker() {
    console.log("📡 Iniciando simulación de dispositivo IoT para Node.js...");
    const DEVICE_ID = "IMEI_123456789012345";
    
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

        // URL de la función desplegada
        const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telemetry-ingest`;
        
        try {
            console.log(`📤 Enviando: Speed ${point.speed}km/h en [${point.lat}, ${point.lng}]`);
            
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log(`   ✅ Respuesta (${response.status}):`, result);
            
        } catch (e) {
            console.error(`   ❌ Error: ${e.message}`);
        }
        // Delay corto entre puntos
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log("🏁 Simulación finalizada.");
}

simulateTracker();
