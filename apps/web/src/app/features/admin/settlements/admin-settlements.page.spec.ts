import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSettlementsPage } from './admin-settlements.page';

describe('AdminSettlementsPage', () => {
  let component: AdminSettlementsPage;
  let fixture: ComponentFixture<AdminSettlementsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettlementsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSettlementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
