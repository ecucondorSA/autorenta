import { TestBed } from '@angular/core/testing';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { PublishCarPhotoService, PhotoPreview } from './publish-car-photo.service';

describe('PublishCarPhotoService', () => {
  let service: PublishCarPhotoService;
  let carsServiceSpy: jasmine.SpyObj<CarsService>;
  let notificationsSpy: jasmine.SpyObj<NotificationManagerService>;

  beforeEach(() => {
    carsServiceSpy = jasmine.createSpyObj('CarsService', ['getCarPhotos']);
    notificationsSpy = jasmine.createSpyObj('NotificationManagerService', ['warning']);

    TestBed.configureTestingModule({
      providers: [
        PublishCarPhotoService,
        { provide: CarsService, useValue: carsServiceSpy },
        { provide: NotificationManagerService, useValue: notificationsSpy },
      ],
    });

    service = TestBed.inject(PublishCarPhotoService);
  });

  it('debe cargar fotos existentes y llenar uploadedPhotos', async () => {
    const carId = 'test-car-id';
    carsServiceSpy.getCarPhotos.and.resolveTo([
      { url: 'https://example.com/a.jpg', position: 1 } as any,
      { url: 'https://example.com/b.jpg', position: 2 } as any,
    ]);

    // Mock fetch para devolver blob
    spyOn(window, 'fetch').and.callFake(async (url: RequestInfo | URL) => {
      const data = new Uint8Array([1, 2, 3]);
      return new Response(data, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
    });

    await service.loadExistingPhotos(carId);

    const previews: PhotoPreview[] = service.uploadedPhotos();
    expect(previews.length).toBe(2);
    expect(previews[0].preview).toContain('https://example.com/a.jpg');
    expect(previews[1].preview).toContain('https://example.com/b.jpg');
  });

  it('muestra advertencia si fetch falla', async () => {
    const carId = 'test-car-id';
    carsServiceSpy.getCarPhotos.and.resolveTo([
      { url: 'https://bad.com/a.jpg', position: 1 } as any,
    ]);
    spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 500 }));

    await service.loadExistingPhotos(carId);

    expect(notificationsSpy.warning).toHaveBeenCalled();
  });
});
