import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let component: LanguageService;
  let fixture: ComponentFixture<LanguageService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageService],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
