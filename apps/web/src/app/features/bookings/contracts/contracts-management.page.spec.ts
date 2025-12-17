import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsManagementPage } from './contracts-management.page';

describe('ContractsManagementPage', () => {
  let component: ContractsManagementPage;
  let fixture: ComponentFixture<ContractsManagementPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsManagementPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractsManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
