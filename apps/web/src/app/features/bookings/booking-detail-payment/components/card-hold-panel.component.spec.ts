import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardHoldPanelComponent } from './card-hold-panel.component';

describe('CardHoldPanelComponent', () => {
  let component: CardHoldPanelComponent;
  let fixture: ComponentFixture<CardHoldPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardHoldPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardHoldPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
