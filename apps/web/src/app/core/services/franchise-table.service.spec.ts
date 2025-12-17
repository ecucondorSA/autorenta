import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FranchiseTableService } from './franchise-table.service';

describe('FranchiseTableService', () => {
  let component: FranchiseTableService;
  let fixture: ComponentFixture<FranchiseTableService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FranchiseTableService],
    }).compileComponents();

    fixture = TestBed.createComponent(FranchiseTableService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
