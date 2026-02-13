import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ParticipationService } from './participation.service';
import { SupabaseClientService } from '../infrastructure/supabase-client.service';
import { of } from 'rxjs';

describe('ParticipationService', () => {
  let service: ParticipationService;
  let supabaseSpy: any;

  beforeEach(() => {
    supabaseSpy = jasmine.createSpyObj('SupabaseClientService', ['invoke', 'from']);
    
    TestBed.configureTestingModule({
      providers: [
        ParticipationService,
        { provide: SupabaseClientService, useValue: supabaseSpy }
      ]
    });
    service = TestBed.inject(ParticipationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentPeriod', () => {
    it('should return mock data for now (to be updated with real connection)', fakeAsync(() => {
      const ownerId = 'owner-123';
      service.getCurrentPeriod(ownerId).subscribe(data => {
        expect(data).toBeTruthy();
        expect(data?.owner_id).toBe(ownerId);
        expect(data?.status).toBe('open');
      });
      tick(1000);
    }));
  });

  describe('getFgoStatus', () => {
    it('should return FGO status', fakeAsync(() => {
      service.getFgoStatus().subscribe(data => {
        expect(data).toBeTruthy();
        expect(data.status).toBe('healthy');
      });
      tick(1000);
    }));
  });
});
