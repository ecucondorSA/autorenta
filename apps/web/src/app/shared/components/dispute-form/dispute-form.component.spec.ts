import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisputeFormComponent } from './dispute-form.component';

describe('DisputeFormComponent', () => {
  let component: DisputeFormComponent;
  let fixture: ComponentFixture<DisputeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisputeFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DisputeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
