import { ComponentFixture, TestBed } from '@angular/core/testing';
import { supabase-types } from './supabase-types';

describe('supabase-types', () => {
  let component: supabase-types;
  let fixture: ComponentFixture<supabase-types>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [supabase-types],
    }).compileComponents();

    fixture = TestBed.createComponent(supabase-types);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
