import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAccidentsPage } from './admin-accidents.page';

describe('AdminAccidentsPage', () => {
  let component: AdminAccidentsPage;
  let fixture: ComponentFixture<AdminAccidentsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAccidentsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAccidentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
