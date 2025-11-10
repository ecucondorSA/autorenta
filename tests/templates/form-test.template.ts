import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * TEMPLATE: Form Test
 *
 * Use este template para tests de formularios que verifican:
 * - Validaciones de campos
 * - Submit del formulario
 * - Mensajes de error
 * - Estados habilitado/deshabilitado
 *
 * INSTRUCCIONES:
 * 1. Copiar este archivo a tu carpeta de tests
 * 2. Renombrar según el formulario (ej: registration-form.spec.ts)
 * 3. Definir interface FormData con los campos del formulario
 * 4. Reemplazar [PLACEHOLDERS]
 */

// Definir estructura de datos del formulario
interface FormData {
  // TODO: Agregar campos del formulario
  // Ejemplo:
  // email: string;
  // password: string;
  // fullName: string;
}

test.describe('[FORM_NAME] Form Tests', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Navegar a la página con el formulario
    await page.goto('[FORM_PAGE_URL]'); // Ej: '/auth/register', '/profile/edit'

    // Esperar a que el formulario sea visible
    const form: Locator = page.locator('form, [FORM_SELECTOR]');
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test('should display all form fields', async ({ page }: { page: Page }) => {
    // Verificar campo 1
    const field1: Locator = page.locator('#[FIELD_1_ID]');
    await expect(field1).toBeVisible();

    // Verificar campo 2
    const field2: Locator = page.locator('#[FIELD_2_ID]');
    await expect(field2).toBeVisible();

    // Verificar botón de submit
    const submitButton: Locator = page.getByRole('button', { name: /[SUBMIT_TEXT]/i });
    await expect(submitButton).toBeVisible();
  });

  test('should validate required fields', async ({ page }: { page: Page }) => {
    // Intentar hacer blur sin llenar campo requerido
    const requiredField: Locator = page.locator('#[REQUIRED_FIELD_ID]');
    await requiredField.click();

    // Hacer blur clickeando otro campo
    const otherField: Locator = page.locator('#[OTHER_FIELD_ID]');
    await otherField.click();

    // Verificar que aparece mensaje de error
    const errorMessage: Locator = page.locator('#[FIELD_ID]-error');
    await expect(errorMessage).toBeVisible({ timeout: 2000 });
    await expect(errorMessage).toContainText(/[ERROR_TEXT]/i); // Ej: "requerido", "obligatorio"
  });

  test('should validate field format', async ({ page }: { page: Page }) => {
    // Llenar campo con formato inválido
    const field: Locator = page.locator('#[FIELD_ID]');
    await field.fill('[INVALID_VALUE]'); // Ej: "invalid-email" para campo email

    // Blur para activar validación
    await page.locator('#[OTHER_FIELD_ID]').click();

    // Verificar mensaje de error de formato
    const errorMessage: Locator = page.locator('#[FIELD_ID]-error');
    await expect(errorMessage).toContainText(/[FORMAT_ERROR_TEXT]/i); // Ej: "formato inválido"
  });

  test('should successfully submit valid form', async ({ page }: { page: Page }) => {
    // Definir datos válidos del formulario
    const validData: FormData = {
      // TODO: Llenar con datos válidos
      // Ejemplo:
      // email: 'test@example.com',
      // password: 'SecurePass123!',
      // fullName: 'Test User',
    };

    // Llenar todos los campos
    // TODO: Agregar todos los campos del formulario
    // Ejemplo:
    // await page.locator('#email').fill(validData.email);
    // await page.locator('#password').fill(validData.password);

    // Verificar que no hay errores de validación
    const errors: Locator = page.locator('[class*="error"]');
    const errorCount: number = await errors.count();
    expect(errorCount).toBe(0);

    // Verificar que el botón está habilitado
    const submitButton: Locator = page.getByRole('button', { name: /[SUBMIT_TEXT]/i });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });

    // Submit
    await submitButton.click();

    // Verificar redirección o mensaje de éxito
    // Opción 1: Redirección
    await page.waitForURL(/[SUCCESS_URL_PATTERN]/, { timeout: 10000 });

    // Opción 2: Mensaje de éxito en la misma página
    // const successMessage: Locator = page.locator('[SUCCESS_MESSAGE_SELECTOR]');
    // await expect(successMessage).toBeVisible({ timeout: 10000 });
  });

  test('should disable submit button when form is invalid', async ({ page }: { page: Page }) => {
    // Dejar campos vacíos o con valores inválidos
    const submitButton: Locator = page.getByRole('button', { name: /[SUBMIT_TEXT]/i });

    // Verificar que está deshabilitado inicialmente
    const isDisabled: boolean = !(await submitButton.isEnabled().catch(() => false));
    expect(isDisabled).toBe(true);

    // Llenar un campo pero dejar otros inválidos
    await page.locator('#[FIELD_1_ID]').fill('[VALID_VALUE]');

    // Botón debe seguir deshabilitado
    await expect(submitButton).toBeDisabled({ timeout: 2000 });
  });

  test('should show password strength indicator', async ({ page }: { page: Page }) => {
    // Este test es opcional, solo si el formulario tiene campo de password
    test.skip(!page.url().includes('password'), 'No password field in this form');

    const passwordField: Locator = page.locator('#[PASSWORD_FIELD_ID]');
    const strengthIndicator: Locator = page.locator('[PASSWORD_STRENGTH_SELECTOR]');

    // Password débil
    await passwordField.fill('weak');
    await expect(strengthIndicator).toContainText(/débil|weak/i);

    // Password fuerte
    await passwordField.fill('StrongPassword123!@#');
    await expect(strengthIndicator).toContainText(/fuerte|strong/i);
  });

  test('should clear form when reset button is clicked', async ({ page }: { page: Page }) => {
    // Este test es opcional, solo si hay botón de reset
    const resetButton: Locator = page.getByRole('button', { name: /limpiar|reset|cancelar/i });
    const resetExists: boolean = await resetButton.count() > 0;

    if (!resetExists) {
      test.skip();
    }

    // Llenar campos
    await page.locator('#[FIELD_1_ID]').fill('[VALUE_1]');
    await page.locator('#[FIELD_2_ID]').fill('[VALUE_2]');

    // Click en reset
    await resetButton.click();

    // Verificar que los campos están vacíos
    const field1Value: string = await page.locator('#[FIELD_1_ID]').inputValue();
    const field2Value: string = await page.locator('#[FIELD_2_ID]').inputValue();

    expect(field1Value).toBe('');
    expect(field2Value).toBe('');
  });
});
