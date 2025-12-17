import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FxService } from './fx.service';

describe('FxService', () => {
  let component: FxService;
  let fixture: ComponentFixture<FxService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FxService],
    }).compileComponents();

    fixture = TestBed.createComponent(FxService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
