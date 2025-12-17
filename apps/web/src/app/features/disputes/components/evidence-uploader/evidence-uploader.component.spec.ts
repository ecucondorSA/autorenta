import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvidenceUploaderComponent } from './evidence-uploader.component';

describe('EvidenceUploaderComponent', () => {
  let component: EvidenceUploaderComponent;
  let fixture: ComponentFixture<EvidenceUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidenceUploaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EvidenceUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
