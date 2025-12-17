import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarChatComponent } from './car-chat.component';

describe('CarChatComponent', () => {
  let component: CarChatComponent;
  let fixture: ComponentFixture<CarChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
