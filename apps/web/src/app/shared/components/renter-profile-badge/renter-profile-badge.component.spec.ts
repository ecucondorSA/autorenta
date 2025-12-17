import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RenterProfileBadgeComponent } from './renter-profile-badge.component';

describe('RenterProfileBadgeComponent', () => {
  let component: RenterProfileBadgeComponent;
  let fixture: ComponentFixture<RenterProfileBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenterProfileBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RenterProfileBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
