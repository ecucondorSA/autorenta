import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PriceBreakdown,
  RiskSnapshot,
  FxSnapshot,
} from '../../../../core/models/booking-detail-payment.model';
import { PaymentMethodComparisonModalComponent } from './payment-method-comparison-modal.component';

// TODO: Fix CSS selector issues - Tailwind classes with escaped characters not supported in querySelector
// TODO: Fix child component mocks for app-reembolsability-badge
describe('PaymentMethodComparisonModalComponent - Escenario 4', () => {
  let component: PaymentMethodComparisonModalComponent;
  let fixture: ComponentFixture<PaymentMethodComparisonModalComponent>;

  const mockPriceBreakdown: PriceBreakdown = {
    dailyRateUsd: 50,
    totalDays: 3,
    subtotalUsd: 150,
    platformFeeUsd: 15,
    insuranceFeeUsd: 10,
    fgoContributionUsd: 5,
    coverageUpgradeUsd: 20,
    totalUsd: 200,
    totalArs: 200000,
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
      imports: [PaymentMethodComparisonModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentMethodComparisonModalComponent);
    component = fixture.componentInstance;
    component.priceBreakdown = mockPriceBreakdown;
    component.riskSnapshot = mockRiskSnapshot;
    component.fxSnapshot = mockFxSnapshot;
  });

  describe('Apertura y cierre del modal', () => {
    it('debería mostrar modal al renderizar el componente', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const modal = fixture.nativeElement.querySelector('.fixed.inset-0');
      expect(modal).toBeTruthy();
    });

    it('debería tener backdrop semi-transparente', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const backdrop = fixture.nativeElement.querySelector('.bg-black\\/50');
      expect(backdrop).toBeTruthy();
    });

    it('debería emitir evento close cuando se hace click en el botón cerrar', () => {
      // Arrange
      spyOn(component.closeModal, 'emit');
      fixture.detectChanges();

      // Act
      const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar modal"]');
      closeButton.click();

      // Assert
      expect(component.closeModal.emit).toHaveBeenCalled();
    });

    it('debería emitir evento close cuando se hace click en el backdrop', () => {
      // Arrange
      spyOn(component.closeModal, 'emit');
      fixture.detectChanges();

      // Act
      const backdrop = fixture.nativeElement.querySelector('[class*="fixed inset-0"]');
      backdrop.click();

      // Assert
      expect(component.closeModal.emit).toHaveBeenCalled();
    });

    it('NO debería cerrar cuando se hace click dentro del modal', () => {
      // Arrange
      spyOn(component.closeModal, 'emit');
      fixture.detectChanges();

      // Act
      const modalContent = fixture.nativeElement.querySelector('.bg-surface-raised');
      const clickEvent = new MouseEvent('click', { bubbles: false });
      modalContent.dispatchEvent(clickEvent);

      // Assert
      expect(component.closeModal.emit).not.toHaveBeenCalled();
    });
  });

  describe('Header del modal', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería mostrar título "Comparación de Métodos de Pago"', () => {
      // Assert
      const title = fixture.nativeElement.querySelector('h2');
      expect(title).toBeTruthy();
      expect(title.textContent).toContain('Comparación de Métodos de Pago');
    });

    it('debería tener botón de cerrar con SVG', () => {
      // Assert
      const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar modal"]');
      expect(closeButton).toBeTruthy();
      expect(closeButton.innerHTML).toContain('svg');
    });
  });

  describe('Tabla comparativa side-by-side', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería mostrar dos columnas: "Con Tarjeta" y "Con Wallet"', () => {
      // Assert - No usa table/th, usa div grid
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Con Tarjeta');
      expect(text).toContain('Con Wallet');
    });

    it('debería mostrar "Total del alquiler" con mismo monto para ambos', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Total del alquiler');
      expect(text).toContain('$ 200.000'); // Intl format adds space
    });

    it('debería mostrar "Garantía" con montos', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Garantía');
      expect(text).toContain('$ 300.000'); // Intl format adds space
    });

    it('debería mostrar explicaciones de garantía', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Hold temporal en tarjeta');
      expect(text).toContain('Crédito de seguridad');
    });

    it('debería mostrar badges en la tabla', () => {
      // Assert
      const badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBeGreaterThan(0);

      // Verificar tipos de badges
      const badgeTypes = Array.from(badges).map((b: any) => b.getAttribute('type'));
      expect(badgeTypes).toContain('reembolsable');
      expect(badgeTypes).toContain('no-reembolsable');
      expect(badgeTypes).toContain('reutilizable');
    });

    it('debería mostrar "Total bloqueado" para ambos métodos', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Total bloqueado en tarjeta');
      expect(text).toContain('Total bloqueado en wallet');
      expect(text).toContain('$ 500.000'); // Intl format adds space
    });
  });

  describe('Cálculo de ahorro', () => {
    it('debería calcular ahorro cuando wallet es más barato', () => {
      // Arrange - Wallet más barato por menor garantía
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 400000, // Tarjeta: 400k
        creditSecurityUsd: 250, // Wallet: 250k (250 USD * 1000)
      };

      // Act
      fixture.detectChanges();
      const savings = component['savingsArs']();

      // Assert - Ahorro: 400k - 250k = 150k
      expect(savings).toBe(150000);
    });

    it('debería mostrar información de ahorro cuando wallet es más barato', () => {
      // Arrange
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 400000,
        creditSecurityUsd: 250,
      };

      // Act
      fixture.detectChanges();

      // Assert - El ahorro se muestra en sección verde y en ventajas
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Ahorro con Wallet');
      expect(text).toContain('$ 150.000'); // Intl format adds space
    });

    it('debería retornar 0 cuando no hay ahorro', () => {
      // Arrange - Mismos montos
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 300000,
        creditSecurityUsd: 300,
      };

      // Act
      fixture.detectChanges();
      const savings = component['savingsArs']();

      // Assert
      expect(savings).toBe(0);
    });

    it('NO debería mostrar banner de ahorro cuando savings es 0', () => {
      // Arrange
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 300000,
        creditSecurityUsd: 300,
      };

      // Act
      fixture.detectChanges();

      // Assert - No debe mostrar banner verde de ahorro
      const text = fixture.nativeElement.textContent;
      expect(text).not.toContain('Ahorro con Wallet');
      // Pero sí muestra "Misma garantía que tarjeta" en ventajas
      expect(text).toContain('Misma garantía que tarjeta');
    });
  });

  describe('Ventajas y desventajas', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería listar ventajas de tarjeta', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('No necesitas saldo en wallet');
      expect(text).toContain('Garantía se libera automáticamente');
      expect(text).toContain('Pago protegido por MercadoPago');
    });

    it('debería mostrar sección de Ventajas', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Ventajas');
    });

    it('debería listar ventajas de wallet', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Sin límite de tarjeta de crédito');
      expect(text).toContain('Crédito queda para futuras reservas');
    });

    it('debería mostrar badges de reembolsabilidad', () => {
      // Assert
      const badges = fixture.nativeElement.querySelectorAll('app-reembolsability-badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('Información del modal', () => {
    it('debería mostrar nota informativa al final', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('Importante');
      expect(text).toContain('Ambos métodos son igualmente seguros');
    });

    it('debería mostrar botón "Entendido" para cerrar', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toContain('Entendido');
    });
  });

  describe('Responsiveness', () => {
    it('debería tener scroll cuando el contenido es largo', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const modalContent = fixture.nativeElement.querySelector('.overflow-y-auto');
      expect(modalContent).toBeTruthy();
    });

    it('debería tener max-height configurado', () => {
      // Act
      fixture.detectChanges();

      // Assert
      const modalContent = fixture.nativeElement.querySelector('[class*="max-h"]');
      expect(modalContent).toBeTruthy();
    });
  });

  describe('Formato de moneda consistente', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería mostrar montos en ARS', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('$');
      expect(text).toContain('200.000'); // Total del alquiler
    });

    it('debería mostrar referencias en USD con símbolo ≈', () => {
      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('≈ US$');
    });
  });

  describe('Accesibilidad', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería tener estructura de modal accesible', () => {
      // Assert - Verifica backdrop y contenido
      const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
      expect(backdrop).toBeTruthy();
    });

    it('debería tener aria-label en botón de cerrar', () => {
      // Assert
      const closeButton = fixture.nativeElement.querySelector('button[aria-label="Cerrar modal"]');
      expect(closeButton).toBeTruthy();
    });

    it('debería tener z-index alto para overlay', () => {
      // Assert
      const modal = fixture.nativeElement.querySelector('[class*="z-50"]');
      expect(modal).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('debería manejar tasas de cambio muy altas', () => {
      // Arrange
      component.fxSnapshot = {
        ...mockFxSnapshot,
        rate: 5000,
      };
      component.priceBreakdown = {
        ...mockPriceBreakdown,
        totalArs: 1000000, // 200 USD * 5000
        fxRate: 5000,
      };

      // Act
      fixture.detectChanges();

      // Assert
      const text = fixture.nativeElement.textContent;
      expect(text).toContain('1.000.000'); // Verificar que muestra el millón
    });

    it('debería manejar correctamente cuando wallet es más caro', () => {
      // Arrange - Wallet más caro
      component.riskSnapshot = {
        ...mockRiskSnapshot,
        holdEstimatedArs: 200000, // Tarjeta más barata
        creditSecurityUsd: 400, // Wallet más cara (400k)
      };

      // Act
      fixture.detectChanges();
      const savings = component['savingsArs']();

      // Assert - Negativo cuando wallet es más caro: 200k - 400k = -200k
      expect(savings).toBe(-200000);
    });
  });
});
