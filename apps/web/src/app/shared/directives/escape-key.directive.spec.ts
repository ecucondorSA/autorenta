import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EscapeKeyDirective } from './escape-key.directive';

describe('EscapeKeyDirective', () => {
  let component: EscapeKeyDirective;
  let fixture: ComponentFixture<EscapeKeyDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EscapeKeyDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(EscapeKeyDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
