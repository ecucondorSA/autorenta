import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let component: ContractsService;
  let fixture: ComponentFixture<ContractsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
