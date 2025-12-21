import { TestBed } from '@angular/core/testing';
import { NotificationTemplatesService } from './notification-templates.service';

describe('NotificationTemplatesService', () => {
  let service: NotificationTemplatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationTemplatesService]
    });
    service = TestBed.inject(NotificationTemplatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have getTemplate method', () => {
    expect(typeof service.getTemplate).toBe('function');
  });

  it('should have validateVariables method', () => {
    expect(typeof service.validateVariables).toBe('function');
  });

});
