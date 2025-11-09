import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  TelemetryService,
  TelemetryData,
  RecordTelemetryResult,
  TelemetrySummary,
  TelemetryHistoryEntry,
} from './telemetry.service';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let supabaseClientServiceMock: jasmine.SpyObj<SupabaseClientService>;
  let loggerServiceMock: jasmine.SpyObj<LoggerService>;
  let supabaseMock: any;

  const mockTelemetryData: TelemetryData = {
    total_km: 120,
    hard_brakes: 3,
    speed_violations: 1,
    night_driving_hours: 2,
    risk_zones_visited: 0,
  };

  const mockRecordResult: RecordTelemetryResult = {
    success: true,
    message: 'Telemetría registrada exitosamente',
    telemetry_id: 'telemetry-123',
    driver_score: 85,
  };

  const mockSummary: TelemetrySummary = {
    total_trips: 10,
    total_km: 1200,
    avg_driver_score: 82,
    current_driver_score: 85,
    hard_brakes_total: 25,
    speed_violations_total: 8,
    night_driving_hours_total: 15,
    risk_zones_visited_total: 2,
    best_score: 95,
    worst_score: 70,
    score_trend: 'improving',
  };

  const defaultSummary: TelemetrySummary = {
    total_trips: 0,
    total_km: 0,
    avg_driver_score: 50,
    current_driver_score: 50,
    hard_brakes_total: 0,
    speed_violations_total: 0,
    night_driving_hours_total: 0,
    risk_zones_visited_total: 0,
    best_score: 0,
    worst_score: 0,
    score_trend: 'insufficient_data',
  };

  const mockHistory: TelemetryHistoryEntry[] = [
    {
      id: 'tel-1',
      booking_id: 'booking-1',
      trip_date: '2025-01-10T00:00:00Z',
      total_km: 100,
      driver_score: 85,
      hard_brakes: 2,
      speed_violations: 1,
      night_driving_hours: 1,
      risk_zones_visited: 0,
    },
    {
      id: 'tel-2',
      booking_id: 'booking-2',
      trip_date: '2025-01-05T00:00:00Z',
      total_km: 150,
      driver_score: 80,
      hard_brakes: 3,
      speed_violations: 2,
      night_driving_hours: 2,
      risk_zones_visited: 1,
    },
  ];

  beforeEach(() => {
    const rpcSpy = jasmine
      .createSpy('rpc')
      .and.returnValue(Promise.resolve({ data: [mockSummary], error: null }));

    supabaseMock = {
      rpc: rpcSpy,
    };

    supabaseClientServiceMock = jasmine.createSpyObj('SupabaseClientService', ['getClient']);
    supabaseClientServiceMock.getClient.and.returnValue(supabaseMock);

    loggerServiceMock = jasmine.createSpyObj('LoggerService', ['info', 'error']);

    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        { provide: SupabaseClientService, useValue: supabaseClientServiceMock },
        { provide: LoggerService, useValue: loggerServiceMock },
      ],
    });

    service = TestBed.inject(TelemetryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('recordTelemetry', () => {
    it('should record telemetry data successfully', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockRecordResult], error: null }),
        Promise.resolve({ data: [mockSummary], error: null }),
      );

      service
        .recordTelemetry({
          userId: 'user-123',
          bookingId: 'booking-456',
          telemetryData: mockTelemetryData,
        })
        .subscribe({
          next: (result) => {
            expect(result).toEqual(mockRecordResult);
            expect(supabaseMock.rpc).toHaveBeenCalledWith('record_telemetry', {
              p_user_id: 'user-123',
              p_booking_id: 'booking-456',
              p_telemetry_data: mockTelemetryData,
            });
            done();
          },
          error: done.fail,
        });
    });

    it('should refresh summary after recording', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockRecordResult], error: null }),
        Promise.resolve({ data: [mockSummary], error: null }),
      );

      service
        .recordTelemetry({
          userId: 'user-123',
          bookingId: 'booking-456',
          telemetryData: mockTelemetryData,
        })
        .subscribe({
          next: () => {
            // Should call rpc twice: once for record, once for getSummary
            expect(supabaseMock.rpc).toHaveBeenCalledTimes(2);
            expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_summary', {
              p_user_id: null,
              p_months_back: 3,
            });
            done();
          },
          error: done.fail,
        });
    });

    it('should handle errors', (done) => {
      const error = new Error('Recording failed');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service
        .recordTelemetry({
          userId: 'user-123',
          bookingId: 'booking-456',
          telemetryData: mockTelemetryData,
        })
        .subscribe({
          next: () => done.fail('Should have thrown error'),
          error: (err) => {
            expect(err).toEqual(error);
            expect(service.error()).toEqual({ message: 'Error al registrar telemetría' });
            expect(loggerServiceMock.error).toHaveBeenCalled();
            done();
          },
        });
    });
  });

  describe('getSummary', () => {
    it('should fetch and set telemetry summary', (done) => {
      service.getSummary('user-123', 6).subscribe({
        next: (summary) => {
          expect(summary).toEqual(mockSummary);
          expect(service.summary()).toEqual(mockSummary);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_summary', {
            p_user_id: 'user-123',
            p_months_back: 6,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should use default monthsBack value', (done) => {
      service.getSummary('user-123').subscribe({
        next: () => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_summary', {
            p_user_id: 'user-123',
            p_months_back: 3,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should call without userId when not provided', (done) => {
      service.getSummary().subscribe({
        next: () => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_summary', {
            p_user_id: null,
            p_months_back: 3,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should return default summary when no data', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [], error: null }));

      service.getSummary('user-123').subscribe({
        next: (summary) => {
          expect(summary).toEqual(defaultSummary);
          expect(service.summary()).toEqual(defaultSummary);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Database error');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service.getSummary('user-123').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          expect(service.error()).toEqual({ message: 'Error al obtener resumen de telemetría' });
          done();
        },
      });
    });
  });

  describe('getHistory', () => {
    it('should fetch and set telemetry history', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: mockHistory, error: null }));

      service.getHistory('user-123', 20).subscribe({
        next: (history) => {
          expect(history).toEqual(mockHistory);
          expect(service.history()).toEqual(mockHistory);
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_history', {
            p_user_id: 'user-123',
            p_limit: 20,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should use default limit value', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: mockHistory, error: null }));

      service.getHistory('user-123').subscribe({
        next: () => {
          expect(supabaseMock.rpc).toHaveBeenCalledWith('get_user_telemetry_history', {
            p_user_id: 'user-123',
            p_limit: 10,
          });
          done();
        },
        error: done.fail,
      });
    });

    it('should handle empty history', (done) => {
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: [], error: null }));

      service.getHistory('user-123').subscribe({
        next: (history) => {
          expect(history).toEqual([]);
          expect(service.history()).toEqual([]);
          done();
        },
        error: done.fail,
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Database error');
      supabaseMock.rpc.and.returnValue(Promise.resolve({ data: null, error }));

      service.getHistory('user-123').subscribe({
        next: () => done.fail('Should have thrown error'),
        error: (err) => {
          expect(err).toEqual(error);
          expect(service.error()).toEqual({ message: 'Error al obtener historial de telemetría' });
          done();
        },
      });
    });
  });

  describe('computed signals', () => {
    it('should compute currentDriverScore from summary', () => {
      service.summary.set(mockSummary);
      expect(service.currentDriverScore()).toBe(85);
    });

    it('should compute avgDriverScore from summary', () => {
      service.summary.set(mockSummary);
      expect(service.avgDriverScore()).toBe(82);
    });

    it('should compute totalTrips from summary', () => {
      service.summary.set(mockSummary);
      expect(service.totalTrips()).toBe(10);
    });

    it('should compute totalKm from summary', () => {
      service.summary.set(mockSummary);
      expect(service.totalKm()).toBe(1200);
    });

    it('should compute scoreTrend from summary', () => {
      service.summary.set(mockSummary);
      expect(service.scoreTrend()).toBe('improving');
    });

    it('should compute isImproving from scoreTrend', () => {
      service.summary.set(mockSummary);
      expect(service.isImproving()).toBe(true);
    });

    it('should compute isDeclining from scoreTrend', () => {
      const decliningSummary = { ...mockSummary, score_trend: 'declining' as const };
      service.summary.set(decliningSummary);
      expect(service.isDeclining()).toBe(true);
    });

    it('should return defaults when summary is null', () => {
      service.summary.set(null);
      expect(service.currentDriverScore()).toBe(50);
      expect(service.avgDriverScore()).toBe(50);
      expect(service.totalTrips()).toBe(0);
      expect(service.totalKm()).toBe(0);
      expect(service.scoreTrend()).toBe('insufficient_data');
      expect(service.isImproving()).toBe(false);
      expect(service.isDeclining()).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should call getSummary and getHistory', () => {
      spyOn(service, 'getSummary').and.returnValue(of(mockSummary));
      spyOn(service, 'getHistory').and.returnValue(of(mockHistory));

      service.refresh(6, 20);

      expect(service.getSummary).toHaveBeenCalledWith(undefined, 6);
      expect(service.getHistory).toHaveBeenCalledWith(undefined, 20);
    });
  });

  describe('formatScore', () => {
    it('should format excellent score (90+)', () => {
      const formatted = service.formatScore(95);
      expect(formatted).toEqual({ value: 95, label: 'Excelente', color: 'green' });
    });

    it('should format good score (75-89)', () => {
      const formatted = service.formatScore(80);
      expect(formatted).toEqual({ value: 80, label: 'Bueno', color: 'blue' });
    });

    it('should format regular score (60-74)', () => {
      const formatted = service.formatScore(65);
      expect(formatted).toEqual({ value: 65, label: 'Regular', color: 'yellow' });
    });

    it('should format low score (40-59)', () => {
      const formatted = service.formatScore(50);
      expect(formatted).toEqual({ value: 50, label: 'Bajo', color: 'orange' });
    });

    it('should format very low score (<40)', () => {
      const formatted = service.formatScore(30);
      expect(formatted).toEqual({ value: 30, label: 'Muy Bajo', color: 'red' });
    });

    it('should handle boundary values correctly', () => {
      expect(service.formatScore(90).label).toBe('Excelente');
      expect(service.formatScore(75).label).toBe('Bueno');
      expect(service.formatScore(60).label).toBe('Regular');
      expect(service.formatScore(40).label).toBe('Bajo');
      expect(service.formatScore(39).label).toBe('Muy Bajo');
    });
  });

  describe('getTrendDisplay', () => {
    it('should display improving trend', () => {
      service.summary.set(mockSummary);
      const display = service.getTrendDisplay();
      expect(display).toEqual({ icon: '↗', label: 'Mejorando', color: 'green' });
    });

    it('should display declining trend', () => {
      const decliningSummary = { ...mockSummary, score_trend: 'declining' as const };
      service.summary.set(decliningSummary);
      const display = service.getTrendDisplay();
      expect(display).toEqual({ icon: '↘', label: 'Bajando', color: 'red' });
    });

    it('should display stable trend', () => {
      const stableSummary = { ...mockSummary, score_trend: 'stable' as const };
      service.summary.set(stableSummary);
      const display = service.getTrendDisplay();
      expect(display).toEqual({ icon: '→', label: 'Estable', color: 'blue' });
    });

    it('should display insufficient data', () => {
      service.summary.set(defaultSummary);
      const display = service.getTrendDisplay();
      expect(display).toEqual({ icon: '?', label: 'Sin datos', color: 'gray' });
    });
  });

  describe('getHardBrakesRate', () => {
    it('should calculate hard brakes per 100km', () => {
      service.summary.set(mockSummary);
      // 25 hard brakes / 1200 km * 100 = 2.08333...
      const rate = service.getHardBrakesRate();
      expect(rate).toBe(2.1); // Rounded to 1 decimal
    });

    it('should return 0 when total_km is 0', () => {
      service.summary.set(defaultSummary);
      const rate = service.getHardBrakesRate();
      expect(rate).toBe(0);
    });

    it('should return 0 when summary is null', () => {
      service.summary.set(null);
      const rate = service.getHardBrakesRate();
      expect(rate).toBe(0);
    });
  });

  describe('getSpeedViolationsRate', () => {
    it('should calculate speed violations per 100km', () => {
      service.summary.set(mockSummary);
      // 8 violations / 1200 km * 100 = 0.66666...
      const rate = service.getSpeedViolationsRate();
      expect(rate).toBe(0.7); // Rounded to 1 decimal
    });

    it('should return 0 when total_km is 0', () => {
      service.summary.set(defaultSummary);
      const rate = service.getSpeedViolationsRate();
      expect(rate).toBe(0);
    });

    it('should return 0 when summary is null', () => {
      service.summary.set(null);
      const rate = service.getSpeedViolationsRate();
      expect(rate).toBe(0);
    });
  });

  describe('loading states', () => {
    it('should set loading state during getSummary', (done) => {
      expect(service.loading()).toBe(false);

      service.getSummary().subscribe({
        complete: () => {
          expect(service.loading()).toBe(false);
          done();
        },
      });

      setTimeout(() => {
        expect(service.loading()).toBe(true);
      }, 0);
    });

    it('should set loading state during recordTelemetry', (done) => {
      supabaseMock.rpc.and.returnValues(
        Promise.resolve({ data: [mockRecordResult], error: null }),
        Promise.resolve({ data: [mockSummary], error: null }),
      );

      expect(service.loading()).toBe(false);

      service
        .recordTelemetry({
          userId: 'user-123',
          bookingId: 'booking-456',
          telemetryData: mockTelemetryData,
        })
        .subscribe({
          complete: () => {
            expect(service.loading()).toBe(false);
            done();
          },
        });

      setTimeout(() => {
        expect(service.loading()).toBe(true);
      }, 0);
    });
  });
});
