import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleDocumentsService } from './vehicle-documents.service';

describe('VehicleDocumentsService', () => {
  let component: VehicleDocumentsService;
  let fixture: ComponentFixture<VehicleDocumentsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleDocumentsService],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleDocumentsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
