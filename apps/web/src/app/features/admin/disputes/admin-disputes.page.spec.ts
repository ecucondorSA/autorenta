import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDisputesPage } from './admin-disputes.page';

describe('AdminDisputesPage', () => {
  let component: AdminDisputesPage;
  let fixture: ComponentFixture<AdminDisputesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDisputesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDisputesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
