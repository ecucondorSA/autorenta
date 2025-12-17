import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReferralsPage } from './referrals.page';

describe('ReferralsPage', () => {
  let component: ReferralsPage;
  let fixture: ComponentFixture<ReferralsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReferralsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferralsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
