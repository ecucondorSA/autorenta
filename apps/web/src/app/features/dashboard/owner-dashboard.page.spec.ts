import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerDashboardPage } from './owner-dashboard.page';

describe('OwnerDashboardPage', () => {
  let component: OwnerDashboardPage;
  let fixture: ComponentFixture<OwnerDashboardPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerDashboardPage],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
