import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FipeAutocompleteComponent } from './fipe-autocomplete.component';

describe('FipeAutocompleteComponent', () => {
  let component: FipeAutocompleteComponent;
  let fixture: ComponentFixture<FipeAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FipeAutocompleteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FipeAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
