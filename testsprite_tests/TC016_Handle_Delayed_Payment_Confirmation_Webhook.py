import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:4200", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on a car to start booking process.
        frame = context.pages[-1]
        # Click on the Volkswagen Gol Trend 2021 car card to start booking process
        elem = frame.locator('xpath=html/body/app-root/div/main/app-cars-list-page/section/div/div/div/div/div/app-map-filters/div/div/div[2]/div/div[2]/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on the selected car to view details and proceed with booking.
        frame = context.pages[-1]
        # Click on the Volkswagen Gol Trend 2021 car card to view details and proceed with booking
        elem = frame.locator('xpath=html/body/app-root/div/main/app-cars-list-page/section/div/div/div/div[2]/div[2]/div/app-car-card/article').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Select rental start and end dates to enable booking.
        frame = context.pages[-1]
        # Input rental start date
        elem = frame.locator('xpath=html/body/app-root/div/main/app-car-detail-page/section/aside/div[2]/div[5]/app-date-range-picker/div/div[3]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2025-11-10')
        

        frame = context.pages[-1]
        # Input rental end date
        elem = frame.locator('xpath=html/body/app-root/div/main/app-car-detail-page/section/aside/div[2]/div[5]/app-date-range-picker/div/div[3]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2025-11-15')
        

        # -> Click on 'Ingresar' to log in and proceed with booking initiation.
        frame = context.pages[-1]
        # Click on 'Ingresar' to log in and proceed with booking
        elem = frame.locator('xpath=html/body/app-root/div/header/div/div/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Payment Confirmed Successfully').first).to_be_visible(timeout=1000)
        except AssertionError:
            raise AssertionError("Test failed: MercadoPago webhook notification delay caused booking to remain in pending state and did not update to confirmed as expected.")
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    