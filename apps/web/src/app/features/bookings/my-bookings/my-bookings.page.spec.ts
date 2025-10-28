import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { MyBookingsPage } from './my-bookings.page';

describe('MyBookingsPage - Sprint 3', () => {
  let component: MyBookingsPage;
  let fixture: ComponentFixture<MyBookingsPage>;
  let bookingsService: jasmine.SpyObj<BookingsService>;

  const mockBooking: Booking = {
    id: 'booking-123',
    car_id: 'car-456',
    user_id: 'user-789',
    renter_id: 'user-789',
    owner_id: 'owner-999',
    start_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h from now
    end_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    status: 'confirmed',
    total_amount: 5000,
    currency: 'ARS',
    created_at: new Date().toISOString(),
    car_title: 'Toyota Corolla 2020',
    car_brand: 'Toyota',
    car_model: 'Corolla',
    car_year: 2020,
    car_city: 'Buenos Aires',
    car_province: 'Buenos Aires',
    main_photo_url: 'https://example.com/photo.jpg',
  };

  beforeEach(async () => {
    const bookingsServiceSpy = jasmine.createSpyObj('BookingsService', [
      'getMyBookings',
      'cancelBooking',
      'getOwnerContact',
    ]);

    await TestBed.configureTestingModule({
      imports: [MyBookingsPage, TranslateModule.forRoot()],
      providers: [{ provide: BookingsService, useValue: bookingsServiceSpy }],
    }).compileComponents();

    bookingsService = TestBed.inject(BookingsService) as jasmine.SpyObj<BookingsService>;
    fixture = TestBed.createComponent(MyBookingsPage);
    component = fixture.componentInstance;
  });

  describe('3.1 - Cancelación válida (>24h)', () => {
    it('debería cancelar exitosamente cuando faltan más de 24 horas', async () => {
      // Arrange
      const booking25hAway: Booking = {
        ...mockBooking,
        start_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // 25h from now
      };

      bookingsService.cancelBooking.and.returnValue(Promise.resolve({ success: true }));
      bookingsService.getMyBookings.and.returnValue(Promise.resolve([booking25hAway]));

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(booking25hAway.id);

      // Assert
      expect(bookingsService.cancelBooking).toHaveBeenCalledWith(booking25hAway.id);
      expect(window.alert).toHaveBeenCalledWith('✅ Reserva cancelada exitosamente');
      expect(bookingsService.getMyBookings).toHaveBeenCalled();
    });

    it('debería actualizar la lista de reservas después de cancelar', async () => {
      // Arrange
      const updatedBookings = [{ ...mockBooking, status: 'cancelled' as const }];
      bookingsService.cancelBooking.and.returnValue(Promise.resolve({ success: true }));
      bookingsService.getMyBookings.and.returnValue(Promise.resolve(updatedBookings));

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert
      expect(component.bookings()).toEqual(updatedBookings);
    });

    it('debería mostrar mensaje de éxito al cancelar', async () => {
      // Arrange
      bookingsService.cancelBooking.and.returnValue(Promise.resolve({ success: true }));
      bookingsService.getMyBookings.and.returnValue(Promise.resolve([]));

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert
      expect(window.alert).toHaveBeenCalledWith('✅ Reserva cancelada exitosamente');
    });
  });

  describe('3.2 - Cancelación bloqueada (<24h)', () => {
    it('debería bloquear cancelación cuando faltan menos de 24 horas', async () => {
      // Arrange
      const booking23hAway: Booking = {
        ...mockBooking,
        start_at: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(), // 23h from now
      };

      bookingsService.cancelBooking.and.returnValue(
        Promise.resolve({
          success: false,
          error: 'Solo puedes cancelar con al menos 24 horas de anticipación',
        }),
      );

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(booking23hAway.id);

      // Assert
      expect(bookingsService.cancelBooking).toHaveBeenCalledWith(booking23hAway.id);
      expect(window.alert).toHaveBeenCalledWith(
        '❌ Error: Solo puedes cancelar con al menos 24 horas de anticipación',
      );
    });

    it('no debería cambiar el estado cuando la cancelación falla', async () => {
      // Arrange
      const initialBookings = [mockBooking];
      component.bookings.set(initialBookings);

      bookingsService.cancelBooking.and.returnValue(
        Promise.resolve({
          success: false,
          error: 'Solo puedes cancelar con al menos 24 horas de anticipación',
        }),
      );
      bookingsService.getMyBookings.and.returnValue(Promise.resolve(initialBookings));

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert - no debería recargar si hay error
      expect(bookingsService.getMyBookings).not.toHaveBeenCalled();
    });

    it('debería mostrar mensaje de error apropiado', async () => {
      // Arrange
      const errorMessage = 'Solo puedes cancelar con al menos 24 horas de anticipación';
      bookingsService.cancelBooking.and.returnValue(
        Promise.resolve({ success: false, error: errorMessage }),
      );

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert
      expect(window.alert).toHaveBeenCalledWith(`❌ Error: ${errorMessage}`);
    });
  });

  describe('3.3 - WhatsApp con teléfono', () => {
    it('debería generar link de WhatsApp correcto con teléfono del owner', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: '5491123456789',
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'open');

      // Act
      await component.openChat(mockBooking);

      // Assert
      expect(bookingsService.getOwnerContact).toHaveBeenCalledWith('owner-999');
      expect(window.open).toHaveBeenCalled();

      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      const whatsappUrl = callArgs[0] as string;

      expect(whatsappUrl).toContain('https://wa.me/5491123456789');
      expect(whatsappUrl).toContain('text=');
    });

    it('debería incluir detalles del booking en el mensaje de WhatsApp', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: '5491123456789',
        name: 'Juan Pérez',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'open');

      // Act
      await component.openChat(mockBooking);

      // Assert
      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      const whatsappUrl = callArgs[0] as string;

      expect(whatsappUrl).toContain(encodeURIComponent(mockBooking.car_title!));
    });

    it('debería abrir WhatsApp en nueva pestaña', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: '5491123456789',
        name: 'Juan Pérez',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'open');

      // Act
      await component.openChat(mockBooking);

      // Assert
      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      expect(callArgs[1]).toBe('_blank');
    });
  });

  describe('3.4 - WhatsApp sin teléfono (fallback)', () => {
    it('debería mostrar error cuando el owner no tiene teléfono', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: undefined,
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'alert');
      spyOn(window, 'open');

      // Act
      await component.openChat(mockBooking);

      // Assert
      expect(window.alert).toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();

      const alertMessage = (window.alert as jasmine.Spy).calls.mostRecent().args[0];
      expect(alertMessage).toContain('📧 Contacto del propietario');
    });

    it('debería sugerir contacto alternativo por email', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: undefined,
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'alert');

      // Act
      await component.openChat(mockBooking);

      // Assert
      const alertMessage = (window.alert as jasmine.Spy).calls.mostRecent().args[0];
      expect(alertMessage).toContain('Email: juan@example.com');
      expect(alertMessage).toContain('email');
    });

    it('debería mostrar nombre del propietario en fallback', async () => {
      // Arrange
      const ownerContact = {
        success: true,
        phone: undefined,
        name: 'Juan Pérez',
        email: 'juan@example.com',
      };

      bookingsService.getOwnerContact.and.returnValue(Promise.resolve(ownerContact));
      spyOn(window, 'alert');

      // Act
      await component.openChat(mockBooking);

      // Assert
      const alertMessage = (window.alert as jasmine.Spy).calls.mostRecent().args[0];
      expect(alertMessage).toContain('Juan Pérez');
    });
  });

  describe('3.5 - Mapa con GPS', () => {
    it('debería abrir Google Maps con coordenadas cuando están disponibles', () => {
      // Arrange
      const bookingWithGPS: Booking = {
        ...mockBooking,
        car_city: 'Buenos Aires',
        car_province: 'Buenos Aires',
      };

      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithGPS);

      // Assert
      expect(window.open).toHaveBeenCalled();
      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      const mapsUrl = callArgs[0] as string;

      expect(mapsUrl).toContain('https://www.google.com/maps/search/');
      expect(mapsUrl).toContain('api=1');
    });

    it('debería usar ciudad y provincia en la búsqueda de Google Maps', () => {
      // Arrange
      const bookingWithLocation: Booking = {
        ...mockBooking,
        car_city: 'Buenos Aires',
        car_province: 'Buenos Aires',
      };

      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithLocation);

      // Assert
      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      const mapsUrl = callArgs[0] as string;

      expect(mapsUrl).toContain(encodeURIComponent('Buenos Aires, Buenos Aires'));
    });

    it('debería abrir el mapa en nueva pestaña', () => {
      // Arrange
      const bookingWithLocation: Booking = {
        ...mockBooking,
        car_city: 'Córdoba',
        car_province: 'Córdoba',
      };

      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithLocation);

      // Assert
      const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
      expect(callArgs[1]).toBe('_blank');
    });
  });

  describe('3.6 - Mapa sin GPS (fallback)', () => {
    it('debería mostrar mensaje cuando no hay ubicación disponible', () => {
      // Arrange
      const bookingWithoutLocation: Booking = {
        ...mockBooking,
        car_city: undefined,
        car_province: undefined,
      };

      spyOn(window, 'alert');
      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithoutLocation);

      // Assert
      expect(window.alert).toHaveBeenCalledWith('🗺️ Ubicación no disponible para esta reserva.');
      expect(window.open).not.toHaveBeenCalled();
    });

    it('debería mostrar mensaje si solo falta provincia', () => {
      // Arrange
      const bookingWithPartialLocation: Booking = {
        ...mockBooking,
        car_city: 'Buenos Aires',
        car_province: undefined,
      };

      spyOn(window, 'alert');
      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithPartialLocation);

      // Assert
      expect(window.alert).toHaveBeenCalledWith('🗺️ Ubicación no disponible para esta reserva.');
    });

    it('debería mostrar mensaje si solo falta ciudad', () => {
      // Arrange
      const bookingWithPartialLocation: Booking = {
        ...mockBooking,
        car_city: undefined,
        car_province: 'Buenos Aires',
      };

      spyOn(window, 'alert');
      spyOn(window, 'open');

      // Act
      component.showMap(bookingWithPartialLocation);

      // Assert
      expect(window.alert).toHaveBeenCalledWith('🗺️ Ubicación no disponible para esta reserva.');
    });
  });

  describe('Edge Cases y Validaciones', () => {
    it('debería manejar error al obtener contacto del owner', async () => {
      // Arrange
      bookingsService.getOwnerContact.and.returnValue(
        Promise.resolve({ success: false, error: 'Owner not found' }),
      );

      spyOn(window, 'alert');
      spyOn(window, 'open');

      // Act
      await component.openChat(mockBooking);

      // Assert
      expect(window.alert).toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();
    });

    it('debería manejar booking sin owner_id', async () => {
      // Arrange
      const bookingWithoutOwner: Booking = {
        ...mockBooking,
        owner_id: undefined,
      };

      spyOn(window, 'alert');

      // Act
      await component.openChat(bookingWithoutOwner);

      // Assert
      expect(window.alert).toHaveBeenCalledWith(
        '❌ No se pudo obtener información del propietario',
      );
    });

    it('debería cancelar la operación si el usuario rechaza la confirmación', async () => {
      // Arrange
      spyOn(window, 'confirm').and.returnValue(false);

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert
      expect(bookingsService.cancelBooking).not.toHaveBeenCalled();
    });

    it('debería manejar error inesperado en cancelación', async () => {
      // Arrange
      bookingsService.cancelBooking.and.returnValue(Promise.reject(new Error('Network error')));
      bookingsService.getMyBookings.and.returnValue(Promise.resolve([]));

      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      spyOn(console, 'error');

      // Act
      await component.cancelBooking(mockBooking.id);

      // Assert
      expect(window.alert).toHaveBeenCalledWith('❌ Error inesperado al cancelar la reserva');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
