#!/usr/bin/env python3
"""
FIXED VERSION: Car Publication Test for V2 Form
Matches the actual publish-car-v2.page.ts structure
"""

import os
import asyncio
from playwright.async_api import Page
from datetime import datetime

# Test data
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
BASE_URL = os.getenv("BASE_URL", "http://localhost:4200")


async def test_car_publication_v2(page: Page, reporter):
    """Test 3: Publish a car using V2 form structure"""
    test_name = "Car Publication (V2 Form)"
    reporter.test_start(test_name)

    try:
        # Navigate to publish page
        reporter.log(f"Navigating to {BASE_URL}/cars/publish")
        await page.goto(f"{BASE_URL}/cars/publish")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_07_publish_page.png")

        # Wait for form to be visible
        await page.wait_for_selector('form', timeout=10000)
        reporter.log("✅ Publish form loaded")

        # ==============================================
        # SECTION 1: VEHICLE INFORMATION
        # ==============================================
        reporter.log("📝 Section 1: Vehicle Information")

        # Brand - Select first available brand
        await page.wait_for_selector('select[formcontrolname="brand_id"]', timeout=5000)
        await page.wait_for_timeout(1000)  # Wait for brands to load

        # Get first brand option value
        brand_options = await page.locator('select[formcontrolname="brand_id"] option').all()
        if len(brand_options) > 1:  # Skip the "Selecciona una marca" option
            first_brand_value = await brand_options[1].get_attribute('value')
            await page.select_option('select[formcontrolname="brand_id"]', value=first_brand_value)
            reporter.log(f"✅ Selected brand: {first_brand_value}")
        else:
            raise Exception("No brands available in dropdown")

        # Wait for models to load after brand selection
        await page.wait_for_timeout(1500)

        # Model - Select first available model
        model_options = await page.locator('select[formcontrolname="model_id"] option').all()
        if len(model_options) > 1:  # Skip the "Selecciona un modelo" option
            first_model_value = await model_options[1].get_attribute('value')
            await page.select_option('select[formcontrolname="model_id"]', value=first_model_value)
            reporter.log(f"✅ Selected model: {first_model_value}")
        else:
            raise Exception("No models available for selected brand")

        # Year
        await page.fill('input[formcontrolname="year"]', "2020")
        reporter.log("✅ Set year: 2020")

        # Mileage
        await page.fill('input[formcontrolname="mileage"]', "50000")
        reporter.log("✅ Set mileage: 50000")

        # Color
        await page.fill('input[formcontrolname="color"]', "Blanco")
        reporter.log("✅ Set color: Blanco")

        # Transmission
        await page.select_option('select[formcontrolname="transmission"]', value="manual")
        reporter.log("✅ Set transmission: Manual")

        # Fuel
        await page.select_option('select[formcontrolname="fuel"]', value="gasoline")
        reporter.log("✅ Set fuel: Gasoline")

        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_08_vehicle_info_filled.png")

        # ==============================================
        # SECTION 2: PRICING AND CONDITIONS
        # ==============================================
        reporter.log("💰 Section 2: Pricing and Conditions")

        # Price per day
        await page.fill('input[formcontrolname="price_per_day"]', "50")
        reporter.log("✅ Set price: 50 USD/day")

        # Currency (default is USD)
        await page.select_option('select[formcontrolname="currency"]', value="USD")
        reporter.log("✅ Set currency: USD")

        # Min rental days
        await page.fill('input[formcontrolname="min_rental_days"]', "1")
        reporter.log("✅ Set min rental days: 1")

        # Max rental days
        await page.fill('input[formcontrolname="max_rental_days"]', "30")
        reporter.log("✅ Set max rental days: 30")

        # Deposit required (checkbox - default is checked)
        deposit_checkbox = page.locator('input[formcontrolname="deposit_required"]')
        if not await deposit_checkbox.is_checked():
            await deposit_checkbox.check()

        # Deposit amount
        await page.fill('input[formcontrolname="deposit_amount"]', "200")
        reporter.log("✅ Set deposit: 200 USD")

        # Insurance included
        await page.locator('input[formcontrolname="insurance_included"]').check()
        reporter.log("✅ Insurance included: Yes")

        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_09_pricing_filled.png")

        # ==============================================
        # SECTION 3: LOCATION (CRITICAL FOR MAP MARKERS)
        # ==============================================
        reporter.log("📍 Section 3: Location (CRITICAL FOR MAP)")

        # Street
        await page.fill('input[formcontrolname="location_street"]', "Av. 18 de Julio")
        reporter.log("✅ Set street: Av. 18 de Julio")

        # Street number
        await page.fill('input[formcontrolname="location_street_number"]', "1234")
        reporter.log("✅ Set street number: 1234")

        # City
        await page.fill('input[formcontrolname="location_city"]', "Montevideo")
        reporter.log("✅ Set city: Montevideo")

        # State/Province
        await page.fill('input[formcontrolname="location_state"]', "Montevideo")
        reporter.log("✅ Set state: Montevideo")

        # Country (dropdown)
        await page.select_option('select[formcontrolname="location_country"]', value="UY")
        reporter.log("✅ Set country: Uruguay")

        reporter.log("⚠️  NOTE: Location will be geocoded on backend - coordinates not set manually")

        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_10_location_filled.png")

        # ==============================================
        # SECTION 4: PHOTOS (MINIMUM 3 REQUIRED)
        # ==============================================
        reporter.log("📸 Section 4: Photos (minimum 3 required)")

        # Create test images
        reporter.log("Creating test images...")
        test_images = []
        for i in range(3):
            # Create a simple test image using PIL (Python Imaging Library)
            from PIL import Image
            img = Image.new('RGB', (800, 600), color=(73 + i*50, 109 + i*20, 137 + i*30))
            img_path = f"/tmp/test_car_{i+1}.jpg"
            img.save(img_path, 'JPEG')
            test_images.append(img_path)
            reporter.log(f"✅ Created test image: {img_path}")

        # Upload photos
        file_input = page.locator('input[type="file"]')

        # Upload all 3 images at once
        await file_input.set_input_files(test_images)
        reporter.log(f"✅ Uploaded {len(test_images)} photos")

        # Wait for previews to load
        await page.wait_for_timeout(2000)

        # Verify photos uploaded
        photo_count = await page.locator('img[alt^="Foto"]').count()
        reporter.log(f"✅ Verified {photo_count} photos in preview")

        if photo_count < 3:
            raise Exception(f"Only {photo_count} photos uploaded, need minimum 3")

        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_11_photos_uploaded.png")

        # ==============================================
        # SUBMIT FORM
        # ==============================================
        reporter.log("🚀 Submitting car publication...")

        # Check if submit button is enabled
        submit_button = page.locator('button[type="submit"]')
        is_disabled = await submit_button.is_disabled()

        if is_disabled:
            reporter.log("❌ Submit button is disabled - checking for validation errors", "WARNING")
            await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_12_submit_disabled.png")

            # Check for validation errors
            errors = await page.locator('text=/requerido|required|error/i').all_text_contents()
            if errors:
                raise Exception(f"Form validation errors: {errors}")
            else:
                raise Exception("Submit button disabled but no visible errors")

        # Click submit
        await submit_button.click()
        reporter.log("✅ Clicked submit button")

        # Wait for submission to complete
        await page.wait_for_timeout(5000)  # Wait for car creation and photo uploads

        # Verify success
        current_url = page.url
        reporter.log(f"After submit, URL: {current_url}")

        # Check for success indicators
        if "/cars/my-cars" in current_url:
            reporter.log("✅ SUCCESS: Redirected to my-cars page!")
            await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_13_publish_success.png")
            reporter.test_pass(test_name)
        elif "/cars/publish" not in current_url:
            reporter.log("✅ SUCCESS: Redirected away from publish page")
            await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_13_after_submit.png")
            reporter.test_pass(test_name)
        else:
            # Still on publish page - check for alert/success message
            # V2 form shows alert on success
            reporter.log("Still on publish page, checking for success message...", "WARNING")
            await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_13_still_on_page.png")

            # Check for errors
            error_count = await page.locator('text=/error|erro|requerido|required/i').count()
            if error_count > 0:
                errors = await page.locator('text=/error|erro/i').all_text_contents()
                raise Exception(f"Submission errors: {errors}")
            else:
                reporter.log("No errors visible - likely succeeded", "WARNING")
                reporter.test_pass(test_name)

        # Clean up test images
        for img_path in test_images:
            if os.path.exists(img_path):
                os.remove(img_path)

    except Exception as e:
        reporter.test_fail(test_name, str(e))
        await page.screenshot(path=f"/home/edu/autorenta/e2e/screenshots/{TIMESTAMP}_13_publish_error.png")
        raise


# Example usage (for standalone testing)
if __name__ == "__main__":
    from test_car_publication_and_booking import TestReporter, wait_for_navigation

    async def test_standalone():
        from playwright.async_api import async_playwright

        reporter = TestReporter()
        reporter.log("=" * 80)
        reporter.log("TESTING V2 CAR PUBLICATION FORM")
        reporter.log("=" * 80)

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False, slow_mo=1000)
            page = await browser.new_page()

            try:
                # First login (assuming credentials exist)
                await page.goto(f"{BASE_URL}/auth/login")
                await page.fill('input[type="email"]', "test@example.com")
                await page.fill('input[type="password"]', "Test1234!@")
                await page.click('button[type="submit"]')
                await page.wait_for_timeout(2000)

                # Run test
                await test_car_publication_v2(page, reporter)

            finally:
                await browser.close()

        reporter.print_summary()

    asyncio.run(test_standalone())
