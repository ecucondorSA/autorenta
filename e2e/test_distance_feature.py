#!/usr/bin/env python3
"""
Test to verify distance badges appear on car cards
"""
from playwright.sync_api import sync_playwright, Page
import time

def test_distance_feature():
    """Verify that distance badges appear on car cards after map loads user location"""

    with sync_playwright() as p:
        # Launch browser in headed mode so we can see what's happening
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            # Grant geolocation permissions
            permissions=['geolocation'],
            # Set a fake location (Montevideo, Uruguay)
            geolocation={'latitude': -34.9011, 'longitude': -56.1645}
        )

        page = context.new_page()

        # Enable console logging
        page.on('console', lambda msg: print(f'[BROWSER] {msg.type}: {msg.text}'))

        print("🚀 Opening cars list page...")
        page.goto('http://localhost:4200/cars')

        # Wait for page to load
        page.wait_for_selector('app-cars-list-page', timeout=10000)
        print("✅ Page loaded")

        # Wait for map to load and request user location (give it time)
        print("⏳ Waiting for map to initialize and get user location...")
        time.sleep(5)

        # Check if we have any car cards
        car_cards = page.query_selector_all('app-car-card')
        print(f"📊 Found {len(car_cards)} car cards")

        if len(car_cards) == 0:
            print("⚠️  No car cards found - may need to load test data first")
            browser.close()
            return

        # Check for distance badges
        print("\n🔍 Checking for distance badges...")
        distance_badges_found = 0

        for i, card in enumerate(car_cards[:5], 1):  # Check first 5 cards
            # Look for the distance text pattern (e.g., "3.5km de tu ubicación")
            distance_element = card.query_selector('text=/de tu ubicación/')

            if distance_element:
                distance_text = distance_element.inner_text()
                print(f"  ✅ Card {i}: {distance_text}")
                distance_badges_found += 1
            else:
                print(f"  ❌ Card {i}: No distance badge found")

        print(f"\n📈 Summary:")
        print(f"   Total cards: {len(car_cards)}")
        print(f"   Cards with distance: {distance_badges_found}")
        print(f"   Success rate: {(distance_badges_found/len(car_cards)*100):.1f}%")

        if distance_badges_found > 0:
            print("\n✨ SUCCESS: Distance feature is working!")
        else:
            print("\n❌ FAILURE: Distance badges not appearing")
            print("\n💡 Check browser console logs above for clues")

        # Keep browser open for manual inspection
        print("\n🔎 Keeping browser open for 10 seconds for manual inspection...")
        time.sleep(10)

        browser.close()

if __name__ == '__main__':
    test_distance_feature()
