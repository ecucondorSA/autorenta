const { chromium } = require("patchright");

(async () => {
  console.log("=== TEST ERROR DE RESERVA ===\n");

  const browser = await chromium.launchPersistentContext("/home/edu/.patchright-profile", {
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = browser.pages()[0] || await browser.newPage();

  const errors = [];
  const networkErrors = [];
  const apiResponses = [];

  // Capturar errores de consola
  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  // Capturar respuestas de API
  page.on("response", async res => {
    const url = res.url();
    if (res.status() >= 400) {
      let body = "";
      try {
        body = await res.text();
      } catch (e) {}
      networkErrors.push({
        url: url.substring(0, 150),
        status: res.status(),
        body: body.substring(0, 500)
      });
    }
    // Capturar respuestas de Supabase/API
    if (url.includes("supabase") || url.includes("api")) {
      try {
        const body = await res.text();
        if (body.includes("error") || body.includes("Error")) {
          apiResponses.push({
            url: url.substring(0, 100),
            status: res.status(),
            body: body.substring(0, 1000)
          });
        }
      } catch (e) {}
    }
  });

  try {
    const carId = "b288ed1c-9544-44e1-b159-8e3335425051";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3);

    const startStr = tomorrow.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const url = `http://localhost:4200/bookings/wizard?carId=${carId}&startDate=${startStr}&endDate=${endStr}`;

    console.log("1. Navegando al wizard...");
    console.log("   URL:", url);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: "/tmp/error-1-wizard.png" });

    // Verificar estado del wizard
    const wizardState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.querySelector('h1')?.textContent?.trim(),
        buttons: Array.from(document.querySelectorAll('button'))
          .filter(b => b.offsetParent !== null)
          .map(b => ({
            text: b.textContent?.trim(),
            disabled: b.disabled,
            class: b.className.substring(0, 50)
          }))
          .filter(b => b.text),
        errorMessages: Array.from(document.querySelectorAll('[class*="error"], [class*="warning"], .text-red'))
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length < 200)
      };
    });

    console.log("\n2. Estado del wizard:");
    console.log("   Título:", wizardState.title);
    console.log("   Botones:", wizardState.buttons.slice(0, 5));
    if (wizardState.errorMessages.length) {
      console.log("   Errores visibles:", wizardState.errorMessages);
    }

    // Intentar completar el formulario - seleccionar ubicación
    console.log("\n3. Intentando completar ubicación...");

    // Buscar input de ubicación
    const locationInput = await page.$('input[name="search-location"], input[placeholder*="Aeropuerto"], input[placeholder*="dirección"]');
    if (locationInput) {
      await locationInput.fill("Buenos Aires");
      await new Promise(r => setTimeout(r, 1000));

      // Intentar seleccionar una sugerencia
      const suggestion = await page.$('[class*="suggestion"], [class*="autocomplete"] li, [role="option"]');
      if (suggestion) {
        await suggestion.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    await page.screenshot({ path: "/tmp/error-2-location.png" });

    // Ver si el botón Siguiente está habilitado
    const nextBtn = await page.$('button:has-text("Siguiente")');
    if (nextBtn) {
      const isDisabled = await nextBtn.evaluate(b => b.disabled);
      console.log("   Botón Siguiente habilitado:", !isDisabled);

      if (!isDisabled) {
        console.log("\n4. Haciendo click en Siguiente...");
        await nextBtn.click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: "/tmp/error-3-next.png" });
      }
    }

    // Capturar estado final
    const finalState = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        url: window.location.href,
        hasError: body.toLowerCase().includes('error'),
        errorTexts: body.split('\n')
          .filter(l =>
            l.toLowerCase().includes('error') ||
            l.toLowerCase().includes('no se pudo') ||
            l.toLowerCase().includes('failed')
          )
          .slice(0, 10),
        toasts: Array.from(document.querySelectorAll('[class*="toast"], [role="alert"], .p-toast'))
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length < 300),
        validationMessages: Array.from(document.querySelectorAll('[class*="validation"], [class*="invalid"], .ng-invalid'))
          .map(el => el.textContent?.trim())
          .filter(t => t && t.length < 200)
      };
    });

    console.log("\n=== RESULTADO ===");
    console.log("URL final:", finalState.url);

    if (finalState.toasts.length) {
      console.log("\nTOAST MESSAGES:");
      finalState.toasts.forEach((t, i) => console.log(`  ${i+1}. ${t}`));
    }

    if (finalState.errorTexts.length) {
      console.log("\nTEXTOS DE ERROR EN PÁGINA:");
      finalState.errorTexts.forEach((t, i) => console.log(`  ${i+1}. ${t}`));
    }

    if (finalState.validationMessages.length) {
      console.log("\nMENSAJES DE VALIDACIÓN:");
      finalState.validationMessages.forEach((t, i) => console.log(`  ${i+1}. ${t}`));
    }

    console.log("\n=== ERRORES DE RED (4xx/5xx) ===");
    if (networkErrors.length === 0) {
      console.log("Ninguno");
    } else {
      networkErrors.forEach((e, i) => {
        console.log(`\n${i+1}. [${e.status}] ${e.url}`);
        if (e.body) console.log(`   Body: ${e.body.substring(0, 300)}`);
      });
    }

    console.log("\n=== RESPUESTAS API CON ERROR ===");
    if (apiResponses.length === 0) {
      console.log("Ninguna");
    } else {
      apiResponses.forEach((e, i) => {
        console.log(`\n${i+1}. [${e.status}] ${e.url}`);
        console.log(`   ${e.body}`);
      });
    }

    console.log("\n=== ERRORES DE CONSOLA ===");
    if (errors.length === 0) {
      console.log("Ninguno");
    } else {
      errors.slice(0, 10).forEach((e, i) => {
        console.log(`${i+1}. ${e.substring(0, 300)}`);
      });
    }

    await page.screenshot({ path: "/tmp/error-final.png", fullPage: true });

  } catch (e) {
    console.error("\nEXCEPTION:", e.message);
    await page.screenshot({ path: "/tmp/error-exception.png" }).catch(() => {});
  }

  await browser.close();
  console.log("\n\nScreenshots en /tmp/error-*.png");
})();
