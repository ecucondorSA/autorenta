import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BecomeRenterPage } from './become-renter.page';

describe('BecomeRenterPage', () => {
  let component: BecomeRenterPage;
  let fixture: ComponentFixture<BecomeRenterPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BecomeRenterPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BecomeRenterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
