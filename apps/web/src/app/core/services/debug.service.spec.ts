import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugService } from './debug.service';

describe('DebugService', () => {
  let component: DebugService;
  let fixture: ComponentFixture<DebugService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebugService],
    }).compileComponents();

    fixture = TestBed.createComponent(DebugService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
