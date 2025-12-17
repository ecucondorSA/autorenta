import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MakeCalendarPublicButtonComponent } from './make-calendar-public-button.component';

describe('MakeCalendarPublicButtonComponent', () => {
  let component: MakeCalendarPublicButtonComponent;
  let fixture: ComponentFixture<MakeCalendarPublicButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MakeCalendarPublicButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MakeCalendarPublicButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
