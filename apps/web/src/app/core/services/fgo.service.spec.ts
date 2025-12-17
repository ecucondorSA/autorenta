import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FgoService } from './fgo.service';

describe('FgoService', () => {
  let component: FgoService;
  let fixture: ComponentFixture<FgoService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FgoService],
    }).compileComponents();

    fixture = TestBed.createComponent(FgoService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
