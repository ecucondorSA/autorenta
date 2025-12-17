import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractSignModalComponent } from './contract-sign-modal.component';

describe('ContractSignModalComponent', () => {
  let component: ContractSignModalComponent;
  let fixture: ComponentFixture<ContractSignModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractSignModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractSignModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
