import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountingService } from './accounting.service';

describe('AccountingService', () => {
  let component: AccountingService;
  let fixture: ComponentFixture<AccountingService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountingService],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
