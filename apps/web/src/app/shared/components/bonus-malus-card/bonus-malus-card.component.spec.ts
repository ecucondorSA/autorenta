import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonusMalusCardComponent } from './bonus-malus-card.component';

describe('BonusMalusCardComponent', () => {
  let component: BonusMalusCardComponent;
  let fixture: ComponentFixture<BonusMalusCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonusMalusCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BonusMalusCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
