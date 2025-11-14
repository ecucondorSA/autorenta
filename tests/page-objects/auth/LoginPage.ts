/**
 * LoginPage - Page Object para la página de login
 *
 * Maneja todo lo relacionado con autenticación:
 * - Login con email/password
 * - Validación de errores
 * - Navegación post-login
 */

import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  // Selectores
  private readonly emailInput = this.page.locator('input[name="email"], input[type="email"]');
  private readonly passwordInput = this.page.locator('input[name="password"], input[type="password"]');
  private readonly submitButton = this.page.locator('button[type="submit"], ion-button[type="submit"]');
  private readonly errorMessage = this.page.locator('.error-message, ion-note.error, [role="alert"]');
  private readonly registerLink = this.page.locator('a[href*="/register"], ion-button:has-text("Registrarse")');

  constructor(page: Page) {
    super(page, '/auth/login');
  }

  /**
   * Realiza login con credenciales
   */
  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillAndWait(this.emailInput, email);
    await this.fillAndWait(this.passwordInput, password);
    await this.submitButton.click();

    // Esperar a que el login complete (redirección o error)
    await Promise.race([
      this.page.waitForURL(/\/(cars|dashboard|inicio|profile)/, { timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
    ]).catch(() => {
      // Si ninguna condición se cumple, continuar
    });
  }

  /**
   * Login rápido sin validaciones (para tests que requieren auth)
   */
  async quickLogin(email: string, password: string): Promise<void> {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Verifica si hay errores de login
   */
  async hasLoginError(): Promise<boolean> {
    return await this.isElementVisible(this.errorMessage, 3000);
  }

  /**
   * Obtiene el mensaje de error
   */
  async getErrorMessage(): Promise<string> {
    if (await this.hasLoginError()) {
      return await this.errorMessage.textContent() || '';
    }
    return '';
  }

  /**
   * Navega a la página de registro
   */
  async goToRegister(): Promise<void> {
    await this.clickAndWait(this.registerLink);
  }

  /**
   * Verifica si el login fue exitoso
   */
  async isLoginSuccessful(): Promise<boolean> {
    // Verificar si fuimos redirigidos fuera de la página de login
    const currentUrl = this.page.url();
    return !currentUrl.includes('/auth/login') && !currentUrl.includes('/login');
  }

  /**
   * Llena solo el campo de email
   */
  async fillEmail(email: string): Promise<void> {
    await this.fillAndWait(this.emailInput, email);
  }

  /**
   * Llena solo el campo de contraseña
   */
  async fillPassword(password: string): Promise<void> {
    await this.fillAndWait(this.passwordInput, password);
  }

  /**
   * Click en el botón de submit
   */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Verifica si los campos de login están presentes
   */
  async isLoginFormVisible(): Promise<boolean> {
    const emailVisible = await this.isElementVisible(this.emailInput, 2000);
    const passwordVisible = await this.isElementVisible(this.passwordInput, 2000);
    const submitVisible = await this.isElementVisible(this.submitButton, 2000);

    return emailVisible && passwordVisible && submitVisible;
  }

  /**
   * Limpia los campos del formulario
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }
}