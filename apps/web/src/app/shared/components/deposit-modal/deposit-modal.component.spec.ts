import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { WalletService } from '../../../core/services/wallet.service';
import { DepositModalComponent } from './deposit-modal.component';

describe('DepositModalComponent', () => {
  let component: DepositModalComponent;
  let fixture: ComponentFixture<DepositModalComponent>;
  let mockWalletService: any;
  let mockExchangeRateService: any;

  beforeEach(async () => {
    mockWalletService = {
      initiateDeposit: jasmine
        .createSpy('initiateDeposit')
        .and.returnValue(of({ success: true, payment_url: 'http://success.com' })),
    };

    mockExchangeRateService = {
      getPlatformRate: jasmine.createSpy('getPlatformRate').and.returnValue(Promise.resolve(1000)),
    };

    await TestBed.configureTestingModule({
      imports: [DepositModalComponent, FormsModule, CommonModule, TranslateModule.forRoot()],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Wait for async operations (exchange rate load and effect)
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should be invalid if amount is less than MIN_DEPOSIT_ARS', () => {
      component.arsAmount.set(50);
      expect(component.validateForm()).toBe(false);
      expect(component.formError()).toContain('El depósito mínimo es');
    });

    it('should be invalid if amount is greater than MAX_DEPOSIT_ARS', () => {
      component.arsAmount.set(2000000);
      expect(component.validateForm()).toBe(false);
      expect(component.formError()).toContain('El depósito máximo es');
    });

    it('should be invalid if amount is not a number', () => {
      component.updateArsAmount('not a number');
      expect(component.validateForm()).toBe(false);
      expect(component.formError()).toContain('Por favor ingresa un monto válido');
    });
  });

  describe('API Interaction', () => {
    it('should call initiateDeposit on submit and emit success on success', async () => {
      spyOn(component.depositSuccess, 'emit');
      component.arsAmount.set(5000);

      // Wait for effect to update usdAmount
      await fixture.whenStable();
      fixture.detectChanges();

      component.onSubmit();

      expect(mockWalletService.initiateDeposit).toHaveBeenCalled();
      expect(component.depositSuccess.emit).toHaveBeenCalledWith('http://success.com');
    });

    it('should set formError on initiateDeposit failure', async () => {
      mockWalletService.initiateDeposit.and.returnValue(
        of({ success: false, message: 'Error message' }),
      );

      component.arsAmount.set(5000);

      // Wait for effect to update usdAmount
      await fixture.whenStable();
      fixture.detectChanges();

      component.onSubmit();

      expect(component.formError()).toBe('Error message');
    });

    it('should handle MERCADOPAGO_ERROR and suggest bank transfer', async () => {
      mockWalletService.initiateDeposit.and.returnValue(
        throwError(() => ({ code: 'MERCADOPAGO_ERROR' })),
      );

      component.arsAmount.set(5000);

      // Wait for effect to update usdAmount
      await fixture.whenStable();
      fixture.detectChanges();

      component.onSubmit();

      // Wait a microtask for observable to complete
      await Promise.resolve();

      expect(component.formError()).toContain('No pudimos iniciar el pago con Mercado Pago');
      expect(component.provider()).toBe('bank_transfer');
      expect(component.fallbackSuggestion()).toBe('bank_transfer');
    });
  });
});
