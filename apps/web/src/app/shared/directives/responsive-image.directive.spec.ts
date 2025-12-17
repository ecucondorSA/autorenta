import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResponsiveImageDirective } from './responsive-image.directive';

describe('ResponsiveImageDirective', () => {
  let component: ResponsiveImageDirective;
  let fixture: ComponentFixture<ResponsiveImageDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsiveImageDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(ResponsiveImageDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
