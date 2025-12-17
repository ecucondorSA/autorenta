import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BonusMalusService } from './bonus-malus.service';

describe('BonusMalusService', () => {
  let component: BonusMalusService;
  let fixture: ComponentFixture<BonusMalusService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BonusMalusService],
    }).compileComponents();

    fixture = TestBed.createComponent(BonusMalusService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
