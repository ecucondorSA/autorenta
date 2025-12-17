import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractTemplateService } from './contract-template.service';

describe('ContractTemplateService', () => {
  let component: ContractTemplateService;
  let fixture: ComponentFixture<ContractTemplateService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractTemplateService],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractTemplateService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
