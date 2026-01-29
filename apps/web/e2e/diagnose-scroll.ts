import { chromium } from 'patchright';

(async () => {
  console.log('🔍 Diagnóstico de Scroll (Contenedor #app-scroller)...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Verificar si existe el scroller
  const scroller = await page.$('#app-scroller');
  if (!scroller) {
    console.error('❌ No se encontró #app-scroller');
    await browser.close();
    return;
  }

  // Verificar overflow del scroller
  const styles = await page.evaluate(() => {
    const el = document.getElementById('app-scroller');
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      overflowY: style.overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    };
  });

  console.log('📊 Estilos del scroller:', styles);

  if (styles?.overflowY !== 'auto' && styles?.overflowY !== 'scroll') {
    console.warn('⚠️ El scroller no tiene overflow-y explícito (puede ser heredado o clase Tailwind).');
  }

  if (styles && styles.scrollHeight > styles.clientHeight) {
    console.log('✅ El contenido excede la altura (Hay scroll disponible).');
  } else {
    console.error('❌ El contenido NO excede la altura (No hay scroll o contenido vacío).');
  }

  // Intentar scroll
  const initialScroll = await scroller.evaluate(el => el.scrollTop);
  await scroller.evaluate(el => el.scrollTop = 500);
  await page.waitForTimeout(500);
  const newScroll = await scroller.evaluate(el => el.scrollTop);

  console.log(`📜 ScrollTop inicial: ${initialScroll}, Nuevo: ${newScroll}`);

  if (newScroll > initialScroll) {
    console.log('✅ El scroll funciona correctamente en el contenedor.');
  } else {
    console.error('❌ No se pudo hacer scroll.');
  }

  await browser.close();
})();