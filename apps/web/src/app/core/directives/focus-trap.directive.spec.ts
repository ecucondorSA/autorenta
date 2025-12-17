import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusTrapDirective } from './focus-trap.directive';

describe('FocusTrapDirective', () => {
  let component: FocusTrapDirective;
  let fixture: ComponentFixture<FocusTrapDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FocusTrapDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(FocusTrapDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
