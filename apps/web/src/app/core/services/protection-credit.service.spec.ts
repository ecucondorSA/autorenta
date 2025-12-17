import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectionCreditService } from './protection-credit.service';

describe('ProtectionCreditService', () => {
  let component: ProtectionCreditService;
  let fixture: ComponentFixture<ProtectionCreditService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectionCreditService],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectionCreditService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
