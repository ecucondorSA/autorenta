import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleManagerService } from './locale-manager.service';

describe('LocaleManagerService', () => {
  let component: LocaleManagerService;
  let fixture: ComponentFixture<LocaleManagerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocaleManagerService],
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleManagerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
