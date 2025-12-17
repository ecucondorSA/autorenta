import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestureService } from './gesture.service';

describe('GestureService', () => {
  let component: GestureService;
  let fixture: ComponentFixture<GestureService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestureService],
    }).compileComponents();

    fixture = TestBed.createComponent(GestureService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
