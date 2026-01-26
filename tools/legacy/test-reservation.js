const { chromium } = require("patchright");

(async () => {
  console.log("=== TEST RESERVA - FLUJO COMPLETO ===");

  const browser = await chromium.launchPersistentContext("/home/edu/.patchright-profile", {
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = browser.pages()[0] || await browser.newPage();

  const errors = [];
  const networkErrors = [];

  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  page.on("response", res => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    console.log("1. Navegando a página del auto...");
    await page.goto("http://localhost:4200/cars/b288ed1c-9544-44e1-b159-8e3335425051", {
      waitUntil: "networkidle",
      timeout: 30000
    });
    await new Promise(r => setTimeout(r, 2000));

    // Click "Seleccionar Fechas"
    console.log("2. Click en Seleccionar Fechas...");
    const dateBtn = await page.$("button:has-text('Seleccionar Fechas')");
    if (dateBtn) {
      await dateBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ path: "/tmp/book-1.png" });

    // Get visible buttons
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button"))
        .filter(b => b.offsetParent !== null)
        .map(b => b.textContent.trim())
        .filter(t => t);
    });
    console.log("   Botones visibles:", buttons.slice(0, 12));

    // Try to click Reservar
    console.log("3. Buscando botón Reservar...");
    const reserveBtn = await page.$("button:has-text('Reservar')");
    if (reserveBtn) {
      const isVisible = await reserveBtn.isVisible();
      console.log("   Encontrado, visible:", isVisible);
      if (isVisible) {
        await reserveBtn.click();
        await new Promise(r => setTimeout(r, 4000));
        console.log("   URL después de click:", page.url());
      }
    } else {
      console.log("   No encontrado, intentando con Ver Disponibilidad...");
      const availBtn = await page.$("button:has-text('Ver Disponibilidad')");
      if (availBtn) {
        await availBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    await page.screenshot({ path: "/tmp/book-2.png" });

    // Look for date selection if we have a modal
    console.log("4. Verificando modal de fechas...");
    const modal = await page.$("[class*='modal'], [class*='dialog'], .p-dialog");
    if (modal) {
      console.log("   Modal encontrado");

      // Try to click Reservar in modal
      const modalReserveBtn = await page.$("[class*='modal'] button:has-text('Reservar'), .p-dialog button:has-text('Reservar')");
      if (modalReserveBtn) {
        await modalReserveBtn.click();
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    await page.screenshot({ path: "/tmp/book-3.png" });

    // Si estamos en booking page, buscar "Confirmar"
    console.log("5. URL actual:", page.url());

    if (page.url().includes("booking")) {
      console.log("   En página de booking...");

      // Get booking page info
      const bookingInfo = await page.evaluate(() => {
        return {
          buttons: Array.from(document.querySelectorAll("button"))
            .filter(b => b.offsetParent !== null)
            .map(b => b.textContent.trim()),
          inputs: Array.from(document.querySelectorAll("input"))
            .map(i => ({ type: i.type, name: i.name || i.placeholder })),
          headings: Array.from(document.querySelectorAll("h1, h2, h3"))
            .map(h => h.textContent.trim())
        };
      });

      console.log("   Headings:", bookingInfo.headings);
      console.log("   Botones:", bookingInfo.buttons.slice(0, 10));

      const confirmBtn = await page.$("button:has-text('Confirmar')");
      if (confirmBtn) {
        console.log("6. Haciendo click en Confirmar...");
        await confirmBtn.click();
        await new Promise(r => setTimeout(r, 5000));
        console.log("   URL después:", page.url());
      }
    }

    await page.screenshot({ path: "/tmp/book-4.png" });

    // Final check
    const finalState = await page.evaluate(() => {
      const text = document.body.innerText;
      const errorLines = text.split('\n').filter(l =>
        l.toLowerCase().includes('error') ||
        l.toLowerCase().includes('failed') ||
        l.toLowerCase().includes('no se pudo')
      );
      return {
        url: window.location.href,
        errorLines: errorLines.slice(0, 5),
        toasts: Array.from(document.querySelectorAll("[class*='toast'], [class*='message'], [role='alert'], .p-toast"))
          .map(el => el.textContent.trim())
          .filter(t => t && t.length < 300)
          .slice(0, 5),
        visibleText: text.substring(0, 2000)
      };
    });

    console.log("");
    console.log("=== RESULTADO FINAL ===");
    console.log("URL:", finalState.url);
    if (finalState.toasts.length) {
      console.log("Toasts/Messages:", finalState.toasts);
    }
    if (finalState.errorLines.length) {
      console.log("Errores en texto:", finalState.errorLines);
    }

    console.log("");
    console.log("=== ERRORES HTTP (4xx/5xx) ===");
    const unique = [...new Map(networkErrors.map(e => [e.url, e])).values()];
    if (unique.length === 0) {
      console.log("Ninguno");
    } else {
      unique.slice(0, 10).forEach((e, i) => {
        const shortUrl = e.url.length > 100 ? e.url.substring(0, 100) + "..." : e.url;
        console.log(`${i+1}. [${e.status}] ${shortUrl}`);
      });
    }

    console.log("");
    console.log("=== ERRORES DE CONSOLA ===");
    if (errors.length === 0) {
      console.log("Ninguno");
    } else {
      errors.slice(0, 8).forEach((e, i) => {
        console.log(`${i+1}. ${e.substring(0, 200)}`);
      });
    }

    await page.screenshot({ path: "/tmp/book-final.png" });

  } catch (e) {
    console.error("EXCEPTION:", e.message);
    await page.screenshot({ path: "/tmp/book-error.png" }).catch(() => {});
  }

  await browser.close();
  console.log("");
  console.log("Screenshots guardados en /tmp/book-*.png");
})();
