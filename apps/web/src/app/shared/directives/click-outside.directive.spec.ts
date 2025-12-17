import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClickOutsideDirective } from './click-outside.directive';

describe('ClickOutsideDirective', () => {
  let component: ClickOutsideDirective;
  let fixture: ComponentFixture<ClickOutsideDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClickOutsideDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(ClickOutsideDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
