import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractPdfViewerComponent } from './contract-pdf-viewer.component';

describe('ContractPdfViewerComponent', () => {
  let component: ContractPdfViewerComponent;
  let fixture: ComponentFixture<ContractPdfViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractPdfViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContractPdfViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
