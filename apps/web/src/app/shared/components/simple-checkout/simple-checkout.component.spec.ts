import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleCheckoutComponent } from './simple-checkout.component';

describe('SimpleCheckoutComponent', () => {
  let component: SimpleCheckoutComponent;
  let fixture: ComponentFixture<SimpleCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleCheckoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
