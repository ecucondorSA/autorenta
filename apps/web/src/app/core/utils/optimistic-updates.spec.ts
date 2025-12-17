import { ComponentFixture, TestBed } from '@angular/core/testing';
import { optimistic-updates } from './optimistic-updates';

describe('optimistic-updates', () => {
  let component: optimistic-updates;
  let fixture: ComponentFixture<optimistic-updates>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [optimistic-updates],
    }).compileComponents();

    fixture = TestBed.createComponent(optimistic-updates);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
