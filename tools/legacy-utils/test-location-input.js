const { chromium } = require("patchright");

(async () => {
  console.log("=== TEST LOCATION INPUT ===\n");

  const browser = await chromium.launchPersistentContext("/home/edu/.patchright-profile", {
    headless: false,
    viewport: { width: 1400, height: 900 }
  });

  const page = browser.pages()[0] || await browser.newPage();

  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
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
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check for the simple location input
    const info = await page.evaluate(() => {
      return {
        simpleLocationInput: !!document.querySelector('app-simple-location-input'),
        ionInput: !!document.querySelector('app-simple-location-input ion-input'),
        inputs: Array.from(document.querySelectorAll('ion-input, input')).map(i => ({
          placeholder: i.getAttribute('placeholder'),
          type: i.getAttribute('type'),
          class: i.className?.substring(0, 50)
        })),
        lugarRecogida: document.body.innerText.includes('Lugar de recogida'),
        errors: Array.from(document.querySelectorAll('[class*="error"]')).map(e => e.textContent?.trim())
      };
    });

    console.log("Simple Location Input found:", info.simpleLocationInput);
    console.log("Ion Input found:", info.ionInput);
    console.log("Inputs:", info.inputs);
    console.log("Lugar de recogida text:", info.lugarRecogida);
    console.log("Errors in page:", info.errors);

    await page.screenshot({ path: "/tmp/location-input.png", fullPage: true });

    console.log("\nConsole errors:");
    consoleErrors.forEach((e, i) => console.log(`${i+1}. ${e.substring(0, 200)}`));

  } catch (e) {
    console.error("ERROR:", e.message);
  }

  await browser.close();
  console.log("\nScreenshot: /tmp/location-input.png");
})();
