import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleDocumentsPage } from './vehicle-documents.page';

describe('VehicleDocumentsPage', () => {
  let component: VehicleDocumentsPage;
  let fixture: ComponentFixture<VehicleDocumentsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehicleDocumentsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleDocumentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
