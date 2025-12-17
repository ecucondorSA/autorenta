import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerConfirmationComponent } from './owner-confirmation.component';

describe('OwnerConfirmationComponent', () => {
  let component: OwnerConfirmationComponent;
  let fixture: ComponentFixture<OwnerConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerConfirmationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
