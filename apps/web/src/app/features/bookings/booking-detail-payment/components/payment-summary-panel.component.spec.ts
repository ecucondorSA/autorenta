import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PriceBreakdown,
  RiskSnapshot,
  FxSnapshot,
} from '../../../../core/models/booking-detail-payment.model';
import { PaymentSummaryPanelComponent } from './payment-summary-panel.component';

describe('PaymentSummaryPanelComponent - Escenario 1 & 2', () => {
  let component: PaymentSummaryPanelComponent;
  let fixture: ComponentFixture<PaymentSummaryPanelComponent>;

  const mockPriceBreakdown: PriceBreakdown = {
    dailyRateUsd: 50,
    totalDays: 3,
    subtotalUsd: 150,
    platformFeeUsd: 15,
    insuranceFeeUsd: 10,
    fgoContributionUsd: 5,
    coverageUpgradeUsd: 20,
    totalUsd: 200,
    totalArs: 200000, // 200 USD * 1000 rate
    fxRate: 1000,
  };

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
      imports: [PaymentSummaryPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentSummaryPanelComponent);
    component = fixture.componentInstance;
    component.priceBreakdown = mockPriceBreakdown;
    component.riskSnapshot = mockRiskSnapshot;
    component.fxSnapshot = mockFxSnapshot;
  });

  describe('Header y botón comparativo', () => {
    it('debería mostrar título "Resumen de Pagos"', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const title = fixture.nativeElement.querySelector('h3');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('Resumen de Pagos');
    });

    it('debería mostrar botón "¿Cuál método conviene?"', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('¿Cuál método conviene?');
    });

    it('debería emitir evento compareMethodsClick cuando se hace click en el botón', () => {
      // Arrange
      spyOn(component.compareMethodsClick, 'emit');
      fixture.detectChanges();

      // Act
      const button = fixture.nativeElement.querySelector('button');
      button.click();

      // Assert
      expect(component.compareMethodsClick.emit).toHaveBeenCalled();
    });
  });

  describe('Sección: Total del Alquiler', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería mostrar monto principal en ARS grande y destacado', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$200.000');

      // Verificar que existe elemento con clase text-3xl
      const amountElement = fixture.nativeElement.querySelector('.text-3xl.font-bold');
      expect(amountElement).toBeTruthy();
    });

    it('debería mostrar monto en USD como referencia secundaria', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('US$ 200');
      expect(text).toContain('≈');
    });

    it('debería indicar "Se cobra inmediatamente"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Se cobra inmediatamente');
    });
  });

  describe('Escenario 1: Garantía con tarjeta', () => {
    beforeEach(() => {
      component.paymentMode = 'card';
      fixture.detectChanges();
    });

    it('debería mostrar sección de garantía con fondo azul', () => {
      // Assert
      const guaranteeSection = fixture.nativeElement.querySelector('.bg-sky-50');
      expect(guaranteeSection).toBeTruthy();
    });

    it('debería mostrar monto del hold en ARS', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$ 300.000'); // Intl format adds space after $
    });

    it('debería mostrar monto del hold en USD como referencia', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('US$ 300,00'); // Intl format adds decimals
    });

    it('debería mostrar badge de Reembolsabilidad', () => {
      // Assert
      const badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('debería indicar "Se bloquea en tu tarjeta"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Se bloquea en tu tarjeta');
      expect(text).toContain('no se cobra');
    });
  });

  describe('Escenario 2: Garantía con wallet', () => {
    beforeEach(() => {
      component.paymentMode = 'wallet';
      fixture.detectChanges();
    });

    it('debería mostrar sección de garantía con fondo morado', () => {
      // Assert
      const guaranteeSection = fixture.nativeElement.querySelector('.bg-sky-50');
      expect(guaranteeSection).toBeTruthy();
    });

    it('debería mostrar monto del crédito en ARS (calculado desde USD)', () => {
      // Assert - 300 USD * 1000 rate = 300,000 ARS
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$ 300.000'); // Intl format adds space after $
    });

    it('debería mostrar badges de wallet', () => {
      // Assert
      const badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBeGreaterThanOrEqual(2); // No reembolsable + Reutilizable
    });

    it('debería indicar "Se bloquea de tu saldo wallet"', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Se bloquea de tu saldo wallet');
    });
  });

  describe('Total Consolidado (informativo)', () => {
    it('debería calcular total consolidado (alquiler + garantía) para tarjeta', () => {
      // Arrange
      component.paymentMode = 'card';

      // Act
      fixture.detectChanges();

      // Assert - Total: 200,000 ARS (alquiler) + 300,000 ARS (hold) = 500,000 ARS
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$500.000');
    });

    it('debería calcular total consolidado para wallet', () => {
      // Arrange
      component.paymentMode = 'wallet';

      // Act
      fixture.detectChanges();

      // Assert - Total: 200,000 ARS + 300,000 ARS = 500,000 ARS
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$500.000');
    });

    it('debería mostrar texto aclaratorio sobre el total', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('informativo');
      expect(text).toContain('Importante');
    });

    it('debería aclarar diferencia entre tarjeta y wallet en texto informativo', () => {
      // Arrange - Tarjeta
      component.paymentMode = 'card';
      fixture.detectChanges();
      let text = fixture.nativeElement.textContent;

      // Assert - Tarjeta
      expect(text).toContain('se libera');

      // Arrange - Wallet
      component.paymentMode = 'wallet';
      fixture.detectChanges();
      text = fixture.nativeElement.textContent;

      // Assert - Wallet
      expect(text).toContain('queda disponible');
    });
  });

  describe('Escenario 3: Cambio de método', () => {
    it('debería actualizar garantía cuando cambia de card a wallet', () => {
      // Arrange - Iniciar con tarjeta
      component.paymentMode = 'card';
      fixture.detectChanges();
      let blueSection = fixture.nativeElement.querySelector('.bg-sky-50');
      expect(blueSection).toBeTruthy();

      // Act - Cambiar a wallet
      component.paymentMode = 'wallet';
      fixture.detectChanges();

      // Assert - Verificar cambio a sección morada
      const purpleSection = fixture.nativeElement.querySelector('.bg-sky-50');
      expect(purpleSection).toBeTruthy();
      blueSection = fixture.nativeElement.querySelector('.bg-sky-50');
      expect(blueSection).toBeFalsy();
    });

    it('debería actualizar badges cuando cambia de método', () => {
      // Arrange
      component.paymentMode = 'card';
      fixture.detectChanges();
      let badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBe(1); // Solo 1 badge para tarjeta

      // Act
      component.paymentMode = 'wallet';
      fixture.detectChanges();

      // Assert
      badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBe(2); // 2 badges para wallet
    });
  });

  describe('Cálculos con diferentes tasas de cambio', () => {
    it('debería recalcular crédito wallet cuando cambia fxSnapshot', () => {
      // Arrange
      component.paymentMode = 'wallet';
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 1500, // Nueva tasa
      };

      // Act
      fixture.detectChanges();

      // Assert - 300 USD * 1500 rate = 450,000 ARS
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$450.000');
    });

    it('debería actualizar total consolidado con nueva tasa', () => {
      // Arrange
      component.paymentMode = 'wallet';
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 2000,
      };
      component.priceBreakdown = {
        ...mockPriceBreakdown,
        totalArs: 400000, // 200 USD * 2000
      };

      // Act
      fixture.detectChanges();

      // Assert - Total: 400,000 (alquiler) + 600,000 (300 USD * 2000) = 1,000,000 ARS
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$1.000.000');
    });
  });

  describe('Formato de montos (ARS primero, USD secundario)', () => {
    it('debería mostrar ARS con formato argentino ($ XXX.XXX)', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const text = fixture.nativeElement.textContent;
      // Verificar formato con puntos como separadores de miles y espacio después de $
      expect(text).toContain('$ 200.000');
      expect(text).toContain('$ 300.000');
    });

    it('debería mostrar USD con prefijo "US$" y símbolo ≈', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const text = fixture.nativeElement.textContent;
      // Intl.NumberFormat adds decimals
      expect(text).toContain('≈ US$ 200,00');
      expect(text).toContain('≈ US$ 300,00');
    });
  });
});
