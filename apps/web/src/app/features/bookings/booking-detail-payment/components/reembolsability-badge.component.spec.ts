import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

describe('ReembolsabilityBadgeComponent', () => {
  let component: ReembolsabilityBadgeComponent;
  let fixture: ComponentFixture<ReembolsabilityBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReembolsabilityBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReembolsabilityBadgeComponent);
    component = fixture.componentInstance;
  });

  describe('Badge rendering - Reembolsable', () => {
    it('debería mostrar badge verde con icono 🔄 cuando type es "reembolsable"', () => {
      // Arrange
      component.type = 'reembolsable';

      // Act
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('span');

      // Assert
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('🔄');
      expect(badge.textContent).toContain('Reembolsable');
      expect(badge.className).toContain('bg-success-bg');
      expect(badge.className).toContain('text-success-strong');
    });

    it('debería mostrar tooltip "Se libera automáticamente..." para reembolsable', () => {
      // Arrange
      component.type = 'reembolsable';

      // Act
      fixture.detectChanges();
      const tooltip = fixture.nativeElement.querySelector('.group-hover\\:opacity-100');

      // Assert
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent.trim()).toContain(
        'Se libera automáticamente al devolver el auto sin daños',
      );
    });
  });

  describe('Badge rendering - No reembolsable', () => {
    it('debería mostrar badge amarillo con icono ⚠️ cuando type es "no-reembolsable"', () => {
      // Arrange
      component.type = 'no-reembolsable';

      // Act
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('span');

      // Assert
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('⚠️');
      expect(badge.textContent).toContain('No reembolsable');
      expect(badge.className).toContain('bg-warning-bg');
      expect(badge.className).toContain('text-warning-strong');
    });

    it('debería mostrar tooltip "Queda como saldo no retirable..." para no-reembolsable', () => {
      // Arrange
      component.type = 'no-reembolsable';

      // Act
      fixture.detectChanges();
      const tooltip = fixture.nativeElement.querySelector('.group-hover\\:opacity-100');

      // Assert
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent.trim()).toContain('Queda como saldo no retirable en tu wallet');
    });
  });

  describe('Badge rendering - Reutilizable', () => {
    it('debería mostrar badge azul con icono ♻️ cuando type es "reutilizable"', () => {
      // Arrange
      component.type = 'reutilizable';

      // Act
      fixture.detectChanges();
      const badge = fixture.nativeElement.querySelector('span');

      // Assert
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('♻️');
      expect(badge.textContent).toContain('Reutilizable');
      expect(badge.className).toContain('bg-cta-default/10');
      expect(badge.className).toContain('text-cta-default');
    });

    it('debería mostrar tooltip "Disponible para futuras reservas..." para reutilizable', () => {
      // Arrange
      component.type = 'reutilizable';

      // Act
      fixture.detectChanges();
      const tooltip = fixture.nativeElement.querySelector('.group-hover\\:opacity-100');

      // Assert
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent.trim()).toContain('Disponible para futuras reservas en AutoRenta');
    });
  });

  describe('Custom tooltip', () => {
    it('debería usar tooltip customizado cuando se proporciona customTooltip', () => {
      // Arrange
      component.type = 'reembolsable';
      component.customTooltip = 'Tooltip personalizado para testing';

      // Act
      fixture.detectChanges();
      const tooltip = fixture.nativeElement.querySelector('.group-hover\\:opacity-100');

      // Assert
      expect(tooltip).toBeTruthy();
      expect(tooltip.textContent.trim()).toContain('Tooltip personalizado para testing');
      expect(tooltip.textContent.trim()).not.toContain('Se libera automáticamente');
    });
  });

  describe('Accessibility', () => {
    it('debería tener estructura semántica correcta', () => {
      // Arrange
      component.type = 'reembolsable';

      // Act
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('.inline-flex');

      // Assert
      expect(container).toBeTruthy();
      expect(container.className).toContain('group');
      expect(container.className).toContain('relative');
    });

    it('debería mostrar tooltip al hacer hover (clase group-hover)', () => {
      // Arrange
      component.type = 'reembolsable';

      // Act
      fixture.detectChanges();
      const tooltip = fixture.nativeElement.querySelector('[class*="absolute"]');

      // Assert
      expect(tooltip.className).toContain('group-hover:opacity-100');
      expect(tooltip.className).toContain('opacity-0');
    });
  });
});
