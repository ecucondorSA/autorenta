import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService, Toast } from './toast.service';
import { testProviders } from '@app/testing/test-providers';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...testProviders, ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clear();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should start with empty notifications', () => {
      expect(service.notifications()).toEqual([]);
    });
  });

  describe('success()', () => {
    it('should add success notification with correct properties', () => {
      service.success('Exito', 'Operacion completada');

      const notifications = service.notifications();
      expect(notifications.length).toBe(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].title).toBe('Exito');
      expect(notifications[0].message).toBe('Operacion completada');
      expect(notifications[0].icon).toBe('✓');
    });

    it('should use default duration of 5000ms', () => {
      service.success('Test', 'Message');
      expect(service.notifications()[0].duration).toBe(5000);
    });

    it('should accept custom duration', () => {
      service.success('Test', 'Message', 3000);
      expect(service.notifications()[0].duration).toBe(3000);
    });

    it('should generate unique id', () => {
      service.success('Test', 'Message');
      const id = service.notifications()[0].id;
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });
  });

  describe('error()', () => {
    it('should add error notification with correct properties', () => {
      service.error('Error', 'Algo salio mal');

      const notification = service.notifications()[0];
      expect(notification.type).toBe('error');
      expect(notification.title).toBe('Error');
      expect(notification.message).toBe('Algo salio mal');
      expect(notification.icon).toBe('✕');
    });

    it('should use default duration of 7000ms', () => {
      service.error('Error', 'Message');
      expect(service.notifications()[0].duration).toBe(7000);
    });

    it('should accept custom duration', () => {
      service.error('Error', 'Message', 10000);
      expect(service.notifications()[0].duration).toBe(10000);
    });
  });

  describe('warning()', () => {
    it('should add warning notification with correct properties', () => {
      service.warning('Advertencia', 'Cuidado');

      const notification = service.notifications()[0];
      expect(notification.type).toBe('warning');
      expect(notification.title).toBe('Advertencia');
      expect(notification.message).toBe('Cuidado');
      expect(notification.icon).toBe('⚠');
    });

    it('should use default duration of 6000ms', () => {
      service.warning('Warning', 'Message');
      expect(service.notifications()[0].duration).toBe(6000);
    });
  });

  describe('info()', () => {
    it('should add info notification with correct properties', () => {
      service.info('Info', 'Informacion importante');

      const notification = service.notifications()[0];
      expect(notification.type).toBe('info');
      expect(notification.title).toBe('Info');
      expect(notification.message).toBe('Informacion importante');
      expect(notification.icon).toBe('ℹ');
    });

    it('should use default duration of 5000ms', () => {
      service.info('Info', 'Message');
      expect(service.notifications()[0].duration).toBe(5000);
    });
  });

  describe('show()', () => {
    it('should add custom notification', () => {
      const custom: Toast = {
        id: 'custom-1',
        type: 'success',
        title: 'Custom',
        message: 'Custom message',
        duration: 1000,
        icon: '🎉',
      };

      service.show(custom);

      expect(service.notifications()).toContain(custom);
      expect(service.notifications()[0].icon).toBe('🎉');
    });

    it('should append to existing notifications', () => {
      service.success('First', 'Message 1');
      service.error('Second', 'Message 2');

      expect(service.notifications().length).toBe(2);
      expect(service.notifications()[0].title).toBe('First');
      expect(service.notifications()[1].title).toBe('Second');
    });

    it('should auto-remove after duration', fakeAsync(() => {
      service.success('Test', 'Message', 1000);
      expect(service.notifications().length).toBe(1);

      tick(1000);
      expect(service.notifications().length).toBe(0);
    }));

    it('should not auto-remove if duration is 0', fakeAsync(() => {
      service.show({
        id: 'persistent',
        type: 'info',
        title: 'Persistent',
        message: 'This stays',
        duration: 0,
      });

      tick(10000);
      expect(service.notifications().length).toBe(1);
    }));

    it('should not auto-remove if duration is undefined', fakeAsync(() => {
      service.show({
        id: 'no-duration',
        type: 'info',
        title: 'No Duration',
        message: 'This stays',
      });

      tick(10000);
      expect(service.notifications().length).toBe(1);
    }));

    it('should handle multiple notifications with different durations', fakeAsync(() => {
      service.success('Short', 'Message', 1000);
      service.error('Long', 'Message', 3000);

      expect(service.notifications().length).toBe(2);

      tick(1000);
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].title).toBe('Long');

      tick(2000);
      expect(service.notifications().length).toBe(0);
    }));
  });

  describe('remove()', () => {
    it('should remove notification by id', () => {
      service.success('Test1', 'Message1');
      service.success('Test2', 'Message2');

      const firstId = service.notifications()[0].id;
      service.remove(firstId);

      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].title).toBe('Test2');
    });

    it('should do nothing if id not found', () => {
      service.success('Test', 'Message');
      const originalLength = service.notifications().length;

      service.remove('non-existent-id');

      expect(service.notifications().length).toBe(originalLength);
    });

    it('should remove correct notification from middle of list', () => {
      service.success('First', 'Message');
      service.error('Second', 'Message');
      service.warning('Third', 'Message');

      const middleId = service.notifications()[1].id;
      service.remove(middleId);

      expect(service.notifications().length).toBe(2);
      expect(service.notifications()[0].title).toBe('First');
      expect(service.notifications()[1].title).toBe('Third');
    });
  });

  describe('clear()', () => {
    it('should remove all notifications', () => {
      service.success('Test1', 'Message1');
      service.error('Test2', 'Message2');
      service.warning('Test3', 'Message3');
      service.info('Test4', 'Message4');

      expect(service.notifications().length).toBe(4);

      service.clear();

      expect(service.notifications().length).toBe(0);
      expect(service.notifications()).toEqual([]);
    });

    it('should work on empty notifications list', () => {
      service.clear();
      expect(service.notifications().length).toBe(0);
    });
  });

  describe('generateId()', () => {
    it('should generate unique ids for consecutive calls', () => {
      service.success('Test1', 'Message1');
      service.success('Test2', 'Message2');
      service.success('Test3', 'Message3');

      const ids = service.notifications().map((n) => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should generate ids with correct format', () => {
      service.success('Test', 'Message');
      const id = service.notifications()[0].id;

      expect(id).toMatch(/^notification-\d+-[a-z0-9]{7}$/);
    });
  });

  describe('signal reactivity', () => {
    it('should update signal when adding notification', () => {
      const initialValue = service.notifications();
      service.success('Test', 'Message');
      const newValue = service.notifications();

      expect(newValue).not.toBe(initialValue);
      expect(newValue.length).toBe(initialValue.length + 1);
    });

    it('should update signal when removing notification', () => {
      service.success('Test', 'Message');
      const beforeRemove = service.notifications();

      service.remove(beforeRemove[0].id);
      const afterRemove = service.notifications();

      expect(afterRemove).not.toBe(beforeRemove);
      expect(afterRemove.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings for title and message', () => {
      service.success('', '');

      const notification = service.notifications()[0];
      expect(notification.title).toBe('');
      expect(notification.message).toBe('');
    });

    it('should handle special characters in title and message', () => {
      const specialTitle = '<script>alert("xss")</script>';
      const specialMessage = '¡Hola! ¿Cómo estás? 日本語 🎉';

      service.info(specialTitle, specialMessage);

      const notification = service.notifications()[0];
      expect(notification.title).toBe(specialTitle);
      expect(notification.message).toBe(specialMessage);
    });

    it('should handle very long duration', fakeAsync(() => {
      service.success('Test', 'Message', 999999999);
      expect(service.notifications().length).toBe(1);

      tick(1000);
      expect(service.notifications().length).toBe(1);
    }));
  });
});
