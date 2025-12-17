import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutorentarCreditService } from './autorentar-credit.service';

describe('AutorentarCreditService', () => {
  let component: AutorentarCreditService;
  let fixture: ComponentFixture<AutorentarCreditService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutorentarCreditService],
    }).compileComponents();

    fixture = TestBed.createComponent(AutorentarCreditService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
