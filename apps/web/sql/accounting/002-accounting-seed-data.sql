-- =====================================================
-- PLAN DE CUENTAS INICIAL - AutoRenta
-- Basado en NIIF y adaptado a marketplace de alquiler P2P
-- =====================================================

-- ACTIVOS (1000-1999)
INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_system, description) VALUES
-- Efectivo y Equivalentes
('1105', 'Caja General', 'ASSET', 'CURRENT_ASSET', true, 'Efectivo disponible en caja'),
('1110', 'Bancos Cuenta Corriente', 'ASSET', 'CURRENT_ASSET', true, 'Fondos en cuentas bancarias operativas'),
('1115', 'MercadoPago - Saldo Disponible', 'ASSET', 'CURRENT_ASSET', true, 'Fondos disponibles en MercadoPago'),
('1120', 'Binance - Wallet USDT', 'ASSET', 'CURRENT_ASSET', true, 'Criptomonedas en Binance'),

-- Cuentas por Cobrar
('1305', 'Comisiones por Cobrar', 'ASSET', 'CURRENT_ASSET', true, 'Comisiones pendientes de cobro'),
('1310', 'Retiros Pendientes de Proceso', 'ASSET', 'CURRENT_ASSET', true, 'Retiros solicitados no completados'),

-- PASIVOS (2000-2999)
-- Pasivos con Usuarios (NIIF 15 - Ingresos Diferidos)
('2805', 'Depósitos de Clientes - Billetera', 'LIABILITY', 'CURRENT_LIABILITY', true, 'Saldo en billetera de usuarios (pasivo por contrato NIIF 15)'),
('2810', 'Depósitos de Garantía Bloqueados', 'LIABILITY', 'CURRENT_LIABILITY', true, 'Franquicias/depósitos de seguridad bloqueados durante alquiler'),
('2815', 'Pagos a Propietarios Pendientes', 'LIABILITY', 'CURRENT_LIABILITY', true, 'Montos a transferir a propietarios al finalizar alquiler'),
('2820', 'Ingresos Diferidos - Reservas', 'LIABILITY', 'CURRENT_LIABILITY', true, 'Pagos recibidos por reservas no completadas (NIIF 15)'),

-- Provisiones (NIIF 37)
('2905', 'Provisión FGO - Fondo de Garantía', 'LIABILITY', 'PROVISION', true, 'Provisión para siniestros futuros según NIIF 37'),
('2910', 'Provisión para Reclamos', 'LIABILITY', 'PROVISION', true, 'Provisión estimada para reclamos en proceso'),
('2915', 'Provisión para Reembolsos', 'LIABILITY', 'PROVISION', true, 'Provisión para cancelaciones y devoluciones'),

-- PATRIMONIO (3000-3999)
('3105', 'Capital Social', 'EQUITY', 'EQUITY', true, 'Capital aportado por socios'),
('3605', 'Utilidades Acumuladas', 'EQUITY', 'RETAINED_EARNINGS', true, 'Ganancias retenidas de períodos anteriores'),
('3610', 'Utilidad del Ejercicio', 'EQUITY', 'CURRENT_PERIOD_EARNINGS', true, 'Resultado del período actual'),

-- INGRESOS (4000-4999)
-- Según NIIF 15, solo reconocer comisiones como ingreso (rol de agente)
('4135', 'Ingreso por Comisiones - Alquileres', 'INCOME', 'OPERATING_INCOME', true, 'Comisión del 10% en transacciones completadas (NIIF 15)'),
('4140', 'Ingreso por Comisiones - Seguros', 'INCOME', 'OPERATING_INCOME', true, 'Comisión por venta de seguros adicionales'),
('4145', 'Ingreso por Tarifas de Servicio', 'INCOME', 'OPERATING_INCOME', true, 'Otras tarifas cobradas a usuarios'),
('4150', 'Ingreso por Penalizaciones', 'INCOME', 'OTHER_INCOME', true, 'Ingresos por penalizaciones o multas'),
('4155', 'Ingreso Financiero - Intereses', 'INCOME', 'FINANCIAL_INCOME', true, 'Rendimientos financieros de fondos en custodia'),
('4160', 'Liberación de Depósito de Garantía', 'INCOME', 'OTHER_INCOME', true, 'Depósitos de garantía retenidos por daños'),

-- GASTOS (5000-5999)
('5105', 'Costo de Transacción - MercadoPago', 'EXPENSE', 'OPERATING_EXPENSE', true, 'Comisiones pagadas a pasarela de pago'),
('5110', 'Costo de Transacción - Binance', 'EXPENSE', 'OPERATING_EXPENSE', true, 'Fees de transacciones cripto'),
('5205', 'Gastos por Siniestros - FGO', 'EXPENSE', 'OPERATING_EXPENSE', true, 'Siniestros pagados del Fondo de Garantía'),
('5210', 'Reembolsos a Usuarios', 'EXPENSE', 'OPERATING_EXPENSE', true, 'Devoluciones por cancelaciones'),
('5305', 'Gastos Administrativos', 'EXPENSE', 'ADMINISTRATIVE_EXPENSE', true, 'Gastos generales de operación'),
('5310', 'Gastos de Marketing', 'EXPENSE', 'MARKETING_EXPENSE', true, 'Inversión en publicidad y marketing'),
('5405', 'Gastos Bancarios', 'EXPENSE', 'FINANCIAL_EXPENSE', true, 'Comisiones bancarias y mantenciones'),
('5410', 'Diferencia Cambiaria - Pérdida', 'EXPENSE', 'FINANCIAL_EXPENSE', true, 'Pérdidas por fluctuaciones de tipo de cambio');

-- Cuentas de Control y Conciliación
INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_system, description) VALUES
('1901', 'Cuenta de Control - Wallet Total', 'ASSET', 'CONTROL', true, 'Suma de todos los saldos en billetera (debe = pasivo 2805)'),
('2901', 'Cuenta de Control - Provisiones Total', 'LIABILITY', 'CONTROL', true, 'Suma de todas las provisiones activas');

COMMENT ON TABLE accounting_accounts IS 'Plan de cuentas contables configurado según NIIF 15 y NIIF 37';
