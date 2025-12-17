import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutoAltDirective } from './auto-alt.directive';

describe('AutoAltDirective', () => {
  let component: AutoAltDirective;
  let fixture: ComponentFixture<AutoAltDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoAltDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(AutoAltDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
