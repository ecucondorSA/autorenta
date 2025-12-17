import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BirthDateModalComponent } from './birth-date-modal.component';

describe('BirthDateModalComponent', () => {
  let component: BirthDateModalComponent;
  let fixture: ComponentFixture<BirthDateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BirthDateModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BirthDateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
