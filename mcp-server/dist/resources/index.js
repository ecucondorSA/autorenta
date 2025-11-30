export function registerResources(server, supabase) {
    // Recurso: Estado general de la plataforma
    server.registerResource('autorenta://platform/status', async () => {
        const stats = await supabase.getStatistics();
        return {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            database: 'connected',
            statistics: stats,
            health: 'operational'
        };
    }, {
        name: 'Platform Status',
        description: 'Estado general y estadísticas de AutoRenta',
        mimeType: 'application/json'
    });
    // Recurso: Lista de autos disponibles
    server.registerResource('autorenta://cars/available', async () => {
        const cars = await supabase.getCars({ status: 'active', limit: 100 });
        return {
            total: cars.length,
            cars: cars.map((car) => ({
                id: car.id,
                brand: car.brand,
                model: car.model,
                year: car.year,
                daily_rate: car.daily_rate,
                location: car.location,
                owner: car.profiles?.full_name,
                photos: car.car_photos?.length || 0,
                rating: car.rating,
                status: car.status
            }))
        };
    }, {
        name: 'Available Cars',
        description: 'Lista de autos disponibles para renta',
        mimeType: 'application/json'
    });
    // Recurso: Reservas activas
    server.registerResource('autorenta://bookings/active', async () => {
        const bookings = await supabase.getBookings({ status: 'active', limit: 50 });
        return {
            total: bookings.length,
            bookings: bookings.map((booking) => ({
                id: booking.id,
                car: `${booking.cars?.brand} ${booking.cars?.model}`,
                renter: booking.renter?.full_name,
                owner: booking.owner?.full_name,
                start_date: booking.start_date,
                end_date: booking.end_date,
                total_amount: booking.total_amount,
                status: booking.status,
                created_at: booking.created_at
            }))
        };
    }, {
        name: 'Active Bookings',
        description: 'Reservas activas en el sistema',
        mimeType: 'application/json'
    });
    // Recurso: Reservas pendientes de aprobación
    server.registerResource('autorenta://bookings/pending', async () => {
        const bookings = await supabase.getBookings({ status: 'pending', limit: 50 });
        return {
            total: bookings.length,
            require_action: true,
            bookings: bookings.map((booking) => ({
                id: booking.id,
                car: `${booking.cars?.brand} ${booking.cars?.model}`,
                renter: booking.renter?.full_name,
                owner: booking.owner?.full_name,
                start_date: booking.start_date,
                end_date: booking.end_date,
                total_amount: booking.total_amount,
                requested_at: booking.created_at,
                hours_pending: Math.floor((Date.now() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60))
            }))
        };
    }, {
        name: 'Pending Bookings',
        description: 'Reservas pendientes de aprobación por los propietarios',
        mimeType: 'application/json'
    });
    // Recurso: Detalle de un auto específico
    server.registerResource('autorenta://car/details', async (params) => {
        const carId = params?.carId;
        if (!carId) {
            throw new Error('carId is required');
        }
        const car = await supabase.getCarDetails(carId);
        return {
            car: {
                id: car.id,
                brand: car.brand,
                model: car.model,
                year: car.year,
                license_plate: car.license_plate,
                daily_rate: car.daily_rate,
                location: car.location,
                description: car.description,
                status: car.status,
                features: car.car_features,
                photos: car.car_photos?.map((p) => ({
                    url: p.url,
                    is_cover: p.is_cover
                })),
                owner: {
                    id: car.profiles?.id,
                    name: car.profiles?.full_name,
                    avatar: car.profiles?.avatar_url,
                    verification_status: car.profiles?.verification_status
                },
                reviews: car.reviews?.map((r) => ({
                    rating: r.rating,
                    comment: r.comment,
                    reviewer: r.profiles?.full_name,
                    date: r.created_at
                })),
                stats: {
                    total_bookings: car.total_bookings || 0,
                    rating: car.rating || 0,
                    response_time: car.response_time || 'N/A'
                }
            }
        };
    }, {
        name: 'Car Details',
        description: 'Información detallada de un auto específico',
        mimeType: 'application/json'
    });
    // Recurso: Perfil de usuario
    server.registerResource('autorenta://user/profile', async (params) => {
        const userId = params?.userId;
        if (!userId) {
            throw new Error('userId is required');
        }
        const profile = await supabase.getUserProfile(userId);
        return {
            profile: {
                id: profile.id,
                name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                role: profile.role,
                verification_status: profile.verification_status,
                wallet: {
                    balance: profile.wallet_balance,
                    locked: profile.wallet_locked_balance
                },
                stats: {
                    cars_owned: profile.cars?.length || 0,
                    bookings_made: profile.bookings?.length || 0,
                    member_since: profile.created_at
                },
                recent_activity: {
                    transactions: profile.wallet_transactions?.slice(0, 5),
                    cars: profile.cars?.slice(0, 5),
                    bookings: profile.bookings?.slice(0, 5)
                }
            }
        };
    }, {
        name: 'User Profile',
        description: 'Perfil completo de un usuario',
        mimeType: 'application/json'
    });
    // Recurso: Resumen diario de operaciones
    server.registerResource('autorenta://daily/summary', async () => {
        const today = new Date().toISOString().split('T')[0];
        const stats = await supabase.getStatistics();
        // Obtener bookings del día
        const bookingsToday = await supabase.getBookings({ limit: 100 });
        const todayBookings = bookingsToday.filter((b) => b.created_at.startsWith(today));
        return {
            date: today,
            summary: {
                new_bookings: todayBookings.length,
                active_bookings: bookingsToday.filter((b) => b.status === 'active').length,
                pending_approvals: bookingsToday.filter((b) => b.status === 'pending').length,
                platform_stats: stats,
                alerts: [
                    todayBookings.length > 10 && 'Alto volumen de reservas hoy',
                    bookingsToday.filter((b) => b.status === 'pending').length > 5 &&
                        'Múltiples reservas pendientes de aprobación'
                ].filter(Boolean)
            }
        };
    }, {
        name: 'Daily Summary',
        description: 'Resumen diario de operaciones de la plataforma',
        mimeType: 'application/json'
    });
    // Recurso: Búsqueda de autos con filtros
    server.registerResource('autorenta://search/cars', async (params) => {
        const { brand, model, year, minPrice, maxPrice, location, status = 'active' } = params || {};
        let cars = await supabase.getCars({ status });
        // Aplicar filtros
        if (brand) {
            cars = cars.filter((c) => c.brand.toLowerCase().includes(brand.toLowerCase()));
        }
        if (model) {
            cars = cars.filter((c) => c.model.toLowerCase().includes(model.toLowerCase()));
        }
        if (year) {
            cars = cars.filter((c) => c.year === year);
        }
        if (minPrice) {
            cars = cars.filter((c) => c.daily_rate >= minPrice);
        }
        if (maxPrice) {
            cars = cars.filter((c) => c.daily_rate <= maxPrice);
        }
        if (location) {
            cars = cars.filter((c) => c.location?.toLowerCase().includes(location.toLowerCase()));
        }
        return {
            query: params,
            total: cars.length,
            results: cars.map((car) => ({
                id: car.id,
                brand: car.brand,
                model: car.model,
                year: car.year,
                daily_rate: car.daily_rate,
                location: car.location,
                photos: car.car_photos?.length || 0,
                rating: car.rating || 0
            }))
        };
    }, {
        name: 'Search Cars',
        description: 'Búsqueda de autos con filtros avanzados',
        mimeType: 'application/json'
    });
    console.error('Resources registered successfully');
}
