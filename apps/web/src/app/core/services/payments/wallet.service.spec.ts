import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { WalletError, isWalletError } from '@core/errors';
import { firstValueFrom } from 'rxjs';

// Helper to create a fresh mock for each test
function createMockSupabaseClient() {
  return {
    from: jasmine.createSpy('from').and.returnValue({
      select: jasmine.createSpy('select').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ data: [], error: null })),
        single: jasmine.createSpy('single').and.returnValue(Promise.resolve({ data: null, error: null })),
      }),
      insert: jasmine.createSpy('insert').and.returnValue(Promise.resolve({ data: null, error: null })),
      update: jasmine.createSpy('update').and.returnValue(Promise.resolve({ data: null, error: null })),
      delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve({ data: null, error: null })),
    }),
    rpc: jasmine.createSpy('rpc').and.returnValue(Promise.resolve({ data: [{ success: true }], error: null })),
    auth: {
      getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      getSession: jasmine.createSpy('getSession').and.returnValue(Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue({ data: { subscription: { unsubscribe: jasmine.createSpy() } } }),
    },
    storage: {
      from: jasmine.createSpy('from').and.returnValue({
        upload: jasmine.createSpy('upload').and.returnValue(Promise.resolve({ data: null, error: null })),
        getPublicUrl: jasmine.createSpy('getPublicUrl').and.returnValue({ data: { publicUrl: '' } }),
      }),
    },
  };
}

const mockSupabaseClient = createMockSupabaseClient();

const mockSupabaseService = {
  client: mockSupabaseClient,
  from: mockSupabaseClient.from,
  rpc: mockSupabaseClient.rpc,
  auth: mockSupabaseClient.auth,
  storage: mockSupabaseClient.storage,
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WalletService,
        { provide: SupabaseClientService, useValue: mockSupabaseService }]
    });
    service = TestBed.inject(WalletService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have fetchBalance method', () => {
    expect(typeof service.fetchBalance).toBe('function');
  });

  it('should have fetchTransactions method', () => {
    expect(typeof service.fetchTransactions).toBe('function');
  });

  it('should have refreshBalanceAsync method', () => {
    expect(typeof service.refreshBalanceAsync).toBe('function');
  });

  it('should have createDepositPreference method', () => {
    expect(typeof service.createDepositPreference).toBe('function');
  });

  it('should have depositFunds method', () => {
    expect(typeof service.depositFunds).toBe('function');
  });

  it('should have subscribeToWalletChanges method', () => {
    expect(typeof service.subscribeToWalletChanges).toBe('function');
  });

  it('should have unsubscribeFromWalletChanges method', () => {
    expect(typeof service.unsubscribeFromWalletChanges).toBe('function');
  });

  it('should have forcePollPendingPayments method', () => {
    expect(typeof service.forcePollPendingPayments).toBe('function');
  });

  it('should have refreshPendingDepositsCount method', () => {
    expect(typeof service.refreshPendingDepositsCount).toBe('function');
  });

  it('should have issueProtectionCredit method', () => {
    expect(typeof service.issueProtectionCredit).toBe('function');
  });

  // ===========================================================================
  // RATE LIMITING TESTS
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should allow lockFunds when under rate limit', (done) => {
      // Reset rate limit state by creating fresh service
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true, transaction_id: 'tx-123' }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      freshService.lockFunds('booking-1', 100, 'Test lock').subscribe({
        next: (result) => {
          expect(result).toBeTruthy();
          expect(result.success).toBeTrue();
          done();
        },
        error: done.fail
      });
    });

    it('should reject lockFunds when rate limit exceeded (5+ calls per minute)', (done) => {
      // Reset rate limit state by creating fresh service
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true, transaction_id: 'tx-123' }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Make 5 successful calls to hit the limit
      let completedCalls = 0;
      const totalCalls = 5;

      for (let i = 0; i < totalCalls; i++) {
        freshService.lockFunds(`booking-${i}`, 100).subscribe({
          next: () => {
            completedCalls++;
            if (completedCalls === totalCalls) {
              // 6th call should be rate limited
              freshService.lockFunds('booking-overflow', 100).subscribe({
                next: () => done.fail('Should have been rate limited'),
                error: (err) => {
                  expect(isWalletError(err)).toBeTrue();
                  expect(err.code).toBe('RATE_LIMITED');
                  done();
                }
              });
            }
          },
          error: done.fail
        });
      }
    });

    it('should reject lockRentalAndDeposit when rate limit exceeded', (done) => {
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Make 5 successful calls
      let completedCalls = 0;
      for (let i = 0; i < 5; i++) {
        freshService.lockRentalAndDeposit(`booking-${i}`, 100, 50).subscribe({
          next: () => {
            completedCalls++;
            if (completedCalls === 5) {
              // 6th call should fail
              freshService.lockRentalAndDeposit('booking-overflow', 100, 50).subscribe({
                next: () => done.fail('Should have been rate limited'),
                error: (err) => {
                  expect(isWalletError(err)).toBeTrue();
                  expect(err.code).toBe('RATE_LIMITED');
                  done();
                }
              });
            }
          },
          error: done.fail
        });
      }
    });

    it('should share rate limit between lockFunds and lockRentalAndDeposit', (done) => {
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Make 3 lockFunds calls
      let completedCalls = 0;
      for (let i = 0; i < 3; i++) {
        freshService.lockFunds(`booking-lock-${i}`, 100).subscribe({
          next: () => {
            completedCalls++;
            if (completedCalls === 3) {
              // Make 2 more lockRentalAndDeposit calls (total 5)
              freshService.lockRentalAndDeposit('booking-rental-1', 100, 50).subscribe({
                next: () => {
                  freshService.lockRentalAndDeposit('booking-rental-2', 100, 50).subscribe({
                    next: () => {
                      // 6th call (either type) should fail
                      freshService.lockFunds('booking-overflow', 100).subscribe({
                        next: () => done.fail('Should have been rate limited'),
                        error: (err) => {
                          expect(err.code).toBe('RATE_LIMITED');
                          done();
                        }
                      });
                    },
                    error: done.fail
                  });
                },
                error: done.fail
              });
            }
          },
          error: done.fail
        });
      }
    });
  });

  // ===========================================================================
  // CACHE INVALIDATION TESTS
  // ===========================================================================

  describe('Cache Invalidation', () => {
    it('should have invalidateCache method', () => {
      expect(typeof service.invalidateCache).toBe('function');
    });

    it('should invalidate cache after calling invalidateCache', () => {
      // Set a cached balance
      (service as any).balance.set({ available_balance: 100, total_balance: 100 });
      (service as any).lastFetchTimestamp = Date.now();

      // Invalidate cache
      service.invalidateCache();

      // Check that timestamp was reset
      expect((service as any).lastFetchTimestamp).toBe(0);
    });
  });

  // ===========================================================================
  // WALLET ERROR CLASS TESTS
  // ===========================================================================

  describe('WalletError', () => {
    it('should create rate limited error with correct code', () => {
      const error = WalletError.rateLimited('user-123');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.category).toBe('wallet');
      expect(error.userId).toBe('user-123');
    });

    it('should create insufficient balance error with amounts', () => {
      const error = WalletError.insufficientBalance(100, 50, 'user-123');
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.message).toContain('100');
      expect(error.message).toContain('50');
    });

    it('should create lock failed error', () => {
      const error = WalletError.lockFailed('booking-123', 'Test reason');
      expect(error.code).toBe('LOCK_FAILED');
      expect(error.message).toBe('Test reason');
    });

    it('should be identifiable with isWalletError type guard', () => {
      const walletError = WalletError.rateLimited();
      const regularError = new Error('Regular error');

      expect(isWalletError(walletError)).toBeTrue();
      expect(isWalletError(regularError)).toBeFalse();
    });
  });

  // ===========================================================================
  // CONCURRENT REQUEST TESTS
  // ===========================================================================

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous lockFunds calls correctly', (done) => {
      // Create fresh mock with unique transaction IDs per call
      let callCount = 0;
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.callFake(() => {
        callCount++;
        return Promise.resolve({
          data: [{ success: true, transaction_id: `tx-${callCount}` }],
          error: null
        });
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Fire 3 requests simultaneously (within rate limit)
      const promises = [
        firstValueFrom(freshService.lockFunds('booking-1', 100)),
        firstValueFrom(freshService.lockFunds('booking-2', 200)),
        firstValueFrom(freshService.lockFunds('booking-3', 300)),
      ];

      Promise.all(promises)
        .then((results) => {
          // All 3 should succeed
          expect(results.length).toBe(3);
          results.forEach((result, i) => {
            expect(result.success).toBeTrue();
            expect(result.transaction_id).toBe(`tx-${i + 1}`);
          });
          // Verify each call got a unique transaction ID
          expect(callCount).toBe(3);
          done();
        })
        .catch(done.fail);
    });

    it('should enforce rate limit across concurrent requests', (done) => {
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true, transaction_id: 'tx-ok' }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Fire 7 requests simultaneously (exceeds rate limit of 5)
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          firstValueFrom(freshService.lockFunds(`booking-${i}`, 100))
            .then(result => ({ success: true, result }))
            .catch(error => ({ success: false, error }))
        );
      }

      Promise.all(promises)
        .then((outcomes) => {
          const successes = outcomes.filter(o => o.success);
          const failures = outcomes.filter(o => !o.success);

          // First 5 should succeed, remaining 2 should be rate limited
          expect(successes.length).toBe(5);
          expect(failures.length).toBe(2);

          // Verify failures are RATE_LIMITED errors
          failures.forEach(f => {
            expect(f.error.code).toBe('RATE_LIMITED');
          });

          done();
        })
        .catch(done.fail);
    });

    it('should handle idempotent lock requests (same booking ID)', (done) => {
      // Create mock that simulates DB idempotency (returns existing transaction)
      let firstCallMade = false;
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.callFake(() => {
        if (!firstCallMade) {
          firstCallMade = true;
          return Promise.resolve({
            data: [{ success: true, transaction_id: 'tx-first', is_existing: false }],
            error: null
          });
        }
        // Subsequent calls return existing transaction (idempotency)
        return Promise.resolve({
          data: [{ success: true, transaction_id: 'tx-first', is_existing: true }],
          error: null
        });
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Call lockFunds twice with same booking ID (simulating double-click)
      const bookingId = 'same-booking-123';

      firstValueFrom(freshService.lockFunds(bookingId, 100))
        .then((firstResult) => {
          expect(firstResult.success).toBeTrue();
          expect(firstResult.transaction_id).toBe('tx-first');

          return firstValueFrom(freshService.lockFunds(bookingId, 100));
        })
        .then((secondResult) => {
          // Second call should also succeed (idempotent)
          expect(secondResult.success).toBeTrue();
          expect(secondResult.transaction_id).toBe('tx-first');
          expect((secondResult as any).is_existing).toBeTrue();
          done();
        })
        .catch(done.fail);
    });

    it('should handle concurrent unlock requests gracefully', (done) => {
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.returnValue(Promise.resolve({
        data: [{ success: true, amount_unlocked: 100 }],
        error: null
      }));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      // Fire multiple unlock requests for the same booking simultaneously
      const promises = [
        firstValueFrom(freshService.unlockFunds('booking-1', 'Concurrent test 1')),
        firstValueFrom(freshService.unlockFunds('booking-1', 'Concurrent test 2')),
      ];

      Promise.all(promises)
        .then((results) => {
          // Both should complete (DB handles idempotency)
          results.forEach(result => {
            expect(result.success).toBeTrue();
          });
          done();
        })
        .catch(done.fail);
    });

    it('should handle RPC timeout/error during concurrent requests', (done) => {
      let callCount = 0;
      const freshMock = createMockSupabaseClient();
      freshMock.rpc.and.callFake(() => {
        callCount++;
        // First 2 calls succeed, 3rd fails
        if (callCount <= 2) {
          return Promise.resolve({
            data: [{ success: true, transaction_id: `tx-${callCount}` }],
            error: null
          });
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Database timeout', code: '57014' }
        });
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WalletService,
          { provide: SupabaseClientService, useValue: freshMock }
        ]
      });

      const freshService = TestBed.inject(WalletService);

      const promises: Promise<any>[] = [
        firstValueFrom(freshService.lockFunds('booking-1', 100))
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error })),
        firstValueFrom(freshService.lockFunds('booking-2', 100))
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error })),
        firstValueFrom(freshService.lockFunds('booking-3', 100))
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error })),
      ];

      Promise.all(promises)
        .then((outcomes) => {
          const successes = outcomes.filter(o => o.success);
          const failures = outcomes.filter(o => !o.success);

          expect(successes.length).toBe(2);
          expect(failures.length).toBe(1);

          // Failed request should have LOCK_FAILED error
          expect(failures[0].error.code).toBe('LOCK_FAILED');
          done();
        })
        .catch(done.fail);
    });
  });

});
