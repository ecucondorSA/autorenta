async function getBinanceRate() {
  const url = 'https://api.binance.com/api/v3/ticker/price?symbol=USDTARS';
  console.log('Fetching rate from:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    
    const binanceRate = parseFloat(data.price);
    const platformRate = binanceRate * 1.10; // 10% margin as per code

    console.log('\n--- Cotización del Día (Binance USDT/ARS) ---');
    console.log(`Tasa de Mercado (Binance): $${binanceRate.toFixed(2)} ARS`);
    console.log(`Tasa de Plataforma (con 10% margen para garantías): $${platformRate.toFixed(2)} ARS`);
    console.log('---------------------------------------------');
    
  } catch (error) {
    console.error('Error fetching rate:', error);
  }
}

getBinanceRate();
