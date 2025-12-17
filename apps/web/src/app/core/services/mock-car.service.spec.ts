import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockCarService } from './mock-car.service';

describe('MockCarService', () => {
  let component: MockCarService;
  let fixture: ComponentFixture<MockCarService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MockCarService],
    }).compileComponents();

    fixture = TestBed.createComponent(MockCarService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
