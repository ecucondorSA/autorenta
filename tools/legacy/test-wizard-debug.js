const { chromium } = require("patchright");

(async () => {
  console.log("=== DEBUG WIZARD ===");

  const browser = await chromium.launchPersistentContext("/home/edu/.patchright-profile", {
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = browser.pages()[0] || await browser.newPage();

  try {
    const carId = "b288ed1c-9544-44e1-b159-8e3335425051";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 3);

    const startStr = tomorrow.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Navegar a wizard directo
    const url = `http://localhost:4200/bookings/wizard?carId=${carId}&startDate=${startStr}&endDate=${endStr}`;
    console.log("Navegando a:", url);
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Screenshot completo
    await page.screenshot({ path: "/tmp/wizard-1.png", fullPage: true });

    // Obtener información del DOM
    const info = await page.evaluate(() => {
      const getVisibleText = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          exists: true,
          visible: rect.height > 0 && rect.width > 0,
          top: rect.top,
          height: rect.height,
          text: el.textContent?.substring(0, 100)
        };
      };

      return {
        url: window.location.href,
        bodyHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight,
        ionContent: getVisibleText('ion-content'),
        stepIndicator: getVisibleText('app-booking-step-indicator'),
        stepContent: getVisibleText('.step-content'),
        datesStep: getVisibleText('app-booking-dates-step'),
        datesContainer: getVisibleText('.dates-step-container'),
        stepHeader: getVisibleText('.step-header'),
        h2: getVisibleText('h2'),
        loadingContainer: getVisibleText('.loading-container'),
        allH2: Array.from(document.querySelectorAll('h2')).map(h => ({
          text: h.textContent?.trim(),
          visible: h.offsetParent !== null,
          top: h.getBoundingClientRect().top
        }))
      };
    });

    console.log("\n=== DOM INFO ===");
    console.log("URL:", info.url);
    console.log("Body height:", info.bodyHeight);
    console.log("Viewport:", info.viewportHeight);
    console.log("\nion-content:", info.ionContent);
    console.log("step-indicator:", info.stepIndicator);
    console.log("step-content:", info.stepContent);
    console.log("dates-step:", info.datesStep);
    console.log("dates-container:", info.datesContainer);
    console.log("step-header:", info.stepHeader);
    console.log("loading-container:", info.loadingContainer);
    console.log("\nAll H2s:", JSON.stringify(info.allH2, null, 2));

    // Scroll down y screenshot
    await page.evaluate(() => window.scrollTo(0, 200));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "/tmp/wizard-2.png" });

    // Scroll más abajo
    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: "/tmp/wizard-3.png" });

    console.log("\nScreenshots guardados en /tmp/wizard-*.png");

  } catch (e) {
    console.error("ERROR:", e.message);
    await page.screenshot({ path: "/tmp/wizard-error.png" }).catch(() => {});
  }

  await browser.close();
})();
