import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminTrafficInfractionsPage } from './admin-traffic-infractions.page';

describe('AdminTrafficInfractionsPage', () => {
  let component: AdminTrafficInfractionsPage;
  let fixture: ComponentFixture<AdminTrafficInfractionsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTrafficInfractionsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTrafficInfractionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
