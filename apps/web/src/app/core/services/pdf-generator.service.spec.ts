import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorService', () => {
  let component: PdfGeneratorService;
  let fixture: ComponentFixture<PdfGeneratorService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PdfGeneratorService],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfGeneratorService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
