import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettlementService } from './settlement.service';

describe('SettlementService', () => {
  let component: SettlementService;
  let fixture: ComponentFixture<SettlementService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettlementService],
    }).compileComponents();

    fixture = TestBed.createComponent(SettlementService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
