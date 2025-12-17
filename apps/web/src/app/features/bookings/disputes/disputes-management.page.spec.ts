import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputesManagementPage } from './disputes-management.page';

describe('DisputesManagementPage', () => {
  let component: DisputesManagementPage;
  let fixture: ComponentFixture<DisputesManagementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputesManagementPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputesManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
