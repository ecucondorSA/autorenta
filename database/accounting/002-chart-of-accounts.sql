-- =====================================================
-- PLAN DE CUENTAS PARA AUTORENTA
-- Basado en NIIF y adaptado a plataforma P2P
-- =====================================================

-- Limpiar datos previos (solo desarrollo)
TRUNCATE TABLE accounting_accounts CASCADE;

-- =====================================================
-- 1. ACTIVOS (ASSET)
-- =====================================================

-- 1.1 ACTIVOS CORRIENTES - EFECTIVO
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('1.1.1', 'Caja y Bancos', 'asset', 'current_asset', 'Efectivo disponible'),
('1.1.1.01', 'Caja General', 'asset', 'current_asset', 'Efectivo en caja'),
('1.1.1.02', 'Banco - Cuenta Corriente', 'asset', 'current_asset', 'Cuenta bancaria corriente'),
('1.1.1.03', 'MercadoPago - Wallet', 'asset', 'current_asset', 'Saldo en MercadoPago'),
('1.1.1.04', 'Stripe - Wallet', 'asset', 'current_asset', 'Saldo en Stripe');

-- 1.2 ACTIVOS CORRIENTES - CUENTAS POR COBRAR
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('1.1.2', 'Cuentas por Cobrar', 'asset', 'current_asset', 'Montos pendientes de cobro'),
('1.1.2.01', 'Comisiones por Cobrar', 'asset', 'current_asset', 'Comisiones devengadas pendientes'),
('1.1.2.02', 'Retenciones Pendientes', 'asset', 'current_asset', 'Retenciones fiscales pendientes');

-- =====================================================
-- 2. PASIVOS (LIABILITY)
-- =====================================================

-- 2.1 PASIVOS CORRIENTES - OBLIGACIONES CON USUARIOS (NIIF 15)
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('2.1.1', 'Depósitos de Clientes', 'liability', 'current_liability', 'Fondos depositados por usuarios en billetera (NIIF 15)'),
('2.1.1.01', 'Billetera Usuarios - Locadores', 'liability', 'current_liability', 'Saldo wallet de propietarios'),
('2.1.1.02', 'Billetera Usuarios - Locatarios', 'liability', 'current_liability', 'Saldo wallet de inquilinos');

-- 2.2 PASIVOS CORRIENTES - DEPÓSITOS DE GARANTÍA (NIIF 15)
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('2.1.2', 'Depósitos de Garantía', 'liability', 'current_liability', 'Franquicias y depósitos en garantía'),
('2.1.2.01', 'Franquicias Bloqueadas', 'liability', 'current_liability', 'Depósitos de garantía por alquileres activos'),
('2.1.2.02', 'Garantías Pendientes Liberación', 'liability', 'current_liability', 'Depósitos pendientes de devolver');

-- 2.3 PASIVOS CORRIENTES - INGRESOS DIFERIDOS (NIIF 15)
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('2.1.3', 'Ingresos Diferidos', 'liability', 'current_liability', 'Pasivo por contrato - NIIF 15'),
('2.1.3.01', 'Ingresos Diferidos - Alquileres', 'liability', 'current_liability', 'Pagos anticipados de alquileres pendientes'),
('2.1.3.02', 'Ingresos Diferidos - Comisiones', 'liability', 'current_liability', 'Comisiones cobradas no devengadas');

-- 2.4 PASIVOS CORRIENTES - CUENTAS POR PAGAR
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('2.1.4', 'Cuentas por Pagar', 'liability', 'current_liability', 'Obligaciones de pago a locadores'),
('2.1.4.01', 'Pago a Locadores Pendiente', 'liability', 'current_liability', 'Montos pendientes de transferir a propietarios'),
('2.1.4.02', 'Retiros Solicitados', 'liability', 'current_liability', 'Retiros de usuarios pendientes de procesar');

-- 2.5 PROVISIONES Y RESERVAS (NIIF 37)
INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('2.1.5', 'Provisiones', 'liability', 'current_liability', 'Provisiones según NIIF 37'),
('2.1.5.01', 'Provisión FGO - Siniestros', 'liability', 'current_liability', 'Provisión para siniestros esperados (NIIF 37)'),
('2.1.5.02', 'Provisión Contingencias Legales', 'liability', 'current_liability', 'Provisión para riesgos legales'),
('2.1.5.03', 'Provisión Cuentas Incobrables', 'liability', 'current_liability', 'Provisión para pérdidas estimadas');

-- =====================================================
-- 3. PATRIMONIO (EQUITY)
-- =====================================================

INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('3.1', 'Capital Social', 'equity', 'equity', 'Capital aportado por socios'),
('3.2', 'Resultados Acumulados', 'equity', 'equity', 'Utilidades/pérdidas de ejercicios anteriores'),
('3.3', 'Resultado del Ejercicio', 'equity', 'equity', 'Utilidad o pérdida del período actual'),
('3.4', 'Reserva FGO', 'equity', 'equity', 'Fondo de Garantía Operativa acumulado');

-- =====================================================
-- 4. INGRESOS (REVENUE)
-- =====================================================

INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('4.1', 'Ingresos Operacionales', 'revenue', 'operating_revenue', 'Ingresos por operación principal'),
('4.1.1', 'Comisiones por Alquileres', 'revenue', 'operating_revenue', 'Comisión de plataforma sobre alquileres (NIIF 15 - agente)'),
('4.1.2', 'Comisiones por Servicios', 'revenue', 'operating_revenue', 'Otras comisiones de servicios'),
('4.1.3', 'Ingresos por Penalizaciones', 'revenue', 'operating_revenue', 'Penalidades por incumplimiento'),
('4.2', 'Ingresos Financieros', 'revenue', 'financial_revenue', 'Rendimientos financieros'),
('4.2.1', 'Intereses Ganados', 'revenue', 'financial_revenue', 'Intereses sobre saldos'),
('4.2.2', 'Diferencias de Cambio Positivas', 'revenue', 'financial_revenue', 'Ganancias cambiarias');

-- =====================================================
-- 5. GASTOS (EXPENSE)
-- =====================================================

INSERT INTO accounting_accounts (code, name, type, subtype, description) VALUES
('5.1', 'Gastos Operacionales', 'expense', 'operating_expense', 'Gastos de operación'),
('5.1.1', 'Comisiones Bancarias', 'expense', 'operating_expense', 'Comisiones de procesadores de pago'),
('5.1.1.01', 'Comisión MercadoPago', 'expense', 'operating_expense', 'Comisiones MercadoPago'),
('5.1.1.02', 'Comisión Stripe', 'expense', 'operating_expense', 'Comisiones Stripe'),
('5.1.2', 'Gastos por Siniestros', 'expense', 'operating_expense', 'Siniestros pagados del FGO'),
('5.1.3', 'Gastos Administrativos', 'expense', 'operating_expense', 'Gastos generales de administración'),
('5.1.4', 'Gastos de Marketing', 'expense', 'operating_expense', 'Inversión en marketing y publicidad'),
('5.2', 'Gastos Financieros', 'expense', 'financial_expense', 'Costos financieros'),
('5.2.1', 'Intereses Pagados', 'expense', 'financial_expense', 'Intereses sobre obligaciones'),
('5.2.2', 'Diferencias de Cambio Negativas', 'expense', 'financial_expense', 'Pérdidas cambiarias');

-- =====================================================
-- Actualizar relaciones padre-hijo
-- =====================================================

-- Nivel 2 bajo 1.1.1
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '1.1.1')
WHERE code IN ('1.1.1.01', '1.1.1.02', '1.1.1.03', '1.1.1.04');

-- Nivel 2 bajo 1.1.2
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '1.1.2')
WHERE code IN ('1.1.2.01', '1.1.2.02');

-- Nivel 2 bajo 2.1.1
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.1')
WHERE code IN ('2.1.1.01', '2.1.1.02');

-- Nivel 2 bajo 2.1.2
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.2')
WHERE code IN ('2.1.2.01', '2.1.2.02');

-- Nivel 2 bajo 2.1.3
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.3')
WHERE code IN ('2.1.3.01', '2.1.3.02');

-- Nivel 2 bajo 2.1.4
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.4')
WHERE code IN ('2.1.4.01', '2.1.4.02');

-- Nivel 2 bajo 2.1.5
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '2.1.5')
WHERE code IN ('2.1.5.01', '2.1.5.02', '2.1.5.03');

-- Nivel 2 bajo 5.1.1
UPDATE accounting_accounts SET parent_account_id = (SELECT id FROM accounting_accounts WHERE code = '5.1.1')
WHERE code IN ('5.1.1.01', '5.1.1.02');

-- =====================================================
-- Verificación
-- =====================================================

SELECT 
  code,
  name,
  type,
  subtype,
  CASE 
    WHEN parent_account_id IS NOT NULL THEN '  → '
    ELSE ''
  END || name as display_name
FROM accounting_accounts
ORDER BY code;
