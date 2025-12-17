import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpMenuComponent } from './EXAMPLES';

describe('HelpMenuComponent', () => {
  let component: HelpMenuComponent;
  let fixture: ComponentFixture<HelpMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpMenuComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
