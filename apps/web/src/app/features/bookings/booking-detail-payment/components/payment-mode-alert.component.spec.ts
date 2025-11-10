import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RiskSnapshot, FxSnapshot } from '../../../../core/models/booking-detail-payment.model';
import { PaymentModeAlertComponent } from './payment-mode-alert.component';

describe('PaymentModeAlertComponent - Escenario 3: Cambio de método', () => {
  let component: PaymentModeAlertComponent;
  let fixture: ComponentFixture<PaymentModeAlertComponent>;

  const mockRiskSnapshot: RiskSnapshot = {
    deductibleUsd: 500,
    rolloverDeductibleUsd: 1000,
    holdEstimatedArs: 300000,
    holdEstimatedUsd: 300,
    creditSecurityUsd: 300,
    bucket: 'standard',
    vehicleValueUsd: 15000,
    country: 'AR',
    fxRate: 1000,
    calculatedAt: new Date(),
    coverageUpgrade: 'standard',
  };

  const mockFxSnapshot: FxSnapshot = {
    rate: 1000,
    timestamp: new Date(),
    fromCurrency: 'USD',
    toCurrency: 'ARS',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isExpired: false,
    variationThreshold: 0.1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentModeAlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentModeAlertComponent);
    component = fixture.componentInstance;
    component.riskSnapshot = mockRiskSnapshot;
    component.fxSnapshot = mockFxSnapshot;
  });

  describe('Alerta para método "Con tarjeta"', () => {
    beforeEach(() => {
      component.paymentMode = 'card';
      fixture.detectChanges();
    });

    it('debería mostrar alerta azul con borde azul', () => {
      // Assert
      const alert = fixture.nativeElement.querySelector('.bg-cta-default/10');
      expect(alert).toBeTruthy();
      expect(alert.className).toContain('border-l-4');
      expect(alert.className).toContain('border-cta-default');
    });

    it('debería mostrar el monto del hold en ARS', () => {
      // Assert
      const alert = fixture.nativeElement;
      expect(alert.textContent).toContain('$ 300.000'); // Intl format adds space
      expect(alert.textContent).toContain('en tu tarjeta');
    });

    it('debería mostrar badge "Reembolsable"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Reembolsable');

      // Verificar que existe el badge con estilos correctos
      const badge = fixture.nativeElement.querySelector('.bg-cta-default/20');
      expect(badge).toBeTruthy();
    });

    it('debería mostrar badge "Liberación automática"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Liberación automática');
    });

    it('debería tener animación de slide-down', () => {
      // Assert
      const alert = fixture.nativeElement.querySelector('[class*="animate-slide-down"]');
      expect(alert).toBeTruthy();
    });

    it('debería mostrar texto explicativo del hold', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('se libera automáticamente');
    });
  });

  describe('Alerta para método "Con wallet"', () => {
    beforeEach(() => {
      component.paymentMode = 'wallet';
      fixture.detectChanges();
    });

    it('debería mostrar alerta morada con borde morado', () => {
      // Assert
      const alert = fixture.nativeElement.querySelector('.bg-purple-50');
      expect(alert).toBeTruthy();
      expect(alert.className).toContain('border-l-4');
      expect(alert.className).toContain('border-purple-500');
    });

    it('debería mostrar el monto del crédito en ARS convertido desde USD', () => {
      // Assert
      const alert = fixture.nativeElement;
      // 300 USD * 1000 rate = 300,000 ARS
      expect(alert.textContent).toContain('$ 300.000'); // Intl format adds space
      expect(alert.textContent).toContain('de tu wallet');
    });

    it('debería mostrar badge "No reembolsable"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No reembolsable');

      // Verificar que existe el badge con estilos correctos
      const badge = fixture.nativeElement.querySelector('.bg-yellow-100');
      expect(badge).toBeTruthy();
    });

    it('debería mostrar badge "Reutilizable"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Reutilizable');

      // Verificar que existe el badge con estilos correctos
      const badge = fixture.nativeElement.querySelector('.bg-purple-100');
      expect(badge).toBeTruthy();
    });

    it('debería mostrar texto explicativo del crédito wallet', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('NO es reembolsable');
      expect(text).toContain('disponible para futuras reservas');
    });
  });

  describe('Cambio dinámico de método (Escenario 3)', () => {
    it('debería actualizar la alerta cuando cambia de "card" a "wallet"', () => {
      // Arrange - Iniciar con tarjeta
      component.paymentMode = 'card';
      fixture.detectChanges();
      let alert = fixture.nativeElement.querySelector('.bg-cta-default/10');
      expect(alert).toBeTruthy();

      // Act - Cambiar a wallet
      component.paymentMode = 'wallet';
      fixture.detectChanges();

      // Assert - Verificar cambio a alerta morada
      alert = fixture.nativeElement.querySelector('.bg-purple-50');
      expect(alert).toBeTruthy();
      const blueAlert = fixture.nativeElement.querySelector('.bg-cta-default/10');
      expect(blueAlert).toBeFalsy();
    });

    it('debería actualizar badges cuando cambia de método', () => {
      // Arrange - Iniciar con tarjeta
      component.paymentMode = 'card';
      fixture.detectChanges();
      let text = fixture.nativeElement.textContent;
      expect(text).toContain('Reembolsable');

      // Act - Cambiar a wallet
      component.paymentMode = 'wallet';
      fixture.detectChanges();

      // Assert - Verificar nuevos badges
      text = fixture.nativeElement.textContent;
      expect(text).toContain('No reembolsable');
      expect(text).toContain('Reutilizable');
    });
  });

  describe('Cálculo de montos en ARS', () => {
    it('debería calcular hold en ARS desde USD usando fxSnapshot', () => {
      // Arrange
      component.paymentMode = 'card';
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 350000,
        holdEstimatedUsd: 350,
      };
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 1000,
      };

      // Act
      fixture.detectChanges();

      // Assert
      expect(fixture.nativeElement.textContent).toContain('$ 350.000'); // Intl format adds space
    });

    it('debería calcular crédito wallet en ARS desde USD usando fxSnapshot', () => {
      // Arrange
      component.paymentMode = 'wallet';
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        creditSecurityUsd: 400,
      };
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 1000,
      };

      // Act
      fixture.detectChanges();

      // Assert
      // 400 USD * 1000 rate = 400,000 ARS
      expect(fixture.nativeElement.textContent).toContain('$ 400.000'); // Intl format adds space
    });
  });

  describe('Edge cases', () => {
    it('debería manejar tasas de cambio altas', () => {
      // Arrange
      component.paymentMode = 'wallet';
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 5000, // Tasa muy alta
      };

      // Act
      fixture.detectChanges();

      // Assert - 300 USD * 5000 = 1,500,000 ARS
      expect(fixture.nativeElement.textContent).toContain('$ 1.500.000'); // Intl format adds space
    });

    it('debería manejar montos decimales correctamente', () => {
      // Arrange
      component.paymentMode = 'card';
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 325750,
      };

      // Act
      fixture.detectChanges();

      // Assert - Formato ARS con separador de miles
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$ 325.750'); // Intl format adds space
    });
  });
});
