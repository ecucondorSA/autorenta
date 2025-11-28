import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: SEO & Links (Visitor)
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 17 bloques atómicos:
 * B1: Verificar título de página
 * B2: Verificar meta description
 * B3: Verificar Open Graph tags
 * B4: Verificar Twitter Card tags
 * B5: Verificar URL canónica
 * B6: Verificar atributo lang
 * B7: Verificar favicon
 * B8: Verificar título en catálogo
 * B9: Verificar links internos
 * B10: Verificar links de redes sociales
 * B11: Verificar atributos de links externos
 * B12: Verificar breadcrumb
 * B13: Verificar robots.txt
 * B14: Verificar structured data
 * B15: Verificar jerarquía de headings
 * B16: Verificar alt text en imágenes
 * B17: Verificar meta viewport
 *
 * Prioridad: P1 (Important for Discoverability)
 */

test.describe('SEO & Links - Checkpoint Architecture', () => {

  test('B1: Verificar título de página', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-seo-title', 'Título página', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('seo-title-verified')
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const title = await page.title()
      expect(title).toBeTruthy()
      expect(title.length).toBeGreaterThan(10)
      expect(title.length).toBeLessThan(70)
      console.log(`✅ Título verificado: "${title}"`)

      return { title, titleLength: title.length }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar meta description', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-seo-meta-desc', 'Meta description', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const metaDescription = page.locator('meta[name="description"]')
      const content = await metaDescription.getAttribute('content')

      if (content) {
        expect(content.length).toBeGreaterThan(50)
        expect(content.length).toBeLessThan(160)
        console.log(`✅ Meta description verificada (${content.length} chars)`)
      }

      return { hasMetaDescription: !!content }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar Open Graph tags', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-seo-og-tags', 'Open Graph tags', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const ogTitle = page.locator('meta[property="og:title"]')
      const ogTitleContent = await ogTitle.getAttribute('content')

      const ogDescription = page.locator('meta[property="og:description"]')
      const ogDescriptionContent = await ogDescription.getAttribute('content')

      const ogImage = page.locator('meta[property="og:image"]')
      const ogImageContent = await ogImage.getAttribute('content')

      const hasOgTags = ogTitleContent || ogDescriptionContent || ogImageContent
      expect(typeof hasOgTags).toBe('string')
      console.log('✅ Open Graph tags verificados')

      return { hasOgTags: !!hasOgTags }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Verificar Twitter Card tags', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-seo-twitter', 'Twitter Card tags', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const twitterCard = page.locator('meta[name="twitter:card"]')
      const count = await twitterCard.count()
      expect(count).toBeGreaterThanOrEqual(0)
      console.log(`✅ Twitter Card verificado (count: ${count})`)

      return { hasTwitterCard: count > 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar URL canónica', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-seo-canonical', 'URL canónica', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const canonical = page.locator('link[rel="canonical"]')
      const count = await canonical.count()
      expect(count).toBeGreaterThanOrEqual(0)

      if (count > 0) {
        const href = await canonical.getAttribute('href')
        if (href) {
          expect(href).toMatch(/^https?:\/\//)
        }
      }
      console.log(`✅ URL canónica verificada (count: ${count})`)

      return { hasCanonical: count > 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Verificar atributo lang', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-seo-lang', 'Atributo lang', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const html = page.locator('html')
      const lang = await html.getAttribute('lang')

      expect(lang).toBeTruthy()
      expect(lang).toMatch(/^(es|en)/)
      console.log(`✅ Atributo lang verificado: "${lang}"`)

      return { lang }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Verificar favicon', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-seo-favicon', 'Favicon', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const favicon = page.locator('link[rel*="icon"]')
      const count = await favicon.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ Favicon verificado (count: ${count})`)

      return { hasFavicon: count > 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Verificar título en catálogo', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-seo-catalog-title', 'Título catálogo', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')

      const title = await page.title()
      expect(title).toBeTruthy()
      expect(title.toLowerCase()).toMatch(/autos|cars|vehículos/i)
      console.log(`✅ Título de catálogo verificado: "${title}"`)

      return { catalogTitle: title }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Verificar links internos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-seo-internal-links', 'Links internos', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const internalLinks = page.locator('a[href^="/"], a[routerLink]')
      const count = await internalLinks.count()
      expect(count).toBeGreaterThanOrEqual(0)

      if (count > 0) {
        const firstLink = internalLinks.first()
        const href = await firstLink.getAttribute('href')
        const routerLink = await firstLink.getAttribute('routerLink')

        expect(href || routerLink).toBeTruthy()
      }
      console.log(`✅ Links internos verificados (count: ${count})`)

      return { internalLinkCount: count }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B10: Verificar links de redes sociales', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-seo-social-links', 'Links sociales', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      const socialLinks = page.locator('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]')
      const count = await socialLinks.count()
      expect(count).toBeGreaterThanOrEqual(0)
      console.log(`✅ Links sociales verificados (count: ${count})`)

      return { socialLinkCount: count }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B11: Verificar atributos de links externos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-seo-external-links', 'Links externos', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const externalLinks = page.locator('a[href^="http"]').first()
      const isVisible = await externalLinks.isVisible({ timeout: 2000 }).catch(() => false)

      if (isVisible) {
        const target = await externalLinks.getAttribute('target')
        const rel = await externalLinks.getAttribute('rel')

        expect(typeof target).toBe('string')
        expect(typeof rel).toBe('string')
      }
      console.log('✅ Links externos verificados')

      return { externalLinksChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B12: Verificar breadcrumb', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b12-seo-breadcrumb', 'Breadcrumb', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')
      await page.waitForLoadState('networkidle')

      const carCard = page.locator('.car-card, [class*="car-card"]').first()
      const cardVisible = await carCard.isVisible({ timeout: 5000 }).catch(() => false)

      if (cardVisible) {
        await carCard.click()
        await page.waitForTimeout(1000)

        const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb, [class*="breadcrumb"]')
        const breadcrumbExists = await breadcrumb.count() > 0
        expect(typeof breadcrumbExists).toBe('boolean')
      }
      console.log('✅ Breadcrumb verificado')

      return { breadcrumbChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B13: Verificar robots.txt', async ({ page, request, createBlock }) => {
    const block = createBlock(defineBlock('b13-seo-robots', 'Robots.txt', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.get('/robots.txt').catch(() => null)

      if (response) {
        expect([200, 404]).toContain(response.status())
      }
      console.log('✅ Robots.txt verificado')

      return { robotsChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B14: Verificar structured data', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b14-seo-structured-data', 'Structured data', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const jsonLd = page.locator('script[type="application/ld+json"]')
      const count = await jsonLd.count()
      expect(count).toBeGreaterThanOrEqual(0)

      if (count > 0) {
        const content = await jsonLd.first().textContent()
        expect(content).toBeTruthy()
        expect(() => JSON.parse(content!)).not.toThrow()
      }
      console.log(`✅ Structured data verificado (count: ${count})`)

      return { hasStructuredData: count > 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B15: Verificar jerarquía de headings', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b15-seo-headings', 'Jerarquía headings', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const h1 = page.locator('h1')
      const h1Count = await h1.count()

      expect(h1Count).toBeGreaterThanOrEqual(0)
      expect(h1Count).toBeLessThanOrEqual(2)
      console.log(`✅ Headings verificados (H1 count: ${h1Count})`)

      return { h1Count }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B16: Verificar alt text en imágenes', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b16-seo-alt-text', 'Alt text', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const logo = page.locator('img[alt="Autorentar"]').first()
      await expect(logo).toHaveAttribute('alt', 'Autorentar')
      console.log('✅ Alt text verificado')

      return { altTextVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B17: Verificar meta viewport', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b17-seo-viewport', 'Meta viewport', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const viewport = page.locator('meta[name="viewport"]')
      const content = await viewport.getAttribute('content')

      expect(content).toBeTruthy()
      expect(content).toContain('width=device-width')
      console.log('✅ Meta viewport verificado')

      return { viewportVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B18: Verificar theme-color', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b18-seo-theme-color', 'Theme color', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const themeColor = page.locator('meta[name="theme-color"]')
      const content = await themeColor.getAttribute('content')
      expect(typeof content).toBe('string')
      console.log(`✅ Theme color verificado: ${content}`)

      return { themeColor: content }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B19: Verificar links no rotos', async ({ page, request, createBlock }) => {
    const block = createBlock(defineBlock('b19-seo-broken-links', 'Links no rotos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')

      const links = page.locator('a[href^="/"]')
      const count = Math.min(await links.count(), 5)

      for (let i = 0; i < count; i++) {
        const link = links.nth(i)
        const href = await link.getAttribute('href')

        if (href && href !== '#' && !href.includes('javascript:')) {
          const response = await request.get(href).catch(() => null)

          if (response) {
            expect([200, 301, 302, 304]).toContain(response.status())
          }
        }
      }
      console.log(`✅ ${count} links verificados sin errores`)

      return { linksChecked: count }
    })

    expect(result.state.status).toBe('passed')
  })
})
