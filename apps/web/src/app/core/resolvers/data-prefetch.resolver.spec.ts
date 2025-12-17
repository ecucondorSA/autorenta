import { ComponentFixture, TestBed } from '@angular/core/testing';
import { data-prefetch.resolver } from './data-prefetch.resolver';

describe('data-prefetch.resolver', () => {
  let component: data-prefetch.resolver;
  let fixture: ComponentFixture<data-prefetch.resolver>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [data-prefetch.resolver],
    }).compileComponents();

    fixture = TestBed.createComponent(data-prefetch.resolver);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
