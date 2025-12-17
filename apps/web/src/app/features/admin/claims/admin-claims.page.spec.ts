import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminClaimsPage } from './admin-claims.page';

describe('AdminClaimsPage', () => {
  let component: AdminClaimsPage;
  let fixture: ComponentFixture<AdminClaimsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminClaimsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminClaimsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
