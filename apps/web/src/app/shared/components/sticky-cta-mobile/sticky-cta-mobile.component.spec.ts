import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StickyCtaMobileComponent } from './sticky-cta-mobile.component';

describe('StickyCtaMobileComponent', () => {
  let component: StickyCtaMobileComponent;
  let fixture: ComponentFixture<StickyCtaMobileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StickyCtaMobileComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StickyCtaMobileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
