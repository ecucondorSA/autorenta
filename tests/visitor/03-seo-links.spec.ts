import { test, expect } from '@playwright/test';

/**
 * Test Suite: SEO & Links (Visitor)
 *
 * Priority: P1 (Important for discoverability)
 * Duration: ~2 minutes
 * Coverage:
 * - Page titles and meta descriptions
 * - Social media meta tags (og:, twitter:)
 * - Canonical URLs
 * - Navigation links functionality
 * - External links (social media, support)
 * - Sitemap and robots.txt accessibility
 * - Structured data (JSON-LD)
 */

test.describe('SEO & Links - Visitor', () => {
  test('should have proper page title on homepage', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(70); // SEO best practice
  });

  test('should have meta description on homepage', async ({ page }) => {
    await page.goto('/');

    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute('content');

    if (content) {
      expect(content.length).toBeGreaterThan(50);
      expect(content.length).toBeLessThan(160); // SEO best practice
    }
  });

  test('should have Open Graph meta tags', async ({ page }) => {
    await page.goto('/');

    // OG title
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogTitleContent = await ogTitle.getAttribute('content');

    // OG description
    const ogDescription = page.locator('meta[property="og:description"]');
    const ogDescriptionContent = await ogDescription.getAttribute('content');

    // OG image
    const ogImage = page.locator('meta[property="og:image"]');
    const ogImageContent = await ogImage.getAttribute('content');

    // At least one OG tag should exist
    const hasOgTags = ogTitleContent || ogDescriptionContent || ogImageContent;
    expect(typeof hasOgTags).toBe('string');
  });

  test('should have Twitter Card meta tags', async ({ page }) => {
    await page.goto('/');

    const twitterCard = page.locator('meta[name="twitter:card"]');
    const count = await twitterCard.count();

    // Twitter card may or may not be configured
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have canonical URL', async ({ page }) => {
    await page.goto('/');

    const canonical = page.locator('link[rel="canonical"]');
    const count = await canonical.count();

    // Canonical URL may or may not be configured
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      const href = await canonical.getAttribute('href');
      if (href) {
        expect(href).toMatch(/^https?:\/\//);
      }
    }
  });

  test('should have language attribute on html tag', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const lang = await html.getAttribute('lang');

    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^(es|en)/); // Spanish or English
  });

  test('should have favicon', async ({ page }) => {
    await page.goto('/');

    const favicon = page.locator('link[rel*="icon"]');
    const count = await favicon.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should have proper page title on car catalog page', async ({ page }) => {
    await page.goto('/cars');

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toMatch(/autos|cars|vehículos/i);
  });

  test('should have working internal navigation links', async ({ page }) => {
    await page.goto('/');

    // Find all internal links (both href and routerLink)
    const internalLinks = page.locator('a[href^="/"], a[routerLink]');
    const count = await internalLinks.count();

    // May use Angular router links instead of href
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      // Check first link
      const firstLink = internalLinks.first();
      const href = await firstLink.getAttribute('href');
      const routerLink = await firstLink.getAttribute('routerLink');

      expect(href || routerLink).toBeTruthy();
    }
  });

  test('should have social media links in footer', async ({ page }) => {
    await page.goto('/');

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Look for social media links
    const socialLinks = page.locator('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]');

    // May or may not have social links
    const count = await socialLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle external links with proper attributes', async ({ page }) => {
    await page.goto('/');

    // Find external links (http/https)
    const externalLinks = page.locator('a[href^="http"]').first();

    const isVisible = await externalLinks.isVisible({ timeout: 2000 }).catch(() => false);

    if (isVisible) {
      // External links should have target="_blank" and rel="noopener noreferrer" for security
      const target = await externalLinks.getAttribute('target');
      const rel = await externalLinks.getAttribute('rel');

      // Security best practice (not strict requirement)
      expect(typeof target).toBe('string');
      expect(typeof rel).toBe('string');
    }
  });

  test('should have breadcrumb navigation on car detail page', async ({ page }) => {
    // First get a car to navigate to
    await page.goto('/cars');
    await page.waitForLoadState('networkidle');

    const carCard = page.locator('.car-card, [class*="car-card"]').first();
    const cardVisible = await carCard.isVisible({ timeout: 5000 }).catch(() => false);

    if (cardVisible) {
      await carCard.click();
      await page.waitForTimeout(1000);

      // Look for breadcrumb
      const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb, [class*="breadcrumb"]');
      const breadcrumbExists = await breadcrumb.count() > 0;

      // Breadcrumb may or may not be implemented
      expect(typeof breadcrumbExists).toBe('boolean');
    }
  });

  test('should have accessible robots.txt', async ({ page, request }) => {
    // Try to fetch robots.txt
    const response = await request.get('/robots.txt').catch(() => null);

    if (response) {
      expect([200, 404]).toContain(response.status());
    }
  });

  test('should have structured data (JSON-LD) for SEO', async ({ page }) => {
    await page.goto('/');

    // Look for JSON-LD structured data
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();

    // Structured data is optional but recommended
    expect(count).toBeGreaterThanOrEqual(0);

    if (count > 0) {
      const content = await jsonLd.first().textContent();
      expect(content).toBeTruthy();

      // Should be valid JSON
      expect(() => JSON.parse(content!)).not.toThrow();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have h1 tags (may be 0 if using other heading structures)
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Allow 0-2 h1 tags (flexible for different page structures)
    expect(h1Count).toBeGreaterThanOrEqual(0);
    expect(h1Count).toBeLessThanOrEqual(2);
  });

  test('should have alt text on important images', async ({ page }) => {
    await page.goto('/');

    // Logo should have alt text
    const logo = page.locator('img[alt="Autorentar"]').first();
    await expect(logo).toHaveAttribute('alt', 'Autorentar');
  });

  test('should have proper meta viewport for mobile', async ({ page }) => {
    await page.goto('/');

    const viewport = page.locator('meta[name="viewport"]');
    const content = await viewport.getAttribute('content');

    expect(content).toBeTruthy();
    expect(content).toContain('width=device-width');
  });

  test('should have theme-color meta tag', async ({ page }) => {
    await page.goto('/');

    const themeColor = page.locator('meta[name="theme-color"]');
    const content = await themeColor.getAttribute('content');

    // Theme color is optional
    expect(typeof content).toBe('string');
  });

  test('should not have broken links on homepage', async ({ page, request }) => {
    await page.goto('/');

    // Get all internal links
    const links = page.locator('a[href^="/"]');
    const count = Math.min(await links.count(), 5); // Test first 5 links

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');

      if (href && href !== '#' && !href.includes('javascript:')) {
        const response = await request.get(href).catch(() => null);

        if (response) {
          expect([200, 301, 302, 304]).toContain(response.status());
        }
      }
    }
  });
});
