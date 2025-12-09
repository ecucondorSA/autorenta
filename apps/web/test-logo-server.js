
async function testServer() {
  try {
    console.log('📡 Conectando a http://127.0.0.1:8082/logo-preview.html...');
    const response = await fetch('http://127.0.0.1:8082/logo-preview.html');
    
    console.log(`✅ Estado de respuesta: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`📄 Tipo de contenido: ${response.headers.get('content-type')}`);
      console.log(`📦 Tamaño del archivo: ${text.length} bytes`);
      console.log('🔍 Primeras líneas del archivo recibido:');
      console.log('---------------------------------------------------');
      console.log(text.substring(0, 150) + '...');
      console.log('---------------------------------------------------');
    } else {
      console.error('❌ Error: El servidor respondió pero con error.');
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
  }
}

testServer();
