import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminFeatureFlagsPage } from './admin-feature-flags.page';

describe('AdminFeatureFlagsPage', () => {
  let component: AdminFeatureFlagsPage;
  let fixture: ComponentFixture<AdminFeatureFlagsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFeatureFlagsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFeatureFlagsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
