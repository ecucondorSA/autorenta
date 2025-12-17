import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReferralsService } from './referrals.service';

describe('ReferralsService', () => {
  let component: ReferralsService;
  let fixture: ComponentFixture<ReferralsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
