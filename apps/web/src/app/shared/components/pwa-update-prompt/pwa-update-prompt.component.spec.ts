import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaUpdatePromptComponent } from './pwa-update-prompt.component';

describe('PwaUpdatePromptComponent', () => {
  let component: PwaUpdatePromptComponent;
  let fixture: ComponentFixture<PwaUpdatePromptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaUpdatePromptComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaUpdatePromptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
