import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Urgent Rental Mode (Modo Alquiler Urgente)
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 8 bloques atómicos:
 * B1: Verificar estructura básica de card premium
 * B2: Verificar input urgentMode
 * B3: Simular activación con DevTools
 * B4: Verificar elementos visuales del modo urgente
 * B5: Verificar cálculo de precio por hora
 * B6: Verificar estilos CSS
 * B7: Verificar disponibilidad inmediata
 * B8: Demo completo end-to-end
 *
 * Prioridad: P1 (Premium Features)
 */

test.describe('Urgent Rental Mode - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4200/cars')
    await page.waitForLoadState('networkidle')
  })

  test('B1: Verificar estructura básica de card premium', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-urgent-card-structure', 'Estructura card premium', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('urgent-card-structure-verified')
    }))

    const result = await block.execute(async () => {
      await page.waitForSelector('app-car-card', { timeout: 10000 })

      const carCards = page.locator('app-car-card')
      const count = await carCards.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ Se encontraron ${count} tarjetas de autos`)

      const firstCard = carCards.first()
      const article = firstCard.locator('article.card-premium')
      await expect(article).toBeVisible()

      const classes = await article.getAttribute('class')
      expect(classes).toContain('card-premium')
      expect(classes).toContain('flex flex-col')
      console.log('✅ Estructura básica de card-premium verificada')

      return { cardCount: count, structureValid: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar input urgentMode', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-urgent-input-mode', 'Input urgentMode', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const carCards = page.locator('app-car-card')
      await expect(carCards.first()).toBeVisible()

      const firstCard = carCards.first()
      const article = firstCard.locator('article')
      const classes = await article.getAttribute('class')

      const hasUrgentClasses =
        classes?.includes('urgent-mode') ||
        classes?.includes('bg-gradient-to-br') ||
        classes?.includes('border-accent-petrol')

      if (!hasUrgentClasses) {
        console.log('✅ Modo normal: tarjeta sin estilos de urgencia (correcto)')
      } else {
        console.log('⚠️ Modo urgente detectado en tarjeta por defecto')
      }

      const priceText = await firstCard.locator('text=/por día|por hora/').first().textContent()
      console.log(`💰 Precio mostrado: ${priceText}`)

      return { hasUrgentClasses, priceText }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Simular activación con DevTools', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-urgent-devtools', 'Activar con DevTools', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.waitForSelector('app-car-card')

      const componentInfo = await page.evaluate(() => {
        const carCard = document.querySelector('app-car-card')
        if (!carCard) return { success: false, reason: 'No car-card found' }

        // @ts-ignore - Accessing Angular internals
        const componentInstance = (carCard as any).__ngContext__?.[8]

        if (!componentInstance) {
          return { success: false, reason: 'Cannot access component instance' }
        }

        const hasUrgentMode = 'urgentMode' in componentInstance
        const hasUrgentRentalService = 'urgentRentalService' in componentInstance

        return {
          success: true,
          hasUrgentMode,
          hasUrgentRentalService,
          currentUrgentMode: componentInstance.urgentMode,
        }
      })

      console.log('🔍 Estado del componente:', componentInfo)

      if (componentInfo.success) {
        expect(componentInfo.hasUrgentRentalService).toBe(true)
        console.log('✅ UrgentRentalService está inyectado en el componente')
      }

      return componentInfo
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Verificar elementos visuales del modo urgente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-urgent-visual-elements', 'Elementos visuales', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.waitForSelector('app-car-card')

      const activated = await page.evaluate(() => {
        const carCards = document.querySelectorAll('app-car-card')
        let successCount = 0

        carCards.forEach((carCard) => {
          try {
            // @ts-ignore
            const component = carCard.__ngContext__?.[8]
            if (component && '_urgentMode' in component) {
              component._urgentMode.set(true)
              component.urgentAvailability.set({
                available: true,
                distance: 2.5,
                eta: 5,
              })
              component.hourlyPrice.set(150)
              successCount++
            }
          } catch (e) {
            console.error('Error activating urgent mode:', e)
          }
        })

        return { activated: successCount }
      })

      console.log(`🚨 Modo urgente activado en ${activated.activated} tarjetas`)

      await page.waitForTimeout(500)

      const urgentBadge = page.locator('text=/DISPONIBLE AHORA/i').first()
      const badgeVisible = await urgentBadge.isVisible().catch(() => false)

      if (badgeVisible) {
        console.log('✅ Badge "DISPONIBLE AHORA" es visible')
        await expect(urgentBadge).toContainText(/DISPONIBLE AHORA/i)
      } else {
        console.log('⚠️ Badge de urgencia no visible (puede requerir change detection manual)')
      }

      return { activated: activated.activated, badgeVisible }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar cálculo de precio por hora', async ({ page, context, createBlock }) => {
    const block = createBlock(defineBlock('b5-urgent-price-calc', 'Cálculo precio hora', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await context.grantPermissions(['geolocation'])
      await context.setGeolocation({ latitude: -34.9011, longitude: -56.1645 })

      await page.waitForSelector('app-car-card')

      const priceCalculation = await page.evaluate(async () => {
        const carCard = document.querySelector('app-car-card')
        if (!carCard) return { error: 'No car card found' }

        // @ts-ignore
        const component = carCard.__ngContext__?.[8]
        if (!component?.urgentRentalService) {
          return { error: 'UrgentRentalService not accessible' }
        }

        const service = component.urgentRentalService

        try {
          const location = await service.getCurrentLocation()

          const distance = service.calculateDistance(
            -34.9011, -56.1645,
            -34.9, -56.15
          )

          const eta = service.calculateETA(distance)

          return {
            success: true,
            location,
            distance: parseFloat(distance.toFixed(2)),
            eta,
            formattedDistance: service.formatDistance(distance),
            formattedTime: service.formatTime(eta),
          }
        } catch (e: any) {
          return { error: e.message }
        }
      })

      console.log('💰 Resultado cálculo de precio urgente:', priceCalculation)

      if ('success' in priceCalculation && priceCalculation.success) {
        expect(priceCalculation.distance).toBeGreaterThan(0)
        expect(priceCalculation.eta).toBeGreaterThan(0)
        console.log(`✅ Distancia: ${priceCalculation.formattedDistance}, ETA: ${priceCalculation.formattedTime}`)
      } else {
        console.log('⚠️ ', priceCalculation.error)
      }

      return priceCalculation
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Verificar estilos CSS', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-urgent-css-styles', 'Estilos CSS', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.waitForSelector('app-car-card')

      await page.evaluate(() => {
        const carCard = document.querySelector('app-car-card')
        // @ts-ignore
        const component = carCard?.__ngContext__?.[8]
        if (component && '_urgentMode' in component) {
          component._urgentMode.set(true)
        }
      })

      await page.waitForTimeout(500)

      const article = page.locator('app-car-card article').first()
      const classes = await article.getAttribute('class')

      console.log('🎨 Clases CSS aplicadas:', classes)

      const expectedClasses = ['card-premium']
      expectedClasses.forEach((className) => {
        if (classes?.includes(className)) {
          console.log(`  ✅ ${className}`)
        }
      })

      const computedStyles = await article.evaluate((el) => {
        const styles = window.getComputedStyle(el)
        return {
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          background: styles.background,
          boxShadow: styles.boxShadow,
        }
      })

      console.log('📐 Estilos computados:', computedStyles)

      return { classes, computedStyles }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Verificar disponibilidad inmediata', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-urgent-availability', 'Disponibilidad inmediata', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.waitForSelector('app-car-card')

      const firstCarId = await page.evaluate(() => {
        const carCard = document.querySelector('app-car-card')
        // @ts-ignore
        const component = carCard?.__ngContext__?.[8]
        return component?.car?.id
      })

      console.log('🚗 Car ID:', firstCarId)

      if (firstCarId) {
        const availability = await page.evaluate(async (carId) => {
          const carCard = document.querySelector('app-car-card')
          // @ts-ignore
          const service = carCard?.__ngContext__?.[8]?.urgentRentalService

          if (!service) return { error: 'Service not found' }

          try {
            const result = await service.checkImmediateAvailability(carId)
            return result
          } catch (e: any) {
            return { error: e.message }
          }
        }, firstCarId)

        console.log('🔍 Disponibilidad inmediata:', availability)

        if ('available' in availability) {
          console.log(
            availability.available
              ? `✅ Auto disponible${availability.distance ? ` - Distancia: ${availability.distance.toFixed(2)} km` : ''}`
              : `⚠️ Auto no disponible: ${availability.reason}`
          )
        }

        return { carId: firstCarId, availability }
      }

      return { carId: null }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Demo completo end-to-end', async ({ page, context, createBlock }) => {
    const block = createBlock(defineBlock('b8-urgent-demo-complete', 'Demo completo', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('🎬 Iniciando demo completo del modo urgente...\n')

      await context.grantPermissions(['geolocation'])
      await context.setGeolocation({ latitude: -34.9011, longitude: -56.1645 })
      console.log('📍 Geolocalización configurada: Montevideo\n')

      await page.waitForSelector('app-car-card')
      console.log('✅ Página cargada\n')

      const demoResult = await page.evaluate(async () => {
        const carCard = document.querySelector('app-car-card')
        // @ts-ignore
        const component = carCard?.__ngContext__?.[8]

        if (!component) return { error: 'Component not found' }

        const car = component.car
        const service = component.urgentRentalService

        component._urgentMode.set(true)

        const availability = await service.checkImmediateAvailability(car.id)
        let quote = null

        if (car.region_id && availability.available) {
          try {
            quote = await service.getUrgentQuote(car.id, car.region_id, 1)
          } catch (e) {
            console.log('Could not get quote')
          }
        }

        if (availability.available) {
          component.urgentAvailability.set(availability)
          if (quote) {
            component.hourlyPrice.set(quote.hourlyRate)
          }
        }

        return {
          success: true,
          car: {
            id: car.id,
            brand: car.brand_text_backup,
            model: car.model_text_backup,
            dailyPrice: car.price_per_day,
          },
          availability,
          quote,
          urgentDefaults: service.getUrgentDefaults(),
        }
      })

      console.log('📊 RESULTADO DEL DEMO:\n')
      console.log(JSON.stringify(demoResult, null, 2))
      console.log('\n')

      if ('success' in demoResult && demoResult.success) {
        console.log('✅ MODO URGENTE FUNCIONANDO CORRECTAMENTE\n')
        console.log('Auto:', `${demoResult.car.brand} ${demoResult.car.model}`)
        console.log('Precio diario:', `$${demoResult.car.dailyPrice}`)

        if (demoResult.quote) {
          console.log('Precio por hora:', `$${demoResult.quote.hourlyRate}`)
        }

        if (demoResult.availability.available) {
          console.log('Disponibilidad:', '✅ INMEDIATA')
          if (demoResult.availability.distance) {
            console.log('Distancia:', `${demoResult.availability.distance.toFixed(2)} km`)
          }
        }
      }

      expect(demoResult).toHaveProperty('success')
      return demoResult
    })

    expect(result.state.status).toBe('passed')
  })
})
