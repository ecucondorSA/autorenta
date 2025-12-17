import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuaranteeOptionsInfoComponent } from './guarantee-options-info.component';

describe('GuaranteeOptionsInfoComponent', () => {
  let component: GuaranteeOptionsInfoComponent;
  let fixture: ComponentFixture<GuaranteeOptionsInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuaranteeOptionsInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GuaranteeOptionsInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
