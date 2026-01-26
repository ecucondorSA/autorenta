-- 🛡️ AUTORENTA DEFENSE GRID MIGRATION (HARDCORE MODE)
-- Fecha: 2026-01-24
-- Enfoque: Gig Economy Scouts + Ops Profesionales (Modelo Híbrido)

-- 1. ENUMS & TYPES
create type public.bounty_status as enum ('ACTIVE', 'PAUSED', 'CLAIMED', 'EXPIRED', 'CANCELLED');
create type public.op_status as enum ('PENDING_DISPATCH', 'EN_ROUTE', 'ON_SITE', 'SECURED', 'HANDOVER_POLICE', 'COMPLETED', 'FAILED');
create type public.op_priority as enum ('NORMAL', 'HIGH', 'CRITICAL');
create type public.security_device_type as enum ('AIRTAG', 'SMARTTAG', 'GPS_HARDWIRED', 'OBD_KILLSWITCH', 'LOJACK');

-- 2. SECURITY DEVICES (El Hardware Oculto)
create table public.car_security_devices (
  id uuid default gen_random_uuid() primary key,
  car_id uuid not null references public.cars(id),
  device_type public.security_device_type not null,
  device_identifier text, -- Serial ID o Public Key
  location_in_vehicle text, -- "Bajo el asiento trasero", "Dentro de la óptica izq"
  is_active boolean default true,
  battery_level int, -- 0-100
  last_ping timestamp with time zone,
  
  created_at timestamp with time zone default now()
);

-- 3. BOUNTIES (La Oferta Pública - SCALABILITY ENGINE)
create table public.bounties (
  id uuid default gen_random_uuid() primary key,
  car_id uuid not null references public.cars(id),
  booking_id uuid references public.bookings(id),
  
  -- Zona de Búsqueda (Ofuscada para seguridad del Scout)
  target_location geography(POINT) not null, 
  radius_meters int default 1000, -- Radio amplio, no punto exacto
  
  -- Incentivo
  reward_amount decimal(10, 2) default 150.00,
  currency text default 'USD',
  
  status public.bounty_status default 'ACTIVE',
  
  -- Metadata
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '24 hours'),
  created_by uuid references auth.users(id)
);

-- Índices geoespaciales críticos para performance
create index bounties_geo_idx on public.bounties using GIST (target_location);

-- 4. BOUNTY CLAIMS (Inteligencia de Campo)
create table public.bounty_claims (
  id uuid default gen_random_uuid() primary key,
  bounty_id uuid not null references public.bounties(id),
  scout_id uuid not null references public.profiles(id),
  
  -- Evidencia Visual (La clave del sistema)
  photo_url text not null,
  gps_location geography(POINT) not null, -- Ubicación REAL del Scout al tomar la foto
  timestamp_captured timestamp with time zone default now(),
  
  -- Validación de Seguridad (Distance Check)
  distance_to_target_meters float, -- Calculado post-insert
  
  -- Verificación IA (Gemini Vision)
  ai_verification_json jsonb, 
  is_verified boolean default false,
  confidence_score float, -- 0.0 a 1.0
  
  -- Estado Financiero
  payment_status text default 'PENDING', -- PENDING, PAID, FAILED
  payment_tx_id text, -- Referencia a la tx de la wallet
  
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  rejection_reason text
);

-- 5. RECOVERY OPS (La Caballería - Solo si es necesario)
create table public.recovery_ops (
  id uuid default gen_random_uuid() primary key,
  claim_id uuid references public.bounty_claims(id), 
  car_id uuid not null references public.cars(id),
  
  -- Asignación Profesional
  assigned_partner_id uuid, -- ID de la empresa de seguridad (si se contrata)
  
  status public.op_status default 'PENDING_DISPATCH',
  
  -- Log de Acciones
  timeline jsonb default '[]'::jsonb, -- [{ "action": "POLICE_CALLED", "time": "..." }]
  
  police_report_id text,
  recovery_dossier_url text -- URL del PDF generado
);

-- 6. SECURITY & POLICIES

alter table public.car_security_devices enable row level security;
alter table public.bounties enable row level security;
alter table public.bounty_claims enable row level security;
alter table public.recovery_ops enable row level security;

-- Policies

-- Devices: Solo el Owner ve sus dispositivos ocultos
create policy "Owners view own devices" on public.car_security_devices
  for select to authenticated
  using (exists (select 1 from public.cars where id = car_security_devices.car_id and owner_id = auth.uid()));

-- Bounties: Públicos si están activos (El motor del sistema)
create policy "Public Active Bounties" on public.bounties
  for select to authenticated
  using (status = 'ACTIVE');

-- Claims: Scouts ven lo suyo, Admins/Owners ven lo del auto
create policy "Scout Create Claim" on public.bounty_claims
  for insert to authenticated
  with check (auth.uid() = scout_id);

-- 7. GEOSPATIAL FUNCTIONS
create or replace function public.find_nearby_bounties(
  user_lat double precision,
  user_long double precision,
  search_radius_meters int default 2000
)
returns setof public.bounties
language sql
security definer
as $$
  select *
  from public.bounties
  where st_dwithin(
    target_location,
    st_setsrid(st_makepoint(user_long, user_lat), 4326),
    search_radius_meters
  )
  and status = 'ACTIVE';
$$;
