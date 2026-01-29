#!/usr/bin/env python3
"""
Script to investigate Binance P2P UI structure for ad management.
Uses the existing browser profile from the Ecuador daemon.
"""

import asyncio
from playwright.async_api import async_playwright

BROWSER_PROFILE = "/home/edu/.produbanco-browser-profile"

async def investigate_my_ads():
    """Investigate the myAds page structure."""
    print("=" * 60)
    print("INVESTIGATING BINANCE P2P UI")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            BROWSER_PROFILE,
            headless=False,
            args=['--disable-blink-features=AutomationControlled'],
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()

        # Navigate to myAds
        print("\n[1] Navigating to myAds...")
        await page.goto('https://p2p.binance.com/en/myads?type=normal&code=default')
        await asyncio.sleep(3)

        print(f"    URL: {page.url}")

        # Check if logged in
        if 'login' in page.url.lower() or 'accounts.binance' in page.url:
            print("    ⚠️  Not logged in! Please log in manually.")
            await asyncio.sleep(30)

        # Wait for content
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)

        # Get page structure
        print("\n[2] Analyzing page structure...")

        # Look for tables
        tables = await page.query_selector_all('table')
        print(f"    Tables found: {len(tables)}")

        # Look for ad rows
        ad_rows = await page.query_selector_all('[class*="ad"], [class*="Ad"], [class*="row"], tr')
        print(f"    Potential ad rows: {len(ad_rows)}")

        # Look for edit buttons
        edit_buttons = await page.query_selector_all('button, a')
        edit_count = 0
        for btn in edit_buttons:
            text = await btn.inner_text()
            if 'edit' in text.lower() or 'editar' in text.lower():
                edit_count += 1
                print(f"    Found edit button: '{text}'")
        print(f"    Edit buttons found: {edit_count}")

        # Get all buttons text
        print("\n[3] All buttons on page:")
        all_buttons = await page.query_selector_all('button')
        for i, btn in enumerate(all_buttons[:20]):
            try:
                text = (await btn.inner_text()).strip()[:50]
                classes = await btn.get_attribute('class') or ''
                if text:
                    print(f"    [{i}] '{text}' class='{classes[:40]}'")
            except:
                pass

        # Get all links
        print("\n[4] All links with 'edit' or 'ad':")
        all_links = await page.query_selector_all('a')
        for link in all_links:
            try:
                href = await link.get_attribute('href') or ''
                text = (await link.inner_text()).strip()[:30]
                if 'edit' in href.lower() or 'edit' in text.lower() or 'ad' in href.lower():
                    print(f"    '{text}' → {href}")
            except:
                pass

        # Check for "no ads" message
        print("\n[5] Checking for empty state...")
        page_text = await page.inner_text('body')
        if 'no ad' in page_text.lower() or 'create' in page_text.lower():
            print("    Page might be showing 'no ads' state")

        # Look for specific Binance P2P elements
        print("\n[6] Looking for Binance P2P specific elements...")

        # Check for data-bn attributes (Binance uses these)
        bn_elements = await page.query_selector_all('[data-bn-type], [data-testid]')
        print(f"    Binance elements found: {len(bn_elements)}")
        for el in bn_elements[:10]:
            try:
                bn_type = await el.get_attribute('data-bn-type') or ''
                testid = await el.get_attribute('data-testid') or ''
                tag = await el.evaluate('el => el.tagName')
                if bn_type or testid:
                    print(f"      <{tag}> bn-type='{bn_type}' testid='{testid}'")
            except:
                pass

        # Capture HTML of main content
        print("\n[7] Capturing main content HTML...")
        try:
            main_content = await page.query_selector('main, #__APP, [class*="content"], [class*="main"]')
            if main_content:
                html = await main_content.inner_html()
                # Save to file for analysis
                with open('/tmp/binance_myads_html.txt', 'w') as f:
                    f.write(html[:50000])
                print("    Saved to /tmp/binance_myads_html.txt")
        except Exception as e:
            print(f"    Error: {e}")

        # Take screenshot
        print("\n[8] Taking screenshot...")
        await page.screenshot(path='/tmp/binance_myads.png', full_page=True)
        print("    Saved to /tmp/binance_myads.png")

        print("\n" + "=" * 60)
        print("Investigation complete!")
        print("=" * 60)

        # Keep browser open for manual inspection
        print("\nBrowser will stay open for 60 seconds for manual inspection...")
        await asyncio.sleep(60)

        await browser.close()

async def investigate_post_ad():
    """Investigate the postAd page structure."""
    print("=" * 60)
    print("INVESTIGATING BINANCE POST AD PAGE")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            BROWSER_PROFILE,
            headless=False,
            args=['--disable-blink-features=AutomationControlled'],
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()

        # Navigate to postAd
        print("\n[1] Navigating to postAd...")
        await page.goto('https://p2p.binance.com/en/postAd')
        await asyncio.sleep(3)

        print(f"    URL: {page.url}")

        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)

        # Get form elements
        print("\n[2] Analyzing form elements...")

        inputs = await page.query_selector_all('input')
        print(f"    Inputs found: {len(inputs)}")
        for inp in inputs:
            try:
                name = await inp.get_attribute('name') or ''
                placeholder = await inp.get_attribute('placeholder') or ''
                inp_type = await inp.get_attribute('type') or ''
                if name or placeholder:
                    print(f"      input[name='{name}' type='{inp_type}'] placeholder='{placeholder}'")
            except:
                pass

        # Get buttons
        print("\n[3] Buttons:")
        buttons = await page.query_selector_all('button')
        for btn in buttons:
            try:
                text = (await btn.inner_text()).strip()[:40]
                if text:
                    print(f"      '{text}'")
            except:
                pass

        # Take screenshot
        await page.screenshot(path='/tmp/binance_postad.png', full_page=True)
        print("\n    Screenshot saved to /tmp/binance_postad.png")

        print("\nBrowser will stay open for 30 seconds...")
        await asyncio.sleep(30)

        await browser.close()

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == 'postad':
        asyncio.run(investigate_post_ad())
    else:
        asyncio.run(investigate_my_ads())
