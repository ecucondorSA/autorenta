import { ComponentFixture, TestBed } from '@angular/core/testing';
import { search-debounce } from './search-debounce';

describe('search-debounce', () => {
  let component: search-debounce;
  let fixture: ComponentFixture<search-debounce>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [search-debounce],
    }).compileComponents();

    fixture = TestBed.createComponent(search-debounce);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
