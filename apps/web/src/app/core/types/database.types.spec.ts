import { ComponentFixture, TestBed } from '@angular/core/testing';
import { database.types } from './database.types';

describe('database.types', () => {
  let component: database.types;
  let fixture: ComponentFixture<database.types>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [database.types],
    }).compileComponents();

    fixture = TestBed.createComponent(database.types);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
