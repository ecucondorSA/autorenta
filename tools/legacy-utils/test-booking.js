const { chromium } = require("patchright");

(async () => {
  console.log("=== TEST BOOKING DIRECTO ===");

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
    // Ir directamente a booking page con parámetros
    const carId = "b288ed1c-9544-44e1-b159-8e3335425051";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3);

    const startStr = tomorrow.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const bookingUrl = `http://localhost:4200/bookings/new?carId=${carId}&startDate=${startStr}&endDate=${endStr}`;

    console.log("1. Navegando a booking page...");
    console.log("   URL:", bookingUrl);
    await page.goto(bookingUrl, { waitUntil: "networkidle", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: "/tmp/book-1.png" });

    // Get page state
    console.log("2. Analizando página...");
    const state = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      buttons: Array.from(document.querySelectorAll("button"))
        .filter(b => b.offsetParent !== null)
        .map(b => b.textContent.trim())
        .filter(t => t),
      headings: Array.from(document.querySelectorAll("h1, h2, h3"))
        .map(h => h.textContent.trim()),
      forms: document.querySelectorAll("form").length,
      inputs: Array.from(document.querySelectorAll("input, select"))
        .map(i => ({ type: i.type, name: i.name || i.id || i.placeholder }))
    }));

    console.log("   URL:", state.url);
    console.log("   Title:", state.title);
    console.log("   Headings:", state.headings.slice(0, 5));
    console.log("   Buttons:", state.buttons.slice(0, 10));
    console.log("   Forms:", state.forms);
    console.log("   Inputs:", state.inputs.slice(0, 8));

    // Try to click Confirmar reserva
    console.log("");
    console.log("3. Buscando botón Confirmar...");
    const confirmBtn = await page.$("button:has-text('Confirmar')");

    if (confirmBtn) {
      const isVisible = await confirmBtn.isVisible();
      console.log("   Botón encontrado, visible:", isVisible);

      if (isVisible) {
        console.log("4. Haciendo click en Confirmar...");
        await confirmBtn.click();
        await new Promise(r => setTimeout(r, 5000));

        await page.screenshot({ path: "/tmp/book-2.png" });

        console.log("   URL después:", page.url());

        // Check for errors
        const afterClick = await page.evaluate(() => {
          const text = document.body.innerText;
          return {
            url: window.location.href,
            hasError: text.toLowerCase().includes('error'),
            toasts: Array.from(document.querySelectorAll("[class*='toast'], .p-toast, [class*='message'], [role='alert']"))
              .map(el => el.textContent.trim())
              .filter(t => t && t.length < 300),
            errorText: text.split('\n').filter(l =>
              l.toLowerCase().includes('error') ||
              l.toLowerCase().includes('failed') ||
              l.toLowerCase().includes('no se pudo') ||
              l.toLowerCase().includes('incorrecto')
            ).slice(0, 5)
          };
        });

        console.log("");
        console.log("=== DESPUÉS DE CONFIRMAR ===");
        console.log("URL:", afterClick.url);
        console.log("Has Error:", afterClick.hasError);
        if (afterClick.toasts.length) {
          console.log("TOAST MESSAGES:", afterClick.toasts);
        }
        if (afterClick.errorText.length) {
          console.log("ERROR TEXT:", afterClick.errorText);
        }
      }
    } else {
      console.log("   Botón Confirmar no encontrado");

      // Try other buttons
      const otherBtns = ["Reservar", "Pagar", "Continuar"];
      for (const btnText of otherBtns) {
        const btn = await page.$(`button:has-text('${btnText}')`);
        if (btn && await btn.isVisible()) {
          console.log(`   Intentando con: ${btnText}`);
          await btn.click();
          await new Promise(r => setTimeout(r, 3000));
          break;
        }
      }
    }

    await page.screenshot({ path: "/tmp/book-final.png" });

    // Final error summary
    console.log("");
    console.log("=== ERRORES HTTP ===");
    const unique = [...new Map(networkErrors.map(e => [e.url, e])).values()];
    if (unique.length === 0) {
      console.log("Ninguno");
    } else {
      unique.slice(0, 10).forEach((e, i) => {
        const shortUrl = e.url.length > 80 ? e.url.substring(0, 80) + "..." : e.url;
        console.log(`${i+1}. [${e.status}] ${shortUrl}`);
      });
    }

    console.log("");
    console.log("=== ERRORES CONSOLA ===");
    if (errors.length === 0) {
      console.log("Ninguno");
    } else {
      errors.slice(0, 8).forEach((e, i) => {
        console.log(`${i+1}. ${e.substring(0, 200)}`);
      });
    }

  } catch (e) {
    console.error("EXCEPTION:", e.message);
    await page.screenshot({ path: "/tmp/book-error.png" }).catch(() => {});
  }

  await browser.close();
  console.log("");
  console.log("Screenshots en /tmp/book-*.png");
})();
