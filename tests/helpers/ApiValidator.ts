/**
 * ApiValidator - Helper para verificar respuestas de API durante tests E2E
 *
 * Uso:
 * ```typescript
 * const validator = getApiValidator(page);
 *
 * // Verificar respuesta de API
 * await validator.assertStatus('/api/bookings/123', 200);
 *
 * // Verificar campo en respuesta JSON
 * await validator.assertJsonField('/api/bookings/123', 'status', 'confirmed');
 *
 * // Interceptar y validar request
 * const response = await validator.interceptAndValidate(
 *   '/api/payments',
 *   () => page.click('#pay-button'),
 *   { expectedStatus: 200 }
 * );
 * ```
 */

import { Page, APIResponse, expect } from '@playwright/test'

export interface ApiValidationResult {
  success: boolean
  url: string
  status?: number
  body?: unknown
  error?: string
}

export interface InterceptOptions {
  expectedStatus?: number
  expectedBody?: Record<string, unknown>
  timeout?: number
}

export class ApiValidator {
  private page: Page
  private baseUrl: string

  constructor(page: Page, baseUrl?: string) {
    this.page = page
    this.baseUrl = baseUrl || process.env.NG_APP_SUPABASE_URL || ''
  }

  /**
   * Hace una request GET y valida el status
   */
  async assertStatus(
    endpoint: string,
    expectedStatus: number,
    message?: string
  ): Promise<ApiValidationResult> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const response = await this.page.request.get(url)

    const result: ApiValidationResult = {
      success: response.status() === expectedStatus,
      url,
      status: response.status()
    }

    if (!result.success) {
      result.error = message || `Expected status ${expectedStatus}, got ${response.status()}`
    }

    expect(response.status(), result.error).toBe(expectedStatus)
    return result
  }

  /**
   * Hace una request GET y valida un campo en la respuesta JSON
   */
  async assertJsonField(
    endpoint: string,
    field: string,
    expectedValue: unknown,
    message?: string
  ): Promise<ApiValidationResult> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const response = await this.page.request.get(url)
    let body: Record<string, unknown> | null = null

    try {
      body = await response.json()
    } catch {
      return {
        success: false,
        url,
        status: response.status(),
        error: 'Response is not valid JSON'
      }
    }

    const actualValue = this.getNestedValue(body, field)

    const result: ApiValidationResult = {
      success: actualValue === expectedValue,
      url,
      status: response.status(),
      body
    }

    if (!result.success) {
      result.error = message || `Expected ${field} to be ${expectedValue}, got ${actualValue}`
    }

    expect(actualValue, result.error).toBe(expectedValue)
    return result
  }

  /**
   * Obtiene un valor anidado de un objeto (ej: "data.user.email")
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.')
    let value: unknown = obj

    for (const key of keys) {
      if (value === null || value === undefined) return undefined
      value = (value as Record<string, unknown>)[key]
    }

    return value
  }

  /**
   * Intercepta una request y valida la respuesta
   */
  async interceptAndValidate(
    urlPattern: string | RegExp,
    action: () => Promise<void>,
    options?: InterceptOptions
  ): Promise<ApiValidationResult> {
    const timeout = options?.timeout || 10000

    // Crear promesa para la interceptación
    const responsePromise = this.page.waitForResponse(
      response => {
        const url = response.url()
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern)
        }
        return urlPattern.test(url)
      },
      { timeout }
    )

    // Ejecutar la acción
    await action()

    // Esperar la respuesta
    const response = await responsePromise

    const result: ApiValidationResult = {
      success: true,
      url: response.url(),
      status: response.status()
    }

    // Validar status si se especificó
    if (options?.expectedStatus !== undefined) {
      if (response.status() !== options.expectedStatus) {
        result.success = false
        result.error = `Expected status ${options.expectedStatus}, got ${response.status()}`
      }
      expect(response.status()).toBe(options.expectedStatus)
    }

    // Validar body si se especificó
    if (options?.expectedBody) {
      try {
        const body = await response.json()
        result.body = body

        for (const [key, expectedValue] of Object.entries(options.expectedBody)) {
          const actualValue = this.getNestedValue(body, key)
          if (actualValue !== expectedValue) {
            result.success = false
            result.error = `Expected ${key} to be ${expectedValue}, got ${actualValue}`
            expect(actualValue).toBe(expectedValue)
          }
        }
      } catch {
        result.success = false
        result.error = 'Response is not valid JSON'
      }
    }

    return result
  }

  /**
   * Verifica que una request POST fue exitosa
   */
  async assertPostSuccess(
    endpoint: string,
    body: Record<string, unknown>,
    expectedStatus: number = 200 | 201,
    message?: string
  ): Promise<ApiValidationResult> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    const response = await this.page.request.post(url, { data: body })

    const result: ApiValidationResult = {
      success: response.ok(),
      url,
      status: response.status()
    }

    if (!result.success) {
      try {
        result.body = await response.json()
      } catch {
        // Ignorar
      }
      result.error = message || `POST to ${endpoint} failed with status ${response.status()}`
    }

    expect(response.ok(), result.error).toBe(true)
    return result
  }

  /**
   * Espera hasta que una API devuelva un valor específico
   */
  async waitForApiValue(
    endpoint: string,
    field: string,
    expectedValue: unknown,
    options?: {
      timeout?: number
      interval?: number
      message?: string
    }
  ): Promise<ApiValidationResult> {
    const timeout = options?.timeout || 10000
    const interval = options?.interval || 500
    const startTime = Date.now()
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`

    while (Date.now() - startTime < timeout) {
      try {
        const response = await this.page.request.get(url)
        const body = await response.json()
        const actualValue = this.getNestedValue(body, field)

        if (actualValue === expectedValue) {
          return {
            success: true,
            url,
            status: response.status(),
            body
          }
        }
      } catch {
        // Ignorar errores y seguir intentando
      }

      await this.page.waitForTimeout(interval)
    }

    return {
      success: false,
      url,
      error: options?.message || `Timeout waiting for ${field} to be ${expectedValue}`
    }
  }

  /**
   * Verifica que el Supabase REST API responde correctamente
   */
  async assertSupabaseTableAccess(
    table: string,
    message?: string
  ): Promise<ApiValidationResult> {
    const endpoint = `/rest/v1/${table}?limit=1`
    return this.assertStatus(endpoint, 200, message || `Cannot access Supabase table: ${table}`)
  }

  /**
   * Verifica respuesta de Edge Function
   */
  async assertEdgeFunctionResponse(
    functionName: string,
    body: Record<string, unknown>,
    expectedStatus: number = 200,
    message?: string
  ): Promise<ApiValidationResult> {
    const endpoint = `/functions/v1/${functionName}`
    return this.assertPostSuccess(endpoint, body, expectedStatus, message)
  }

  /**
   * Intercepta errores de red y los reporta
   */
  async monitorNetworkErrors(
    duration: number = 5000
  ): Promise<{ errors: Array<{ url: string; status: number; error?: string }> }> {
    const errors: Array<{ url: string; status: number; error?: string }> = []

    const handler = (response: APIResponse) => {
      if (!response.ok()) {
        errors.push({
          url: response.url(),
          status: response.status()
        })
      }
    }

    this.page.on('response', handler)

    await this.page.waitForTimeout(duration)

    this.page.off('response', handler)

    return { errors }
  }
}

/**
 * Factory function para crear ApiValidator
 */
export function getApiValidator(page: Page, baseUrl?: string): ApiValidator {
  return new ApiValidator(page, baseUrl)
}
