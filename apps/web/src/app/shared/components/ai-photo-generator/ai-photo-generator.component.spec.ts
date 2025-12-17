import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiPhotoGeneratorComponent } from './ai-photo-generator.component';

describe('AiPhotoGeneratorComponent', () => {
  let component: AiPhotoGeneratorComponent;
  let fixture: ComponentFixture<AiPhotoGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPhotoGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AiPhotoGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
