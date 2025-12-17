import { ComponentFixture, TestBed } from '@angular/core/testing';
import { supabase-auth.interceptor } from './supabase-auth.interceptor';

describe('supabase-auth.interceptor', () => {
  let component: supabase-auth.interceptor;
  let fixture: ComponentFixture<supabase-auth.interceptor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [supabase-auth.interceptor],
    }).compileComponents();

    fixture = TestBed.createComponent(supabase-auth.interceptor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
