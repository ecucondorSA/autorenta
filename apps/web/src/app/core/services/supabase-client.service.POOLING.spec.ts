import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupabaseClientService } from './supabase-client.service.POOLING';

describe('SupabaseClientService', () => {
  let component: SupabaseClientService;
  let fixture: ComponentFixture<SupabaseClientService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupabaseClientService],
    }).compileComponents();

    fixture = TestBed.createComponent(SupabaseClientService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
