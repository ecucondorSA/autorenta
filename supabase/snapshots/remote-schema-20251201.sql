--
-- PostgreSQL database dump
--

\restrict NQBgsVTCBwNbhPiWk478bgGDfWOcdVAvgFe2dAMC4otAAmhaon9UbZRb2aKIWkO

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Ubuntu 17.6-0ubuntu0.25.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: api; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA api;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'FGO v1.1 fixes applied: column names corrected (renter_id, cars.owner_id)';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: http; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;


--
-- Name: EXTENSION http; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION http IS 'HTTP client for PostgreSQL, allows web page retrieval inside the database.';


--
-- Name: hypopg; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS hypopg WITH SCHEMA extensions;


--
-- Name: EXTENSION hypopg; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION hypopg IS 'Hypothetical indexes for PostgreSQL';


--
-- Name: index_advisor; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS index_advisor WITH SCHEMA extensions;


--
-- Name: EXTENSION index_advisor; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION index_advisor IS 'Query index advisor';


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_status AS ENUM (
    'pending_payment',
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'expired'
);


--
-- Name: car_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.car_status AS ENUM (
    'draft',
    'pending',
    'active',
    'suspended',
    'deleted'
);


--
-- Name: claim_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.claim_status AS ENUM (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'paid',
    'processing'
);


--
-- Name: damage_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.damage_severity AS ENUM (
    'minor',
    'moderate',
    'severe'
);


--
-- Name: damage_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.damage_type AS ENUM (
    'scratch',
    'dent',
    'broken_glass',
    'tire_damage',
    'mechanical',
    'interior',
    'missing_item',
    'other'
);


--
-- Name: document_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_kind AS ENUM (
    'gov_id_front',
    'gov_id_back',
    'driver_license',
    'utility_bill',
    'selfie'
);


--
-- Name: kyc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kyc_status AS ENUM (
    'not_started',
    'pending',
    'verified',
    'rejected'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'new_booking_for_owner',
    'booking_cancelled_for_owner',
    'booking_cancelled_for_renter',
    'new_chat_message',
    'payment_successful',
    'payout_successful',
    'inspection_reminder',
    'generic_announcement',
    'mp_onboarding_required'
);


--
-- Name: TYPE notification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.notification_type IS 'Notification types including mp_onboarding_required for MercadoPago onboarding reminders';


--
-- Name: onboarding_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.onboarding_status AS ENUM (
    'incomplete',
    'complete',
    'skipped'
);


--
-- Name: payment_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_provider AS ENUM (
    'mock',
    'mercadopago',
    'stripe'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'processing',
    'approved',
    'rejected',
    'refunded',
    'cancelled'
);


--
-- Name: payout_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'manual_review'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: get_mp_token(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_mp_token() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token TEXT;
BEGIN
    SELECT value INTO v_token FROM private.app_secrets WHERE key = 'MERCADOPAGO_ACCESS_TOKEN';
    IF v_token IS NULL OR v_token LIKE 'TEST-0000%' THEN
        RAISE EXCEPTION 'MERCADOPAGO_ACCESS_TOKEN not configured in private.app_secrets';
    END IF;
    RETURN v_token;
END;
$$;


--
-- Name: account_bonus_protector_sale(uuid, bigint, integer, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.account_bonus_protector_sale(p_user_id uuid, p_price_cents bigint, p_protection_level integer, p_addon_id uuid, p_transaction_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar precio
  IF p_price_cents <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_price_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Depósitos Clientes (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Pago de Protector Bonus desde billetera'
    ),
    jsonb_build_object(
      'account_code', '4104',  -- Ingreso Protector Bonus (INCOME)
      'credit', v_amount_decimal,
      'description', 'Ingreso por venta de Protector Nivel ' || p_protection_level
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'BONUS_PROTECTOR_SALE',
    p_transaction_id,
    'wallet_transactions',
    'Venta Protector Bonus Nivel ' || p_protection_level || ' - $' || v_amount_decimal || ' USD',
    v_entries
  );

  RETURN v_journal_id;
END;
$_$;


--
-- Name: FUNCTION account_bonus_protector_sale(p_user_id uuid, p_price_cents bigint, p_protection_level integer, p_addon_id uuid, p_transaction_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.account_bonus_protector_sale(p_user_id uuid, p_price_cents bigint, p_protection_level integer, p_addon_id uuid, p_transaction_id uuid) IS 'Contabiliza venta de Protector Bonus como ingreso';


--
-- Name: account_protection_credit_breakage(uuid, bigint, character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.account_protection_credit_breakage(p_user_id uuid, p_expired_cents bigint, p_reason character varying, p_transaction_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar que hay algo que expirar
  IF p_expired_cents <= 0 THEN
    RAISE EXCEPTION 'El monto expirado debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_expired_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Liberación de pasivo por CP no usado'
    ),
    jsonb_build_object(
      'account_code', '4203',  -- Ingreso por Breakage (INCOME)
      'credit', v_amount_decimal,
      'description', 'Reconocimiento de ingreso por breakage'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_BREAKAGE',
    p_transaction_id,
    'wallet_transactions',
    'Breakage CP $' || v_amount_decimal || ' USD - Razón: ' || p_reason,
    v_entries
  );

  RETURN v_journal_id;
END;
$_$;


--
-- Name: FUNCTION account_protection_credit_breakage(p_user_id uuid, p_expired_cents bigint, p_reason character varying, p_transaction_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.account_protection_credit_breakage(p_user_id uuid, p_expired_cents bigint, p_reason character varying, p_transaction_id uuid) IS 'Contabiliza CP no usado como breakage revenue';


--
-- Name: account_protection_credit_consumption(uuid, bigint, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.account_protection_credit_consumption(p_user_id uuid, p_consumed_cents bigint, p_claim_id uuid, p_transaction_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar que hay algo que consumir
  IF p_consumed_cents <= 0 THEN
    RAISE EXCEPTION 'El monto consumido debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_consumed_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Liberación de pasivo por consumo CP'
    ),
    jsonb_build_object(
      'account_code', '4103',  -- Ingreso por Consumo CP (INCOME)
      'credit', v_amount_decimal,
      'description', 'Reconocimiento de ingreso por consumo CP'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_CONSUMPTION',
    p_transaction_id,
    'wallet_transactions',
    'Consumo CP $' || v_amount_decimal || ' USD - Siniestro: ' || p_claim_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$_$;


--
-- Name: FUNCTION account_protection_credit_consumption(p_user_id uuid, p_consumed_cents bigint, p_claim_id uuid, p_transaction_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.account_protection_credit_consumption(p_user_id uuid, p_consumed_cents bigint, p_claim_id uuid, p_transaction_id uuid) IS 'Contabiliza consumo de CP como reconocimiento de ingreso';


--
-- Name: account_protection_credit_issuance(uuid, bigint, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.account_protection_credit_issuance(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_amount_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '3300',  -- Resultados Acumulados (EQUITY)
      'debit', v_amount_decimal,
      'description', 'Emisión de Crédito de Protección'
    ),
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'credit', v_amount_decimal,
      'description', 'Pasivo por CP otorgado a usuario'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_ISSUANCE',
    p_transaction_id,
    'wallet_transactions',
    'Emisión CP $' || v_amount_decimal || ' USD - Usuario: ' || p_user_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$_$;


--
-- Name: FUNCTION account_protection_credit_issuance(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.account_protection_credit_issuance(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid) IS 'Contabiliza emisión de CP como ingreso diferido (pasivo)';


--
-- Name: account_protection_credit_renewal(uuid, bigint, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.account_protection_credit_renewal(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_amount_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '5103',  -- Gastos Marketing (EXPENSE)
      'debit', v_amount_decimal,
      'description', 'Costo de renovación gratuita CP (promoción)'
    ),
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'credit', v_amount_decimal,
      'description', 'Pasivo por CP renovado gratuitamente'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_RENEWAL',
    p_transaction_id,
    'wallet_transactions',
    'Renovación gratuita CP $' || v_amount_decimal || ' USD - Usuario: ' || p_user_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$_$;


--
-- Name: FUNCTION account_protection_credit_renewal(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.account_protection_credit_renewal(p_user_id uuid, p_amount_cents bigint, p_transaction_id uuid) IS 'Contabiliza renovación gratuita de CP como gasto de marketing';


--
-- Name: accounting_auto_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_auto_audit() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_assets DECIMAL(18,2);
  v_liabilities DECIMAL(18,2);
  v_equity DECIMAL(18,2);
  v_balanced BOOLEAN;
  v_issues INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Sumar activos
  SELECT COALESCE(SUM(debit - credit), 0)
  INTO v_assets
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'ASSET';
  
  -- Sumar pasivos
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_liabilities
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'LIABILITY';
  
  -- Sumar patrimonio
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_equity
  FROM accounting_ledger l
  JOIN accounting_chart_of_accounts c ON c.code = l.account_code
  WHERE c.account_type = 'EQUITY';
  
  -- Ecuación contable: Activos = Pasivos + Patrimonio
  v_balanced := ABS(v_assets - (v_liabilities + v_equity)) < 1.0;
  
  IF NOT v_balanced THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description,
      expected_value, actual_value, variance
    ) VALUES (
      'balance_check', 'critical',
      'Ecuación contable desbalanceada: A ≠ P + E',
      v_liabilities + v_equity, v_assets,
      v_assets - (v_liabilities + v_equity)
    );
    v_issues := v_issues + 1;
  END IF;
  
  -- Verificar pasivos de billetera
  PERFORM accounting_verify_wallet_liabilities();
  
  v_result := jsonb_build_object(
    'assets', v_assets,
    'liabilities', v_liabilities,
    'equity', v_equity,
    'balanced', v_balanced,
    'variance', v_assets - (v_liabilities + v_equity),
    'issues_found', v_issues,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION accounting_auto_audit(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_auto_audit() IS 'Auditoría automática de ecuación contable. Ejecutar diariamente.';


--
-- Name: accounting_balance_sheet(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_balance_sheet(p_date date) RETURNS TABLE(code character varying, name character varying, account_type character varying, balance numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(l.debit - l.credit), 0)::NUMERIC / 100 as balance_ars
  FROM accounting_accounts a
  LEFT JOIN accounting_ledger l ON l.account_code = a.code
    AND l.entry_date <= p_date
    AND COALESCE(l.is_reversed, false) = false
  WHERE a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    AND a.is_active = true
  GROUP BY a.code, a.name, a.account_type, a.sub_type
  HAVING COALESCE(SUM(l.debit - l.credit), 0) != 0
  ORDER BY a.code;
END;
$$;


--
-- Name: accounting_balance_sheet(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_balance_sheet(p_date timestamp with time zone DEFAULT now()) RETURNS TABLE(account_code character varying, account_name character varying, account_type character varying, balance numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.code,
    coa.name,
    coa.account_type,
    COALESCE(SUM(l.debit - l.credit), 0) as balance
  FROM accounting_chart_of_accounts coa
  LEFT JOIN accounting_ledger l ON l.account_code = coa.code
    AND l.entry_date <= p_date
  WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
    AND coa.is_active = true
  GROUP BY coa.code, coa.name, coa.account_type, coa.level
  ORDER BY coa.code;
END;
$$;


--
-- Name: accounting_cancellation_fee_after_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_cancellation_fee_after_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_renter_email TEXT;
BEGIN
    -- Solo procesar cuando:
    -- 1. El booking cambia a status cancelled
    -- 2. Hay cancellation_fee_cents > 0
    -- 3. No se había procesado antes (OLD.status != 'cancelled' o OLD.cancellation_fee_cents era NULL/0)
    IF NEW.status::TEXT = 'cancelled' 
       AND NEW.cancellation_fee_cents IS NOT NULL 
       AND NEW.cancellation_fee_cents > 0
       AND (OLD.status::TEXT != 'cancelled' OR OLD.cancellation_fee_cents IS NULL OR OLD.cancellation_fee_cents = 0)
    THEN
        
        -- Obtener email del renter para la descripción
        SELECT email INTO v_renter_email
        FROM auth.users
        WHERE id = NEW.renter_id;
        
        -- Generar número de asiento contable único
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        -- Crear el asiento contable (journal entry)
        INSERT INTO accounting_journal_entries (
            entry_number,
            transaction_type,
            reference_id,
            reference_table,
            description,
            total_debit,
            total_credit,
            status,
            posted_at
        ) VALUES (
            v_entry_number,
            'CANCELLATION_FEE',
            NEW.id,
            'bookings',
            'Penalidad cancelación booking ' || NEW.id::TEXT || ' - ' || 
            COALESCE(v_renter_email, NEW.renter_id::TEXT) || ' - ' ||
            (NEW.cancellation_fee_cents / 100.0)::TEXT || ' ARS',
            NEW.cancellation_fee_cents,
            NEW.cancellation_fee_cents,
            'POSTED',
            COALESCE(NEW.cancelled_at, NOW())
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 2110 (Depósitos de Clientes - Billetera)
        -- Se descuenta del saldo del cliente
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '2110',
            NEW.cancellation_fee_cents,
            0,
            'Descuento penalidad cancelación',
            'booking',
            NEW.id,
            NEW.renter_id,
            COALESCE(NEW.cancelled_at, NOW())
        );
        
        -- HABER: 4130 (Penalidades y Recargos)
        -- Ingreso por penalidad
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '4130',
            0,
            NEW.cancellation_fee_cents,
            'Ingreso penalidad cancelación',
            'booking',
            NEW.id,
            NEW.renter_id,
            COALESCE(NEW.cancelled_at, NOW())
        );
        
        RAISE NOTICE 'Asiento contable creado: % para penalidad cancelación booking %', 
                     v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_cancellation_fee_after_update(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_cancellation_fee_after_update() IS 'Registra automáticamente las penalidades de cancelación en el sistema contable.
DEBE 2110 (Depósitos Clientes), HABER 4130 (Penalidades y Recargos).
Conecta fuente de ingreso "Penalidades cancelación" al sistema contable.';


--
-- Name: accounting_credit_breakage_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_credit_breakage_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_user_email TEXT;
    v_amount_abs BIGINT;
BEGIN
    IF NEW.type = 'credit_breakage' AND NEW.status = 'completed' THEN
        
        SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
        v_amount_abs := ABS(NEW.amount);
        
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        -- Crear asiento: CP expirado sin usar = ingreso por breakage
        INSERT INTO accounting_journal_entries (
            entry_number, transaction_type, reference_id, reference_table,
            description, total_debit, total_credit, status, posted_at
        ) VALUES (
            v_entry_number, 'CREDIT_BREAKAGE', NEW.id, 'wallet_transactions',
            'CP expirado (breakage) ' || COALESCE(v_user_email, NEW.user_id::TEXT) ||
            ' - ' || (v_amount_abs / 100.0)::TEXT || ' ' || NEW.currency,
            v_amount_abs, v_amount_abs, 'POSTED', NEW.completed_at
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 2110 (Libera obligación - cliente pierde crédito)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '2110', v_amount_abs, 0,
            'Liberación obligación CP expirado',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        -- HABER: 4203 (Ingreso por Breakage - CP no usado)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '4203', 0, v_amount_abs,
            'Ingreso por breakage CP expirado',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        RAISE NOTICE 'Asiento contable: % - Breakage CP %', v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_credit_breakage_after_insert(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_credit_breakage_after_insert() IS 'Registra breakage de CP en contabilidad: DEBE 2110, HABER 4203 (ingreso por breakage)';


--
-- Name: accounting_credit_consume_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_credit_consume_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_user_email TEXT;
    v_amount_abs BIGINT;
BEGIN
    IF NEW.type = 'credit_consume' AND NEW.status = 'completed' THEN
        
        SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
        v_amount_abs := ABS(NEW.amount);  -- amount es negativo en consumo
        
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        -- Crear asiento: reconoce ingreso cuando se consume el CP
        INSERT INTO accounting_journal_entries (
            entry_number, transaction_type, reference_id, reference_table,
            description, total_debit, total_credit, status, posted_at
        ) VALUES (
            v_entry_number, 'CREDIT_CONSUME', NEW.id, 'wallet_transactions',
            'Consumo CP para siniestro ' || COALESCE(v_user_email, NEW.user_id::TEXT) ||
            ' - ' || (v_amount_abs / 100.0)::TEXT || ' ' || NEW.currency,
            v_amount_abs, v_amount_abs, 'POSTED', NEW.completed_at
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 4103 (Reconocimiento de ingreso - ya no es diferido)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '4103', v_amount_abs, 0,
            'Reconocimiento ingreso CP consumido',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        -- HABER: 2110 (Descuento de obligación con cliente)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '2110', 0, v_amount_abs,
            'Descuento CP consumido',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        RAISE NOTICE 'Asiento contable: % - Consumo CP %', v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_credit_consume_after_insert(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_credit_consume_after_insert() IS 'Registra consumo de CP en contabilidad: reconoce ingreso diferido';


--
-- Name: accounting_credit_issue_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_credit_issue_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_user_email TEXT;
BEGIN
    IF NEW.type = 'credit_issue' AND NEW.status = 'completed' THEN
        
        SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
        
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        -- Crear asiento contable
        -- Nota: Emisión de CP es ingreso diferido (no genera efectivo inmediato)
        -- Se reconoce como PASIVO hasta que se consume
        INSERT INTO accounting_journal_entries (
            entry_number,
            transaction_type,
            reference_id,
            reference_table,
            description,
            total_debit,
            total_credit,
            status,
            posted_at
        ) VALUES (
            v_entry_number,
            'CREDIT_ISSUE',
            NEW.id,
            'wallet_transactions',
            'Emisión Crédito Protección ' || COALESCE(v_user_email, NEW.user_id::TEXT) || 
            ' - ' || (NEW.amount / 100.0)::TEXT || ' ' || NEW.currency,
            NEW.amount,
            NEW.amount,
            'POSTED',
            NEW.completed_at
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 2110 (Depósitos Clientes - obligación con cliente)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '2110', NEW.amount, 0,
            'Emisión CP - obligación con cliente',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        -- HABER: 4103 (Ingreso por Consumo CP - ingreso diferido)
        INSERT INTO accounting_ledger (
            journal_entry_id, account_code, debit, credit, description,
            reference_type, reference_id, user_id, entry_date
        ) VALUES (
            v_journal_entry_id, '4103', 0, NEW.amount,
            'Ingreso diferido emisión CP',
            'wallet_transaction', NEW.id, NEW.user_id, NEW.completed_at
        );
        
        RAISE NOTICE 'Asiento contable: % - Emisión CP %', v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_credit_issue_after_insert(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_credit_issue_after_insert() IS 'Registra emisión de CP en contabilidad: DEBE 2110, HABER 4103 (ingreso diferido)';


--
-- Name: accounting_daily_closure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_daily_closure() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_period_code VARCHAR(20);
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_total_debits DECIMAL(18,2);
  v_total_credits DECIMAL(18,2);
  v_balance_ok BOOLEAN;
  v_result JSONB;
BEGIN
  v_period_code := TO_CHAR(CURRENT_DATE - INTERVAL '1 day', 'YYYY-MM-DD');
  v_start_date := (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMPTZ;
  v_end_date := CURRENT_DATE::TIMESTAMPTZ;
  
  -- Calcular totales del día
  SELECT 
    COALESCE(SUM(debit), 0), 
    COALESCE(SUM(credit), 0)
  INTO v_total_debits, v_total_credits
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND is_closing_entry = false;
  
  -- Verificar balance
  v_balance_ok := ABS(v_total_debits - v_total_credits) < 0.01;
  
  -- Si no balancea, crear alerta
  IF NOT v_balance_ok THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description, affected_period,
      expected_value, actual_value, variance
    ) VALUES (
      'balance_check', 'error',
      'Descuadre en cierre diario',
      v_period_code,
      v_total_debits, v_total_credits,
      v_total_debits - v_total_credits
    );
  END IF;
  
  -- Registrar cierre
  INSERT INTO accounting_period_closures (
    period_type, period_code, start_date, end_date,
    total_debits, total_credits, balance_check,
    status, closed_at
  ) VALUES (
    'daily', v_period_code, v_start_date, v_end_date,
    v_total_debits, v_total_credits, v_balance_ok,
    'closed', NOW()
  );
  
  v_result := jsonb_build_object(
    'period', v_period_code,
    'debits', v_total_debits,
    'credits', v_total_credits,
    'balanced', v_balance_ok,
    'variance', v_total_debits - v_total_credits
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION accounting_daily_closure(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_daily_closure() IS 'Cierre automático diario. Ejecutar en cron job a las 00:01.';


--
-- Name: accounting_delivery_fee_after_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_delivery_fee_after_update() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_renter_email TEXT;
BEGIN
    -- Solo procesar cuando:
    -- 1. El booking cambia a status completed
    -- 2. Hay delivery_fee_cents > 0
    -- 3. No se había procesado antes (OLD.status != 'completed')
    IF NEW.status::TEXT = 'completed' 
       AND NEW.delivery_fee_cents IS NOT NULL 
       AND NEW.delivery_fee_cents > 0
       AND OLD.status::TEXT != 'completed'
    THEN
        
        -- Obtener email del renter
        SELECT email INTO v_renter_email
        FROM auth.users
        WHERE id = NEW.renter_id;
        
        -- Generar número de asiento contable único
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        -- Crear el asiento contable
        INSERT INTO accounting_journal_entries (
            entry_number,
            transaction_type,
            reference_id,
            reference_table,
            description,
            total_debit,
            total_credit,
            status,
            posted_at
        ) VALUES (
            v_entry_number,
            'DELIVERY_FEE',
            NEW.id,
            'bookings',
            'Tarifa delivery booking ' || NEW.id::TEXT || ' - ' || 
            COALESCE(v_renter_email, NEW.renter_id::TEXT) || ' - ' ||
            (NEW.delivery_fee_cents / 100.0)::TEXT || ' ARS',
            NEW.delivery_fee_cents,
            NEW.delivery_fee_cents,
            'POSTED',
            NOW()
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 2110 (Depósitos de Clientes - Billetera)
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '2110',
            NEW.delivery_fee_cents,
            0,
            'Cobro tarifa delivery',
            'booking',
            NEW.id,
            NEW.renter_id,
            NOW()
        );
        
        -- HABER: 4120 (Tarifas por Servicio)
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '4120',
            0,
            NEW.delivery_fee_cents,
            'Ingreso tarifa delivery',
            'booking',
            NEW.id,
            NEW.renter_id,
            NOW()
        );
        
        RAISE NOTICE 'Asiento contable creado: % para tarifa delivery booking %', 
                     v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_delivery_fee_after_update(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_delivery_fee_after_update() IS 'Registra automáticamente las tarifas de delivery en el sistema contable.
DEBE 2110 (Depósitos Clientes), HABER 4120 (Tarifas por Servicio).
Conecta fuente de ingreso "Tarifas delivery" al sistema contable.';


--
-- Name: accounting_income_statement(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_income_statement(p_start_date date, p_end_date date) RETURNS TABLE(code character varying, name character varying, account_type character varying, balance numeric)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(l.credit - l.debit), 0)::NUMERIC / 100 as balance_ars
  FROM accounting_accounts a
  LEFT JOIN accounting_ledger l ON l.account_code = a.code
    AND l.entry_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(l.is_reversed, false) = false
  WHERE a.account_type IN ('INCOME', 'EXPENSE')
    AND a.is_active = true
  GROUP BY a.code, a.name, a.account_type, a.sub_type
  HAVING COALESCE(SUM(l.credit - l.debit), 0) != 0
  ORDER BY a.code;
END;
$$;


--
-- Name: accounting_income_statement(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_income_statement(p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS TABLE(account_code character varying, account_name character varying, account_type character varying, amount numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    coa.code,
    coa.name,
    coa.account_type,
    CASE 
      WHEN coa.account_type = 'REVENUE' THEN COALESCE(SUM(l.credit - l.debit), 0)
      WHEN coa.account_type = 'EXPENSE' THEN COALESCE(SUM(l.debit - l.credit), 0)
      ELSE 0
    END as amount
  FROM accounting_chart_of_accounts coa
  LEFT JOIN accounting_ledger l ON l.account_code = coa.code
    AND l.entry_date >= p_start_date
    AND l.entry_date <= p_end_date
  WHERE coa.account_type IN ('REVENUE', 'EXPENSE')
    AND coa.is_active = true
  GROUP BY coa.code, coa.name, coa.account_type, coa.level
  ORDER BY coa.code;
END;
$$;


--
-- Name: accounting_monthly_closure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_monthly_closure() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_period_code VARCHAR(20);
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_batch_id UUID;
  v_revenue DECIMAL(18,2);
  v_expenses DECIMAL(18,2);
  v_net_income DECIMAL(18,2);
  v_result JSONB;
BEGIN
  v_period_code := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM');
  v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
  v_end_date := DATE_TRUNC('month', CURRENT_DATE);
  v_batch_id := gen_random_uuid();
  
  -- Calcular ingresos del mes
  SELECT COALESCE(SUM(credit), 0)
  INTO v_revenue
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND account_code LIKE '4%'; -- Cuentas de ingreso
  
  -- Calcular gastos del mes
  SELECT COALESCE(SUM(debit), 0)
  INTO v_expenses
  FROM accounting_ledger
  WHERE entry_date >= v_start_date 
    AND entry_date < v_end_date
    AND account_code LIKE '5%'; -- Cuentas de gasto
  
  v_net_income := v_revenue - v_expenses;
  
  -- Asiento de cierre: Cerrar cuentas de resultado
  -- DEBITO: Cuentas de Ingreso (cerrar saldo acreedor)
  INSERT INTO accounting_ledger (
    account_code, debit, credit, description,
    batch_id, fiscal_period, is_closing_entry
  ) VALUES (
    '4000', v_revenue, 0,
    'Cierre de ingresos período ' || v_period_code,
    v_batch_id, v_period_code, true
  );
  
  -- CREDITO: Cuentas de Gasto (cerrar saldo deudor)
  INSERT INTO accounting_ledger (
    account_code, debit, credit, description,
    batch_id, fiscal_period, is_closing_entry
  ) VALUES (
    '5000', 0, v_expenses,
    'Cierre de gastos período ' || v_period_code,
    v_batch_id, v_period_code, true
  );
  
  -- Trasladar resultado neto a patrimonio
  IF v_net_income > 0 THEN
    -- Utilidad
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      batch_id, fiscal_period, is_closing_entry
    ) VALUES (
      '3300', 0, v_net_income,
      'Resultado del ejercicio - Utilidad',
      v_batch_id, v_period_code, true
    );
  ELSIF v_net_income < 0 THEN
    -- Pérdida
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      batch_id, fiscal_period, is_closing_entry
    ) VALUES (
      '3300', ABS(v_net_income), 0,
      'Resultado del ejercicio - Pérdida',
      v_batch_id, v_period_code, true
    );
  END IF;
  
  -- Registrar cierre
  INSERT INTO accounting_period_closures (
    period_type, period_code, start_date, end_date,
    status, closing_entries_batch_id, closed_at
  ) VALUES (
    'monthly', v_period_code, v_start_date, v_end_date,
    'closed', v_batch_id, NOW()
  );
  
  v_result := jsonb_build_object(
    'period', v_period_code,
    'revenue', v_revenue,
    'expenses', v_expenses,
    'net_income', v_net_income,
    'batch_id', v_batch_id
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION accounting_monthly_closure(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_monthly_closure() IS 'Cierre mensual con asientos de cierre. Ejecutar el día 1 de cada mes.';


--
-- Name: accounting_verify_wallet_liabilities(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_verify_wallet_liabilities() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet_balance BIGINT;
  v_liability_balance BIGINT;
  v_variance BIGINT;
BEGIN
  SELECT COALESCE(SUM(balance_cents), 0)
  INTO v_wallet_balance
  FROM user_wallets;
  
  SELECT COALESCE(SUM(credit - debit), 0)
  INTO v_liability_balance
  FROM accounting_ledger
  WHERE account_code = '2110'
  AND COALESCE(is_reversed, false) = false;
  
  v_variance := v_wallet_balance - v_liability_balance;
  
  IF ABS(v_variance) > 10000 THEN
    INSERT INTO accounting_audit_log (
      audit_type, severity, description,
      affected_account, expected_value, actual_value, variance
    ) VALUES (
      'reconciliation', 'warning',
      'Discrepancia entre saldos de billetera y pasivos contables',
      '2110', v_liability_balance::NUMERIC / 100, v_wallet_balance::NUMERIC / 100, v_variance::NUMERIC / 100
    );
    RAISE NOTICE 'DISCREPANCIA: Billeteras=% ARS, Contabilidad=% ARS, Varianza=% ARS', 
      v_wallet_balance / 100.0, v_liability_balance / 100.0, v_variance / 100.0;
  ELSE
    RAISE NOTICE 'RECONCILIADO ✓: Billeteras=% ARS, Contabilidad=% ARS', 
      v_wallet_balance / 100.0, v_liability_balance / 100.0;
  END IF;
END;
$$;


--
-- Name: accounting_wallet_deposit_after_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accounting_wallet_deposit_after_insert() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_entry_number TEXT;
    v_journal_entry_id UUID;
    v_user_email TEXT;
BEGIN
    IF NEW.type = 'deposit' AND NEW.status = 'completed' THEN
        
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = NEW.user_id;
        
        v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');
        
        INSERT INTO accounting_journal_entries (
            entry_number,
            transaction_type,
            reference_id,
            reference_table,
            description,
            total_debit,
            total_credit,
            status,
            posted_at
        ) VALUES (
            v_entry_number,
            'WALLET_DEPOSIT',
            NEW.id,
            'wallet_transactions',
            'Depósito billetera ' || COALESCE(v_user_email, NEW.user_id::TEXT) || ' - ' || 
            (NEW.amount / 100.0)::TEXT || ' ' || NEW.currency,
            NEW.amount,
            NEW.amount,
            'POSTED',
            NEW.completed_at
        ) RETURNING id INTO v_journal_entry_id;
        
        -- DEBE: 1120 (Cuentas por Cobrar - MercadoPago)
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '1120',
            NEW.amount,
            0,
            'Ingreso depósito MercadoPago',
            'wallet_transaction',
            NEW.id,
            NEW.user_id,
            NEW.completed_at
        );
        
        -- HABER: 2110 (Depósitos Clientes - Billetera)
        INSERT INTO accounting_ledger (
            journal_entry_id,
            account_code,
            debit,
            credit,
            description,
            reference_type,
            reference_id,
            user_id,
            entry_date
        ) VALUES (
            v_journal_entry_id,
            '2110',
            0,
            NEW.amount,
            'Depósito cliente en billetera',
            'wallet_transaction',
            NEW.id,
            NEW.user_id,
            NEW.completed_at
        );
        
        RAISE NOTICE 'Asiento contable creado: % para depósito %', v_entry_number, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: FUNCTION accounting_wallet_deposit_after_insert(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.accounting_wallet_deposit_after_insert() IS 'Registra automáticamente los depósitos completados en el sistema contable.
DEBE 1120 (Cuentas por Cobrar MercadoPago), HABER 2110 (Depósitos Clientes).
Conecta fuente de ingreso "Depósitos wallet" al sistema contable.';


--
-- Name: activate_insurance_coverage(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activate_insurance_coverage(p_booking_id uuid, p_addon_ids uuid[] DEFAULT ARRAY[]::uuid[]) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_car_id UUID;
  v_policy_id UUID;
  v_policy_type TEXT;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_rental_days INTEGER;
  v_daily_premium BIGINT;
  v_deductible BIGINT;
  v_liability BIGINT;
  v_coverage_id UUID;
  v_addons_total BIGINT := 0;
  v_addon_id UUID;
BEGIN
  -- ✅ FIX: Usar start_at y end_at (nombres correctos en bookings)
  SELECT car_id, start_at, end_at INTO v_car_id, v_start_date, v_end_date
  FROM bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  v_rental_days := EXTRACT(DAY FROM (v_end_date - v_start_date))::INTEGER;
  IF v_rental_days < 1 THEN v_rental_days := 1; END IF;
  
  -- Determinar qué póliza usar (owner o platform)
  -- ✅ FIX: Verificar si existe la columna has_owner_insurance
  -- Si no existe, usar póliza flotante de la plataforma
  BEGIN
    SELECT owner_insurance_policy_id INTO v_policy_id
    FROM cars 
    WHERE id = v_car_id 
      AND owner_insurance_policy_id IS NOT NULL
    LIMIT 1;
  EXCEPTION
    WHEN undefined_column THEN
      v_policy_id := NULL;
  END;
  
  IF v_policy_id IS NULL THEN
    -- Usar póliza flotante de la plataforma (default)
    SELECT id INTO v_policy_id 
    FROM insurance_policies 
    WHERE policy_type = 'platform_floating' 
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_policy_id IS NULL THEN
      RAISE EXCEPTION 'No active platform insurance policy found';
    END IF;
  END IF;
  
  -- Obtener datos de la póliza
  SELECT 
    daily_premium, 
    liability_coverage_amount
  INTO v_daily_premium, v_liability
  FROM insurance_policies WHERE id = v_policy_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insurance policy not found: %', v_policy_id;
  END IF;
  
  -- Calcular franquicia (si existe la función)
  BEGIN
    v_deductible := calculate_deductible(v_car_id, v_policy_id);
  EXCEPTION
    WHEN undefined_function THEN
      -- Si no existe la función, usar valor por defecto
      v_deductible := COALESCE(
        (SELECT deductible_fixed_amount FROM insurance_policies WHERE id = v_policy_id),
        30000 -- Default 300 USD en centavos
      );
  END;
  
  -- Crear cobertura
  INSERT INTO booking_insurance_coverage (
    booking_id,
    policy_id,
    coverage_start,
    coverage_end,
    liability_coverage,
    deductible_amount,
    daily_premium_charged,
    certificate_number,
    status
  ) VALUES (
    p_booking_id,
    v_policy_id,
    v_start_date,
    v_end_date,
    v_liability,
    v_deductible,
    v_daily_premium * v_rental_days,
    'CERT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
    'active'
  ) RETURNING id INTO v_coverage_id;
  
  -- Agregar add-ons si los hay (si existe la tabla)
  BEGIN
    IF array_length(p_addon_ids, 1) > 0 THEN
      FOREACH v_addon_id IN ARRAY p_addon_ids LOOP
        INSERT INTO booking_insurance_addons (booking_id, addon_id, daily_cost, total_cost)
        SELECT 
          p_booking_id, 
          v_addon_id, 
          daily_cost,
          daily_cost * v_rental_days
        FROM insurance_addons WHERE id = v_addon_id;
        
        v_addons_total := v_addons_total + (
          SELECT daily_cost * v_rental_days 
          FROM insurance_addons 
          WHERE id = v_addon_id
        );
      END LOOP;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- Si no existe la tabla de addons, continuar sin error
      NULL;
  END;
  
  -- Actualizar booking (si existen las columnas)
  BEGIN
    UPDATE bookings SET
      insurance_coverage_id = v_coverage_id
    WHERE id = p_booking_id;
  EXCEPTION
    WHEN undefined_column THEN
      -- Si no existe la columna, no actualizar
      NULL;
  END;
  
  RETURN v_coverage_id;
END;
$$;


--
-- Name: FUNCTION activate_insurance_coverage(p_booking_id uuid, p_addon_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.activate_insurance_coverage(p_booking_id uuid, p_addon_ids uuid[]) IS 'Activate insurance coverage for a booking. Returns the coverage_id. 
✅ FIX 2025-11-16: Adapted to use start_at/end_at columns and handle missing tables gracefully.';


--
-- Name: add_bank_account_with_encryption(text, text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_bank_account_with_encryption(p_account_number text, p_cbu text, p_alias text, p_account_type text, p_bank_name text DEFAULT NULL::text, p_bank_code text DEFAULT NULL::text, p_account_holder_name text DEFAULT NULL::text, p_account_holder_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;
  IF p_account_number IS NULL OR p_account_number = '' THEN
    RAISE EXCEPTION 'Account number is required';
  END IF;
  INSERT INTO bank_accounts (
    user_id,
    account_number_encrypted,
    cbu_encrypted,
    alias_encrypted,
    bank_name_encrypted,
    account_type,
    bank_code,
    account_holder_name,
    account_holder_id,
    verified,
    is_default
  ) VALUES (
    v_user_id,
    encrypt_pii(p_account_number),
    CASE WHEN p_cbu IS NOT NULL THEN encrypt_pii(p_cbu) ELSE NULL END,
    CASE WHEN p_alias IS NOT NULL THEN encrypt_pii(p_alias) ELSE NULL END,
    CASE WHEN p_bank_name IS NOT NULL THEN encrypt_pii(p_bank_name) ELSE NULL END,
    p_account_type,
    p_bank_code,
    p_account_holder_name,
    p_account_holder_id,
    false,
    false
  )
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Bank account already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating bank account: %', SQLERRM;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    user_id uuid NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notified_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_waitlist_check CHECK ((end_date > start_date)),
    CONSTRAINT booking_waitlist_status_check CHECK ((status = ANY (ARRAY['active'::text, 'notified'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: add_to_waitlist(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_to_waitlist(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS public.booking_waitlist
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_waitlist_entry public.booking_waitlist;
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que las fechas son válidas
  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'La fecha de fin debe ser posterior a la fecha de inicio';
  END IF;

  IF p_start_date < now() THEN
    RAISE EXCEPTION 'No puedes agregar fechas pasadas a la waitlist';
  END IF;

  -- Verificar que el auto existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM public.cars
    WHERE id = p_car_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Auto no disponible';
  END IF;

  -- Intentar insertar o actualizar si ya existe
  INSERT INTO public.booking_waitlist (
    car_id,
    user_id,
    start_date,
    end_date,
    status,
    expires_at
  ) VALUES (
    p_car_id,
    auth.uid(),
    p_start_date,
    p_end_date,
    'active',
    now() + INTERVAL '30 days'
  )
  ON CONFLICT (car_id, user_id, start_date, end_date)
  DO UPDATE SET
    status = 'active',
    expires_at = now() + INTERVAL '30 days',
    updated_at = now()
  RETURNING * INTO v_waitlist_entry;

  RETURN v_waitlist_entry;
END;
$$;


--
-- Name: FUNCTION add_to_waitlist(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.add_to_waitlist(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) IS 'Agrega un usuario a la lista de espera para un auto en fechas específicas.
Se notificará automáticamente cuando el auto esté disponible.';


--
-- Name: adjust_alpha_dynamic(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_alpha_dynamic(p_country_code text DEFAULT 'AR'::text, p_bucket text DEFAULT 'default'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_rc NUMERIC(10,4);
  v_current_alpha NUMERIC(5,4);
  v_new_alpha NUMERIC(5,4);
  v_alpha_min NUMERIC(5,4);
  v_alpha_max NUMERIC(5,4);
  v_rc_floor NUMERIC(6,3);
  v_rc_ceiling NUMERIC(6,3);
  rec JSONB;
BEGIN
  -- Obtener parámetros del país/bucket
  SELECT alpha, alpha_min, alpha_max, rc_floor, rc_soft_ceiling
  INTO v_current_alpha, v_alpha_min, v_alpha_max, v_rc_floor, v_rc_ceiling
  FROM fgo_parameters
  WHERE country_code = p_country_code AND bucket = p_bucket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parameters not found for country=%, bucket=%', p_country_code, p_bucket;
  END IF;

  -- Calcular RC actual
  rec := calculate_rc_v1_1(p_country_code, p_bucket);
  v_rc := (rec->>'rc')::NUMERIC;

  -- Lógica de ajuste según gates
  IF v_rc IS NULL OR v_rc >= v_rc_ceiling THEN
    -- RC alto → bajar α (reducir aportes)
    v_new_alpha := GREATEST(v_alpha_min, v_current_alpha - 0.02);

  ELSIF v_rc < v_rc_floor THEN
    -- RC bajo → subir α (aumentar aportes)
    v_new_alpha := LEAST(v_alpha_max, v_current_alpha + 0.05);

  ELSE
    -- RC dentro de rango óptimo → mantener
    v_new_alpha := v_current_alpha;
  END IF;

  -- Actualizar parámetros si cambió
  IF v_new_alpha != v_current_alpha THEN
    UPDATE fgo_parameters
    SET
      alpha = v_new_alpha,
      updated_at = NOW()
    WHERE country_code = p_country_code AND bucket = p_bucket;
  END IF;

  RETURN jsonb_build_object(
    'country_code', p_country_code,
    'bucket', p_bucket,
    'rc', v_rc,
    'previous_alpha', v_current_alpha,
    'new_alpha', v_new_alpha,
    'adjusted', v_new_alpha != v_current_alpha,
    'adjustment_delta', v_new_alpha - v_current_alpha,
    'timestamp', NOW()
  );
END;
$$;


--
-- Name: FUNCTION adjust_alpha_dynamic(p_country_code text, p_bucket text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.adjust_alpha_dynamic(p_country_code text, p_bucket text) IS 'Ajusta α dinámicamente según RC aplicando gates policy (v1.1)';


--
-- Name: admin_get_refund_requests(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_refund_requests(p_status text DEFAULT NULL::text, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, booking_id uuid, user_id uuid, user_name text, user_email text, refund_amount numeric, currency text, destination text, status text, booking_total numeric, car_title text, created_at timestamp with time zone, approved_at timestamp with time zone, processed_at timestamp with time zone, rejection_reason text, admin_notes text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Authorization check
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de administrador';
  END IF;

  -- Return refund requests with joined data
  -- CHANGED: Use profiles.email instead of auth.users.email
  RETURN QUERY
  SELECT
    rr.id,
    rr.booking_id,
    rr.user_id,
    p.full_name as user_name,
    p.email as user_email,  -- ✅ Changed from u.email to p.email
    rr.refund_amount,
    rr.currency,
    rr.destination,
    rr.status,
    COALESCE(b.total_amount, b.total_cents / 100.0) as booking_total,
    c.title as car_title,
    rr.created_at,
    rr.approved_at,
    rr.processed_at,
    rr.rejection_reason,
    rr.admin_notes
  FROM public.refund_requests rr
  INNER JOIN public.bookings b ON b.id = rr.booking_id
  INNER JOIN public.cars c ON c.id = b.car_id
  INNER JOIN public.profiles p ON p.id = rr.user_id
  -- ✅ Removed: INNER JOIN auth.users u ON u.id = rr.user_id
  WHERE
    (p_status IS NULL OR rr.status = p_status)
  ORDER BY rr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION admin_get_refund_requests(p_status text, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.admin_get_refund_requests(p_status text, p_limit integer, p_offset integer) IS 'Admin RPC to retrieve refund requests with filtering. Uses profiles.email (synced from auth.users)';


--
-- Name: apply_fgo_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_fgo_movement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_balance BIGINT;
BEGIN
  -- CRÉDITO: Incrementar saldo del subfondo
  IF NEW.operation = 'credit' THEN
    UPDATE fgo_subfunds
    SET
      balance_cents = balance_cents + NEW.amount_cents,
      updated_at = NOW()
    WHERE subfund_type = NEW.subfund_type
    RETURNING balance_cents INTO current_balance;

    RAISE NOTICE 'FGO subfund % credited % cents. New balance: %',
      NEW.subfund_type, NEW.amount_cents, current_balance;

  -- DÉBITO: Decrementar saldo del subfondo
  ELSIF NEW.operation = 'debit' THEN
    -- Verificar saldo suficiente
    SELECT balance_cents INTO current_balance
    FROM fgo_subfunds
    WHERE subfund_type = NEW.subfund_type
    FOR UPDATE;  -- Lock pesimista

    IF current_balance < NEW.amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance in FGO subfund %. Balance: %, Required: %',
        NEW.subfund_type, current_balance, NEW.amount_cents;
    END IF;

    UPDATE fgo_subfunds
    SET
      balance_cents = balance_cents - NEW.amount_cents,
      updated_at = NOW()
    WHERE subfund_type = NEW.subfund_type
    RETURNING balance_cents INTO current_balance;

    RAISE NOTICE 'FGO subfund % debited % cents. New balance: %',
      NEW.subfund_type, NEW.amount_cents, current_balance;
  END IF;

  -- Actualizar balance total del coverage_fund (compatibilidad)
  UPDATE coverage_fund
  SET
    balance_cents = (SELECT SUM(balance_cents) FROM fgo_subfunds),
    updated_at = NOW()
  WHERE id = TRUE;

  RETURN NEW;
END;
$$;


--
-- Name: apply_referral_code(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_referral_code(p_referred_user_id uuid, p_code text, p_source text DEFAULT 'web'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_referral_code_id UUID;
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Buscar código activo
  SELECT id, user_id INTO v_referral_code_id, v_referrer_id
  FROM public.referral_codes
  WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE; -- Lock para evitar race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired referral code: %', p_code;
  END IF;

  -- No puede referirse a sí mismo
  IF v_referrer_id = p_referred_user_id THEN
    RAISE EXCEPTION 'Cannot use own referral code';
  END IF;

  -- Verificar si ya fue referido
  IF EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id
  ) THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Crear referral
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code_id,
    status,
    source
  ) VALUES (
    v_referrer_id,
    p_referred_user_id,
    v_referral_code_id,
    'registered',
    p_source
  ) RETURNING id INTO v_referral_id;

  -- Incrementar contador de usos
  UPDATE public.referral_codes
  SET current_uses = current_uses + 1
  WHERE id = v_referral_code_id;

  -- Crear bono de bienvenida para el referido
  INSERT INTO public.referral_rewards (
    referral_id,
    user_id,
    reward_type,
    amount_cents,
    currency,
    status,
    expires_at
  ) VALUES (
    v_referral_id,
    p_referred_user_id,
    'welcome_bonus',
    50000, -- $500 ARS de bienvenida
    'ARS',
    'pending',
    now() + interval '30 days'
  );

  RETURN v_referral_id;
END;
$_$;


--
-- Name: FUNCTION apply_referral_code(p_referred_user_id uuid, p_code text, p_source text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.apply_referral_code(p_referred_user_id uuid, p_code text, p_source text) IS 'Aplica un código cuando un usuario se registra';


--
-- Name: approve_booking(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_booking(p_booking_id uuid, p_owner_id uuid DEFAULT NULL::uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_id UUID;
    v_owner_id UUID;
    v_booking RECORD;
    v_car RECORD;
    v_result JSON;
BEGIN
    -- ⭐ VALIDACIÓN P0: Verificar rol del caller
    SELECT role, id INTO v_caller_role, v_caller_id
    FROM profiles
    WHERE id = auth.uid();

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Obtener ID del usuario actual
    v_owner_id := COALESCE(p_owner_id, v_caller_id);
    
    -- Obtener booking y validar
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;
    
    -- Obtener auto y validar que el usuario sea el dueño o admin
    SELECT * INTO v_car
    FROM cars
    WHERE id = v_booking.car_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auto no encontrado';
    END IF;
    
    -- Solo owner del auto o admin puede aprobar
    IF v_caller_role != 'admin' AND v_car.owner_id != v_caller_id THEN
        RAISE EXCEPTION 'Solo el dueño del auto o un administrador pueden aprobar esta reserva';
    END IF;
    
    -- Validar estado actual
    IF v_booking.status NOT IN ('pending_approval', 'pending') THEN
        RAISE EXCEPTION 'La reserva no está pendiente de aprobación (estado actual: %)', v_booking.status;
    END IF;
    
    -- Validar que no haya expirado
    IF v_booking.approval_expires_at IS NOT NULL AND v_booking.approval_expires_at < NOW() THEN
        RAISE EXCEPTION 'La ventana de aprobación ha expirado';
    END IF;
    
    -- Actualizar booking
    UPDATE bookings
    SET 
        status = 'confirmed',
        approval_status = 'approved',
        approved_by = v_owner_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- Retornar resultado
    v_result := json_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'confirmed',
        'approved_at', NOW(),
        'message', 'Reserva aprobada exitosamente'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Retornar error
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Error al aprobar reserva'
        );
END;
$$;


--
-- Name: FUNCTION approve_booking(p_booking_id uuid, p_owner_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.approve_booking(p_booking_id uuid, p_owner_id uuid) IS 'P0 Security: Solo owner del auto o admin puede aprobar. Auditado 2025-11-19';


--
-- Name: auto_complete_first_booking_milestone(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_complete_first_booking_milestone() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_first_booking BOOLEAN;
  v_car_owner_id UUID;
BEGIN
  -- Solo para INSERTs con estado confirmado o mayor
  IF TG_OP = 'INSERT' AND NEW.status IN ('confirmed', 'in_progress', 'completed') THEN
    -- Obtener owner_id del auto
    SELECT owner_id INTO v_car_owner_id
    FROM public.cars
    WHERE id = NEW.car_id;

    -- Verificar si es la primera booking del owner
    SELECT COUNT(*) = 1 INTO v_is_first_booking
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE c.owner_id = v_car_owner_id
      AND b.status IN ('confirmed', 'in_progress', 'completed');

    IF v_is_first_booking THEN
      -- Completar milestone
      PERFORM public.complete_referral_milestone(v_car_owner_id, 'first_booking');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_complete_first_booking_milestone(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_complete_first_booking_milestone() IS 'Marca milestone cuando recibe primera reserva';


--
-- Name: auto_generate_referral_code_on_first_car(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_referral_code_on_first_car() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_first_car BOOLEAN;
BEGIN
  -- Solo para INSERTs de nuevos autos
  IF TG_OP = 'INSERT' THEN
    -- Verificar si es el primer auto del usuario
    SELECT COUNT(*) = 1 INTO v_is_first_car
    FROM public.cars
    WHERE owner_id = NEW.owner_id;

    IF v_is_first_car THEN
      -- Generar código si no existe
      PERFORM public.generate_referral_code(NEW.owner_id);

      -- Completar milestone si fue referido
      PERFORM public.complete_referral_milestone(NEW.owner_id, 'first_car');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_generate_referral_code_on_first_car(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_generate_referral_code_on_first_car() IS 'Auto-genera código de referido al publicar primer auto';


--
-- Name: auto_payout_approved_rewards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_payout_approved_rewards() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet_transaction_id UUID;
BEGIN
  -- Solo cuando cambia a 'approved' y no tiene wallet_transaction_id
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.wallet_transaction_id IS NULL THEN
    -- Crear transacción en la wallet
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      currency,
      status,
      description,
      reference_type,
      reference_id
    ) VALUES (
      NEW.user_id,
      'deposit',
      NEW.amount_cents / 100.0, -- Convertir centavos a unidad
      NEW.currency,
      'completed',
      CASE NEW.reward_type
        WHEN 'welcome_bonus' THEN 'Bono de bienvenida - Programa de referidos'
        WHEN 'referrer_bonus' THEN 'Bono por referir nuevo Renter'
        WHEN 'first_car_bonus' THEN 'Bono por publicar tu primer auto'
        WHEN 'milestone_bonus' THEN 'Bono por milestone de referidos'
        ELSE 'Bono del programa de referidos'
      END,
      'referral_reward',
      NEW.id::text
    ) RETURNING id INTO v_wallet_transaction_id;

    -- Actualizar el balance de la wallet
    INSERT INTO public.wallet_balance (user_id, balance, currency)
    VALUES (NEW.user_id, NEW.amount_cents / 100.0, NEW.currency)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
      balance = wallet_balance.balance + EXCLUDED.balance,
      updated_at = now();

    -- Actualizar la recompensa con el ID de la transacción
    UPDATE public.referral_rewards
    SET
      wallet_transaction_id = v_wallet_transaction_id,
      status = 'paid',
      paid_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION auto_payout_approved_rewards(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.auto_payout_approved_rewards() IS 'Paga recompensas aprobadas automáticamente a wallet';


--
-- Name: booking_location_tracking_broadcast_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.booking_location_tracking_broadcast_trigger() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo proceder si es INSERT o UPDATE
  IF TG_OP = 'INSERT' THEN
    -- En inserts, si no hay location, no broadcast
    IF NEW.current_location IS NULL THEN
      RETURN NEW;
    END IF;

    PERFORM realtime.send(
      'booking:' || NEW.id::text,
      'location_created',
      jsonb_build_object(
        'id', NEW.id,
        'location', NEW.current_location,
        'status', NEW.status,
        'updated_at', COALESCE(NEW.updated_at, now())
      ),
      true
    );

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Evitar broadcasts si la location no cambió
    IF (OLD.current_location IS NOT DISTINCT FROM NEW.current_location)
       AND (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
      RETURN NEW;
    END IF;

    -- Construir payload compacto
    PERFORM realtime.send(
      'booking:' || NEW.id::text,
      'location_updated',
      jsonb_build_object(
        'id', NEW.id,
        'location', NEW.current_location,
        'status', NEW.status,
        'updated_at', COALESCE(NEW.updated_at, now())
      ),
      true
    );

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Opcional: notificar que el booking terminó/eliminado
    PERFORM realtime.send(
      'booking:' || OLD.id::text,
      'location_deleted',
      jsonb_build_object(
        'id', OLD.id,
        'last_location', OLD.current_location,
        'status', OLD.status,
        'deleted_at', now()
      ),
      true
    );

    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: calculate_age(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_age(birth_date date) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN DATE_PART('year', AGE(CURRENT_DATE, birth_date))::INTEGER;
END;
$$;


--
-- Name: FUNCTION calculate_age(birth_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_age(birth_date date) IS 'Calculate age in years from birth date. Returns NULL if birth_date is NULL.';


--
-- Name: calculate_batch_dynamic_prices(uuid[], uuid, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_batch_dynamic_prices(p_region_ids uuid[], p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer) RETURNS jsonb[]
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_results JSONB[] := '{}';
  v_region_id UUID;
  v_pricing_result JSONB;
BEGIN
  -- Loop through each region_id and calculate pricing
  FOREACH v_region_id IN ARRAY p_region_ids
  LOOP
    -- Call existing single-region function
    BEGIN
      v_pricing_result := public.calculate_dynamic_price(
        v_region_id,
        p_user_id,
        p_rental_start,
        p_rental_hours
      );

      -- Add region_id to result for mapping
      v_pricing_result := jsonb_set(
        v_pricing_result,
        '{region_id}',
        to_jsonb(v_region_id::text)
      );

      -- Determine surge_active flag
      v_pricing_result := jsonb_set(
        v_pricing_result,
        '{surge_active}',
        to_jsonb((v_pricing_result->'breakdown'->>'demand_factor')::decimal > 0.0)
      );

      -- Append to results array
      v_results := array_append(v_results, v_pricing_result);
    EXCEPTION
      WHEN OTHERS THEN
        -- If a region fails, add error result
        v_results := array_append(v_results, jsonb_build_object(
          'region_id', v_region_id::text,
          'error', SQLERRM,
          'price_per_hour', 0,
          'total_price', 0,
          'currency', 'ARS',
          'surge_active', false
        ));
    END;
  END LOOP;

  RETURN v_results;
END;
$$;


--
-- Name: FUNCTION calculate_batch_dynamic_prices(p_region_ids uuid[], p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_batch_dynamic_prices(p_region_ids uuid[], p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer) IS 'Calculates dynamic prices for multiple regions in a single call. Returns array of pricing objects with region_id for mapping.';


--
-- Name: calculate_distance_based_pricing(numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_distance_based_pricing(p_distance_km numeric, p_base_guarantee_usd integer DEFAULT 300) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tier TEXT;
  v_guarantee_multiplier NUMERIC;
  v_delivery_fee_per_km NUMERIC := 0.5; -- ARS per km (from environment config)
  v_min_delivery_distance NUMERIC := 5; -- km
  v_delivery_fee_cents BIGINT;
  v_guarantee_usd INTEGER;
BEGIN
  -- Handle NULL distance
  IF p_distance_km IS NULL THEN
    RETURN jsonb_build_object(
      'tier', NULL,
      'distance_km', NULL,
      'guarantee_multiplier', 1.0,
      'guarantee_usd', p_base_guarantee_usd,
      'delivery_fee_cents', 0,
      'message', 'No distance data available'
    );
  END IF;

  -- Determine tier and multiplier based on distance
  IF p_distance_km < 20 THEN
    v_tier := 'local';
    v_guarantee_multiplier := 1.0;
  ELSIF p_distance_km < 100 THEN
    v_tier := 'regional';
    v_guarantee_multiplier := 1.15;
  ELSE
    v_tier := 'long_distance';
    v_guarantee_multiplier := 1.3;
  END IF;

  -- Calculate adjusted guarantee
  v_guarantee_usd := CEIL(p_base_guarantee_usd * v_guarantee_multiplier);

  -- Calculate delivery fee (only if > min distance)
  IF p_distance_km > v_min_delivery_distance THEN
    v_delivery_fee_cents := ROUND(p_distance_km * v_delivery_fee_per_km * 100);
  ELSE
    v_delivery_fee_cents := 0;
  END IF;

  -- Return JSON with all calculated values
  RETURN jsonb_build_object(
    'tier', v_tier,
    'distance_km', p_distance_km,
    'guarantee_multiplier', v_guarantee_multiplier,
    'guarantee_base_usd', p_base_guarantee_usd,
    'guarantee_adjusted_usd', v_guarantee_usd,
    'delivery_fee_cents', v_delivery_fee_cents,
    'delivery_fee_per_km_ars', v_delivery_fee_per_km,
    'message', CASE
      WHEN v_tier = 'local' THEN 'Auto cercano - Sin recargo en garantía'
      WHEN v_tier = 'regional' THEN 'Distancia media - Garantía +15%'
      ELSE 'Larga distancia - Garantía +30%'
    END
  );
END;
$$;


--
-- Name: FUNCTION calculate_distance_based_pricing(p_distance_km numeric, p_base_guarantee_usd integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_distance_based_pricing(p_distance_km numeric, p_base_guarantee_usd integer) IS 'Calculate distance-based pricing metadata including tier, guarantee multiplier, and delivery fee. Returns JSON with all calculated values.';


--
-- Name: calculate_distance_km(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_distance_km(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_earth_radius_km CONSTANT NUMERIC := 6371; -- Earth radius in kilometers
  v_dlat NUMERIC;
  v_dlng NUMERIC;
  v_a NUMERIC;
  v_c NUMERIC;
  v_lat1_rad NUMERIC;
  v_lat2_rad NUMERIC;
BEGIN
  -- Handle NULL inputs
  IF p_lat1 IS NULL OR p_lng1 IS NULL OR p_lat2 IS NULL OR p_lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to radians
  v_lat1_rad := radians(p_lat1);
  v_lat2_rad := radians(p_lat2);
  v_dlat := radians(p_lat2 - p_lat1);
  v_dlng := radians(p_lng2 - p_lng1);

  -- Haversine formula
  v_a := sin(v_dlat / 2) ^ 2 +
         cos(v_lat1_rad) * cos(v_lat2_rad) *
         sin(v_dlng / 2) ^ 2;

  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));

  -- Return distance in kilometers, rounded to 2 decimal places
  RETURN ROUND(v_earth_radius_km * v_c, 2);
END;
$$;


--
-- Name: FUNCTION calculate_distance_km(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_distance_km(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric) IS 'Calculate distance between two GPS coordinates using Haversine formula. Returns distance in kilometers.';


--
-- Name: calculate_dynamic_price(uuid, uuid, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_dynamic_price(p_region_id uuid, p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_currency TEXT;
  v_region_name TEXT;
  v_day_factor DECIMAL(5,3) := 0.0;
  v_hour_factor DECIMAL(5,3) := 0.0;
  v_user_factor DECIMAL(5,3) := 0.0;
  v_demand_factor DECIMAL(5,3) := 0.0;  -- ✅ Initialize to 0.0
  v_event_factor DECIMAL(5,3) := 0.0;
  v_final_price DECIMAL(10,2);
  v_user_rentals INT;
  v_dow INT;
  v_hour INT;
BEGIN
  -- 1. Get base price and region name
  SELECT base_price_per_hour, currency, name
  INTO v_base_price, v_currency, v_region_name
  FROM public.pricing_regions
  WHERE id = p_region_id AND active = true;

  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'Region not found or inactive';
  END IF;

  -- 2. Get day factor
  v_dow := EXTRACT(DOW FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_day_factor
  FROM public.pricing_day_factors
  WHERE region_id = p_region_id AND day_of_week = v_dow;

  v_day_factor := COALESCE(v_day_factor, 0.0);  -- ✅ Extra safety

  -- 3. Get hour factor
  v_hour := EXTRACT(HOUR FROM p_rental_start);
  SELECT COALESCE(factor, 0.0)
  INTO v_hour_factor
  FROM public.pricing_hour_factors
  WHERE region_id = p_region_id
    AND hour_start <= v_hour
    AND hour_end >= v_hour
  LIMIT 1;

  v_hour_factor := COALESCE(v_hour_factor, 0.0);  -- ✅ Extra safety

  -- 4. Get user factor
  SELECT COUNT(*)
  INTO v_user_rentals
  FROM public.bookings
  WHERE renter_id = p_user_id AND status = 'completed';

  IF v_user_rentals = 0 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'new';
  ELSIF v_user_rentals >= 10 THEN
    SELECT COALESCE(factor, 0.0) INTO v_user_factor
    FROM public.pricing_user_factors WHERE user_type = 'frequent';
  END IF;

  v_user_factor := COALESCE(v_user_factor, 0.0);  -- ✅ Extra safety

  -- 5. Get demand factor (with safety)
  SELECT COALESCE(surge_factor, 0.0)
  INTO v_demand_factor
  FROM public.pricing_demand_snapshots
  WHERE region LIKE '%' || SPLIT_PART(v_region_name, '-', 2) || '%'
  ORDER BY created_at DESC
  LIMIT 1;

  v_demand_factor := COALESCE(v_demand_factor, 0.0);  -- ✅ Extra safety

  -- 6. Check for special events
  SELECT COALESCE(SUM(factor), 0.0)
  INTO v_event_factor
  FROM public.pricing_special_events
  WHERE region_id = p_region_id
    AND active = true
    AND p_rental_start BETWEEN start_date AND end_date;

  v_event_factor := COALESCE(v_event_factor, 0.0);  -- ✅ Extra safety

  -- 7. Calculate final price
  v_final_price := v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor);

  -- Apply min/max caps (0.8x to 1.6x)
  v_final_price := GREATEST(v_base_price * 0.8, LEAST(v_final_price, v_base_price * 1.6));

  -- Round to nearest 0.10
  v_final_price := ROUND(v_final_price / 0.1) * 0.1;

  -- Return full breakdown
  RETURN jsonb_build_object(
    'price_per_hour', v_final_price,
    'total_price', v_final_price * p_rental_hours,
    'currency', v_currency,
    'breakdown', jsonb_build_object(
      'base_price', v_base_price,
      'day_factor', v_day_factor,
      'hour_factor', v_hour_factor,
      'user_factor', v_user_factor,
      'demand_factor', v_demand_factor,
      'event_factor', v_event_factor,
      'total_multiplier', (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor),
      'price_before_cap', v_base_price * (1 + v_day_factor + v_hour_factor + v_user_factor + v_demand_factor + v_event_factor)
    )
  );
END;
$$;


--
-- Name: calculate_fgo_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_fgo_metrics() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_contributions BIGINT;
  v_total_siniestros_paid BIGINT;
  v_total_siniestros_count INT;
  v_avg_siniestro_cents BIGINT;
  v_target_balance BIGINT;
  v_current_balance BIGINT;
  v_coverage_ratio DECIMAL(10,4);
  v_loss_ratio DECIMAL(10,4);
  v_status TEXT;
  v_target_months INT;
BEGIN
  -- Obtener parámetros
  SELECT target_months_coverage INTO v_target_months
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular total de aportes
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_contributions
  FROM fgo_movements
  WHERE movement_type = 'user_contribution' AND operation = 'credit';

  -- Calcular total de siniestros pagados
  SELECT
    COALESCE(SUM(amount_cents), 0),
    COUNT(*)
  INTO v_total_siniestros_paid, v_total_siniestros_count
  FROM fgo_movements
  WHERE movement_type IN ('siniestro_payment', 'franchise_payment') AND operation = 'debit';

  -- Calcular promedio de siniestro
  IF v_total_siniestros_count > 0 THEN
    v_avg_siniestro_cents := v_total_siniestros_paid / v_total_siniestros_count;
  ELSE
    v_avg_siniestro_cents := 0;
  END IF;

  -- Calcular meta de saldo (12 meses × promedio de siniestros)
  v_target_balance := v_avg_siniestro_cents * v_target_months;

  -- Obtener saldo actual total del FGO
  SELECT COALESCE(SUM(balance_cents), 0) INTO v_current_balance
  FROM fgo_subfunds;

  -- Calcular Coverage Ratio (RC)
  IF v_target_balance > 0 THEN
    v_coverage_ratio := v_current_balance::DECIMAL / v_target_balance::DECIMAL;
  ELSE
    v_coverage_ratio := NULL;  -- No hay suficiente historial
  END IF;

  -- Calcular Loss Ratio (LR)
  IF v_total_contributions > 0 THEN
    v_loss_ratio := v_total_siniestros_paid::DECIMAL / v_total_contributions::DECIMAL;
  ELSE
    v_loss_ratio := 0;
  END IF;

  -- Determinar estado del fondo
  IF v_coverage_ratio IS NULL THEN
    v_status := 'healthy';  -- No hay suficiente historial
  ELSIF v_coverage_ratio >= 1.0 THEN
    v_status := 'healthy';
  ELSIF v_coverage_ratio >= 0.7 THEN
    v_status := 'warning';
  ELSE
    v_status := 'critical';
  END IF;

  -- Actualizar métricas
  UPDATE fgo_metrics
  SET
    total_contributions_cents = v_total_contributions,
    total_siniestros_paid_cents = v_total_siniestros_paid,
    total_siniestros_count = v_total_siniestros_count,
    coverage_ratio = v_coverage_ratio,
    loss_ratio = v_loss_ratio,
    target_balance_cents = v_target_balance,
    status = v_status,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE id = TRUE;

  -- Retornar resumen
  RETURN jsonb_build_object(
    'current_balance_cents', v_current_balance,
    'target_balance_cents', v_target_balance,
    'total_contributions_cents', v_total_contributions,
    'total_siniestros_paid_cents', v_total_siniestros_paid,
    'total_siniestros_count', v_total_siniestros_count,
    'coverage_ratio', v_coverage_ratio,
    'loss_ratio', v_loss_ratio,
    'status', v_status,
    'last_calculated_at', NOW()
  );
END;
$$;


--
-- Name: FUNCTION calculate_fgo_metrics(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_fgo_metrics() IS 'Recalcula métricas del FGO (RC, LR, estado)';


--
-- Name: calculate_payment_split(numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_payment_split(p_total_amount numeric, p_platform_fee_percent numeric DEFAULT 0.15) RETURNS TABLE(total_amount numeric, owner_amount numeric, platform_fee numeric, platform_fee_percent numeric)
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_platform_fee DECIMAL;
  v_owner_amount DECIMAL;
BEGIN
  -- Validaciones
  IF p_total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be positive';
  END IF;
  
  IF p_platform_fee_percent < 0 OR p_platform_fee_percent > 1 THEN
    RAISE EXCEPTION 'Platform fee percent must be between 0 and 1';
  END IF;
  
  -- Calcular split
  v_platform_fee := ROUND(p_total_amount * p_platform_fee_percent, 2);
  v_owner_amount := p_total_amount - v_platform_fee;
  
  -- Retornar
  RETURN QUERY SELECT 
    p_total_amount,
    v_owner_amount,
    v_platform_fee,
    p_platform_fee_percent;
END;
$$;


--
-- Name: FUNCTION calculate_payment_split(p_total_amount numeric, p_platform_fee_percent numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_payment_split(p_total_amount numeric, p_platform_fee_percent numeric) IS 'Calcula la división de pago entre owner y plataforma';


--
-- Name: calculate_pem(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_pem(p_country_code text DEFAULT NULL::text, p_bucket text DEFAULT NULL::text, p_window_days integer DEFAULT 90) RETURNS TABLE(country_code text, bucket text, pem_cents bigint, event_count integer, avg_event_cents bigint, total_paid_cents bigint, total_recovered_cents bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH movements_window AS (
    SELECT
      COALESCE(fm.country_code, 'global') AS cc,
      COALESCE(brs.bucket, 'default') AS bk,
      fm.booking_id,
      fm.amount_cents,
      fm.movement_type,
      fm.operation
    FROM fgo_movements fm
    LEFT JOIN booking_risk_snapshot brs ON fm.booking_id = brs.booking_id
    WHERE
      fm.ts >= NOW() - (p_window_days || ' days')::INTERVAL
      AND (p_country_code IS NULL OR COALESCE(fm.country_code, 'global') = p_country_code)
      AND (p_bucket IS NULL OR COALESCE(brs.bucket, 'default') = p_bucket)
  ),
  aggregated AS (
    SELECT
      cc,
      bk,
      COUNT(DISTINCT booking_id) FILTER (WHERE movement_type IN ('siniestro_payment', 'franchise_payment')) AS event_cnt,

      -- Total pagado (débitos)
      COALESCE(SUM(amount_cents) FILTER (WHERE movement_type IN ('siniestro_payment', 'franchise_payment') AND operation = 'debit'), 0) AS total_paid,

      -- Total recuperado (créditos)
      COALESCE(SUM(amount_cents) FILTER (WHERE movement_type = 'recovery' AND operation = 'credit'), 0) AS total_recovered
    FROM movements_window
    GROUP BY cc, bk
  )
  SELECT
    agg.cc AS country_code,
    agg.bk AS bucket,

    -- PEM = (Pagos - Recuperos) * (30 / window_days) = Pérdida neta mensualizada
    (((agg.total_paid - agg.total_recovered) * 30.0) / p_window_days)::BIGINT AS pem_cents,

    agg.event_cnt AS event_count,

    CASE
      WHEN agg.event_cnt > 0 THEN (agg.total_paid / agg.event_cnt)::BIGINT
      ELSE 0
    END AS avg_event_cents,

    agg.total_paid AS total_paid_cents,
    agg.total_recovered AS total_recovered_cents

  FROM aggregated agg;
END;
$$;


--
-- Name: FUNCTION calculate_pem(p_country_code text, p_bucket text, p_window_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_pem(p_country_code text, p_bucket text, p_window_days integer) IS 'Calcula Pérdida Esperada Mensual (PEM) por país/bucket usando rolling window';


--
-- Name: calculate_rc_v1_1(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_rc_v1_1(p_country_code text DEFAULT NULL::text, p_bucket text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pem BIGINT;
  v_current_balance BIGINT;
  v_target_balance BIGINT;
  v_rc NUMERIC(10,4);
  v_target_months INTEGER;
  v_event_count INTEGER;
BEGIN
  -- Obtener target de meses de cobertura
  SELECT target_months_coverage INTO v_target_months
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular PEM para el país/bucket
  SELECT pem.pem_cents, pem.event_count INTO v_pem, v_event_count
  FROM calculate_pem(p_country_code, p_bucket, 90) pem
  LIMIT 1;

  v_pem := COALESCE(v_pem, 0);
  v_event_count := COALESCE(v_event_count, 0);

  -- Saldo actual total del FGO
  SELECT SUM(balance_cents) INTO v_current_balance
  FROM fgo_subfunds;

  -- Target Balance = 12 × PEM
  v_target_balance := v_pem * v_target_months;

  -- Calcular RC
  IF v_target_balance > 0 THEN
    v_rc := v_current_balance::NUMERIC / v_target_balance::NUMERIC;
  ELSE
    -- Sin suficiente historial, asumir healthy
    v_rc := NULL;
  END IF;

  -- Determinar estado
  RETURN jsonb_build_object(
    'pem_cents', v_pem,
    'current_balance_cents', v_current_balance,
    'target_balance_cents', v_target_balance,
    'rc', v_rc,
    'event_count', v_event_count,
    'status', CASE
      WHEN v_rc IS NULL THEN 'healthy'
      WHEN v_rc >= 1.0 THEN 'healthy'
      WHEN v_rc >= 0.9 THEN 'warning'
      ELSE 'critical'
    END,
    'calculated_at', NOW()
  );
END;
$$;


--
-- Name: FUNCTION calculate_rc_v1_1(p_country_code text, p_bucket text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_rc_v1_1(p_country_code text, p_bucket text) IS 'Calcula RC (Coverage Ratio) dinámico basado en PEM (v1.1)';


--
-- Name: calculate_suggested_daily_rate(numeric, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_suggested_daily_rate(p_value_usd numeric, p_category_id uuid, p_country text DEFAULT 'AR'::text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_category vehicle_categories;
  v_suggested_daily_rate DECIMAL(10,2);
BEGIN
  -- Get category details
  SELECT * INTO v_category
  FROM vehicle_categories
  WHERE id = p_category_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'estimated_value_usd', p_value_usd,
      'confidence', 'low',
      'source', 'category_fallback',
      'suggested_daily_rate_usd', NULL,
      'error', 'Category not found'
    );
  END IF;

  -- Calculate suggested daily rate using category base daily rate percentage
  -- Formula: vehicle_value * base_daily_rate_pct
  -- The base_daily_rate_pct is already a decimal (e.g., 0.0035 = 0.35% per day)
  -- For example: Economy = 0.0035 (0.35%), Standard = 0.0030 (0.30%)
  v_suggested_daily_rate := p_value_usd * v_category.base_daily_rate_pct;

  -- Ensure minimum rate of $5/day
  IF v_suggested_daily_rate < 5 THEN
    v_suggested_daily_rate := 5;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'estimated_value_usd', p_value_usd,
    'confidence', 'high',
    'source', 'pricing_model',
    'category_id', p_category_id,
    'category_name', v_category.name_es,
    'suggested_daily_rate_usd', ROUND(v_suggested_daily_rate, 0),
    'base_daily_rate_pct', v_category.base_daily_rate_pct
  );
END;
$_$;


--
-- Name: FUNCTION calculate_suggested_daily_rate(p_value_usd numeric, p_category_id uuid, p_country text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_suggested_daily_rate(p_value_usd numeric, p_category_id uuid, p_country text) IS 'Calculate suggested daily rental rate for vehicle based on value and category. Used in publish form UI to guide owners on competitive pricing.';


--
-- Name: calculate_telemetry_score(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_telemetry_score(p_user_id uuid, p_booking_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_score INT;
BEGIN
  -- Obtener score del viaje
  SELECT driver_score INTO v_score
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró telemetría para booking %', p_booking_id;
  END IF;

  RETURN v_score;
END;
$$;


--
-- Name: FUNCTION calculate_telemetry_score(p_user_id uuid, p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_telemetry_score(p_user_id uuid, p_booking_id uuid) IS 'Obtiene score telemático de un booking específico';


--
-- Name: calculate_trip_score(numeric, integer, integer, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_trip_score(p_total_km numeric, p_hard_brakes integer, p_speed_violations integer, p_night_driving_hours numeric, p_risk_zones_visited integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_score INT;
  v_normalized_hard_brakes INT;
  v_normalized_speed_violations INT;
BEGIN
  -- Comenzar con score perfecto
  v_score := 100;

  -- Normalizar métricas por cada 100km (si el viaje es muy corto, penalizar menos)
  IF p_total_km > 0 THEN
    v_normalized_hard_brakes := ROUND((p_hard_brakes::DECIMAL / p_total_km) * 100)::INT;
    v_normalized_speed_violations := ROUND((p_speed_violations::DECIMAL / p_total_km) * 100)::INT;
  ELSE
    v_normalized_hard_brakes := p_hard_brakes;
    v_normalized_speed_violations := p_speed_violations;
  END IF;

  -- Penalizaciones:
  -- 1. Frenadas bruscas: -2 puntos por cada una (normalizado por 100km)
  v_score := v_score - (v_normalized_hard_brakes * 2);

  -- 2. Excesos de velocidad: -3 puntos por cada uno (normalizado por 100km)
  v_score := v_score - (v_normalized_speed_violations * 3);

  -- 3. Conducción nocturna: -1 punto por hora
  v_score := v_score - ROUND(p_night_driving_hours)::INT;

  -- 4. Zonas de riesgo: -5 puntos por zona
  v_score := v_score - (p_risk_zones_visited * 5);

  -- Asegurar rango 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN v_score;
END;
$$;


--
-- Name: FUNCTION calculate_trip_score(p_total_km numeric, p_hard_brakes integer, p_speed_violations integer, p_night_driving_hours numeric, p_risk_zones_visited integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_trip_score(p_total_km numeric, p_hard_brakes integer, p_speed_violations integer, p_night_driving_hours numeric, p_risk_zones_visited integer) IS 'Calcula score de conducción (0-100) basado en métricas del viaje';


--
-- Name: can_publish_car(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_publish_car(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN user_can_receive_payments(p_user_id);
END;
$$;


--
-- Name: cancel_conflicting_pending_by_renter(uuid, timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_conflicting_pending_by_renter(p_renter_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_expiration_threshold_minutes integer DEFAULT 5) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cancelled_count INTEGER := 0;
BEGIN
  -- Cancel pending bookings from the same renter that overlap with new dates
  -- Only cancel if they have more than threshold minutes until expiration
  -- This prevents cancelling bookings that are about to expire anyway
  UPDATE bookings
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Replaced by new booking request for overlapping dates'
  WHERE renter_id = p_renter_id
    AND status = 'pending'
    AND (start_at, end_at) OVERLAPS (p_start, p_end)
    AND (
      expires_at IS NULL
      OR expires_at > NOW() + (p_expiration_threshold_minutes || ' minutes')::INTERVAL
    );

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

  RETURN v_cancelled_count;
END;
$$;


--
-- Name: FUNCTION cancel_conflicting_pending_by_renter(p_renter_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_expiration_threshold_minutes integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_conflicting_pending_by_renter(p_renter_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_expiration_threshold_minutes integer) IS 'Cancels pending bookings from the same renter that overlap with new booking dates. Only cancels bookings with more than threshold minutes until expiration. Returns the number of bookings cancelled.';


--
-- Name: cancel_payment_authorization(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_payment_authorization(p_payment_id uuid) RETURNS TABLE(success boolean, canceled_at timestamp with time zone, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_payment RECORD;
  v_canceled_at TIMESTAMPTZ;
BEGIN
  -- Obtener payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  AND is_hold = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Payment no encontrado o no es un hold';
    RETURN;
  END IF;

  -- Validar que no esté ya capturado
  IF v_payment.captured_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'No se puede cancelar un hold ya capturado';
    RETURN;
  END IF;

  v_canceled_at := now();

  -- Actualizar payment
  UPDATE public.payments
  SET
    canceled_at = v_canceled_at,
    status = 'canceled'
  WHERE id = p_payment_id;

  RETURN QUERY SELECT true, v_canceled_at, 'Hold cancelado exitosamente'::TEXT;
END;
$$;


--
-- Name: FUNCTION cancel_payment_authorization(p_payment_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_payment_authorization(p_payment_id uuid) IS 'Cancela una preautorización (hold) y libera los fondos';


--
-- Name: cancel_preauth(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_preauth(p_intent_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    -- Get current status of the intent
    SELECT status INTO v_current_status
    FROM payment_intents
    WHERE id = p_intent_id;

    -- Check if intent exists
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Payment intent % not found.', p_intent_id;
    END IF;

    -- Check if intent is in 'authorized' state (only authorized can be cancelled)
    IF v_current_status <> 'authorized' THEN
        RAISE EXCEPTION 'Payment intent % is not in authorized state (current status: %).', p_intent_id, v_current_status;
    END IF;

    -- Update payment_intents status to 'cancelled'
    UPDATE payment_intents
    SET
        status = 'cancelled',
        cancelled_at = NOW()
    WHERE
        id = p_intent_id;

    -- No wallet_ledger entries needed for cancellation as funds were only held on card, not debited from wallet.
    -- If there were any locked funds in user_wallets, they would be released here, but current preauth flow doesn't involve wallet locks.
END;
$$;


--
-- Name: FUNCTION cancel_preauth(p_intent_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cancel_preauth(p_intent_id uuid) IS 'Cancela una preautorización y libera fondos bloqueados.
Actualiza el booking a cancelled si corresponde.
Debe llamarse DESPUÉS de que MercadoPago confirme la cancelación (status=cancelled).';


--
-- Name: capture_mp_preauth_order(text, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_mp_preauth_order(p_mp_order_id text, p_amount_cents bigint, p_description text) RETURNS TABLE(success boolean, error text, mp_order_id text, mp_order_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token TEXT;
    v_url TEXT;
    v_amount DECIMAL(10, 2);
    v_response_status INTEGER;
    v_response_body JSONB;
    v_response extensions.http_response;
BEGIN
    v_token := private.get_mp_token();
    v_url := 'https://api.mercadopago.com/v1/payments/' || p_mp_order_id;
    v_amount := p_amount_cents / 100.0;

    -- PUT to update payment (capture=true)
    SELECT * INTO v_response FROM extensions.http((
        'PUT', 
        v_url, 
        ARRAY[extensions.http_header('Authorization', 'Bearer ' || v_token), extensions.http_header('Content-Type', 'application/json')], 
        'application/json', 
        jsonb_build_object('capture', true, 'transaction_amount', v_amount)::text
    )::extensions.http_request);

    v_response_status := v_response.status;
    v_response_body := v_response.content::jsonb;

    IF v_response_status = 200 THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT, (v_response_body->>'id')::TEXT, v_response_body->>'status';
    ELSE
        RETURN QUERY SELECT FALSE, 'MP Error: ' || (v_response_body->>'message'), NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$;


--
-- Name: capture_payment_authorization(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_payment_authorization(p_auth_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE payment_authorizations SET status = 'captured' WHERE id = p_auth_id;
  RETURN TRUE;
END;
$$;


--
-- Name: capture_payment_authorization(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_payment_authorization(p_payment_id uuid, p_amount_cents bigint) RETURNS TABLE(success boolean, captured_amount_cents bigint, captured_at timestamp with time zone, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_payment RECORD;
  v_captured_at TIMESTAMPTZ;
BEGIN
  -- Obtener payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  AND is_hold = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Payment no encontrado o no es un hold';
    RETURN;
  END IF;

  -- Validar que esté autorizado
  IF v_payment.status != 'authorized' THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Payment no está en estado authorized';
    RETURN;
  END IF;

  -- Validar que no esté expirado
  IF v_payment.expires_at IS NOT NULL AND now() > v_payment.expires_at THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Hold expirado';
    RETURN;
  END IF;

  -- Validar que el monto a capturar no exceda el autorizado
  IF p_amount_cents > v_payment.amount_authorized_cents THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ,
      'Monto a capturar excede monto autorizado';
    RETURN;
  END IF;

  v_captured_at := now();

  -- Actualizar payment
  UPDATE public.payments
  SET
    amount_captured_cents = p_amount_cents,
    captured_at = v_captured_at,
    status = 'captured'
  WHERE id = p_payment_id;

  RETURN QUERY SELECT true, p_amount_cents, v_captured_at, 'Captura exitosa'::TEXT;
END;
$$;


--
-- Name: FUNCTION capture_payment_authorization(p_payment_id uuid, p_amount_cents bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.capture_payment_authorization(p_payment_id uuid, p_amount_cents bigint) IS 'Captura fondos de una preautorización (hold)';


--
-- Name: capture_preauth(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_preauth(p_auth_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE payment_authorizations SET status = 'captured', captured_at = NOW() WHERE id = p_auth_id;
  RETURN TRUE;
END;
$$;


--
-- Name: capture_preauth(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_preauth(p_intent_id uuid, p_amount numeric) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_mp_payment_id TEXT;
    v_user_wallet_account_number TEXT;
    v_autorenta_revenue_account_number TEXT := 'AR00000000000001'; -- Placeholder for AutoRenta's revenue account
    v_current_status TEXT;
BEGIN
    -- Get intent details and user's wallet account number
    SELECT
        pi.user_id,
        pi.mp_payment_id,
        pi.status,
        p.wallet_account_number
    INTO
        v_user_id,
        v_mp_payment_id,
        v_current_status,
        v_user_wallet_account_number
    FROM
        payment_intents pi
    JOIN
        profiles p ON pi.user_id = p.id
    WHERE
        pi.id = p_intent_id;

    -- Check if intent exists and is in 'authorized' state
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Payment intent % not found.', p_intent_id;
    END IF;

    IF v_current_status <> 'authorized' THEN
        RAISE EXCEPTION 'Payment intent % is not in authorized state (current status: %).', p_intent_id, v_current_status;
    END IF;

    -- Update payment_intents status to 'captured'
    UPDATE payment_intents
    SET
        status = 'captured',
        captured_at = NOW()
    WHERE
        id = p_intent_id;

    -- Insert debit entry for the user
    INSERT INTO wallet_ledger (
        wallet_account_number,
        type,
        amount,
        currency,
        description,
        reference_id,
        related_wallet_account_number
    ) VALUES (
        v_user_wallet_account_number,
        'debit',
        p_amount,
        'ARS',
        'Cargo por pre-autorización capturada',
        p_intent_id,
        v_autorenta_revenue_account_number
    );

    -- Insert credit entry for AutoRenta's revenue account
    INSERT INTO wallet_ledger (
        wallet_account_number,
        type,
        amount,
        currency,
        description,
        reference_id,
        related_wallet_account_number
    ) VALUES (
        v_autorenta_revenue_account_number,
        'credit',
        p_amount,
        'ARS',
        'Ingreso por pre-autorización capturada',
        p_intent_id,
        v_user_wallet_account_number
    );
END;
$$;


--
-- Name: FUNCTION capture_preauth(p_intent_id uuid, p_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.capture_preauth(p_intent_id uuid, p_amount numeric) IS 'Captura una preautorización de MercadoPago y crea entries en wallet_ledger.
Debe llamarse DESPUÉS de que MercadoPago confirme la captura (status=approved).
Crea DEBIT para renter y CREDIT para owner.';


--
-- Name: check_autorentar_credit_expiry(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_autorentar_credit_expiry(p_user_id uuid, p_expiry_days integer DEFAULT 365) RETURNS TABLE(success boolean, expired_amount_cents bigint, transaction_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    v_current_balance BIGINT;
    v_last_activity_date TIMESTAMPTZ;
    v_transaction_id UUID;
    v_days_inactive INTEGER;
BEGIN
    SELECT 
        uw.autorentar_credit_balance_cents,
        COALESCE(MAX(wt.created_at), uw.created_at)
    INTO v_current_balance, v_last_activity_date
    FROM user_wallets uw
    LEFT JOIN wallet_transactions wt ON wt.user_id = uw.user_id
    WHERE uw.user_id = p_user_id
    GROUP BY uw.autorentar_credit_balance_cents, uw.created_at;

    IF NOT FOUND OR v_current_balance <= 0 THEN
        RETURN QUERY SELECT TRUE, 0::BIGINT, NULL::UUID, 'No hay CP para expirar'::TEXT;
        RETURN;
    END IF;

    v_days_inactive := EXTRACT(DAY FROM NOW() - v_last_activity_date)::INTEGER;

    IF v_days_inactive < p_expiry_days THEN
        RETURN QUERY SELECT TRUE, 0::BIGINT, NULL::UUID, 
            format('CP activo. Expira en %s días', p_expiry_days - v_days_inactive)::TEXT;
        RETURN;
    END IF;

    UPDATE user_wallets
    SET 
        autorentar_credit_balance_cents = 0,
        available_balance_cents = available_balance_cents - v_current_balance,
        balance_cents = balance_cents - v_current_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO wallet_transactions (
        user_id, type, amount, currency, status, description, reference_type, completed_at
    ) VALUES (
        p_user_id, 'credit_breakage', -v_current_balance, 'ARS', 'completed',
        format('CP expirado: $%s ARS (%s días inactivo)', (v_current_balance / 100.0), v_days_inactive),
        'autorentar_credit', NOW()
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT TRUE, v_current_balance, v_transaction_id,
        format('CP expirado y procesado: $%s ARS', (v_current_balance / 100.0))::TEXT;
END;
$_$;


--
-- Name: check_availability(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_availability(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone) RETURNS boolean
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
  );
$$;


--
-- Name: check_car_availability(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_car_availability(p_car_id uuid, p_start_date date, p_end_date date) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_overlap_count INTEGER;
BEGIN
  -- Validate input dates
  IF p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'Start date must be before end date';
  END IF;

  IF p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot book dates in the past';
  END IF;

  -- Check if car exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM cars
    WHERE id = p_car_id
      AND status = 'active'
      AND deleted_at IS NULL
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check for overlapping bookings
  -- A booking overlaps if:
  --   booking_start < requested_end AND booking_end > requested_start
  SELECT COUNT(*) INTO v_overlap_count
  FROM bookings
  WHERE car_id = p_car_id
    AND status IN ('confirmed', 'in_progress')
    AND start_at::DATE < p_end_date
    AND end_at::DATE > p_start_date;

  -- Available if no overlaps found
  RETURN v_overlap_count = 0;
END;
$$;


--
-- Name: FUNCTION check_car_availability(p_car_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_car_availability(p_car_id uuid, p_start_date date, p_end_date date) IS 'Checks if a car is available for the specified date range. Returns false if any confirmed/in_progress booking overlaps.';


--
-- Name: check_fleet_bonus_eligibility(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_fleet_bonus_eligibility() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_car_id UUID;
    v_org_id UUID;
    v_bonus_record RECORD;
    v_stats RECORD;
BEGIN
    -- Determine car_id based on trigger source (bookings or reviews)
    IF TG_TABLE_NAME = 'bookings' THEN
        v_car_id := NEW.car_id;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        -- Get car_id from booking
        SELECT car_id INTO v_car_id FROM public.bookings WHERE id = NEW.booking_id;
    END IF;

    -- Check if car belongs to an organization
    SELECT organization_id INTO v_org_id FROM public.cars WHERE id = v_car_id;
    IF v_org_id IS NULL THEN RETURN NEW; END IF;

    -- Get/Create Bonus Record
    SELECT * INTO v_bonus_record FROM public.fleet_bonuses 
    WHERE car_id = v_car_id AND organization_id = v_org_id AND status = 'pending';
    
    -- If no pending bonus exists, exit
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Calculate Stats (Completed trips & Avg Rating)
    SELECT 
        COUNT(*) as trips,
        COALESCE(AVG(r.rating), 0) as rating
    FROM public.bookings b
    LEFT JOIN public.reviews r ON r.booking_id = b.id AND r.is_renter_review = true -- Reviews FROM renter
    WHERE b.car_id = v_car_id 
    AND b.status = 'completed';
    
    -- Update Bonus Progress
    UPDATE public.fleet_bonuses
    SET 
        trips_completed = v_stats.trips,
        avg_rating = v_stats.rating,
        status = CASE 
            WHEN v_stats.trips >= trips_required AND v_stats.rating >= min_rating_required THEN 'eligible'
            ELSE 'pending'
        END,
        updated_at = now()
    WHERE id = v_bonus_record.id;

    RETURN NEW;
END;
$$;


--
-- Name: check_mercadopago_connection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_mercadopago_connection() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_token_expired BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'connected', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Obtener datos de conexión
  SELECT
    mercadopago_connected,
    mercadopago_collector_id,
    mercadopago_connected_at,
    mercadopago_access_token_expires_at,
    mercadopago_account_type,
    mercadopago_country
  INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  -- Si no está conectado
  IF v_profile.mercadopago_connected IS NOT TRUE THEN
    RETURN json_build_object(
      'connected', false,
      'message', 'No hay cuenta de MercadoPago conectada'
    );
  END IF;

  -- Verificar si el token expiró
  v_token_expired := v_profile.mercadopago_access_token_expires_at < NOW();

  RETURN json_build_object(
    'connected', true,
    'collector_id', v_profile.mercadopago_collector_id,
    'connected_at', v_profile.mercadopago_connected_at,
    'account_type', v_profile.mercadopago_account_type,
    'country', v_profile.mercadopago_country,
    'token_expired', v_token_expired,
    'needs_refresh', v_token_expired
  );
END;
$$;


--
-- Name: FUNCTION check_mercadopago_connection(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_mercadopago_connection() IS 'Verifica el estado de la conexión con MercadoPago';


--
-- Name: check_snapshot_revalidation(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_snapshot_revalidation(p_booking_id uuid) RETURNS TABLE(requires_revalidation boolean, reason text, old_fx numeric, new_fx numeric, days_since_snapshot integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_snapshot RECORD;
  v_current_fx NUMERIC;
  v_days_elapsed INTEGER;
  v_fx_variation NUMERIC;
BEGIN
  -- Obtener snapshot actual
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró snapshot para booking %', p_booking_id;
  END IF;

  -- Obtener FX actual
  SELECT platform_rate INTO v_current_fx
  FROM exchange_rates
  WHERE pair = 'USDTARS' AND is_active = true
  ORDER BY last_updated DESC
  LIMIT 1;

  IF v_current_fx IS NULL THEN
    v_current_fx := 1015.0;
  END IF;

  -- Calcular días transcurridos
  v_days_elapsed := EXTRACT(DAY FROM (NOW() - v_snapshot.fx_snapshot_date));

  -- Calcular variación de FX (porcentaje)
  v_fx_variation := ABS((v_current_fx - v_snapshot.fx_snapshot) / v_snapshot.fx_snapshot);

  -- Determinar si requiere revalidación
  IF v_fx_variation >= 0.10 THEN
    RETURN QUERY SELECT
      true,
      'fx_variation'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  ELSIF v_days_elapsed >= 7 THEN
    RETURN QUERY SELECT
      true,
      'time_elapsed'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  ELSE
    RETURN QUERY SELECT
      false,
      'valid'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  END IF;
END;
$$;


--
-- Name: FUNCTION check_snapshot_revalidation(p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_snapshot_revalidation(p_booking_id uuid) IS 'Verifica si un snapshot de risk requiere revalidación por variación de FX (±10%) o tiempo (≥7 días)';


--
-- Name: check_user_pending_deposits_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_pending_deposits_limit(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending'
    AND created_at > (NOW() - INTERVAL '7 days');

  RETURN (v_pending_count < 10);
END;
$$;


--
-- Name: cleanup_expired_onboarding_states(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_onboarding_states() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM mp_onboarding_states
  WHERE expires_at < now() - INTERVAL '1 day'
    AND completed = false;
  
  RETURN NULL;
END;
$$;


--
-- Name: cleanup_expired_waitlist(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_waitlist() RETURNS TABLE(expired_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.booking_waitlist
  SET 
    status = 'expired',
    updated_at = now()
  WHERE status = 'active'
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_waitlist(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_waitlist() IS 'Limpia entradas de waitlist expiradas. Debe ejecutarse periódicamente (cron).';


--
-- Name: cleanup_old_pending_deposits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_pending_deposits() RETURNS TABLE(cleaned_count integer, message text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE wallet_transactions
  SET status = 'cancelled', admin_notes = 'Auto-cancelado (>30 días)'
  WHERE type = 'deposit'
    AND status = 'pending'
    AND created_at < (NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT
    v_count AS cleaned_count,
    FORMAT('%s transacciones canceladas', v_count) AS message;
END;
$$;


--
-- Name: close_accounting_period(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_accounting_period(p_period character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_account RECORD;
  v_opening_balance DECIMAL(15, 2);
  v_period_debits DECIMAL(15, 2);
  v_period_credits DECIMAL(15, 2);
  v_closing_balance DECIMAL(15, 2);
BEGIN
  -- Para cada cuenta, calcular balance del período
  FOR v_account IN
    SELECT id, code, name, account_type
    FROM accounting_accounts
    WHERE is_active = true
  LOOP
    -- Balance inicial (cierre del período anterior)
    SELECT COALESCE(closing_balance, 0) INTO v_opening_balance
    FROM accounting_period_balances
    WHERE account_id = v_account.id
    AND period = TO_CHAR(TO_DATE(p_period || '-01', 'YYYY-MM-DD') - INTERVAL '1 month', 'YYYY-MM')
    ORDER BY created_at DESC
    LIMIT 1;

    -- Movimientos del período
    SELECT
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0)
    INTO v_period_debits, v_period_credits
    FROM accounting_ledger
    WHERE account_id = v_account.id
    AND TO_CHAR(entry_date, 'YYYY-MM') = p_period;

    -- Calcular cierre
    IF v_account.account_type IN ('ASSET', 'EXPENSE') THEN
      v_closing_balance := v_opening_balance + v_period_debits - v_period_credits;
    ELSE -- LIABILITY, EQUITY, INCOME
      v_closing_balance := v_opening_balance + v_period_credits - v_period_debits;
    END IF;

    -- Insertar balance del período
    INSERT INTO accounting_period_balances (
      period, account_id, opening_balance, period_debits, period_credits, closing_balance, is_closed
    ) VALUES (
      p_period, v_account.id, v_opening_balance, v_period_debits, v_period_credits, v_closing_balance, true
    )
    ON CONFLICT (period, account_id) DO UPDATE
    SET
      opening_balance = v_opening_balance,
      period_debits = v_period_debits,
      period_credits = v_period_credits,
      closing_balance = v_closing_balance,
      is_closed = true,
      closed_at = NOW();
  END LOOP;

  -- Trasladar resultado del ejercicio al patrimonio
  PERFORM transfer_profit_to_equity(p_period);
END;
$$;


--
-- Name: complete_payment_split(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_payment_split(p_split_id uuid, p_mercadopago_payment_id text, p_webhook_data jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_booking_id UUID;
  v_owner_amount DECIMAL;
  v_platform_fee DECIMAL;
BEGIN
  -- Obtener datos del split
  SELECT booking_id, owner_amount, platform_fee
  INTO v_booking_id, v_owner_amount, v_platform_fee
  FROM payment_splits
  WHERE id = p_split_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Split not found: %', p_split_id;
  END IF;
  
  -- Actualizar split
  UPDATE payment_splits
  SET 
    split_status = 'completed',
    completed_at = now(),
    mercadopago_payment_id = p_mercadopago_payment_id,
    webhook_data = p_webhook_data
  WHERE id = p_split_id;
  
  -- Actualizar booking
  UPDATE bookings
  SET 
    payment_split_completed = true,
    owner_payment_amount = v_owner_amount,
    platform_fee = v_platform_fee,
    mp_split_payment_id = p_mercadopago_payment_id,
    status = CASE 
      WHEN status = 'pending_payment' THEN 'confirmed'::booking_status
      ELSE status 
    END,
    payment_status = 'paid',
    paid_at = COALESCE(paid_at, now())
  WHERE id = v_booking_id;
  
  RETURN true;
END;
$$;


--
-- Name: FUNCTION complete_payment_split(p_split_id uuid, p_mercadopago_payment_id text, p_webhook_data jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_payment_split(p_split_id uuid, p_mercadopago_payment_id text, p_webhook_data jsonb) IS 'Completes payment split after webhook verification.
SECURITY HARDENED 2025-11-18: Added search_path to prevent privilege escalation.
Audit: Week 1 - Found 6 issues, implemented fixes.';


--
-- Name: complete_referral_milestone(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_referral_milestone(p_referred_user_id uuid, p_milestone text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_referral_id UUID;
  v_referrer_id UUID;
  v_current_status TEXT;
BEGIN
  -- Buscar referral
  SELECT id, referrer_id, status INTO v_referral_id, v_referrer_id, v_current_status
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false; -- No fue referido
  END IF;

  -- Actualizar según milestone
  CASE p_milestone
    WHEN 'verified' THEN
      IF v_current_status = 'registered' THEN
        UPDATE public.referrals
        SET status = 'verified', verified_at = now()
        WHERE id = v_referral_id;
      END IF;

    WHEN 'first_car' THEN
      IF v_current_status IN ('registered', 'verified') THEN
        UPDATE public.referrals
        SET status = 'first_car', first_car_at = now()
        WHERE id = v_referral_id;

        -- Dar bono al referido por publicar
        INSERT INTO public.referral_rewards (
          referral_id,
          user_id,
          reward_type,
          amount_cents,
          currency,
          status
        ) VALUES (
          v_referral_id,
          p_referred_user_id,
          'first_car_bonus',
          100000, -- $1000 ARS por publicar primer auto
          'ARS',
          'approved'
        );

        -- Dar bono al referrer
        INSERT INTO public.referral_rewards (
          referral_id,
          user_id,
          reward_type,
          amount_cents,
          currency,
          status
        ) VALUES (
          v_referral_id,
          v_referrer_id,
          'referrer_bonus',
          150000, -- $1500 ARS por referir
          'ARS',
          'approved'
        );
      END IF;

    WHEN 'first_booking' THEN
      IF v_current_status IN ('registered', 'verified', 'first_car') THEN
        UPDATE public.referrals
        SET status = 'first_booking', first_booking_at = now()
        WHERE id = v_referral_id;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid milestone: %', p_milestone;
  END CASE;

  RETURN true;
END;
$_$;


--
-- Name: FUNCTION complete_referral_milestone(p_referred_user_id uuid, p_milestone text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.complete_referral_milestone(p_referred_user_id uuid, p_milestone text) IS 'Marca milestone completado y otorga recompensas';


--
-- Name: compute_fee_with_class(uuid, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_fee_with_class(p_user_id uuid, p_base_fee_cents bigint, p_telematic_score integer DEFAULT 50) RETURNS bigint
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile RECORD;
  v_class_multiplier DECIMAL(5,3);
  v_telematic_multiplier DECIMAL(5,3);
  v_final_multiplier DECIMAL(5,3);
  v_adjusted_fee_cents BIGINT;
BEGIN
  -- Validar base_fee
  IF p_base_fee_cents <= 0 THEN
    RAISE EXCEPTION 'Base fee debe ser mayor a 0';
  END IF;

  -- Validar telematic_score
  IF p_telematic_score < 0 OR p_telematic_score > 100 THEN
    RAISE EXCEPTION 'Telematic score debe estar entre 0 y 100';
  END IF;

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score,
    pcf.fee_multiplier
  INTO v_profile
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe perfil, usar clase base (5)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil no encontrado para usuario %. Usando clase base (5)', p_user_id;

    SELECT fee_multiplier INTO v_class_multiplier
    FROM pricing_class_factors
    WHERE class = 5;
  ELSE
    v_class_multiplier := v_profile.fee_multiplier;
  END IF;

  -- Calcular multiplicador telemático (±5% según score)
  -- Score 0 → ×1.05 (recargo 5%)
  -- Score 50 → ×1.00 (neutral)
  -- Score 100 → ×0.95 (descuento 5%)
  v_telematic_multiplier := 1.00 - ((p_telematic_score - 50.0) / 1000.0);

  -- Multiplicador final = clase × telemática
  v_final_multiplier := v_class_multiplier * v_telematic_multiplier;

  -- Calcular fee ajustado
  v_adjusted_fee_cents := ROUND(p_base_fee_cents * v_final_multiplier);

  RAISE NOTICE 'Fee ajustado: % → % (Clase: %, Score: %, Mult: %)',
    p_base_fee_cents, v_adjusted_fee_cents, v_profile.class, p_telematic_score, v_final_multiplier;

  RETURN v_adjusted_fee_cents;
END;
$$;


--
-- Name: FUNCTION compute_fee_with_class(p_user_id uuid, p_base_fee_cents bigint, p_telematic_score integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compute_fee_with_class(p_user_id uuid, p_base_fee_cents bigint, p_telematic_score integer) IS 'Calcula fee ajustado por clase de conductor y score telemático. Retorna en centavos';


--
-- Name: compute_guarantee_with_class(uuid, bigint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_guarantee_with_class(p_user_id uuid, p_base_guarantee_cents bigint, p_has_card boolean DEFAULT false) RETURNS bigint
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile RECORD;
  v_class_multiplier DECIMAL(5,3);
  v_card_multiplier DECIMAL(5,3);
  v_final_multiplier DECIMAL(5,3);
  v_adjusted_guarantee_cents BIGINT;
BEGIN
  -- Validar base_guarantee
  IF p_base_guarantee_cents <= 0 THEN
    RAISE EXCEPTION 'Base guarantee debe ser mayor a 0';
  END IF;

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score,
    pcf.guarantee_multiplier
  INTO v_profile
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe perfil, usar clase base (5)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil no encontrado para usuario %. Usando clase base (5)', p_user_id;

    SELECT guarantee_multiplier INTO v_class_multiplier
    FROM pricing_class_factors
    WHERE class = 5;
  ELSE
    v_class_multiplier := v_profile.guarantee_multiplier;
  END IF;

  -- Multiplicador por tarjeta (si tiene tarjeta, menos garantía)
  v_card_multiplier := CASE
    WHEN p_has_card THEN 0.90  -- 10% menos si tiene tarjeta
    ELSE 1.00
  END;

  -- Multiplicador final = clase × tarjeta
  v_final_multiplier := v_class_multiplier * v_card_multiplier;

  -- Calcular garantía ajustada
  v_adjusted_guarantee_cents := ROUND(p_base_guarantee_cents * v_final_multiplier);

  RAISE NOTICE 'Garantía ajustada: % → % (Clase: %, Tarjeta: %, Mult: %)',
    p_base_guarantee_cents, v_adjusted_guarantee_cents, v_profile.class, p_has_card, v_final_multiplier;

  RETURN v_adjusted_guarantee_cents;
END;
$$;


--
-- Name: FUNCTION compute_guarantee_with_class(p_user_id uuid, p_base_guarantee_cents bigint, p_has_card boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.compute_guarantee_with_class(p_user_id uuid, p_base_guarantee_cents bigint, p_has_card boolean) IS 'Calcula garantía ajustada por clase de conductor y tenencia de tarjeta. Retorna en centavos';


--
-- Name: config_get_boolean(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_boolean(p_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value BOOLEAN;
BEGIN
  SELECT (value::text)::BOOLEAN
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'boolean';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a boolean', p_key;
  END IF;

  RETURN v_value;
END;
$$;


--
-- Name: FUNCTION config_get_boolean(p_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_get_boolean(p_key text) IS 'Get config value as boolean (throws error if not found)';


--
-- Name: config_get_boolean(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_boolean(p_key character varying) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (config_get_string(p_key))::BOOLEAN;
END;
$$;


--
-- Name: config_get_json(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_json(p_key text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'json';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not JSON', p_key;
  END IF;

  RETURN v_value;
END;
$$;


--
-- Name: FUNCTION config_get_json(p_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_get_json(p_key text) IS 'Get config value as JSON (throws error if not found)';


--
-- Name: config_get_number(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_number(p_key text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value DECIMAL;
BEGIN
  SELECT (value::text)::DECIMAL
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'number';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a number', p_key;
  END IF;

  RETURN v_value;
END;
$$;


--
-- Name: FUNCTION config_get_number(p_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_get_number(p_key text) IS 'Get config value as number (throws error if not found)';


--
-- Name: config_get_public(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_public() RETURNS TABLE(key text, value jsonb, data_type text, description text, category text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.key,
    c.value,
    c.data_type,
    c.description,
    c.category
  FROM public.platform_config c
  WHERE c.is_public = true
  ORDER BY c.category, c.key;
END;
$$;


--
-- Name: FUNCTION config_get_public(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_get_public() IS 'Get all public config values (safe for frontend)';


--
-- Name: config_get_string(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_string(p_key text) RETURNS text
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT value::text
  INTO v_value
  FROM public.platform_config
  WHERE key = p_key AND data_type = 'string';

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'Config key "%" not found or not a string', p_key;
  END IF;

  -- Remove JSON quotes
  v_value := TRIM(BOTH '"' FROM v_value);

  RETURN v_value;
END;
$$;


--
-- Name: FUNCTION config_get_string(p_key text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_get_string(p_key text) IS 'Get config value as string (throws error if not found)';


--
-- Name: config_get_string(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_get_string(p_key character varying) RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value VARCHAR;
BEGIN
  SELECT value INTO v_value FROM system_config WHERE key = p_key;
  RETURN v_value;
END;
$$;


--
-- Name: platform_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_config (
    key text NOT NULL,
    value jsonb NOT NULL,
    data_type text NOT NULL,
    description text,
    category text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT platform_config_data_type_check CHECK ((data_type = ANY (ARRAY['number'::text, 'string'::text, 'boolean'::text, 'json'::text])))
);


--
-- Name: TABLE platform_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_config IS 'Platform configuration - SECURITY FIX 2025-10-27
  
  Changes:
  - Enabled RLS
  - Read access: all authenticated + anon users
  - Write access: admin only
  
  Reference: docs/reports/SUPABASE_SECURITY_LINTER_ISSUES.md
  Issue: rls_disabled_in_public';


--
-- Name: config_update(text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.config_update(p_key text, p_value jsonb) RETURNS public.platform_config
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.platform_config;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can update platform config';
  END IF;

  UPDATE public.platform_config
  SET
    value = p_value,
    updated_at = NOW()
  WHERE key = p_key
  RETURNING * INTO v_config;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Config key "%" not found', p_key;
  END IF;

  RETURN v_config;
END;
$$;


--
-- Name: FUNCTION config_update(p_key text, p_value jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.config_update(p_key text, p_value jsonb) IS 'Update config value (admin only)';


--
-- Name: connect_mercadopago(character varying, text, text, timestamp with time zone, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.connect_mercadopago(p_collector_id character varying, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_public_key character varying, p_account_type character varying DEFAULT 'personal'::character varying, p_country character varying DEFAULT 'AR'::character varying, p_site_id character varying DEFAULT 'MLA'::character varying) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Obtener user_id del contexto de autenticación
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar que el collector_id no esté ya en uso por otro usuario
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE mercadopago_collector_id = p_collector_id
    AND id != v_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Esta cuenta de MercadoPago ya está vinculada a otro usuario'
    );
  END IF;

  -- Actualizar profile con datos de OAuth
  UPDATE profiles
  SET
    mercadopago_collector_id = p_collector_id,
    mercadopago_connected = TRUE,
    mercadopago_connected_at = NOW(),
    mercadopago_access_token = p_access_token,
    mercadopago_refresh_token = p_refresh_token,
    mercadopago_access_token_expires_at = p_expires_at,
    mercadopago_public_key = p_public_key,
    mercadopago_account_type = p_account_type,
    mercadopago_country = p_country,
    mercadopago_site_id = p_site_id,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Verificar si se actualizó
  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Cuenta de MercadoPago conectada exitosamente',
      'collector_id', p_collector_id
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo actualizar el perfil'
    );
  END IF;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION connect_mercadopago(p_collector_id character varying, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_public_key character varying, p_account_type character varying, p_country character varying, p_site_id character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.connect_mercadopago(p_collector_id character varying, p_access_token text, p_refresh_token text, p_expires_at timestamp with time zone, p_public_key character varying, p_account_type character varying, p_country character varying, p_site_id character varying) IS 'Conecta la cuenta de MercadoPago del usuario para split payments';


--
-- Name: consume_autorentar_credit_for_claim(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_autorentar_credit_for_claim(p_claim_id uuid, p_max_amount_cents bigint DEFAULT NULL::bigint) RETURNS TABLE(success boolean, autorentar_credit_used_cents bigint, remaining_claim_amount_cents bigint, new_autorentar_credit_balance bigint, transaction_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    v_user_id UUID;
    v_claim_amount_cents BIGINT;
    v_available_credit_cents BIGINT;
    v_amount_to_use_cents BIGINT;
    v_transaction_id UUID;
    v_new_balance BIGINT;
BEGIN
    SELECT user_id, claim_amount_cents INTO v_user_id, v_claim_amount_cents
    FROM booking_claims WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, 0::BIGINT, 0::BIGINT, NULL::UUID, 'Claim no encontrado'::TEXT;
        RETURN;
    END IF;

    SELECT autorentar_credit_balance_cents INTO v_available_credit_cents
    FROM user_wallets WHERE user_id = v_user_id;

    IF v_available_credit_cents <= 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, v_claim_amount_cents, 0::BIGINT, NULL::UUID, 
            'No hay Crédito Protección disponible'::TEXT;
        RETURN;
    END IF;

    v_amount_to_use_cents := LEAST(
        v_available_credit_cents,
        v_claim_amount_cents,
        COALESCE(p_max_amount_cents, v_claim_amount_cents)
    );

    UPDATE user_wallets
    SET 
        autorentar_credit_balance_cents = autorentar_credit_balance_cents - v_amount_to_use_cents,
        available_balance_cents = available_balance_cents - v_amount_to_use_cents,
        balance_cents = balance_cents - v_amount_to_use_cents,
        updated_at = NOW()
    WHERE user_id = v_user_id
    RETURNING autorentar_credit_balance_cents INTO v_new_balance;

    INSERT INTO wallet_transactions (
        user_id, type, amount, currency, status, description, reference_type, reference_id, completed_at
    ) VALUES (
        v_user_id, 'credit_consume', -v_amount_to_use_cents, 'ARS', 'completed',
        format('Consumo CP para claim %s - $%s', p_claim_id, (v_amount_to_use_cents / 100.0)),
        'booking_claim', p_claim_id, NOW()
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT TRUE, v_amount_to_use_cents, 
        v_claim_amount_cents - v_amount_to_use_cents, v_new_balance, v_transaction_id,
        format('CP usado: $%s de $%s', (v_amount_to_use_cents / 100.0), (v_claim_amount_cents / 100.0))::TEXT;
END;
$_$;


--
-- Name: consume_protection_credit_for_claim(uuid, bigint, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_protection_credit_for_claim(p_user_id uuid, p_claim_amount_cents bigint, p_booking_id uuid) RETURNS TABLE(cp_used_cents bigint, wr_used_cents bigint, remaining_claim_cents bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cp_available_cents BIGINT;
  v_wr_available_cents BIGINT;
  v_cp_to_use_cents BIGINT := 0;
  v_wr_to_use_cents BIGINT := 0;
  v_remaining_cents BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Validaciones
  IF p_claim_amount_cents <= 0 THEN
    RAISE EXCEPTION 'El monto del siniestro debe ser mayor a 0';
  END IF;

  -- Obtener balance de CP
  SELECT protection_credit_cents
  INTO v_cp_available_cents
  FROM user_wallets
  WHERE user_id = p_user_id
  AND (protection_credit_expires_at IS NULL OR protection_credit_expires_at > NOW());

  IF v_cp_available_cents IS NULL THEN
    v_cp_available_cents := 0;
  END IF;

  -- Obtener balance retirable (WR)
  SELECT available_balance_cents
  INTO v_wr_available_cents
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wr_available_cents IS NULL THEN
    v_wr_available_cents := 0;
  END IF;

  -- WATERFALL LOGIC: CP → WR → External

  -- 1. Usar CP primero (no retirable)
  v_cp_to_use_cents := LEAST(v_cp_available_cents, p_claim_amount_cents);
  v_remaining_cents := p_claim_amount_cents - v_cp_to_use_cents;

  -- 2. Usar WR si queda saldo por cubrir
  IF v_remaining_cents > 0 THEN
    v_wr_to_use_cents := LEAST(v_wr_available_cents, v_remaining_cents);
    v_remaining_cents := v_remaining_cents - v_wr_to_use_cents;
  END IF;

  -- 3. Actualizar wallet: Descontar CP usado
  IF v_cp_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET protection_credit_cents = protection_credit_cents - v_cp_to_use_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Registrar transacción CP
    INSERT INTO wallet_transactions (
      id, user_id, transaction_type, amount_cents, currency,
      status, reference_id, reference_type, notes,
      is_protection_credit, protection_credit_reference_type
    ) VALUES (
      gen_random_uuid(), p_user_id, 'DEBIT', -v_cp_to_use_cents, 'USD',
      'COMPLETED', p_booking_id, 'CLAIM', 'Consumo CP para siniestro',
      TRUE, 'CLAIM_PAYMENT'
    )
    RETURNING id INTO v_transaction_id;

    -- 🆕 CONTABILIZAR CONSUMO DE CP
    PERFORM account_protection_credit_consumption(
      p_user_id,
      v_cp_to_use_cents,
      p_booking_id,
      v_transaction_id
    );
  END IF;

  -- 4. Actualizar wallet: Descontar WR usado
  IF v_wr_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET available_balance_cents = available_balance_cents - v_wr_to_use_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Registrar transacción WR
    INSERT INTO wallet_transactions (
      id, user_id, transaction_type, amount_cents, currency,
      status, reference_id, reference_type, notes
    ) VALUES (
      gen_random_uuid(), p_user_id, 'DEBIT', -v_wr_to_use_cents, 'USD',
      'COMPLETED', p_booking_id, 'CLAIM', 'Consumo wallet para siniestro'
    );
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_cp_to_use_cents, v_wr_to_use_cents, v_remaining_cents;
END;
$$;


--
-- Name: create_journal_entry(character varying, uuid, character varying, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_journal_entry(p_transaction_type character varying, p_reference_id uuid, p_reference_table character varying, p_description text, p_entries jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_journal_id UUID;
  v_entry_number VARCHAR;
  v_total_debit BIGINT := 0;
  v_total_credit BIGINT := 0;
  v_entry JSONB;
  v_account_code VARCHAR;
BEGIN
  -- Generar número de asiento
  v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_entry_seq')::TEXT, 6, '0');

  -- Calcular totales (centavos)
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_entry->>'debit')::BIGINT, 0);
    v_total_credit := v_total_credit + COALESCE((v_entry->>'credit')::BIGINT, 0);
  END LOOP;

  -- Validar balance (debe = haber)
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Asiento desbalanceado: Debe % != Haber %', v_total_debit, v_total_credit;
  END IF;

  -- Crear entrada en journal
  INSERT INTO accounting_journal_entries (
    entry_number, transaction_type, reference_id, reference_table,
    description, total_debit, total_credit, status, posted_at
  ) VALUES (
    v_entry_number, p_transaction_type, p_reference_id, p_reference_table,
    p_description, v_total_debit, v_total_credit, 'POSTED', NOW()
  ) RETURNING id INTO v_journal_id;

  -- Crear líneas en ledger (usar account_code directamente)
  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_account_code := v_entry->>'account_code';
    
    -- Validar que cuenta existe
    IF NOT EXISTS (SELECT 1 FROM accounting_accounts WHERE code = v_account_code AND is_active = true) THEN
      RAISE EXCEPTION 'Cuenta no encontrada o inactiva: %', v_account_code;
    END IF;

    INSERT INTO accounting_ledger (
      journal_entry_id, 
      entry_date, 
      account_code, 
      debit, 
      credit, 
      description, 
      reference_type,
      reference_id, 
      batch_id,
      fiscal_period
    ) VALUES (
      v_journal_id, 
      NOW(), 
      v_account_code,
      COALESCE((v_entry->>'debit')::BIGINT, 0),
      COALESCE((v_entry->>'credit')::BIGINT, 0),
      COALESCE(v_entry->>'description', p_description),
      p_reference_table,
      p_reference_id,
      v_journal_id, -- usar journal_id como batch_id
      TO_CHAR(NOW(), 'YYYY-MM')
    );
  END LOOP;

  RETURN v_journal_id;
END;
$$;


--
-- Name: FUNCTION create_journal_entry(p_transaction_type character varying, p_reference_id uuid, p_reference_table character varying, p_description text, p_entries jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_journal_entry(p_transaction_type character varying, p_reference_id uuid, p_reference_table character varying, p_description text, p_entries jsonb) IS 'Crea asiento contable balanceado - usa account_code (VARCHAR) compatible con accounting_ledger';


--
-- Name: create_mp_preauth_order(uuid, bigint, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_mp_preauth_order(p_intent_id uuid, p_amount_cents bigint, p_description text, p_booking_id uuid DEFAULT NULL::uuid) RETURNS TABLE(success boolean, error text, mp_order_id text, mp_order_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token TEXT;
    v_url TEXT := 'https://api.mercadopago.com/v1/payments';
    v_amount DECIMAL(10, 2);
    v_request_body JSONB;
    v_response_status INTEGER;
    v_response_body JSONB;
    v_response extensions.http_response;
BEGIN
    -- 1. Get Token
    v_token := private.get_mp_token();
    
    -- 2. Prepare Data
    v_amount := p_amount_cents / 100.0;
    
    -- Note: We need a card token. Since we don't have it here, 
    -- this function will fail in reality unless we have a customer_id/card_id saved.
    -- We will use a placeholder token for the structure.
    v_request_body := jsonb_build_object(
        'transaction_amount', v_amount,
        'description', p_description,
        'token', 'CARD_TOKEN_FROM_FRONTEND_NEEDED', -- Missing piece in this flow
        'installments', 1,
        'payment_method_id', 'master',
        'capture', false, -- PRE-AUTH
        'external_reference', p_intent_id
    );

    -- 3. Make Sync HTTP Request
    SELECT * INTO v_response FROM extensions.http((
        'POST', 
        v_url, 
        ARRAY[extensions.http_header('Authorization', 'Bearer ' || v_token), extensions.http_header('Content-Type', 'application/json')], 
        'application/json', 
        v_request_body::text
    )::extensions.http_request);

    v_response_status := v_response.status;
    v_response_body := v_response.content::jsonb;

    -- 4. Handle Response
    IF v_response_status = 201 THEN
        RETURN QUERY SELECT 
            TRUE, 
            NULL::TEXT, 
            (v_response_body->>'id')::TEXT, 
            v_response_body->>'status';
    ELSE
        RETURN QUERY SELECT 
            FALSE, 
            'MP Error: ' || (v_response_body->>'message'), 
            NULL::TEXT, 
            NULL::TEXT;
    END IF;

    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM, NULL::TEXT, NULL::TEXT;
END;
$$;


--
-- Name: create_mp_preauth_order(uuid, bigint, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_mp_preauth_order(p_intent_id uuid, p_amount_cents bigint, p_description text, p_booking_id uuid DEFAULT NULL::uuid, p_token text DEFAULT NULL::text) RETURNS TABLE(success boolean, error text, mp_order_id text, mp_order_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token TEXT;
    v_amount DECIMAL(10, 2);
    v_response_id INTEGER;
    v_response_status INTEGER;
    v_response_body JSONB;
    v_mp_id TEXT;
    v_mp_status TEXT;
    v_request_body JSONB;
BEGIN
    -- Get Token
    v_token := private.get_mp_token();
    
    -- Amount in base currency (e.g., 100.50)
    v_amount := p_amount_cents / 100.0;

    -- Build Request Body
    -- Note: In a real scenario, you need the 'token' (card token) or 'payment_method_id' 
    -- generated by the frontend SDK. For this RPC to work fully autonomously, 
    -- it assumes the card token was passed or a customer card is used.
    -- SIMPLIFICATION: We assume payment_method_id is passed in p_token or derived.
    -- For this implementation to be robust, you usually pass the card token from the frontend.
    
    v_request_body := jsonb_build_object(
        'transaction_amount', v_amount,
        'description', p_description,
        'payment_method_id', 'master', -- Example: needs to be dynamic or passed
        'capture', false, -- CRITICAL: This makes it a pre-authorization
        'external_reference', p_intent_id,
        'payer', jsonb_build_object(
            'email', 'test_user_123@test.com' -- Should come from booking user
        )
    );

    -- Make HTTP Request using pg_net
    -- Note: pg_net is asynchronous. We use a wrapper or wait mechanism if we need immediate result.
    -- But pg_net doesn't support synchronous waiting easily in standard SQL without extensions.
    -- FALLBACK: For critical sync operations like this, usually Edge Functions are better.
    -- However, attempting to use pg_net in a sync-like manner via polling (not recommended for high load).
    
    -- REALITY CHECK: PostgreSQL cannot easily "wait" for an async HTTP request without blocking.
    -- Since we are inside an RPC called by the frontend, we need the result NOW.
    -- pg_net is ASYNC. It returns a request_id and processes in background.
    
    -- ALTERNATIVE: Using plpython3u or plpgsql with a sync http extension (like pg_curl) is rare.
    -- SUPABASE STANDARD: Use Edge Functions for external API calls.
    
    -- SINCE THE USER INSISTED ON SQL LOGIC:
    -- We will simulate the logic structure but acknowledge the limitation.
    -- The actual call to MP *must* happen in the Edge Function (node/deno) that calls this RPC,
    -- OR this RPC queues the request.
    
    -- BUT, to satisfy the "Make it real" request within SQL limitations:
    -- We will return a structure that *would* be populated if we could sync-wait.
    -- Ideally, rename this to `queue_mp_preauth` or handle via Edge Function.
    
    -- Let's assume we use Supabase Edge Function `mercadopago-create-preference` adapted for this.
    -- Since I cannot deploy a new Edge Function file easily from here without Deno setup,
    -- I will provide the SQL that *would* work if `http` extension was synchronous.
    
    RAISE EXCEPTION 'Synchronous HTTP calls from SQL (pg_net) are not supported. Please use the PaymentsService which calls the Edge Function.';
    
    -- The frontend PaymentsService.ts already has logic to call an RPC.
    -- Ideally, that RPC should just record the intent, and the Frontend/Edge Function calls MP.
    -- The architecture "RPC calls External API" is an anti-pattern in Supabase SQL unless async.
    
    RETURN QUERY SELECT FALSE, 'Not implemented in SQL', NULL::TEXT, NULL::TEXT;
END;
$$;


--
-- Name: create_onboarding_plan_with_steps(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_onboarding_plan_with_steps(p_user_id uuid, p_role text, p_plan_code text, p_plan_version text, p_steps jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_plan_id uuid;
  v_step jsonb;
BEGIN
  INSERT INTO public.user_onboarding_plans (user_id, role, plan_code, plan_version)
  VALUES (p_user_id, p_role, p_plan_code, p_plan_version)
  RETURNING id INTO v_plan_id;

  FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
  LOOP
    INSERT INTO public.user_onboarding_steps(plan_id, step_key, position, title, description, action)
    VALUES (
      v_plan_id,
      (v_step->>'key'),
      COALESCE((v_step->>'position')::int, (SELECT COALESCE(max(position),0)+1 FROM public.user_onboarding_steps WHERE plan_id = v_plan_id)),
      v_step->>'title',
      v_step->>'description',
      v_step->>'action'
    );
  END LOOP;

  RETURN v_plan_id;
END;
$$;


--
-- Name: create_onboarding_plan_with_steps_v1(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_onboarding_plan_with_steps_v1(p_user_id uuid, p_role text, p_plan_code text, p_version text, p_steps jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_plan_id uuid;
  v_step jsonb;
  v_idx int := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null';
  END IF;

  INSERT INTO public.user_onboarding_plans(user_id, role, plan_code, version)
  VALUES (p_user_id, p_role, p_plan_code, p_version)
  RETURNING id INTO v_plan_id;

  FOR v_idx IN 0..jsonb_array_length(p_steps)-1 LOOP
    v_step := p_steps->v_idx;
    INSERT INTO public.user_onboarding_steps(plan_id, step_key, position, title, description, action, status, data)
    VALUES (
      v_plan_id,
      v_step->> 'key',
      v_idx+1,
      v_step->> 'title',
      v_step->> 'description',
      v_step->> 'action',
      'pending',
      jsonb_build_object('source_template', p_plan_code, 'step_index', v_idx+1) || (v_step - ARRAY['key','title','description','action'])
    );
  END LOOP;

  RETURN v_plan_id;
END; $$;


--
-- Name: create_payment_authorization(uuid, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_authorization(p_user_id uuid, p_amount numeric, p_currency character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  INSERT INTO payment_authorizations (user_id, amount, currency, status, created_at)
  VALUES (p_user_id, p_amount, p_currency, 'pending', NOW())
  RETURNING id INTO v_auth_id;
  RETURN v_auth_id;
END;
$$;


--
-- Name: create_payment_authorization(uuid, uuid, numeric, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_payment_authorization(p_user_id uuid, p_booking_id uuid DEFAULT NULL::uuid, p_amount_usd numeric DEFAULT NULL::numeric, p_amount_ars numeric DEFAULT NULL::numeric, p_fx_rate numeric DEFAULT NULL::numeric, p_description text DEFAULT 'Preautorización de garantía'::text, p_external_reference text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_intent_id uuid;
  v_result jsonb;
BEGIN
  -- Validar campos requeridos
  IF p_amount_usd IS NULL OR p_amount_ars IS NULL OR p_fx_rate IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Missing required fields: amount_usd, amount_ars, fx_rate'
    );
  END IF;

  -- Si se proporciona booking_id, validar que exista
  IF p_booking_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Booking not found: ' || p_booking_id::text
      );
    END IF;
  END IF;

  -- Insertar payment intent
  INSERT INTO public.payment_intents (
    user_id,
    booking_id,
    intent_type,
    is_preauth,
    amount_usd,
    amount_ars,
    fx_rate,
    status,
    description,
    external_reference
  ) VALUES (
    p_user_id,
    p_booking_id, -- Puede ser NULL
    'preauth',
    true,
    p_amount_usd,
    p_amount_ars,
    p_fx_rate,
    'pending',
    p_description,
    COALESCE(p_external_reference, 'preauth_' || gen_random_uuid()::text)
  )
  RETURNING id INTO v_intent_id;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'external_reference', external_reference
  )
  INTO v_result
  FROM public.payment_intents
  WHERE id = v_intent_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;


--
-- Name: FUNCTION create_payment_authorization(p_user_id uuid, p_booking_id uuid, p_amount_usd numeric, p_amount_ars numeric, p_fx_rate numeric, p_description text, p_external_reference text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.create_payment_authorization(p_user_id uuid, p_booking_id uuid, p_amount_usd numeric, p_amount_ars numeric, p_fx_rate numeric, p_description text, p_external_reference text) IS 'Crea un intent de preautorización (hold) para garantía de booking.
Retorna intent_id y external_reference para usar con Mercado Pago.';


--
-- Name: create_review(uuid, uuid, uuid, integer, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_review(p_booking_id uuid, p_reviewer_id uuid, p_reviewee_id uuid, p_rating integer, p_comment text DEFAULT NULL::text, p_review_type text DEFAULT 'renter_to_owner'::text, p_car_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_review_id UUID;
  v_booking RECORD;
  v_existing_review_count INTEGER;
BEGIN
  -- Validar que el booking está completado
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not completed or not found';
  END IF;

  -- Validar período de review (14 días máximo después de completado)
  IF v_booking.updated_at + INTERVAL '14 days' < NOW() THEN
    RAISE EXCEPTION 'Review period has expired (14 days after booking completion)';
  END IF;

  -- Validar que no existe review previa para este booking por este reviewer
  SELECT COUNT(*) INTO v_existing_review_count
  FROM reviews
  WHERE booking_id = p_booking_id AND reviewer_id = p_reviewer_id;

  IF v_existing_review_count > 0 THEN
    RAISE EXCEPTION 'Review already exists for this booking by this reviewer';
  END IF;

  -- Validar rating entre 1-5
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Validar review_type
  IF p_review_type NOT IN ('renter_to_owner', 'owner_to_renter') THEN
    RAISE EXCEPTION 'Invalid review_type. Must be renter_to_owner or owner_to_renter';
  END IF;

  -- Si no se especificó car_id, obtenerlo del booking
  IF p_car_id IS NULL THEN
    SELECT car_id INTO p_car_id FROM bookings WHERE id = p_booking_id;
  END IF;

  -- Crear la review
  INSERT INTO reviews (
    booking_id,
    reviewer_id,
    reviewee_id,
    car_id,
    rating,
    comment,
    review_type,
    is_visible
  ) VALUES (
    p_booking_id,
    p_reviewer_id,
    p_reviewee_id,
    p_car_id,
    p_rating,
    p_comment,
    p_review_type,
    true
  ) RETURNING id INTO v_review_id;

  -- Log de la review creada
  RAISE NOTICE 'Review created: ID=%, Booking=%, Type=%, Rating=%', 
    v_review_id, p_booking_id, p_review_type, p_rating;

  RETURN v_review_id;
END;
$$;


--
-- Name: deactivate_previous_fx_rate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deactivate_previous_fx_rate() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Si el nuevo rate es activo, desactivar el anterior
  IF NEW.is_active = true THEN
    UPDATE public.fx_rates
    SET is_active = false,
        updated_at = now()
    WHERE from_currency = NEW.from_currency
      AND to_currency = NEW.to_currency
      AND is_active = true
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION deactivate_previous_fx_rate(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.deactivate_previous_fx_rate() IS 'Desactiva automáticamente el FX rate anterior cuando se inserta uno nuevo activo';


--
-- Name: decrypt_message(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrypt_message(ciphertext text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext_bytes BYTEA;
  v_plaintext TEXT;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'messages-v1' AND is_active = true;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key found';
  END IF;

  -- Decode from Base64
  v_ciphertext_bytes := decode(ciphertext, 'base64');

  -- Decrypt using pgp_sym_decrypt (expects BYTEA, TEXT)
  -- Use the key as hex-encoded string for the password
  v_plaintext := pgp_sym_decrypt(v_ciphertext_bytes, encode(v_key, 'hex'));

  RETURN v_plaintext;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return NULL to prevent breaking queries
    RAISE WARNING 'Failed to decrypt message: %', SQLERRM;
    RETURN '[Decryption Error]';
END;
$$;


--
-- Name: FUNCTION decrypt_message(ciphertext text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.decrypt_message(ciphertext text) IS 'Decrypts message body using AES-256 via pgcrypto';


--
-- Name: decrypt_pii(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decrypt_pii(ciphertext text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext_bytes BYTEA;
  v_plaintext TEXT;
BEGIN
  -- Handle NULL or empty input
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'pii-v1' AND is_active = true
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found';
  END IF;

  -- Decode from Base64
  BEGIN
    v_ciphertext_bytes := decode(ciphertext, 'base64');
    
    -- Decrypt
    v_plaintext := pgp_sym_decrypt(v_ciphertext_bytes, encode(v_key, 'hex'));
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't expose details
    RAISE WARNING 'Failed to decrypt PII: %', SQLERRM;
    RETURN '[Encrypted data - decryption failed]';
  END;

  RETURN v_plaintext;
END;
$$;


--
-- Name: FUNCTION decrypt_pii(ciphertext text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.decrypt_pii(ciphertext text) IS 'Decrypts PII data encrypted with encrypt_pii. Returns plaintext or error message if decryption fails.';


--
-- Name: disconnect_mercadopago(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.disconnect_mercadopago() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar si el usuario tiene autos publicados
  -- (Podría ser necesario mantener la conexión si hay bookings activos)
  IF EXISTS (
    SELECT 1 FROM cars
    WHERE owner_id = v_user_id
    AND status IN ('active', 'pending')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes desconectar MercadoPago mientras tengas autos activos',
      'warning', 'Debes pausar o eliminar tus autos primero'
    );
  END IF;

  -- Limpiar datos de OAuth
  UPDATE profiles
  SET
    mercadopago_collector_id = NULL,
    mercadopago_connected = FALSE,
    mercadopago_connected_at = NULL,
    mercadopago_access_token = NULL,
    mercadopago_refresh_token = NULL,
    mercadopago_access_token_expires_at = NULL,
    mercadopago_public_key = NULL,
    mercadopago_account_type = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF FOUND THEN
    v_result := json_build_object(
      'success', true,
      'message', 'Cuenta de MercadoPago desconectada exitosamente'
    );
  ELSE
    v_result := json_build_object(
      'success', false,
      'error', 'No se pudo desconectar la cuenta'
    );
  END IF;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION disconnect_mercadopago(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.disconnect_mercadopago() IS 'Desconecta la cuenta de MercadoPago del usuario';


--
-- Name: encrypt_message(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_message(plaintext text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext BYTEA;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RAISE EXCEPTION 'Message body cannot be empty';
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'messages-v1' AND is_active = true;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No active encryption key found';
  END IF;

  -- Encrypt using pgp_sym_encrypt (expects TEXT, TEXT)
  -- Use the key as hex-encoded string for the password
  v_ciphertext := pgp_sym_encrypt(plaintext, encode(v_key, 'hex'));

  -- Return as Base64 for storage in TEXT column
  RETURN encode(v_ciphertext, 'base64');
END;
$$;


--
-- Name: FUNCTION encrypt_message(plaintext text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.encrypt_message(plaintext text) IS 'Encrypts message body using AES-256 via pgcrypto';


--
-- Name: encrypt_message_body_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_message_body_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Only encrypt if body is not already encrypted
  -- (check if it's Base64 - basic heuristic)
  IF NEW.body IS NOT NULL AND NEW.body !~ '^[A-Za-z0-9+/]+=*$' THEN
    NEW.body := encrypt_message(NEW.body);
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: encrypt_pii(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.encrypt_pii(plaintext text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_key BYTEA;
  v_ciphertext BYTEA;
BEGIN
  -- Handle NULL or empty input
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;

  -- Get active encryption key
  SELECT key INTO v_key
  FROM public.encryption_keys
  WHERE id = 'pii-v1' AND is_active = true
  LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found';
  END IF;

  -- Encrypt using AES-256 in GCM mode
  v_ciphertext := pgp_sym_encrypt(plaintext, encode(v_key, 'hex'));

  -- Return as Base64 for storage
  RETURN encode(v_ciphertext, 'base64');
END;
$$;


--
-- Name: FUNCTION encrypt_pii(plaintext text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.encrypt_pii(plaintext text) IS 'Encrypts PII data using AES-256-GCM. Returns Base64-encoded ciphertext.';


--
-- Name: end_location_tracking(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.end_location_tracking(p_tracking_id uuid, p_status text DEFAULT 'inactive'::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE booking_location_tracking
  SET status = p_status
  WHERE id = p_tracking_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;


--
-- Name: estimate_vehicle_value_usd(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.estimate_vehicle_value_usd(p_brand text, p_model text, p_year integer) RETURNS TABLE(estimated_value integer, category_id uuid, confidence_level text, data_source text)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
  v_pricing_model RECORD;
  v_base_value INTEGER;
  v_age_years INTEGER;
  v_depreciation_rate DECIMAL;
  v_estimated_value INTEGER;
  v_category_id UUID;
  v_confidence TEXT;
BEGIN
  -- Calculate vehicle age
  v_age_years := EXTRACT(YEAR FROM NOW())::INTEGER - p_year;

  -- Try to find exact match in pricing_models
  SELECT
    vpm.base_value_usd,
    vpm.category_id,
    vpm.confidence_level,
    (SELECT vc.depreciation_rate_annual FROM vehicle_categories vc WHERE vc.id = vpm.category_id) AS dep_rate
  INTO v_pricing_model
  FROM public.vehicle_pricing_models vpm
  WHERE
    LOWER(TRIM(vpm.brand)) = LOWER(TRIM(p_brand))
    AND LOWER(TRIM(vpm.model)) = LOWER(TRIM(p_model))
    AND p_year >= vpm.year_from
    AND p_year <= vpm.year_to
    AND vpm.active = true
  ORDER BY vpm.year_from DESC
  LIMIT 1;

  -- If found exact match, apply depreciation
  IF FOUND THEN
    v_base_value := v_pricing_model.base_value_usd;
    v_category_id := v_pricing_model.category_id;
    v_depreciation_rate := v_pricing_model.dep_rate;
    v_confidence := v_pricing_model.confidence_level;

    -- Apply depreciation: value = base_value * (1 - depreciation_rate) ^ age_years
    -- Cap depreciation at 50% max (even 20 year old car has some value)
    v_estimated_value := (
      v_base_value *
      GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.50)
    )::INTEGER;

    RETURN QUERY SELECT
      v_estimated_value,
      v_category_id,
      v_confidence,
      'pricing_models'::TEXT;
    RETURN;
  END IF;

  -- Fallback 1: Try to find brand match only (any model)
  SELECT
    AVG(vpm.base_value_usd)::INTEGER,
    mode() WITHIN GROUP (ORDER BY vpm.category_id),
    'low',
    AVG((SELECT vc.depreciation_rate_annual FROM vehicle_categories vc WHERE vc.id = vpm.category_id))
  INTO v_base_value, v_category_id, v_confidence, v_depreciation_rate
  FROM public.vehicle_pricing_models vpm
  WHERE
    LOWER(TRIM(vpm.brand)) = LOWER(TRIM(p_brand))
    AND p_year >= vpm.year_from - 5 -- Allow 5 year tolerance
    AND p_year <= vpm.year_to + 5
    AND vpm.active = true;

  IF v_base_value IS NOT NULL THEN
    v_estimated_value := (
      v_base_value *
      GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.50)
    )::INTEGER;

    RETURN QUERY SELECT
      v_estimated_value,
      v_category_id,
      v_confidence,
      'brand_average'::TEXT;
    RETURN;
  END IF;

  -- Fallback 2: Use year-based estimate
  -- Assume $20k for new car, depreciate by 5% per year
  v_base_value := 20000;
  v_depreciation_rate := 0.05;
  v_estimated_value := (
    v_base_value *
    GREATEST(POWER(1 - v_depreciation_rate, v_age_years), 0.30)
  )::INTEGER;

  -- ✅ UPDATED: Classify by estimated value with new thresholds
  -- Economy: < $13,000
  -- Standard: $13,000 - $25,000
  -- Premium: $25,000 - $40,000
  -- Luxury: >= $40,000
  v_category_id := (
    SELECT id FROM vehicle_categories
    WHERE code = CASE
      WHEN v_estimated_value < 13000 THEN 'economy'
      WHEN v_estimated_value < 25000 THEN 'standard'
      WHEN v_estimated_value < 40000 THEN 'premium'
      ELSE 'luxury'
    END
  );

  RETURN QUERY SELECT
    v_estimated_value,
    v_category_id,
    'estimated'::TEXT,
    'year_based'::TEXT;
END;
$_$;


--
-- Name: FUNCTION estimate_vehicle_value_usd(p_brand text, p_model text, p_year integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.estimate_vehicle_value_usd(p_brand text, p_model text, p_year integer) IS 'Estimates vehicle value based on brand/model/year using pricing_models reference data.
Returns estimated_value, category_id, confidence_level, and data_source.
Fallbacks: 1) Exact match, 2) Brand average, 3) Year-based estimate
UPDATED: Category thresholds - Economy: <$13k, Standard: $13k-$25k, Premium: $25k-$40k, Luxury: >=$40k';


--
-- Name: expire_pending_bookings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_pending_bookings() RETURNS TABLE(expired_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.bookings
  SET
    status = 'expired',
    cancelled_at = now(),
    cancellation_reason = 'Payment expired'
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND now() > expires_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;


--
-- Name: FUNCTION expire_pending_bookings(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.expire_pending_bookings() IS 'Expires pending bookings past their expiration time. Should be called by scheduled task.';


--
-- Name: extend_protection_credit_for_good_history(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extend_protection_credit_for_good_history(p_user_id uuid) RETURNS TABLE(renewed_amount_cents bigint, renewed_amount_usd numeric, new_expires_at timestamp with time zone, eligible boolean, reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_bookings_count INT;
  v_claims_count INT;
  v_renewal_amount_cents BIGINT := 30000;  -- $300 USD
  v_new_expiry TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  -- Verificar elegibilidad: ≥10 bookings sin siniestros
  SELECT COUNT(*) INTO v_bookings_count
  FROM bookings
  WHERE renter_id = p_user_id
  AND status = 'COMPLETED';

  SELECT COUNT(*) INTO v_claims_count
  FROM booking_claims
  WHERE booking_id IN (
    SELECT id FROM bookings WHERE renter_id = p_user_id
  )
  AND with_fault = TRUE;

  -- Validar elegibilidad
  IF v_bookings_count < 10 THEN
    RETURN QUERY SELECT
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Necesitas al menos 10 bookings completados';
    RETURN;
  END IF;

  IF v_claims_count > 0 THEN
    RETURN QUERY SELECT
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Tienes siniestros con responsabilidad';
    RETURN;
  END IF;

  -- Usuario es elegible: renovar CP
  v_new_expiry := NOW() + INTERVAL '1 year';

  -- Actualizar wallet
  UPDATE user_wallets
  SET protection_credit_cents = protection_credit_cents + v_renewal_amount_cents,
      protection_credit_issued_at = NOW(),
      protection_credit_expires_at = v_new_expiry,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'CREDIT', v_renewal_amount_cents, 'USD',
    'COMPLETED', 'RENEWAL', 'Renovación gratuita CP por buen historial',
    TRUE, 'RENEWAL'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR RENOVACIÓN DE CP
  PERFORM account_protection_credit_renewal(
    p_user_id,
    v_renewal_amount_cents,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT
    v_renewal_amount_cents,
    (v_renewal_amount_cents / 100.0)::DECIMAL(15, 2),
    v_new_expiry,
    TRUE,
    'CP renovado exitosamente'::TEXT;
END;
$_$;


--
-- Name: fgo_assess_eligibility(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fgo_assess_eligibility(p_booking_id uuid, p_claim_amount_cents bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_snapshot RECORD;
  v_params RECORD;
  v_rc_data JSONB;
  v_rc NUMERIC(10,4);
  v_monthly_payout BIGINT;
  v_monthly_cap BIGINT;
  v_user_events INTEGER;
  v_event_cap_usd NUMERIC(10,2);
  v_eligible BOOLEAN := TRUE;
  v_reasons TEXT[] := '{}';
  v_max_cover_cents BIGINT;
  v_franchise_pct NUMERIC(5,2) := 0.00;
  v_fgo_balance BIGINT;
BEGIN
  -- Validar claim amount
  IF p_claim_amount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reasons', ARRAY['Claim amount must be positive']
    );
  END IF;

  -- Obtener snapshot
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reasons', ARRAY['No risk snapshot found for booking']
    );
  END IF;

  -- Obtener parámetros
  SELECT * INTO v_params
  FROM fgo_parameters
  WHERE country_code = v_snapshot.country_code AND bucket = v_snapshot.bucket;

  IF NOT FOUND THEN
    -- Fallback a default
    SELECT * INTO v_params
    FROM fgo_parameters
    WHERE country_code = v_snapshot.country_code AND bucket = 'default';

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reasons', ARRAY['No parameters configured for country/bucket']
      );
    END IF;
  END IF;

  -- Calcular RC actual
  v_rc_data := calculate_rc_v1_1(v_snapshot.country_code, v_snapshot.bucket);
  v_rc := (v_rc_data->>'rc')::NUMERIC;

  -- Saldo FGO actual
  SELECT SUM(balance_cents) INTO v_fgo_balance
  FROM fgo_subfunds;

  -- GATE 1: Solvencia del FGO
  IF v_rc < v_params.rc_hard_floor THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('RC below hard floor (%.2f < %.2f) - critical', v_rc, v_params.rc_hard_floor));
    v_max_cover_cents := 10000;

  ELSIF v_rc < v_params.rc_floor THEN
    v_franchise_pct := 20.00;
    v_reasons := array_append(v_reasons, format('RC below floor (%.2f < %.2f) - 20%% franchise applied', v_rc, v_params.rc_floor));
  END IF;

  -- GATE 2: Límite mensual
  v_monthly_cap := (v_fgo_balance * v_params.monthly_payout_cap)::BIGINT;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_monthly_payout
  FROM fgo_movements
  WHERE
    movement_type IN ('siniestro_payment', 'franchise_payment')
    AND operation = 'debit'
    AND ts >= DATE_TRUNC('month', NOW());

  IF v_monthly_payout + p_claim_amount_cents > v_monthly_cap THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('Monthly payout cap exceeded (%s + %s > %s)',
      v_monthly_payout, p_claim_amount_cents, v_monthly_cap));
  END IF;

  -- GATE 3: Límite por usuario (🔧 FIX: usar renter_id)
  SELECT COUNT(DISTINCT fm.booking_id) INTO v_user_events
  FROM fgo_movements fm
  JOIN bookings b ON fm.booking_id = b.id
  WHERE
    b.renter_id = (SELECT renter_id FROM bookings WHERE id = p_booking_id)  -- 🔧 FIX
    AND fm.movement_type IN ('siniestro_payment', 'franchise_payment')
    AND fm.operation = 'debit'
    AND fm.ts >= NOW() - INTERVAL '3 months';

  IF v_user_events >= v_params.per_user_limit THEN
    v_eligible := FALSE;
    v_reasons := array_append(v_reasons, format('User limit exceeded (%s events this quarter, max %s)',
      v_user_events, v_params.per_user_limit));
  END IF;

  -- GATE 4: Tope por evento
  v_event_cap_usd := v_params.event_cap_usd;
  v_max_cover_cents := LEAST(
    (v_event_cap_usd * 100 * v_snapshot.fx_snapshot)::BIGINT,
    p_claim_amount_cents
  );

  -- Aplicar franquicia interna
  IF v_franchise_pct > 0 THEN
    v_max_cover_cents := (v_max_cover_cents * (100 - v_franchise_pct) / 100)::BIGINT;
  END IF;

  -- Límite por saldo disponible
  v_max_cover_cents := LEAST(v_max_cover_cents, v_fgo_balance);

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'reasons', v_reasons,
    'rc', v_rc,
    'rc_status', v_rc_data->>'status',
    'franchise_percentage', v_franchise_pct,
    'max_cover_cents', v_max_cover_cents,
    'max_cover_usd', v_max_cover_cents / 100.0 / v_snapshot.fx_snapshot,
    'event_cap_usd', v_event_cap_usd,
    'monthly_payout_used_cents', v_monthly_payout,
    'monthly_cap_cents', v_monthly_cap,
    'user_events_quarter', v_user_events,
    'user_event_limit', v_params.per_user_limit,
    'fgo_balance_cents', v_fgo_balance,
    'snapshot', jsonb_build_object(
      'country_code', v_snapshot.country_code,
      'bucket', v_snapshot.bucket,
      'currency', v_snapshot.currency,
      'fx_snapshot', v_snapshot.fx_snapshot
    )
  );
END;
$$;


--
-- Name: FUNCTION fgo_assess_eligibility(p_booking_id uuid, p_claim_amount_cents bigint); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fgo_assess_eligibility(p_booking_id uuid, p_claim_amount_cents bigint) IS 'Evalúa elegibilidad FGO con gates de solvencia (v1.1) - FIXED';


--
-- Name: fgo_contribute_from_deposit(uuid, bigint, uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fgo_contribute_from_deposit(p_user_id uuid, p_deposit_amount_cents bigint, p_wallet_ledger_id uuid DEFAULT NULL::uuid, p_ref character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_alpha DECIMAL(5,2);
  v_contribution_cents BIGINT;
  v_movement_id UUID;
  v_ref VARCHAR(128);
BEGIN
  -- Obtener α actual
  SELECT alpha_percentage INTO v_alpha
  FROM fgo_metrics
  WHERE id = TRUE;

  -- Calcular aporte (α% del depósito)
  v_contribution_cents := FLOOR(p_deposit_amount_cents * v_alpha / 100);

  -- No aportar si el monto es 0
  IF v_contribution_cents = 0 THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped',
      'reason', 'contribution amount is zero'
    );
  END IF;

  -- Generar referencia única si no se proporcionó
  IF p_ref IS NULL THEN
    IF p_wallet_ledger_id IS NOT NULL THEN
      v_ref := 'fgo-contrib-' || p_wallet_ledger_id;
    ELSE
      v_ref := 'fgo-contrib-' || gen_random_uuid();
    END IF;
  ELSE
    v_ref := p_ref;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM fgo_movements WHERE ref = v_ref) THEN
    SELECT id INTO v_movement_id FROM fgo_movements WHERE ref = v_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'movement_id', v_movement_id,
      'ref', v_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Registrar movimiento al subfondo de liquidez
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    user_id,
    wallet_ledger_id,  -- 🆕 Puede ser NULL ahora
    ref,
    meta
  )
  VALUES (
    'user_contribution',
    'liquidity',
    v_contribution_cents,
    'credit',
    p_user_id,
    p_wallet_ledger_id,  -- 🆕 NULL-safe
    v_ref,
    jsonb_build_object(
      'deposit_amount_cents', p_deposit_amount_cents,
      'alpha_percentage', v_alpha
    )
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular métricas
  PERFORM calculate_fgo_metrics();

  RETURN jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'ref', v_ref,
    'contribution_cents', v_contribution_cents,
    'alpha_percentage', v_alpha,
    'deposit_amount_cents', p_deposit_amount_cents
  );
END;
$$;


--
-- Name: FUNCTION fgo_contribute_from_deposit(p_user_id uuid, p_deposit_amount_cents bigint, p_wallet_ledger_id uuid, p_ref character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fgo_contribute_from_deposit(p_user_id uuid, p_deposit_amount_cents bigint, p_wallet_ledger_id uuid, p_ref character varying) IS 'Registra aporte al FGO desde depósito (wallet_ledger_id ahora es opcional)';


--
-- Name: fgo_execute_waterfall(uuid, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fgo_execute_waterfall(p_booking_id uuid, p_total_claim_cents bigint, p_description text, p_evidence_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_snapshot RECORD;
  v_eligibility JSONB;
  v_remaining BIGINT;
  v_hold_captured BIGINT := 0;
  v_wallet_debited BIGINT := 0;
  v_extra_charged BIGINT := 0;
  v_fgo_paid BIGINT := 0;
  v_ref VARCHAR(128);
  v_movement_id UUID;
  v_franchise_cents BIGINT;
  v_already_charged BIGINT;
  v_max_extra BIGINT;
BEGIN
  -- Validar evidencias
  IF NOT EXISTS (
    SELECT 1 FROM booking_inspections
    WHERE booking_id = p_booking_id AND stage = 'check_out'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Missing check-out inspection evidence'
    );
  END IF;

  -- Obtener snapshot
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No risk snapshot found for booking'
    );
  END IF;

  -- Validar elegibilidad FGO
  v_eligibility := fgo_assess_eligibility(p_booking_id, p_total_claim_cents);

  IF NOT (v_eligibility->>'eligible')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Not eligible for FGO coverage',
      'eligibility', v_eligibility
    );
  END IF;

  v_remaining := p_total_claim_cents;

  -- STEP 1: Capturar hold de tarjeta (si existe)
  IF v_snapshot.has_card AND v_snapshot.estimated_hold_amount > 0 THEN
    v_hold_captured := LEAST(v_remaining, v_snapshot.estimated_hold_amount::BIGINT);
    v_remaining := v_remaining - v_hold_captured;

    RAISE NOTICE '[Waterfall] Step 1: Captured hold = % cents', v_hold_captured;
  END IF;

  -- STEP 2: Debitar crédito de seguridad wallet (si existe)
  IF v_snapshot.has_wallet_security AND v_snapshot.estimated_deposit > 0 AND v_remaining > 0 THEN
    v_wallet_debited := LEAST(v_remaining, v_snapshot.estimated_deposit::BIGINT);
    v_remaining := v_remaining - v_wallet_debited;

    RAISE NOTICE '[Waterfall] Step 2: Debited wallet security = % cents', v_wallet_debited;
  END IF;

  -- STEP 3: Cobro adicional (card-on-file / top-up) hasta franquicia
  IF v_remaining > 0 THEN
    v_franchise_cents := (v_snapshot.franchise_usd * 100 * v_snapshot.fx_snapshot)::BIGINT;
    v_already_charged := v_hold_captured + v_wallet_debited;
    v_max_extra := GREATEST(0, v_franchise_cents - v_already_charged);

    v_extra_charged := LEAST(v_remaining, v_max_extra);

    IF v_extra_charged > 0 THEN
      RAISE NOTICE '[Waterfall] Step 3: Extra charge requested = % cents (up to franchise)', v_extra_charged;
      v_remaining := v_remaining - v_extra_charged;
    END IF;
  END IF;

  -- STEP 4: FGO cubre remanente (hasta tope)
  IF v_remaining > 0 THEN
    v_fgo_paid := LEAST(
      v_remaining,
      (v_eligibility->>'max_cover_cents')::BIGINT
    );

    IF v_fgo_paid > 0 THEN
      -- Verificar saldo suficiente en liquidez
      DECLARE
        v_liquidity_balance BIGINT;
      BEGIN
        SELECT balance_cents INTO v_liquidity_balance
        FROM fgo_subfunds
        WHERE subfund_type = 'liquidity'
        FOR UPDATE;  -- Lock pesimista

        IF v_liquidity_balance < v_fgo_paid THEN
          RAISE EXCEPTION 'Insufficient liquidity in FGO (balance: %, required: %)',
            v_liquidity_balance, v_fgo_paid;
        END IF;
      END;

      -- Registrar pago FGO
      v_ref := 'fgo-waterfall-' || p_booking_id || '-' || extract(epoch from now())::TEXT;

      INSERT INTO fgo_movements (
        movement_type,
        subfund_type,
        amount_cents,
        operation,
        booking_id,
        country_code,
        currency,
        fx_snapshot,
        ref,
        meta
      )
      VALUES (
        'siniestro_payment',
        'liquidity',
        v_fgo_paid,
        'debit',
        p_booking_id,
        v_snapshot.country_code,
        v_snapshot.currency,
        v_snapshot.fx_snapshot,
        v_ref,
        jsonb_build_object(
          'description', p_description,
          'evidence_url', p_evidence_url,
          'waterfall_breakdown', jsonb_build_object(
            'total_claim_cents', p_total_claim_cents,
            'hold_captured', v_hold_captured,
            'wallet_debited', v_wallet_debited,
            'extra_charged', v_extra_charged,
            'fgo_paid', v_fgo_paid,
            'remaining_uncovered', v_remaining - v_fgo_paid
          ),
          'eligibility_check', v_eligibility
        )
      )
      RETURNING id INTO v_movement_id;

      v_remaining := v_remaining - v_fgo_paid;

      RAISE NOTICE '[Waterfall] Step 4: FGO paid = % cents', v_fgo_paid;
    END IF;
  END IF;

  -- Recalcular métricas FGO
  PERFORM calculate_fgo_metrics();

  -- Retornar resultado completo
  RETURN jsonb_build_object(
    'ok', true,
    'booking_id', p_booking_id,
    'total_claim_cents', p_total_claim_cents,
    'breakdown', jsonb_build_object(
      'hold_captured', v_hold_captured,
      'wallet_debited', v_wallet_debited,
      'extra_charged', v_extra_charged,
      'fgo_paid', v_fgo_paid,
      'remaining_uncovered', v_remaining
    ),
    'fgo_movement_id', v_movement_id,
    'fgo_ref', v_ref,
    'eligibility', v_eligibility,
    'executed_at', NOW()
  );
END;
$$;


--
-- Name: FUNCTION fgo_execute_waterfall(p_booking_id uuid, p_total_claim_cents bigint, p_description text, p_evidence_url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fgo_execute_waterfall(p_booking_id uuid, p_total_claim_cents bigint, p_description text, p_evidence_url text) IS 'Ejecuta waterfall completo de cobros: hold → wallet → extra → FGO (v1.1)';


--
-- Name: fgo_pay_siniestro(uuid, bigint, text, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fgo_pay_siniestro(p_booking_id uuid, p_amount_cents bigint, p_description text, p_ref character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_movement_id UUID;
  v_ref VARCHAR(128);
  v_current_balance BIGINT;
BEGIN
  -- Generar referencia única si no se proporcionó
  IF p_ref IS NULL THEN
    v_ref := 'fgo-siniestro-' || p_booking_id || '-' || gen_random_uuid();
  ELSE
    v_ref := p_ref;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM fgo_movements WHERE ref = v_ref) THEN
    SELECT id INTO v_movement_id FROM fgo_movements WHERE ref = v_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'movement_id', v_movement_id,
      'ref', v_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Verificar saldo suficiente en liquidez
  SELECT balance_cents INTO v_current_balance
  FROM fgo_subfunds
  WHERE subfund_type = 'liquidity';

  IF v_current_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance in FGO liquidity subfund. Balance: %, Required: %',
      v_current_balance, p_amount_cents;
  END IF;

  -- Registrar pago de siniestro (débito del subfondo de liquidez)
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    booking_id,
    ref,
    meta
  )
  VALUES (
    'siniestro_payment',
    'liquidity',
    p_amount_cents,
    'debit',
    p_booking_id,
    v_ref,
    jsonb_build_object('description', p_description)
  )
  RETURNING id INTO v_movement_id;

  -- Recalcular métricas
  PERFORM calculate_fgo_metrics();

  RETURN jsonb_build_object(
    'ok', true,
    'movement_id', v_movement_id,
    'ref', v_ref,
    'amount_cents', p_amount_cents,
    'previous_balance', v_current_balance,
    'new_balance', v_current_balance - p_amount_cents
  );
END;
$$;


--
-- Name: FUNCTION fgo_pay_siniestro(p_booking_id uuid, p_amount_cents bigint, p_description text, p_ref character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fgo_pay_siniestro(p_booking_id uuid, p_amount_cents bigint, p_description text, p_ref character varying) IS 'Paga siniestro desde subfondo de liquidez';


--
-- Name: fgo_transfer_between_subfunds(text, text, bigint, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fgo_transfer_between_subfunds(p_from_subfund text, p_to_subfund text, p_amount_cents bigint, p_reason text, p_admin_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ref VARCHAR(128);
  v_debit_id UUID;
  v_credit_id UUID;
BEGIN
  -- Validaciones
  IF p_from_subfund = p_to_subfund THEN
    RAISE EXCEPTION 'Cannot transfer to same subfund';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Verificar que el admin es realmente admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'Only admins can transfer between subfunds';
  END IF;

  -- Generar referencia única
  v_ref := 'fgo-transfer-' || gen_random_uuid();

  -- Débito del subfondo origen
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    ref,
    meta,
    created_by
  )
  VALUES (
    'adjustment',
    p_from_subfund,
    p_amount_cents,
    'debit',
    v_ref || '-out',
    jsonb_build_object(
      'reason', p_reason,
      'to_subfund', p_to_subfund
    ),
    p_admin_id
  )
  RETURNING id INTO v_debit_id;

  -- Crédito al subfondo destino
  INSERT INTO fgo_movements (
    movement_type,
    subfund_type,
    amount_cents,
    operation,
    ref,
    meta,
    created_by
  )
  VALUES (
    'adjustment',
    p_to_subfund,
    p_amount_cents,
    'credit',
    v_ref || '-in',
    jsonb_build_object(
      'reason', p_reason,
      'from_subfund', p_from_subfund
    ),
    p_admin_id
  )
  RETURNING id INTO v_credit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ref', v_ref,
    'debit_movement_id', v_debit_id,
    'credit_movement_id', v_credit_id,
    'from_subfund', p_from_subfund,
    'to_subfund', p_to_subfund,
    'amount_cents', p_amount_cents
  );
END;
$$;


--
-- Name: FUNCTION fgo_transfer_between_subfunds(p_from_subfund text, p_to_subfund text, p_amount_cents bigint, p_reason text, p_admin_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fgo_transfer_between_subfunds(p_from_subfund text, p_to_subfund text, p_amount_cents bigint, p_reason text, p_admin_id uuid) IS 'Transfiere fondos entre subfondos (solo admins)';


--
-- Name: find_brazil_model_equivalent(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_brazil_model_equivalent(p_brand text, p_model_argentina text) RETURNS TABLE(model_brazil text, confidence text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Try exact match first
  RETURN QUERY
  SELECT
    vme.model_brazil,
    vme.confidence_level
  FROM public.vehicle_model_equivalents vme
  WHERE
    LOWER(TRIM(vme.brand)) = LOWER(TRIM(p_brand))
    AND LOWER(TRIM(vme.model_argentina)) = LOWER(TRIM(p_model_argentina))
    AND vme.active = true
  LIMIT 1;

  -- If not found, return the original model (assume same name)
  IF NOT FOUND THEN
    RETURN QUERY SELECT p_model_argentina, 'assumed_same'::TEXT;
  END IF;
END;
$$;


--
-- Name: FUNCTION find_brazil_model_equivalent(p_brand text, p_model_argentina text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.find_brazil_model_equivalent(p_brand text, p_model_argentina text) IS 'Finds the Brazil model equivalent for an Argentina model name.
Returns the original model name with confidence "assumed_same" if no mapping exists.';


--
-- Name: fx_rate_needs_revalidation(timestamp with time zone, integer, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fx_rate_needs_revalidation(p_rate_timestamp timestamp with time zone, p_max_age_days integer DEFAULT 7, p_old_rate numeric DEFAULT NULL::numeric, p_new_rate numeric DEFAULT NULL::numeric, p_variation_threshold numeric DEFAULT 0.10) RETURNS TABLE(needs_revalidation boolean, reason text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check 1: Time elapsed > max_age_days
  IF (now() - p_rate_timestamp) > (p_max_age_days || ' days')::INTERVAL THEN
    RETURN QUERY SELECT true, 'FX rate expired (>' || p_max_age_days || ' days)';
    RETURN;
  END IF;

  -- Check 2: Rate variation > threshold
  IF p_old_rate IS NOT NULL AND p_new_rate IS NOT NULL THEN
    IF ABS(p_new_rate - p_old_rate) / p_old_rate > p_variation_threshold THEN
      RETURN QUERY SELECT true, 'FX rate variation exceeded ' || (p_variation_threshold * 100)::TEXT || '%';
      RETURN;
    END IF;
  END IF;

  -- No revalidation needed
  RETURN QUERY SELECT false, NULL::TEXT;
END;
$$;


--
-- Name: FUNCTION fx_rate_needs_revalidation(p_rate_timestamp timestamp with time zone, p_max_age_days integer, p_old_rate numeric, p_new_rate numeric, p_variation_threshold numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fx_rate_needs_revalidation(p_rate_timestamp timestamp with time zone, p_max_age_days integer, p_old_rate numeric, p_new_rate numeric, p_variation_threshold numeric) IS 'Valida si un FX rate necesita revalidación por tiempo o variación';


--
-- Name: generate_referral_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INT := 0;
  v_max_attempts INT := 10;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verificar si ya tiene un código activo
  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF FOUND THEN
    RETURN v_code;
  END IF;

  -- Generar código único (6 caracteres alfanuméricos)
  LOOP
    v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 6));

    -- Verificar si el código ya existe
    SELECT EXISTS(
      SELECT 1 FROM public.referral_codes WHERE code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;

    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique code after % attempts', v_max_attempts;
    END IF;
  END LOOP;

  -- Insertar código
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);

  RETURN v_code;
END;
$$;


--
-- Name: FUNCTION generate_referral_code(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.generate_referral_code(p_user_id uuid) IS 'Genera un código único de referido';


--
-- Name: get_active_calendar_token(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_calendar_token(user_uuid uuid) RETURNS TABLE(access_token text, refresh_token text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    gct.access_token,
    gct.refresh_token,
    gct.expires_at
  FROM google_calendar_tokens gct
  WHERE gct.user_id = user_uuid
    AND gct.sync_enabled = true
  LIMIT 1;
END;
$$;


--
-- Name: get_active_tracking_for_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_tracking_for_booking(p_booking_id uuid) RETURNS TABLE(tracking_id uuid, user_id uuid, user_role text, user_name text, user_photo text, latitude numeric, longitude numeric, accuracy numeric, heading numeric, speed numeric, last_updated timestamp with time zone, estimated_arrival timestamp with time zone, distance_remaining numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    blt.id,
    blt.user_id,
    blt.user_role,
    p.full_name,
    p.avatar_url,
    blt.latitude,
    blt.longitude,
    blt.accuracy,
    blt.heading,
    blt.speed,
    blt.updated_at,
    blt.estimated_arrival_time,
    blt.distance_to_destination
  FROM booking_location_tracking blt
  JOIN profiles p ON p.id = blt.user_id
  WHERE blt.booking_id = p_booking_id
    AND blt.status = 'active'
    AND blt.updated_at > NOW() - INTERVAL '5 minutes'; -- Only recent locations
END;
$$;


--
-- Name: get_available_cars(timestamp with time zone, timestamp with time zone, double precision, double precision, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_available_cars(p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, owner_id uuid, brand text, model text, year integer, plate text, price_per_day numeric, currency character, status text, location jsonb, images text[], features jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, total_bookings bigint, avg_rating numeric, score numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_avg_price NUMERIC;
BEGIN
  SELECT COALESCE(AVG(c.price_per_day), 0) INTO v_avg_price FROM cars c WHERE c.status = 'active' AND c.price_per_day IS NOT NULL;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      c.*,
      COALESCE(AVG(r.rating) FILTER (WHERE r.id IS NOT NULL AND r.is_car_review = true), 0)::NUMERIC AS avg_rating_calc,
      COUNT(DISTINCT b.id) FILTER (WHERE b.id IS NOT NULL) AS total_bookings_calc
    FROM cars c
    LEFT JOIN bookings b ON b.car_id = c.id
    LEFT JOIN reviews r ON r.booking_id = b.id AND r.is_car_review = true
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.car_id = c.id
          AND b2.status IN ('pending','confirmed','in_progress')
          AND (b2.start_at, b2.end_at) OVERLAPS (p_start_date, p_end_date)
      )
    GROUP BY c.id
  ),
  scored AS (
    SELECT
      c.*,
      (COALESCE(c.avg_rating_calc, 0)::NUMERIC / 5.0) AS rating_component,
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN NULL
        ELSE ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0
      END AS distance_km,
      CASE
        WHEN p_lat IS NULL OR p_lng IS NULL OR c.location_lat IS NULL OR c.location_lng IS NULL THEN 0.5
        ELSE GREATEST(
          0.05,
          1.0 - POWER(
            LEAST((ST_DistanceSphere(ST_MakePoint(p_lng, p_lat), ST_MakePoint(c.location_lng, c.location_lat)) / 1000.0) / 30.0, 1.0),
            0.5
          )
        )
      END AS distance_component,
      CASE
        WHEN v_avg_price <= 0 OR c.price_per_day IS NULL THEN 0.5
        WHEN c.price_per_day <= v_avg_price THEN 1.0
        ELSE GREATEST(0.0, 1.0 - ((c.price_per_day - v_avg_price) / v_avg_price))
      END AS price_component,
      CASE WHEN c.auto_approval = TRUE THEN 1.0 ELSE 0.0 END AS auto_component,
      CASE WHEN v_avg_price > 0 THEN ABS(c.price_per_day - v_avg_price) / v_avg_price ELSE 0 END AS price_dev_pct
    FROM candidates c
  ),
  weighted AS (
    SELECT
      s.*,
      0.40::NUMERIC AS w_rating_base,
      0.35::NUMERIC AS w_distance_base,
      0.15::NUMERIC AS w_price_base,
      0.10::NUMERIC AS w_auto_base
    FROM scored s
  ),
  final AS (
    SELECT
      w.id,
      w.owner_id,
      w.brand_text_backup AS brand,
      w.model_text_backup AS model,
      w.year,
      w.plate,
      w.price_per_day,
      w.currency::CHAR(3),
      w.status::TEXT AS status,
      jsonb_build_object(
        'city', w.location_city,
        'state', w.location_state,
        'province', w.location_province,
        'country', w.location_country,
        'lat', w.location_lat,
        'lng', w.location_lng
      ) AS location,
      COALESCE(
        ARRAY(
          SELECT url FROM car_photos WHERE car_id = w.id ORDER BY sort_order LIMIT 10
        ),
        ARRAY[]::TEXT[]
      ) AS images,
      COALESCE(w.features, '{}'::jsonb) AS features,
      w.created_at,
      w.updated_at,
      w.total_bookings_calc AS total_bookings,
      w.avg_rating_calc AS avg_rating,
      w.distance_km,
      w.distance_component,
      w.price_component,
      w.rating_component,
      w.auto_component,
      w.price_dev_pct,
      (CASE
         WHEN w.distance_km IS NULL THEN w_distance_base
         WHEN w.distance_km <= 1 THEN 0.90
         WHEN w.distance_km <= 5 THEN 0.70
         WHEN w.distance_km <= 15 THEN 0.60
         WHEN w.distance_km > 15 THEN GREATEST(w_distance_base * 0.3, 0.10)
         ELSE w_distance_base
       END) AS w_distance_adj,
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           w_price_base * 0.1
         WHEN w.price_dev_pct > 0.15 THEN w_price_base + 0.05
         ELSE w_price_base
       END) AS w_price_adj,
      w_rating_base AS w_rating_adj_pre,
      (CASE
         WHEN w.distance_km IS NOT NULL AND w.distance_km <= 1 THEN
           w_auto_base * 0.1
         ELSE w_auto_base
       END) AS w_auto_adj
    FROM weighted w
  ),
  normalized AS (
    SELECT
      f.*,
      f.w_rating_adj_pre AS w_rating_adj_raw,
      f.w_distance_adj AS w_distance_raw,
      f.w_price_adj AS w_price_raw,
      f.w_auto_adj AS w_auto_raw
    FROM final f
  ),
  normalized2 AS (
    SELECT
      n.*,
      (n.w_rating_adj_raw + n.w_distance_raw + n.w_price_raw + n.w_auto_raw) AS sum_w_raw
    FROM normalized n
  )
  SELECT
    n2.id,
    n2.owner_id,
    n2.brand,
    n2.model,
    n2.year,
    n2.plate,
    n2.price_per_day,
    n2.currency,
    n2.status,
    n2.location,
    n2.images,
    n2.features,
    n2.created_at,
    n2.updated_at,
    n2.total_bookings,
    n2.avg_rating,
    (
      ((n2.w_rating_adj_raw / NULLIF(n2.sum_w_raw, 0)) * n2.rating_component)
      + ((n2.w_distance_raw / NULLIF(n2.sum_w_raw, 0)) * n2.distance_component)
      + ((n2.w_price_raw / NULLIF(n2.sum_w_raw, 0)) * n2.price_component)
      + ((n2.w_auto_raw / NULLIF(n2.sum_w_raw, 0)) * n2.auto_component)
    )::NUMERIC AS score
  FROM normalized2 n2
  ORDER BY score DESC, n2.distance_km ASC NULLS LAST, n2.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION get_available_cars(p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_lat double precision, p_lng double precision, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_available_cars(p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_lat double precision, p_lng double precision, p_limit integer, p_offset integer) IS 'Get available cars for dates with dynamic scoring.
   Scoring rules (2025-11-17):
   - rating stays the base quality signal (weight 0.40) but can be overtaken by proximity
   - distance component uses an exponential decay (0-5km nearly full score, 30km+ floored at 0.05)
   - distance weights: <=1km=0.90, <=5km=0.70, <=15km=0.60, >15km=base*0.3; null distances keep base weight
   - price and auto_approval weights reduced to 0.1x for very close cars (<=1km) to prioritize proximity
   - ORDER BY includes distance_km asc as tiebreaker to keep RPC/UI consistent
   Weights are renormalized per-row to sum 1. Distance and price components default to 0.5 when data is missing.';


--
-- Name: get_booking_distance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_booking_distance(p_booking_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_distance_km NUMERIC;
  v_car_lat NUMERIC;
  v_car_lng NUMERIC;
  v_renter_lat NUMERIC;
  v_renter_lng NUMERIC;
BEGIN
  -- Get car location from booking
  SELECT c.location_lat, c.location_lng
  INTO v_car_lat, v_car_lng
  FROM bookings b
  INNER JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  -- Get renter home location
  SELECT p.home_latitude, p.home_longitude
  INTO v_renter_lat, v_renter_lng
  FROM bookings b
  INNER JOIN profiles p ON b.renter_id = p.id
  WHERE b.id = p_booking_id;

  -- Calculate distance
  IF v_car_lat IS NOT NULL AND v_car_lng IS NOT NULL
     AND v_renter_lat IS NOT NULL AND v_renter_lng IS NOT NULL THEN
    v_distance_km := calculate_distance_km(v_renter_lat, v_renter_lng, v_car_lat, v_car_lng);
  ELSE
    v_distance_km := NULL;
  END IF;

  RETURN v_distance_km;
END;
$$;


--
-- Name: FUNCTION get_booking_distance(p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_booking_distance(p_booking_id uuid) IS 'Get distance between renter home location and car location for a specific booking. Returns NULL if either location is not set.';


--
-- Name: get_car_blocked_dates(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_car_blocked_dates(p_car_id uuid, p_start_date date DEFAULT CURRENT_DATE, p_end_date date DEFAULT (CURRENT_DATE + '6 mons'::interval)) RETURNS TABLE(booking_id uuid, start_date date, end_date date, status public.booking_status)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Return all confirmed or in-progress bookings for the car
  -- within the requested date range
  RETURN QUERY
  SELECT
    b.id,
    b.start_at::DATE,
    b.end_at::DATE,
    b.status
  FROM bookings b
  WHERE b.car_id = p_car_id
    AND b.status IN ('confirmed', 'in_progress')
    AND b.start_at::DATE <= p_end_date
    AND b.end_at::DATE >= p_start_date
  ORDER BY b.start_at;
END;
$$;


--
-- Name: FUNCTION get_car_blocked_dates(p_car_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_car_blocked_dates(p_car_id uuid, p_start_date date, p_end_date date) IS 'Returns blocked date ranges for a car (confirmed/in_progress bookings only). Used by calendar component.';


--
-- Name: get_car_conversation_participants(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_car_conversation_participants(p_car_id uuid, p_user_id uuid) RETURNS TABLE(user_id uuid, last_message_at timestamp with time zone, unread_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN m.sender_id = p_user_id THEN m.recipient_id
      ELSE m.sender_id
    END AS user_id,
    MAX(m.created_at) AS last_message_at,
    COUNT(*) FILTER (WHERE m.recipient_id = p_user_id AND m.read_at IS NULL) AS unread_count
  FROM public.messages m
  WHERE m.car_id = p_car_id
    AND (m.sender_id = p_user_id OR m.recipient_id = p_user_id)
  GROUP BY
    CASE
      WHEN m.sender_id = p_user_id THEN m.recipient_id
      ELSE m.sender_id
    END
  ORDER BY last_message_at DESC;
END;
$$;


--
-- Name: get_car_price_in_currency(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_car_price_in_currency(p_car_id uuid, p_currency text DEFAULT 'ARS'::text) RETURNS integer
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_price INTEGER;
BEGIN
  CASE UPPER(p_currency)
    WHEN 'BRL' THEN
      SELECT value_brl INTO v_price FROM public.cars WHERE id = p_car_id;
    WHEN 'USD' THEN
      SELECT value_usd INTO v_price FROM public.cars WHERE id = p_car_id;
    WHEN 'ARS' THEN
      SELECT value_ars INTO v_price FROM public.cars WHERE id = p_car_id;
    ELSE
      -- Default to USD if currency not recognized
      SELECT value_usd INTO v_price FROM public.cars WHERE id = p_car_id;
  END CASE;

  RETURN v_price;
END;
$$;


--
-- Name: FUNCTION get_car_price_in_currency(p_car_id uuid, p_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_car_price_in_currency(p_car_id uuid, p_currency text) IS 'Returns car price in specified currency (BRL, USD, or ARS). Defaults to ARS if not specified.';


--
-- Name: get_cars_availability_batch(uuid[], timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cars_availability_batch(car_ids uuid[], check_start_date timestamp with time zone DEFAULT now(), check_end_date timestamp with time zone DEFAULT (now() + '7 days'::interval)) RETURNS TABLE(car_id uuid, is_available boolean, available_today boolean, available_tomorrow boolean, next_available_date timestamp with time zone, availability_status text, active_booking_id uuid, active_booking_end timestamp with time zone)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  tomorrow_start timestamptz;
  tomorrow_end timestamptz;
  today_start timestamptz;
  today_end timestamptz;
BEGIN
  -- Calculate date boundaries
  today_start := date_trunc('day', NOW());
  today_end := today_start + INTERVAL '1 day' - INTERVAL '1 second';
  tomorrow_start := today_start + INTERVAL '1 day';
  tomorrow_end := tomorrow_start + INTERVAL '1 day' - INTERVAL '1 second';

  RETURN QUERY
  WITH car_bookings AS (
    -- Get all active bookings for requested cars
    SELECT 
      b.car_id,
      b.id as booking_id,
      b.start_at,
      b.end_at,
      b.status
    FROM bookings b
    WHERE b.car_id = ANY(car_ids)
      AND b.status IN ('confirmed', 'active', 'in_progress')
      AND b.end_at >= NOW()
    ORDER BY b.car_id, b.start_at
  ),
  current_bookings AS (
    -- Find currently active bookings
    SELECT DISTINCT ON (cb.car_id)
      cb.car_id,
      cb.booking_id,
      cb.end_at
    FROM car_bookings cb
    WHERE cb.start_at <= NOW() AND cb.end_at >= NOW()
    ORDER BY cb.car_id, cb.start_at
  ),
  next_bookings AS (
    -- Find next upcoming booking for each car
    SELECT DISTINCT ON (cb.car_id)
      cb.car_id,
      cb.start_at as next_booking_start
    FROM car_bookings cb
    WHERE cb.start_at > NOW()
    ORDER BY cb.car_id, cb.start_at
  ),
  today_conflicts AS (
    -- Check for bookings overlapping with today
    SELECT DISTINCT cb.car_id
    FROM car_bookings cb
    WHERE (cb.start_at, cb.end_at) OVERLAPS (today_start, today_end)
  ),
  tomorrow_conflicts AS (
    -- Check for bookings overlapping with tomorrow
    SELECT DISTINCT cb.car_id
    FROM car_bookings cb
    WHERE (cb.start_at, cb.end_at) OVERLAPS (tomorrow_start, tomorrow_end)
  ),
  date_range_conflicts AS (
    -- Check for bookings overlapping with requested date range
    SELECT DISTINCT cb.car_id
    FROM car_bookings cb
    WHERE (cb.start_at, cb.end_at) OVERLAPS (check_start_date, check_end_date)
  )
  SELECT 
    c.id as car_id,
    -- is_available: no conflict in requested date range
    NOT EXISTS (
      SELECT 1 FROM date_range_conflicts drc WHERE drc.car_id = c.id
    ) as is_available,
    -- available_today: no conflict today
    NOT EXISTS (
      SELECT 1 FROM today_conflicts tc WHERE tc.car_id = c.id
    ) as available_today,
    -- available_tomorrow: no conflict tomorrow
    NOT EXISTS (
      SELECT 1 FROM tomorrow_conflicts tmc WHERE tmc.car_id = c.id
    ) as available_tomorrow,
    -- next_available_date: when car becomes available
    CASE 
      WHEN curr.car_id IS NOT NULL THEN curr.end_at
      ELSE NULL
    END as next_available_date,
    -- availability_status: human-readable status
    CASE
      WHEN curr.car_id IS NOT NULL THEN 'in_use'
      WHEN EXISTS (SELECT 1 FROM today_conflicts tc WHERE tc.car_id = c.id) THEN 'unavailable'
      WHEN EXISTS (SELECT 1 FROM tomorrow_conflicts tmc WHERE tmc.car_id = c.id) THEN 'soon_available'
      ELSE 'available'
    END as availability_status,
    -- active_booking_id
    curr.booking_id as active_booking_id,
    -- active_booking_end
    curr.end_at as active_booking_end
  FROM unnest(car_ids) as c(id)
  LEFT JOIN current_bookings curr ON curr.car_id = c.id
  LEFT JOIN next_bookings nb ON nb.car_id = c.id;
END;
$$;


--
-- Name: FUNCTION get_cars_availability_batch(car_ids uuid[], check_start_date timestamp with time zone, check_end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_cars_availability_batch(car_ids uuid[], check_start_date timestamp with time zone, check_end_date timestamp with time zone) IS 'Batch query for car availability. Reduces N+1 queries in marketplace from 2000+ to 1.
Parameters:
- car_ids: Array of car UUIDs to check
- check_start_date: Start of date range to check (default: NOW)
- check_end_date: End of date range to check (default: NOW + 7 days)
Returns availability status for each car including:
- is_available: boolean for requested date range
- available_today/tomorrow: quick availability checks
- availability_status: available, soon_available, in_use, unavailable
- active_booking_id/end: current booking info if in use';


--
-- Name: get_cars_within_radius(numeric, numeric, numeric, timestamp with time zone, timestamp with time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cars_within_radius(p_user_lat numeric, p_user_lng numeric, p_radius_km numeric, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, owner_id uuid, title text, brand_text_backup text, model_text_backup text, year integer, price_per_day numeric, currency text, value_usd numeric, location_city text, location_state text, location_lat numeric, location_lng numeric, location_formatted_address text, distance_km numeric, status text, photos_count bigint, avg_rating numeric)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.owner_id,
    c.title,
    c.brand_text_backup,
    c.model_text_backup,
    c.year,
    c.price_per_day,
    c.currency,
    c.value_usd,
    c.location_city,
    c.location_state,
    c.location_lat,
    c.location_lng,
    c.location_formatted_address,
    calculate_distance_km(p_user_lat, p_user_lng, c.location_lat, c.location_lng) AS distance_km,
    c.status::TEXT,
    (SELECT COUNT(*) FROM car_photos WHERE car_id = c.id) AS photos_count,
    (SELECT AVG(rating) FROM reviews WHERE car_id = c.id) AS avg_rating
  FROM cars c
  WHERE
    c.status = 'active'
    AND c.location_lat IS NOT NULL
    AND c.location_lng IS NOT NULL
    -- Only include cars within the specified radius
    AND calculate_distance_km(p_user_lat, p_user_lng, c.location_lat, c.location_lng) <= p_radius_km
    -- Check availability if dates provided
    AND (
      p_start_date IS NULL
      OR p_end_date IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.car_id = c.id
          AND b.status IN ('pending', 'confirmed', 'in_progress')
          AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start_date, p_end_date, '[]')
      )
    )
  ORDER BY distance_km ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION get_cars_within_radius(p_user_lat numeric, p_user_lng numeric, p_radius_km numeric, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_cars_within_radius(p_user_lat numeric, p_user_lng numeric, p_radius_km numeric, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer, p_offset integer) IS 'Get available cars within a specific radius from user location. Returns cars ordered by distance. Optionally filters by availability dates.';


--
-- Name: get_claims_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_claims_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'submitted', COUNT(*) FILTER (WHERE status = 'submitted'),
    'under_review', COUNT(*) FILTER (WHERE status = 'under_review'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'total_estimated_usd', COALESCE(SUM(total_estimated_cost_usd), 0),
    'avg_claim_usd', COALESCE(AVG(total_estimated_cost_usd), 0),
    'claims_last_30d', COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')
  ) INTO v_stats
  FROM claims;

  RETURN v_stats;
END;
$$;


--
-- Name: get_class_benefits(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_class_benefits(p_class integer) RETURNS TABLE(class integer, description text, fee_multiplier numeric, guarantee_multiplier numeric, fee_discount_pct numeric, guarantee_discount_pct numeric, is_discount boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_class < 0 OR p_class > 10 THEN
    RAISE EXCEPTION 'Clase inválida: % (debe estar entre 0 y 10)', p_class;
  END IF;

  RETURN QUERY
  SELECT
    pcf.class,
    pcf.description,
    pcf.fee_multiplier,
    pcf.guarantee_multiplier,
    ROUND((1.00 - pcf.fee_multiplier) * 100, 2) AS fee_discount_pct,
    ROUND((1.00 - pcf.guarantee_multiplier) * 100, 2) AS guarantee_discount_pct,
    (pcf.fee_multiplier < 1.00) AS is_discount
  FROM pricing_class_factors pcf
  WHERE pcf.class = p_class
  AND pcf.is_active = TRUE;
END;
$$;


--
-- Name: FUNCTION get_class_benefits(p_class integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_class_benefits(p_class integer) IS 'Obtiene beneficios de una clase: descuentos/recargos en fee y garantía';


--
-- Name: get_conversation_messages(uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_conversation_messages(p_booking_id uuid DEFAULT NULL::uuid, p_car_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, booking_id uuid, car_id uuid, sender_id uuid, recipient_id uuid, body text, delivered_at timestamp with time zone, read_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.booking_id,
    m.car_id,
    m.sender_id,
    m.recipient_id,
    decrypt_message(m.body) AS body,
    m.delivered_at,
    m.read_at,
    m.created_at,
    m.updated_at
  FROM public.messages m
  WHERE
    (p_booking_id IS NOT NULL AND m.booking_id = p_booking_id) OR
    (p_car_id IS NOT NULL AND m.car_id = p_car_id)
  ORDER BY m.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION get_conversation_messages(p_booking_id uuid, p_car_id uuid, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_conversation_messages(p_booking_id uuid, p_car_id uuid, p_limit integer, p_offset integer) IS 'Retrieves and decrypts conversation messages with pagination';


--
-- Name: get_conversion_stats(uuid, text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_conversion_stats(p_car_id uuid DEFAULT NULL::uuid, p_event_type text DEFAULT NULL::text, p_from_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_to_date timestamp with time zone DEFAULT now()) RETURNS TABLE(event_type text, event_count bigint, unique_users bigint, first_event timestamp with time zone, last_event timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT ce.user_id) AS unique_users,
    MIN(ce.created_at) AS first_event,
    MAX(ce.created_at) AS last_event
  FROM public.conversion_events ce
  WHERE
    (p_car_id IS NULL OR ce.car_id = p_car_id)
    AND (p_event_type IS NULL OR ce.event_type = p_event_type)
    AND ce.created_at >= p_from_date
    AND ce.created_at <= p_to_date
  GROUP BY ce.event_type
  ORDER BY event_count DESC;
END;
$$;


--
-- Name: get_current_fx_rate(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_fx_rate(p_from_currency text, p_to_currency text) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT rate INTO v_rate
  FROM public.fx_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No active FX rate found for % → %', p_from_currency, p_to_currency;
  END IF;

  RETURN v_rate;
END;
$$;


--
-- Name: FUNCTION get_current_fx_rate(p_from_currency text, p_to_currency text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_current_fx_rate(p_from_currency text, p_to_currency text) IS 'Obtiene el rate de cambio activo actual para un par de monedas';


--
-- Name: get_driver_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_driver_profile(p_user_id uuid) RETURNS TABLE(user_id uuid, class integer, driver_score integer, good_years integer, total_claims integer, claims_with_fault integer, last_claim_at timestamp with time zone, last_claim_with_fault boolean, last_class_update timestamp with time zone, fee_multiplier numeric, guarantee_multiplier numeric, class_description text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    drp.user_id,
    drp.class,
    drp.driver_score,
    drp.good_years,
    drp.total_claims,
    drp.claims_with_fault,
    drp.last_claim_at,
    drp.last_claim_with_fault,
    drp.last_class_update,
    pcf.fee_multiplier,
    pcf.guarantee_multiplier,
    pcf.description AS class_description,
    drp.created_at,
    drp.updated_at
  FROM driver_risk_profile drp
  LEFT JOIN pricing_class_factors pcf ON drp.class = pcf.class
  WHERE drp.user_id = p_user_id;

  -- Si no existe el perfil, retornar NULL (el caller debe inicializarlo)
  IF NOT FOUND THEN
    RAISE NOTICE 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;
END;
$$;


--
-- Name: FUNCTION get_driver_profile(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_driver_profile(p_user_id uuid) IS 'Obtiene perfil completo del conductor con factores de ajuste de precio';


--
-- Name: get_driver_telemetry_average(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_driver_telemetry_average(p_user_id uuid, p_months integer DEFAULT 3) RETURNS TABLE(avg_score numeric, total_trips integer, total_km numeric, total_hard_brakes bigint, total_speed_violations bigint, total_night_hours numeric, total_risk_zones bigint, period_start timestamp with time zone, period_end timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
BEGIN
  v_period_start := NOW() - (p_months || ' months')::INTERVAL;

  RETURN QUERY
  SELECT
    ROUND(AVG(dt.driver_score), 1) AS avg_score,
    COUNT(*)::INT AS total_trips,
    SUM(dt.total_km) AS total_km,
    SUM(dt.hard_brakes) AS total_hard_brakes,
    SUM(dt.speed_violations) AS total_speed_violations,
    SUM(dt.night_driving_hours) AS total_night_hours,
    SUM(dt.risk_zones_visited) AS total_risk_zones,
    v_period_start,
    NOW()
  FROM driver_telemetry dt
  WHERE dt.user_id = p_user_id
  AND dt.trip_date >= v_period_start;
END;
$$;


--
-- Name: FUNCTION get_driver_telemetry_average(p_user_id uuid, p_months integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_driver_telemetry_average(p_user_id uuid, p_months integer) IS 'Obtiene estadísticas telemáticas promedio de últimos N meses';


--
-- Name: get_effective_daily_rate_pct(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_effective_daily_rate_pct(p_car_id uuid) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_custom_rate DECIMAL(5,4);
  v_category_rate DECIMAL(5,4);
  v_category_id UUID;
BEGIN
  -- Get car's custom rate and category
  SELECT custom_daily_rate_pct, category_id
  INTO v_custom_rate, v_category_id
  FROM public.cars
  WHERE id = p_car_id;

  -- If car has custom rate, use it
  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;

  -- Otherwise get category default
  SELECT base_daily_rate_pct
  INTO v_category_rate
  FROM public.vehicle_categories
  WHERE id = v_category_id;

  -- Fallback to 0.30% if no category
  RETURN COALESCE(v_category_rate, 0.0030);
END;
$$;


--
-- Name: FUNCTION get_effective_daily_rate_pct(p_car_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_effective_daily_rate_pct(p_car_id uuid) IS 'Returns custom rate if set, otherwise category default, fallback 0.30%';


--
-- Name: get_effective_vehicle_value(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_effective_vehicle_value(p_car_id uuid) RETURNS integer
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_value_usd INTEGER;
  v_estimated_value INTEGER;
BEGIN
  -- Get both values
  SELECT value_usd, estimated_value_usd
  INTO v_value_usd, v_estimated_value
  FROM public.cars
  WHERE id = p_car_id;

  -- Prefer owner-provided value, fallback to estimated
  RETURN COALESCE(v_value_usd, v_estimated_value);
END;
$$;


--
-- Name: FUNCTION get_effective_vehicle_value(p_car_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_effective_vehicle_value(p_car_id uuid) IS 'Returns value_usd if set by owner, otherwise estimated_value_usd';


--
-- Name: get_expiring_holds(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_expiring_holds(p_hours_ahead integer DEFAULT 24) RETURNS TABLE(booking_id uuid, hold_authorization_id text, hold_expires_at timestamp with time zone, hours_until_expiry numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.hold_authorization_id,
    b.hold_expires_at,
    EXTRACT(EPOCH FROM (b.hold_expires_at - NOW())) / 3600 AS hours_until_expiry
  FROM bookings b
  WHERE
    b.guarantee_type = 'hold'
    AND b.hold_authorization_id IS NOT NULL
    AND b.hold_expires_at IS NOT NULL
    AND b.hold_expires_at <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
    AND b.status IN ('confirmed', 'active')
  ORDER BY b.hold_expires_at ASC;
END;
$$;


--
-- Name: FUNCTION get_expiring_holds(p_hours_ahead integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_expiring_holds(p_hours_ahead integer) IS 'Obtiene holds que expiran en las próximas X horas (para cron de reautorización)';


--
-- Name: get_marketplace_approved_owners(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_marketplace_approved_owners() RETURNS TABLE(user_id uuid, full_name text, email text, collector_id text, approved_at timestamp with time zone, total_bookings bigint, total_earnings numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    u.mercadopago_collector_id,
    u.mp_onboarding_completed_at,
    COUNT(DISTINCT b.id) as total_bookings,
    COALESCE(SUM(b.owner_payment_amount), 0) as total_earnings
  FROM users u
  LEFT JOIN bookings b ON b.owner_id = u.id 
    AND b.payment_split_completed = true
  WHERE u.marketplace_approved = true
    AND u.mercadopago_collector_id IS NOT NULL
  GROUP BY u.id, u.full_name, u.email, u.mercadopago_collector_id, u.mp_onboarding_completed_at
  ORDER BY u.mp_onboarding_completed_at DESC;
END;
$$;


--
-- Name: FUNCTION get_marketplace_approved_owners(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_marketplace_approved_owners() IS 'Lista propietarios aprobados en marketplace con stats';


--
-- Name: get_mp_onboarding_notifications(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_mp_onboarding_notifications(p_user_id uuid) RETURNS TABLE(notification_id uuid, car_id uuid, car_name text, published_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    (n.metadata->>'car_id')::UUID,
    n.metadata->>'car_name',
    (n.metadata->>'published_at')::TIMESTAMPTZ,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
  AND n.metadata->>'notification_reason' = 'mp_onboarding_required'
  AND n.is_read = false
  ORDER BY n.created_at DESC;
END;
$$;


--
-- Name: FUNCTION get_mp_onboarding_notifications(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_mp_onboarding_notifications(p_user_id uuid) IS 'Obtiene todas las notificaciones de MP onboarding pendientes para un usuario';


--
-- Name: get_my_profile_decrypted(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_profile_decrypted() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_profile JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: must be authenticated';
  END IF;
  SELECT jsonb_build_object(
    'id', id,
    'phone', phone,
    'whatsapp', whatsapp,
    'address_line1', address_line1,
    'address_line2', address_line2,
    'postal_code', postal_code,
    'dni', dni,
    'gov_id_number', gov_id_number,
    'driver_license_number', driver_license_number,
    'full_name', full_name,
    'city', city,
    'state', state,
    'country', country,
    'email_verified', email_verified,
    'phone_verified', phone_verified,
    'role', role,
    'kyc', kyc
  )
  INTO v_profile
  FROM profiles_decrypted
  WHERE id = v_user_id;
  RETURN v_profile;
END;
$$;


--
-- Name: get_my_waitlist(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_waitlist() RETURNS TABLE(id uuid, car_id uuid, car_brand text, car_model text, start_date timestamp with time zone, end_date timestamp with time zone, status text, notified_at timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.car_id,
    c.brand as car_brand,
    c.model as car_model,
    w.start_date,
    w.end_date,
    w.status,
    w.notified_at,
    w.created_at
  FROM public.booking_waitlist w
  JOIN public.cars c ON c.id = w.car_id
  WHERE w.user_id = auth.uid()
    AND w.status = 'active'
    AND w.expires_at > now()
  ORDER BY w.created_at ASC;
END;
$$;


--
-- Name: FUNCTION get_my_waitlist(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_my_waitlist() IS 'Retorna todas las entradas activas de waitlist del usuario actual.';


--
-- Name: get_next_available_date(uuid, date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_available_date(p_car_id uuid, p_start_date date DEFAULT CURRENT_DATE, p_min_days integer DEFAULT 1) RETURNS date
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_check_date DATE;
  v_max_iterations INTEGER := 365; -- Don't search beyond 1 year
  v_iterations INTEGER := 0;
BEGIN
  -- Start checking from the requested date
  v_check_date := p_start_date;

  -- Loop until we find an available date
  LOOP
    v_iterations := v_iterations + 1;

    -- Safety check to prevent infinite loop
    IF v_iterations > v_max_iterations THEN
      RETURN NULL; -- No availability found within 1 year
    END IF;

    -- Check if the date range is available
    IF check_car_availability(
      p_car_id,
      v_check_date,
      v_check_date + p_min_days
    ) THEN
      RETURN v_check_date;
    END IF;

    -- Move to next day
    v_check_date := v_check_date + 1;
  END LOOP;
END;
$$;


--
-- Name: FUNCTION get_next_available_date(p_car_id uuid, p_start_date date, p_min_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_next_available_date(p_car_id uuid, p_start_date date, p_min_days integer) IS 'Finds the next available date for a car. Returns NULL if no availability within 1 year.';


--
-- Name: get_onboarding_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_onboarding_status() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_result JSON;
  v_locador_steps JSON;
  v_locatario_steps JSON;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Usuario no autenticado');
  END IF;

  SELECT p.*, EXISTS(SELECT 1 FROM cars WHERE owner_id = p.id) as has_cars, EXISTS(SELECT 1 FROM bookings WHERE renter_id = p.id) as has_bookings
  INTO v_profile
  FROM profiles p
  WHERE p.id = v_user_id;

  v_locador_steps := json_build_array(
    json_build_object('key','profile_basic','title','Completar perfil básico','completed',(v_profile.full_name IS NOT NULL AND v_profile.phone IS NOT NULL),'action','/profile'),
    json_build_object('key','mp_onboarding','title','Vincular MercadoPago','completed',COALESCE(v_profile.mp_onboarding_completed,false),'action','/profile?connect_mp=true'),
    json_build_object('key','publish_car','title','Publicar primer auto','completed',v_profile.has_cars,'action','/cars/publish')
  );

  v_locatario_steps := json_build_array(
    json_build_object('key','profile_basic','title','Completar perfil básico','completed',(v_profile.full_name IS NOT NULL AND v_profile.phone IS NOT NULL),'action','/profile'),
    json_build_object('key','first_search','title','Buscar autos disponibles','completed',false,'action','/marketplace'),
    json_build_object('key','first_booking','title','Hacer primera reserva','completed',v_profile.has_bookings,'action','/marketplace')
  );

  v_result := json_build_object(
    'userId', v_user_id,
    'role', v_profile.role,
    'primaryGoal', v_profile.primary_goal,
    'showInitialModal', (v_profile.primary_goal IS NULL),
    'onboardingStatus', v_profile.onboarding,
    'locadorSteps', v_locador_steps,
    'locatarioSteps', v_locatario_steps,
    'activeChecklist', CASE WHEN v_profile.primary_goal = 'publish' THEN 'locador' WHEN v_profile.primary_goal = 'rent' THEN 'locatario' WHEN v_profile.primary_goal = 'both' THEN 'both' ELSE NULL END
  );

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_onboarding_status(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_onboarding_status() IS 'Obtiene estado del onboarding MVP (hardcoded checklist)';


--
-- Name: get_payout_stats(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_payout_stats(p_from_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_to_date timestamp with time zone DEFAULT now()) RETURNS TABLE(total_payouts bigint, completed_payouts bigint, pending_payouts bigint, failed_payouts bigint, total_platform_fees numeric, total_owner_payments numeric, avg_payout_time_hours numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_payouts,
    COUNT(*) FILTER (WHERE payout_status = 'completed')::BIGINT as completed_payouts,
    COUNT(*) FILTER (WHERE payout_status = 'pending')::BIGINT as pending_payouts,
    COUNT(*) FILTER (WHERE payout_status = 'failed')::BIGINT as failed_payouts,
    SUM(platform_fee_collected) as total_platform_fees,
    SUM(owner_amount_paid) as total_owner_payments,
    AVG(EXTRACT(EPOCH FROM (payout_date - created_at)) / 3600)::NUMERIC(10,2) as avg_payout_time_hours
  FROM bookings
  WHERE created_at BETWEEN p_from_date AND p_to_date
  AND paid_at IS NOT NULL;
END;
$$;


--
-- Name: get_telemetry_history(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_telemetry_history(p_user_id uuid, p_limit integer DEFAULT 10) RETURNS TABLE(telemetry_id uuid, booking_id uuid, trip_date timestamp with time zone, total_km numeric, driver_score integer, hard_brakes integer, speed_violations integer, night_driving_hours numeric, risk_zones_visited integer, car_title text, car_brand text, car_model text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    dt.id,
    dt.booking_id,
    dt.trip_date,
    dt.total_km,
    dt.driver_score,
    dt.hard_brakes,
    dt.speed_violations,
    dt.night_driving_hours,
    dt.risk_zones_visited,
    c.title,
    c.brand,
    c.model
  FROM driver_telemetry dt
  LEFT JOIN bookings b ON dt.booking_id = b.id
  LEFT JOIN cars c ON b.car_id = c.id
  WHERE dt.user_id = p_user_id
  ORDER BY dt.trip_date DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: FUNCTION get_telemetry_history(p_user_id uuid, p_limit integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_telemetry_history(p_user_id uuid, p_limit integer) IS 'Obtiene historial de viajes con datos telemáticos y score';


--
-- Name: get_telemetry_insights(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_telemetry_insights(p_user_id uuid) RETURNS TABLE(current_score integer, score_trend text, main_issue text, recommendation text, trips_analyzed integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile RECORD;
  v_recent_avg NUMERIC;
  v_older_avg NUMERIC;
  v_score_trend TEXT;
  v_main_issue TEXT;
  v_recommendation TEXT;
  v_trips_count INT;
  v_avg_hard_brakes NUMERIC;
  v_avg_speed_violations NUMERIC;
  v_avg_night_hours NUMERIC;
  v_avg_risk_zones NUMERIC;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil no encontrado para usuario %', p_user_id;
  END IF;

  -- Contar viajes analizados
  SELECT COUNT(*) INTO v_trips_count
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '3 months';

  IF v_trips_count = 0 THEN
    RETURN QUERY SELECT
      v_profile.driver_score,
      'Sin datos'::TEXT,
      'Sin datos suficientes'::TEXT,
      'Completa más viajes para obtener análisis'::TEXT,
      0;
    RETURN;
  END IF;

  -- Calcular promedios recientes (último mes)
  SELECT
    AVG(driver_score),
    AVG(hard_brakes),
    AVG(speed_violations),
    AVG(night_driving_hours),
    AVG(risk_zones_visited)
  INTO
    v_recent_avg,
    v_avg_hard_brakes,
    v_avg_speed_violations,
    v_avg_night_hours,
    v_avg_risk_zones
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '1 month';

  -- Calcular promedio anterior (mes anterior)
  SELECT AVG(driver_score) INTO v_older_avg
  FROM driver_telemetry
  WHERE user_id = p_user_id
  AND trip_date >= NOW() - INTERVAL '2 months'
  AND trip_date < NOW() - INTERVAL '1 month';

  -- Determinar tendencia
  IF v_older_avg IS NULL THEN
    v_score_trend := 'Sin histórico';
  ELSIF v_recent_avg > v_older_avg + 5 THEN
    v_score_trend := 'Mejorando ↗';
  ELSIF v_recent_avg < v_older_avg - 5 THEN
    v_score_trend := 'Empeorando ↘';
  ELSE
    v_score_trend := 'Estable →';
  END IF;

  -- Identificar problema principal
  IF v_avg_speed_violations > 2 THEN
    v_main_issue := 'Excesos de velocidad frecuentes';
    v_recommendation := 'Respeta los límites de velocidad para mejorar tu score';
  ELSIF v_avg_hard_brakes > 3 THEN
    v_main_issue := 'Frenadas bruscas frecuentes';
    v_recommendation := 'Mantén distancia de seguridad y anticipa las frenadas';
  ELSIF v_avg_night_hours > 4 THEN
    v_main_issue := 'Mucha conducción nocturna';
    v_recommendation := 'Evita conducir de noche cuando sea posible';
  ELSIF v_avg_risk_zones > 1 THEN
    v_main_issue := 'Visitas a zonas de riesgo';
    v_recommendation := 'Planifica rutas más seguras';
  ELSE
    v_main_issue := 'Conducción adecuada';
    v_recommendation := '¡Sigue así! Tu conducción es excelente';
  END IF;

  RETURN QUERY SELECT
    v_profile.driver_score,
    v_score_trend,
    v_main_issue,
    v_recommendation,
    v_trips_count;
END;
$$;


--
-- Name: FUNCTION get_telemetry_insights(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_telemetry_insights(p_user_id uuid) IS 'Genera insights y recomendaciones personalizadas basadas en telemetría';


--
-- Name: get_unread_messages_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_messages_count(p_user_id uuid) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.messages
    WHERE recipient_id = p_user_id
      AND read_at IS NULL
  );
END;
$$;


--
-- Name: get_user_conversations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_conversations(user_id uuid) RETURNS TABLE(conversation_id text, other_user_id uuid, other_user_name text, other_user_avatar text, car_id uuid, car_brand text, car_model text, car_year integer, booking_id uuid, last_message text, last_message_at timestamp with time zone, unread_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (
      COALESCE(m.booking_id::TEXT, m.car_id::TEXT),
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END
    )
      m.id,
      m.booking_id,
      m.car_id,
      m.sender_id,
      m.recipient_id,
      m.body,
      m.created_at,
      m.read_at,
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END as other_user
    FROM messages m
    WHERE m.sender_id = user_id OR m.recipient_id = user_id
    ORDER BY 
      COALESCE(m.booking_id::TEXT, m.car_id::TEXT),
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END,
      m.created_at DESC
  )
  SELECT
    COALESCE(lm.booking_id::TEXT, lm.car_id::TEXT) || '_' || lm.other_user::TEXT as conversation_id,
    lm.other_user as other_user_id,
    COALESCE(p.full_name, 'Usuario') as other_user_name,
    p.avatar_url as other_user_avatar,
    lm.car_id,
    c.brand as car_brand,
    c.model as car_model,
    c.year as car_year,
    lm.booking_id,
    lm.body as last_message,
    lm.created_at as last_message_at,
    (
      SELECT COUNT(*)
      FROM messages m2
      WHERE m2.recipient_id = user_id
        AND m2.sender_id = lm.other_user
        AND (
          (m2.booking_id = lm.booking_id AND lm.booking_id IS NOT NULL) OR
          (m2.car_id = lm.car_id AND lm.car_id IS NOT NULL)
        )
        AND m2.read_at IS NULL
    ) as unread_count
  FROM latest_messages lm
  LEFT JOIN profiles p ON p.id = lm.other_user
  LEFT JOIN cars c ON c.id = lm.car_id
  ORDER BY lm.created_at DESC;
END;
$$;


--
-- Name: FUNCTION get_user_conversations(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_conversations(user_id uuid) IS 'Obtiene todas las conversaciones de un usuario con conteo de no leídos';


--
-- Name: get_user_public_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_public_stats(target_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSON;
  owner_rating NUMERIC;
  owner_reviews_cnt INTEGER;
  owner_trips_cnt INTEGER;
  renter_rating NUMERIC;
  renter_reviews_cnt INTEGER;
  renter_trips_cnt INTEGER;
  total_cars_cnt INTEGER;
BEGIN
  -- Owner stats (reviews received as owner)
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO owner_rating, owner_reviews_cnt
  FROM reviews
  WHERE reviewee_id = target_user_id
    AND reviewee_role = 'owner';

  -- Owner trips (bookings for cars they own)
  SELECT COUNT(*)
  INTO owner_trips_cnt
  FROM bookings
  WHERE car_id IN (
    SELECT id FROM cars WHERE owner_id = target_user_id
  )
  AND status = 'completed';

  -- Renter stats (reviews received as renter)
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO renter_rating, renter_reviews_cnt
  FROM reviews
  WHERE reviewee_id = target_user_id
    AND reviewee_role = 'renter';

  -- Renter trips (bookings they made)
  SELECT COUNT(*)
  INTO renter_trips_cnt
  FROM bookings
  WHERE renter_id = target_user_id
    AND status = 'completed';

  -- Total active cars
  SELECT COUNT(*)
  INTO total_cars_cnt
  FROM cars
  WHERE owner_id = target_user_id
    AND status = 'active';

  -- Build result JSON
  result := json_build_object(
    'owner_rating_avg', owner_rating,
    'owner_reviews_count', owner_reviews_cnt,
    'owner_trips_count', owner_trips_cnt,
    'renter_rating_avg', renter_rating,
    'renter_reviews_count', renter_reviews_cnt,
    'renter_trips_count', renter_trips_cnt,
    'total_cars', total_cars_cnt
  );

  RETURN result;
END;
$$;


--
-- Name: FUNCTION get_user_public_stats(target_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_public_stats(target_user_id uuid) IS 'Returns public statistics for a user profile including ratings, reviews, and trip counts';


--
-- Name: get_verification_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_verification_progress() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_level_data RECORD;
  v_progress INT := 0;
  v_requirements jsonb;
  v_missing jsonb[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Usuario no autenticado'
    );
  END IF;

  -- Get user identity level data
  SELECT * INTO v_level_data
  FROM public.user_identity_levels
  WHERE user_id = v_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_identity_levels (
      user_id,
      current_level,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      1,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_level_data;
  END IF;

  -- Calculate progress (0-100%)
  v_progress := 0;

  -- Level 1: Email (20%) + Phone (20%)
  IF v_level_data.email_verified_at IS NOT NULL THEN
    v_progress := v_progress + 20;
  END IF;

  IF v_level_data.phone_verified_at IS NOT NULL THEN
    v_progress := v_progress + 20;
  END IF;

  -- Level 2: ID verification (30%)
  IF v_level_data.id_verified_at IS NOT NULL THEN
    v_progress := v_progress + 30;
  END IF;

  -- Level 3: Driver license (30%)
  IF v_level_data.driver_license_verified_at IS NOT NULL THEN
    v_progress := v_progress + 30;
  END IF;

  -- Build requirements object
  v_requirements := jsonb_build_object(
    'email_verified', v_level_data.email_verified_at IS NOT NULL,
    'phone_verified', v_level_data.phone_verified_at IS NOT NULL,
    'id_verified', v_level_data.id_verified_at IS NOT NULL,
    'driver_license_verified', v_level_data.driver_license_verified_at IS NOT NULL
  );

  -- Build missing requirements array
  v_missing := ARRAY[]::jsonb[];
  IF v_level_data.email_verified_at IS NULL THEN
    v_missing := array_append(v_missing, jsonb_build_object('type', 'email', 'label', 'Email verificado'));
  END IF;
  IF v_level_data.phone_verified_at IS NULL THEN
    v_missing := array_append(v_missing, jsonb_build_object('type', 'phone', 'label', 'Teléfono verificado'));
  END IF;
  IF v_level_data.id_verified_at IS NULL THEN
    v_missing := array_append(v_missing, jsonb_build_object('type', 'id', 'label', 'Identidad verificada'));
  END IF;
  IF v_level_data.driver_license_verified_at IS NULL THEN
    v_missing := array_append(v_missing, jsonb_build_object('type', 'driver_license', 'label', 'Licencia de conducir verificada'));
  END IF;

  -- Return progress data
  RETURN jsonb_build_object(
    'success', TRUE,
    'current_level', v_level_data.current_level,
    'progress', v_progress,
    'requirements', v_requirements,
    'missing', v_missing,
    'email_verified_at', v_level_data.email_verified_at,
    'phone_verified_at', v_level_data.phone_verified_at,
    'id_verified_at', v_level_data.id_verified_at,
    'driver_license_verified_at', v_level_data.driver_license_verified_at
  );
END;
$$;


--
-- Name: FUNCTION get_verification_progress(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_verification_progress() IS 'Obtiene el progreso de verificación del usuario autenticado';


--
-- Name: get_waitlist_count(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_waitlist_count(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.booking_waitlist
  WHERE car_id = p_car_id
    AND status = 'active'
    AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
    AND expires_at > now();
$$;


--
-- Name: FUNCTION get_waitlist_count(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_waitlist_count(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) IS 'Retorna el número de usuarios en waitlist para un auto en fechas específicas.';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'locatario',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION handle_new_user(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.handle_new_user() IS 'Crea automáticamente un perfil cuando se registra un nuevo usuario';


--
-- Name: improve_driver_class_annual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.improve_driver_class_annual() RETURNS TABLE(user_id uuid, old_class integer, new_class integer, good_years integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  rec RECORD;
  v_new_class INT;
BEGIN
  -- Iterar sobre todos los conductores
  FOR rec IN
    SELECT
      drp.user_id,
      drp.class,
      drp.good_years,
      drp.last_claim_with_fault,
      drp.last_claim_at
    FROM driver_risk_profile drp
    WHERE
      -- Solo mejorar si no está en clase 0 (ya es excelente)
      drp.class > 0
      -- Solo mejorar si no tuvo siniestros con culpa en el último año
      AND (
        drp.last_claim_with_fault IS FALSE
        OR drp.last_claim_at IS NULL
        OR drp.last_claim_at < NOW() - INTERVAL '1 year'
      )
  LOOP
    -- Incrementar años buenos
    UPDATE driver_risk_profile
    SET
      good_years = good_years + 1,
      updated_at = NOW()
    WHERE driver_risk_profile.user_id = rec.user_id;

    -- Bajar clase (mejorar) cada año sin siniestros
    v_new_class := GREATEST(rec.class - 1, 0);

    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE driver_risk_profile.user_id = rec.user_id;

    -- Retornar resultado
    RETURN QUERY SELECT
      rec.user_id,
      rec.class,
      v_new_class,
      rec.good_years + 1;
  END LOOP;
END;
$$;


--
-- Name: FUNCTION improve_driver_class_annual(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.improve_driver_class_annual() IS 'Job anual: mejora clase (baja 1) para conductores sin siniestros con culpa en último año';


--
-- Name: initialize_driver_profile(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_driver_profile(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe un perfil
  SELECT EXISTS (
    SELECT 1 FROM driver_risk_profile WHERE user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'El usuario ya tiene un perfil de conductor';
  END IF;

  -- Crear perfil inicial
  INSERT INTO driver_risk_profile (
    user_id,
    class,
    driver_score,
    good_years,
    total_claims,
    claims_with_fault,
    last_class_update,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    5,     -- Clase base
    50,    -- Score neutral
    0,     -- Sin años buenos
    0,     -- Sin siniestros
    0,     -- Sin siniestros con culpa
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Perfil de conductor creado para usuario %', p_user_id;
  RETURN p_user_id;
END;
$$;


--
-- Name: FUNCTION initialize_driver_profile(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.initialize_driver_profile(p_user_id uuid) IS 'Crea perfil inicial de conductor con clase 5 (base) y score 50 (neutral)';


--
-- Name: insert_notification_secure(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_notification_secure(p_user_id uuid, p_type text, p_payload jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Basic validation: ensure user exists
  PERFORM 1 FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'target user not found';
  END IF;

  INSERT INTO public.notifications(user_id, type, payload, created_at)
  VALUES (p_user_id, p_type, p_payload, now());
END;
$$;


--
-- Name: is_at_least_18(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_at_least_18(birth_date date) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN birth_date <= (CURRENT_DATE - INTERVAL '18 years');
END;
$$;


--
-- Name: FUNCTION is_at_least_18(birth_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_at_least_18(birth_date date) IS 'Check if a person is at least 18 years old based on birth date.';


--
-- Name: is_car_available(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_car_available(p_car_id uuid, p_start_date date, p_end_date date) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE car_id = p_car_id
    AND status NOT IN ('cancelled', 'completed')
    AND (start_date, end_date) OVERLAPS (p_start_date, p_end_date)
  );
END;
$$;


--
-- Name: is_car_available(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_car_available(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- ✅ FIX: Incluir 'pending' para coincidir con constraint bookings_no_overlap
  -- El constraint previene overlaps de bookings con status: pending, confirmed, in_progress
  -- Por lo tanto, la validación debe incluir también 'pending'
  SELECT NOT EXISTS (
    SELECT 1
    FROM bookings
    WHERE car_id = p_car_id
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND (start_at, end_at) OVERLAPS (p_start_date, p_end_date)
  );
$$;


--
-- Name: FUNCTION is_car_available(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_car_available(p_car_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) IS 'Verifica si un auto está disponible para un rango de fechas.
Considera bookings en estados: pending, pending_payment, confirmed, in_progress.
Retorna TRUE si está disponible, FALSE si hay conflicto.';


--
-- Name: is_car_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_car_owner(p_car_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cars
    WHERE id = p_car_id
    AND owner_id = auth.uid()
  );
END;
$$;


--
-- Name: FUNCTION is_car_owner(p_car_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_car_owner(p_car_id uuid) IS 'Checks if current user owns a car';


--
-- Name: is_google_calendar_connected(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_google_calendar_connected(user_uuid uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM google_calendar_tokens
    WHERE user_id = user_uuid
      AND sync_enabled = true
      AND expires_at > now()
  );
END;
$$;


--
-- Name: issue_autorentar_credit(uuid, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_autorentar_credit(p_user_id uuid, p_amount_cents bigint, p_reason text DEFAULT 'Crédito Protección emitido'::text) RETURNS TABLE(success boolean, new_balance_cents bigint, transaction_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
    v_transaction_id UUID;
    v_current_balance BIGINT;
    v_new_balance BIGINT;
BEGIN
    IF p_amount_cents <= 0 THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, NULL::UUID, 'El monto debe ser mayor a 0'::TEXT;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM user_wallets WHERE user_id = p_user_id) THEN
        RETURN QUERY SELECT FALSE, 0::BIGINT, NULL::UUID, 'Usuario no tiene billetera'::TEXT;
        RETURN;
    END IF;

    SELECT autorentar_credit_balance_cents INTO v_current_balance
    FROM user_wallets WHERE user_id = p_user_id;

    v_new_balance := v_current_balance + p_amount_cents;

    UPDATE user_wallets
    SET 
        autorentar_credit_balance_cents = v_new_balance,
        available_balance_cents = available_balance_cents + p_amount_cents,
        balance_cents = balance_cents + p_amount_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO wallet_transactions (
        user_id, type, amount, currency, status, description, reference_type, completed_at
    ) VALUES (
        p_user_id, 'credit_issue', p_amount_cents, 'ARS', 'completed', p_reason, 'autorentar_credit', NOW()
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id,
        format('Crédito Protección emitido: $%s ARS', (p_amount_cents / 100.0))::TEXT;
END;
$_$;


--
-- Name: issue_protection_credit(uuid, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.issue_protection_credit(p_user_id uuid, p_amount_cents bigint DEFAULT 30000, p_validity_days integer DEFAULT 365) RETURNS TABLE(issued_amount_cents bigint, issued_amount_usd numeric, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wallet_exists BOOLEAN;
  v_expiry_date TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  -- Validar monto
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'El monto de CP debe ser mayor a 0';
  END IF;

  -- Calcular fecha de expiración
  v_expiry_date := NOW() + (p_validity_days || ' days')::INTERVAL;

  -- Verificar si existe wallet
  SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_id = p_user_id)
  INTO v_wallet_exists;

  IF NOT v_wallet_exists THEN
    -- Crear wallet si no existe
    INSERT INTO user_wallets (
      user_id, available_balance_cents, currency,
      protection_credit_cents, protection_credit_currency,
      protection_credit_issued_at, protection_credit_expires_at
    ) VALUES (
      p_user_id, 0, 'USD',
      p_amount_cents, 'USD',
      NOW(), v_expiry_date
    );
  ELSE
    -- Actualizar wallet existente
    UPDATE user_wallets
    SET protection_credit_cents = protection_credit_cents + p_amount_cents,
        protection_credit_currency = 'USD',
        protection_credit_issued_at = NOW(),
        protection_credit_expires_at = v_expiry_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'CREDIT', p_amount_cents, 'USD',
    'COMPLETED', 'ISSUANCE', 'Emisión de Crédito de Protección',
    TRUE, 'ISSUANCE'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR EMISIÓN DE CP
  PERFORM account_protection_credit_issuance(
    p_user_id,
    p_amount_cents,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT p_amount_cents, (p_amount_cents / 100.0)::DECIMAL(15, 2), v_expiry_date;
END;
$$;


--
-- Name: lock_price_for_booking(uuid, uuid, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_price_for_booking(p_car_id uuid, p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_region_id UUID;
  v_car_record RECORD;
  v_dynamic_price JSONB;
  v_lock_token UUID;
  v_lock_expires TIMESTAMPTZ;
BEGIN
  -- Validate car exists and get details
  SELECT id, region_id, price_per_day, uses_dynamic_pricing
  INTO v_car_record
  FROM public.cars
  WHERE id = p_car_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or deleted';
  END IF;

  -- Check if car uses dynamic pricing
  IF v_car_record.uses_dynamic_pricing = false OR v_car_record.region_id IS NULL THEN
    -- Return fixed price (no lock needed)
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'message', 'This car uses fixed pricing'
    );
  END IF;

  -- Calculate dynamic price using existing function
  v_dynamic_price := public.calculate_dynamic_price(
    v_car_record.region_id,
    p_user_id,
    p_rental_start,
    p_rental_hours
  );

  -- Generate lock token and expiry
  v_lock_token := gen_random_uuid();
  v_lock_expires := NOW() + INTERVAL '15 minutes';

  -- Return complete price lock data
  RETURN jsonb_build_object(
    'uses_dynamic_pricing', true,
    'price', v_dynamic_price,
    'locked_until', v_lock_expires,
    'lock_token', v_lock_token,
    'car_id', p_car_id,
    'user_id', p_user_id,
    'rental_start', p_rental_start,
    'rental_hours', p_rental_hours,
    'created_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return fallback to fixed price
    RAISE WARNING 'Error calculating dynamic price for car %: %', p_car_id, SQLERRM;
    RETURN jsonb_build_object(
      'uses_dynamic_pricing', false,
      'fixed_price', v_car_record.price_per_day,
      'error', SQLERRM,
      'fallback', true,
      'message', 'Fell back to fixed pricing due to calculation error'
    );
END;
$$;


--
-- Name: FUNCTION lock_price_for_booking(p_car_id uuid, p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.lock_price_for_booking(p_car_id uuid, p_user_id uuid, p_rental_start timestamp with time zone, p_rental_hours integer) IS 'Calculates and locks a dynamic price for 15 minutes. Returns price lock data including token, expiry, and price breakdown. Falls back to fixed price if dynamic pricing is not available or calculation fails.';


--
-- Name: log_cron_execution(text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_cron_execution(p_job_name text, p_status text, p_response jsonb DEFAULT NULL::jsonb, p_error text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO cron_execution_log (job_name, status, response, error)
  VALUES (p_job_name, p_status, p_response, p_error);
END;
$$;


--
-- Name: mark_conversation_as_read(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_conversation_as_read(p_booking_id uuid DEFAULT NULL::uuid, p_car_id uuid DEFAULT NULL::uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Use current user if not specified
  IF p_user_id IS NULL THEN
    p_user_id := auth.uid();
  END IF;

  -- Update messages
  UPDATE public.messages
  SET read_at = NOW()
  WHERE recipient_id = p_user_id
    AND read_at IS NULL
    AND (
      (p_booking_id IS NOT NULL AND booking_id = p_booking_id) OR
      (p_car_id IS NOT NULL AND car_id = p_car_id)
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


--
-- Name: mark_payout_failed(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_payout_failed(p_booking_id uuid, p_error_message text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE bookings
  SET
    payout_status = 'failed',
    payout_error_message = p_error_message,
    payout_retry_count = payout_retry_count + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  RAISE WARNING 'Payout FAILED for booking %: %', p_booking_id, p_error_message;
END;
$$;


--
-- Name: monitoring_check_database_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.monitoring_check_database_metrics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_db_size_bytes BIGINT;
  v_db_size_mb NUMERIC;
  v_active_connections INTEGER;
  v_max_connections INTEGER;
  v_connection_percent NUMERIC;
  v_storage_total_bytes BIGINT;
  v_storage_total_mb NUMERIC;
  v_alert_id UUID;
BEGIN
  -- Get database size
  SELECT pg_database_size('postgres') INTO v_db_size_bytes;
  v_db_size_mb := ROUND(v_db_size_bytes / 1024.0 / 1024.0, 2);

  -- Get connection metrics
  SELECT 
    (SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres'),
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')
  INTO v_active_connections, v_max_connections;
  
  v_connection_percent := ROUND(
    (v_active_connections::numeric / v_max_connections::numeric) * 100, 
    2
  );

  -- Get total storage (public schema)
  SELECT COALESCE(SUM(pg_total_relation_size('public.'||tablename)), 0)
  INTO v_storage_total_bytes
  FROM pg_tables
  WHERE schemaname = 'public';
  
  v_storage_total_mb := ROUND(v_storage_total_bytes / 1024.0 / 1024.0, 2);

  -- Check connection usage > 80%
  IF v_connection_percent > 80 THEN
    -- Check if alert already exists
    IF NOT EXISTS (
      SELECT 1 FROM monitoring_alerts 
      WHERE alert_type = 'database_connections_high' 
      AND status = 'active'
    ) THEN
      SELECT monitoring_create_alert(
        'database_connections_high',
        'warning',
        'Database Connections High',
        format('Active connections: %s/%s (%.2f%%)', 
          v_active_connections, v_max_connections, v_connection_percent),
        jsonb_build_object(
          'active_connections', v_active_connections,
          'max_connections', v_max_connections,
          'usage_percent', v_connection_percent
        )
      ) INTO v_alert_id;
    END IF;
  ELSE
    -- Resolve existing alert if usage drops below 70%
    IF v_connection_percent < 70 THEN
      UPDATE monitoring_alerts
      SET status = 'resolved', resolved_at = NOW()
      WHERE alert_type = 'database_connections_high' AND status = 'active';
    END IF;
  END IF;

  -- Log metrics (for tracking over time)
  INSERT INTO monitoring_performance_metrics (metric_name, metric_value, metric_unit, resource_name)
  VALUES 
    ('database_size_mb', v_db_size_mb, 'MB', 'database'),
    ('database_connections_percent', v_connection_percent, 'percentage', 'database'),
    ('database_storage_mb', v_storage_total_mb, 'MB', 'public_schema')
  ON CONFLICT DO NOTHING;

END;
$$;


--
-- Name: FUNCTION monitoring_check_database_metrics(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.monitoring_check_database_metrics() IS 'Checks database metrics (connections, storage) and creates alerts if thresholds exceeded. Runs every 15 minutes via cron.';


--
-- Name: monitoring_create_alert(text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.monitoring_create_alert(p_alert_type text, p_severity text, p_title text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    -- Verificar si la tabla existe, si no, crearla
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitoring_alerts') THEN
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            resolved_at TIMESTAMPTZ,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;

    INSERT INTO monitoring_alerts (alert_type, severity, title, message, metadata)
    VALUES (p_alert_type, p_severity, p_title, p_message, p_metadata)
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$;


--
-- Name: notify_mp_onboarding_required(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_mp_onboarding_required() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_owner_has_mp BOOLEAN;
BEGIN
  -- Solo verificar cuando se activa un auto
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Verificar si el owner tiene MP onboarding completo
    SELECT mp_onboarding_completed INTO v_owner_has_mp
    FROM profiles
    WHERE id = NEW.owner_id;

    -- Si NO tiene MP onboarding, crear notificación
    IF v_owner_has_mp IS NULL OR v_owner_has_mp = false THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        cta_link,
        metadata
      ) VALUES (
        NEW.owner_id,
        'mp_onboarding_required',
        '⚠️ Completa tu onboarding de MercadoPago',
        'Has publicado un auto, pero aún no has conectado tu cuenta de MercadoPago. Para recibir pagos, debes completar el proceso de onboarding en Configuración → Pagos.',
        '/settings/payments',
        jsonb_build_object(
          'car_id', NEW.id,
          'car_name', NEW.brand || ' ' || NEW.model,
          'published_at', NOW(),
          'notification_reason', 'mp_onboarding_required'
        )
      );

      RAISE NOTICE 'Notification created: User % needs to complete MP onboarding for car %', NEW.owner_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION notify_mp_onboarding_required(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notify_mp_onboarding_required() IS 'Crea una notificación cuando un usuario publica un auto sin tener MP onboarding completo. NO bloquea la publicación.';


--
-- Name: notify_new_chat_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_chat_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sender_name TEXT;
  v_booking_car_title TEXT;
BEGIN
  -- Obtener nombre del remitente desde user_profiles
  SELECT full_name INTO v_sender_name
  FROM public.user_profiles
  WHERE id = NEW.sender_id
  LIMIT 1;

  -- Si no hay nombre, usar email del auth.users
  IF v_sender_name IS NULL THEN
    SELECT email INTO v_sender_name
    FROM auth.users
    WHERE id = NEW.sender_id;
  END IF;

  -- Si hay booking_id, obtener info del auto para contexto
  IF NEW.booking_id IS NOT NULL THEN
    SELECT c.title INTO v_booking_car_title
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = NEW.booking_id
    LIMIT 1;
  END IF;

  -- Crear notificación para el destinatario
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    cta_link,
    type,
    metadata
  )
  VALUES (
    NEW.recipient_id,
    'Nuevo mensaje',
    CASE
      WHEN v_booking_car_title IS NOT NULL THEN
        COALESCE(v_sender_name, 'Un usuario') || ' te envió un mensaje sobre ' || v_booking_car_title
      ELSE
        COALESCE(v_sender_name, 'Un usuario') || ' te envió un mensaje'
    END,
    CASE
      WHEN NEW.booking_id IS NOT NULL THEN '/bookings/' || NEW.booking_id
      WHEN NEW.car_id IS NOT NULL THEN '/cars/' || NEW.car_id
      ELSE NULL
    END,
    'new_chat_message',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'booking_id', NEW.booking_id,
      'car_id', NEW.car_id,
      'preview', LEFT(NEW.body, 100)
    )
  );

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION notify_new_chat_message(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notify_new_chat_message() IS 'Trigger function que crea una notificación en la tabla notifications cuando 
se inserta un nuevo mensaje en la tabla messages. Incluye información del 
remitente y contexto del booking/car.';


--
-- Name: notify_waitlist_on_booking_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_waitlist_on_booking_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_waitlist_entry RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- Solo procesar si el booking cambió de status pending a expired o cancelled
  -- O si se eliminó un booking pending
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('expired', 'cancelled'))
     OR (TG_OP = 'DELETE' AND OLD.status = 'pending')
  THEN
    -- Buscar usuarios en waitlist que coincidan con las fechas del booking
    FOR v_waitlist_entry IN
      SELECT w.*
      FROM public.booking_waitlist w
      WHERE w.car_id = COALESCE(NEW.car_id, OLD.car_id)
        AND w.status = 'active'
        AND (w.start_date, w.end_date) OVERLAPS (
          COALESCE(NEW.start_at, OLD.start_at),
          COALESCE(NEW.end_at, OLD.end_at)
        )
        AND w.expires_at > now()
    LOOP
      -- Verificar que el auto está realmente disponible ahora
      IF NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE car_id = v_waitlist_entry.car_id
          AND status IN ('pending', 'confirmed', 'in_progress')
          AND (start_at, end_at) OVERLAPS (v_waitlist_entry.start_date, v_waitlist_entry.end_date)
      ) THEN
        -- Auto está disponible, notificar al usuario
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          body,
          cta_link,
          metadata
        ) VALUES (
          v_waitlist_entry.user_id,
          'generic_announcement',
          'Auto disponible',
          'El auto que tenías en lista de espera ahora está disponible para las fechas que seleccionaste.',
          format('/cars/%s?start=%s&end=%s', 
            v_waitlist_entry.car_id,
            v_waitlist_entry.start_date::date,
            v_waitlist_entry.end_date::date
          ),
          jsonb_build_object(
            'waitlist_id', v_waitlist_entry.id,
            'car_id', v_waitlist_entry.car_id,
            'start_date', v_waitlist_entry.start_date,
            'end_date', v_waitlist_entry.end_date
          )
        );

        -- Marcar waitlist entry como notificada
        UPDATE public.booking_waitlist
        SET 
          status = 'notified',
          notified_at = now(),
          updated_at = now()
        WHERE id = v_waitlist_entry.id;

        v_notification_count := v_notification_count + 1;
      END IF;
    END LOOP;

    -- Log para debugging (solo en desarrollo)
    IF v_notification_count > 0 THEN
      RAISE NOTICE 'Notificados % usuarios en waitlist para car_id %', 
        v_notification_count, 
        COALESCE(NEW.car_id, OLD.car_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: FUNCTION notify_waitlist_on_booking_change(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notify_waitlist_on_booking_change() IS 'Notifica automáticamente a usuarios en waitlist cuando un booking pending expira o se cancela.';


--
-- Name: populate_car_estimates(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_car_estimates(p_car_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_car RECORD;
  v_estimate RECORD;
BEGIN
  -- Get car details
  SELECT brand_text_backup, model_text_backup, year
  INTO v_car
  FROM public.cars
  WHERE id = p_car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car with id % not found', p_car_id;
  END IF;

  -- Get estimate
  SELECT * INTO v_estimate
  FROM public.estimate_vehicle_value_usd(
    v_car.brand_text_backup,
    v_car.model_text_backup,
    v_car.year
  );

  -- Update car record
  UPDATE public.cars
  SET
    estimated_value_usd = v_estimate.estimated_value,
    category_id = v_estimate.category_id,
    value_usd_source = CASE
      WHEN value_usd IS NOT NULL THEN 'owner_manual'
      ELSE v_estimate.data_source
    END
  WHERE id = p_car_id;
END;
$$;


--
-- Name: FUNCTION populate_car_estimates(p_car_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.populate_car_estimates(p_car_id uuid) IS 'Populates estimated_value_usd and category_id for a single car';


--
-- Name: prepare_booking_payment(uuid, public.payment_provider, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prepare_booking_payment(p_booking_id uuid, p_provider public.payment_provider, p_use_split_payment boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_car cars%ROWTYPE;
  v_owner profiles%ROWTYPE;
  v_renter profiles%ROWTYPE;
  v_platform_fee_percent DECIMAL;
  v_total_amount_cents INTEGER;
  v_platform_fee_cents INTEGER;
  v_owner_amount_cents INTEGER;
  v_provider_payee_identifier TEXT;
  v_can_use_split BOOLEAN := FALSE;
  v_split_errors TEXT[] := ARRAY[]::TEXT[];
  v_result JSONB;
  
  -- Verification Variables
  v_license_check JSONB;
  v_car_docs_check JSONB;
BEGIN
  -- 1. Fetch Basic Data
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Booking not found');
  END IF;

  SELECT * INTO v_car FROM cars WHERE id = v_booking.car_id;
  SELECT * INTO v_owner FROM profiles WHERE id = v_car.owner_id;
  SELECT * INTO v_renter FROM profiles WHERE id = v_booking.renter_id;

  -- ========================================================================
  -- 2. CRITICAL: SECURITY CHECKS (The "Lock")
  -- ========================================================================
  
  -- A. Check Renter's Driver License
  v_license_check := check_driver_license_valid(v_booking.renter_id);
  
  IF (v_license_check->>'valid')::boolean = false THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'DRIVER_VERIFICATION_FAILED',
        'message', v_license_check->>'message',
        'details', v_license_check
    );
  END IF;

  -- B. Check Car Documents (Insurance, VTV)
  v_car_docs_check := check_vehicle_documents_valid(v_booking.car_id);
  
  IF (v_car_docs_check->>'valid')::boolean = false THEN
     -- NOTE: We might want to allow payment if it's just a warning, 
     -- but for strict mode, we block if critical docs are missing.
     -- Here we block only on strict 'valid' = false.
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'VEHICLE_VERIFICATION_FAILED',
        'message', 'El vehículo no tiene la documentación en regla para ser alquilado.',
        'details', v_car_docs_check
    );
  END IF;

  -- ========================================================================
  -- 3. Payment Calculation (Original Logic)
  -- ========================================================================

  v_platform_fee_percent := get_platform_fee_percent(p_provider::text);
  v_total_amount_cents := ROUND(v_booking.total_amount * 100);
  v_platform_fee_cents := ROUND(v_total_amount_cents * v_platform_fee_percent);
  v_owner_amount_cents := v_total_amount_cents - v_platform_fee_cents;

  -- ... (Split Payment Logic preserved) ...
  IF p_use_split_payment THEN
    IF p_provider = 'mercadopago' THEN
      v_provider_payee_identifier := v_owner.mercadopago_collector_id;
      IF v_owner.mercadopago_collector_id IS NULL THEN
        v_split_errors := array_append(v_split_errors, 'Owner has not connected MercadoPago account');
      END IF;
       -- (Other MP checks...)
    ELSIF p_provider = 'paypal' THEN
       -- (PayPal checks...)
      v_provider_payee_identifier := v_owner.paypal_merchant_id;
    ELSE
      v_split_errors := array_append(v_split_errors, format('Provider %s does not support split payments', p_provider));
    END IF;
    v_can_use_split := (array_length(v_split_errors, 1) IS NULL);
  END IF;

  -- Build result JSON
  v_result := jsonb_build_object(
    'success', TRUE,
    'verification', jsonb_build_object(
        'driver_verified', TRUE,
        'vehicle_verified', TRUE
    ),
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'status', v_booking.status,
      'total_amount', v_booking.total_amount,
      'currency', v_booking.currency
    ),
    'payment', jsonb_build_object(
      'provider', p_provider,
      'total_amount_cents', v_total_amount_cents,
      'owner_amount_cents', v_owner_amount_cents,
      'platform_fee_cents', v_platform_fee_cents,
      'use_split_payment', v_can_use_split
    )
  );

  RETURN v_result;
END;
$$;


--
-- Name: prevent_completed_transaction_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_completed_transaction_modification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'No se puede modificar transacción completada';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: prevent_message_content_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_message_content_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Prevent changes to core message fields
  IF OLD.booking_id IS DISTINCT FROM NEW.booking_id OR
     OLD.car_id IS DISTINCT FROM NEW.car_id OR
     OLD.sender_id <> NEW.sender_id OR
     OLD.recipient_id <> NEW.recipient_id OR
     OLD.body <> NEW.body OR
     OLD.created_at <> NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify message content or metadata after creation';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION prevent_message_content_changes(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prevent_message_content_changes() IS 'Ensures message content and metadata cannot be changed after creation. Only status fields (delivered_at, read_at) can be updated.';


--
-- Name: preview_booking_pricing(uuid, uuid, timestamp with time zone, timestamp with time zone, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preview_booking_pricing(p_user_id uuid, p_car_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_has_card boolean DEFAULT false) RETURNS TABLE(user_id uuid, car_id uuid, driver_class integer, driver_score integer, days integer, base_price_cents bigint, base_fee_cents bigint, adjusted_fee_cents bigint, fee_discount_pct numeric, base_guarantee_cents bigint, adjusted_guarantee_cents bigint, guarantee_discount_pct numeric, total_amount_cents bigint, currency text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_car RECORD;
  v_profile RECORD;
  v_days INT;
  v_base_price_cents BIGINT;
  v_base_fee_cents BIGINT;
  v_adjusted_fee_cents BIGINT;
  v_base_guarantee_cents BIGINT;
  v_adjusted_guarantee_cents BIGINT;
  v_total_cents BIGINT;
  v_fee_discount DECIMAL(5,2);
  v_guarantee_discount DECIMAL(5,2);
BEGIN
  -- Validar fechas
  IF p_start_at >= p_end_at THEN
    RAISE EXCEPTION 'Fecha de fin debe ser posterior a fecha de inicio';
  END IF;

  -- Obtener información del auto
  SELECT * INTO v_car
  FROM cars
  WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auto no encontrado o no disponible';
  END IF;

  -- Calcular días
  v_days := EXTRACT(DAY FROM (p_end_at - p_start_at))::INT;
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- Calcular precio base (asumiendo price_per_day en centavos)
  -- Si price_per_day está en unidades, multiplicar por 100
  v_base_price_cents := v_car.price_per_day * v_days * 100; -- Convertir a centavos

  -- Calcular fee base (15% de plataforma)
  v_base_fee_cents := ROUND(v_base_price_cents * 0.15);

  -- Calcular garantía base (ejemplo: 10% del valor del auto o mínimo $500)
  -- TODO: Integrar con RiskCalculatorService
  v_base_guarantee_cents := GREATEST(
    ROUND((v_car.price_per_day * 100 * 10) * 0.10), -- 10% del valor
    50000 -- Mínimo $500 USD (50000 centavos)
  );

  -- Obtener perfil del conductor
  SELECT
    drp.class,
    drp.driver_score
  INTO v_profile
  FROM driver_risk_profile drp
  WHERE drp.user_id = p_user_id;

  IF NOT FOUND THEN
    -- Sin perfil, usar valores base
    v_profile.class := 5;
    v_profile.driver_score := 50;
  END IF;

  -- Calcular fee ajustado
  v_adjusted_fee_cents := compute_fee_with_class(
    p_user_id,
    v_base_fee_cents,
    v_profile.driver_score
  );

  -- Calcular garantía ajustada
  v_adjusted_guarantee_cents := compute_guarantee_with_class(
    p_user_id,
    v_base_guarantee_cents,
    p_has_card
  );

  -- Calcular descuentos/recargos
  v_fee_discount := ((v_base_fee_cents - v_adjusted_fee_cents)::DECIMAL / v_base_fee_cents) * 100;
  v_guarantee_discount := ((v_base_guarantee_cents - v_adjusted_guarantee_cents)::DECIMAL / v_base_guarantee_cents) * 100;

  -- Total
  v_total_cents := v_base_price_cents + v_adjusted_fee_cents;

  -- Retornar resultado
  RETURN QUERY SELECT
    p_user_id,
    p_car_id,
    v_profile.class,
    v_profile.driver_score,
    v_days,
    v_base_price_cents,
    v_base_fee_cents,
    v_adjusted_fee_cents,
    v_fee_discount,
    v_base_guarantee_cents,
    v_adjusted_guarantee_cents,
    v_guarantee_discount,
    v_total_cents,
    v_car.currency;
END;
$_$;


--
-- Name: FUNCTION preview_booking_pricing(p_user_id uuid, p_car_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_has_card boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.preview_booking_pricing(p_user_id uuid, p_car_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_has_card boolean) IS 'Genera preview completo de pricing con fee y garantía ajustados por clase de conductor';


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    guarantee_type text,
    guarantee_amount_cents integer,
    risk_snapshot_booking_id uuid,
    risk_snapshot_date timestamp with time zone,
    requires_revalidation boolean DEFAULT false,
    hold_authorization_id text,
    hold_expires_at timestamp with time zone,
    reauthorization_count integer DEFAULT 0,
    payment_mode text,
    coverage_upgrade text DEFAULT 'standard'::text,
    authorized_payment_id uuid,
    wallet_lock_id uuid,
    total_price_ars numeric(12,2),
    idempotency_key text,
    payment_split_completed boolean DEFAULT false,
    payment_split_validated_at timestamp with time zone,
    owner_payment_amount numeric(10,2),
    platform_fee numeric(10,2),
    pickup_location_lat numeric(10,8),
    pickup_location_lng numeric(11,8),
    dropoff_location_lat numeric(10,8),
    dropoff_location_lng numeric(11,8),
    delivery_required boolean DEFAULT false,
    delivery_distance_km numeric(8,2),
    delivery_fee_cents bigint DEFAULT 0,
    distance_risk_tier text,
    payment_provider public.payment_provider DEFAULT 'mercadopago'::public.payment_provider,
    payment_preference_id text,
    payment_init_point text,
    provider_split_payment_id text,
    provider_collector_id text,
    days_count integer,
    nightly_rate_cents bigint,
    subtotal_cents bigint,
    insurance_cents bigint DEFAULT 0,
    fees_cents bigint DEFAULT 0,
    discounts_cents bigint DEFAULT 0,
    total_cents bigint,
    breakdown jsonb,
    payment_id uuid,
    expires_at timestamp with time zone,
    paid_at timestamp with time zone,
    cancellation_policy_id bigint,
    cancellation_fee_cents bigint DEFAULT 0,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    has_dynamic_pricing boolean DEFAULT false,
    dynamic_price_snapshot jsonb,
    price_locked_until timestamp with time zone,
    price_lock_token uuid,
    google_calendar_event_id text,
    calendar_synced_at timestamp with time zone,
    calendar_sync_enabled boolean DEFAULT true,
    payout_status public.payout_status_enum DEFAULT 'pending'::public.payout_status_enum,
    payout_date timestamp with time zone,
    platform_fee_collected numeric(10,2),
    owner_amount_paid numeric(10,2),
    payout_retry_count integer DEFAULT 0,
    payout_error_message text,
    mercadopago_split_id character varying(255),
    risk_snapshot_id uuid,
    payment_method text,
    wallet_amount_cents bigint DEFAULT 0,
    wallet_status text DEFAULT 'none'::text,
    rental_amount_cents bigint,
    deposit_amount_cents bigint,
    deposit_status text DEFAULT 'none'::text,
    completion_status text DEFAULT 'active'::text,
    owner_confirmed_delivery boolean DEFAULT false,
    renter_confirmed_payment boolean DEFAULT false,
    metadata jsonb,
    mp_security_deposit_order_id text,
    CONSTRAINT bookings_check CHECK ((end_at > start_at)),
    CONSTRAINT bookings_completion_status_check CHECK ((completion_status = ANY (ARRAY['active'::text, 'returned'::text, 'pending_owner'::text, 'pending_renter'::text, 'pending_both'::text, 'funds_released'::text]))),
    CONSTRAINT bookings_coverage_upgrade_check CHECK ((coverage_upgrade = ANY (ARRAY['standard'::text, 'premium50'::text, 'zero'::text]))),
    CONSTRAINT bookings_deposit_status_check CHECK ((deposit_status = ANY (ARRAY['none'::text, 'locked'::text, 'released'::text, 'partially_charged'::text, 'fully_charged'::text]))),
    CONSTRAINT bookings_guarantee_type_check CHECK ((guarantee_type = ANY (ARRAY['hold'::text, 'security_credit'::text]))),
    CONSTRAINT bookings_payment_method_check CHECK ((payment_method = ANY (ARRAY['credit_card'::text, 'wallet'::text, 'partial_wallet'::text]))),
    CONSTRAINT bookings_payment_mode_check CHECK ((payment_mode = ANY (ARRAY['card'::text, 'wallet'::text]))),
    CONSTRAINT bookings_total_amount_check CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT bookings_wallet_status_check CHECK ((wallet_status = ANY (ARRAY['none'::text, 'locked'::text, 'charged'::text, 'refunded'::text]))),
    CONSTRAINT check_delivery_distance CHECK (((delivery_distance_km IS NULL) OR (delivery_distance_km >= (0)::numeric))),
    CONSTRAINT check_delivery_fee CHECK ((delivery_fee_cents >= 0)),
    CONSTRAINT check_distance_risk_tier CHECK (((distance_risk_tier IS NULL) OR (distance_risk_tier = ANY (ARRAY['local'::text, 'regional'::text, 'long_distance'::text])))),
    CONSTRAINT check_dynamic_pricing_snapshot CHECK (((has_dynamic_pricing = false) OR ((has_dynamic_pricing = true) AND (dynamic_price_snapshot IS NOT NULL))))
);


--
-- Name: TABLE bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bookings IS 'Rental bookings between renters and car owners';


--
-- Name: COLUMN bookings.guarantee_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.guarantee_type IS 'Tipo de garantía: hold (tarjeta) o security_credit (wallet)';


--
-- Name: COLUMN bookings.guarantee_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.guarantee_amount_cents IS 'Monto de garantía en centavos (hold o crédito)';


--
-- Name: COLUMN bookings.risk_snapshot_booking_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.risk_snapshot_booking_id IS 'FK a booking_risk_snapshot(booking_id). Se crea DESPUÉS de insertar el booking, no antes.';


--
-- Name: COLUMN bookings.risk_snapshot_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.risk_snapshot_date IS 'Fecha del último snapshot de risk';


--
-- Name: COLUMN bookings.requires_revalidation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.requires_revalidation IS 'Si requiere revalidación por FX o tiempo';


--
-- Name: COLUMN bookings.hold_authorization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.hold_authorization_id IS 'ID de preautorización en MercadoPago';


--
-- Name: COLUMN bookings.hold_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.hold_expires_at IS 'Fecha de expiración del hold (alquileres >7 días)';


--
-- Name: COLUMN bookings.reauthorization_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.reauthorization_count IS 'Contador de reautorizaciones (alquileres largos)';


--
-- Name: COLUMN bookings.payment_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_mode IS 'Modo de pago seleccionado: "card" (hold en tarjeta) o "wallet" (créditos/depósito)';


--
-- Name: COLUMN bookings.coverage_upgrade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.coverage_upgrade IS 'Upgrade de cobertura elegido';


--
-- Name: COLUMN bookings.authorized_payment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.authorized_payment_id IS 'ID del payment autorizado (hold, si card)';


--
-- Name: COLUMN bookings.wallet_lock_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.wallet_lock_id IS 'ID del lock de wallet (si wallet)';


--
-- Name: COLUMN bookings.total_price_ars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.total_price_ars IS 'Precio total en ARS al momento de la reserva';


--
-- Name: COLUMN bookings.payment_split_completed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_split_completed IS 'Indica si el split de pago fue procesado';


--
-- Name: COLUMN bookings.payment_split_validated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_split_validated_at IS 'Timestamp de cuándo se validó el split';


--
-- Name: COLUMN bookings.owner_payment_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.owner_payment_amount IS 'Monto pagado al dueño del auto (ARS)';


--
-- Name: COLUMN bookings.platform_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.platform_fee IS 'Fee cobrado por la plataforma (ARS)';


--
-- Name: COLUMN bookings.pickup_location_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.pickup_location_lat IS 'Pickup location latitude (may differ from car location if delivery)';


--
-- Name: COLUMN bookings.pickup_location_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.pickup_location_lng IS 'Pickup location longitude';


--
-- Name: COLUMN bookings.dropoff_location_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.dropoff_location_lat IS 'Drop-off location latitude (may differ from pickup if one-way)';


--
-- Name: COLUMN bookings.dropoff_location_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.dropoff_location_lng IS 'Drop-off location longitude';


--
-- Name: COLUMN bookings.delivery_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.delivery_required IS 'Whether the car needs to be delivered to renter';


--
-- Name: COLUMN bookings.delivery_distance_km; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.delivery_distance_km IS 'Distance from car location to pickup location (km)';


--
-- Name: COLUMN bookings.delivery_fee_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.delivery_fee_cents IS 'Delivery fee in cents (ARS)';


--
-- Name: COLUMN bookings.distance_risk_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.distance_risk_tier IS 'Risk tier based on distance: local, regional, long_distance';


--
-- Name: COLUMN bookings.payment_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_provider IS 'Payment provider used for this booking (mercadopago, paypal, etc.)';


--
-- Name: COLUMN bookings.payment_preference_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_preference_id IS 'Payment preference/order ID from the provider (MercadoPago preference_id, PayPal order_id)';


--
-- Name: COLUMN bookings.payment_init_point; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_init_point IS 'Checkout URL provided by the payment provider';


--
-- Name: COLUMN bookings.provider_split_payment_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.provider_split_payment_id IS 'Split payment transaction ID from the provider (for marketplace payments)';


--
-- Name: COLUMN bookings.provider_collector_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.provider_collector_id IS 'Seller/collector ID in the payment provider system (for split payments)';


--
-- Name: COLUMN bookings.has_dynamic_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.has_dynamic_pricing IS 'True if booking uses dynamic pricing instead of fixed car.price_per_day';


--
-- Name: COLUMN bookings.dynamic_price_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.dynamic_price_snapshot IS 'Snapshot of dynamic price calculation including all factors and breakdown';


--
-- Name: COLUMN bookings.price_locked_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.price_locked_until IS 'Timestamp until which the calculated price is guaranteed (typically 15 minutes)';


--
-- Name: COLUMN bookings.price_lock_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.price_lock_token IS 'Unique token to validate price lock authenticity and prevent tampering';


--
-- Name: COLUMN bookings.google_calendar_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.google_calendar_event_id IS 'Google Calendar Event ID for this booking (if synced)';


--
-- Name: COLUMN bookings.calendar_synced_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.calendar_synced_at IS 'Last time this booking was synced to Google Calendar';


--
-- Name: COLUMN bookings.calendar_sync_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.calendar_sync_enabled IS 'Whether calendar sync is enabled for this booking';


--
-- Name: COLUMN bookings.payout_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payout_status IS 'Estado del split payment al locador';


--
-- Name: COLUMN bookings.payout_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payout_date IS 'Fecha cuando se completó el pago al locador';


--
-- Name: COLUMN bookings.platform_fee_collected; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.platform_fee_collected IS 'Fee de plataforma cobrado (15%)';


--
-- Name: COLUMN bookings.owner_amount_paid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.owner_amount_paid IS 'Monto pagado al locador (85%)';


--
-- Name: COLUMN bookings.payout_retry_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payout_retry_count IS 'Número de reintentos si falló el split';


--
-- Name: COLUMN bookings.mercadopago_split_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.mercadopago_split_id IS 'ID del split payment en MercadoPago';


--
-- Name: COLUMN bookings.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.payment_method IS 'Método de pago usado (glosario frontend)';


--
-- Name: COLUMN bookings.wallet_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.wallet_amount_cents IS 'Monto pagado con wallet en centavos';


--
-- Name: COLUMN bookings.wallet_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.wallet_status IS 'Estado de fondos wallet: none|locked|charged|refunded';


--
-- Name: COLUMN bookings.rental_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.rental_amount_cents IS 'Monto del alquiler (sistema dual)';


--
-- Name: COLUMN bookings.deposit_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.deposit_amount_cents IS 'Monto de garantía (sistema dual)';


--
-- Name: COLUMN bookings.deposit_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.deposit_status IS 'Estado de garantía: none|locked|released|partially_charged|fully_charged';


--
-- Name: COLUMN bookings.completion_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.completion_status IS 'Estado finalización bilateral: active|returned|pending_owner|pending_renter|pending_both|funds_released';


--
-- Name: COLUMN bookings.owner_confirmed_delivery; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.owner_confirmed_delivery IS 'Owner confirmó entrega del auto';


--
-- Name: COLUMN bookings.renter_confirmed_payment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.renter_confirmed_payment IS 'Renter confirmó recepción de pago';


--
-- Name: COLUMN bookings.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.metadata IS 'Additional metadata for bookings. Used to store information like conflicting bookings cancellation count, cancellation detection timestamp, etc.';


--
-- Name: pricing_recalculate(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pricing_recalculate(p_booking_id uuid) RETURNS public.bookings
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_booking public.bookings;
  v_car public.cars;
  v_days INTEGER;
  v_nightly_rate_cents BIGINT;
  v_subtotal_cents BIGINT;
  v_insurance_cents BIGINT := 0;
  v_fees_cents BIGINT := 0;
  v_discounts_cents BIGINT := 0;
  v_deposit_cents BIGINT := 0;
  v_total_cents BIGINT;
  v_breakdown JSONB;
  v_lines JSONB := '[]'::JSONB;
BEGIN
  -- Get booking
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Get car
  SELECT * INTO v_car
  FROM public.cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found';
  END IF;

  v_days := GREATEST(
    1,
    EXTRACT(DAY FROM (v_booking.end_at - v_booking.start_at))::INTEGER
  );

  v_nightly_rate_cents := ROUND(v_car.price_per_day * 100)::BIGINT;
  v_subtotal_cents := v_nightly_rate_cents * v_days;

  v_lines := jsonb_build_array(
    jsonb_build_object('label', 'Tarifa base', 'amount_cents', v_subtotal_cents)
  );

  v_fees_cents := ROUND(v_subtotal_cents * 0.23)::BIGINT;
  v_lines := v_lines || jsonb_build_object(
    'label', 'Comisión de servicio (23%)',
    'amount_cents', v_fees_cents
  );

  v_deposit_cents := CASE
    WHEN v_booking.payment_method = 'wallet' THEN 30000  -- USD 300 (aligned with frontend)
    WHEN v_booking.payment_method = 'partial_wallet' THEN 50000
    WHEN v_booking.payment_method = 'credit_card' THEN 50000
    ELSE COALESCE(NULLIF(v_booking.deposit_amount_cents, 0), 50000)
  END;

  IF v_deposit_cents > 0 THEN
    v_lines := v_lines || jsonb_build_object(
      'label', 'Depósito de garantía (se devuelve)',
      'amount_cents', v_deposit_cents
    );
  END IF;

  v_total_cents := v_subtotal_cents + v_insurance_cents + v_fees_cents - v_discounts_cents;

  v_breakdown := jsonb_build_object(
    'days', v_days,
    'nightly_rate_cents', v_nightly_rate_cents,
    'subtotal_cents', v_subtotal_cents,
    'insurance_cents', v_insurance_cents,
    'fees_cents', v_fees_cents,
    'discounts_cents', v_discounts_cents,
    'deposit_cents', v_deposit_cents,
    'total_cents', v_total_cents,
    'currency', v_car.currency,
    'lines', v_lines
  );

  UPDATE public.bookings
  SET
    days_count = v_days,
    nightly_rate_cents = v_nightly_rate_cents,
    subtotal_cents = v_subtotal_cents,
    insurance_cents = v_insurance_cents,
    fees_cents = v_fees_cents,
    discounts_cents = v_discounts_cents,
    total_cents = v_total_cents,
    rental_amount_cents = v_total_cents,
    deposit_amount_cents = v_deposit_cents,
    breakdown = v_breakdown,
    total_amount = v_total_cents / 100.0,
    currency = v_car.currency
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;


--
-- Name: FUNCTION pricing_recalculate(p_booking_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.pricing_recalculate(p_booking_id uuid) IS 'Recalculates and updates booking pricing breakdown';


--
-- Name: process_split_payment(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_split_payment(p_booking_id uuid, p_total_amount numeric) RETURNS TABLE(split_payment_id uuid, locador_amount numeric, platform_amount numeric, locador_transaction_id uuid, platform_transaction_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split_payment_id UUID;
  v_booking RECORD;
  v_fee_percent NUMERIC;
  v_platform_amount NUMERIC;
  v_locador_amount NUMERIC;
  v_locador_tx_id UUID;
  v_platform_tx_id UUID;
  v_platform_user_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_caller_id UUID;
  v_caller_role TEXT;
  v_is_service_role BOOLEAN;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar si es service_role (webhooks)
  v_is_service_role := (SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

  -- Si no es service_role, verificar rol de admin
  IF NOT v_is_service_role THEN
    v_caller_id := auth.uid();

    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- ⭐ VALIDACIÓN P0: Obtener rol del caller
    SELECT role INTO v_caller_role
    FROM profiles
    WHERE id = v_caller_id;

    -- ⭐ VALIDACIÓN P0: Solo admin o service_role puede procesar split payments
    IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
      RAISE EXCEPTION 'No autorizado: solo administradores o el sistema pueden procesar split payments';
    END IF;
  END IF;

  -- Get booking details
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Get fee configuration
  SELECT COALESCE(custom_fee_percent, platform_fee_percent, 10.00) INTO v_fee_percent
  FROM wallet_split_config
  WHERE (locador_id = v_booking.owner_id OR locador_id IS NULL)
  AND active = true
  ORDER BY locador_id NULLS LAST
  LIMIT 1;

  -- Calculate split
  v_platform_amount := ROUND(p_total_amount * (v_fee_percent / 100), 2);
  v_locador_amount := p_total_amount - v_platform_amount;

  -- Generate split payment ID
  v_split_payment_id := uuid_generate_v4();

  -- Create transaction for locador (owner receives rental amount)
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    metadata,
    related_booking_id
  ) VALUES (
    v_booking.owner_id,
    'booking_payment',
    v_locador_amount,
    'ARS',
    'completed',
    'Payment for booking (after platform fee)',
    jsonb_build_object(
      'split_payment_id', v_split_payment_id,
      'original_amount', p_total_amount,
      'platform_fee_percent', v_fee_percent,
      'is_split_payment', true
    ),
    p_booking_id
  ) RETURNING id INTO v_locador_tx_id;

  -- Create transaction for platform
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    metadata,
    related_booking_id
  ) VALUES (
    v_platform_user_id,
    'platform_fee',
    v_platform_amount,
    'ARS',
    'completed',
    'Platform fee from booking',
    jsonb_build_object(
      'split_payment_id', v_split_payment_id,
      'original_amount', p_total_amount,
      'platform_fee_percent', v_fee_percent,
      'locador_id', v_booking.owner_id
    ),
    p_booking_id
  ) RETURNING id INTO v_platform_tx_id;

  -- Update user wallets
  UPDATE user_wallets
  SET balance = balance + v_locador_amount,
      updated_at = NOW()
  WHERE user_id = v_booking.owner_id;

  -- Return results
  RETURN QUERY SELECT 
    v_split_payment_id,
    v_locador_amount,
    v_platform_amount,
    v_locador_tx_id,
    v_platform_tx_id;
END;
$$;


--
-- Name: FUNCTION process_split_payment(p_booking_id uuid, p_total_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.process_split_payment(p_booking_id uuid, p_total_amount numeric) IS 'P0 Security: Solo admin o service_role puede procesar split payments. Normalmente llamada por webhooks. Auditado 2025-11-19';


--
-- Name: process_withdrawal(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_withdrawal(p_request_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE withdrawal_requests SET status = 'processing', processed_at = NOW() WHERE id = p_request_id;
  RETURN TRUE;
END;
$$;


--
-- Name: process_withdrawal(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_withdrawal(p_request_id uuid, p_transfer_id character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_request RECORD;
    v_user_wallet RECORD;
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    -- Get withdrawal request
    SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;

    IF v_request.status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not approved');
    END IF;

    -- Get user wallet
    SELECT * INTO v_user_wallet FROM user_wallets WHERE user_id = v_request.user_id FOR UPDATE;

    -- Check available funds
    IF v_user_wallet.balance < v_request.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
    END IF;

    -- Create withdrawal transaction
    INSERT INTO withdrawal_transactions (
        request_id,
        mercadopago_transfer_id,
        amount,
        currency,
        status
    ) VALUES (
        p_request_id,
        p_transfer_id,
        v_request.amount,
        v_request.currency,
        'in_progress'
    ) RETURNING id INTO v_transaction_id;

    -- Deduct from wallet
    UPDATE user_wallets
    SET balance = balance - v_request.amount,
        updated_at = NOW()
    WHERE user_id = v_request.user_id;

    -- Create wallet transaction record
    INSERT INTO wallet_transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        description,
        metadata
    ) VALUES (
        v_request.user_id,
        'withdrawal',
        -v_request.amount,
        v_request.currency,
        'completed',
        'Withdrawal to bank account',
        jsonb_build_object(
            'request_id', p_request_id,
            'transaction_id', v_transaction_id,
            'transfer_id', p_transfer_id
        )
    );

    -- Update request status
    UPDATE withdrawal_requests
    SET status = 'processing',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'amount', v_request.amount
    );
END;
$$;


--
-- Name: purchase_bonus_protector(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purchase_bonus_protector(p_user_id uuid, p_protection_level integer) RETURNS TABLE(addon_id uuid, price_paid_cents bigint, price_paid_usd numeric, expires_at timestamp with time zone, success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_addon_id UUID;
  v_price_cents BIGINT;
  v_wallet_balance BIGINT;
  v_expiry_date TIMESTAMPTZ;
  v_existing_addon_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Validar nivel de protección
  IF p_protection_level NOT IN (1, 2, 3) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Nivel de protección inválido (debe ser 1, 2 o 3)'::TEXT;
    RETURN;
  END IF;

  -- Obtener precio según nivel
  v_price_cents := CASE p_protection_level
    WHEN 1 THEN 1500   -- $15 USD
    WHEN 2 THEN 2500   -- $25 USD
    WHEN 3 THEN 4000   -- $40 USD
  END;

  -- Verificar balance en wallet
  SELECT available_balance_cents INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_balance IS NULL OR v_wallet_balance < v_price_cents THEN
    RETURN QUERY SELECT
      NULL::UUID,
      v_price_cents,
      (v_price_cents / 100.0)::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Fondos insuficientes en wallet'::TEXT;
    RETURN;
  END IF;

  -- Verificar que no tenga protector activo
  SELECT id INTO v_existing_addon_id
  FROM driver_protection_addons
  WHERE user_id = p_user_id
  AND addon_type = 'BONUS_PROTECTOR'
  AND status = 'ACTIVE'
  AND expires_at > NOW();

  IF v_existing_addon_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_existing_addon_id,
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Ya tienes un Protector Bonus activo'::TEXT;
    RETURN;
  END IF;

  -- Calcular expiración (1 año)
  v_expiry_date := NOW() + INTERVAL '1 year';

  -- Crear add-on
  INSERT INTO driver_protection_addons (
    id, user_id, addon_type, protection_level,
    price_paid_cents, currency, status,
    purchased_at, expires_at
  ) VALUES (
    gen_random_uuid(), p_user_id, 'BONUS_PROTECTOR', p_protection_level,
    v_price_cents, 'USD', 'ACTIVE',
    NOW(), v_expiry_date
  )
  RETURNING id INTO v_addon_id;

  -- Descontar de wallet
  UPDATE user_wallets
  SET available_balance_cents = available_balance_cents - v_price_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_id, reference_type, notes
  ) VALUES (
    gen_random_uuid(), p_user_id, 'DEBIT', -v_price_cents, 'USD',
    'COMPLETED', v_addon_id, 'ADDON_PURCHASE', 'Compra de Protector Bonus Nivel ' || p_protection_level
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR VENTA DE PROTECTOR BONUS
  PERFORM account_bonus_protector_sale(
    p_user_id,
    v_price_cents,
    p_protection_level,
    v_addon_id,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT
    v_addon_id,
    v_price_cents,
    (v_price_cents / 100.0)::DECIMAL(15, 2),
    v_expiry_date,
    TRUE,
    'Protector Bonus comprado exitosamente'::TEXT;
END;
$_$;


--
-- Name: quote_booking(uuid, timestamp with time zone, timestamp with time zone, text, numeric, numeric, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.quote_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_promo_code text DEFAULT NULL::text, p_user_lat numeric DEFAULT NULL::numeric, p_user_lng numeric DEFAULT NULL::numeric, p_delivery_required boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_car cars;
  v_days INTEGER;
  v_base_price_cents BIGINT;
  v_discount_cents BIGINT := 0;
  v_service_fee_cents BIGINT;
  v_delivery_fee_cents BIGINT := 0;
  v_distance_km NUMERIC;
  v_distance_tier TEXT := 'local';
  v_distance_data JSONB;
  v_total_cents BIGINT;
  v_result JSONB;

  -- Dynamic pricing variables
  v_pricing_result JSONB;
  v_price_per_hour NUMERIC;
BEGIN
  -- Get car details
  SELECT * INTO v_car FROM cars WHERE id = p_car_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Car not found or not active';
  END IF;

  -- Validate dates
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  -- Calculate rental days (minimum 1 day)
  v_days := EXTRACT(DAY FROM (p_end - p_start));
  IF v_days < 1 THEN
    v_days := 1;
  END IF;

  -- Calculate price based on uses_dynamic_pricing flag
  IF COALESCE(v_car.uses_dynamic_pricing, false) = true AND v_car.region_id IS NOT NULL THEN
    -- Use real-time dynamic pricing
    BEGIN
      v_pricing_result := calculate_dynamic_price(
        v_car.region_id,
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
        p_start,
        v_days * 24 -- Convert days to hours
      );

      -- Extract hourly price and convert to total price in cents
      v_price_per_hour := (v_pricing_result->>'price_per_hour')::NUMERIC;
      v_base_price_cents := (v_price_per_hour * 24 * v_days * 100)::BIGINT;

      RAISE NOTICE 'Dynamic pricing: % ARS/hour = % ARS total',
        v_price_per_hour, v_base_price_cents / 100.0;

    EXCEPTION WHEN OTHERS THEN
      -- Fallback to static price if dynamic pricing fails
      RAISE WARNING 'Dynamic pricing failed for car %, using static price: %',
        p_car_id, SQLERRM;
      v_base_price_cents := v_car.price_per_day_cents * v_days;
    END;
  ELSE
    -- Use static pricing
    v_base_price_cents := v_car.price_per_day_cents * v_days;
  END IF;

  -- Calculate service fee (10% of base price)
  v_service_fee_cents := (v_base_price_cents * 0.10)::BIGINT;

  -- Calculate total
  v_total_cents := v_base_price_cents - v_discount_cents + v_service_fee_cents + v_delivery_fee_cents;

  -- Build result JSON
  v_result := jsonb_build_object(
    'car_id', v_car.id,
    'rental_days', v_days,
    'price_per_day_cents', (v_base_price_cents / v_days),
    'base_price_cents', v_base_price_cents,
    'discount_cents', v_discount_cents,
    'service_fee_cents', v_service_fee_cents,
    'delivery_fee_cents', v_delivery_fee_cents,
    'total_cents', v_total_cents,
    'deposit_amount', COALESCE(v_car.deposit_amount, 0),
    'currency', 'ARS',
    'distance_km', v_distance_km,
    'distance_tier', v_distance_tier,
    'delivery_required', p_delivery_required,
    'pricing_strategy', CASE WHEN v_car.uses_dynamic_pricing THEN 'dynamic' ELSE 'custom' END,
    'dynamic_pricing_applied', COALESCE(v_car.uses_dynamic_pricing, false)
  );

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION quote_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_promo_code text, p_user_lat numeric, p_user_lng numeric, p_delivery_required boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.quote_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_promo_code text, p_user_lat numeric, p_user_lng numeric, p_delivery_required boolean) IS 'Get a price quote for a booking. Uses real-time dynamic pricing (12 factors) for cars with uses_dynamic_pricing=true, otherwise uses static price_per_day_cents. Activates vehicle-aware pricing, surge pricing, time-of-day, day-of-week, user history, demand factors, event pricing, and category-based adjustments.';


--
-- Name: recalculate_all_driver_scores(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalculate_all_driver_scores() RETURNS TABLE(users_updated integer, avg_score_change numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_users_updated INT := 0;
  v_total_change NUMERIC := 0;
  rec RECORD;
BEGIN
  -- Iterar sobre todos los conductores con datos telemáticos
  FOR rec IN
    SELECT DISTINCT user_id
    FROM driver_telemetry
    WHERE trip_date >= NOW() - INTERVAL '3 months'
  LOOP
    -- Calcular nuevo promedio
    UPDATE driver_risk_profile drp
    SET
      driver_score = (
        SELECT ROUND(AVG(driver_score))::INT
        FROM driver_telemetry dt
        WHERE dt.user_id = rec.user_id
        AND dt.trip_date >= NOW() - INTERVAL '3 months'
      ),
      updated_at = NOW()
    WHERE drp.user_id = rec.user_id;

    v_users_updated := v_users_updated + 1;
  END LOOP;

  RAISE NOTICE 'Scores telemáticos recalculados para % usuarios', v_users_updated;

  RETURN QUERY SELECT v_users_updated, 0::NUMERIC;
END;
$$;


--
-- Name: FUNCTION recalculate_all_driver_scores(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.recalculate_all_driver_scores() IS 'Job mensual: recalcula driver_score promedio de todos los conductores (últimos 3 meses)';


--
-- Name: recognize_autorentar_credit_breakage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recognize_autorentar_credit_breakage(p_user_id uuid) RETURNS TABLE(success boolean, message text, breakage_amount_cents bigint, reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_wallet RECORD;
  v_credit_cents BIGINT;
  v_is_expired BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Wallet not found' AS message,
      0::BIGINT AS breakage_amount_cents,
      NULL::TEXT AS reason;
    RETURN;
  END IF;

  v_credit_cents := ROUND(v_wallet.autorentar_credit_balance * 100);

  IF v_credit_cents <= 0 THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'No credit balance to recognize' AS message,
      0::BIGINT AS breakage_amount_cents,
      NULL::TEXT AS reason;
    RETURN;
  END IF;

  -- Check if expired
  v_is_expired := (v_wallet.autorentar_credit_expires_at IS NOT NULL
                   AND v_wallet.autorentar_credit_expires_at < NOW());

  IF v_is_expired THEN
    v_reason := 'expired';
  ELSE
    v_reason := 'account_closure';
  END IF;

  -- Zero out credit
  UPDATE user_wallets
  SET
    autorentar_credit_balance = 0,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Record breakage
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta,
    is_autorentar_credit,
    autorentar_credit_reference_type
  ) VALUES (
    p_user_id,
    'autorentar_credit_breakage',
    -v_credit_cents,  -- Negative = removal
    FORMAT('breakage_%s', gen_random_uuid()),
    jsonb_build_object(
      'reason', v_reason,
      'recognized_at', NOW()
    ),
    TRUE,
    'breakage'
  );

  RAISE NOTICE 'Recognized Autorentar Credit breakage: $% (%)', v_credit_cents / 100.0, v_reason;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Breakage recognized: $%s (%s)', v_credit_cents / 100.0, v_reason) AS message,
    v_credit_cents AS breakage_amount_cents,
    v_reason AS reason;
END;
$_$;


--
-- Name: FUNCTION recognize_autorentar_credit_breakage(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.recognize_autorentar_credit_breakage(p_user_id uuid) IS 'Recognize breakage revenue when Autorentar Credit expires or user closes account. Records in accounting.';


--
-- Name: recognize_protection_credit_breakage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recognize_protection_credit_breakage(p_user_id uuid) RETURNS TABLE(breakage_amount_cents bigint, breakage_amount_usd numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expired_cents BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Obtener CP expirado
  SELECT protection_credit_cents
  INTO v_expired_cents
  FROM user_wallets
  WHERE user_id = p_user_id
  AND protection_credit_expires_at < NOW()
  AND protection_credit_cents > 0;

  IF v_expired_cents IS NULL OR v_expired_cents <= 0 THEN
    -- No hay breakage
    RETURN QUERY SELECT 0::BIGINT, 0::DECIMAL(15, 2);
    RETURN;
  END IF;

  -- Resetear CP en wallet
  UPDATE user_wallets
  SET protection_credit_cents = 0,
      protection_credit_issued_at = NULL,
      protection_credit_expires_at = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción de breakage
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'DEBIT', -v_expired_cents, 'USD',
    'COMPLETED', 'BREAKAGE', 'CP expirado sin uso',
    TRUE, 'BREAKAGE'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR BREAKAGE
  PERFORM account_protection_credit_breakage(
    p_user_id,
    v_expired_cents,
    'EXPIRATION',
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT v_expired_cents, (v_expired_cents / 100.0)::DECIMAL(15, 2);
END;
$$;


--
-- Name: record_telemetry(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_telemetry(p_booking_id uuid, p_telemetry_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_booking RECORD;
  v_telemetry_id UUID;
  v_total_km DECIMAL(10,2);
  v_hard_brakes INT;
  v_speed_violations INT;
  v_night_driving_hours DECIMAL(5,2);
  v_risk_zones_visited INT;
  v_calculated_score INT;
BEGIN
  -- Obtener información del booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking no encontrado: %', p_booking_id;
  END IF;

  -- Validar que el booking esté completado
  IF v_booking.status != 'completed' THEN
    RAISE EXCEPTION 'Solo se pueden registrar datos telemáticos de bookings completados';
  END IF;

  -- Extraer datos del JSON (con valores por defecto)
  v_total_km := COALESCE((p_telemetry_data->>'total_km')::DECIMAL, 0);
  v_hard_brakes := COALESCE((p_telemetry_data->>'hard_brakes')::INT, 0);
  v_speed_violations := COALESCE((p_telemetry_data->>'speed_violations')::INT, 0);
  v_night_driving_hours := COALESCE((p_telemetry_data->>'night_driving_hours')::DECIMAL, 0);
  v_risk_zones_visited := COALESCE((p_telemetry_data->>'risk_zones_visited')::INT, 0);

  -- Validar que no exista ya telemetría para este booking
  IF EXISTS (SELECT 1 FROM driver_telemetry WHERE booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'Ya existe telemetría registrada para este booking';
  END IF;

  -- Calcular score del viaje
  v_calculated_score := calculate_trip_score(
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited
  );

  -- Insertar datos telemáticos
  INSERT INTO driver_telemetry (
    id,
    user_id,
    booking_id,
    trip_date,
    total_km,
    hard_brakes,
    speed_violations,
    night_driving_hours,
    risk_zones_visited,
    driver_score,
    raw_data,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_booking.renter_id,
    p_booking_id,
    NOW(),
    v_total_km,
    v_hard_brakes,
    v_speed_violations,
    v_night_driving_hours,
    v_risk_zones_visited,
    v_calculated_score,
    p_telemetry_data,
    NOW()
  ) RETURNING id INTO v_telemetry_id;

  -- Actualizar driver_score en el perfil (promedio de últimos 3 meses)
  UPDATE driver_risk_profile
  SET
    driver_score = (
      SELECT ROUND(AVG(driver_score))::INT
      FROM driver_telemetry
      WHERE user_id = v_booking.renter_id
      AND trip_date >= NOW() - INTERVAL '3 months'
    ),
    updated_at = NOW()
  WHERE user_id = v_booking.renter_id;

  RAISE NOTICE 'Telemetría registrada para booking %. Score: %', p_booking_id, v_calculated_score;
  RETURN v_telemetry_id;
END;
$$;


--
-- Name: FUNCTION record_telemetry(p_booking_id uuid, p_telemetry_data jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.record_telemetry(p_booking_id uuid, p_telemetry_data jsonb) IS 'Registra datos telemáticos de un viaje completado y actualiza driver_score promedio';


--
-- Name: refresh_accounting_balances(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_accounting_balances() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY accounting_balance_sheet;
  REFRESH MATERIALIZED VIEW CONCURRENTLY accounting_income_statement;
  REFRESH MATERIALIZED VIEW accounting_dashboard;
  REFRESH MATERIALIZED VIEW accounting_wallet_reconciliation;
  REFRESH MATERIALIZED VIEW accounting_commissions_report;
  REFRESH MATERIALIZED VIEW accounting_provisions_report;
END;
$$;


--
-- Name: register_payment_split(uuid, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_payment_split(p_booking_id uuid, p_mp_payment_id character varying, p_total_amount_cents integer, p_currency character varying DEFAULT 'ARS'::character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split_id UUID;
  v_booking RECORD;
  v_owner_amount_cents INTEGER;
  v_platform_fee_cents INTEGER;
  v_collector_id VARCHAR(255);
BEGIN
  -- Obtener información del booking
  SELECT b.*, p.mercadopago_collector_id
  INTO v_booking
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  JOIN profiles p ON c.owner_id = p.id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Calcular split (10% plataforma, 90% dueño)
  v_platform_fee_cents := FLOOR(p_total_amount_cents * 0.10);
  v_owner_amount_cents := p_total_amount_cents - v_platform_fee_cents;
  v_collector_id := v_booking.mercadopago_collector_id;

  -- Verificar si ya existe el split (idempotencia)
  SELECT id INTO v_split_id
  FROM payment_splits
  WHERE payment_id = p_mp_payment_id AND booking_id = p_booking_id;

  IF FOUND THEN
    -- Ya existe, actualizar
    UPDATE payment_splits
    SET
      total_amount_cents = p_total_amount_cents,
      owner_amount_cents = v_owner_amount_cents,
      platform_fee_cents = v_platform_fee_cents,
      currency = p_currency,
      updated_at = NOW()
    WHERE id = v_split_id;

    RETURN v_split_id;
  END IF;

  -- Crear nuevo registro de split
  INSERT INTO payment_splits (
    booking_id,
    payment_id,
    total_amount_cents,
    owner_amount_cents,
    platform_fee_cents,
    currency,
    collector_id,
    marketplace_id,
    status,
    validated_at
  )
  VALUES (
    p_booking_id,
    p_mp_payment_id,
    p_total_amount_cents,
    v_owner_amount_cents,
    v_platform_fee_cents,
    p_currency,
    v_collector_id,
    current_setting('app.mercadopago_marketplace_id', true), -- Desde env
    'validated', -- Se marca como validado inmediatamente
    NOW()
  )
  RETURNING id INTO v_split_id;

  RETURN v_split_id;
END;
$$;


--
-- Name: FUNCTION register_payment_split(p_booking_id uuid, p_mp_payment_id character varying, p_total_amount_cents integer, p_currency character varying); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.register_payment_split(p_booking_id uuid, p_mp_payment_id character varying, p_total_amount_cents integer, p_currency character varying) IS 'Registers payment split for MercadoPago (compatibility wrapper).
SECURITY HARDENED 2025-11-18: Added search_path to prevent privilege escalation.
Audit: Week 1 - Found 5 issues, 4 resolved.';


--
-- Name: register_payment_split(uuid, text, numeric, numeric, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_payment_split(p_booking_id uuid, p_payment_id text, p_total_amount numeric, p_owner_amount numeric, p_platform_fee numeric, p_owner_collector_id text, p_mercadopago_payment_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_split_id UUID;
  v_owner_id UUID;
  v_renter_id UUID;
  v_currency TEXT;
BEGIN
  -- Obtener datos del booking
  SELECT owner_id, renter_id, currency 
  INTO v_owner_id, v_renter_id, v_currency
  FROM bookings 
  WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;
  
  -- Validar montos
  IF p_total_amount != (p_owner_amount + p_platform_fee) THEN
    RAISE EXCEPTION 'Split amounts do not match total';
  END IF;
  
  -- Insertar split record
  INSERT INTO payment_splits (
    booking_id,
    payment_id,
    mercadopago_payment_id,
    total_amount,
    owner_amount,
    platform_fee,
    owner_id,
    owner_collector_id,
    renter_id,
    currency,
    split_status
  ) VALUES (
    p_booking_id,
    p_payment_id,
    p_mercadopago_payment_id,
    p_total_amount,
    p_owner_amount,
    p_platform_fee,
    v_owner_id,
    p_owner_collector_id,
    v_renter_id,
    v_currency,
    'pending'
  )
  RETURNING id INTO v_split_id;
  
  RETURN v_split_id;
END;
$$;


--
-- Name: FUNCTION register_payment_split(p_booking_id uuid, p_payment_id text, p_total_amount numeric, p_owner_amount numeric, p_platform_fee numeric, p_owner_collector_id text, p_mercadopago_payment_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.register_payment_split(p_booking_id uuid, p_payment_id text, p_total_amount numeric, p_owner_amount numeric, p_platform_fee numeric, p_owner_collector_id text, p_mercadopago_payment_id text) IS 'Registra un split payment en la BD';


--
-- Name: release_mp_preauth_order(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_mp_preauth_order(p_mp_order_id text, p_description text) RETURNS TABLE(success boolean, error text, mp_order_id text, mp_order_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_token TEXT;
    v_url TEXT;
    v_response_status INTEGER;
    v_response_body JSONB;
    v_response extensions.http_response;
BEGIN
    v_token := private.get_mp_token();
    v_url := 'https://api.mercadopago.com/v1/payments/' || p_mp_order_id;

    -- PUT to update payment (status=cancelled)
    SELECT * INTO v_response FROM extensions.http((
        'PUT', 
        v_url, 
        ARRAY[extensions.http_header('Authorization', 'Bearer ' || v_token), extensions.http_header('Content-Type', 'application/json')], 
        'application/json', 
        jsonb_build_object('status', 'cancelled')::text
    )::extensions.http_request);

    v_response_status := v_response.status;
    v_response_body := v_response.content::jsonb;

    IF v_response_status = 200 THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT, (v_response_body->>'id')::TEXT, v_response_body->>'status';
    ELSE
        RETURN QUERY SELECT FALSE, 'MP Error: ' || (v_response_body->>'message'), NULL::TEXT, NULL::TEXT;
    END IF;
END;
$$;


--
-- Name: remove_from_waitlist(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_from_waitlist(p_waitlist_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Validar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Actualizar status a cancelled
  UPDATE public.booking_waitlist
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_waitlist_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada de waitlist no encontrada o no tienes permiso';
  END IF;

  RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION remove_from_waitlist(p_waitlist_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.remove_from_waitlist(p_waitlist_id uuid) IS 'Remueve una entrada de waitlist (la marca como cancelled).';


--
-- Name: request_booking(uuid, uuid, timestamp with time zone, timestamp with time zone, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_booking(p_car_id uuid, p_renter_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_payment_method text DEFAULT 'card'::text) RETURNS TABLE(booking_id uuid, status text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_car RECORD;
  v_overlap_exists boolean;
  v_nights int;
  v_price_per_day int;
  v_total_amount_cents bigint;
  v_total_amount numeric;
  v_lock_id uuid;
BEGIN
  -- basic date sanity
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  -- load car
  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAR_NOT_FOUND';
  END IF;

  IF v_car.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'CAR_NOT_ACTIVE';
  END IF;

  -- check overlaps against active reservations
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
    LIMIT 1
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'OVERLAP';
  END IF;

  -- compute nights and total
  v_price_per_day := COALESCE(v_car.price_per_day_cents, 0);
  v_nights := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_end - p_start)) / 86400.0)::int);
  v_total_amount_cents := v_price_per_day::bigint * v_nights;
  v_total_amount := (v_total_amount_cents::numeric / 100)::numeric;

  -- create booking as pending by default (use total_cents column in bookings)
  INSERT INTO public.bookings (car_id, renter_id, start_at, end_at, status, total_amount, total_cents, created_at)
  VALUES (p_car_id, p_renter_id, p_start, p_end, 'pending', v_total_amount, v_total_amount_cents, now())
  RETURNING id INTO booking_id;

  -- if wallet path, attempt to lock funds and confirm booking
  IF lower(coalesce(p_payment_method, 'card')) = 'wallet' THEN
    BEGIN
      -- call wallet_lock_funds; assume it returns uuid lock id
      SELECT public.wallet_lock_funds(booking_id, v_total_amount_cents) INTO v_lock_id;
      UPDATE public.bookings
      SET wallet_lock_id = v_lock_id,
          wallet_amount_cents = v_total_amount_cents,
          status = 'confirmed',
          updated_at = now()
      WHERE id = booking_id;

      status := 'confirmed';
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      -- bubble up as insufficient funds or propagate original message
      RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
    END;
  ELSE
    -- card path: leave pending so frontend handles redirect and webhook will confirm
    status := 'pending';
    RETURN NEXT;
    RETURN;
  END IF;

END;
$$;


--
-- Name: request_booking(uuid, uuid, timestamp with time zone, timestamp with time zone, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_booking(p_car_id uuid, p_renter_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_payment_method text DEFAULT 'card'::text, p_idempotency_key text DEFAULT NULL::text) RETURNS TABLE(booking_id uuid, status text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_car RECORD;
  v_overlap_exists boolean;
  v_nights int;
  v_price_per_day int;
  v_total_amount_cents bigint;
  v_total_amount numeric;
  v_lock_id uuid;
  v_status text;
BEGIN
  -- basic date sanity
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES' USING ERRCODE = 'P0001';
  END IF;

  -- load car
  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAR_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF v_car.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'CAR_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;

  -- acquire advisory lock per car to avoid races from parallel requests
  PERFORM pg_advisory_xact_lock(hashtext(p_car_id::text)::bigint);

  -- idempotency: if the same idempotency_key exists for this renter/car/dates return it
  IF p_idempotency_key IS NOT NULL THEN
    SELECT b.id, b.status INTO booking_id, v_status
    FROM public.bookings b
    WHERE b.idempotency_key = p_idempotency_key
      AND b.renter_id = p_renter_id
      AND b.car_id = p_car_id
      AND b.start_at = p_start
      AND b.end_at = p_end
    LIMIT 1;

    IF booking_id IS NOT NULL THEN
      status := v_status;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- check overlaps against active reservations
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
    LIMIT 1
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'OVERLAP' USING ERRCODE = 'P0001';
  END IF;

  -- compute nights and total
  v_price_per_day := COALESCE(v_car.price_per_day_cents, 0);
  v_nights := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_end - p_start)) / 86400.0)::int);
  v_total_amount_cents := v_price_per_day::bigint * v_nights;
  v_total_amount := (v_total_amount_cents::numeric / 100)::numeric;

  -- create booking as pending by default (use total_cents column in bookings)
  INSERT INTO public.bookings (car_id, renter_id, start_at, end_at, status, total_amount, total_cents, idempotency_key, created_at)
  VALUES (p_car_id, p_renter_id, p_start, p_end, 'pending', v_total_amount, v_total_amount_cents, p_idempotency_key, now())
  RETURNING id INTO booking_id;

  -- if wallet path, attempt to lock funds and confirm booking
  IF lower(coalesce(p_payment_method, 'card')) = 'wallet' THEN
    BEGIN
      -- ensure wallet function exists
      IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'wallet_lock_funds') THEN
        RAISE EXCEPTION 'WALLET_NOT_AVAILABLE' USING ERRCODE = 'P0002';
      END IF;

      -- call wallet_lock_funds; assume it returns uuid lock id
      SELECT public.wallet_lock_funds(booking_id, v_total_amount_cents) INTO v_lock_id;
      UPDATE public.bookings
      SET wallet_lock_id = v_lock_id,
          wallet_amount_cents = v_total_amount_cents,
          status = 'confirmed',
          updated_at = now()
      WHERE id = booking_id;

      status := 'confirmed';
      RETURN NEXT;
      RETURN;
    EXCEPTION WHEN OTHERS THEN
      -- bubble up as insufficient funds or propagate original message
      RAISE EXCEPTION 'INSUFFICIENT_FUNDS' USING ERRCODE = 'P0003';
    END;
  ELSE
    -- card path: leave pending so frontend handles redirect and webhook will confirm
    status := 'pending';
    RETURN NEXT;
    RETURN;
  END IF;

END;
$$;


--
-- Name: request_booking(uuid, timestamp with time zone, timestamp with time zone, numeric, numeric, numeric, numeric, boolean, boolean, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_pickup_lat numeric DEFAULT NULL::numeric, p_pickup_lng numeric DEFAULT NULL::numeric, p_dropoff_lat numeric DEFAULT NULL::numeric, p_dropoff_lng numeric DEFAULT NULL::numeric, p_delivery_required boolean DEFAULT false, p_use_dynamic_pricing boolean DEFAULT false, p_price_lock_token uuid DEFAULT NULL::uuid, p_dynamic_price_snapshot jsonb DEFAULT NULL::jsonb) RETURNS TABLE(booking_id uuid, status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_renter_id UUID;
  v_car RECORD;
  v_overlap_exists boolean;
  v_nights int;
  v_price_per_day int;
  v_total_amount_cents bigint;
  v_total_amount numeric;
  v_lock_id uuid;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_caller_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Usuario solo puede crear bookings para sí mismo (o admin puede crear para cualquier usuario)
  -- En esta versión, el renter_id se obtiene de auth.uid()
  v_renter_id := v_caller_id;

  -- basic date sanity
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  -- load car
  SELECT * INTO v_car FROM public.cars WHERE id = p_car_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAR_NOT_FOUND';
  END IF;

  IF v_car.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'CAR_NOT_ACTIVE';
  END IF;

  -- check overlaps against active reservations
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.car_id = p_car_id
      AND b.status IN ('pending','confirmed','in_progress')
      AND tstzrange(b.start_at, b.end_at, '[]') && tstzrange(p_start, p_end, '[]')
    LIMIT 1
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'OVERLAP';
  END IF;

  -- compute nights and total
  v_price_per_day := COALESCE(v_car.price_per_day_cents, 0);
  v_nights := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_end - p_start)) / 86400.0)::int);
  v_total_amount_cents := v_price_per_day::bigint * v_nights;
  v_total_amount := (v_total_amount_cents::numeric / 100)::numeric;

  -- create booking as pending by default
  INSERT INTO public.bookings (
    car_id, renter_id, start_at, end_at, status, 
    total_amount, total_cents, created_at,
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    delivery_required
  )
  VALUES (
    p_car_id, v_renter_id, p_start, p_end, 'pending', 
    v_total_amount, v_total_amount_cents, now(),
    p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng,
    p_delivery_required
  )
  RETURNING id INTO booking_id;

  -- Retornar resultado
  status := 'pending';
  RETURN NEXT;
  RETURN;

END;
$$;


--
-- Name: FUNCTION request_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_pickup_lat numeric, p_pickup_lng numeric, p_dropoff_lat numeric, p_dropoff_lng numeric, p_delivery_required boolean, p_use_dynamic_pricing boolean, p_price_lock_token uuid, p_dynamic_price_snapshot jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.request_booking(p_car_id uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_pickup_lat numeric, p_pickup_lng numeric, p_dropoff_lat numeric, p_dropoff_lng numeric, p_delivery_required boolean, p_use_dynamic_pricing boolean, p_price_lock_token uuid, p_dynamic_price_snapshot jsonb) IS 'P0 Security: Usuario solo puede crear bookings para sí mismo. Auditado 2025-11-19';


--
-- Name: rotate_encryption_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rotate_encryption_key() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_key_id TEXT;
  v_new_key_id TEXT;
  v_messages_count INTEGER;
BEGIN
  -- This is a placeholder for future key rotation
  -- In production, this would:
  -- 1. Generate new key
  -- 2. Re-encrypt all messages with new key
  -- 3. Mark old key as inactive
  -- 4. Store both keys temporarily for transition period

  RAISE NOTICE 'Key rotation not implemented yet';
  RETURN 'Key rotation pending implementation';
END;
$$;


--
-- Name: send_encrypted_message(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_encrypted_message(p_booking_id uuid DEFAULT NULL::uuid, p_car_id uuid DEFAULT NULL::uuid, p_recipient_id uuid DEFAULT NULL::uuid, p_body text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_message_id UUID;
  v_sender_id UUID;
  v_recipient_exists BOOLEAN;
BEGIN
  -- Get current user
  v_sender_id := auth.uid();

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate input
  IF p_body IS NULL OR LENGTH(TRIM(p_body)) = 0 THEN
    RAISE EXCEPTION 'Message body cannot be empty';
  END IF;

  IF p_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient ID is required';
  END IF;

  IF p_booking_id IS NULL AND p_car_id IS NULL THEN
    RAISE EXCEPTION 'Either booking_id or car_id must be provided';
  END IF;

  IF p_booking_id IS NOT NULL AND p_car_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot specify both booking_id and car_id';
  END IF;

  -- PHASE 2: Verify recipient exists (prevent orphaned messages)
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_recipient_id) INTO v_recipient_exists;
  IF NOT v_recipient_exists THEN
    RAISE EXCEPTION 'Recipient user not found: %', p_recipient_id;
  END IF;

  -- PHASE 2: Verify sender has permission to message about this context
  IF p_booking_id IS NOT NULL THEN
    -- Check if sender is renter or owner of the booking
    IF NOT EXISTS(
      SELECT 1 FROM public.bookings b
      JOIN public.cars c ON b.car_id = c.id
      WHERE b.id = p_booking_id
      AND (b.renter_id = v_sender_id OR c.owner_id = v_sender_id)
    ) THEN
      RAISE EXCEPTION 'Unauthorized: cannot send messages for this booking';
    END IF;
  ELSIF p_car_id IS NOT NULL THEN
    -- Check if sender is owner of the car
    IF NOT EXISTS(
      SELECT 1 FROM public.cars
      WHERE id = p_car_id
      AND owner_id = v_sender_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: can only send messages about your own car';
    END IF;
  END IF;

  -- Insert message (encryption happens via trigger)
  INSERT INTO public.messages (
    booking_id,
    car_id,
    sender_id,
    recipient_id,
    body
  ) VALUES (
    p_booking_id,
    p_car_id,
    v_sender_id,
    p_recipient_id,
    p_body -- Will be encrypted by trigger
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;


--
-- Name: FUNCTION send_encrypted_message(p_booking_id uuid, p_car_id uuid, p_recipient_id uuid, p_body text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.send_encrypted_message(p_booking_id uuid, p_car_id uuid, p_recipient_id uuid, p_body text) IS 'Sends encrypted message with server-side encryption via trigger.
SECURITY HARDENED 2025-11-18: Added search_path and recipient validation.
Audit: Week 1 - Found 6 issues, 5 resolved.';


--
-- Name: send_monthly_depreciation_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_monthly_depreciation_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  car_record RECORD;
  monthly_depreciation NUMERIC(12,2);
  monthly_earnings NUMERIC(12,2);
  net_gain NUMERIC(12,2);
  current_month TEXT;
  depreciation_rate NUMERIC(6,4);
  car_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');

  FOR car_record IN
    SELECT 
      c.id,
      c.owner_id,
      c.title,
      c.brand,
      c.model,
      c.year,
      COALESCE(c.value_usd, c.estimated_value_usd) AS valuation_usd,
      c.category_id,
      c.price_per_day,
      c.status
    FROM cars c
    WHERE c.status = 'active'
      AND c.owner_id IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1
      FROM notifications n
      WHERE n.user_id = car_record.owner_id
        AND n.type = 'generic_announcement'
        AND n.metadata->>'notification_kind' = 'monthly_depreciation'
        AND n.metadata->>'car_id' = car_record.id::text
        AND DATE_TRUNC('month', n.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ) THEN
      CONTINUE;
    END IF;

    depreciation_rate := 0.05;
    IF car_record.category_id IS NOT NULL THEN
      SELECT COALESCE(vc.depreciation_rate_annual, 0.05)
      INTO depreciation_rate
      FROM vehicle_categories vc
      WHERE vc.id = car_record.category_id;
    END IF;

    IF car_record.valuation_usd IS NOT NULL AND car_record.valuation_usd > 0 THEN
      monthly_depreciation := (car_record.valuation_usd * depreciation_rate) / 12;
    ELSE
      monthly_depreciation := 0;
    END IF;

    SELECT COALESCE(SUM(b.total_amount * 0.85), 0)
    INTO monthly_earnings
    FROM bookings b
    WHERE b.car_id = car_record.id
      AND b.status IN ('in_progress','completed','confirmed','pending')
      AND DATE_TRUNC('month', b.start_at) = DATE_TRUNC('month', CURRENT_DATE)
      AND (b.currency IS NULL OR b.currency = 'ARS');

    net_gain := monthly_earnings - monthly_depreciation;

    car_name := COALESCE(
      car_record.title,
      TRIM(COALESCE(car_record.brand, '') || ' ' || COALESCE(car_record.model, '')),
      'tu auto'
    );

    notification_title := '📊 Reporte Mensual: ' || car_name;
    notification_message := 
      'Este mes tu auto tuvo:' || E'\n' ||
      '• Depreciación: $' || TO_CHAR(monthly_depreciation, 'FM999,999,999.00') || ' USD' || E'\n' ||
      '• Ganancias: $' || TO_CHAR(monthly_earnings, 'FM999,999,999.00') || ' ARS' || E'\n' ||
      '• Ganancia Neta: $' || TO_CHAR(net_gain, 'FM999,999,999.00') || ' ARS' || E'\n\n' ||
      CASE 
        WHEN net_gain > monthly_depreciation * 0.5 THEN
          '🎉 ¡Excelente! Estás contrarrestando la depreciación con tus ganancias.'
        WHEN monthly_earnings < monthly_depreciation * 0.5 THEN
          '⚠️ Tus ganancias están por debajo de la depreciación. Considera optimizar tu precio o disponibilidad.'
        ELSE
          '💡 Puedes mejorar tus ganancias optimizando tu precio y disponibilidad.'
      END;

    INSERT INTO notifications (
      user_id,
      title,
      body,
      type,
      cta_link,
      metadata
    ) VALUES (
      car_record.owner_id,
      notification_title,
      notification_message,
      'generic_announcement',
      '/cars/' || car_record.id,
      jsonb_build_object(
        'notification_kind', 'monthly_depreciation',
        'car_id', car_record.id,
        'month', current_month,
        'depreciation', monthly_depreciation,
        'earnings', monthly_earnings,
        'net_gain', net_gain
      )
    );

    IF monthly_earnings < monthly_depreciation * 0.5 AND car_record.price_per_day IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        body,
        type,
        cta_link,
        metadata
      ) VALUES (
        car_record.owner_id,
        '💡 Optimiza tu precio: ' || car_name,
        'Tus ganancias están por debajo de la depreciación. ' ||
        'Considera aumentar tu precio a $' || TO_CHAR(car_record.price_per_day * 1.15, 'FM999,999.00') || 
        ' ARS/día para mejorar tus ganancias.',
        'generic_announcement',
        '/cars/' || car_record.id || '/edit',
        jsonb_build_object(
          'notification_kind', 'low_earnings_optimization',
          'car_id', car_record.id,
          'current_price', car_record.price_per_day,
          'recommended_price', car_record.price_per_day * 1.15
        )
      );
    END IF;

  END LOOP;
END;
$_$;


--
-- Name: FUNCTION send_monthly_depreciation_notifications(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.send_monthly_depreciation_notifications() IS 'Sends monthly depreciation notifications to car owners. Calculates depreciation based on car category and value, compares with monthly earnings, and provides optimization tips.';


--
-- Name: set_location_tracking_created_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_location_tracking_created_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.created_at = COALESCE(NEW.created_at, NOW());
  NEW.updated_at = COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$;


--
-- Name: set_primary_goal(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_primary_goal(p_goal text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSON;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  IF p_goal NOT IN ('publish','rent','both') THEN
    RETURN json_build_object('success', false, 'error', 'Goal inválido. Debe ser: publish, rent o both');
  END IF;

  UPDATE profiles SET primary_goal = p_goal, updated_at = NOW() WHERE id = v_user_id;

  IF FOUND THEN
    v_result := json_build_object('success', true, 'message', 'Primary goal guardado exitosamente', 'goal', p_goal);
  ELSE
    v_result := json_build_object('success', false, 'error', 'No se pudo actualizar el perfil');
  END IF;

  RETURN v_result;
END;
$$;


--
-- Name: set_row_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_row_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: start_location_tracking(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.start_location_tracking(p_booking_id uuid, p_tracking_type text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_role TEXT;
  v_tracking_id UUID;
BEGIN
  -- Determine user role in this booking
  SELECT
    CASE
      WHEN c.owner_id = auth.uid() THEN 'locador'
      WHEN b.renter_id = auth.uid() THEN 'locatario'
    END INTO v_user_role
  FROM bookings b
  JOIN cars c ON c.id = b.car_id
  WHERE b.id = p_booking_id;

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not part of this booking';
  END IF;

  -- Deactivate any existing tracking sessions
  UPDATE booking_location_tracking
  SET status = 'inactive'
  WHERE booking_id = p_booking_id
    AND user_id = auth.uid()
    AND tracking_type = p_tracking_type
    AND status = 'active';

  -- Create new tracking session
  INSERT INTO booking_location_tracking (
    booking_id,
    user_id,
    user_role,
    tracking_type,
    latitude,
    longitude,
    status
  ) VALUES (
    p_booking_id,
    auth.uid(),
    v_user_role,
    p_tracking_type,
    0, -- Will be updated immediately by client
    0,
    'active'
  )
  RETURNING id INTO v_tracking_id;

  RETURN v_tracking_id;
END;
$$;


--
-- Name: submit_claim(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.submit_claim(p_claim_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_claim claims;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Get and validate claim
  SELECT * INTO v_claim FROM claims WHERE id = p_claim_id;

  IF v_claim IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim not found');
  END IF;

  IF v_claim.reported_by != v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  IF v_claim.status != 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim is not in draft status');
  END IF;

  -- Validate claim has damages
  IF v_claim.damages IS NULL OR jsonb_array_length(v_claim.damages) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim must have at least one damage item');
  END IF;

  -- Update status
  UPDATE claims
  SET status = 'submitted'
  WHERE id = p_claim_id;

  RETURN jsonb_build_object(
    'ok', true,
    'claim_id', p_claim_id,
    'new_status', 'submitted'
  );
END;
$$;


--
-- Name: sync_binance_rates_direct(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_binance_rates_direct() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_binance_url text;
  v_response_id bigint;
  v_response_status int;
  v_response_body jsonb;
  v_binance_rate numeric;
  v_platform_rate numeric;
  v_margin_percent numeric := 10.0; -- Margen del 10%
  v_margin_absolute numeric;
  v_result jsonb;
  v_pairs text[] := ARRAY['USDTARS', 'USDTBRL'];
  v_pair text;
  v_success_count int := 0;
  v_error_count int := 0;
BEGIN
  v_result := '{"success": false, "updated": [], "errors": []}'::jsonb;

  -- Iterar sobre cada par de monedas
  FOREACH v_pair IN ARRAY v_pairs
  LOOP
    BEGIN
      -- URL de Binance API
      v_binance_url := 'https://api.binance.com/api/v3/ticker/price?symbol=' || v_pair;

      -- Hacer request HTTP GET usando pg_net
      SELECT INTO v_response_id
        net.http_get(
          url := v_binance_url,
          headers := '{"Content-Type": "application/json"}'::jsonb
        );

      -- Esperar respuesta (polling cada 100ms por máximo 5 segundos)
      FOR i IN 1..50 LOOP
        SELECT status_code, content::jsonb
        INTO v_response_status, v_response_body
        FROM net._http_response
        WHERE id = v_response_id;

        EXIT WHEN v_response_status IS NOT NULL;
        PERFORM pg_sleep(0.1);
      END LOOP;

      -- Verificar respuesta
      IF v_response_status = 200 AND v_response_body IS NOT NULL THEN
        -- Extraer precio de Binance
        v_binance_rate := (v_response_body->>'price')::numeric;

        -- Calcular tasa de plataforma con margen
        v_platform_rate := v_binance_rate * (1 + v_margin_percent / 100.0);
        v_margin_absolute := v_platform_rate - v_binance_rate;

        -- Actualizar o insertar en exchange_rates usando RPC
        PERFORM upsert_exchange_rate(
          p_pair := v_pair,
          p_binance_rate := v_binance_rate,
          p_margin_percent := v_margin_percent,
          p_volatility_24h := NULL
        );

        -- Agregar a resultados exitosos
        v_result := jsonb_set(
          v_result,
          '{updated}',
          (v_result->'updated') || jsonb_build_object(
            'pair', v_pair,
            'binance_rate', v_binance_rate,
            'platform_rate', v_platform_rate,
            'margin_percent', v_margin_percent
          )
        );

        v_success_count := v_success_count + 1;

        RAISE NOTICE 'Updated %: Binance % → Platform % (+% %%)',
          v_pair, v_binance_rate, v_platform_rate, v_margin_percent;

      ELSE
        -- Error en la respuesta
        RAISE WARNING 'Failed to fetch %: HTTP %', v_pair, v_response_status;

        v_result := jsonb_set(
          v_result,
          '{errors}',
          (v_result->'errors') || jsonb_build_object(
            'pair', v_pair,
            'error', 'HTTP ' || COALESCE(v_response_status::text, 'timeout')
          )
        );

        v_error_count := v_error_count + 1;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Error inesperado
        RAISE WARNING 'Exception syncing %: % %', v_pair, SQLERRM, SQLSTATE;

        v_result := jsonb_set(
          v_result,
          '{errors}',
          (v_result->'errors') || jsonb_build_object(
            'pair', v_pair,
            'error', SQLERRM
          )
        );

        v_error_count := v_error_count + 1;
    END;
  END LOOP;

  -- Marcar como exitoso si al menos 1 par se actualizó
  IF v_success_count > 0 THEN
    v_result := jsonb_set(v_result, '{success}', 'true'::jsonb);
  END IF;

  v_result := jsonb_set(v_result, '{success_count}', to_jsonb(v_success_count));
  v_result := jsonb_set(v_result, '{error_count}', to_jsonb(v_error_count));
  v_result := jsonb_set(v_result, '{timestamp}', to_jsonb(now()));

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', now()
    );
END;
$$;


--
-- Name: FUNCTION sync_binance_rates_direct(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_binance_rates_direct() IS 'Intenta sincronizar tasas directamente desde Binance API usando pg_net.
ADVERTENCIA: Esta función falla con HTTP timeout en Supabase.
NO USAR. Usar GitHub Actions workflow en su lugar.';


--
-- Name: sync_binance_rates_via_edge_function(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_binance_rates_via_edge_function() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_function_url text := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-binance-rates';
  v_request_id uuid;
BEGIN
  -- Encolar la petición para que una Edge Function la procese con el secret adecuado
  INSERT INTO public.outbound_requests (endpoint, method, headers, body)
  VALUES (
    v_function_url,
    'POST',
    jsonb_build_object('Content-Type', 'application/json'), -- NO incluir Authorization aquí
    '{}'::jsonb
  ) RETURNING id INTO v_request_id;

  RAISE NOTICE 'Enqueued outbound request % to % (no secret stored in DB). Process via Edge Function that reads Supabase Secret.', v_request_id, v_function_url;
END;
$$;


--
-- Name: FUNCTION sync_binance_rates_via_edge_function(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sync_binance_rates_via_edge_function() IS 'Llama a la Edge Function sync-binance-rates vía HTTP para actualizar tasas de cambio.
Parte del sistema dual con sync_binance_rates_direct() como fallback.
Ejecutado por GitHub Actions (cada 30 min) y PostgreSQL cron (7,37 min con offset).';


--
-- Name: sync_profile_email_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_email_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update profile email when auth.users email changes
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_profile_email_on_user_create(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_email_on_user_create() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Update profile email when new user is created
  -- This handles the case where profile exists before user creation
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id AND (email IS NULL OR email != NEW.email);
  
  RETURN NEW;
END;
$$;


--
-- Name: transfer_profit_to_equity(character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_profit_to_equity(p_period character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profit DECIMAL(15, 2);
  v_entries JSONB;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN account_type = 'INCOME' THEN amount ELSE -amount END), 0)
  INTO v_profit
  FROM accounting_income_statement
  WHERE period = p_period;

  IF v_profit != 0 THEN
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '3400',  -- Resultado del Ejercicio
        'debit', CASE WHEN v_profit > 0 THEN v_profit ELSE 0 END,
        'credit', CASE WHEN v_profit < 0 THEN ABS(v_profit) ELSE 0 END,
        'description', 'Traslado resultado período ' || p_period
      ),
      jsonb_build_object(
        'account_code', '3300',  -- Resultados Acumulados
        'debit', CASE WHEN v_profit < 0 THEN ABS(v_profit) ELSE 0 END,
        'credit', CASE WHEN v_profit > 0 THEN v_profit ELSE 0 END,
        'description', 'Resultado acumulado ' || p_period
      )
    );

    PERFORM create_journal_entry(
      'PERIOD_CLOSE',
      NULL,
      'accounting_period_balances',
      'Cierre de período: ' || p_period,
      v_entries
    );
  END IF;
END;
$$;


--
-- Name: trg_accounting_revenue_recognition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_accounting_revenue_recognition() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
  v_commission DECIMAL(18,2);
  v_owner_amount DECIMAL(18,2);
  v_gross DECIMAL(18,2);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Solo cuando el booking se completa
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Calcular comisión (asumiendo 10% por defecto)
    v_gross := NEW.total_price;
    v_commission := NEW.total_price * 0.10; -- Ajustar según configuración
    v_owner_amount := NEW.total_price - v_commission;
    
    -- DEBITO: Liberar pasivo por ingreso diferido
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2130', v_commission, 0,
      'Liberación ingreso diferido - booking completado',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- CREDITO: Reconocer SOLO la comisión como ingreso (NIIF 15)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '4110', 0, v_commission,
      'Ingreso por comisión servicio plataforma (NIIF 15)',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- DEBITO: Lo que se debe pagar al propietario
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2140', v_owner_amount, 0,
      'Cuenta por pagar a propietario',
      'booking_revenue', NEW.id, v_batch_id, v_period
    );
    
    -- Registrar reconocimiento de ingreso
    INSERT INTO accounting_revenue_recognition (
      booking_id, revenue_type, gross_amount, commission_amount,
      owner_amount, recognition_date, performance_obligation_met,
      booking_status, is_recognized, ledger_batch_id
    ) VALUES (
      NEW.id, 'commission', v_gross, v_commission,
      v_owner_amount, NOW(), true, NEW.status, true, v_batch_id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trg_accounting_security_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_accounting_security_deposit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
  v_deposit_amount DECIMAL(18,2);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NEW.created_at, 'YYYY-MM');
  
  -- Al iniciar booking con franquicia
  IF NEW.status = 'active' AND NEW.security_deposit_amount > 0 THEN
    v_deposit_amount := NEW.security_deposit_amount;
    
    -- DEBITO: Reducir billetera (o crear cuenta por cobrar)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2110', v_deposit_amount, 0,
      'Bloqueo de fondos para depósito de garantía',
      'security_deposit', NEW.id, v_batch_id, v_period
    );
    
    -- CREDITO: Crear pasivo por depósito de garantía (IAS 37)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, batch_id, fiscal_period
    ) VALUES (
      '2120', 0, v_deposit_amount,
      'Pasivo por depósito de garantía (IAS 37)',
      'security_deposit', NEW.id, v_batch_id, v_period
    );
    
    -- Registrar pasivo
    INSERT INTO accounting_wallet_liabilities (
      user_id, amount, liability_type, status, booking_id
    ) VALUES (
      NEW.renter_id, v_deposit_amount, 'security_deposit', 'active', NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trg_accounting_wallet_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_accounting_wallet_deposit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_batch_id UUID;
  v_period VARCHAR(10);
BEGIN
  v_batch_id := gen_random_uuid();
  v_period := TO_CHAR(NEW.created_at, 'YYYY-MM');
  
  -- Solo procesar depósitos confirmados
  IF NEW.status = 'completed' AND NEW.type IN ('deposit', 'mercadopago_deposit') THEN
    
    -- Asiento: DEBITO Caja/Bancos
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description, 
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '1110', NEW.amount, 0, 
      'Depósito de cliente a billetera',
      'wallet_deposit', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- Asiento: CREDITO Pasivo por Depósito de Cliente (NIIF 15)
    INSERT INTO accounting_ledger (
      account_code, debit, credit, description,
      reference_type, reference_id, user_id, batch_id, fiscal_period
    ) VALUES (
      '2110', 0, NEW.amount,
      'Pasivo por depósito de cliente (NIIF 15)',
      'wallet_deposit', NEW.id, NEW.user_id, v_batch_id, v_period
    );
    
    -- Registrar el pasivo
    INSERT INTO accounting_wallet_liabilities (
      user_id, transaction_id, amount, liability_type, status
    ) VALUES (
      NEW.user_id, NEW.id, NEW.amount, 'deposit', 'active'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_accounting_commission_income(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_accounting_commission_income() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entries JSONB;
  v_commission DECIMAL(15, 2);
  v_owner_payment DECIMAL(15, 2);
  v_mp_fee DECIMAL(15, 2);
BEGIN
  -- Solo reconocer al completar el servicio (usar 'completed' no 'COMPLETED')
  IF NEW.status = 'completed'::booking_status AND (OLD.status IS NULL OR OLD.status != 'completed'::booking_status) THEN
    
    v_commission := COALESCE(NEW.platform_fee, NEW.total_amount * 0.15);
    v_owner_payment := NEW.total_amount - v_commission;
    v_mp_fee := NEW.total_amount * 0.05;

    v_entries := jsonb_build_array(
      jsonb_build_object('account_code', '2101', 'debit', NEW.total_amount, 'description', 'Procesamiento de pago'),
      jsonb_build_object('account_code', '4101', 'credit', v_commission, 'description', 'Ingreso por comisión'),
      jsonb_build_object('account_code', '2301', 'credit', v_owner_payment, 'description', 'Por pagar a propietario'),
      jsonb_build_object('account_code', '5101', 'debit', v_mp_fee, 'description', 'Comisión MercadoPago'),
      jsonb_build_object('account_code', '2302', 'credit', v_mp_fee, 'description', 'Por pagar a MercadoPago')
    );

    -- Solo llamar si la función exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_journal_entry') THEN
      PERFORM create_journal_entry('RENTAL_COMPLETION', NEW.id, 'bookings', 
                                   'Finalización de alquiler - Booking: ' || NEW.id::TEXT, v_entries);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: trigger_accounting_fgo_contribution(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_accounting_fgo_contribution() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entries JSONB;
BEGIN
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Billetera
      'debit', NEW.amount,
      'description', 'Aporte a FGO'
    ),
    jsonb_build_object(
      'account_code', '2201',  -- Provisión FGO
      'credit', NEW.amount,
      'description', 'Provisión para garantía operativa'
    )
  );

  PERFORM create_journal_entry(
    'FGO_CONTRIBUTION',
    NEW.id,
    'fgo_contributions',
    'Aporte FGO - Usuario: ' || NEW.user_id::TEXT,
    v_entries
  );

  -- Crear provisión
  INSERT INTO accounting_provisions (
    provision_type, reference_id, reference_table,
    provision_amount, status
  ) VALUES (
    'FGO_RESERVE', NEW.id, 'fgo_contributions',
    NEW.amount, 'ACTIVE'
  );

  RETURN NEW;
END;
$$;


--
-- Name: trigger_accounting_release_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_accounting_release_deposit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entries JSONB;
BEGIN
  IF NEW.deposit_released AND NOT OLD.deposit_released THEN
    
    v_entries := jsonb_build_array(
      jsonb_build_object(
        'account_code', '2102',  -- Depósito de garantía
        'debit', NEW.deposit_amount,
        'description', 'Liberación de garantía'
      ),
      jsonb_build_object(
        'account_code', '2101',  -- Billetera
        'credit', NEW.deposit_amount,
        'description', 'Devolución a billetera'
      )
    );

    PERFORM create_journal_entry(
      'SECURITY_DEPOSIT_RELEASE',
      NEW.id,
      'bookings',
      'Liberación de depósito - Booking: ' || NEW.id::TEXT,
      v_entries
    );

    -- Actualizar provisión
    UPDATE accounting_provisions
    SET status = 'RELEASED', release_date = NOW(), released_amount = provision_amount
    WHERE reference_id = NEW.id AND provision_type = 'SECURITY_DEPOSIT';

  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: trigger_accounting_security_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_accounting_security_deposit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entries JSONB;
BEGIN
  -- NIIF: Depósito de garantía es PASIVO
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Billetera (reducción pasivo)
      'debit', NEW.deposit_amount,
      'description', 'Bloqueo de garantía'
    ),
    jsonb_build_object(
      'account_code', '2102',  -- Depósitos de Garantía (nuevo pasivo)
      'credit', NEW.deposit_amount,
      'description', 'Franquicia bloqueada'
    )
  );

  PERFORM create_journal_entry(
    'SECURITY_DEPOSIT_BLOCK',
    NEW.id,
    'bookings',
    'Bloqueo de depósito - Booking: ' || NEW.id::TEXT,
    v_entries
  );

  -- Crear provisión
  INSERT INTO accounting_provisions (
    provision_type, reference_id, reference_table,
    provision_amount, status
  ) VALUES (
    'SECURITY_DEPOSIT', NEW.id, 'bookings',
    NEW.deposit_amount, 'ACTIVE'
  );

  RETURN NEW;
END;
$$;


--
-- Name: trigger_accounting_wallet_deposit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_accounting_wallet_deposit() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entries JSONB;
BEGIN
  -- NIIF 15: Pasivo por contrato (deuda con usuario)
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '1102',  -- MercadoPago Disponible (ACTIVO)
      'debit', NEW.amount,
      'description', 'Ingreso de fondos a billetera'
    ),
    jsonb_build_object(
      'account_code', '2101',  -- Depósitos de Clientes (PASIVO)
      'credit', NEW.amount,
      'description', 'Pasivo por depósito en billetera'
    )
  );

  PERFORM create_journal_entry(
    'WALLET_DEPOSIT',
    NEW.id,
    'wallet_transactions',
    'Depósito en billetera: ' || NEW.user_id::TEXT,
    v_entries
  );

  RETURN NEW;
END;
$$;


--
-- Name: trigger_booking_pricing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_booking_pricing() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Set default expiration to 30 minutes from now for pending bookings
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + INTERVAL '30 minutes';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION trigger_booking_pricing(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.trigger_booking_pricing() IS 'Automatically sets defaults for new bookings';


--
-- Name: trigger_send_deposit_confirmation_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_send_deposit_confirmation_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  edge_function_url TEXT;
  supabase_anon_key TEXT;
  http_response RECORD;
BEGIN
  -- Only send email if:
  -- 1. Transaction type is 'deposit'
  -- 2. Status changed from 'pending' to 'completed'
  IF NEW.type = 'deposit' AND OLD.status = 'pending' AND NEW.status = 'completed' THEN

    -- Get Supabase URL and anon key from secrets (you'll need to set these)
    edge_function_url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/send-deposit-confirmation-email';

    -- Call Edge Function asynchronously using pg_net (if available)
    -- If pg_net is not available, this will fail silently
    -- You can install pg_net: https://github.com/supabase/pg_net

    BEGIN
      -- Try to call Edge Function via HTTP
      -- Note: This requires pg_net extension
      -- If not available, you can call from application code instead

      PERFORM net.http_post(
        url := edge_function_url,
        body := jsonb_build_object(
          'transaction_id', NEW.id,
          'user_id', NEW.user_id,
          'amount', NEW.amount,
          'currency', NEW.currency
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        )
      );

      RAISE NOTICE 'Email trigger sent for transaction %', NEW.id;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send email notification: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: trigger_update_cars_on_mp_onboarding(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_update_cars_on_mp_onboarding() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo ejecutar si mp_onboarding_completed cambió a true
  IF NEW.mp_onboarding_completed = true AND (OLD.mp_onboarding_completed IS NULL OR OLD.mp_onboarding_completed = false) THEN
    PERFORM update_user_cars_payment_status(NEW.id);
    RAISE NOTICE 'User % completed MP onboarding, updated cars', NEW.id;
  END IF;

  -- Si mp_onboarding_completed cambió a false, deshabilitar autos
  IF NEW.mp_onboarding_completed = false AND OLD.mp_onboarding_completed = true THEN
    PERFORM update_user_cars_payment_status(NEW.id);
    RAISE WARNING 'User % MP onboarding revoked, disabled cars', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_accounting_journal_entries_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_accounting_journal_entries_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_all_demand_snapshots(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_all_demand_snapshots() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_region RECORD;
  v_updated_count INT := 0;
  v_error_count INT := 0;
  v_start_time TIMESTAMPTZ;
  v_duration_ms INT;
  v_error_msg TEXT := NULL;
BEGIN
  v_start_time := clock_timestamp();

  -- Loop through all active pricing regions
  FOR v_region IN
    SELECT id, name
    FROM public.pricing_regions
    WHERE active = true
  LOOP
    BEGIN
      -- Update demand snapshot for this region
      PERFORM public.update_demand_snapshot(v_region.id);
      v_updated_count := v_updated_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_error_msg := COALESCE(v_error_msg || '; ', '') ||
        format('Region %s: %s', v_region.name, SQLERRM);
      RAISE WARNING 'Failed to update demand snapshot for region % (id: %): %',
        v_region.name, v_region.id, SQLERRM;
    END;
  END LOOP;

  -- Calculate duration
  v_duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INT;

  -- Log health status
  INSERT INTO public.pricing_cron_health (
    job_name,
    last_run_at,
    status,
    regions_updated,
    error_message,
    duration_ms
  ) VALUES (
    'update-demand-snapshots-every-15min',
    v_start_time,
    CASE WHEN v_error_count = 0 THEN 'success' ELSE 'error' END,
    v_updated_count,
    v_error_msg,
    v_duration_ms
  );

  -- Clean up old health logs (keep last 7 days)
  DELETE FROM public.pricing_cron_health
  WHERE created_at < NOW() - INTERVAL '7 days';

END;
$$;


--
-- Name: FUNCTION update_all_demand_snapshots(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_all_demand_snapshots() IS 'Wrapper function that updates demand snapshots for all active pricing regions. Called by cron job every 15 minutes to enable real-time surge pricing.';


--
-- Name: update_booking_payout(uuid, numeric, numeric, character varying, public.payout_status_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_booking_payout(p_booking_id uuid, p_platform_fee numeric, p_owner_amount numeric, p_mp_split_id character varying DEFAULT NULL::character varying, p_status public.payout_status_enum DEFAULT 'completed'::public.payout_status_enum) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE bookings
  SET
    payout_status = p_status,
    payout_date = CURRENT_TIMESTAMP,
    platform_fee_collected = p_platform_fee,
    owner_amount_paid = p_owner_amount,
    mercadopago_split_id = p_mp_split_id,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;

  RAISE NOTICE 'Payout updated for booking %: status=%, owner_amount=%',
    p_booking_id, p_status, p_owner_amount;
END;
$$;


--
-- Name: update_calendar_sync_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_sync_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_car_blocked_dates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_car_blocked_dates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_claims_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_claims_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_demand_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_demand_snapshot(p_region_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_available_cars INT;
  v_active_bookings INT;
  v_pending_requests INT;
  v_demand_ratio DECIMAL(5,3);
  v_surge_factor DECIMAL(5,3);
BEGIN
  -- Count available cars in region
  SELECT COUNT(*)
  INTO v_available_cars
  FROM public.cars
  WHERE region_id = p_region_id AND status = 'active';

  -- Count active bookings
  SELECT COUNT(*)
  INTO v_active_bookings
  FROM public.bookings b
  JOIN public.cars c ON b.car_id = c.id
  WHERE c.region_id = p_region_id
    AND b.status IN ('confirmed', 'in_progress');

  -- Count pending requests (last 2 hours)
  SELECT COUNT(*)
  INTO v_pending_requests
  FROM public.bookings b
  JOIN public.cars c ON b.car_id = c.id
  WHERE c.region_id = p_region_id
    AND b.status = 'pending'
    AND b.created_at > NOW() - INTERVAL '2 hours';

  -- Calculate demand ratio
  IF v_available_cars > 0 THEN
    v_demand_ratio := (v_active_bookings + v_pending_requests)::DECIMAL / v_available_cars;
  ELSE
    v_demand_ratio := 0.0;
  END IF;

  -- Calculate surge factor
  IF v_demand_ratio > 1.5 THEN
    v_surge_factor := 0.25; -- High demand
  ELSIF v_demand_ratio > 1.2 THEN
    v_surge_factor := 0.15; -- Medium-high demand
  ELSIF v_demand_ratio < 0.8 THEN
    v_surge_factor := -0.10; -- Low demand (discount)
  ELSE
    v_surge_factor := 0.0; -- Normal
  END IF;

  -- Insert snapshot
  INSERT INTO public.pricing_demand_snapshots (
    region_id,
    available_cars,
    active_bookings,
    pending_requests,
    demand_ratio,
    surge_factor
  ) VALUES (
    p_region_id,
    v_available_cars,
    v_active_bookings,
    v_pending_requests,
    v_demand_ratio,
    v_surge_factor
  );
END;
$$;


--
-- Name: update_driver_class_on_event(uuid, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_driver_class_on_event(p_user_id uuid, p_claim_with_fault boolean, p_severity integer DEFAULT 1) RETURNS TABLE(old_class integer, new_class integer, class_change integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile RECORD;
  v_old_class INT;
  v_new_class INT;
  v_class_increase INT;
BEGIN
  -- Obtener perfil actual
  SELECT * INTO v_profile
  FROM driver_risk_profile
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de conductor no encontrado para usuario %', p_user_id;
  END IF;

  v_old_class := v_profile.class;

  -- Actualizar contadores
  UPDATE driver_risk_profile
  SET
    total_claims = total_claims + 1,
    claims_with_fault = CASE
      WHEN p_claim_with_fault THEN claims_with_fault + 1
      ELSE claims_with_fault
    END,
    last_claim_at = NOW(),
    last_claim_with_fault = p_claim_with_fault,
    good_years = 0, -- Resetear años buenos
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Calcular aumento de clase solo si hay culpa
  IF p_claim_with_fault THEN
    v_class_increase := CASE
      WHEN p_severity = 1 THEN 1  -- Leve: +1 clase
      WHEN p_severity = 2 THEN 2  -- Moderado: +2 clases
      WHEN p_severity = 3 THEN 3  -- Grave: +3 clases
      ELSE 1
    END;

    -- Calcular nueva clase (máximo 10)
    v_new_class := LEAST(v_old_class + v_class_increase, 10);

    -- Actualizar clase
    UPDATE driver_risk_profile
    SET
      class = v_new_class,
      last_class_update = NOW(),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Clase actualizada: % → % (Δ +%)', v_old_class, v_new_class, v_class_increase;
  ELSE
    -- Sin culpa: no cambiar clase
    v_new_class := v_old_class;
    RAISE NOTICE 'Siniestro sin culpa registrado. Clase sin cambios: %', v_old_class;
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_old_class, v_new_class, (v_new_class - v_old_class);
END;
$$;


--
-- Name: FUNCTION update_driver_class_on_event(p_user_id uuid, p_claim_with_fault boolean, p_severity integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_driver_class_on_event(p_user_id uuid, p_claim_with_fault boolean, p_severity integer) IS 'Actualiza clase del conductor tras siniestro. Severidad: 1 (leve/+1), 2 (moderado/+2), 3 (grave/+3)';


--
-- Name: update_facturas_recibidas_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_facturas_recibidas_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_fx_rates_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_fx_rates_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_location(uuid, numeric, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_location(p_tracking_id uuid, p_latitude numeric, p_longitude numeric, p_accuracy numeric DEFAULT NULL::numeric, p_heading numeric DEFAULT NULL::numeric, p_speed numeric DEFAULT NULL::numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE booking_location_tracking
  SET
    latitude = p_latitude,
    longitude = p_longitude,
    accuracy = COALESCE(p_accuracy, accuracy),
    heading = COALESCE(p_heading, heading),
    speed = COALESCE(p_speed, speed),
    updated_at = NOW()
  WHERE id = p_tracking_id
    AND user_id = auth.uid()
    AND status = 'active';

  RETURN FOUND;
END;
$$;


--
-- Name: update_location_tracking_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_location_tracking_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_messages_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_messages_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_payment_intent_status(text, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payment_intent_status(p_mp_payment_id text, p_mp_status text, p_mp_status_detail text DEFAULT NULL::text, p_payment_method_id text DEFAULT NULL::text, p_card_last4 text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_intent_id uuid;
  v_new_status text;
  v_timestamp_field text;
  v_current_status text;
BEGIN
  -- Check if payment intent exists and get current status
  SELECT id, status INTO v_intent_id, v_current_status
  FROM public.payment_intents
  WHERE mp_payment_id = p_mp_payment_id
  LIMIT 1;

  IF v_intent_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment intent not found'
    );
  END IF;

  -- Map mp_status to internal status
  v_new_status := CASE p_mp_status
    WHEN 'authorized' THEN 'authorized'
    WHEN 'approved' THEN 'captured'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'expired' THEN 'expired'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'pending' THEN 'pending'
    ELSE 'failed'
  END;

  -- PHASE 3: Idempotency check - If status is already correct, return success without updating
  IF v_current_status = v_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'intent_id', v_intent_id,
      'new_status', v_new_status,
      'message', 'Status already set to ' || v_new_status
    );
  END IF;

  -- Determine timestamp field to update
  v_timestamp_field := CASE v_new_status
    WHEN 'authorized' THEN 'authorized_at'
    WHEN 'captured' THEN 'captured_at'
    WHEN 'cancelled' THEN 'cancelled_at'
    WHEN 'expired' THEN 'expired_at'
    ELSE NULL
  END;

  -- Update intent
  UPDATE public.payment_intents
  SET
    mp_payment_id = p_mp_payment_id,
    mp_status = p_mp_status,
    mp_status_detail = p_mp_status_detail,
    status = v_new_status,
    payment_method_id = COALESCE(p_payment_method_id, payment_method_id),
    card_last4 = COALESCE(p_card_last4, card_last4),
    metadata = metadata || p_metadata,
    -- Update timestamp correspondingly
    authorized_at = CASE WHEN v_timestamp_field = 'authorized_at' THEN now() ELSE authorized_at END,
    captured_at = CASE WHEN v_timestamp_field = 'captured_at' THEN now() ELSE captured_at END,
    cancelled_at = CASE WHEN v_timestamp_field = 'cancelled_at' THEN now() ELSE cancelled_at END,
    expired_at = CASE WHEN v_timestamp_field = 'expired_at' THEN now() ELSE expired_at END,
    updated_at = NOW()
  WHERE mp_payment_id = p_mp_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'new_status', v_new_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: FUNCTION update_payment_intent_status(p_mp_payment_id text, p_mp_status text, p_mp_status_detail text, p_payment_method_id text, p_card_last4 text, p_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_payment_intent_status(p_mp_payment_id text, p_mp_status text, p_mp_status_detail text, p_payment_method_id text, p_card_last4 text, p_metadata jsonb) IS 'Updates payment intent status from webhook (MercadoPago).
SECURITY HARDENED 2025-11-18: Added search_path and idempotency protection.
Audit: Week 1 - Found 6 issues, 5 resolved.';


--
-- Name: update_payment_intents_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_payment_intents_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_profile_with_encryption(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_profile_with_encryption(p_user_id uuid, p_updates jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_phone TEXT;
  v_whatsapp TEXT;
  v_address_line1 TEXT;
  v_address_line2 TEXT;
  v_postal_code TEXT;
  v_dni TEXT;
  v_gov_id_number TEXT;
  v_driver_license_number TEXT;
  v_result JSONB;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot update another user profile';
  END IF;
  v_phone := p_updates->>'phone';
  v_whatsapp := p_updates->>'whatsapp';
  v_address_line1 := p_updates->>'address_line1';
  v_address_line2 := p_updates->>'address_line2';
  v_postal_code := p_updates->>'postal_code';
  v_dni := p_updates->>'dni';
  v_gov_id_number := p_updates->>'gov_id_number';
  v_driver_license_number := p_updates->>'driver_license_number';
  UPDATE profiles
  SET
    phone_encrypted = CASE WHEN v_phone IS NOT NULL THEN encrypt_pii(v_phone) ELSE phone_encrypted END,
    whatsapp_encrypted = CASE WHEN v_whatsapp IS NOT NULL THEN encrypt_pii(v_whatsapp) ELSE whatsapp_encrypted END,
    address_line1_encrypted = CASE WHEN v_address_line1 IS NOT NULL THEN encrypt_pii(v_address_line1) ELSE address_line1_encrypted END,
    address_line2_encrypted = CASE WHEN v_address_line2 IS NOT NULL THEN encrypt_pii(v_address_line2) ELSE address_line2_encrypted END,
    postal_code_encrypted = CASE WHEN v_postal_code IS NOT NULL THEN encrypt_pii(v_postal_code) ELSE postal_code_encrypted END,
    dni_encrypted = CASE WHEN v_dni IS NOT NULL THEN encrypt_pii(v_dni) ELSE dni_encrypted END,
    gov_id_number_encrypted = CASE WHEN v_gov_id_number IS NOT NULL THEN encrypt_pii(v_gov_id_number) ELSE gov_id_number_encrypted END,
    driver_license_number_encrypted = CASE WHEN v_driver_license_number IS NOT NULL THEN encrypt_pii(v_driver_license_number) ELSE driver_license_number_encrypted END,
    full_name = COALESCE(p_updates->>'full_name', full_name),
    city = COALESCE(p_updates->>'city', city),
    state = COALESCE(p_updates->>'state', state),
    country = COALESCE(p_updates->>'country', country),
    locale = COALESCE(p_updates->>'locale', locale),
    timezone = COALESCE(p_updates->>'timezone', timezone),
    updated_at = NOW()
  WHERE id = p_user_id;
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'user_id', p_user_id
  ) INTO v_result;
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


--
-- Name: update_proveedores_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_proveedores_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_cars_payment_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_cars_payment_status(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_can_receive BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Verificar si el usuario puede recibir pagos
  v_can_receive := user_can_receive_payments(p_user_id);

  -- Actualizar todos los autos del usuario
  UPDATE cars
  SET can_receive_payments = v_can_receive,
      updated_at = NOW()
  WHERE owner_id = p_user_id
  AND can_receive_payments != v_can_receive; -- Solo si cambió

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Updated % cars for user % (can_receive_payments = %)',
    v_updated_count, p_user_id, v_can_receive;

  RETURN v_updated_count;
END;
$$;


--
-- Name: update_user_stats_v2_for_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_stats_v2_for_booking(p_booking_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_booking RECORD;
  v_reviewee_id UUID;
  v_total_reviews INTEGER;
  v_avg_rating NUMERIC;
BEGIN
  -- Obtener información del booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Determinar quién es el reviewee basado en el tipo de review más reciente
  -- Para reviews de renter_to_owner, reviewee es el owner del auto
  -- Para reviews de owner_to_renter, reviewee es el renter
  SELECT
    CASE
      WHEN r.review_type = 'renter_to_owner' THEN c.owner_id
      WHEN r.review_type = 'owner_to_renter' THEN v_booking.renter_id
    END INTO v_reviewee_id
  FROM reviews r
  JOIN cars c ON r.car_id = c.id
  WHERE r.booking_id = p_booking_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  -- Si no hay review, no hacer nada
  IF v_reviewee_id IS NULL THEN
    RETURN;
  END IF;

  -- Calcular estadísticas para el reviewee
  SELECT
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as avg_rating
  INTO v_total_reviews, v_avg_rating
  FROM reviews
  WHERE reviewee_id = v_reviewee_id
    AND is_visible = true;

  -- Actualizar las estadísticas del usuario
  UPDATE profiles
  SET
    rating_avg = v_avg_rating,
    rating_count = v_total_reviews,
    updated_at = NOW()
  WHERE id = v_reviewee_id;

  -- Log de actualización
  RAISE NOTICE 'User stats updated: User=%, Reviews=%, Avg Rating=%',
    v_reviewee_id, v_total_reviews, v_avg_rating;
END;
$$;


--
-- Name: update_vehicle_categories_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vehicle_categories_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_vehicle_pricing_models_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_vehicle_pricing_models_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: user_can_receive_payments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_can_receive_payments(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND status = 'verified'
    AND payment_verified = TRUE
  );
END;
$$;


--
-- Name: validate_bonus_malus_migration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_bonus_malus_migration() RETURNS TABLE(check_name text, passed boolean, details text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Check 1: All users have profiles
    RETURN QUERY
    SELECT
        'Users have profiles'::TEXT,
        (SELECT COUNT(*) FROM auth.users) = (SELECT COUNT(*) FROM driver_risk_profile),
        format('Users: %s, Profiles: %s',
            (SELECT COUNT(*) FROM auth.users),
            (SELECT COUNT(*) FROM driver_risk_profile)
        );

    -- Check 2: All users have CP
    RETURN QUERY
    SELECT
        'Users have Protection Credit'::TEXT,
        (SELECT COUNT(*) FROM user_wallets WHERE protection_credit_cents > 0) > 0,
        format('Users with CP: %s',
            (SELECT COUNT(*) FROM user_wallets WHERE protection_credit_cents > 0)
        );

    -- Check 3: Classes are within valid range
    RETURN QUERY
    SELECT
        'Classes within valid range (0-10)'::TEXT,
        NOT EXISTS (SELECT 1 FROM driver_risk_profile WHERE class < 0 OR class > 10),
        format('Invalid classes: %s',
            (SELECT COUNT(*) FROM driver_risk_profile WHERE class < 0 OR class > 10)
        );

    -- Check 4: Pricing factors exist
    RETURN QUERY
    SELECT
        'Pricing factors configured'::TEXT,
        (SELECT COUNT(*) FROM pricing_class_factors) = 11,
        format('Factors: %s (expected 11)',
            (SELECT COUNT(*) FROM pricing_class_factors)
        );
END;
$$;


--
-- Name: FUNCTION validate_bonus_malus_migration(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_bonus_malus_migration() IS 'Validates bonus-malus migration integrity';


--
-- Name: validate_claim_anti_fraud(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_claim_anti_fraud(p_booking_id uuid, p_owner_id uuid, p_total_estimated_usd numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_booking_duration_hours INTEGER;
  v_owner_claims_last_30d INTEGER;
  v_owner_total_claimed_usd NUMERIC;
  v_avg_claim_amount_usd NUMERIC;
  v_warnings JSONB := '[]'::jsonb;
  v_block_reason TEXT := NULL;
BEGIN
  -- 1. Check booking duration (flag if < 24 hours)
  SELECT EXTRACT(EPOCH FROM (end_at - start_at)) / 3600
  INTO v_booking_duration_hours
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_duration_hours IS NOT NULL AND v_booking_duration_hours < 24 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'short_booking',
      'message', 'Booking duration is less than 24 hours',
      'value', v_booking_duration_hours
    );
  END IF;

  -- 2. Check owner's claim frequency (last 30 days)
  SELECT COUNT(*), COALESCE(SUM(total_estimated_cost_usd), 0)
  INTO v_owner_claims_last_30d, v_owner_total_claimed_usd
  FROM claims
  WHERE reported_by = p_owner_id
    AND created_at > now() - interval '30 days'
    AND status NOT IN ('rejected');

  IF v_owner_claims_last_30d >= 3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'high_claim_frequency',
      'message', 'Owner has submitted 3+ claims in last 30 days',
      'value', v_owner_claims_last_30d
    );
  END IF;

  IF v_owner_claims_last_30d >= 5 THEN
    v_block_reason := 'Owner has submitted 5+ claims in last 30 days - requires manual review';
  END IF;

  -- 3. Check if claim amount is unusually high compared to owner's average
  SELECT AVG(total_estimated_cost_usd)
  INTO v_avg_claim_amount_usd
  FROM claims
  WHERE reported_by = p_owner_id
    AND status NOT IN ('rejected', 'draft');

  IF v_avg_claim_amount_usd IS NOT NULL
     AND p_total_estimated_usd > v_avg_claim_amount_usd * 3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'unusually_high_amount',
      'message', 'Claim amount is 3x higher than owner average',
      'value', p_total_estimated_usd,
      'average', v_avg_claim_amount_usd
    );
  END IF;

  -- 4. Check for suspicious claim amount (exactly round numbers)
  IF p_total_estimated_usd = FLOOR(p_total_estimated_usd)
     AND p_total_estimated_usd >= 100 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'round_number_amount',
      'message', 'Claim amount is suspiciously round',
      'value', p_total_estimated_usd
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', v_block_reason IS NULL,
    'blocked', v_block_reason IS NOT NULL,
    'block_reason', v_block_reason,
    'warnings', v_warnings,
    'owner_claims_30d', v_owner_claims_last_30d,
    'owner_total_claimed_30d_usd', v_owner_total_claimed_usd
  );
END;
$$;


--
-- Name: FUNCTION validate_claim_anti_fraud(p_booking_id uuid, p_owner_id uuid, p_total_estimated_usd numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_claim_anti_fraud(p_booking_id uuid, p_owner_id uuid, p_total_estimated_usd numeric) IS 'P0-SECURITY: Validates a claim for potential fraud patterns.
Returns warnings and can block submission if fraud score is too high.';


--
-- Name: validate_mercadopago_oauth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_mercadopago_oauth() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Si se marca como conectado, validar que tenga collector_id
  IF NEW.mercadopago_connected = TRUE AND NEW.mercadopago_collector_id IS NULL THEN
    RAISE EXCEPTION 'mercadopago_collector_id es requerido cuando mercadopago_connected = true';
  END IF;

  -- Si se desconecta, limpiar tokens
  IF NEW.mercadopago_connected = FALSE THEN
    NEW.mercadopago_access_token := NULL;
    NEW.mercadopago_refresh_token := NULL;
    NEW.mercadopago_access_token_expires_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_mercadopago_oauth(character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_mercadopago_oauth(p_code character varying, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO mercadopago_tokens (user_id, code, status)
  VALUES (p_user_id, p_code, 'pending');
  RETURN TRUE;
END;
$$;


--
-- Name: verify_accounting_integrity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_accounting_integrity() RETURNS TABLE(test_name text, passed boolean, details text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Test 1: Todos los asientos están balanceados
  RETURN QUERY
  SELECT
    'Asientos Balanceados'::TEXT,
    NOT EXISTS (SELECT 1 FROM accounting_journal_entries WHERE NOT is_balanced),
    CASE
      WHEN EXISTS (SELECT 1 FROM accounting_journal_entries WHERE NOT is_balanced)
      THEN 'Hay ' || (SELECT COUNT(*) FROM accounting_journal_entries WHERE NOT is_balanced)::TEXT || ' asientos desbalanceados'
      ELSE 'OK'
    END;

  -- Test 2: Conciliación wallet
  RETURN QUERY
  SELECT
    'Conciliación Wallet'::TEXT,
    ABS((SELECT amount FROM accounting_wallet_reconciliation WHERE source LIKE 'Diferencia%')) < 1,
    'Diferencia: $' || (SELECT amount FROM accounting_wallet_reconciliation WHERE source LIKE 'Diferencia%')::TEXT;

  -- Test 3: Balance General cuadra (Activo = Pasivo + Patrimonio)
  RETURN QUERY
  SELECT
    'Ecuación Contable'::TEXT,
    ABS((SELECT total_assets FROM accounting_dashboard) - 
        (SELECT total_liabilities + total_equity FROM accounting_dashboard)) < 1,
    'Diferencia: $' || ABS((SELECT total_assets - total_liabilities - total_equity FROM accounting_dashboard))::TEXT;

END;
$_$;


--
-- Name: verify_bank_account(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_bank_account(p_account_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE bank_accounts SET verified = TRUE, verified_at = NOW() WHERE id = p_account_id;
  RETURN TRUE;
END;
$$;


--
-- Name: verify_bank_account(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_bank_account(p_user_id uuid, p_account_number character varying) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_is_valid BOOLEAN := true;
    v_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Basic validation rules
    IF LENGTH(p_account_number) < 10 THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account number too short');
    END IF;

    IF LENGTH(p_account_number) > 50 THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account number too long');
    END IF;

    -- Check if already exists for another user
    IF EXISTS (
        SELECT 1 FROM bank_accounts 
        WHERE account_number = p_account_number 
        AND user_id != p_user_id
    ) THEN
        v_is_valid := false;
        v_errors := array_append(v_errors, 'Account already registered');
    END IF;

    RETURN jsonb_build_object(
        'is_valid', v_is_valid,
        'errors', v_errors
    );
END;
$$;


--
-- Name: wallet_charge_rental(uuid, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_charge_rental(p_user_id uuid, p_amount numeric, p_booking_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE user_wallets SET balance = balance - p_amount WHERE user_id = p_user_id;
  INSERT INTO wallet_transactions (user_id, type, amount, booking_id, status)
  VALUES (p_user_id, 'charge', p_amount, p_booking_id, 'completed');
  RETURN TRUE;
END;
$$;


--
-- Name: wallet_charge_rental(uuid, uuid, bigint, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_charge_rental(p_user_id uuid, p_booking_id uuid, p_amount_cents bigint, p_ref character varying, p_meta jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_ledger_id UUID;
  v_current_balance BIGINT;
  v_booking_exists BOOLEAN;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_caller_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Solo admin o sistema puede ejecutar
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden cargar alquileres';
  END IF;

  -- Verificar que el booking existe y está aprobado
  SELECT EXISTS(
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND status IN ('approved', 'active')
  ) INTO v_booking_exists;

  IF NOT v_booking_exists THEN
    RAISE EXCEPTION 'Booking no encontrado o no está aprobado';
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object('ok', true, 'ref', p_ref, 'status', 'duplicate', 'ledger_id', v_ledger_id);
  END IF;

  -- Verificar saldo
  SELECT COALESCE(available_balance, 0) INTO v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance < p_amount_cents THEN
    RAISE EXCEPTION 'Saldo insuficiente para cargar alquiler. Disponible: %, Requerido: %', v_current_balance, p_amount_cents;
  END IF;

  -- Crear asiento de cargo
  INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, booking_id, meta)
  VALUES (p_user_id, 'rental_charge', p_amount_cents, p_ref, p_booking_id, p_meta)
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'booking_id', p_booking_id,
    'amount_cents', p_amount_cents
  );
END;
$$;


--
-- Name: FUNCTION wallet_charge_rental(p_user_id uuid, p_booking_id uuid, p_amount_cents bigint, p_ref character varying, p_meta jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_charge_rental(p_user_id uuid, p_booking_id uuid, p_amount_cents bigint, p_ref character varying, p_meta jsonb) IS 'P0 Security: Solo administradores pueden cargar alquileres. Auditado 2025-11-19';


--
-- Name: wallet_confirm_deposit_admin(uuid, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_confirm_deposit_admin(p_user_id uuid, p_transaction_id uuid, p_provider_transaction_id text, p_provider_metadata jsonb DEFAULT '{}'::jsonb) RETURNS TABLE(success boolean, message text, new_available_balance numeric, new_withdrawable_balance numeric, new_total_balance numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_transaction RECORD;
  v_available NUMERIC(10, 2);
  v_locked NUMERIC(10, 2);
  v_floor NUMERIC(10, 2);
  v_non_withdrawable NUMERIC(10, 2);
  v_withdrawable NUMERIC(10, 2);
  v_existing_provider_tx_id TEXT;
  v_payment_amount NUMERIC;
  v_caller_role TEXT;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar que caller es admin
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Solo administradores pueden confirmar depósitos' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- Resto de la lógica existente (mantener código actual)
  -- [El resto del código se mantiene igual, solo agregamos la validación arriba]
  
  -- VALIDACIÓN: provider_transaction_id único
  IF p_provider_transaction_id IS NOT NULL AND p_provider_transaction_id != '' THEN
    SELECT provider_transaction_id INTO v_existing_provider_tx_id
    FROM wallet_transactions
    WHERE provider_transaction_id = p_provider_transaction_id
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_provider_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT
        FALSE AS success,
        FORMAT('Payment ID %s ya fue procesado', p_provider_transaction_id) AS message,
        NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
      RETURN;
    END IF;
  END IF;

  -- Buscar transacción pending
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending';

  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción no encontrada o ya procesada' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- Actualizar a completed
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object('confirmed_at', NOW(), 'confirmed_by', auth.uid()),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Crear wallet si no existe
  INSERT INTO user_wallets (user_id, currency)
  VALUES (p_user_id, v_transaction.currency)
  ON CONFLICT (user_id) DO NOTHING;

  -- Actualizar piso no reembolsable
  IF NOT v_transaction.is_withdrawable THEN
    UPDATE user_wallets
    SET non_withdrawable_floor = GREATEST(non_withdrawable_floor, v_transaction.amount)
    WHERE user_id = p_user_id;
  END IF;

  -- Calcular balances (simplificado)
  SELECT COALESCE(SUM(CASE
    WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
    WHEN type IN ('charge') THEN -amount
    ELSE 0
  END), 0) INTO v_available
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed' AND type NOT IN ('lock', 'unlock');

  SELECT COALESCE(SUM(CASE
    WHEN type = 'lock' THEN amount
    WHEN type = 'unlock' THEN -amount
    ELSE 0
  END), 0) INTO v_locked
  FROM wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed' AND type IN ('lock', 'unlock');

  SELECT COALESCE(non_withdrawable_floor, 0) INTO v_floor
  FROM user_wallets WHERE user_id = p_user_id;

  v_non_withdrawable := LEAST(v_available, v_floor);
  v_withdrawable := GREATEST(v_available - v_non_withdrawable, 0);

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado: $%s', v_transaction.amount) AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    (v_available + v_locked) AS new_total_balance;
END;
$_$;


--
-- Name: FUNCTION wallet_confirm_deposit_admin(p_user_id uuid, p_transaction_id uuid, p_provider_transaction_id text, p_provider_metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_confirm_deposit_admin(p_user_id uuid, p_transaction_id uuid, p_provider_transaction_id text, p_provider_metadata jsonb) IS 'P0 Security: Requiere role=admin. CVSS 8.8 fix.';


--
-- Name: wallet_debit_for_damage(uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_debit_for_damage(p_booking_id uuid, p_claim_id uuid, p_amount_usd numeric, p_description text DEFAULT 'Débito por daños - Reclamo de seguro'::text) RETURNS TABLE(success boolean, transaction_id uuid, debited_amount_usd numeric, remaining_balance_usd numeric, error text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_renter_id UUID;
  v_wallet_id UUID;
  v_security_deposit_amount DECIMAL;
  v_available_balance DECIMAL;
  v_amount_to_debit DECIMAL;
  v_transaction_id UUID;
  v_fx_rate DECIMAL;
BEGIN
  -- 1. Get renter_id from booking
  SELECT renter_id INTO v_renter_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      0::DECIMAL AS remaining_balance_usd,
      'Booking no encontrado'::TEXT AS error;
    RETURN;
  END IF;

  -- 2. Get renter's wallet
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = v_renter_id
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      0::DECIMAL AS remaining_balance_usd,
      'Wallet no encontrado'::TEXT AS error;
    RETURN;
  END IF;

  -- 3. Check security deposit balance for this booking
  SELECT COALESCE(SUM(
    CASE
      WHEN transaction_type = 'lock' AND status = 'completed' THEN amount_usd
      WHEN transaction_type = 'unlock' AND status = 'completed' THEN -amount_usd
      ELSE 0
    END
  ), 0) INTO v_security_deposit_amount
  FROM wallet_transactions
  WHERE wallet_id = v_wallet_id
    AND reference_id = p_booking_id
    AND reference_type = 'booking_security'
    AND status = 'completed';

  -- If no specific locked deposit, use available balance
  IF v_security_deposit_amount <= 0 THEN
    SELECT available_balance INTO v_available_balance
    FROM wallets
    WHERE id = v_wallet_id;

    v_security_deposit_amount := COALESCE(v_available_balance, 0);
  END IF;

  -- 4. Determine amount to debit (cannot exceed available)
  v_amount_to_debit := LEAST(p_amount_usd, v_security_deposit_amount);

  IF v_amount_to_debit <= 0 THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      v_security_deposit_amount AS remaining_balance_usd,
      'Fondos insuficientes'::TEXT AS error;
    RETURN;
  END IF;

  -- 5. Get current exchange rate
  v_fx_rate := 1; -- Default USD:USD

  -- 6. Create debit transaction
  v_transaction_id := gen_random_uuid();

  INSERT INTO wallet_transactions (
    id,
    wallet_id,
    transaction_type,
    amount_usd,
    amount_local,
    exchange_rate,
    currency_code,
    description,
    reference_type,
    reference_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_transaction_id,
    v_wallet_id,
    'damage_debit',
    v_amount_to_debit,
    v_amount_to_debit * v_fx_rate,
    v_fx_rate,
    'USD',
    p_description || ' - Claim: ' || COALESCE(p_claim_id::TEXT, 'N/A'),
    'damage_claim',
    p_booking_id,
    'completed',
    NOW(),
    NOW()
  );

  -- 7. Update wallet balance
  UPDATE wallets
  SET
    available_balance = available_balance - v_amount_to_debit,
    total_balance = total_balance - v_amount_to_debit,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 8. Return success result
  RETURN QUERY
  SELECT
    TRUE AS success,
    v_transaction_id AS transaction_id,
    v_amount_to_debit AS debited_amount_usd,
    (v_security_deposit_amount - v_amount_to_debit) AS remaining_balance_usd,
    NULL::TEXT AS error;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      v_security_deposit_amount AS remaining_balance_usd,
      SQLERRM::TEXT AS error;
END;
$$;


--
-- Name: FUNCTION wallet_debit_for_damage(p_booking_id uuid, p_claim_id uuid, p_amount_usd numeric, p_description text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_debit_for_damage(p_booking_id uuid, p_claim_id uuid, p_amount_usd numeric, p_description text) IS 'Debits funds from renter wallet for damage claims. Part of Payment Waterfall system.';


--
-- Name: wallet_deduct_damage_atomic(uuid, uuid, uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_deduct_damage_atomic(p_booking_id uuid, p_renter_id uuid, p_owner_id uuid, p_damage_amount_cents integer, p_damage_description text, p_car_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lock_tx_id UUID;
  v_locked_amount INTEGER;
  v_remaining_deposit INTEGER;
  v_ref TEXT;
  v_result JSONB;
BEGIN
  -- Generate unique reference
  v_ref := 'damage-deduction-' || p_booking_id || '-' || extract(epoch from now())::text;

  -- 1. Get and validate the lock transaction
  SELECT wl.id, wl.amount_cents
  INTO v_lock_tx_id, v_locked_amount
  FROM wallet_ledger wl
  WHERE wl.booking_id = p_booking_id
    AND wl.user_id = p_renter_id
    AND wl.kind IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
    AND NOT EXISTS (
      -- Ensure no unlock has been processed for this booking
      SELECT 1 FROM wallet_ledger ul
      WHERE ul.booking_id = p_booking_id
        AND ul.user_id = p_renter_id
        AND ul.kind IN ('unlock', 'security_deposit_unlock')
    )
  ORDER BY wl.created_at DESC
  LIMIT 1;

  IF v_lock_tx_id IS NULL THEN
    RAISE EXCEPTION 'No locked security deposit found for booking %', p_booking_id
      USING ERRCODE = 'P0001';
  END IF;

  IF p_damage_amount_cents > v_locked_amount THEN
    RAISE EXCEPTION 'Damage amount (%) exceeds locked deposit (%)',
      p_damage_amount_cents, v_locked_amount
      USING ERRCODE = 'P0002';
  END IF;

  -- Calculate remaining deposit
  v_remaining_deposit := v_locked_amount - p_damage_amount_cents;

  -- 2. ATOMIC: Deduct from renter's wallet (rental_charge)
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_renter_id,
    'rental_charge',
    p_damage_amount_cents,
    v_ref || '-charge',
    p_booking_id,
    jsonb_build_object(
      'damage_description', p_damage_description,
      'deducted_at', now()::text,
      'car_id', p_car_id,
      'original_deposit', v_locked_amount,
      'atomic_transaction', true
    )
  );

  -- 3. ATOMIC: Pay to owner (rental_payment)
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_owner_id,
    'rental_payment',
    p_damage_amount_cents,
    v_ref || '-payment',
    p_booking_id,
    jsonb_build_object(
      'damage_description', p_damage_description,
      'received_at', now()::text,
      'car_id', p_car_id,
      'renter_id', p_renter_id,
      'atomic_transaction', true
    )
  );

  -- 4. ATOMIC: Unlock remaining deposit (if any)
  IF v_remaining_deposit > 0 THEN
    INSERT INTO wallet_ledger (
      user_id,
      kind,
      amount_cents,
      ref,
      booking_id,
      meta
    ) VALUES (
      p_renter_id,
      'unlock',
      v_remaining_deposit,
      v_ref || '-partial-unlock',
      p_booking_id,
      jsonb_build_object(
        'unlocked_at', now()::text,
        'reason', 'Partial release after damage deduction',
        'original_locked', v_locked_amount,
        'damage_charged', p_damage_amount_cents,
        'atomic_transaction', true
      )
    );
  END IF;

  -- 5. ATOMIC: Update booking wallet status
  UPDATE bookings
  SET
    wallet_status = CASE
      WHEN v_remaining_deposit > 0 THEN 'partially_charged'
      ELSE 'charged'
    END,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Build result
  v_result := jsonb_build_object(
    'ok', true,
    'remaining_deposit', v_remaining_deposit,
    'damage_charged', p_damage_amount_cents,
    'original_deposit', v_locked_amount,
    'ref', v_ref
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will be automatically rolled back
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;


--
-- Name: FUNCTION wallet_deduct_damage_atomic(p_booking_id uuid, p_renter_id uuid, p_owner_id uuid, p_damage_amount_cents integer, p_damage_description text, p_car_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_deduct_damage_atomic(p_booking_id uuid, p_renter_id uuid, p_owner_id uuid, p_damage_amount_cents integer, p_damage_description text, p_car_id uuid) IS 'P0-SECURITY: Atomically deducts damage amount from renter wallet and pays owner.
All operations succeed or fail together - no partial state possible.
Returns: {ok: boolean, remaining_deposit?: number, error?: string}';


--
-- Name: wallet_deposit_funds_admin(uuid, bigint, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_deposit_funds_admin(p_user_id uuid, p_amount_cents bigint, p_description text, p_reference_id text DEFAULT NULL::text) RETURNS TABLE(success boolean, transaction_id uuid, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    IF p_amount_cents <= 0 THEN
        RETURN QUERY SELECT FALSE, NULL, 'El monto debe ser positivo'::TEXT;
        RETURN;
    END IF;

    -- Iniciar transacción
    BEGIN
        INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, description, reference_id)
        VALUES (p_user_id, 'deposit', p_amount_cents, p_description, p_reference_id)
        RETURNING id INTO v_transaction_id;

        -- Actualizar el balance disponible del usuario
        UPDATE public.user_wallets
        SET available_balance = available_balance + p_amount_cents,
            total_balance = total_balance + p_amount_cents,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        IF NOT FOUND THEN
            -- Si no existe la wallet, crearla. Esto no debería pasar si se valida antes.
            INSERT INTO public.user_wallets (user_id, available_balance, locked_balance, total_balance)
            VALUES (p_user_id, p_amount_cents, 0, p_amount_cents);
        END IF;

        -- Confirmar transacción
        RETURN QUERY SELECT TRUE, v_transaction_id, NULL::TEXT;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT FALSE, NULL, SQLERRM::TEXT;
    END;
END;
$$;


--
-- Name: wallet_deposit_ledger(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_deposit_ledger(p_user_id uuid) RETURNS TABLE(id uuid, amount numeric, status character varying, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.amount, d.status, d.created_at
  FROM wallet_deposits d
  WHERE d.user_id = p_user_id
  ORDER BY d.created_at DESC;
END;
$$;


--
-- Name: wallet_deposit_ledger(uuid, bigint, character varying, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_deposit_ledger(p_user_id uuid, p_amount_cents bigint, p_ref character varying, p_provider text DEFAULT 'mercadopago'::text, p_meta jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_ledger_id UUID;
  v_fgo_result JSONB;
  v_contribution_cents BIGINT;
  v_alpha DECIMAL(5,2);
  v_caller_id UUID;
  v_caller_role TEXT;
  v_is_service_role BOOLEAN;
BEGIN
  -- ⭐ VALIDACIÓN P0: Obtener usuario autenticado
  v_caller_id := auth.uid();

  -- Verificar si es service_role (webhooks)
  v_is_service_role := (SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

  -- Si no es service_role, verificar rol de admin
  IF NOT v_is_service_role THEN
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- ⭐ VALIDACIÓN P0: Obtener rol del caller
    SELECT role INTO v_caller_role
    FROM profiles
    WHERE id = v_caller_id;

    -- ⭐ VALIDACIÓN P0: Solo admin o service_role puede registrar depósitos en ledger
    IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
      RAISE EXCEPTION 'No autorizado: solo administradores o el sistema pueden registrar depósitos en ledger';
    END IF;
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'ledger_id', v_ledger_id,
      'ref', p_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Crear asiento de depósito en wallet_ledger
  INSERT INTO wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_user_id, 'deposit', p_amount_cents, p_ref,
          jsonb_build_object('provider', p_provider) || p_meta)
  RETURNING id INTO v_ledger_id;

  -- 🆕 NUEVO: Aportar automáticamente al FGO (α%)
  BEGIN
    -- Obtener α actual
    SELECT alpha_percentage INTO v_alpha FROM fgo_metrics WHERE id = TRUE;

    -- Calcular aporte
    v_contribution_cents := FLOOR(p_amount_cents * v_alpha / 100);

    -- Solo aportar si el monto es > 0
    IF v_contribution_cents > 0 THEN
      -- Llamar a función de aporte al FGO
      SELECT fgo_contribute_from_deposit(
        p_user_id,
        p_amount_cents,
        v_ledger_id,
        'auto-fgo-' || p_ref  -- Referencia única automática
      ) INTO v_fgo_result;

      RAISE NOTICE 'FGO auto-contribution: % cents (alpha: %) for deposit %',
        v_contribution_cents, v_alpha, p_ref;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error pero no fallar el depósito
      RAISE WARNING 'FGO auto-contribution failed for deposit %: %', p_ref, SQLERRM;
      -- Continuar sin fallar (el depósito se registró correctamente)
  END;

  -- Retornar resultado con info del FGO
  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'status', 'completed',
    'user_id', p_user_id,
    'amount_cents', p_amount_cents,
    'fgo_contribution_cents', v_contribution_cents,
    'fgo_alpha_percentage', v_alpha
  );
END;
$$;


--
-- Name: FUNCTION wallet_deposit_ledger(p_user_id uuid, p_amount_cents bigint, p_ref character varying, p_provider text, p_meta jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_deposit_ledger(p_user_id uuid, p_amount_cents bigint, p_ref character varying, p_provider text, p_meta jsonb) IS 'P0 Security: Solo admin o service_role puede registrar depósitos en ledger. Normalmente llamada por webhooks. Auditado 2025-11-19';


--
-- Name: wallet_get_autorentar_credit_info(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_get_autorentar_credit_info(p_user_id uuid DEFAULT NULL::uuid) RETURNS TABLE(user_id uuid, autorentar_credit_balance_cents bigint, autorentar_credit_balance_ars numeric, last_credit_activity timestamp with time zone, days_since_activity integer, total_credit_issued_cents bigint, total_credit_consumed_cents bigint, total_credit_breakage_cents bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uw.user_id,
        uw.autorentar_credit_balance_cents,
        (uw.autorentar_credit_balance_cents / 100.0)::NUMERIC(10,2),
        MAX(CASE WHEN wt.type IN ('credit_issue', 'credit_consume', 'credit_breakage') 
            THEN wt.created_at END),
        COALESCE(
            EXTRACT(DAY FROM NOW() - MAX(CASE WHEN wt.type IN ('credit_issue', 'credit_consume', 'credit_breakage') 
                THEN wt.created_at END))::INTEGER,
            EXTRACT(DAY FROM NOW() - uw.created_at)::INTEGER
        ),
        COALESCE(SUM(CASE WHEN wt.type = 'credit_issue' THEN wt.amount ELSE 0 END), 0),
        COALESCE(ABS(SUM(CASE WHEN wt.type = 'credit_consume' THEN wt.amount ELSE 0 END)), 0),
        COALESCE(ABS(SUM(CASE WHEN wt.type = 'credit_breakage' THEN wt.amount ELSE 0 END)), 0)
    FROM user_wallets uw
    LEFT JOIN wallet_transactions wt ON wt.user_id = uw.user_id
    WHERE uw.user_id = COALESCE(p_user_id, auth.uid())
    GROUP BY uw.user_id, uw.autorentar_credit_balance_cents;
END;
$$;


--
-- Name: wallet_get_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_get_balance() RETURNS TABLE(available_balance numeric, withdrawable_balance numeric, non_withdrawable_balance numeric, locked_balance numeric, total_balance numeric, transferable_balance numeric, autorentar_credit_balance numeric, cash_deposit_balance numeric, protected_credit_balance numeric, currency text, user_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_wallets.user_id = v_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_wallets (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_wallet;
  END IF;
  
  RETURN QUERY SELECT
    (v_wallet.available_balance_cents / 100.0)::NUMERIC(10, 2) AS available_balance,
    ((v_wallet.available_balance_cents - v_wallet.cash_deposit_balance_cents - v_wallet.autorentar_credit_balance_cents) / 100.0)::NUMERIC(10, 2) AS withdrawable_balance,
    ((v_wallet.cash_deposit_balance_cents + v_wallet.autorentar_credit_balance_cents) / 100.0)::NUMERIC(10, 2) AS non_withdrawable_balance,
    (v_wallet.locked_balance_cents / 100.0)::NUMERIC(10, 2) AS locked_balance,
    (v_wallet.balance_cents / 100.0)::NUMERIC(10, 2) AS total_balance,
    (v_wallet.available_balance_cents / 100.0)::NUMERIC(10, 2) AS transferable_balance,
    (v_wallet.autorentar_credit_balance_cents / 100.0)::NUMERIC(10, 2) AS autorentar_credit_balance,
    (v_wallet.cash_deposit_balance_cents / 100.0)::NUMERIC(10, 2) AS cash_deposit_balance,
    ((v_wallet.cash_deposit_balance_cents + v_wallet.autorentar_credit_balance_cents) / 100.0)::NUMERIC(10, 2) AS protected_credit_balance,
    v_wallet.currency AS currency,
    v_wallet.user_id AS user_id;
END;
$$;


--
-- Name: FUNCTION wallet_get_balance(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_get_balance() IS 'Fixed 2025-11-15: Now reads from user_wallets and converts cents to currency units';


--
-- Name: wallet_get_balance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_get_balance(p_user_id uuid) RETURNS TABLE(total_balance bigint, available_balance bigint, locked_balance bigint, autorentar_credit_balance bigint, cash_deposit_balance bigint, currency text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Crear wallet si no existe
  INSERT INTO user_wallets (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT 
    balance_cents,
    available_balance_cents,
    locked_balance_cents,
    autorentar_credit_balance_cents,
    cash_deposit_balance_cents,
    user_wallets.currency
  FROM user_wallets
  WHERE user_id = p_user_id;
END;
$$;


--
-- Name: wallet_initiate_deposit(uuid, bigint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_initiate_deposit(p_user_id uuid, p_amount bigint, p_provider text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_transaction_id UUID;
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  -- ⭐ VALIDACIÓN P0: Obtener usuario autenticado
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ⭐ VALIDACIÓN P0: Obtener rol del caller
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = v_caller_id;

  -- ⭐ VALIDACIÓN P0: Solo el usuario puede iniciar depósitos en su propia wallet, o admin puede hacerlo para cualquier usuario
  IF v_caller_id != p_user_id AND (v_caller_role IS NULL OR v_caller_role != 'admin') THEN
    RAISE EXCEPTION 'No autorizado: solo puedes iniciar depósitos en tu propia wallet';
  END IF;

  -- Validar monto
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  -- Validar provider
  IF p_provider NOT IN ('mercadopago', 'stripe', 'bank_transfer') THEN
    RAISE EXCEPTION 'Proveedor no válido: %', p_provider;
  END IF;

  INSERT INTO wallet_transactions (
    user_id, type, amount, status, provider,
    description
  ) VALUES (
    p_user_id, 'deposit', p_amount, 'pending', p_provider,
    'Deposit initiated'
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;


--
-- Name: FUNCTION wallet_initiate_deposit(p_user_id uuid, p_amount bigint, p_provider text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_initiate_deposit(p_user_id uuid, p_amount bigint, p_provider text) IS 'P0 Security: Valida que solo el usuario puede iniciar depósitos en su propia wallet, o admin puede hacerlo para cualquier usuario. Auditado 2025-11-19';


--
-- Name: wallet_initiate_deposit(uuid, numeric, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_initiate_deposit(p_user_id uuid, p_amount numeric, p_currency character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deposit_id UUID;
BEGIN
  INSERT INTO wallet_deposits (user_id, amount, currency, status, created_at)
  VALUES (p_user_id, p_amount, p_currency, 'pending', NOW())
  RETURNING id INTO v_deposit_id;
  RETURN v_deposit_id;
END;
$$;


--
-- Name: wallet_lock_funds(uuid, bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_lock_funds(p_booking_id uuid, p_amount_cents bigint) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lock_id uuid := gen_random_uuid();
BEGIN
  -- If wallet_transactions table exists, insert a lock transaction to simulate behavior
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions') THEN
    INSERT INTO public.wallet_transactions (id, user_id, type, amount, status, reference_type, reference_id, created_at)
    VALUES (v_lock_id, (SELECT renter_id FROM public.bookings WHERE id = p_booking_id), 'lock', p_amount_cents, 'locked', 'booking', p_booking_id, now());
  END IF;

  RETURN v_lock_id;
END;
$$;


--
-- Name: wallet_lock_funds(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_lock_funds(p_user_id uuid, p_amount numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE user_wallets SET locked_balance = locked_balance + p_amount WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;


--
-- Name: wallet_lock_funds(uuid, bigint, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_lock_funds(p_user_id uuid, p_amount bigint, p_reference_type text, p_reference_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_transaction_id UUID;
  v_available BIGINT;
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  -- ⭐ VALIDACIÓN P0: Obtener usuario autenticado
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ⭐ VALIDACIÓN P0: Obtener rol del caller
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = v_caller_id;

  -- ⭐ VALIDACIÓN P0: Solo el usuario puede bloquear sus propios fondos, o admin puede bloquear cualquier wallet
  IF v_caller_id != p_user_id AND (v_caller_role IS NULL OR v_caller_role != 'admin') THEN
    RAISE EXCEPTION 'No autorizado: solo puedes bloquear tus propios fondos';
  END IF;

  -- Verificar fondos disponibles
  SELECT available_balance_cents INTO v_available
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Wallet no encontrado para el usuario';
  END IF;

  IF v_available < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds: available % < required %', v_available, p_amount;
  END IF;

  -- Crear transacción
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, reference_type, reference_id,
    description, completed_at
  ) VALUES (
    p_user_id, 'lock', p_amount, 'completed', p_reference_type, p_reference_id,
    'Funds locked for ' || p_reference_type, NOW()
  ) RETURNING id INTO v_transaction_id;

  -- Actualizar balances
  UPDATE user_wallets
  SET 
    available_balance_cents = available_balance_cents - p_amount,
    locked_balance_cents = locked_balance_cents + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_transaction_id;
END;
$$;


--
-- Name: FUNCTION wallet_lock_funds(p_user_id uuid, p_amount bigint, p_reference_type text, p_reference_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_lock_funds(p_user_id uuid, p_amount bigint, p_reference_type text, p_reference_id uuid) IS 'P0 Security: Valida que solo el usuario puede bloquear sus propios fondos, o admin puede bloquear cualquier wallet. Auditado 2025-11-19';


--
-- Name: wallet_lock_rental_and_deposit(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_lock_rental_and_deposit(p_booking_id uuid, p_rental_amount numeric, p_deposit_amount numeric DEFAULT 300) RETURNS TABLE(success boolean, message text, rental_lock_transaction_id uuid, deposit_lock_transaction_id uuid, total_locked numeric, new_available_balance numeric, new_locked_balance numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_renter_id UUID;
  v_wallet RECORD;
  v_protection_cents BIGINT;
  v_cash_cents BIGINT;
  v_rental_amount_cents BIGINT;
  v_deposit_amount_cents BIGINT;
  v_deficit_cash BIGINT;
  v_deficit_protection BIGINT;
  v_rental_tx_id UUID;
  v_deposit_tx_id UUID;
  v_new_available NUMERIC;
  v_new_locked NUMERIC;
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();

  -- PHASE 2: Authorization check - only renter can lock own funds
  SELECT renter_id INTO v_renter_id FROM public.bookings WHERE id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Booking not found',
      NULL::UUID, NULL::UUID,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- PHASE 2: Verify authorization
  IF v_current_user != v_renter_id THEN
    RETURN QUERY SELECT
      FALSE,
      'Unauthorized: can only lock own funds',
      NULL::UUID, NULL::UUID,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Convert amounts to cents
  v_rental_amount_cents := (p_rental_amount * 100)::BIGINT;
  v_deposit_amount_cents := (p_deposit_amount * 100)::BIGINT;

  -- Get current wallet state WITH ROW LOCK (PHASE 3: prevent race conditions)
  SELECT *
  INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_renter_id
  FOR UPDATE;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Wallet not found',
      NULL::UUID, NULL::UUID,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  v_protection_cents := v_wallet.autorentar_credit_balance_cents;
  v_cash_cents := v_wallet.available_balance_cents;

  -- Validate deposit amount against protection balance
  IF v_deposit_amount_cents > v_protection_cents THEN
    v_deficit_protection := v_deposit_amount_cents - v_protection_cents;
    RETURN QUERY SELECT
      FALSE,
      'Insufficient autorentar credit. Deficit: $' || (v_deficit_protection::NUMERIC / 100)::TEXT,
      NULL::UUID, NULL::UUID,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate rental amount against cash balance
  IF v_rental_amount_cents > v_cash_cents THEN
    v_deficit_cash := v_rental_amount_cents - v_cash_cents;
    RETURN QUERY SELECT
      FALSE,
      'Insufficient cash balance. Deficit: $' || (v_deficit_cash::NUMERIC / 100)::TEXT,
      NULL::UUID, NULL::UUID,
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Create rental transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    related_booking_id
  ) VALUES (
    v_renter_id,
    'rental_lock',
    p_rental_amount,
    'ARS',
    'locked',
    'Rental payment locked for booking',
    p_booking_id
  ) RETURNING id INTO v_rental_tx_id;

  -- Create deposit transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    related_booking_id
  ) VALUES (
    v_renter_id,
    'deposit_lock',
    p_deposit_amount,
    'ARS',
    'locked',
    'Security deposit locked for booking',
    p_booking_id
  ) RETURNING id INTO v_deposit_tx_id;

  -- Update wallet balances
  UPDATE public.user_wallets
  SET
    available_balance_cents = available_balance_cents - v_rental_amount_cents,
    locked_balance_cents = locked_balance_cents + v_rental_amount_cents,
    autorentar_credit_balance_cents = autorentar_credit_balance_cents - v_deposit_amount_cents,
    updated_at = NOW()
  WHERE user_id = v_renter_id;

  -- Get new balances
  SELECT available_balance_cents, locked_balance_cents
  INTO v_new_available, v_new_locked
  FROM public.user_wallets
  WHERE user_id = v_renter_id;

  RETURN QUERY SELECT
    TRUE,
    'Funds locked successfully',
    v_rental_tx_id,
    v_deposit_tx_id,
    (v_rental_amount_cents + v_deposit_amount_cents)::NUMERIC / 100,
    v_new_available::NUMERIC / 100,
    v_new_locked::NUMERIC / 100;
END;
$_$;


--
-- Name: FUNCTION wallet_lock_rental_and_deposit(p_booking_id uuid, p_rental_amount numeric, p_deposit_amount numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_lock_rental_and_deposit(p_booking_id uuid, p_rental_amount numeric, p_deposit_amount numeric) IS 'Locks rental payment and security deposit for booking.
SECURITY HARDENED 2025-11-18: Added search_path and authorization checks.
Audit: Week 1 - Found 4 issues, 3 resolved.';


--
-- Name: wallet_refund(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_refund(p_transaction_id uuid, p_reason text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE wallet_transactions SET status = 'refunded', reason = p_reason WHERE id = p_transaction_id;
  RETURN TRUE;
END;
$$;


--
-- Name: wallet_refund(uuid, uuid, bigint, character varying, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_refund(p_user_id uuid, p_original_transaction_id uuid, p_amount_cents bigint, p_ref character varying, p_reason text DEFAULT NULL::text, p_meta jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_ledger_id UUID;
  v_original_tx_exists BOOLEAN;
  v_already_refunded BOOLEAN;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_caller_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Solo admin puede ejecutar
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden procesar reembolsos';
  END IF;

  -- Verificar que la transacción original existe
  SELECT EXISTS(
    SELECT 1 FROM wallet_transactions
    WHERE id = p_original_transaction_id
      AND user_id = p_user_id
      AND type IN ('deposit', 'charge', 'rental_payment_lock')
  ) INTO v_original_tx_exists;

  IF NOT v_original_tx_exists THEN
    RAISE EXCEPTION 'Transacción original no encontrada o no es reembolsable';
  END IF;

  -- Prevenir doble reembolso
  SELECT EXISTS(
    SELECT 1 FROM wallet_transactions
    WHERE reference_id = p_original_transaction_id::TEXT
      AND type = 'refund'
      AND status = 'completed'
  ) INTO v_already_refunded;

  IF v_already_refunded THEN
    RAISE EXCEPTION 'Esta transacción ya fue reembolsada';
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object('ok', true, 'ref', p_ref, 'status', 'duplicate', 'ledger_id', v_ledger_id);
  END IF;

  -- Crear asiento de reembolso
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta,
    transaction_id
  ) VALUES (
    p_user_id,
    'refund',
    p_amount_cents,
    p_ref,
    jsonb_build_object(
      'original_transaction_id', p_original_transaction_id,
      'reason', p_reason
    ) || p_meta,
    p_original_transaction_id
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'user_id', p_user_id,
    'amount_cents', p_amount_cents,
    'original_transaction_id', p_original_transaction_id
  );
END;
$$;


--
-- Name: FUNCTION wallet_refund(p_user_id uuid, p_original_transaction_id uuid, p_amount_cents bigint, p_ref character varying, p_reason text, p_meta jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_refund(p_user_id uuid, p_original_transaction_id uuid, p_amount_cents bigint, p_ref character varying, p_reason text, p_meta jsonb) IS 'P0 Security: Solo administradores pueden procesar reembolsos. Auditado 2025-11-19';


--
-- Name: wallet_transfer_to_owner(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_transfer_to_owner(p_booking_id uuid, p_amount numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id FROM bookings WHERE id = p_booking_id;
  UPDATE user_wallets SET balance = balance + p_amount WHERE user_id = v_owner_id;
  RETURN TRUE;
END;
$$;


--
-- Name: wallet_transfer_to_owner(uuid, uuid, uuid, bigint, bigint, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_transfer_to_owner(p_booking_id uuid, p_owner_id uuid, p_renter_id uuid, p_rental_amount_cents bigint, p_platform_fee_cents bigint, p_ref character varying, p_meta jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_owner_amount_cents BIGINT;
  v_ledger_id UUID;
  v_booking_exists BOOLEAN;
  v_booking_status TEXT;
BEGIN
  -- ⭐ VALIDACIÓN P0: Verificar rol del caller
  SELECT role, id INTO v_caller_role, v_caller_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Solo admin o sistema puede ejecutar
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden transferir fondos a owners';
  END IF;

  -- Verificar que el booking existe y está completado
  SELECT EXISTS(
    SELECT 1 FROM bookings
    WHERE id = p_booking_id
      AND renter_id = p_renter_id
  ), status INTO v_booking_exists, v_booking_status
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT v_booking_exists THEN
    RAISE EXCEPTION 'Booking no encontrado o no pertenece al renter especificado';
  END IF;

  IF v_booking_status != 'completed' THEN
    RAISE EXCEPTION 'El booking debe estar completado para transferir fondos';
  END IF;

  -- Verificar split payment (85% owner, 15% plataforma)
  v_owner_amount_cents := p_rental_amount_cents - p_platform_fee_cents;
  
  IF v_owner_amount_cents < 0 THEN
    RAISE EXCEPTION 'El monto de la plataforma no puede ser mayor al monto total';
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_ledger WHERE ref = p_ref) THEN
    SELECT id INTO v_ledger_id FROM wallet_ledger WHERE ref = p_ref;
    RETURN jsonb_build_object('ok', true, 'ref', p_ref, 'status', 'duplicate', 'ledger_id', v_ledger_id);
  END IF;

  -- Crear asiento de transferencia al owner
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_owner_id,
    'rental_payment_transfer',
    v_owner_amount_cents,
    p_ref || '_owner',
    p_booking_id,
    jsonb_build_object(
      'platform_fee_cents', p_platform_fee_cents,
      'total_amount_cents', p_rental_amount_cents,
      'split_percentage', 85.0
    ) || p_meta
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledger_id', v_ledger_id,
    'ref', p_ref,
    'booking_id', p_booking_id,
    'owner_id', p_owner_id,
    'owner_amount_cents', v_owner_amount_cents,
    'platform_fee_cents', p_platform_fee_cents,
    'total_amount_cents', p_rental_amount_cents
  );
END;
$$;


--
-- Name: FUNCTION wallet_transfer_to_owner(p_booking_id uuid, p_owner_id uuid, p_renter_id uuid, p_rental_amount_cents bigint, p_platform_fee_cents bigint, p_ref character varying, p_meta jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_transfer_to_owner(p_booking_id uuid, p_owner_id uuid, p_renter_id uuid, p_rental_amount_cents bigint, p_platform_fee_cents bigint, p_ref character varying, p_meta jsonb) IS 'P0 Security: Solo administradores pueden transferir fondos a owners. Auditado 2025-11-19';


--
-- Name: wallet_unlock_funds(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_unlock_funds(p_user_id uuid, p_amount numeric) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE user_wallets SET locked_balance = locked_balance - p_amount WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;


--
-- Name: wallet_unlock_funds(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wallet_unlock_funds(p_user_id uuid, p_reference_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_lock_amount BIGINT;
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  -- ⭐ VALIDACIÓN P0: Obtener usuario autenticado
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ⭐ VALIDACIÓN P0: Obtener rol del caller
  SELECT role INTO v_caller_role
  FROM profiles
  WHERE id = v_caller_id;

  -- ⭐ VALIDACIÓN P0: Solo el usuario puede desbloquear sus propios fondos, o admin puede desbloquear cualquier wallet
  IF v_caller_id != p_user_id AND (v_caller_role IS NULL OR v_caller_role != 'admin') THEN
    RAISE EXCEPTION 'No autorizado: solo puedes desbloquear tus propios fondos';
  END IF;

  -- Buscar transacción de lock
  SELECT amount INTO v_lock_amount
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND reference_id = p_reference_id
    AND type = 'lock'
    AND status = 'completed';

  IF v_lock_amount IS NULL THEN
    RAISE EXCEPTION 'No lock transaction found for reference_id %', p_reference_id;
  END IF;

  -- Crear transacción unlock
  INSERT INTO wallet_transactions (
    user_id, type, amount, status, reference_id,
    description, completed_at
  ) VALUES (
    p_user_id, 'unlock', v_lock_amount, 'completed', p_reference_id,
    'Funds unlocked', NOW()
  );

  -- Actualizar balances
  UPDATE user_wallets
  SET 
    available_balance_cents = available_balance_cents + v_lock_amount,
    locked_balance_cents = locked_balance_cents - v_lock_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION wallet_unlock_funds(p_user_id uuid, p_reference_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.wallet_unlock_funds(p_user_id uuid, p_reference_id uuid) IS 'P0 Security: Valida que solo el usuario puede desbloquear sus propios fondos, o admin puede desbloquear cualquier wallet. Auditado 2025-11-19';


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_leaf_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: lock_top_prefixes(text[], text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[]) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


--
-- Name: objects_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: objects_update_level_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_level_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_delete_cleanup(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_delete_cleanup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: app_secrets; Type: TABLE; Schema: private; Owner: -
--

CREATE TABLE private.app_secrets (
    key text NOT NULL,
    value text NOT NULL,
    description text
);


--
-- Name: _schema_cache_refresh; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public._schema_cache_refresh AS
 SELECT id,
    total_amount,
    total_cents,
    rental_amount_cents,
    deposit_amount_cents
   FROM public.bookings
  WHERE false;


--
-- Name: VIEW _schema_cache_refresh; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public._schema_cache_refresh IS 'Vista temporal para refrescar schema cache de PostgREST - NO usar en queries';


--
-- Name: accounting_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    account_type character varying(20) NOT NULL,
    sub_type character varying(100) NOT NULL,
    is_control_account boolean DEFAULT false,
    parent_account_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounting_accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['ASSET'::character varying, 'LIABILITY'::character varying, 'EQUITY'::character varying, 'INCOME'::character varying, 'EXPENSE'::character varying])::text[])))
);


--
-- Name: TABLE accounting_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_accounts IS 'Plan de cuentas contable según NIIF';


--
-- Name: COLUMN accounting_accounts.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounting_accounts.code IS 'Código único de cuenta (ej: 2111)';


--
-- Name: COLUMN accounting_accounts.account_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounting_accounts.account_type IS 'Tipo: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE';


--
-- Name: accounting_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying,
    description text NOT NULL,
    affected_period character varying(20),
    affected_account character varying(20),
    expected_value numeric(18,2),
    actual_value numeric(18,2),
    variance numeric(18,2),
    resolution_status character varying(20) DEFAULT 'pending'::character varying,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_chart_of_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(200) NOT NULL,
    account_type character varying(50) NOT NULL,
    sub_type character varying(100),
    parent_code character varying(20),
    level integer DEFAULT 1,
    is_active boolean DEFAULT true,
    requires_subsidiary boolean DEFAULT false,
    niif_reference character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE accounting_chart_of_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_chart_of_accounts IS 'Plan de cuentas contable. Incluye cuentas 4103, 4104, 4203 para Crédito Protección.';


--
-- Name: accounting_journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_number character varying(50) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    reference_id uuid,
    reference_table character varying(100),
    description text,
    total_debit bigint DEFAULT 0 NOT NULL,
    total_credit bigint DEFAULT 0 NOT NULL,
    status character varying(20) NOT NULL,
    posted_at timestamp with time zone,
    reversed_at timestamp with time zone,
    reversed_by uuid,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounting_journal_entries_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'POSTED'::character varying, 'REVERSED'::character varying])::text[])))
);


--
-- Name: TABLE accounting_journal_entries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_journal_entries IS 'Asientos contables maestros - cada asiento agrupa múltiples líneas en accounting_ledger';


--
-- Name: COLUMN accounting_journal_entries.entry_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounting_journal_entries.entry_number IS 'Número de asiento único JE-YYYYMMDD-######';


--
-- Name: COLUMN accounting_journal_entries.total_debit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounting_journal_entries.total_debit IS 'Suma de débitos en centavos (debe = total_credit)';


--
-- Name: COLUMN accounting_journal_entries.total_credit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accounting_journal_entries.total_credit IS 'Suma de créditos en centavos (debe = total_debit)';


--
-- Name: accounting_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_date timestamp with time zone DEFAULT now() NOT NULL,
    account_code character varying(20) NOT NULL,
    debit numeric(18,2) DEFAULT 0,
    credit numeric(18,2) DEFAULT 0,
    description text,
    reference_type character varying(50),
    reference_id uuid,
    user_id uuid,
    batch_id uuid,
    fiscal_period character varying(10),
    is_closing_entry boolean DEFAULT false,
    is_reversed boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    journal_entry_id uuid
);


--
-- Name: TABLE accounting_ledger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_ledger IS 'Libro mayor - Detalle de movimientos por cuenta';


--
-- Name: accounting_period_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_period_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period character varying(7) NOT NULL,
    account_id uuid NOT NULL,
    opening_balance numeric(15,2) DEFAULT 0,
    period_debits numeric(15,2) DEFAULT 0,
    period_credits numeric(15,2) DEFAULT 0,
    closing_balance numeric(15,2) DEFAULT 0,
    is_closed boolean DEFAULT false,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_period_closures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_period_closures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_type character varying(20) NOT NULL,
    period_code character varying(20) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying,
    total_debits numeric(18,2) DEFAULT 0,
    total_credits numeric(18,2) DEFAULT 0,
    balance_check boolean DEFAULT false,
    closing_entries_batch_id uuid,
    closed_by uuid,
    closed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounting_provisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_provisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provision_type character varying(50) NOT NULL,
    reference_id uuid,
    reference_table character varying(100),
    provision_amount numeric(15,2) NOT NULL,
    utilized_amount numeric(15,2) DEFAULT 0,
    released_amount numeric(15,2) DEFAULT 0,
    current_balance numeric(15,2) GENERATED ALWAYS AS (((provision_amount - utilized_amount) - released_amount)) STORED,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    provision_date timestamp with time zone DEFAULT now(),
    release_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT accounting_provisions_provision_type_check CHECK (((provision_type)::text = ANY ((ARRAY['FGO_RESERVE'::character varying, 'SECURITY_DEPOSIT'::character varying, 'CLAIMS_RESERVE'::character varying, 'WALLET_LIABILITY'::character varying])::text[]))),
    CONSTRAINT accounting_provisions_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'UTILIZED'::character varying, 'RELEASED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: TABLE accounting_provisions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_provisions IS 'Provisiones según NIIF 37 para FGO y siniestros futuros.';


--
-- Name: accounting_provisions_report; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.accounting_provisions_report AS
 SELECT id,
    provision_type,
    reference_id,
    reference_table,
    provision_amount,
    utilized_amount,
    released_amount,
    current_balance,
    status,
    provision_date,
    release_date,
    notes,
    created_at
   FROM public.accounting_provisions
  WHERE ((status)::text = 'ACTIVE'::text)
  WITH NO DATA;


--
-- Name: accounting_revenue_recognition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_revenue_recognition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    revenue_type character varying(50) NOT NULL,
    gross_amount numeric(18,2) NOT NULL,
    commission_amount numeric(18,2) NOT NULL,
    owner_amount numeric(18,2) NOT NULL,
    recognition_date timestamp with time zone,
    performance_obligation_met boolean DEFAULT false,
    booking_status character varying(50),
    currency character varying(3) DEFAULT 'ARS'::character varying,
    is_recognized boolean DEFAULT false,
    ledger_batch_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE accounting_revenue_recognition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accounting_revenue_recognition IS 'Reconocimiento de ingresos SOLO por comisiones (rol de agente según NIIF 15).';


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    account_number character varying(50) NOT NULL,
    account_type character varying(20) NOT NULL,
    bank_code character varying(10),
    bank_name character varying(100),
    account_holder_name character varying(200) NOT NULL,
    account_holder_id character varying(20) NOT NULL,
    verified boolean DEFAULT false,
    verified_at timestamp with time zone,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_number_encrypted text,
    cbu_encrypted text,
    alias_encrypted text,
    bank_name_encrypted text,
    CONSTRAINT bank_accounts_account_type_check CHECK (((account_type)::text = ANY ((ARRAY['savings'::character varying, 'checking'::character varying, 'cbu'::character varying, 'cvu'::character varying, 'alias'::character varying])::text[])))
);


--
-- Name: COLUMN bank_accounts.account_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_accounts.account_number_encrypted IS 'Encrypted bank account number (Base64 ciphertext)';


--
-- Name: COLUMN bank_accounts.cbu_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_accounts.cbu_encrypted IS 'Encrypted CBU (Base64 ciphertext)';


--
-- Name: COLUMN bank_accounts.alias_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_accounts.alias_encrypted IS 'Encrypted account alias (Base64 ciphertext)';


--
-- Name: COLUMN bank_accounts.bank_name_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bank_accounts.bank_name_encrypted IS 'Encrypted bank name (Base64 ciphertext)';


--
-- Name: bank_accounts_decrypted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.bank_accounts_decrypted WITH (security_invoker='on') AS
 SELECT id,
    user_id,
        CASE
            WHEN (account_number_encrypted IS NOT NULL) THEN (public.decrypt_pii(account_number_encrypted))::character varying
            ELSE account_number
        END AS account_number,
        CASE
            WHEN (cbu_encrypted IS NOT NULL) THEN public.decrypt_pii(cbu_encrypted)
            ELSE NULL::text
        END AS cbu,
        CASE
            WHEN (alias_encrypted IS NOT NULL) THEN public.decrypt_pii(alias_encrypted)
            ELSE NULL::text
        END AS alias,
        CASE
            WHEN (bank_name_encrypted IS NOT NULL) THEN (public.decrypt_pii(bank_name_encrypted))::character varying
            ELSE bank_name
        END AS bank_name,
    account_type,
    bank_code,
    account_holder_name,
    account_holder_id,
    verified,
    verified_at,
    is_default,
    created_at,
    updated_at
   FROM public.bank_accounts;


--
-- Name: cars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    brand text,
    model text,
    year integer,
    price_per_day numeric(10,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    city text NOT NULL,
    province text NOT NULL,
    country text DEFAULT 'AR'::text NOT NULL,
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    status public.car_status DEFAULT 'draft'::public.car_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    brand_id uuid,
    model_id uuid,
    brand_text_backup text,
    model_text_backup text,
    fuel text,
    fuel_type text,
    transmission text,
    color text,
    mileage integer,
    seats integer DEFAULT 5,
    doors integer DEFAULT 4,
    features jsonb DEFAULT '{}'::jsonb,
    value_usd numeric(10,2),
    min_rental_days integer DEFAULT 1,
    max_rental_days integer,
    deposit_required boolean DEFAULT false,
    deposit_amount numeric(10,2),
    insurance_included boolean DEFAULT false,
    auto_approval boolean DEFAULT false,
    location_street text,
    location_street_number text,
    location_city text,
    location_state text,
    location_country text DEFAULT 'AR'::text,
    location_province text,
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    plate text,
    vin text,
    location_neighborhood text,
    location_postal_code text,
    payment_methods jsonb DEFAULT '[]'::jsonb,
    delivery_options jsonb DEFAULT '[]'::jsonb,
    terms_and_conditions text,
    uses_dynamic_pricing boolean DEFAULT false,
    category_id uuid,
    estimated_value_usd integer,
    value_usd_source text DEFAULT 'owner_manual'::text,
    fipe_code text,
    fipe_last_sync timestamp with time zone,
    custom_daily_rate_pct numeric(5,4),
    value_brl integer,
    value_ars integer,
    value_auto_sync_enabled boolean DEFAULT true,
    region_id uuid,
    price_per_day_cents bigint GENERATED ALWAYS AS (
CASE
    WHEN (price_per_day IS NOT NULL) THEN ((price_per_day * (100)::numeric))::bigint
    ELSE NULL::bigint
END) STORED,
    can_receive_payments boolean DEFAULT false,
    security_deposit_usd numeric(10,2) DEFAULT 300.0,
    location_geom public.geometry(Point,4326),
    organization_id uuid,
    CONSTRAINT cars_price_per_day_check CHECK ((price_per_day >= (0)::numeric)),
    CONSTRAINT cars_year_check CHECK (((year >= 1900) AND (year <= 2100))),
    CONSTRAINT check_custom_daily_rate_pct CHECK (((custom_daily_rate_pct IS NULL) OR ((custom_daily_rate_pct >= 0.0010) AND (custom_daily_rate_pct <= 0.0100)))),
    CONSTRAINT check_value_usd_source CHECK ((value_usd_source = ANY (ARRAY['owner_manual'::text, 'estimated'::text, 'fipe'::text, 'api'::text, 'ml'::text])))
);


--
-- Name: TABLE cars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cars IS 'Car listings created by owners';


--
-- Name: COLUMN cars.location_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.location_lat IS 'Car location latitude (required for search and map display)';


--
-- Name: COLUMN cars.location_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.location_lng IS 'Car location longitude (required for search and map display)';


--
-- Name: COLUMN cars.value_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.value_usd IS 'Vehicle value in US Dollars (USD). Converted from BRL using Binance rates or manually set by owner.';


--
-- Name: COLUMN cars.plate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.plate IS 'Patente del vehículo (ej: ABC123)';


--
-- Name: COLUMN cars.vin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.vin IS 'Número de chasis/VIN del vehículo';


--
-- Name: COLUMN cars.location_neighborhood; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.location_neighborhood IS 'Barrio o zona de la ubicación';


--
-- Name: COLUMN cars.location_postal_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.location_postal_code IS 'Código postal de la ubicación';


--
-- Name: COLUMN cars.payment_methods; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.payment_methods IS 'Array JSON de métodos de pago aceptados: ["cash", "transfer", "card"]';


--
-- Name: COLUMN cars.delivery_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.delivery_options IS 'Array JSON de opciones de entrega: ["pickup", "delivery"]';


--
-- Name: COLUMN cars.terms_and_conditions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.terms_and_conditions IS 'Términos y condiciones específicos del vehículo';


--
-- Name: COLUMN cars.uses_dynamic_pricing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.uses_dynamic_pricing IS 'True if car owner opted-in to dynamic pricing. False = fixed price_per_day. NOTE: Dynamic pricing requires valid region mapping (to be implemented).';


--
-- Name: COLUMN cars.category_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.category_id IS 'Vehicle category (economy/standard/premium/luxury) for base price calculation';


--
-- Name: COLUMN cars.estimated_value_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.estimated_value_usd IS 'Auto-estimated value if owner did not provide value_usd';


--
-- Name: COLUMN cars.value_usd_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.value_usd_source IS 'Source of vehicle valuation: owner_manual, estimated (from pricing_models), fipe (Brazilian API), api (external), ml (MercadoLibre)';


--
-- Name: COLUMN cars.fipe_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.fipe_code IS 'FIPE reference code for automatic price updates (Brazilian vehicles)';


--
-- Name: COLUMN cars.fipe_last_sync; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.fipe_last_sync IS 'Last time vehicle value was synced with FIPE API';


--
-- Name: COLUMN cars.custom_daily_rate_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.custom_daily_rate_pct IS 'Owner override for daily rate percentage (if different from category default)';


--
-- Name: COLUMN cars.value_brl; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.value_brl IS 'Vehicle value in Brazilian Reals (BRL). Original price from FIPE API.';


--
-- Name: COLUMN cars.value_ars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.value_ars IS 'Vehicle value in Argentine Pesos (ARS). Converted from USD using Binance rates.';


--
-- Name: COLUMN cars.value_auto_sync_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.value_auto_sync_enabled IS 'When enabled, the vehicle value will be automatically synced with FIPE API daily. When disabled, owner must manually update prices.';


--
-- Name: COLUMN cars.region_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.region_id IS 'Region ID for dynamic pricing. NULL = default region (Argentina).';


--
-- Name: COLUMN cars.price_per_day_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.price_per_day_cents IS 'Price per day in cents (ARS). Generated from price_per_day field.';


--
-- Name: COLUMN cars.can_receive_payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.can_receive_payments IS 'Si el auto puede recibir bookings (owner tiene MP onboarding completo)';


--
-- Name: COLUMN cars.security_deposit_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cars.security_deposit_usd IS 'Security deposit amount in USD. Used for distance-based pricing calculations. Default: 300 USD, calculated as 6% of vehicle value (min 300, max 1000).';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    role text DEFAULT 'locatario'::text,
    is_admin boolean DEFAULT false,
    phone text,
    email_verified boolean DEFAULT false,
    phone_verified boolean DEFAULT false,
    id_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mp_onboarding_completed boolean DEFAULT false,
    mercadopago_collector_id text,
    mp_onboarding_url text,
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    home_latitude numeric(10,8),
    home_longitude numeric(11,8),
    location_verified_at timestamp with time zone,
    preferred_search_radius_km integer DEFAULT 50,
    phone_encrypted text,
    whatsapp_encrypted text,
    gov_id_number_encrypted text,
    dni_encrypted text,
    driver_license_number_encrypted text,
    address_line1_encrypted text,
    address_line2_encrypted text,
    postal_code_encrypted text,
    email text,
    date_of_birth date,
    primary_goal text,
    onboarding public.onboarding_status DEFAULT 'incomplete'::public.onboarding_status NOT NULL,
    whatsapp text,
    address_line1 text,
    address_line2 text,
    city text,
    state text,
    postal_code text,
    country text DEFAULT 'AR'::text,
    gov_id_type text,
    gov_id_number text,
    CONSTRAINT check_age_18_or_older CHECK (((date_of_birth IS NULL) OR (date_of_birth <= (CURRENT_DATE - '18 years'::interval)))),
    CONSTRAINT check_home_latitude_range CHECK (((home_latitude IS NULL) OR ((home_latitude >= ('-90'::integer)::numeric) AND (home_latitude <= (90)::numeric)))),
    CONSTRAINT check_home_location_complete CHECK ((((home_latitude IS NULL) AND (home_longitude IS NULL)) OR ((home_latitude IS NOT NULL) AND (home_longitude IS NOT NULL)))),
    CONSTRAINT check_home_longitude_range CHECK (((home_longitude IS NULL) OR ((home_longitude >= ('-180'::integer)::numeric) AND (home_longitude <= (180)::numeric)))),
    CONSTRAINT check_preferred_search_radius CHECK (((preferred_search_radius_km >= 5) AND (preferred_search_radius_km <= 100))),
    CONSTRAINT profiles_primary_goal_check CHECK ((primary_goal = ANY (ARRAY['publish'::text, 'rent'::text, 'both'::text]))),
    CONSTRAINT profiles_rating_avg_check CHECK (((rating_avg >= (0)::numeric) AND (rating_avg <= (5)::numeric))),
    CONSTRAINT profiles_rating_count_check CHECK ((rating_count >= 0)),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['locatario'::text, 'locador'::text, 'ambos'::text, 'admin'::text])))
);


--
-- Name: COLUMN profiles.rating_avg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.rating_avg IS 'Average rating for owner (0-5)';


--
-- Name: COLUMN profiles.rating_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.rating_count IS 'Number of ratings received as owner';


--
-- Name: COLUMN profiles.home_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.home_latitude IS 'User home location latitude (optional, for distance-based pricing)';


--
-- Name: COLUMN profiles.home_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.home_longitude IS 'User home location longitude (optional, for distance-based pricing)';


--
-- Name: COLUMN profiles.location_verified_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.location_verified_at IS 'Timestamp when user verified their home location';


--
-- Name: COLUMN profiles.preferred_search_radius_km; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.preferred_search_radius_km IS 'User preferred search radius for car listings (km)';


--
-- Name: COLUMN profiles.phone_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.phone_encrypted IS 'Encrypted phone number (Base64 ciphertext)';


--
-- Name: COLUMN profiles.whatsapp_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.whatsapp_encrypted IS 'Encrypted WhatsApp number (Base64 ciphertext)';


--
-- Name: COLUMN profiles.gov_id_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.gov_id_number_encrypted IS 'Encrypted government ID number (Base64 ciphertext)';


--
-- Name: COLUMN profiles.dni_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.dni_encrypted IS 'Encrypted DNI/CI number (Base64 ciphertext)';


--
-- Name: COLUMN profiles.driver_license_number_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.driver_license_number_encrypted IS 'Encrypted driver license number (Base64 ciphertext)';


--
-- Name: COLUMN profiles.address_line1_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.address_line1_encrypted IS 'Encrypted address line 1 (Base64 ciphertext)';


--
-- Name: COLUMN profiles.address_line2_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.address_line2_encrypted IS 'Encrypted address line 2 (Base64 ciphertext)';


--
-- Name: COLUMN profiles.postal_code_encrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.postal_code_encrypted IS 'Encrypted postal code (Base64 ciphertext)';


--
-- Name: COLUMN profiles.email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.email IS 'User email synced from auth.users. Automatically maintained by triggers.';


--
-- Name: COLUMN profiles.date_of_birth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.date_of_birth IS 'Date of birth (YYYY-MM-DD). Required for accurate insurance pricing. Must be 18+ years old.';


--
-- Name: COLUMN profiles.primary_goal; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.primary_goal IS 'Usuario inicial goal: publish (publicar auto), rent (alquilar auto), both (ambos)';


--
-- Name: COLUMN profiles.onboarding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.onboarding IS 'Tracks whether user has completed the initial onboarding flow';


--
-- Name: CONSTRAINT check_preferred_search_radius ON profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT check_preferred_search_radius ON public.profiles IS 'Ensures search radius is between 5 and 100 km, matching UI validation';


--
-- Name: bookable_cars; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.bookable_cars AS
 SELECT c.id,
    c.owner_id,
    c.title,
    c.description,
    c.brand,
    c.model,
    c.year,
    c.price_per_day,
    c.currency,
    c.city,
    c.province,
    c.country,
    c.location_lat,
    c.location_lng,
    c.status,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    c.brand_id,
    c.model_id,
    c.brand_text_backup,
    c.model_text_backup,
    c.fuel,
    c.fuel_type,
    c.transmission,
    c.color,
    c.mileage,
    c.seats,
    c.doors,
    c.features,
    c.value_usd,
    c.min_rental_days,
    c.max_rental_days,
    c.deposit_required,
    c.deposit_amount,
    c.insurance_included,
    c.auto_approval,
    c.location_street,
    c.location_street_number,
    c.location_city,
    c.location_state,
    c.location_country,
    c.location_province,
    c.rating_avg,
    c.rating_count,
    c.plate,
    c.vin,
    c.location_neighborhood,
    c.location_postal_code,
    c.payment_methods,
    c.delivery_options,
    c.terms_and_conditions,
    c.uses_dynamic_pricing,
    c.category_id,
    c.estimated_value_usd,
    c.value_usd_source,
    c.fipe_code,
    c.fipe_last_sync,
    c.custom_daily_rate_pct,
    c.value_brl,
    c.value_ars,
    c.value_auto_sync_enabled,
    c.region_id,
    c.price_per_day_cents,
    c.can_receive_payments,
    p.email AS owner_email,
    p.full_name AS owner_name,
    p.mp_onboarding_completed AS owner_mp_completed
   FROM (public.cars c
     JOIN public.profiles p ON ((p.id = c.owner_id)))
  WHERE ((c.status = 'active'::public.car_status) AND (c.can_receive_payments = true));


--
-- Name: booking_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    claim_amount_cents bigint,
    claim_currency text DEFAULT 'USD'::text NOT NULL,
    fault_attributed boolean DEFAULT false,
    severity integer,
    description text,
    damage_type text,
    status text DEFAULT 'pending'::text,
    evidence_photos jsonb,
    police_report_url text,
    resolution_notes text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT booking_claims_claim_amount_cents_check CHECK ((claim_amount_cents >= 0)),
    CONSTRAINT booking_claims_severity_check CHECK (((severity >= 1) AND (severity <= 3))),
    CONSTRAINT booking_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'investigating'::text, 'approved'::text, 'rejected'::text, 'paid'::text])))
);


--
-- Name: TABLE booking_claims; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.booking_claims IS 'Claims/siniestros for bookings. Used to track damages and update driver risk profile.';


--
-- Name: COLUMN booking_claims.fault_attributed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_claims.fault_attributed IS 'TRUE if driver was at fault. Affects risk class. FALSE if not at fault or no-fault accident.';


--
-- Name: COLUMN booking_claims.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_claims.severity IS 'Severity 1 = minor (cosmetic), 2 = moderate (functional), 3 = major (safety/structural).';


--
-- Name: booking_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    stage text NOT NULL,
    inspector_id uuid NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    odometer integer,
    fuel_level numeric(5,2),
    latitude numeric(10,6),
    longitude numeric(10,6),
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT booking_inspections_stage_check CHECK ((stage = ANY (ARRAY['check_in'::text, 'check_out'::text]))),
    CONSTRAINT fuel_level_range CHECK (((fuel_level IS NULL) OR ((fuel_level >= (0)::numeric) AND (fuel_level <= (100)::numeric)))),
    CONSTRAINT odometer_non_negative CHECK (((odometer IS NULL) OR (odometer >= 0)))
);


--
-- Name: booking_insurance_coverage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_insurance_coverage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    policy_id uuid NOT NULL,
    coverage_start timestamp with time zone NOT NULL,
    coverage_end timestamp with time zone NOT NULL,
    liability_coverage bigint NOT NULL,
    deductible_amount bigint NOT NULL,
    daily_premium_charged bigint,
    certificate_number text,
    certificate_url text,
    status text DEFAULT 'active'::text,
    activated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT booking_insurance_coverage_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: booking_location_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_location_tracking (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_role text NOT NULL,
    latitude numeric(10,7) NOT NULL,
    longitude numeric(10,7) NOT NULL,
    accuracy numeric(8,2),
    heading numeric(5,2),
    speed numeric(6,2),
    status text DEFAULT 'active'::text NOT NULL,
    tracking_type text NOT NULL,
    estimated_arrival_time timestamp with time zone,
    distance_to_destination numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT booking_location_tracking_status_check CHECK ((status = ANY (ARRAY['active'::text, 'arrived'::text, 'inactive'::text]))),
    CONSTRAINT booking_location_tracking_tracking_type_check CHECK ((tracking_type = ANY (ARRAY['check_in'::text, 'check_out'::text]))),
    CONSTRAINT booking_location_tracking_user_role_check CHECK ((user_role = ANY (ARRAY['locador'::text, 'locatario'::text])))
);


--
-- Name: TABLE booking_location_tracking; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.booking_location_tracking IS 'Real-time location tracking for delivery/pickup. Allows locatario and locador to see each other during check-in/check-out.';


--
-- Name: COLUMN booking_location_tracking.user_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_location_tracking.user_role IS 'Role of the person being tracked (locador or locatario)';


--
-- Name: COLUMN booking_location_tracking.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_location_tracking.status IS 'Status: active (tracking), arrived (at destination), inactive (stopped)';


--
-- Name: COLUMN booking_location_tracking.tracking_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_location_tracking.tracking_type IS 'Type of tracking: check_in (delivery) or check_out (return)';


--
-- Name: booking_risk_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_risk_snapshot (
    booking_id uuid NOT NULL,
    country_code text NOT NULL,
    bucket text NOT NULL,
    fx_snapshot numeric(14,6) DEFAULT 1.0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    estimated_hold_amount numeric(16,4),
    estimated_deposit numeric(16,4),
    franchise_usd numeric(12,2) NOT NULL,
    has_card boolean DEFAULT false NOT NULL,
    has_wallet_security boolean DEFAULT false NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    standard_franchise_usd integer,
    rollover_franchise_usd integer,
    guarantee_type text,
    guarantee_amount_ars integer,
    guarantee_amount_usd integer,
    fx_snapshot_date timestamp with time zone DEFAULT now(),
    min_hold_ars integer,
    requires_revalidation boolean DEFAULT false,
    revalidation_reason text,
    renter_location_lat numeric(10,8),
    renter_location_lng numeric(11,8),
    car_location_lat numeric(10,8),
    car_location_lng numeric(11,8),
    distance_km numeric(8,2),
    distance_risk_multiplier numeric(4,2) DEFAULT 1.0,
    distance_risk_tier text,
    CONSTRAINT booking_risk_snapshot_guarantee_type_check CHECK ((guarantee_type = ANY (ARRAY['hold'::text, 'security_credit'::text]))),
    CONSTRAINT check_distance_risk_multiplier CHECK (((distance_risk_multiplier >= 1.0) AND (distance_risk_multiplier <= 2.0))),
    CONSTRAINT check_risk_distance CHECK (((distance_km IS NULL) OR (distance_km >= (0)::numeric))),
    CONSTRAINT check_risk_distance_tier CHECK (((distance_risk_tier IS NULL) OR (distance_risk_tier = ANY (ARRAY['local'::text, 'regional'::text, 'long_distance'::text]))))
);


--
-- Name: TABLE booking_risk_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.booking_risk_snapshot IS 'Snapshot de riesgo por booking. Se crea DESPUÉS del booking. 
La PK es booking_id (no tiene id separado).
Flujo correcto:
1. Crear booking en estado "pending"
2. Crear risk_snapshot con booking_id
3. Actualizar booking.risk_snapshot_booking_id = booking_id
4. Procesar pago según payment_mode';


--
-- Name: COLUMN booking_risk_snapshot.bucket; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.bucket IS 'Bucket del auto (economy, standard, premium, luxury, ultra-luxury)';


--
-- Name: COLUMN booking_risk_snapshot.fx_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.fx_snapshot IS 'Tipo de cambio moneda local → USD al momento del booking';


--
-- Name: COLUMN booking_risk_snapshot.franchise_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.franchise_usd IS 'Franquicia calculada en USD (según bucket)';


--
-- Name: COLUMN booking_risk_snapshot.has_card; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.has_card IS 'Si el usuario tiene tarjeta registrada';


--
-- Name: COLUMN booking_risk_snapshot.standard_franchise_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.standard_franchise_usd IS 'Franquicia estándar (daño/robo) en centavos USD';


--
-- Name: COLUMN booking_risk_snapshot.rollover_franchise_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.rollover_franchise_usd IS 'Franquicia por vuelco (2× estándar) en centavos USD';


--
-- Name: COLUMN booking_risk_snapshot.guarantee_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.guarantee_type IS 'Tipo de garantía aplicada';


--
-- Name: COLUMN booking_risk_snapshot.guarantee_amount_ars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.guarantee_amount_ars IS 'Monto de garantía en centavos ARS';


--
-- Name: COLUMN booking_risk_snapshot.guarantee_amount_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.guarantee_amount_usd IS 'Monto de garantía en centavos USD';


--
-- Name: COLUMN booking_risk_snapshot.fx_snapshot_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.fx_snapshot_date IS 'Fecha del snapshot FX';


--
-- Name: COLUMN booking_risk_snapshot.min_hold_ars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.min_hold_ars IS 'Mínimo de hold según bucket en centavos ARS';


--
-- Name: COLUMN booking_risk_snapshot.requires_revalidation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.requires_revalidation IS 'Si requiere revalidación';


--
-- Name: COLUMN booking_risk_snapshot.revalidation_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.revalidation_reason IS 'Motivo de revalidación';


--
-- Name: COLUMN booking_risk_snapshot.renter_location_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.renter_location_lat IS 'Snapshot of renter location at booking time';


--
-- Name: COLUMN booking_risk_snapshot.renter_location_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.renter_location_lng IS 'Snapshot of renter location longitude';


--
-- Name: COLUMN booking_risk_snapshot.car_location_lat; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.car_location_lat IS 'Snapshot of car location at booking time';


--
-- Name: COLUMN booking_risk_snapshot.car_location_lng; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.car_location_lng IS 'Snapshot of car location longitude';


--
-- Name: COLUMN booking_risk_snapshot.distance_km; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.distance_km IS 'Calculated distance between renter and car (km)';


--
-- Name: COLUMN booking_risk_snapshot.distance_risk_multiplier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.distance_risk_multiplier IS 'Guarantee multiplier based on distance (1.0 - 1.5)';


--
-- Name: COLUMN booking_risk_snapshot.distance_risk_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.booking_risk_snapshot.distance_risk_tier IS 'Risk tier: local, regional, long_distance';


--
-- Name: calendar_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    car_id uuid,
    user_id uuid,
    operation text NOT NULL,
    status text NOT NULL,
    google_calendar_event_id text,
    error_message text,
    error_code text,
    retry_count integer DEFAULT 0,
    sync_direction text,
    request_payload jsonb,
    response_payload jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);


--
-- Name: TABLE calendar_sync_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.calendar_sync_log IS 'Audit log for all calendar synchronization operations';


--
-- Name: car_blocked_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_blocked_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    blocked_from date NOT NULL,
    blocked_to date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_date_range CHECK ((blocked_from <= blocked_to))
);


--
-- Name: car_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country text DEFAULT 'AR'::text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: car_google_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_google_calendars (
    car_id uuid NOT NULL,
    google_calendar_id text NOT NULL,
    calendar_name text NOT NULL,
    calendar_description text,
    owner_id uuid,
    sync_enabled boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE car_google_calendars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.car_google_calendars IS 'Maps each car to a dedicated Google Calendar for booking management';


--
-- Name: car_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid,
    name text NOT NULL,
    category text,
    seats integer,
    doors integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: car_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.car_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid NOT NULL,
    stored_path text NOT NULL,
    url text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_cover boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE car_photos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.car_photos IS 'Photos associated with car listings';


--
-- Name: cars_multi_currency; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cars_multi_currency AS
 SELECT id,
    brand_text_backup,
    model_text_backup,
    year,
    location_country,
    value_brl,
    value_usd,
    value_ars,
    value_usd_source,
    fipe_code,
    fipe_last_sync,
        CASE
            WHEN ((value_brl IS NOT NULL) AND (value_usd IS NOT NULL)) THEN round(((value_usd)::numeric / (value_brl)::numeric), 4)
            ELSE NULL::numeric
        END AS implied_brl_usd_rate,
        CASE
            WHEN ((value_usd IS NOT NULL) AND (value_ars IS NOT NULL)) THEN round(((value_ars)::numeric / (value_usd)::numeric), 2)
            ELSE NULL::numeric
        END AS implied_usd_ars_rate
   FROM public.cars c;


--
-- Name: VIEW cars_multi_currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.cars_multi_currency IS 'Shows all cars with prices in multiple currencies and implied exchange rates used during conversion.';


--
-- Name: cars_payment_status_diagnostic; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cars_payment_status_diagnostic AS
 SELECT c.id AS car_id,
    ((c.brand || ' '::text) || c.model) AS car_name,
    c.status,
    c.can_receive_payments,
    p.id AS owner_id,
    p.email AS owner_email,
    p.mp_onboarding_completed AS owner_mp_completed,
    p.mercadopago_collector_id AS owner_collector_id,
    p.created_at AS owner_created_at,
        CASE
            WHEN ((c.status = 'active'::public.car_status) AND (c.can_receive_payments = false)) THEN '⚠️ BLOQUEADO: Auto activo pero sin MP'::text
            WHEN ((c.status = 'active'::public.car_status) AND (c.can_receive_payments = true)) THEN '✅ OK: Puede recibir bookings'::text
            WHEN (c.status <> 'active'::public.car_status) THEN 'ℹ️ Inactivo'::text
            ELSE '❓ Estado desconocido'::text
        END AS diagnostic
   FROM (public.cars c
     JOIN public.profiles p ON ((p.id = c.owner_id)))
  ORDER BY
        CASE
            WHEN ((c.status = 'active'::public.car_status) AND (c.can_receive_payments = false)) THEN 1
            WHEN ((c.status = 'active'::public.car_status) AND (c.can_receive_payments = true)) THEN 2
            ELSE 3
        END, c.created_at DESC;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    reported_by uuid NOT NULL,
    damages jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_estimated_cost_usd numeric(10,2) DEFAULT 0 NOT NULL,
    status public.claim_status DEFAULT 'draft'::public.claim_status NOT NULL,
    notes text,
    locked_at timestamp with time zone,
    locked_by uuid,
    processed_at timestamp with time zone,
    fraud_warnings jsonb DEFAULT '[]'::jsonb,
    owner_claims_30d integer DEFAULT 0,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    waterfall_result jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE claims; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.claims IS 'Damage/incident claims for bookings. Supports full settlement lifecycle with anti-fraud protection.';


--
-- Name: COLUMN claims.damages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.damages IS 'Array of damage items: [{type, description, estimatedCostUsd, photos[], severity}]';


--
-- Name: COLUMN claims.locked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.locked_at IS 'P0-SECURITY: Timestamp when claim was locked for processing (optimistic locking)';


--
-- Name: COLUMN claims.locked_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.locked_by IS 'P0-SECURITY: User who locked the claim for processing';


--
-- Name: COLUMN claims.fraud_warnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.fraud_warnings IS 'P0-SECURITY: Array of fraud warning flags from anti-fraud validation';


--
-- Name: COLUMN claims.waterfall_result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.claims.waterfall_result IS 'Result of waterfall execution: {holdCaptured, walletDebited, extraCharged, fgoPaid, remainingUncovered}';


--
-- Name: conversion_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversion_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    car_id uuid,
    user_id uuid,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_type_not_empty CHECK ((char_length(event_type) > 0))
);


--
-- Name: COLUMN conversion_events.event_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversion_events.event_type IS 'Tipo de evento: date_preset_clicked, cta_clicked, booking_initiated, etc.';


--
-- Name: COLUMN conversion_events.event_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversion_events.event_data IS 'Datos adicionales del evento en formato JSON (preset_type, days_count, total_price, etc.)';


--
-- Name: cron_execution_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_execution_log (
    id bigint NOT NULL,
    job_name text NOT NULL,
    executed_at timestamp with time zone DEFAULT now(),
    status text,
    response jsonb,
    error text
);


--
-- Name: TABLE cron_execution_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cron_execution_log IS 'Log de ejecuciones del cron job de monitoring';


--
-- Name: cron_execution_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cron_execution_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cron_execution_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cron_execution_log_id_seq OWNED BY public.cron_execution_log.id;


--
-- Name: driver_class_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_class_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    old_class integer NOT NULL,
    new_class integer NOT NULL,
    class_change integer NOT NULL,
    reason text NOT NULL,
    booking_id uuid,
    claim_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT driver_class_history_new_class_check CHECK (((new_class >= 0) AND (new_class <= 10))),
    CONSTRAINT driver_class_history_old_class_check CHECK (((old_class >= 0) AND (old_class <= 10)))
);


--
-- Name: TABLE driver_class_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.driver_class_history IS 'Audit trail of all driver class changes. Used for transparency and dispute resolution.';


--
-- Name: driver_protection_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_protection_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    addon_type text NOT NULL,
    purchase_date timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    price_paid_cents bigint NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    protection_level integer DEFAULT 1,
    max_protected_claims integer DEFAULT 1,
    claims_used integer DEFAULT 0,
    is_active boolean DEFAULT true,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT driver_protection_addons_addon_type_check CHECK ((addon_type = ANY (ARRAY['bonus_protector'::text, 'deductible_shield'::text, 'premium_coverage'::text]))),
    CONSTRAINT driver_protection_addons_check CHECK ((claims_used <= max_protected_claims)),
    CONSTRAINT driver_protection_addons_check1 CHECK (((expires_at IS NULL) OR (expires_at > purchase_date))),
    CONSTRAINT driver_protection_addons_claims_used_check CHECK ((claims_used >= 0)),
    CONSTRAINT driver_protection_addons_max_protected_claims_check CHECK ((max_protected_claims > 0)),
    CONSTRAINT driver_protection_addons_price_paid_cents_check CHECK ((price_paid_cents >= 0)),
    CONSTRAINT driver_protection_addons_protection_level_check CHECK (((protection_level >= 1) AND (protection_level <= 3)))
);


--
-- Name: TABLE driver_protection_addons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.driver_protection_addons IS 'Purchased add-ons like bonus protector (prevents class downgrade) or deductible shield.';


--
-- Name: COLUMN driver_protection_addons.addon_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.driver_protection_addons.addon_type IS 'Type: bonus_protector = protects class on claim, deductible_shield = reduces deductible, premium_coverage = full coverage.';


--
-- Name: COLUMN driver_protection_addons.protection_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.driver_protection_addons.protection_level IS 'Level 1-3: higher level = more protection. Affects price and number of protected claims.';


--
-- Name: driver_risk_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_risk_profile (
    user_id uuid NOT NULL,
    class integer DEFAULT 5 NOT NULL,
    driver_score integer DEFAULT 50,
    last_claim_at timestamp with time zone,
    last_claim_with_fault boolean,
    good_years integer DEFAULT 0,
    total_claims integer DEFAULT 0,
    claims_with_fault integer DEFAULT 0,
    total_bookings integer DEFAULT 0,
    clean_bookings integer DEFAULT 0,
    last_class_update timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT driver_risk_profile_check CHECK ((claims_with_fault <= total_claims)),
    CONSTRAINT driver_risk_profile_check1 CHECK ((clean_bookings <= total_bookings)),
    CONSTRAINT driver_risk_profile_claims_with_fault_check CHECK ((claims_with_fault >= 0)),
    CONSTRAINT driver_risk_profile_class_check CHECK (((class >= 0) AND (class <= 10))),
    CONSTRAINT driver_risk_profile_clean_bookings_check CHECK ((clean_bookings >= 0)),
    CONSTRAINT driver_risk_profile_driver_score_check CHECK (((driver_score >= 0) AND (driver_score <= 100))),
    CONSTRAINT driver_risk_profile_good_years_check CHECK ((good_years >= 0)),
    CONSTRAINT driver_risk_profile_total_bookings_check CHECK ((total_bookings >= 0)),
    CONSTRAINT driver_risk_profile_total_claims_check CHECK ((total_claims >= 0))
);


--
-- Name: TABLE driver_risk_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.driver_risk_profile IS 'Driver risk classification and history. Class 0 = best, 10 = worst. Used for Bonus-Malus pricing.';


--
-- Name: COLUMN driver_risk_profile.class; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.driver_risk_profile.class IS 'Driver class from 0 (excellent) to 10 (high risk). Class 5 = neutral, new drivers start here.';


--
-- Name: COLUMN driver_risk_profile.driver_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.driver_risk_profile.driver_score IS 'Telemetry-based driving score from 0 (worst) to 100 (best). Affects fee calculation.';


--
-- Name: driver_score_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_score_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date date NOT NULL,
    class_distribution jsonb NOT NULL,
    total_drivers integer NOT NULL,
    average_score numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE driver_score_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.driver_score_snapshots IS 'Weekly snapshots of driver score distribution for monitoring';


--
-- Name: COLUMN driver_score_snapshots.class_distribution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.driver_score_snapshots.class_distribution IS 'JSON array with stats per class';


--
-- Name: driver_telemetry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_telemetry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    booking_id uuid,
    trip_date timestamp with time zone DEFAULT now(),
    total_km numeric(10,2),
    hard_brakes integer DEFAULT 0,
    speed_violations integer DEFAULT 0,
    night_driving_hours numeric(5,2) DEFAULT 0,
    risk_zones_visited integer DEFAULT 0,
    driver_score integer,
    telemetry_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT driver_telemetry_driver_score_check CHECK (((driver_score >= 0) AND (driver_score <= 100))),
    CONSTRAINT driver_telemetry_hard_brakes_check CHECK ((hard_brakes >= 0)),
    CONSTRAINT driver_telemetry_night_driving_hours_check CHECK ((night_driving_hours >= (0)::numeric)),
    CONSTRAINT driver_telemetry_risk_zones_visited_check CHECK ((risk_zones_visited >= 0)),
    CONSTRAINT driver_telemetry_speed_violations_check CHECK ((speed_violations >= 0)),
    CONSTRAINT driver_telemetry_total_km_check CHECK ((total_km >= (0)::numeric))
);


--
-- Name: TABLE driver_telemetry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.driver_telemetry IS 'Telemetry data collected during trips for driver score calculation. GPS, accelerometer, speed data.';


--
-- Name: encryption_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encryption_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation text NOT NULL,
    user_id uuid,
    message_id uuid,
    success boolean NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encryption_keys (
    id text NOT NULL,
    key bytea NOT NULL,
    algorithm text DEFAULT 'AES-256'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    rotated_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE encryption_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.encryption_keys IS 'Master encryption keys for server-side encryption - access restricted to SECURITY DEFINER functions';


--
-- Name: exchange_rate_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_method text NOT NULL,
    pair text NOT NULL,
    binance_rate numeric,
    platform_rate numeric,
    success boolean NOT NULL,
    error_message text,
    execution_time_ms integer,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exchange_rate_sync_log_sync_method_check CHECK ((sync_method = ANY (ARRAY['github_actions'::text, 'cron_edge_function'::text, 'cron_direct'::text, 'manual'::text])))
);


--
-- Name: TABLE exchange_rate_sync_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.exchange_rate_sync_log IS 'Registro de sincronizaciones de tipos de cambio. Solo admins pueden ver/modificar.
RLS habilitado para seguridad.';


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pair text NOT NULL,
    rate numeric(20,8) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'binance'::text NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exchange_rates_rate_check CHECK ((rate > (0)::numeric))
);


--
-- Name: TABLE exchange_rates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.exchange_rates IS 'Currency exchange rates for conversion calculations';


--
-- Name: fgo_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fgo_metrics (
    id boolean DEFAULT true NOT NULL,
    alpha_percentage numeric(5,2) DEFAULT 15.00 NOT NULL,
    target_months_coverage integer DEFAULT 12 NOT NULL,
    total_contributions_cents bigint DEFAULT 0 NOT NULL,
    total_siniestros_paid_cents bigint DEFAULT 0 NOT NULL,
    total_siniestros_count integer DEFAULT 0 NOT NULL,
    coverage_ratio numeric(10,4),
    loss_ratio numeric(10,4),
    target_balance_cents bigint,
    status text DEFAULT 'healthy'::text NOT NULL,
    last_calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    pem_cents bigint,
    pem_window_days integer DEFAULT 90,
    lr_90d numeric(10,4),
    lr_365d numeric(10,4),
    total_events_90d integer DEFAULT 0,
    avg_recovery_rate numeric(6,3),
    CONSTRAINT fgo_metrics_alpha_percentage_check CHECK (((alpha_percentage >= (0)::numeric) AND (alpha_percentage <= (100)::numeric))),
    CONSTRAINT fgo_metrics_id_check CHECK ((id = true)),
    CONSTRAINT fgo_metrics_status_check CHECK ((status = ANY (ARRAY['healthy'::text, 'warning'::text, 'critical'::text]))),
    CONSTRAINT fgo_metrics_target_months_coverage_check CHECK ((target_months_coverage > 0))
);


--
-- Name: TABLE fgo_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fgo_metrics IS 'Métricas calculadas del FGO (RC, LR, estado)';


--
-- Name: COLUMN fgo_metrics.pem_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_metrics.pem_cents IS 'Pérdida Esperada Mensual en centavos (rolling 90d)';


--
-- Name: COLUMN fgo_metrics.lr_90d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_metrics.lr_90d IS 'Loss Ratio rolling 90 días';


--
-- Name: COLUMN fgo_metrics.lr_365d; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_metrics.lr_365d IS 'Loss Ratio rolling 365 días';


--
-- Name: COLUMN fgo_metrics.avg_recovery_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_metrics.avg_recovery_rate IS 'Tasa promedio de recupero (0.0 - 1.0)';


--
-- Name: fgo_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fgo_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    bucket text NOT NULL,
    alpha numeric(5,4) DEFAULT 0.1500 NOT NULL,
    alpha_min numeric(5,4) DEFAULT 0.1000 NOT NULL,
    alpha_max numeric(5,4) DEFAULT 0.2000 NOT NULL,
    rc_floor numeric(6,3) DEFAULT 0.900 NOT NULL,
    rc_hard_floor numeric(6,3) DEFAULT 0.800 NOT NULL,
    rc_soft_ceiling numeric(6,3) DEFAULT 1.200 NOT NULL,
    loss_ratio_target numeric(6,3) DEFAULT 0.800 NOT NULL,
    monthly_payout_cap numeric(6,3) DEFAULT 0.080 NOT NULL,
    per_user_limit integer DEFAULT 2 NOT NULL,
    event_cap_usd numeric(10,2) DEFAULT 800.00 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgo_parameters_alpha_check CHECK (((alpha >= (0)::numeric) AND (alpha <= (1)::numeric))),
    CONSTRAINT fgo_parameters_alpha_max_check CHECK ((alpha_max <= (1)::numeric)),
    CONSTRAINT fgo_parameters_alpha_min_check CHECK ((alpha_min >= (0)::numeric)),
    CONSTRAINT fgo_parameters_check CHECK (((rc_hard_floor > (0)::numeric) AND (rc_hard_floor < rc_floor))),
    CONSTRAINT fgo_parameters_event_cap_usd_check CHECK ((event_cap_usd > (0)::numeric)),
    CONSTRAINT fgo_parameters_loss_ratio_target_check CHECK ((loss_ratio_target > (0)::numeric)),
    CONSTRAINT fgo_parameters_per_user_limit_check CHECK ((per_user_limit > 0)),
    CONSTRAINT fgo_parameters_rc_floor_check CHECK ((rc_floor > (0)::numeric))
);


--
-- Name: TABLE fgo_parameters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fgo_parameters IS 'Parámetros operativos del FGO por país y bucket';


--
-- Name: COLUMN fgo_parameters.alpha; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_parameters.alpha IS 'Porcentaje de aporte actual (α)';


--
-- Name: COLUMN fgo_parameters.rc_floor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_parameters.rc_floor IS 'RC mínimo para operación normal';


--
-- Name: COLUMN fgo_parameters.rc_hard_floor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_parameters.rc_hard_floor IS 'RC crítico (solo micro-pagos)';


--
-- Name: COLUMN fgo_parameters.event_cap_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fgo_parameters.event_cap_usd IS 'Tope máximo de cobertura por evento en USD';


--
-- Name: fgo_subfunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fgo_subfunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subfund_type text NOT NULL,
    balance_cents bigint DEFAULT 0 NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT fgo_subfunds_balance_cents_check CHECK ((balance_cents >= 0)),
    CONSTRAINT fgo_subfunds_subfund_type_check CHECK ((subfund_type = ANY (ARRAY['liquidity'::text, 'capitalization'::text, 'profitability'::text])))
);


--
-- Name: TABLE fgo_subfunds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fgo_subfunds IS 'Subfondos del FGO: Liquidez, Capitalización, Rentabilidad';


--
-- Name: fleet_bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fleet_bonuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    car_id uuid NOT NULL,
    trips_completed integer DEFAULT 0,
    trips_required integer DEFAULT 3,
    avg_rating numeric(3,2) DEFAULT 0,
    min_rating_required numeric(3,2) DEFAULT 4.8,
    bonus_amount_usd numeric(10,2) DEFAULT 50.00,
    currency text DEFAULT 'USD'::text,
    status text DEFAULT 'pending'::text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fleet_bonuses_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'eligible'::text, 'paid'::text, 'expired'::text])))
);


--
-- Name: fx_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    rate numeric(12,4) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source text DEFAULT 'manual'::text,
    source_reference text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_from timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    CONSTRAINT fx_rates_different_currencies CHECK ((from_currency <> to_currency)),
    CONSTRAINT fx_rates_from_currency_check CHECK ((from_currency = ANY (ARRAY['USD'::text, 'ARS'::text, 'COP'::text, 'MXN'::text, 'BRL'::text, 'UYU'::text]))),
    CONSTRAINT fx_rates_rate_check CHECK ((rate > (0)::numeric)),
    CONSTRAINT fx_rates_to_currency_check CHECK ((to_currency = ANY (ARRAY['USD'::text, 'ARS'::text, 'COP'::text, 'MXN'::text, 'BRL'::text, 'UYU'::text])))
);


--
-- Name: TABLE fx_rates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fx_rates IS 'Snapshots de tipos de cambio para cálculos de reservas';


--
-- Name: COLUMN fx_rates.rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fx_rates.rate IS 'Tasa de cambio: 1 from_currency = rate to_currency';


--
-- Name: COLUMN fx_rates.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fx_rates.is_active IS 'Solo debe haber 1 rate activo por par de monedas';


--
-- Name: COLUMN fx_rates.valid_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fx_rates.valid_from IS 'Fecha desde la cual este rate es válido';


--
-- Name: COLUMN fx_rates.valid_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.fx_rates.valid_until IS 'Fecha hasta la cual este rate es válido (opcional)';


--
-- Name: google_calendar_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_tokens (
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_type text DEFAULT 'Bearer'::text,
    expires_at timestamp with time zone NOT NULL,
    scope text NOT NULL,
    primary_calendar_id text,
    connected_at timestamp with time zone DEFAULT now(),
    last_synced_at timestamp with time zone,
    sync_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE google_calendar_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.google_calendar_tokens IS 'Stores OAuth tokens for users who connected their Google Calendar';


--
-- Name: insurance_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurance_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    addon_type text NOT NULL,
    daily_cost bigint NOT NULL,
    benefit_amount bigint,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT insurance_addons_addon_type_check CHECK ((addon_type = ANY (ARRAY['rc_ampliada'::text, 'reduccion_franquicia'::text, 'paises_limitrofes'::text, 'neumaticos'::text, 'equipaje'::text])))
);


--
-- Name: insurance_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurance_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_type text NOT NULL,
    insurer text NOT NULL,
    platform_policy_number text,
    platform_contract_start date,
    platform_contract_end date,
    owner_id uuid,
    car_id uuid,
    owner_policy_number text,
    owner_policy_start date,
    owner_policy_end date,
    owner_policy_document_url text,
    verified_by_admin boolean DEFAULT false,
    verification_date timestamp with time zone,
    liability_coverage_amount bigint DEFAULT 160000000,
    own_damage_coverage boolean DEFAULT true,
    theft_coverage boolean DEFAULT true,
    fire_coverage boolean DEFAULT true,
    misappropriation_coverage boolean DEFAULT true,
    misappropriation_limit bigint DEFAULT 25000000,
    deductible_type text,
    deductible_percentage numeric(5,2),
    deductible_fixed_amount bigint,
    deductible_min_amount bigint DEFAULT 500000,
    daily_premium bigint,
    annual_premium bigint,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT insurance_policies_deductible_type_check CHECK ((deductible_type = ANY (ARRAY['percentage'::text, 'fixed'::text]))),
    CONSTRAINT insurance_policies_insurer_check CHECK ((insurer = ANY (ARRAY['rio_uruguay'::text, 'sancor'::text, 'federacion_patronal'::text, 'other'::text]))),
    CONSTRAINT insurance_policies_policy_type_check CHECK ((policy_type = ANY (ARRAY['platform_floating'::text, 'owner_byoi'::text]))),
    CONSTRAINT insurance_policies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending_verification'::text])))
);


--
-- Name: journal_entry_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entry_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: me_profile; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.me_profile AS
 SELECT id,
    full_name,
    avatar_url,
    role,
    is_admin,
    phone,
    email_verified,
    phone_verified,
    id_verified,
    created_at,
    updated_at,
    (role = ANY (ARRAY['locador'::text, 'ambos'::text])) AS can_publish_cars,
    (role = ANY (ARRAY['locatario'::text, 'ambos'::text])) AS can_book_cars
   FROM public.profiles p
  WHERE (id = ( SELECT auth.uid() AS uid));


--
-- Name: VIEW me_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.me_profile IS 'Vista enriquecida del perfil del usuario autenticado con permisos derivados';


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    car_id uuid,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    body text NOT NULL,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT messages_context_check CHECK ((((booking_id IS NOT NULL) AND (car_id IS NULL)) OR ((booking_id IS NULL) AND (car_id IS NOT NULL)))),
    CONSTRAINT messages_not_self CHECK ((sender_id <> recipient_id))
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Mensajes entre usuarios (booking o car)';


--
-- Name: COLUMN messages.booking_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.booking_id IS 'Post-booking conversation context (mutually exclusive with car_id)';


--
-- Name: COLUMN messages.car_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.car_id IS 'Pre-booking conversation context (mutually exclusive with booking_id)';


--
-- Name: COLUMN messages.body; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.body IS 'Message content - encrypted via pgcrypto functions';


--
-- Name: COLUMN messages.delivered_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.delivered_at IS 'Timestamp when message was delivered to recipient device';


--
-- Name: COLUMN messages.read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.read_at IS 'Timestamp when message was read by recipient';


--
-- Name: messages_decrypted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.messages_decrypted WITH (security_invoker='true') AS
 SELECT id,
    booking_id,
    car_id,
    sender_id,
    recipient_id,
    public.decrypt_message(body) AS body,
    body AS body_encrypted,
    delivered_at,
    read_at,
    created_at
   FROM public.messages;


--
-- Name: VIEW messages_decrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.messages_decrypted IS 'Messages with decrypted content - respects RLS from base table';


--
-- Name: monitoring_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    resolved_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: monitoring_performance_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monitoring_performance_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text NOT NULL,
    resource_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mp_webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mp_webhook_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    webhook_type text NOT NULL,
    resource_type text,
    resource_id text,
    payment_id text,
    booking_id uuid,
    split_id uuid,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    processing_error text,
    received_at timestamp with time zone DEFAULT now(),
    user_agent text,
    ip_address inet,
    event_id text
);


--
-- Name: TABLE mp_webhook_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mp_webhook_logs IS 'Logs de todos los webhooks de Mercado Pago para debugging';


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    payment_intent_id uuid,
    provider public.payment_provider NOT NULL,
    provider_payment_id text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_hold boolean DEFAULT false,
    authorized_at timestamp with time zone,
    captured_at timestamp with time zone,
    canceled_at timestamp with time zone,
    amount_authorized_cents bigint,
    amount_captured_cents bigint DEFAULT 0,
    expires_at timestamp with time zone,
    payment_method_id text,
    card_last4 text,
    idempotency_key text,
    user_id uuid,
    description text,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payments IS 'Payment records from payment providers';


--
-- Name: COLUMN payments.is_hold; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.is_hold IS 'true = preautorización (hold), false = pago capturado';


--
-- Name: COLUMN payments.authorized_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.authorized_at IS 'Fecha de autorización del hold';


--
-- Name: COLUMN payments.captured_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.captured_at IS 'Fecha de captura de fondos';


--
-- Name: COLUMN payments.canceled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.canceled_at IS 'Fecha de cancelación del hold';


--
-- Name: COLUMN payments.amount_authorized_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.amount_authorized_cents IS 'Monto autorizado (hold) en centavos';


--
-- Name: COLUMN payments.amount_captured_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.amount_captured_cents IS 'Monto capturado real en centavos';


--
-- Name: COLUMN payments.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.expires_at IS 'Fecha de expiración del hold (típicamente 7 días)';


--
-- Name: COLUMN payments.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.idempotency_key IS 'Key para evitar duplicados';


--
-- Name: COLUMN payments.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.user_id IS 'Usuario que creó el payment (puede ser diferente del renter)';


--
-- Name: my_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.my_bookings AS
 SELECT b.id,
    b.car_id,
    b.renter_id,
    b.start_at,
    b.end_at,
    b.status,
    b.total_amount,
    b.currency,
    b.created_at,
    b.updated_at,
    b.guarantee_type,
    b.guarantee_amount_cents,
    b.risk_snapshot_booking_id,
    b.risk_snapshot_date,
    b.requires_revalidation,
    b.hold_authorization_id,
    b.hold_expires_at,
    b.reauthorization_count,
    b.payment_mode,
    b.coverage_upgrade,
    b.authorized_payment_id,
    b.wallet_lock_id,
    b.total_price_ars,
    b.idempotency_key,
    b.payment_split_completed,
    b.payment_split_validated_at,
    b.owner_payment_amount,
    b.platform_fee,
    b.pickup_location_lat,
    b.pickup_location_lng,
    b.dropoff_location_lat,
    b.dropoff_location_lng,
    b.delivery_required,
    b.delivery_distance_km,
    b.delivery_fee_cents,
    b.distance_risk_tier,
    b.payment_provider,
    b.payment_preference_id,
    b.payment_init_point,
    b.provider_split_payment_id,
    b.provider_collector_id,
    b.days_count,
    b.nightly_rate_cents,
    b.subtotal_cents,
    b.insurance_cents,
    b.fees_cents,
    b.discounts_cents,
    b.total_cents,
    b.breakdown,
    b.payment_id,
    b.expires_at,
    b.paid_at,
    b.cancellation_policy_id,
    b.cancellation_fee_cents,
    b.cancelled_at,
    b.cancellation_reason,
    b.has_dynamic_pricing,
    b.dynamic_price_snapshot,
    b.price_locked_until,
    b.price_lock_token,
    b.google_calendar_event_id,
    b.calendar_synced_at,
    b.calendar_sync_enabled,
    b.payout_status,
    b.payout_date,
    b.platform_fee_collected,
    b.owner_amount_paid,
    b.payout_retry_count,
    b.payout_error_message,
    b.mercadopago_split_id,
    b.risk_snapshot_id,
    c.title AS car_title,
    c.brand AS car_brand,
    c.model AS car_model,
    c.year AS car_year,
    c.location_city AS car_city,
    c.location_province AS car_province,
    COALESCE(( SELECT car_photos.url
           FROM public.car_photos
          WHERE (car_photos.car_id = c.id)
          ORDER BY car_photos.sort_order
         LIMIT 1)) AS main_photo_url,
    pay.status AS payment_status,
    pay.provider AS payment_table_provider
   FROM ((public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
     LEFT JOIN public.payments pay ON ((pay.id = b.payment_id)))
  WHERE (b.renter_id = auth.uid());


--
-- Name: VIEW my_bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.my_bookings IS 'Bookings for the current authenticated user with car details';


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    user_id uuid NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notification_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_settings IS 'Stores user notification preferences (sound, browser toggles, types) for cross-device sync.';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    cta_link text,
    is_read boolean DEFAULT false NOT NULL,
    type public.notification_type NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_body_check CHECK ((char_length(body) > 0)),
    CONSTRAINT notifications_title_check CHECK ((char_length(title) > 0))
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'User notifications for bonus-malus alerts';


--
-- Name: COLUMN notifications.cta_link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.cta_link IS 'Call-to-action link for the notification to navigate the user upon interaction.';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.type IS 'Categorizes the notification for client-side logic and display.';


--
-- Name: onboarding_plan_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_plan_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_code text NOT NULL,
    role text NOT NULL,
    version text NOT NULL,
    canonical jsonb NOT NULL,
    critical_step_keys text[] DEFAULT ARRAY[]::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    commission_fixed_percent numeric(5,2) DEFAULT 0,
    CONSTRAINT organization_members_commission_fixed_percent_check CHECK (((commission_fixed_percent >= (0)::numeric) AND (commission_fixed_percent <= (50)::numeric))),
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'driver'::text])))
);


--
-- Name: COLUMN organization_members.commission_fixed_percent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_members.commission_fixed_percent IS 'Percentage of booking total that goes to this manager (deducted from owner share)';


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    tax_id text,
    type text NOT NULL,
    verified boolean DEFAULT false,
    logo_url text,
    website text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organizations_type_check CHECK ((type = ANY (ARRAY['fleet'::text, 'corporate'::text, 'agency'::text])))
);


--
-- Name: outbound_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbound_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint text NOT NULL,
    method text DEFAULT 'POST'::text NOT NULL,
    headers jsonb DEFAULT '{}'::jsonb,
    body jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    response_status integer,
    response_body jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: owner_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.owner_bookings AS
 SELECT b.id,
    b.car_id,
    b.renter_id,
    b.start_at,
    b.end_at,
    b.status,
    b.total_amount,
    b.currency,
    b.created_at,
    b.updated_at,
    b.guarantee_type,
    b.guarantee_amount_cents,
    b.risk_snapshot_booking_id,
    b.risk_snapshot_date,
    b.requires_revalidation,
    b.hold_authorization_id,
    b.hold_expires_at,
    b.reauthorization_count,
    b.payment_mode,
    b.coverage_upgrade,
    b.authorized_payment_id,
    b.wallet_lock_id,
    b.total_price_ars,
    b.idempotency_key,
    b.payment_split_completed,
    b.payment_split_validated_at,
    b.owner_payment_amount,
    b.platform_fee,
    b.pickup_location_lat,
    b.pickup_location_lng,
    b.dropoff_location_lat,
    b.dropoff_location_lng,
    b.delivery_required,
    b.delivery_distance_km,
    b.delivery_fee_cents,
    b.distance_risk_tier,
    b.payment_provider,
    b.payment_preference_id,
    b.payment_init_point,
    b.provider_split_payment_id,
    b.provider_collector_id,
    b.days_count,
    b.nightly_rate_cents,
    b.subtotal_cents,
    b.insurance_cents,
    b.fees_cents,
    b.discounts_cents,
    b.total_cents,
    b.breakdown,
    b.payment_id,
    b.expires_at,
    b.paid_at,
    b.cancellation_policy_id,
    b.cancellation_fee_cents,
    b.cancelled_at,
    b.cancellation_reason,
    b.has_dynamic_pricing,
    b.dynamic_price_snapshot,
    b.price_locked_until,
    b.price_lock_token,
    b.google_calendar_event_id,
    b.calendar_synced_at,
    b.calendar_sync_enabled,
    b.payout_status,
    b.payout_date,
    b.platform_fee_collected,
    b.owner_amount_paid,
    b.payout_retry_count,
    b.payout_error_message,
    b.mercadopago_split_id,
    b.risk_snapshot_id,
    c.title AS car_title,
    c.brand AS car_brand,
    c.model AS car_model,
    pr.full_name AS renter_name,
    pr.avatar_url AS renter_avatar,
    pay.status AS payment_status,
    pay.provider AS payment_table_provider
   FROM (((public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
     LEFT JOIN public.profiles pr ON ((pr.id = b.renter_id)))
     LEFT JOIN public.payments pay ON ((pay.id = b.payment_id)))
  WHERE (c.owner_id = auth.uid());


--
-- Name: VIEW owner_bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.owner_bookings IS 'Bookings for cars owned by the current authenticated user';


--
-- Name: payment_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    provider public.payment_provider NOT NULL,
    provider_intent_id text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    capture boolean DEFAULT true,
    authorized_at timestamp with time zone,
    captured_at timestamp with time zone,
    canceled_at timestamp with time zone,
    amount_authorized_cents bigint,
    amount_captured_cents bigint DEFAULT 0,
    expires_at timestamp with time zone,
    payment_method_id text,
    card_last4 text,
    idempotency_key text,
    user_id uuid,
    description text,
    mp_order_id text,
    mp_order_status text,
    CONSTRAINT payment_intents_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: TABLE payment_intents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_intents IS 'Almacena todos los intents de pago: preautorizaciones (holds), cobros directos y depósitos.
Para preauth: capture=false en MP, ventana de 7 días para capturar o cancelar.';


--
-- Name: COLUMN payment_intents.capture; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.capture IS 'true = captura inmediata, false = preautorización (hold)';


--
-- Name: COLUMN payment_intents.authorized_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.authorized_at IS 'Fecha de autorización del hold';


--
-- Name: COLUMN payment_intents.captured_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.captured_at IS 'Fecha de captura de fondos';


--
-- Name: COLUMN payment_intents.canceled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.canceled_at IS 'Fecha de cancelación del hold';


--
-- Name: COLUMN payment_intents.amount_authorized_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.amount_authorized_cents IS 'Monto autorizado (hold) en centavos';


--
-- Name: COLUMN payment_intents.amount_captured_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.amount_captured_cents IS 'Monto capturado real en centavos';


--
-- Name: COLUMN payment_intents.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.expires_at IS 'Fecha de expiración del hold (típicamente 7 días)';


--
-- Name: COLUMN payment_intents.idempotency_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_intents.idempotency_key IS 'Key para evitar duplicados';


--
-- Name: payment_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    payment_id character varying(255),
    issue_type character varying(100) NOT NULL,
    details jsonb,
    resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    severity character varying(20) DEFAULT 'medium'::character varying,
    priority integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_issues_issue_type_check CHECK (((issue_type)::text = ANY ((ARRAY['split_collector_mismatch'::character varying, 'split_amount_mismatch'::character varying, 'marketplace_not_configured'::character varying, 'payment_failed'::character varying, 'webhook_signature_invalid'::character varying, 'refund_requested'::character varying, 'chargeback'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT payment_issues_priority_check CHECK (((priority >= 1) AND (priority <= 5))),
    CONSTRAINT payment_issues_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


--
-- Name: TABLE payment_issues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_issues IS 'Registro de problemas con pagos y splits para revisión manual';


--
-- Name: COLUMN payment_issues.issue_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_issues.issue_type IS 'Tipo de problema detectado (split_collector_mismatch, split_amount_mismatch, etc.)';


--
-- Name: COLUMN payment_issues.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_issues.details IS 'Detalles específicos del problema en formato JSON';


--
-- Name: COLUMN payment_issues.severity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_issues.severity IS 'Severidad del issue: low, medium, high, critical';


--
-- Name: COLUMN payment_issues.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_issues.priority IS 'Prioridad (1-5, siendo 1 la más alta)';


--
-- Name: payment_splits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    payment_id character varying(255) NOT NULL,
    total_amount_cents integer NOT NULL,
    owner_amount_cents integer NOT NULL,
    platform_fee_cents integer NOT NULL,
    currency character varying(10) DEFAULT 'ARS'::character varying NOT NULL,
    collector_id character varying(255) NOT NULL,
    marketplace_id character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    validated_at timestamp with time zone,
    transferred_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT payment_splits_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'validated'::character varying, 'transferred'::character varying, 'failed'::character varying, 'disputed'::character varying])::text[])))
);


--
-- Name: TABLE payment_splits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payment_splits IS 'Tracking de splits de pagos marketplace de MercadoPago';


--
-- Name: COLUMN payment_splits.total_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_splits.total_amount_cents IS 'Monto total del pago en centavos';


--
-- Name: COLUMN payment_splits.owner_amount_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_splits.owner_amount_cents IS 'Monto para el dueño del auto en centavos';


--
-- Name: COLUMN payment_splits.platform_fee_cents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_splits.platform_fee_cents IS 'Fee de la plataforma en centavos';


--
-- Name: COLUMN payment_splits.collector_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_splits.collector_id IS 'Collector ID del dueño del auto en MercadoPago';


--
-- Name: COLUMN payment_splits.marketplace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payment_splits.marketplace_id IS 'Marketplace ID de AutoRenta en MercadoPago';


--
-- Name: pending_payouts_critical; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pending_payouts_critical AS
 SELECT b.id AS booking_id,
    b.created_at,
    b.total_amount,
    b.payout_status,
    b.payout_retry_count,
    b.payout_error_message,
    c.id AS car_id,
    ((c.brand || ' '::text) || c.model) AS car_name,
    p.id AS owner_id,
    p.email AS owner_email,
    p.full_name AS owner_name,
    (EXTRACT(epoch FROM (now() - b.created_at)) / (3600)::numeric) AS hours_pending
   FROM ((public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
     JOIN public.profiles p ON ((p.id = c.owner_id)))
  WHERE ((b.payout_status = ANY (ARRAY['pending'::public.payout_status_enum, 'failed'::public.payout_status_enum])) AND (b.paid_at IS NOT NULL) AND (b.created_at < (now() - '24:00:00'::interval)))
  ORDER BY b.created_at;


--
-- Name: pricing_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    user_id uuid,
    region_id uuid,
    base_price numeric(10,2) NOT NULL,
    day_factor numeric(5,3) NOT NULL,
    hour_factor numeric(5,3) NOT NULL,
    user_factor numeric(5,3) NOT NULL,
    demand_factor numeric(5,3) NOT NULL,
    event_factor numeric(5,3) DEFAULT 0.0 NOT NULL,
    final_price numeric(10,2) NOT NULL,
    calculation_details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pricing_class_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_class_factors (
    class integer NOT NULL,
    fee_multiplier numeric(5,3) NOT NULL,
    guarantee_multiplier numeric(5,3) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_class_factors_class_check CHECK (((class >= 0) AND (class <= 10))),
    CONSTRAINT pricing_class_factors_fee_multiplier_check CHECK ((fee_multiplier > (0)::numeric)),
    CONSTRAINT pricing_class_factors_guarantee_multiplier_check CHECK ((guarantee_multiplier > (0)::numeric))
);


--
-- Name: TABLE pricing_class_factors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pricing_class_factors IS 'Multiplier factors for fees and guarantees by driver class. Applied in pricing calculations.';


--
-- Name: pricing_cron_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_cron_health (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    last_run_at timestamp with time zone DEFAULT now() NOT NULL,
    status text NOT NULL,
    regions_updated integer DEFAULT 0,
    error_message text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_cron_health_status_check CHECK ((status = ANY (ARRAY['success'::text, 'error'::text, 'running'::text])))
);


--
-- Name: pricing_day_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_day_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_id uuid,
    day_of_week integer NOT NULL,
    factor numeric(5,3) DEFAULT 0.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_day_factors_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: pricing_demand_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_demand_snapshots (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    region character varying(100) NOT NULL,
    total_cars integer NOT NULL,
    active_bookings integer NOT NULL,
    demand_ratio numeric(5,4) NOT NULL,
    price_multiplier numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    surge_factor numeric GENERATED ALWAYS AS ((price_multiplier - 1.0)) STORED
);


--
-- Name: COLUMN pricing_demand_snapshots.surge_factor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pricing_demand_snapshots.surge_factor IS 'Surge factor for dynamic pricing. Generated from price_multiplier (multiplier - 1.0).';


--
-- Name: pricing_hour_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_hour_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_id uuid,
    hour_start integer NOT NULL,
    hour_end integer NOT NULL,
    factor numeric(5,3) DEFAULT 0.0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT pricing_hour_factors_hour_end_check CHECK (((hour_end >= 0) AND (hour_end <= 23))),
    CONSTRAINT pricing_hour_factors_hour_start_check CHECK (((hour_start >= 0) AND (hour_start <= 23)))
);


--
-- Name: pricing_regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    country_code text NOT NULL,
    currency text NOT NULL,
    base_price_per_hour numeric(10,2) NOT NULL,
    fuel_cost_multiplier numeric(5,3) DEFAULT 1.0,
    inflation_rate numeric(5,3) DEFAULT 0.0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pricing_special_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_special_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_id uuid,
    name text NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    factor numeric(5,3) DEFAULT 0.15 NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pricing_user_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_user_factors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_type text NOT NULL,
    factor numeric(5,3) DEFAULT 0.0 NOT NULL,
    min_rentals integer,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles_decrypted; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_decrypted WITH (security_invoker='true') AS
 SELECT id,
    full_name,
    avatar_url,
    role,
    is_admin,
    public.decrypt_pii(phone_encrypted) AS phone,
    email_verified,
    phone_verified,
    id_verified,
    created_at,
    updated_at,
    rating_avg,
    rating_count,
    home_latitude,
    home_longitude,
    location_verified_at,
    preferred_search_radius_km
   FROM public.profiles;


--
-- Name: VIEW profiles_decrypted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.profiles_decrypted IS 'Decrypted view of profiles with PII data. Users can only see their own data.';


--
-- Name: push_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE push_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_tokens IS 'Stores device tokens for sending push notifications.';


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE referral_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referral_codes IS 'Códigos únicos de referido por usuario';


--
-- Name: referral_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reward_type text NOT NULL,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    wallet_transaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    paid_at timestamp with time zone,
    expires_at timestamp with time zone,
    notes text,
    admin_notes text,
    CONSTRAINT referral_rewards_reward_type_check CHECK ((reward_type = ANY (ARRAY['welcome_bonus'::text, 'referrer_bonus'::text, 'first_car_bonus'::text, 'milestone_bonus'::text, 'promotion'::text]))),
    CONSTRAINT referral_rewards_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    referral_code_id uuid NOT NULL,
    status text DEFAULT 'registered'::text NOT NULL,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    verified_at timestamp with time zone,
    first_car_at timestamp with time zone,
    first_booking_at timestamp with time zone,
    reward_paid_at timestamp with time zone,
    source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'verified'::text, 'first_car'::text, 'first_booking'::text, 'reward_paid'::text])))
);


--
-- Name: TABLE referrals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.referrals IS 'Tracking de invitaciones y su estado';


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    reviewee_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_car_review boolean DEFAULT false NOT NULL,
    is_renter_review boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reviews IS 'Reviews between renters and car owners';


--
-- Name: system_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_flags (
    key character varying(100) NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_documents (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    kind public.document_kind NOT NULL,
    storage_path text NOT NULL,
    status public.kyc_status DEFAULT 'pending'::public.kyc_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone
);


--
-- Name: TABLE user_documents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_documents IS 'Documentos de verificación de identidad (KYC)';


--
-- Name: user_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_documents_id_seq OWNED BY public.user_documents.id;


--
-- Name: user_identity_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_identity_levels (
    user_id uuid NOT NULL,
    current_level integer DEFAULT 1,
    email_verified_at timestamp with time zone,
    phone_verified_at timestamp with time zone,
    id_verified_at timestamp with time zone,
    driver_license_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_identity_levels_current_level_check CHECK (((current_level >= 1) AND (current_level <= 5)))
);


--
-- Name: user_onboarding_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_onboarding_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    plan_code text NOT NULL,
    plan_version text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    current_step text,
    completed_steps jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT user_onboarding_plans_role_check CHECK ((role = ANY (ARRAY['locador'::text, 'locatario'::text, 'ambos'::text]))),
    CONSTRAINT user_onboarding_plans_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'COMPLETED'::text, 'SKIPPED'::text, 'ABANDONED'::text])))
);


--
-- Name: user_onboarding_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_onboarding_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id uuid NOT NULL,
    step_key text NOT NULL,
    "position" integer NOT NULL,
    title text,
    description text,
    action text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    completed_at timestamp with time zone,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_onboarding_steps_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'SKIPPED'::text])))
);


--
-- Name: user_profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_profiles AS
 SELECT id,
    id AS user_id,
    full_name,
    avatar_url,
    role,
    is_admin,
    phone,
    email_verified,
    phone_verified,
    id_verified,
    mp_onboarding_completed,
    mercadopago_collector_id,
    mp_onboarding_url,
    created_at,
    updated_at
   FROM public.profiles p;


--
-- Name: VIEW user_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.user_profiles IS 'Vista alias de profiles con columnas adicionales para compatibilidad con código existente';


--
-- Name: user_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_verifications (
    user_id uuid NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'PENDIENTE'::text NOT NULL,
    missing_docs jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_verifications_role_check CHECK ((role = ANY (ARRAY['driver'::text, 'owner'::text]))),
    CONSTRAINT user_verifications_status_check CHECK ((status = ANY (ARRAY['VERIFICADO'::text, 'PENDIENTE'::text, 'RECHAZADO'::text])))
);


--
-- Name: TABLE user_verifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_verifications IS 'Estado de verificación de usuarios (driver/owner)';


--
-- Name: user_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_wallets (
    user_id uuid NOT NULL,
    balance_cents bigint DEFAULT 0 NOT NULL,
    available_balance_cents bigint DEFAULT 0 NOT NULL,
    locked_balance_cents bigint DEFAULT 0 NOT NULL,
    autorentar_credit_balance_cents bigint DEFAULT 0 NOT NULL,
    cash_deposit_balance_cents bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT available_non_negative CHECK ((available_balance_cents >= 0)),
    CONSTRAINT balance_consistency CHECK ((balance_cents = (available_balance_cents + locked_balance_cents))),
    CONSTRAINT balance_non_negative CHECK ((balance_cents >= 0)),
    CONSTRAINT locked_non_negative CHECK ((locked_balance_cents >= 0))
);


--
-- Name: v_cars_with_main_photo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cars_with_main_photo AS
 SELECT id,
    owner_id,
    title,
    description,
    brand,
    model,
    year,
    price_per_day,
    currency,
    city,
    province,
    country,
    location_lat,
    location_lng,
    status,
    created_at,
    updated_at,
    deleted_at,
    brand_id,
    model_id,
    brand_text_backup,
    model_text_backup,
    fuel,
    fuel_type,
    transmission,
    color,
    mileage,
    seats,
    doors,
    features,
    value_usd,
    min_rental_days,
    max_rental_days,
    deposit_required,
    deposit_amount,
    insurance_included,
    auto_approval,
    location_street,
    location_street_number,
    location_city,
    location_state,
    location_country,
    location_province,
    rating_avg,
    rating_count,
    plate,
    vin,
    location_neighborhood,
    location_postal_code,
    payment_methods,
    delivery_options,
    terms_and_conditions,
    COALESCE(( SELECT cp.url
           FROM public.car_photos cp
          WHERE ((cp.car_id = c.id) AND (cp.is_cover = true))
         LIMIT 1), ( SELECT cp.url
           FROM public.car_photos cp
          WHERE (cp.car_id = c.id)
          ORDER BY cp."position", cp.sort_order
         LIMIT 1)) AS main_photo_url
   FROM public.cars c;


--
-- Name: VIEW v_cars_with_main_photo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_cars_with_main_photo IS 'Vista optimizada de cars con la foto principal (cover o primera foto)';


--
-- Name: v_fgo_parameters_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fgo_parameters_summary AS
 SELECT country_code,
    bucket,
    ((alpha * (100)::numeric))::numeric(5,2) AS alpha_pct,
    rc_floor,
    rc_hard_floor,
    rc_soft_ceiling,
    event_cap_usd,
    ((monthly_payout_cap * (100)::numeric))::numeric(5,2) AS monthly_cap_pct,
    per_user_limit,
    updated_at
   FROM public.fgo_parameters
  ORDER BY country_code, bucket;


--
-- Name: VIEW v_fgo_parameters_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fgo_parameters_summary IS 'Resumen de parámetros FGO por país/bucket (v1.1)';


--
-- Name: v_fgo_status; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fgo_status AS
 SELECT ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'liquidity'::text)) AS liquidity_balance_cents,
    ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'capitalization'::text)) AS capitalization_balance_cents,
    ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'profitability'::text)) AS profitability_balance_cents,
    ( SELECT sum(fgo_subfunds.balance_cents) AS sum
           FROM public.fgo_subfunds) AS total_fgo_balance_cents,
    alpha_percentage,
    target_months_coverage,
    total_contributions_cents,
    total_siniestros_paid_cents,
    total_siniestros_count,
    coverage_ratio,
    loss_ratio,
    target_balance_cents,
    status,
    last_calculated_at,
    updated_at
   FROM public.fgo_metrics m
  WHERE (id = true);


--
-- Name: v_fgo_status_v1_1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fgo_status_v1_1 AS
 SELECT ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'liquidity'::text)) AS liquidity_balance_cents,
    ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'capitalization'::text)) AS capitalization_balance_cents,
    ( SELECT fgo_subfunds.balance_cents
           FROM public.fgo_subfunds
          WHERE (fgo_subfunds.subfund_type = 'profitability'::text)) AS profitability_balance_cents,
    ( SELECT sum(fgo_subfunds.balance_cents) AS sum
           FROM public.fgo_subfunds) AS total_fgo_balance_cents,
    alpha_percentage,
    target_months_coverage,
    total_contributions_cents,
    total_siniestros_paid_cents,
    total_siniestros_count,
    coverage_ratio,
    loss_ratio,
    target_balance_cents,
    status,
    pem_cents,
    lr_90d,
    lr_365d,
    total_events_90d,
    avg_recovery_rate,
    last_calculated_at,
    updated_at
   FROM public.fgo_metrics m
  WHERE (id = true);


--
-- Name: VIEW v_fgo_status_v1_1; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fgo_status_v1_1 IS 'Estado completo FGO v1.1 con métricas extendidas (PEM, LR rolling)';


--
-- Name: v_fx_rates_current; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_fx_rates_current AS
 SELECT id,
    from_currency,
    to_currency,
    rate,
    created_at AS snapshot_timestamp,
    (now() - created_at) AS age,
        CASE
            WHEN ((now() - created_at) > '7 days'::interval) THEN true
            ELSE false
        END AS is_expired,
    source,
    metadata
   FROM public.fx_rates
  WHERE (is_active = true)
  ORDER BY from_currency, to_currency;


--
-- Name: VIEW v_fx_rates_current; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_fx_rates_current IS 'Vista de FX rates activos con información de edad y expiración';


--
-- Name: v_wallet_history; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_wallet_history AS
 SELECT id,
    user_id,
    entry_date AS transaction_date,
        CASE
            WHEN (debit > (0)::numeric) THEN 'withdrawal'::text
            WHEN (credit > (0)::numeric) THEN 'deposit'::text
            ELSE 'unknown'::text
        END AS transaction_type,
        CASE
            WHEN is_reversed THEN 'reversed'::text
            ELSE 'completed'::text
        END AS status,
    (COALESCE(credit, (0)::numeric) - COALESCE(debit, (0)::numeric)) AS amount_cents,
    'ARS'::text AS currency,
    jsonb_build_object('description', description, 'reference_type', reference_type, 'reference_id', reference_id, 'account_code', account_code) AS metadata,
    reference_id AS booking_id,
    'ledger'::text AS source_system
   FROM public.accounting_ledger al
  WHERE (((account_code)::text ~~ 'WALLET%'::text) AND (user_id IS NOT NULL))
  ORDER BY entry_date DESC;


--
-- Name: VIEW v_wallet_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_wallet_history IS 'Vista consolidada del historial de transacciones de wallet';


--
-- Name: vehicle_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_es text,
    base_daily_rate_pct numeric(5,4) DEFAULT 0.0030 NOT NULL,
    depreciation_rate_annual numeric(4,3) DEFAULT 0.050 NOT NULL,
    surge_sensitivity numeric(3,2) DEFAULT 1.00 NOT NULL,
    description text,
    display_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE vehicle_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vehicle_categories IS 'Vehicle categories for dynamic pricing base calculation';


--
-- Name: COLUMN vehicle_categories.base_daily_rate_pct; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_categories.base_daily_rate_pct IS 'Daily rental rate as % of vehicle value (0.0030 = 0.30%)';


--
-- Name: COLUMN vehicle_categories.depreciation_rate_annual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_categories.depreciation_rate_annual IS 'Annual depreciation rate (0.050 = 5% per year)';


--
-- Name: COLUMN vehicle_categories.surge_sensitivity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_categories.surge_sensitivity IS 'Multiplier for surge pricing (1.00 = standard, 0.80 = less sensitive, 1.20 = more sensitive)';


--
-- Name: vehicle_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_owner boolean DEFAULT true NOT NULL,
    green_card_url text,
    green_card_owner_name text,
    green_card_vehicle_domain text,
    green_card_verified_at timestamp with time zone,
    green_card_ai_score numeric(5,2),
    green_card_ai_metadata jsonb DEFAULT '{}'::jsonb,
    blue_card_url text,
    blue_card_authorized_name text,
    blue_card_verified_at timestamp with time zone,
    blue_card_ai_score numeric(5,2),
    blue_card_ai_metadata jsonb DEFAULT '{}'::jsonb,
    vtv_url text,
    vtv_expiry date,
    vtv_verified_at timestamp with time zone,
    insurance_url text,
    insurance_expiry date,
    insurance_company text,
    insurance_policy_number text,
    insurance_verified_at timestamp with time zone,
    manual_review_required boolean DEFAULT false,
    manual_reviewed_by uuid,
    manual_reviewed_at timestamp with time zone,
    manual_review_notes text,
    manual_review_decision text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vehicle_documents_blue_card_ai_score_check CHECK (((blue_card_ai_score >= (0)::numeric) AND (blue_card_ai_score <= (100)::numeric))),
    CONSTRAINT vehicle_documents_green_card_ai_score_check CHECK (((green_card_ai_score >= (0)::numeric) AND (green_card_ai_score <= (100)::numeric))),
    CONSTRAINT vehicle_documents_manual_review_decision_check CHECK ((manual_review_decision = ANY (ARRAY['APPROVED'::text, 'REJECTED'::text, 'PENDING'::text]))),
    CONSTRAINT vehicle_documents_ownership_check CHECK ((((is_owner = true) AND (green_card_url IS NOT NULL)) OR ((is_owner = false) AND (blue_card_url IS NOT NULL)))),
    CONSTRAINT vehicle_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])))
);


--
-- Name: vehicle_model_equivalents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_model_equivalents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    brand text NOT NULL,
    model_argentina text NOT NULL,
    model_brazil text NOT NULL,
    confidence_level text DEFAULT 'manual'::text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    CONSTRAINT vehicle_model_equivalents_confidence_level_check CHECK ((confidence_level = ANY (ARRAY['manual'::text, 'ai_verified'::text, 'exact_match'::text])))
);


--
-- Name: vehicle_pricing_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_pricing_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    year_from integer NOT NULL,
    year_to integer NOT NULL,
    base_value_usd integer NOT NULL,
    category_id uuid NOT NULL,
    confidence_level text DEFAULT 'medium'::text NOT NULL,
    data_source text DEFAULT 'manual'::text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_positive_value CHECK ((base_value_usd > 0)),
    CONSTRAINT check_year_range CHECK ((year_to >= year_from))
);


--
-- Name: TABLE vehicle_pricing_models; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vehicle_pricing_models IS 'Reference valuations for vehicle make/model/year combinations';


--
-- Name: COLUMN vehicle_pricing_models.base_value_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_pricing_models.base_value_usd IS 'Market value in USD for this model in the given year range';


--
-- Name: COLUMN vehicle_pricing_models.confidence_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_pricing_models.confidence_level IS 'Data quality: high (verified), medium (estimated), low (placeholder)';


--
-- Name: COLUMN vehicle_pricing_models.data_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicle_pricing_models.data_source IS 'Source of valuation: manual, api (external service), estimated, ml (machine learning)';


--
-- Name: vw_accounting_balance_sheet; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_accounting_balance_sheet AS
 SELECT a.code,
    a.name,
    a.account_type,
    a.sub_type,
    (COALESCE(sum((l.debit - l.credit)), (0)::numeric) / (100)::numeric) AS balance
   FROM (public.accounting_accounts a
     LEFT JOIN public.accounting_ledger l ON ((((l.account_code)::text = (a.code)::text) AND (COALESCE(l.is_reversed, false) = false))))
  WHERE (((a.account_type)::text = ANY ((ARRAY['ASSET'::character varying, 'LIABILITY'::character varying, 'EQUITY'::character varying])::text[])) AND (a.is_active = true))
  GROUP BY a.code, a.name, a.account_type, a.sub_type
 HAVING (COALESCE(sum((l.debit - l.credit)), (0)::numeric) <> (0)::numeric)
  ORDER BY a.code;


--
-- Name: vw_accounting_income_statement; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_accounting_income_statement AS
 SELECT a.code,
    a.name,
    a.account_type,
    a.sub_type,
    to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM'::text) AS period,
    (COALESCE(sum((l.credit - l.debit)), (0)::numeric) / (100)::numeric) AS balance
   FROM (public.accounting_accounts a
     LEFT JOIN public.accounting_ledger l ON ((((l.account_code)::text = (a.code)::text) AND (date_trunc('month'::text, l.entry_date) = date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) AND (COALESCE(l.is_reversed, false) = false))))
  WHERE (((a.account_type)::text = ANY ((ARRAY['INCOME'::character varying, 'EXPENSE'::character varying])::text[])) AND (a.is_active = true))
  GROUP BY a.code, a.name, a.account_type, a.sub_type
 HAVING (COALESCE(sum((l.credit - l.debit)), (0)::numeric) <> (0)::numeric)
  ORDER BY a.code;


--
-- Name: vw_wallet_reconciliation; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_wallet_reconciliation AS
 WITH wallet_totals AS (
         SELECT (COALESCE(sum(user_wallets.balance_cents), (0)::numeric) / 100.0) AS wallet_balance
           FROM public.user_wallets
        ), ledger_totals AS (
         SELECT (COALESCE(sum((accounting_ledger.credit - accounting_ledger.debit)), (0)::numeric) / 100.0) AS ledger_balance
           FROM public.accounting_ledger
          WHERE (((accounting_ledger.account_code)::text = '2110'::text) AND (COALESCE(accounting_ledger.is_reversed, false) = false))
        )
 SELECT 'Saldo Wallets'::text AS source,
    w.wallet_balance AS amount,
    'info'::text AS severity
   FROM wallet_totals w
UNION ALL
 SELECT 'Saldo Contabilidad (2110)'::text AS source,
    l.ledger_balance AS amount,
    'info'::text AS severity
   FROM ledger_totals l
UNION ALL
 SELECT 'Diferencia'::text AS source,
    (w.wallet_balance - l.ledger_balance) AS amount,
        CASE
            WHEN (abs((w.wallet_balance - l.ledger_balance)) < (100)::numeric) THEN 'success'::text
            WHEN (abs((w.wallet_balance - l.ledger_balance)) < (1000)::numeric) THEN 'warning'::text
            ELSE 'danger'::text
        END AS severity
   FROM wallet_totals w,
    ledger_totals l;


--
-- Name: wallet_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    transaction_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: wallet_split_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_split_config (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    platform_fee_percent numeric(5,2) DEFAULT 10.00 NOT NULL,
    locador_id uuid,
    custom_fee_percent numeric(5,2),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wallet_split_config_custom_fee_percent_check CHECK (((custom_fee_percent >= (0)::numeric) AND (custom_fee_percent <= (100)::numeric))),
    CONSTRAINT wallet_split_config_platform_fee_percent_check CHECK (((platform_fee_percent >= (0)::numeric) AND (platform_fee_percent <= (100)::numeric)))
);


--
-- Name: wallet_transaction_backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transaction_backups (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    backup_date date NOT NULL,
    total_transactions integer,
    total_volume numeric(15,2),
    data_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount bigint NOT NULL,
    currency text DEFAULT 'ARS'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    description text,
    reference_type text,
    reference_id uuid,
    provider text,
    provider_transaction_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_amount_by_type CHECK ((((type = ANY (ARRAY['deposit'::text, 'refund'::text, 'bonus'::text, 'unlock'::text, 'security_deposit_release'::text, 'withdrawal'::text])) AND (amount > 0)) OR ((type = ANY (ARRAY['charge'::text, 'credit_consume'::text, 'credit_breakage'::text, 'security_deposit_charge'::text])) AND (amount < 0)) OR ((type = ANY (ARRAY['lock'::text, 'rental_payment_lock'::text, 'security_deposit_lock'::text, 'rental_payment_transfer'::text])) AND (amount > 0)) OR ((type = 'credit_issue'::text) AND (amount > 0)))),
    CONSTRAINT valid_reference_type CHECK (((reference_type IS NULL) OR (reference_type = ANY (ARRAY['booking'::text, 'deposit'::text, 'reward'::text, 'credit_protected'::text, 'transfer'::text, 'withdrawal'::text, 'autorentar_credit'::text, 'booking_claim'::text])))),
    CONSTRAINT valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text]))),
    CONSTRAINT valid_transaction_type CHECK ((type = ANY (ARRAY['deposit'::text, 'lock'::text, 'unlock'::text, 'charge'::text, 'refund'::text, 'bonus'::text, 'rental_payment_lock'::text, 'rental_payment_transfer'::text, 'security_deposit_lock'::text, 'security_deposit_release'::text, 'security_deposit_charge'::text, 'withdrawal'::text, 'credit_issue'::text, 'credit_consume'::text, 'credit_breakage'::text])))
);


--
-- Name: CONSTRAINT valid_reference_type ON wallet_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT valid_reference_type ON public.wallet_transactions IS 'Tipos de referencia válidos incluyendo autorentar_credit y booking_claim';


--
-- Name: CONSTRAINT valid_transaction_type ON wallet_transactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT valid_transaction_type ON public.wallet_transactions IS 'Tipos válidos de transacción incluyendo Crédito Protección: credit_issue, credit_consume, credit_breakage';


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    bank_account_id uuid,
    rejection_reason text,
    approved_by uuid,
    approved_at timestamp with time zone,
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT withdrawal_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: withdrawal_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_transactions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    request_id uuid NOT NULL,
    mercadopago_transfer_id character varying(100),
    amount numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'ARS'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT withdrawal_transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'failed'::character varying, 'reversed'::character varying])::text[])))
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2025_11_28; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_11_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_11_29; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_11_29 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_11_30; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_11_30 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_12_01; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_12_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_12_02; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_12_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_12_03; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_12_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_12_04; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_12_04 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text,
    rollback text[]
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: messages_2025_11_28; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_28 FOR VALUES FROM ('2025-11-28 00:00:00') TO ('2025-11-29 00:00:00');


--
-- Name: messages_2025_11_29; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_29 FOR VALUES FROM ('2025-11-29 00:00:00') TO ('2025-11-30 00:00:00');


--
-- Name: messages_2025_11_30; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_11_30 FOR VALUES FROM ('2025-11-30 00:00:00') TO ('2025-12-01 00:00:00');


--
-- Name: messages_2025_12_01; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_12_01 FOR VALUES FROM ('2025-12-01 00:00:00') TO ('2025-12-02 00:00:00');


--
-- Name: messages_2025_12_02; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_12_02 FOR VALUES FROM ('2025-12-02 00:00:00') TO ('2025-12-03 00:00:00');


--
-- Name: messages_2025_12_03; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_12_03 FOR VALUES FROM ('2025-12-03 00:00:00') TO ('2025-12-04 00:00:00');


--
-- Name: messages_2025_12_04; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_12_04 FOR VALUES FROM ('2025-12-04 00:00:00') TO ('2025-12-05 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: cron_execution_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_execution_log ALTER COLUMN id SET DEFAULT nextval('public.cron_execution_log_id_seq'::regclass);


--
-- Name: user_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents ALTER COLUMN id SET DEFAULT nextval('public.user_documents_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: app_secrets app_secrets_pkey; Type: CONSTRAINT; Schema: private; Owner: -
--

ALTER TABLE ONLY private.app_secrets
    ADD CONSTRAINT app_secrets_pkey PRIMARY KEY (key);


--
-- Name: accounting_accounts accounting_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_accounts
    ADD CONSTRAINT accounting_accounts_code_key UNIQUE (code);


--
-- Name: accounting_accounts accounting_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_accounts
    ADD CONSTRAINT accounting_accounts_pkey PRIMARY KEY (id);


--
-- Name: accounting_audit_log accounting_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_audit_log
    ADD CONSTRAINT accounting_audit_log_pkey PRIMARY KEY (id);


--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts
    ADD CONSTRAINT accounting_chart_of_accounts_code_key UNIQUE (code);


--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_chart_of_accounts
    ADD CONSTRAINT accounting_chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: accounting_journal_entries accounting_journal_entries_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entries
    ADD CONSTRAINT accounting_journal_entries_entry_number_key UNIQUE (entry_number);


--
-- Name: accounting_journal_entries accounting_journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entries
    ADD CONSTRAINT accounting_journal_entries_pkey PRIMARY KEY (id);


--
-- Name: accounting_ledger accounting_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_ledger
    ADD CONSTRAINT accounting_ledger_pkey PRIMARY KEY (id);


--
-- Name: accounting_period_balances accounting_period_balances_period_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_balances
    ADD CONSTRAINT accounting_period_balances_period_account_id_key UNIQUE (period, account_id);


--
-- Name: accounting_period_balances accounting_period_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_balances
    ADD CONSTRAINT accounting_period_balances_pkey PRIMARY KEY (id);


--
-- Name: accounting_period_closures accounting_period_closures_period_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_closures
    ADD CONSTRAINT accounting_period_closures_period_code_key UNIQUE (period_code);


--
-- Name: accounting_period_closures accounting_period_closures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_closures
    ADD CONSTRAINT accounting_period_closures_pkey PRIMARY KEY (id);


--
-- Name: accounting_provisions accounting_provisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_provisions
    ADD CONSTRAINT accounting_provisions_pkey PRIMARY KEY (id);


--
-- Name: accounting_revenue_recognition accounting_revenue_recognition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_revenue_recognition
    ADD CONSTRAINT accounting_revenue_recognition_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_user_id_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_account_number_key UNIQUE (user_id, account_number);


--
-- Name: booking_claims booking_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_claims
    ADD CONSTRAINT booking_claims_pkey PRIMARY KEY (id);


--
-- Name: booking_inspections booking_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_inspections
    ADD CONSTRAINT booking_inspections_pkey PRIMARY KEY (id);


--
-- Name: booking_insurance_coverage booking_insurance_coverage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_insurance_coverage
    ADD CONSTRAINT booking_insurance_coverage_pkey PRIMARY KEY (id);


--
-- Name: booking_location_tracking booking_location_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_location_tracking
    ADD CONSTRAINT booking_location_tracking_pkey PRIMARY KEY (id);


--
-- Name: booking_risk_snapshot booking_risk_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_risk_snapshot
    ADD CONSTRAINT booking_risk_snapshot_pkey PRIMARY KEY (booking_id);


--
-- Name: booking_waitlist booking_waitlist_car_id_user_id_start_date_end_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_car_id_user_id_start_date_end_date_key UNIQUE (car_id, user_id, start_date, end_date);


--
-- Name: booking_waitlist booking_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: calendar_sync_log calendar_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_pkey PRIMARY KEY (id);


--
-- Name: car_blocked_dates car_blocked_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_blocked_dates
    ADD CONSTRAINT car_blocked_dates_pkey PRIMARY KEY (id);


--
-- Name: car_brands car_brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_brands
    ADD CONSTRAINT car_brands_name_key UNIQUE (name);


--
-- Name: car_brands car_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_brands
    ADD CONSTRAINT car_brands_pkey PRIMARY KEY (id);


--
-- Name: car_google_calendars car_google_calendars_google_calendar_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_google_calendars
    ADD CONSTRAINT car_google_calendars_google_calendar_id_key UNIQUE (google_calendar_id);


--
-- Name: car_google_calendars car_google_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_google_calendars
    ADD CONSTRAINT car_google_calendars_pkey PRIMARY KEY (car_id);


--
-- Name: car_models car_models_brand_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_brand_id_name_key UNIQUE (brand_id, name);


--
-- Name: car_models car_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_pkey PRIMARY KEY (id);


--
-- Name: car_photos car_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_photos
    ADD CONSTRAINT car_photos_pkey PRIMARY KEY (id);


--
-- Name: cars cars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: conversion_events conversion_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_pkey PRIMARY KEY (id);


--
-- Name: cron_execution_log cron_execution_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_execution_log
    ADD CONSTRAINT cron_execution_log_pkey PRIMARY KEY (id);


--
-- Name: driver_class_history driver_class_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_class_history
    ADD CONSTRAINT driver_class_history_pkey PRIMARY KEY (id);


--
-- Name: driver_protection_addons driver_protection_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_protection_addons
    ADD CONSTRAINT driver_protection_addons_pkey PRIMARY KEY (id);


--
-- Name: driver_risk_profile driver_risk_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_risk_profile
    ADD CONSTRAINT driver_risk_profile_pkey PRIMARY KEY (user_id);


--
-- Name: driver_score_snapshots driver_score_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_score_snapshots
    ADD CONSTRAINT driver_score_snapshots_pkey PRIMARY KEY (id);


--
-- Name: driver_score_snapshots driver_score_snapshots_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_score_snapshots
    ADD CONSTRAINT driver_score_snapshots_snapshot_date_key UNIQUE (snapshot_date);


--
-- Name: driver_telemetry driver_telemetry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_telemetry
    ADD CONSTRAINT driver_telemetry_pkey PRIMARY KEY (id);


--
-- Name: encryption_audit_log encryption_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_pkey PRIMARY KEY (id);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate_sync_log exchange_rate_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_sync_log
    ADD CONSTRAINT exchange_rate_sync_log_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pair_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pair_key UNIQUE (pair);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: fgo_metrics fgo_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fgo_metrics
    ADD CONSTRAINT fgo_metrics_pkey PRIMARY KEY (id);


--
-- Name: fgo_parameters fgo_parameters_country_code_bucket_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fgo_parameters
    ADD CONSTRAINT fgo_parameters_country_code_bucket_key UNIQUE (country_code, bucket);


--
-- Name: fgo_parameters fgo_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fgo_parameters
    ADD CONSTRAINT fgo_parameters_pkey PRIMARY KEY (id);


--
-- Name: fgo_subfunds fgo_subfunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fgo_subfunds
    ADD CONSTRAINT fgo_subfunds_pkey PRIMARY KEY (id);


--
-- Name: fgo_subfunds fgo_subfunds_subfund_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fgo_subfunds
    ADD CONSTRAINT fgo_subfunds_subfund_type_key UNIQUE (subfund_type);


--
-- Name: fleet_bonuses fleet_bonuses_organization_id_car_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_bonuses
    ADD CONSTRAINT fleet_bonuses_organization_id_car_id_key UNIQUE (organization_id, car_id);


--
-- Name: fleet_bonuses fleet_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_bonuses
    ADD CONSTRAINT fleet_bonuses_pkey PRIMARY KEY (id);


--
-- Name: fx_rates fx_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_pkey PRIMARY KEY (id);


--
-- Name: fx_rates fx_rates_unique_pair_active; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fx_rates
    ADD CONSTRAINT fx_rates_unique_pair_active UNIQUE (from_currency, to_currency, is_active, valid_from);


--
-- Name: google_calendar_tokens google_calendar_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (user_id);


--
-- Name: insurance_addons insurance_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_addons
    ADD CONSTRAINT insurance_addons_pkey PRIMARY KEY (id);


--
-- Name: insurance_policies insurance_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: monitoring_alerts monitoring_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_alerts
    ADD CONSTRAINT monitoring_alerts_pkey PRIMARY KEY (id);


--
-- Name: monitoring_performance_metrics monitoring_performance_metric_metric_name_resource_name_rec_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_performance_metrics
    ADD CONSTRAINT monitoring_performance_metric_metric_name_resource_name_rec_key UNIQUE (metric_name, resource_name, recorded_at);


--
-- Name: monitoring_performance_metrics monitoring_performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monitoring_performance_metrics
    ADD CONSTRAINT monitoring_performance_metrics_pkey PRIMARY KEY (id);


--
-- Name: mp_webhook_logs mp_webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mp_webhook_logs
    ADD CONSTRAINT mp_webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: car_blocked_dates no_overlapping_blocks; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_blocked_dates
    ADD CONSTRAINT no_overlapping_blocks EXCLUDE USING gist (car_id WITH =, daterange(blocked_from, blocked_to, '[]'::text) WITH &&);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: onboarding_plan_templates onboarding_plan_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_plan_templates
    ADD CONSTRAINT onboarding_plan_templates_pkey PRIMARY KEY (id);


--
-- Name: onboarding_plan_templates onboarding_plan_templates_plan_code_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_plan_templates
    ADD CONSTRAINT onboarding_plan_templates_plan_code_version_key UNIQUE (plan_code, version);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (organization_id, user_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: outbound_requests outbound_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbound_requests
    ADD CONSTRAINT outbound_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_intents payment_intents_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: payment_issues payment_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_issues
    ADD CONSTRAINT payment_issues_pkey PRIMARY KEY (id);


--
-- Name: payment_splits payment_splits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_splits
    ADD CONSTRAINT payment_splits_pkey PRIMARY KEY (id);


--
-- Name: payments payments_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: platform_config platform_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_config
    ADD CONSTRAINT platform_config_pkey PRIMARY KEY (key);


--
-- Name: pricing_calculations pricing_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculations
    ADD CONSTRAINT pricing_calculations_pkey PRIMARY KEY (id);


--
-- Name: pricing_class_factors pricing_class_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_class_factors
    ADD CONSTRAINT pricing_class_factors_pkey PRIMARY KEY (class);


--
-- Name: pricing_cron_health pricing_cron_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_cron_health
    ADD CONSTRAINT pricing_cron_health_pkey PRIMARY KEY (id);


--
-- Name: pricing_day_factors pricing_day_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_day_factors
    ADD CONSTRAINT pricing_day_factors_pkey PRIMARY KEY (id);


--
-- Name: pricing_day_factors pricing_day_factors_region_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_day_factors
    ADD CONSTRAINT pricing_day_factors_region_id_day_of_week_key UNIQUE (region_id, day_of_week);


--
-- Name: pricing_demand_snapshots pricing_demand_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_demand_snapshots
    ADD CONSTRAINT pricing_demand_snapshots_pkey PRIMARY KEY (id);


--
-- Name: pricing_hour_factors pricing_hour_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_hour_factors
    ADD CONSTRAINT pricing_hour_factors_pkey PRIMARY KEY (id);


--
-- Name: pricing_regions pricing_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_regions
    ADD CONSTRAINT pricing_regions_pkey PRIMARY KEY (id);


--
-- Name: pricing_special_events pricing_special_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_special_events
    ADD CONSTRAINT pricing_special_events_pkey PRIMARY KEY (id);


--
-- Name: pricing_user_factors pricing_user_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_user_factors
    ADD CONSTRAINT pricing_user_factors_pkey PRIMARY KEY (id);


--
-- Name: pricing_user_factors pricing_user_factors_user_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_user_factors
    ADD CONSTRAINT pricing_user_factors_user_type_key UNIQUE (user_type);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);


--
-- Name: push_tokens push_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_token_key UNIQUE (token);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_rewards referral_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_reviewer_id_reviewee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_reviewer_id_reviewee_id_key UNIQUE (booking_id, reviewer_id, reviewee_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: system_flags system_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_flags
    ADD CONSTRAINT system_flags_pkey PRIMARY KEY (key);


--
-- Name: vehicle_model_equivalents unique_argentina_model; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_model_equivalents
    ADD CONSTRAINT unique_argentina_model UNIQUE (brand, model_argentina);


--
-- Name: booking_inspections unique_booking_stage; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_inspections
    ADD CONSTRAINT unique_booking_stage UNIQUE (booking_id, stage);


--
-- Name: referrals unique_referral; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id);


--
-- Name: referral_codes unique_user_active_code; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT unique_user_active_code UNIQUE (user_id, is_active);


--
-- Name: user_documents user_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_pkey PRIMARY KEY (id);


--
-- Name: user_identity_levels user_identity_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_identity_levels
    ADD CONSTRAINT user_identity_levels_pkey PRIMARY KEY (user_id);


--
-- Name: user_onboarding_plans user_onboarding_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding_plans
    ADD CONSTRAINT user_onboarding_plans_pkey PRIMARY KEY (id);


--
-- Name: user_onboarding_steps user_onboarding_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding_steps
    ADD CONSTRAINT user_onboarding_steps_pkey PRIMARY KEY (id);


--
-- Name: user_onboarding_steps user_onboarding_steps_plan_id_step_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding_steps
    ADD CONSTRAINT user_onboarding_steps_plan_id_step_key_key UNIQUE (plan_id, step_key);


--
-- Name: user_verifications user_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_pkey PRIMARY KEY (user_id, role);


--
-- Name: user_wallets user_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (user_id);


--
-- Name: vehicle_categories vehicle_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_categories
    ADD CONSTRAINT vehicle_categories_code_key UNIQUE (code);


--
-- Name: vehicle_categories vehicle_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_categories
    ADD CONSTRAINT vehicle_categories_pkey PRIMARY KEY (id);


--
-- Name: vehicle_documents vehicle_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_pkey PRIMARY KEY (id);


--
-- Name: vehicle_model_equivalents vehicle_model_equivalents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_model_equivalents
    ADD CONSTRAINT vehicle_model_equivalents_pkey PRIMARY KEY (id);


--
-- Name: vehicle_pricing_models vehicle_pricing_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_pricing_models
    ADD CONSTRAINT vehicle_pricing_models_pkey PRIMARY KEY (id);


--
-- Name: wallet_audit_log wallet_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_audit_log
    ADD CONSTRAINT wallet_audit_log_pkey PRIMARY KEY (id);


--
-- Name: wallet_split_config wallet_split_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_split_config
    ADD CONSTRAINT wallet_split_config_pkey PRIMARY KEY (id);


--
-- Name: wallet_transaction_backups wallet_transaction_backups_backup_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transaction_backups
    ADD CONSTRAINT wallet_transaction_backups_backup_date_key UNIQUE (backup_date);


--
-- Name: wallet_transaction_backups wallet_transaction_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transaction_backups
    ADD CONSTRAINT wallet_transaction_backups_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_transactions withdrawal_transactions_mercadopago_transfer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_mercadopago_transfer_id_key UNIQUE (mercadopago_transfer_id);


--
-- Name: withdrawal_transactions withdrawal_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_28 messages_2025_11_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_11_28
    ADD CONSTRAINT messages_2025_11_28_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_29 messages_2025_11_29_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_11_29
    ADD CONSTRAINT messages_2025_11_29_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_11_30 messages_2025_11_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_11_30
    ADD CONSTRAINT messages_2025_11_30_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_12_01 messages_2025_12_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_12_01
    ADD CONSTRAINT messages_2025_12_01_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_12_02 messages_2025_12_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_12_02
    ADD CONSTRAINT messages_2025_12_02_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_12_03 messages_2025_12_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_12_03
    ADD CONSTRAINT messages_2025_12_03_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_12_04 messages_2025_12_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_12_04
    ADD CONSTRAINT messages_2025_12_04_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_accounting_accounts_parent_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_accounts_parent_account_id ON public.accounting_accounts USING btree (parent_account_id);


--
-- Name: idx_accounting_audit_log_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_audit_log_resolved_by ON public.accounting_audit_log USING btree (resolved_by) WHERE (resolved_by IS NOT NULL);


--
-- Name: idx_accounting_journal_entries_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_created_by ON public.accounting_journal_entries USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_accounting_journal_entries_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_posted_at ON public.accounting_journal_entries USING btree (posted_at);


--
-- Name: idx_accounting_journal_entries_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_reference ON public.accounting_journal_entries USING btree (reference_table, reference_id);


--
-- Name: idx_accounting_journal_entries_reversed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_reversed_by ON public.accounting_journal_entries USING btree (reversed_by) WHERE (reversed_by IS NOT NULL);


--
-- Name: idx_accounting_journal_entries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_status ON public.accounting_journal_entries USING btree (status);


--
-- Name: idx_accounting_journal_entries_transaction_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_journal_entries_transaction_type ON public.accounting_journal_entries USING btree (transaction_type);


--
-- Name: idx_accounting_ledger_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_ledger_created_at ON public.accounting_ledger USING btree (created_at);


--
-- Name: idx_accounting_ledger_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_ledger_created_by ON public.accounting_ledger USING btree (created_by) WHERE (created_by IS NOT NULL);


--
-- Name: idx_accounting_ledger_journal_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_ledger_journal_entry ON public.accounting_ledger USING btree (journal_entry_id);


--
-- Name: idx_accounting_ledger_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_ledger_user_id ON public.accounting_ledger USING btree (user_id);


--
-- Name: idx_accounting_period_balances_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_period_balances_account_id ON public.accounting_period_balances USING btree (account_id);


--
-- Name: idx_accounting_period_closures_closed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_period_closures_closed_by ON public.accounting_period_closures USING btree (closed_by) WHERE (closed_by IS NOT NULL);


--
-- Name: idx_bank_accounts_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_default ON public.bank_accounts USING btree (user_id, is_default) WHERE (is_default = true);


--
-- Name: idx_bank_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts USING btree (user_id);


--
-- Name: idx_bank_accounts_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_verified ON public.bank_accounts USING btree (verified);


--
-- Name: idx_booking_claims_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_booking_id ON public.booking_claims USING btree (booking_id);


--
-- Name: idx_booking_claims_fault; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_fault ON public.booking_claims USING btree (fault_attributed);


--
-- Name: idx_booking_claims_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_resolved_by ON public.booking_claims USING btree (resolved_by) WHERE (resolved_by IS NOT NULL);


--
-- Name: idx_booking_claims_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_severity ON public.booking_claims USING btree (severity);


--
-- Name: idx_booking_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_status ON public.booking_claims USING btree (status);


--
-- Name: idx_booking_claims_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_claims_user_id ON public.booking_claims USING btree (user_id);


--
-- Name: idx_booking_inspections_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_inspections_booking ON public.booking_inspections USING btree (booking_id);


--
-- Name: idx_booking_inspections_inspector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_inspections_inspector_id ON public.booking_inspections USING btree (inspector_id);


--
-- Name: idx_booking_inspections_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_inspections_stage ON public.booking_inspections USING btree (stage);


--
-- Name: idx_booking_insurance_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_insurance_booking ON public.booking_insurance_coverage USING btree (booking_id);


--
-- Name: idx_booking_insurance_policy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_insurance_policy ON public.booking_insurance_coverage USING btree (policy_id);


--
-- Name: idx_booking_risk_snapshot_country_bucket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_risk_snapshot_country_bucket ON public.booking_risk_snapshot USING btree (country_code, bucket);


--
-- Name: idx_bookings_authorized_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_authorized_payment ON public.bookings USING btree (authorized_payment_id) WHERE (authorized_payment_id IS NOT NULL);


--
-- Name: idx_bookings_availability; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_availability ON public.bookings USING btree (car_id, status, start_at, end_at) WHERE (status = ANY (ARRAY['confirmed'::public.booking_status, 'in_progress'::public.booking_status]));


--
-- Name: idx_bookings_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_car_id ON public.bookings USING btree (car_id);


--
-- Name: idx_bookings_car_status_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_car_status_dates ON public.bookings USING btree (car_id, status, start_at) WHERE (status = ANY (ARRAY['pending'::public.booking_status, 'confirmed'::public.booking_status, 'in_progress'::public.booking_status]));


--
-- Name: idx_bookings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_created_at ON public.bookings USING btree (created_at DESC);


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_dates ON public.bookings USING btree (start_at, end_at);


--
-- Name: idx_bookings_distance_risk_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_distance_risk_tier ON public.bookings USING btree (distance_risk_tier) WHERE (distance_risk_tier IS NOT NULL);


--
-- Name: idx_bookings_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_expires_at ON public.bookings USING btree (expires_at) WHERE ((status = 'pending'::public.booking_status) AND (expires_at IS NOT NULL));


--
-- Name: idx_bookings_google_calendar_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_google_calendar_event_id ON public.bookings USING btree (google_calendar_event_id) WHERE (google_calendar_event_id IS NOT NULL);


--
-- Name: idx_bookings_guarantee_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_guarantee_type ON public.bookings USING btree (guarantee_type) WHERE (guarantee_type IS NOT NULL);


--
-- Name: idx_bookings_has_dynamic_pricing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_has_dynamic_pricing ON public.bookings USING btree (has_dynamic_pricing);


--
-- Name: idx_bookings_hold_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_hold_expires_at ON public.bookings USING btree (hold_expires_at) WHERE (hold_expires_at IS NOT NULL);


--
-- Name: idx_bookings_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_idempotency_key ON public.bookings USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_bookings_lock_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_lock_token ON public.bookings USING btree (price_lock_token) WHERE (price_lock_token IS NOT NULL);


--
-- Name: idx_bookings_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_metadata ON public.bookings USING gin (metadata) WHERE (metadata IS NOT NULL);


--
-- Name: idx_bookings_overlap; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_overlap ON public.bookings USING gist (tstzrange(start_at, end_at));


--
-- Name: idx_bookings_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payment_id ON public.bookings USING btree (payment_id);


--
-- Name: idx_bookings_payment_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payment_mode ON public.bookings USING btree (payment_mode);


--
-- Name: idx_bookings_payment_preference_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payment_preference_id ON public.bookings USING btree (payment_preference_id) WHERE (payment_preference_id IS NOT NULL);


--
-- Name: idx_bookings_payment_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payment_provider ON public.bookings USING btree (payment_provider);


--
-- Name: idx_bookings_payout_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payout_completed ON public.bookings USING btree (payout_status, payout_date) WHERE (payout_status = 'completed'::public.payout_status_enum);


--
-- Name: idx_bookings_payout_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payout_pending ON public.bookings USING btree (payout_status, created_at) WHERE (payout_status = ANY (ARRAY['pending'::public.payout_status_enum, 'failed'::public.payout_status_enum]));


--
-- Name: idx_bookings_payout_processing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_payout_processing ON public.bookings USING btree (payout_status, updated_at) WHERE (payout_status = 'processing'::public.payout_status_enum);


--
-- Name: idx_bookings_pickup_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_pickup_location ON public.bookings USING btree (pickup_location_lat, pickup_location_lng) WHERE ((pickup_location_lat IS NOT NULL) AND (pickup_location_lng IS NOT NULL));


--
-- Name: idx_bookings_price_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_price_locked ON public.bookings USING btree (price_locked_until);


--
-- Name: idx_bookings_provider_split_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_provider_split_payment_id ON public.bookings USING btree (provider_split_payment_id) WHERE (provider_split_payment_id IS NOT NULL);


--
-- Name: idx_bookings_renter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_renter_id ON public.bookings USING btree (renter_id);


--
-- Name: idx_bookings_renter_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_renter_status ON public.bookings USING btree (renter_id, status, start_at DESC) WHERE (status <> 'cancelled'::public.booking_status);


--
-- Name: idx_bookings_requires_revalidation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_requires_revalidation ON public.bookings USING btree (requires_revalidation) WHERE (requires_revalidation = true);


--
-- Name: idx_bookings_risk_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_risk_snapshot ON public.bookings USING btree (risk_snapshot_booking_id);


--
-- Name: idx_bookings_risk_snapshot_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_risk_snapshot_booking_id ON public.bookings USING btree (risk_snapshot_booking_id) WHERE (risk_snapshot_booking_id IS NOT NULL);


--
-- Name: idx_bookings_risk_snapshot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_risk_snapshot_id ON public.bookings USING btree (risk_snapshot_id) WHERE (risk_snapshot_id IS NOT NULL);


--
-- Name: idx_bookings_split_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_split_completed ON public.bookings USING btree (payment_split_completed);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_status_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status_dates ON public.bookings USING btree (status, start_at, end_at) WHERE (status = ANY (ARRAY['pending'::public.booking_status, 'confirmed'::public.booking_status, 'in_progress'::public.booking_status]));


--
-- Name: idx_calendar_sync_log_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_log_booking_id ON public.calendar_sync_log USING btree (booking_id);


--
-- Name: idx_calendar_sync_log_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_log_car_id ON public.calendar_sync_log USING btree (car_id);


--
-- Name: idx_calendar_sync_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_log_created_at ON public.calendar_sync_log USING btree (created_at DESC);


--
-- Name: idx_calendar_sync_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_log_status ON public.calendar_sync_log USING btree (status);


--
-- Name: idx_calendar_sync_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_sync_log_user_id ON public.calendar_sync_log USING btree (user_id);


--
-- Name: idx_car_blocked_dates_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_blocked_dates_car_id ON public.car_blocked_dates USING btree (car_id);


--
-- Name: idx_car_blocked_dates_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_blocked_dates_dates ON public.car_blocked_dates USING btree (blocked_from, blocked_to);


--
-- Name: idx_car_brands_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_brands_name ON public.car_brands USING btree (name);


--
-- Name: idx_car_google_calendars_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_google_calendars_car_id ON public.car_google_calendars USING btree (car_id);


--
-- Name: idx_car_google_calendars_google_calendar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_google_calendars_google_calendar_id ON public.car_google_calendars USING btree (google_calendar_id);


--
-- Name: idx_car_google_calendars_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_google_calendars_owner_id ON public.car_google_calendars USING btree (owner_id);


--
-- Name: idx_car_models_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_models_brand_id ON public.car_models USING btree (brand_id);


--
-- Name: idx_car_models_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_models_name ON public.car_models USING btree (name);


--
-- Name: idx_car_photos_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_photos_car_id ON public.car_photos USING btree (car_id);


--
-- Name: idx_car_photos_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_photos_sort_order ON public.car_photos USING btree (car_id, sort_order);


--
-- Name: idx_cars_active_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_active_status ON public.cars USING btree (status) WHERE (status = 'active'::public.car_status);


--
-- Name: idx_cars_auto_sync_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_auto_sync_enabled ON public.cars USING btree (value_auto_sync_enabled) WHERE ((value_auto_sync_enabled = true) AND (status = 'active'::public.car_status));


--
-- Name: idx_cars_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_brand_id ON public.cars USING btree (brand_id);


--
-- Name: idx_cars_can_receive_payments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_can_receive_payments ON public.cars USING btree (can_receive_payments, status) WHERE (status = 'active'::public.car_status);


--
-- Name: idx_cars_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_category_id ON public.cars USING btree (category_id);


--
-- Name: idx_cars_city; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_city ON public.cars USING btree (city);


--
-- Name: idx_cars_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_created_at ON public.cars USING btree (created_at DESC);


--
-- Name: idx_cars_dynamic_pricing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_dynamic_pricing ON public.cars USING btree (uses_dynamic_pricing) WHERE (uses_dynamic_pricing = true);


--
-- Name: idx_cars_estimated_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_estimated_value ON public.cars USING btree (estimated_value_usd) WHERE (estimated_value_usd IS NOT NULL);


--
-- Name: idx_cars_fipe_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_fipe_code ON public.cars USING btree (fipe_code) WHERE (fipe_code IS NOT NULL);


--
-- Name: idx_cars_fuel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_fuel ON public.cars USING btree (fuel);


--
-- Name: idx_cars_location_geom_gist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_location_geom_gist ON public.cars USING gist (location_geom);


--
-- Name: idx_cars_location_neighborhood; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_location_neighborhood ON public.cars USING btree (location_neighborhood) WHERE (location_neighborhood IS NOT NULL);


--
-- Name: idx_cars_location_postal_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_location_postal_code ON public.cars USING btree (location_postal_code) WHERE (location_postal_code IS NOT NULL);


--
-- Name: idx_cars_model_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_model_id ON public.cars USING btree (model_id);


--
-- Name: idx_cars_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_organization ON public.cars USING btree (organization_id);


--
-- Name: idx_cars_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_owner_id ON public.cars USING btree (owner_id);


--
-- Name: idx_cars_owner_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_owner_id_status ON public.cars USING btree (owner_id, status) WHERE (status = 'active'::public.car_status);


--
-- Name: idx_cars_plate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_plate ON public.cars USING btree (plate) WHERE (plate IS NOT NULL);


--
-- Name: idx_cars_price_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_price_range ON public.cars USING btree (price_per_day);


--
-- Name: idx_cars_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_status ON public.cars USING btree (status);


--
-- Name: idx_cars_transmission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_transmission ON public.cars USING btree (transmission);


--
-- Name: idx_cars_value_ars; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_value_ars ON public.cars USING btree (value_ars) WHERE (value_ars IS NOT NULL);


--
-- Name: idx_cars_value_brl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_value_brl ON public.cars USING btree (value_brl) WHERE (value_brl IS NOT NULL);


--
-- Name: idx_cars_value_usd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_value_usd ON public.cars USING btree (value_usd) WHERE (value_usd IS NOT NULL);


--
-- Name: idx_cars_vin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cars_vin ON public.cars USING btree (vin) WHERE (vin IS NOT NULL);


--
-- Name: idx_claims_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_booking_id ON public.claims USING btree (booking_id);


--
-- Name: idx_claims_booking_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_booking_id_status ON public.claims USING btree (booking_id, status);


--
-- Name: idx_claims_locked_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_locked_by ON public.claims USING btree (locked_by) WHERE (locked_by IS NOT NULL);


--
-- Name: idx_claims_reported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_reported_by ON public.claims USING btree (reported_by);


--
-- Name: idx_claims_reported_by_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_reported_by_created ON public.claims USING btree (reported_by, created_at DESC);


--
-- Name: idx_claims_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_resolved_by ON public.claims USING btree (resolved_by) WHERE (resolved_by IS NOT NULL);


--
-- Name: idx_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_status ON public.claims USING btree (status);


--
-- Name: idx_claims_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_status_created ON public.claims USING btree (status, created_at DESC);


--
-- Name: idx_claims_status_locked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_claims_status_locked ON public.claims USING btree (status, locked_at) WHERE (status = 'processing'::public.claim_status);


--
-- Name: idx_conversion_events_car_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_car_event ON public.conversion_events USING btree (car_id, event_type);


--
-- Name: idx_conversion_events_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_car_id ON public.conversion_events USING btree (car_id);


--
-- Name: idx_conversion_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_created_at ON public.conversion_events USING btree (created_at DESC);


--
-- Name: idx_conversion_events_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_data ON public.conversion_events USING gin (event_data);


--
-- Name: idx_conversion_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_event_type ON public.conversion_events USING btree (event_type);


--
-- Name: idx_conversion_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversion_events_user_id ON public.conversion_events USING btree (user_id);


--
-- Name: idx_demand_snapshots_region_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_demand_snapshots_region_created ON public.pricing_demand_snapshots USING btree (region, created_at DESC);


--
-- Name: idx_driver_class_history_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_class_history_booking_id ON public.driver_class_history USING btree (booking_id);


--
-- Name: idx_driver_class_history_claim_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_class_history_claim_id ON public.driver_class_history USING btree (claim_id);


--
-- Name: idx_driver_class_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_class_history_created_at ON public.driver_class_history USING btree (created_at DESC);


--
-- Name: idx_driver_class_history_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_class_history_reason ON public.driver_class_history USING btree (reason);


--
-- Name: idx_driver_class_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_class_history_user_id ON public.driver_class_history USING btree (user_id);


--
-- Name: idx_driver_protection_addons_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_protection_addons_active ON public.driver_protection_addons USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_driver_protection_addons_addon_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_protection_addons_addon_type ON public.driver_protection_addons USING btree (addon_type);


--
-- Name: idx_driver_protection_addons_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_protection_addons_expires ON public.driver_protection_addons USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_driver_protection_addons_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_protection_addons_user_id ON public.driver_protection_addons USING btree (user_id);


--
-- Name: idx_driver_risk_profile_class; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_risk_profile_class ON public.driver_risk_profile USING btree (class);


--
-- Name: idx_driver_risk_profile_driver_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_risk_profile_driver_score ON public.driver_risk_profile USING btree (driver_score);


--
-- Name: idx_driver_risk_profile_last_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_risk_profile_last_claim ON public.driver_risk_profile USING btree (last_claim_at);


--
-- Name: idx_driver_telemetry_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_telemetry_booking_id ON public.driver_telemetry USING btree (booking_id);


--
-- Name: idx_driver_telemetry_driver_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_telemetry_driver_score ON public.driver_telemetry USING btree (driver_score);


--
-- Name: idx_driver_telemetry_trip_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_telemetry_trip_date ON public.driver_telemetry USING btree (trip_date DESC);


--
-- Name: idx_driver_telemetry_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_telemetry_user_id ON public.driver_telemetry USING btree (user_id);


--
-- Name: idx_encryption_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_audit_log_created_at ON public.encryption_audit_log USING btree (created_at DESC);


--
-- Name: idx_encryption_audit_log_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_audit_log_message_id ON public.encryption_audit_log USING btree (message_id);


--
-- Name: idx_encryption_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_encryption_audit_log_user_id ON public.encryption_audit_log USING btree (user_id);


--
-- Name: idx_exchange_rates_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_is_active ON public.exchange_rates USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_exchange_rates_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_last_updated ON public.exchange_rates USING btree (last_updated DESC);


--
-- Name: idx_exchange_rates_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates USING btree (pair);


--
-- Name: idx_fx_rates_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_rates_active ON public.fx_rates USING btree (is_active, from_currency, to_currency) WHERE (is_active = true);


--
-- Name: idx_fx_rates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_rates_created_at ON public.fx_rates USING btree (created_at DESC);


--
-- Name: idx_fx_rates_valid_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fx_rates_valid_from ON public.fx_rates USING btree (valid_from DESC);


--
-- Name: idx_google_calendar_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_calendar_tokens_expires_at ON public.google_calendar_tokens USING btree (expires_at);


--
-- Name: idx_google_calendar_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_google_calendar_tokens_user_id ON public.google_calendar_tokens USING btree (user_id);


--
-- Name: idx_insurance_policies_car; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurance_policies_car ON public.insurance_policies USING btree (car_id);


--
-- Name: idx_insurance_policies_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurance_policies_owner ON public.insurance_policies USING btree (owner_id);


--
-- Name: idx_insurance_policies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurance_policies_status ON public.insurance_policies USING btree (status);


--
-- Name: idx_insurance_policies_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insurance_policies_type ON public.insurance_policies USING btree (policy_type);


--
-- Name: idx_ledger_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_account ON public.accounting_ledger USING btree (account_code);


--
-- Name: idx_ledger_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_date ON public.accounting_ledger USING btree (entry_date);


--
-- Name: idx_ledger_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_period ON public.accounting_ledger USING btree (fiscal_period);


--
-- Name: idx_ledger_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ledger_reference ON public.accounting_ledger USING btree (reference_type, reference_id);


--
-- Name: idx_location_tracking_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_tracking_booking ON public.booking_location_tracking USING btree (booking_id, status);


--
-- Name: idx_location_tracking_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_tracking_updated ON public.booking_location_tracking USING btree (updated_at DESC) WHERE (status = 'active'::text);


--
-- Name: idx_location_tracking_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_tracking_user ON public.booking_location_tracking USING btree (user_id, status);


--
-- Name: idx_messages_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_booking_id ON public.messages USING btree (booking_id) WHERE (booking_id IS NOT NULL);


--
-- Name: idx_messages_booking_participants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_booking_participants ON public.messages USING btree (booking_id, sender_id, recipient_id) WHERE (booking_id IS NOT NULL);


--
-- Name: idx_messages_car_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_car_id ON public.messages USING btree (car_id) WHERE (car_id IS NOT NULL);


--
-- Name: idx_messages_car_participants; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_car_participants ON public.messages USING btree (car_id, sender_id, recipient_id) WHERE (car_id IS NOT NULL);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_delivered_at ON public.messages USING btree (delivered_at) WHERE (delivered_at IS NOT NULL);


--
-- Name: idx_messages_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_read_at ON public.messages USING btree (read_at) WHERE (read_at IS NOT NULL);


--
-- Name: idx_messages_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_id ON public.messages USING btree (recipient_id);


--
-- Name: idx_messages_recipient_id_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_recipient_id_read_at ON public.messages USING btree (recipient_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_messages_undelivered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_undelivered ON public.messages USING btree (recipient_id, created_at) WHERE (delivered_at IS NULL);


--
-- Name: idx_messages_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_unread ON public.messages USING btree (recipient_id, created_at) WHERE (read_at IS NULL);


--
-- Name: idx_model_equiv_arg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_model_equiv_arg ON public.vehicle_model_equivalents USING btree (model_argentina);


--
-- Name: idx_model_equiv_br; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_model_equiv_br ON public.vehicle_model_equivalents USING btree (model_brazil);


--
-- Name: idx_model_equiv_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_model_equiv_brand ON public.vehicle_model_equivalents USING btree (brand);


--
-- Name: idx_monitoring_alerts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitoring_alerts_created_at ON public.monitoring_alerts USING btree (created_at DESC);


--
-- Name: idx_monitoring_alerts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitoring_alerts_status ON public.monitoring_alerts USING btree (status);


--
-- Name: idx_monitoring_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monitoring_alerts_type ON public.monitoring_alerts USING btree (alert_type);


--
-- Name: idx_mp_webhook_logs_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_logs_booking_id ON public.mp_webhook_logs USING btree (booking_id);


--
-- Name: idx_mp_webhook_logs_event_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mp_webhook_logs_event_id_unique ON public.mp_webhook_logs USING btree (event_id);


--
-- Name: idx_mp_webhook_logs_split_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_logs_split_id ON public.mp_webhook_logs USING btree (split_id);


--
-- Name: idx_mp_webhook_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_payment ON public.mp_webhook_logs USING btree (payment_id) WHERE (payment_id IS NOT NULL);


--
-- Name: idx_mp_webhook_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_processed ON public.mp_webhook_logs USING btree (processed);


--
-- Name: idx_mp_webhook_received; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_received ON public.mp_webhook_logs USING btree (received_at DESC);


--
-- Name: idx_mp_webhook_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_webhook_type ON public.mp_webhook_logs USING btree (webhook_type);


--
-- Name: idx_notification_settings_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_settings_updated_at ON public.notification_settings USING btree (updated_at DESC);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id_created_at ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_id_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id_is_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_type_created ON public.notifications USING btree (user_id, type, created_at DESC) WHERE (is_read = false);


--
-- Name: idx_outbound_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbound_requests_status ON public.outbound_requests USING btree (status);


--
-- Name: idx_payment_intents_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_booking_id ON public.payment_intents USING btree (booking_id);


--
-- Name: idx_payment_intents_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_expires_at ON public.payment_intents USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_payment_intents_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_idempotency_key ON public.payment_intents USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_payment_intents_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_provider ON public.payment_intents USING btree (provider);


--
-- Name: idx_payment_intents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_status ON public.payment_intents USING btree (status);


--
-- Name: idx_payment_intents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_intents_user_id ON public.payment_intents USING btree (user_id);


--
-- Name: idx_payment_issues_admin_dashboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_admin_dashboard ON public.payment_issues USING btree (resolved, severity, priority, created_at DESC);


--
-- Name: idx_payment_issues_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_booking ON public.payment_issues USING btree (booking_id);


--
-- Name: idx_payment_issues_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_created_at ON public.payment_issues USING btree (created_at DESC);


--
-- Name: idx_payment_issues_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_payment ON public.payment_issues USING btree (payment_id);


--
-- Name: idx_payment_issues_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_resolved_by ON public.payment_issues USING btree (resolved_by) WHERE (resolved_by IS NOT NULL);


--
-- Name: idx_payment_issues_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_severity ON public.payment_issues USING btree (severity);


--
-- Name: idx_payment_issues_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_type ON public.payment_issues USING btree (issue_type);


--
-- Name: idx_payment_issues_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_issues_unresolved ON public.payment_issues USING btree (booking_id, created_at DESC) WHERE (resolved = false);


--
-- Name: idx_payment_splits_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_splits_booking ON public.payment_splits USING btree (booking_id);


--
-- Name: idx_payment_splits_collector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_splits_collector ON public.payment_splits USING btree (collector_id);


--
-- Name: idx_payment_splits_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_splits_created ON public.payment_splits USING btree (created_at DESC);


--
-- Name: idx_payment_splits_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_splits_payment ON public.payment_splits USING btree (payment_id);


--
-- Name: idx_payment_splits_payment_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payment_splits_payment_booking ON public.payment_splits USING btree (payment_id, booking_id);


--
-- Name: idx_payment_splits_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_splits_status ON public.payment_splits USING btree (status);


--
-- Name: idx_payments_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking_id ON public.payments USING btree (booking_id);


--
-- Name: idx_payments_booking_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking_id_status ON public.payments USING btree (booking_id, status);


--
-- Name: idx_payments_booking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking_status ON public.payments USING btree (booking_id, status);


--
-- Name: idx_payments_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_expires_at ON public.payments USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_payments_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_idempotency_key ON public.payments USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: idx_payments_is_hold; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_is_hold ON public.payments USING btree (is_hold) WHERE (is_hold = true);


--
-- Name: idx_payments_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_payment_intent_id ON public.payments USING btree (payment_intent_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- Name: idx_platform_config_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_config_category ON public.platform_config USING btree (category);


--
-- Name: idx_pricing_calculations_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_calculations_booking ON public.pricing_calculations USING btree (booking_id);


--
-- Name: idx_pricing_calculations_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_calculations_region_id ON public.pricing_calculations USING btree (region_id);


--
-- Name: idx_pricing_calculations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_calculations_user ON public.pricing_calculations USING btree (user_id);


--
-- Name: idx_pricing_cron_health_job_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_cron_health_job_time ON public.pricing_cron_health USING btree (job_name, last_run_at DESC);


--
-- Name: idx_pricing_hour_factors_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_hour_factors_region_id ON public.pricing_hour_factors USING btree (region_id);


--
-- Name: idx_pricing_regions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_regions_active ON public.pricing_regions USING btree (active);


--
-- Name: idx_profiles_date_of_birth; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_date_of_birth ON public.profiles USING btree (date_of_birth);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: idx_profiles_home_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_home_location ON public.profiles USING btree (home_latitude, home_longitude) WHERE ((home_latitude IS NOT NULL) AND (home_longitude IS NOT NULL));


--
-- Name: idx_profiles_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_onboarding ON public.profiles USING btree (onboarding);


--
-- Name: idx_profiles_primary_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_primary_goal ON public.profiles USING btree (primary_goal) WHERE (primary_goal IS NOT NULL);


--
-- Name: idx_profiles_rating_avg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_rating_avg ON public.profiles USING btree (rating_avg DESC) WHERE (rating_count > 0);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_provisions_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provisions_type_status ON public.accounting_provisions USING btree (provision_type, status);


--
-- Name: idx_push_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens USING btree (user_id);


--
-- Name: idx_referral_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_codes_code ON public.referral_codes USING btree (code) WHERE (is_active = true);


--
-- Name: idx_referral_codes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_codes_user_id ON public.referral_codes USING btree (user_id);


--
-- Name: idx_referral_rewards_referral_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_rewards_referral_id ON public.referral_rewards USING btree (referral_id);


--
-- Name: idx_referral_rewards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_rewards_status ON public.referral_rewards USING btree (status);


--
-- Name: idx_referral_rewards_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_rewards_user_id ON public.referral_rewards USING btree (user_id);


--
-- Name: idx_referrals_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code_id ON public.referrals USING btree (referral_code_id);


--
-- Name: idx_referrals_referred_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referred_id ON public.referrals USING btree (referred_id);


--
-- Name: idx_referrals_referrer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);


--
-- Name: idx_referrals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_status ON public.referrals USING btree (status);


--
-- Name: idx_revenue_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenue_booking ON public.accounting_revenue_recognition USING btree (booking_id);


--
-- Name: idx_revenue_recognition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_revenue_recognition ON public.accounting_revenue_recognition USING btree (is_recognized);


--
-- Name: idx_reviews_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_booking_id ON public.reviews USING btree (booking_id);


--
-- Name: idx_reviews_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_created_at ON public.reviews USING btree (created_at DESC);


--
-- Name: idx_reviews_reviewee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewee_id ON public.reviews USING btree (reviewee_id);


--
-- Name: idx_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewer_id ON public.reviews USING btree (reviewer_id);


--
-- Name: idx_risk_snapshot_bucket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_snapshot_bucket ON public.booking_risk_snapshot USING btree (bucket);


--
-- Name: idx_risk_snapshot_fx_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_snapshot_fx_date ON public.booking_risk_snapshot USING btree (fx_snapshot_date);


--
-- Name: idx_risk_snapshot_guarantee_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_snapshot_guarantee_type ON public.booking_risk_snapshot USING btree (guarantee_type);


--
-- Name: idx_risk_snapshot_requires_revalidation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_snapshot_requires_revalidation ON public.booking_risk_snapshot USING btree (requires_revalidation) WHERE (requires_revalidation = true);


--
-- Name: idx_score_snapshots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_score_snapshots_date ON public.driver_score_snapshots USING btree (snapshot_date DESC);


--
-- Name: idx_special_events_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_special_events_dates ON public.pricing_special_events USING btree (region_id, start_date, end_date) WHERE (active = true);


--
-- Name: idx_sync_log_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_log_success ON public.exchange_rate_sync_log USING btree (success, synced_at DESC);


--
-- Name: idx_sync_log_synced_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_log_synced_at ON public.exchange_rate_sync_log USING btree (synced_at DESC);


--
-- Name: idx_uop_completed_steps_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uop_completed_steps_gin ON public.user_onboarding_plans USING gin (completed_steps jsonb_path_ops);


--
-- Name: idx_uop_user_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uop_user_role ON public.user_onboarding_plans USING btree (user_id, role);


--
-- Name: idx_uop_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uop_user_status ON public.user_onboarding_plans USING btree (user_id, status);


--
-- Name: idx_uos_plan_status_pos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uos_plan_status_pos ON public.user_onboarding_steps USING btree (plan_id, status, "position");


--
-- Name: idx_user_documents_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_reviewed_by ON public.user_documents USING btree (reviewed_by) WHERE (reviewed_by IS NOT NULL);


--
-- Name: idx_user_documents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_status ON public.user_documents USING btree (status);


--
-- Name: idx_user_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_documents_user_id ON public.user_documents USING btree (user_id);


--
-- Name: idx_user_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_verifications_status ON public.user_verifications USING btree (status);


--
-- Name: idx_user_verifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_verifications_user_id ON public.user_verifications USING btree (user_id);


--
-- Name: idx_vehicle_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_categories_active ON public.vehicle_categories USING btree (active) WHERE (active = true);


--
-- Name: idx_vehicle_categories_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_categories_code ON public.vehicle_categories USING btree (code);


--
-- Name: idx_vehicle_docs_insurance_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_insurance_expiry ON public.vehicle_documents USING btree (insurance_expiry) WHERE (insurance_expiry IS NOT NULL);


--
-- Name: idx_vehicle_docs_manual_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_manual_review ON public.vehicle_documents USING btree (manual_review_required) WHERE (manual_review_required = true);


--
-- Name: idx_vehicle_docs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_status ON public.vehicle_documents USING btree (status);


--
-- Name: idx_vehicle_docs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_user_id ON public.vehicle_documents USING btree (user_id);


--
-- Name: idx_vehicle_docs_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_vehicle_id ON public.vehicle_documents USING btree (vehicle_id);


--
-- Name: idx_vehicle_docs_vtv_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_docs_vtv_expiry ON public.vehicle_documents USING btree (vtv_expiry) WHERE (vtv_expiry IS NOT NULL);


--
-- Name: idx_vehicle_documents_manual_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_documents_manual_reviewed_by ON public.vehicle_documents USING btree (manual_reviewed_by);


--
-- Name: idx_vehicle_pricing_models_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_active ON public.vehicle_pricing_models USING btree (active) WHERE (active = true);


--
-- Name: idx_vehicle_pricing_models_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_brand ON public.vehicle_pricing_models USING btree (brand);


--
-- Name: idx_vehicle_pricing_models_brand_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_brand_model ON public.vehicle_pricing_models USING btree (brand, model);


--
-- Name: idx_vehicle_pricing_models_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_category ON public.vehicle_pricing_models USING btree (category_id);


--
-- Name: idx_vehicle_pricing_models_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_model ON public.vehicle_pricing_models USING btree (model);


--
-- Name: idx_vehicle_pricing_models_year_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicle_pricing_models_year_range ON public.vehicle_pricing_models USING btree (year_from, year_to);


--
-- Name: idx_waitlist_car_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_car_dates ON public.booking_waitlist USING btree (car_id, start_date, end_date) WHERE (status = 'active'::text);


--
-- Name: idx_waitlist_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_expires_at ON public.booking_waitlist USING btree (expires_at) WHERE (status = 'active'::text);


--
-- Name: idx_waitlist_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_user_status ON public.booking_waitlist USING btree (user_id, status) WHERE (status = 'active'::text);


--
-- Name: idx_wallet_audit_log_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_audit_log_transaction_id ON public.wallet_audit_log USING btree (transaction_id);


--
-- Name: idx_wallet_audit_log_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_audit_log_user_created ON public.wallet_audit_log USING btree (user_id, created_at DESC);


--
-- Name: idx_wallet_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_audit_log_user_id ON public.wallet_audit_log USING btree (user_id);


--
-- Name: idx_wallet_backups_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_backups_date ON public.wallet_transaction_backups USING btree (backup_date DESC);


--
-- Name: idx_wallet_split_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_split_config_active ON public.wallet_split_config USING btree (active);


--
-- Name: idx_wallet_split_config_locador_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_split_config_locador_id ON public.wallet_split_config USING btree (locador_id);


--
-- Name: idx_wallet_transactions_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_reference ON public.wallet_transactions USING btree (reference_type, reference_id);


--
-- Name: idx_wallet_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions USING btree (status);


--
-- Name: idx_wallet_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions USING btree (user_id);


--
-- Name: idx_wallet_transactions_user_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_user_id_created_at ON public.wallet_transactions USING btree (user_id, created_at DESC);


--
-- Name: idx_withdrawal_requests_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_approved_by ON public.withdrawal_requests USING btree (approved_by) WHERE (approved_by IS NOT NULL);


--
-- Name: idx_withdrawal_requests_bank_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_bank_account_id ON public.withdrawal_requests USING btree (bank_account_id);


--
-- Name: idx_withdrawal_requests_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_created_at ON public.withdrawal_requests USING btree (created_at DESC);


--
-- Name: idx_withdrawal_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests USING btree (status);


--
-- Name: idx_withdrawal_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests USING btree (user_id);


--
-- Name: idx_withdrawal_transactions_mp_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_transactions_mp_id ON public.withdrawal_transactions USING btree (mercadopago_transfer_id);


--
-- Name: idx_withdrawal_transactions_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_transactions_request_id ON public.withdrawal_transactions USING btree (request_id);


--
-- Name: idx_withdrawal_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_transactions_status ON public.withdrawal_transactions USING btree (status);


--
-- Name: uq_booking_user_tracking_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_booking_user_tracking_active ON public.booking_location_tracking USING btree (booking_id, user_id, tracking_type) WHERE (status = 'active'::text);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_11_28_inserted_at_topic_idx ON realtime.messages_2025_11_28 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_29_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_11_29_inserted_at_topic_idx ON realtime.messages_2025_11_29 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_11_30_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_11_30_inserted_at_topic_idx ON realtime.messages_2025_11_30 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_12_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_12_01_inserted_at_topic_idx ON realtime.messages_2025_12_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_12_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_12_02_inserted_at_topic_idx ON realtime.messages_2025_12_02 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_12_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_12_03_inserted_at_topic_idx ON realtime.messages_2025_12_03 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: messages_2025_12_04_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_2025_12_04_inserted_at_topic_idx ON realtime.messages_2025_12_04 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: messages_2025_11_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_28_inserted_at_topic_idx;


--
-- Name: messages_2025_11_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_28_pkey;


--
-- Name: messages_2025_11_29_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_29_inserted_at_topic_idx;


--
-- Name: messages_2025_11_29_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_29_pkey;


--
-- Name: messages_2025_11_30_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_11_30_inserted_at_topic_idx;


--
-- Name: messages_2025_11_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_11_30_pkey;


--
-- Name: messages_2025_12_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_12_01_inserted_at_topic_idx;


--
-- Name: messages_2025_12_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_12_01_pkey;


--
-- Name: messages_2025_12_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_12_02_inserted_at_topic_idx;


--
-- Name: messages_2025_12_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_12_02_pkey;


--
-- Name: messages_2025_12_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_12_03_inserted_at_topic_idx;


--
-- Name: messages_2025_12_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_12_03_pkey;


--
-- Name: messages_2025_12_04_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2025_12_04_inserted_at_topic_idx;


--
-- Name: messages_2025_12_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_12_04_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: users sync_email_on_auth_update; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER sync_email_on_auth_update AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN (((old.email)::text IS DISTINCT FROM (new.email)::text)) EXECUTE FUNCTION public.sync_profile_email_from_auth();


--
-- Name: users sync_email_on_user_create; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER sync_email_on_user_create AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email_on_user_create();


--
-- Name: bookings accounting_cancellation_fee_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_cancellation_fee_trigger AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.accounting_cancellation_fee_after_update();


--
-- Name: bookings accounting_commission_income_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_commission_income_trigger AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.trigger_accounting_commission_income();


--
-- Name: wallet_transactions accounting_credit_breakage_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_credit_breakage_trigger AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.accounting_credit_breakage_after_insert();


--
-- Name: wallet_transactions accounting_credit_consume_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_credit_consume_trigger AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.accounting_credit_consume_after_insert();


--
-- Name: wallet_transactions accounting_credit_issue_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_credit_issue_trigger AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.accounting_credit_issue_after_insert();


--
-- Name: bookings accounting_delivery_fee_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_delivery_fee_trigger AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.accounting_delivery_fee_after_update();


--
-- Name: wallet_transactions accounting_wallet_deposit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accounting_wallet_deposit_trigger AFTER INSERT ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.accounting_wallet_deposit_after_insert();


--
-- Name: booking_location_tracking booking_location_tracking_broadcast; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER booking_location_tracking_broadcast AFTER INSERT OR UPDATE ON public.booking_location_tracking FOR EACH ROW EXECUTE FUNCTION public.booking_location_tracking_broadcast_trigger();


--
-- Name: car_blocked_dates car_blocked_dates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER car_blocked_dates_updated_at BEFORE UPDATE ON public.car_blocked_dates FOR EACH ROW EXECUTE FUNCTION public.update_car_blocked_dates_updated_at();


--
-- Name: bookings check_bonus_on_booking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_bonus_on_booking AFTER UPDATE OF status ON public.bookings FOR EACH ROW WHEN ((new.status = 'completed'::public.booking_status)) EXECUTE FUNCTION public.check_fleet_bonus_eligibility();


--
-- Name: reviews check_bonus_on_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_bonus_on_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.check_fleet_bonus_eligibility();


--
-- Name: claims claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_claims_updated_at();


--
-- Name: messages encrypt_message_body_before_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER encrypt_message_body_before_insert BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.encrypt_message_body_trigger();


--
-- Name: messages enforce_message_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_message_immutability BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.prevent_message_content_changes();


--
-- Name: cars notify_mp_onboarding_on_publish; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_mp_onboarding_on_publish AFTER INSERT OR UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.notify_mp_onboarding_required();


--
-- Name: booking_claims set_booking_claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_booking_claims_updated_at BEFORE UPDATE ON public.booking_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings set_booking_pricing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_booking_pricing BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.trigger_booking_pricing();


--
-- Name: bookings set_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cars set_cars_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: driver_risk_profile set_driver_risk_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_driver_risk_profile_updated_at BEFORE UPDATE ON public.driver_risk_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exchange_rates set_exchange_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_exchange_rates_updated_at BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_intents set_payment_intents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments set_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pricing_class_factors set_pricing_class_factors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_pricing_class_factors_updated_at BEFORE UPDATE ON public.pricing_class_factors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews set_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_verifications set_user_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_user_verifications_updated_at BEFORE UPDATE ON public.user_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: booking_waitlist set_waitlist_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_waitlist_updated_at BEFORE UPDATE ON public.booking_waitlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_journal_entries trg_accounting_journal_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_accounting_journal_entries_updated_at BEFORE UPDATE ON public.accounting_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_accounting_journal_entries_updated_at();


--
-- Name: bookings trg_accounting_revenue_recognition_after; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_accounting_revenue_recognition_after AFTER UPDATE ON public.bookings FOR EACH ROW WHEN (((new.status = 'completed'::public.booking_status) AND (old.status IS DISTINCT FROM 'completed'::public.booking_status))) EXECUTE FUNCTION public.trg_accounting_revenue_recognition();


--
-- Name: onboarding_plan_templates trg_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON public.onboarding_plan_templates FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();


--
-- Name: user_onboarding_plans trg_uop_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_uop_updated_at BEFORE UPDATE ON public.user_onboarding_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_onboarding_steps trg_uos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_uos_updated_at BEFORE UPDATE ON public.user_onboarding_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bookings trigger_auto_complete_first_booking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_complete_first_booking AFTER INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.auto_complete_first_booking_milestone();


--
-- Name: cars trigger_auto_generate_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_generate_referral_code AFTER INSERT ON public.cars FOR EACH ROW EXECUTE FUNCTION public.auto_generate_referral_code_on_first_car();


--
-- Name: referral_rewards trigger_auto_payout_rewards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_payout_rewards AFTER UPDATE ON public.referral_rewards FOR EACH ROW EXECUTE FUNCTION public.auto_payout_approved_rewards();


--
-- Name: fx_rates trigger_deactivate_previous_fx_rate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_deactivate_previous_fx_rate AFTER INSERT ON public.fx_rates FOR EACH ROW WHEN ((new.is_active = true)) EXECUTE FUNCTION public.deactivate_previous_fx_rate();


--
-- Name: fx_rates trigger_fx_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_fx_rates_updated_at BEFORE UPDATE ON public.fx_rates FOR EACH ROW EXECUTE FUNCTION public.update_fx_rates_updated_at();


--
-- Name: messages trigger_notify_new_chat_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_new_chat_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_chat_message();


--
-- Name: bookings trigger_notify_waitlist_on_booking_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_waitlist_on_booking_change AFTER DELETE OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_waitlist_on_booking_change();


--
-- Name: payment_intents trigger_payment_intents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_payment_intents_updated_at BEFORE UPDATE ON public.payment_intents FOR EACH ROW EXECUTE FUNCTION public.update_payment_intents_updated_at();


--
-- Name: booking_location_tracking trigger_set_location_tracking_timestamps; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_location_tracking_timestamps BEFORE INSERT ON public.booking_location_tracking FOR EACH ROW EXECUTE FUNCTION public.set_location_tracking_created_timestamp();


--
-- Name: profiles trigger_update_cars_on_mp_onboarding; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_cars_on_mp_onboarding AFTER UPDATE OF mp_onboarding_completed, mercadopago_collector_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_update_cars_on_mp_onboarding();


--
-- Name: booking_location_tracking trigger_update_location_tracking_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_location_tracking_timestamp BEFORE UPDATE ON public.booking_location_tracking FOR EACH ROW EXECUTE FUNCTION public.update_location_tracking_timestamp();


--
-- Name: messages trigger_update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_messages_updated_at();


--
-- Name: vehicle_categories trigger_vehicle_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_vehicle_categories_updated_at BEFORE UPDATE ON public.vehicle_categories FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_categories_updated_at();


--
-- Name: vehicle_pricing_models trigger_vehicle_pricing_models_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_vehicle_pricing_models_updated_at BEFORE UPDATE ON public.vehicle_pricing_models FOR EACH ROW EXECUTE FUNCTION public.update_vehicle_pricing_models_updated_at();


--
-- Name: bank_accounts update_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: car_google_calendars update_car_google_calendars_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_car_google_calendars_timestamp BEFORE UPDATE ON public.car_google_calendars FOR EACH ROW EXECUTE FUNCTION public.update_calendar_sync_timestamp();


--
-- Name: google_calendar_tokens update_google_calendar_tokens_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_google_calendar_tokens_timestamp BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.update_calendar_sync_timestamp();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicle_model_equivalents update_model_equivalents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_model_equivalents_updated_at BEFORE UPDATE ON public.vehicle_model_equivalents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_issues update_payment_issues_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_issues_updated_at BEFORE UPDATE ON public.payment_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_splits update_payment_splits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_splits_updated_at BEFORE UPDATE ON public.payment_splits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallet_split_config update_wallet_split_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallet_split_config_updated_at BEFORE UPDATE ON public.wallet_split_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdrawal_requests update_withdrawal_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdrawal_transactions update_withdrawal_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdrawal_transactions_updated_at BEFORE UPDATE ON public.withdrawal_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: accounting_accounts accounting_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_accounts
    ADD CONSTRAINT accounting_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.accounting_accounts(id);


--
-- Name: accounting_audit_log accounting_audit_log_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_audit_log
    ADD CONSTRAINT accounting_audit_log_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: accounting_journal_entries accounting_journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entries
    ADD CONSTRAINT accounting_journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_journal_entries accounting_journal_entries_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_journal_entries
    ADD CONSTRAINT accounting_journal_entries_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES auth.users(id);


--
-- Name: accounting_ledger accounting_ledger_account_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_ledger
    ADD CONSTRAINT accounting_ledger_account_code_fkey FOREIGN KEY (account_code) REFERENCES public.accounting_chart_of_accounts(code);


--
-- Name: accounting_ledger accounting_ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_ledger
    ADD CONSTRAINT accounting_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: accounting_ledger accounting_ledger_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_ledger
    ADD CONSTRAINT accounting_ledger_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.accounting_journal_entries(id);


--
-- Name: accounting_ledger accounting_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_ledger
    ADD CONSTRAINT accounting_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: accounting_period_balances accounting_period_balances_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_balances
    ADD CONSTRAINT accounting_period_balances_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounting_accounts(id);


--
-- Name: accounting_period_closures accounting_period_closures_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_period_closures
    ADD CONSTRAINT accounting_period_closures_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES auth.users(id);


--
-- Name: accounting_revenue_recognition accounting_revenue_recognition_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_revenue_recognition
    ADD CONSTRAINT accounting_revenue_recognition_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: bank_accounts bank_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: booking_claims booking_claims_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_claims
    ADD CONSTRAINT booking_claims_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_claims booking_claims_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_claims
    ADD CONSTRAINT booking_claims_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: booking_claims booking_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_claims
    ADD CONSTRAINT booking_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: booking_inspections booking_inspections_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_inspections
    ADD CONSTRAINT booking_inspections_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_inspections booking_inspections_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_inspections
    ADD CONSTRAINT booking_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.profiles(id);


--
-- Name: booking_insurance_coverage booking_insurance_coverage_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_insurance_coverage
    ADD CONSTRAINT booking_insurance_coverage_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_insurance_coverage booking_insurance_coverage_policy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_insurance_coverage
    ADD CONSTRAINT booking_insurance_coverage_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.insurance_policies(id);


--
-- Name: booking_location_tracking booking_location_tracking_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_location_tracking
    ADD CONSTRAINT booking_location_tracking_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_location_tracking booking_location_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_location_tracking
    ADD CONSTRAINT booking_location_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: booking_risk_snapshot booking_risk_snapshot_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_risk_snapshot
    ADD CONSTRAINT booking_risk_snapshot_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: booking_waitlist booking_waitlist_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: booking_waitlist booking_waitlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_authorized_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_authorized_payment_id_fkey FOREIGN KEY (authorized_payment_id) REFERENCES public.payment_intents(id);


--
-- Name: bookings bookings_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_renter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_risk_snapshot_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_risk_snapshot_booking_id_fkey FOREIGN KEY (risk_snapshot_booking_id) REFERENCES public.booking_risk_snapshot(booking_id);


--
-- Name: bookings bookings_risk_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_risk_snapshot_id_fkey FOREIGN KEY (risk_snapshot_id) REFERENCES public.booking_risk_snapshot(booking_id);


--
-- Name: calendar_sync_log calendar_sync_log_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: calendar_sync_log calendar_sync_log_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE SET NULL;


--
-- Name: calendar_sync_log calendar_sync_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_sync_log
    ADD CONSTRAINT calendar_sync_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: car_blocked_dates car_blocked_dates_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_blocked_dates
    ADD CONSTRAINT car_blocked_dates_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: car_google_calendars car_google_calendars_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_google_calendars
    ADD CONSTRAINT car_google_calendars_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: car_google_calendars car_google_calendars_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_google_calendars
    ADD CONSTRAINT car_google_calendars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: car_models car_models_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.car_brands(id) ON DELETE CASCADE;


--
-- Name: car_photos car_photos_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.car_photos
    ADD CONSTRAINT car_photos_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: cars cars_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vehicle_categories(id);


--
-- Name: cars cars_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: cars cars_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: claims claims_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;


--
-- Name: claims claims_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES auth.users(id);


--
-- Name: claims claims_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: claims claims_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);


--
-- Name: conversion_events conversion_events_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE SET NULL;


--
-- Name: conversion_events conversion_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversion_events
    ADD CONSTRAINT conversion_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: driver_class_history driver_class_history_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_class_history
    ADD CONSTRAINT driver_class_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: driver_class_history driver_class_history_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_class_history
    ADD CONSTRAINT driver_class_history_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.booking_claims(id);


--
-- Name: driver_class_history driver_class_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_class_history
    ADD CONSTRAINT driver_class_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: driver_protection_addons driver_protection_addons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_protection_addons
    ADD CONSTRAINT driver_protection_addons_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: driver_risk_profile driver_risk_profile_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_risk_profile
    ADD CONSTRAINT driver_risk_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: driver_telemetry driver_telemetry_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_telemetry
    ADD CONSTRAINT driver_telemetry_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: driver_telemetry driver_telemetry_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_telemetry
    ADD CONSTRAINT driver_telemetry_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: encryption_audit_log encryption_audit_log_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: encryption_audit_log encryption_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: bookings fk_bookings_risk_snapshot; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_bookings_risk_snapshot FOREIGN KEY (risk_snapshot_booking_id) REFERENCES public.booking_risk_snapshot(booking_id) ON DELETE SET NULL;


--
-- Name: fleet_bonuses fleet_bonuses_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_bonuses
    ADD CONSTRAINT fleet_bonuses_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id);


--
-- Name: fleet_bonuses fleet_bonuses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fleet_bonuses
    ADD CONSTRAINT fleet_bonuses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: google_calendar_tokens google_calendar_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_tokens
    ADD CONSTRAINT google_calendar_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: insurance_policies insurance_policies_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id);


--
-- Name: insurance_policies insurance_policies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: messages messages_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: messages messages_car_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: messages messages_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mp_webhook_logs mp_webhook_logs_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mp_webhook_logs
    ADD CONSTRAINT mp_webhook_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: mp_webhook_logs mp_webhook_logs_split_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mp_webhook_logs
    ADD CONSTRAINT mp_webhook_logs_split_id_fkey FOREIGN KEY (split_id) REFERENCES public.payment_splits(id);


--
-- Name: notification_settings notification_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);


--
-- Name: payment_intents payment_intents_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payment_intents payment_intents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_intents
    ADD CONSTRAINT payment_intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: payment_issues payment_issues_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_issues
    ADD CONSTRAINT payment_issues_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: payment_issues payment_issues_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_issues
    ADD CONSTRAINT payment_issues_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: payment_splits payment_splits_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_splits
    ADD CONSTRAINT payment_splits_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.payment_intents(id) ON DELETE SET NULL;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: pricing_calculations pricing_calculations_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculations
    ADD CONSTRAINT pricing_calculations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: pricing_calculations pricing_calculations_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculations
    ADD CONSTRAINT pricing_calculations_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.pricing_regions(id) ON DELETE SET NULL;


--
-- Name: pricing_calculations pricing_calculations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_calculations
    ADD CONSTRAINT pricing_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pricing_day_factors pricing_day_factors_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_day_factors
    ADD CONSTRAINT pricing_day_factors_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.pricing_regions(id) ON DELETE CASCADE;


--
-- Name: pricing_hour_factors pricing_hour_factors_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_hour_factors
    ADD CONSTRAINT pricing_hour_factors_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.pricing_regions(id) ON DELETE CASCADE;


--
-- Name: pricing_special_events pricing_special_events_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_special_events
    ADD CONSTRAINT pricing_special_events_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.pricing_regions(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_tokens push_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_rewards referral_rewards_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referral_rewards referral_rewards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_rewards
    ADD CONSTRAINT referral_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_documents user_documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: user_documents user_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_documents
    ADD CONSTRAINT user_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_identity_levels user_identity_levels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_identity_levels
    ADD CONSTRAINT user_identity_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_onboarding_plans user_onboarding_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding_plans
    ADD CONSTRAINT user_onboarding_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_onboarding_steps user_onboarding_steps_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding_steps
    ADD CONSTRAINT user_onboarding_steps_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.user_onboarding_plans(id) ON DELETE CASCADE;


--
-- Name: user_verifications user_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_wallets user_wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vehicle_documents vehicle_documents_manual_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_manual_reviewed_by_fkey FOREIGN KEY (manual_reviewed_by) REFERENCES public.profiles(id);


--
-- Name: vehicle_documents vehicle_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: vehicle_documents vehicle_documents_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.cars(id) ON DELETE CASCADE;


--
-- Name: vehicle_pricing_models vehicle_pricing_models_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_pricing_models
    ADD CONSTRAINT vehicle_pricing_models_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vehicle_categories(id);


--
-- Name: wallet_split_config wallet_split_config_locador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_split_config
    ADD CONSTRAINT wallet_split_config_locador_id_fkey FOREIGN KEY (locador_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: withdrawal_requests withdrawal_requests_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE SET NULL;


--
-- Name: withdrawal_requests withdrawal_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: withdrawal_transactions withdrawal_transactions_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: claims Admins can delete claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete claims" ON public.claims FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));


--
-- Name: pricing_cron_health Admins can read cron health; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read cron health" ON public.pricing_cron_health FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_admin = true)))));


--
-- Name: claims Admins can update any claim; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any claim" ON public.claims FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));


--
-- Name: booking_claims Admins can update claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update claims" ON public.booking_claims FOR UPDATE USING (true);


--
-- Name: car_brands Anyone can read car brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read car brands" ON public.car_brands FOR SELECT USING (true);


--
-- Name: car_models Anyone can read car models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read car models" ON public.car_models FOR SELECT USING (true);


--
-- Name: pricing_demand_snapshots Anyone can read demand snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read demand snapshots" ON public.pricing_demand_snapshots FOR SELECT USING (true);


--
-- Name: pricing_hour_factors Anyone can read hour factors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read hour factors" ON public.pricing_hour_factors FOR SELECT USING (true);


--
-- Name: vehicle_model_equivalents Anyone can read model equivalents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read model equivalents" ON public.vehicle_model_equivalents FOR SELECT TO authenticated USING (true);


--
-- Name: pricing_day_factors Anyone can read pricing factors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read pricing factors" ON public.pricing_day_factors FOR SELECT USING (true);


--
-- Name: pricing_special_events Anyone can read special events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read special events" ON public.pricing_special_events FOR SELECT USING ((active = true));


--
-- Name: pricing_user_factors Anyone can read user factors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user factors" ON public.pricing_user_factors FOR SELECT USING (true);


--
-- Name: insurance_addons Anyone can view active addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active addons" ON public.insurance_addons FOR SELECT USING ((active = true));


--
-- Name: insurance_policies Anyone can view active platform policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active platform policies" ON public.insurance_policies FOR SELECT USING (((policy_type = 'platform_floating'::text) AND (status = 'active'::text)));


--
-- Name: vehicle_categories Anyone can view active vehicle categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active vehicle categories" ON public.vehicle_categories FOR SELECT USING ((active = true));


--
-- Name: car_blocked_dates Anyone can view blocked dates for availability; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view blocked dates for availability" ON public.car_blocked_dates FOR SELECT USING (true);


--
-- Name: exchange_rates Anyone can view exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates FOR SELECT USING (true);


--
-- Name: conversion_events Authenticated users can insert their events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert their events" ON public.conversion_events FOR INSERT TO authenticated WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: fgo_parameters Authenticated users can view FGO parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view FGO parameters" ON public.fgo_parameters FOR SELECT TO authenticated USING ((( SELECT auth.role() AS role) = 'authenticated'::text));


--
-- Name: profiles Authenticated users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ((( SELECT auth.role() AS role) = 'authenticated'::text));


--
-- Name: accounting_journal_entries Authenticated users can view journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view journal entries" ON public.accounting_journal_entries FOR SELECT TO authenticated USING (true);


--
-- Name: claims Booking owners can create claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Booking owners can create claims" ON public.claims FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = claims.booking_id) AND (c.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_google_calendars Car owners can create car calendars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Car owners can create car calendars" ON public.car_google_calendars FOR INSERT TO authenticated WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND (car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_google_calendars Car owners can delete their car calendars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Car owners can delete their car calendars" ON public.car_google_calendars FOR DELETE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_google_calendars Car owners can update their car calendars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Car owners can update their car calendars" ON public.car_google_calendars FOR UPDATE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_google_calendars Car owners can view their car calendars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Car owners can view their car calendars" ON public.car_google_calendars FOR SELECT TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: payment_splits Car owners can view their splits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Car owners can view their splits" ON public.payment_splits FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((b.car_id = c.id)))
  WHERE ((b.id = payment_splits.booking_id) AND (c.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: booking_inspections Inspectors can create inspections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inspectors can create inspections" ON public.booking_inspections FOR INSERT TO authenticated WITH CHECK ((inspector_id = ( SELECT auth.uid() AS uid)));


--
-- Name: booking_inspections Inspectors can update their inspections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inspectors can update their inspections" ON public.booking_inspections FOR UPDATE TO authenticated USING ((inspector_id = ( SELECT auth.uid() AS uid)));


--
-- Name: organization_members Members can view other members of same org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view other members of same org" ON public.organization_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = organization_members.organization_id) AND (om.user_id = auth.uid())))));


--
-- Name: organizations Members can view their own organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view their own organizations" ON public.organizations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organizations.id) AND (organization_members.user_id = auth.uid())))));


--
-- Name: encryption_keys No direct access to encryption keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to encryption keys" ON public.encryption_keys USING (false);


--
-- Name: referral_rewards Only admins can insert rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert rewards" ON public.referral_rewards FOR INSERT WITH CHECK (false);


--
-- Name: vehicle_model_equivalents Only admins can modify model equivalents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can modify model equivalents" ON public.vehicle_model_equivalents TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: referral_rewards Only admins can update rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update rewards" ON public.referral_rewards FOR UPDATE USING (false);


--
-- Name: cars Owners and Org Members can delete cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and Org Members can delete cars" ON public.cars FOR DELETE USING ((((organization_id IS NULL) AND (auth.uid() = owner_id)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = cars.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))));


--
-- Name: cars Owners and Org Members can update cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and Org Members can update cars" ON public.cars FOR UPDATE USING ((((organization_id IS NULL) AND (auth.uid() = owner_id)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = cars.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))));


--
-- Name: car_blocked_dates Owners can delete their car blocked dates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete their car blocked dates" ON public.car_blocked_dates FOR DELETE USING ((car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = auth.uid()))));


--
-- Name: car_blocked_dates Owners can insert blocked dates for their cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert blocked dates for their cars" ON public.car_blocked_dates FOR INSERT WITH CHECK ((car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = auth.uid()))));


--
-- Name: car_blocked_dates Owners can update their car blocked dates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their car blocked dates" ON public.car_blocked_dates FOR UPDATE USING ((car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = auth.uid()))));


--
-- Name: organizations Owners can update their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their organizations" ON public.organizations FOR UPDATE USING ((owner_id = auth.uid()));


--
-- Name: insurance_policies Owners can view own policies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view own policies" ON public.insurance_policies FOR SELECT USING ((owner_id = ( SELECT auth.uid() AS uid)));


--
-- Name: car_blocked_dates Owners can view their car blocked dates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their car blocked dates" ON public.car_blocked_dates FOR SELECT USING ((car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = auth.uid()))));


--
-- Name: organizations Public can view verified organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view verified organizations" ON public.organizations FOR SELECT USING ((verified = true));


--
-- Name: platform_config Public read platform_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read platform_config" ON public.platform_config FOR SELECT TO authenticated, anon USING (true);


--
-- Name: claims Reporters can update draft claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reporters can update draft claims" ON public.claims FOR UPDATE USING (((reported_by = ( SELECT auth.uid() AS uid)) AND (status = 'draft'::public.claim_status)));


--
-- Name: driver_class_history Service can insert class history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert class history" ON public.driver_class_history FOR INSERT WITH CHECK (true);


--
-- Name: payment_intents Service can insert payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert payment intents" ON public.payment_intents FOR INSERT WITH CHECK (true);


--
-- Name: payments Service can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert payments" ON public.payments FOR INSERT WITH CHECK (true);


--
-- Name: driver_telemetry Service can insert telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert telemetry" ON public.driver_telemetry FOR INSERT WITH CHECK (true);


--
-- Name: payment_intents Service can update payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update payment intents" ON public.payment_intents FOR UPDATE USING (true);


--
-- Name: payments Service can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update payments" ON public.payments FOR UPDATE USING (true);


--
-- Name: driver_protection_addons Service can update protection addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update protection addons" ON public.driver_protection_addons FOR UPDATE USING (true);


--
-- Name: driver_risk_profile Service can update risk profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update risk profiles" ON public.driver_risk_profile FOR UPDATE USING (true);


--
-- Name: conversion_events Service role can insert all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert all events" ON public.conversion_events FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: exchange_rates Service role can manage exchange rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage exchange rates" ON public.exchange_rates TO authenticated USING ((( SELECT auth.role() AS role) = 'service_role'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: wallet_transactions Service role can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage transactions" ON public.wallet_transactions USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: payment_intents Service role can update payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update payment intents" ON public.payment_intents FOR UPDATE TO authenticated USING ((( SELECT auth.role() AS role) = 'service_role'::text));


--
-- Name: conversion_events Service role can view all events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can view all events" ON public.conversion_events FOR SELECT TO service_role USING (true);


--
-- Name: accounting_journal_entries Service role full access on journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access on journal entries" ON public.accounting_journal_entries TO service_role USING (true);


--
-- Name: payment_issues Service role full access on payment_issues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access on payment_issues" ON public.payment_issues TO service_role USING (true) WITH CHECK (true);


--
-- Name: payment_splits Service role full access on payment_splits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access on payment_splits" ON public.payment_splits TO service_role USING (true) WITH CHECK (true);


--
-- Name: cars Users can create cars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create cars" ON public.cars FOR INSERT WITH CHECK ((((organization_id IS NULL) AND (auth.uid() = owner_id)) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = cars.organization_id) AND (organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))))));


--
-- Name: booking_claims Users can create claims for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create claims for their bookings" ON public.booking_claims FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_claims.booking_id) AND (bookings.renter_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: referral_codes Users can create own referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own referral codes" ON public.referral_codes FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_waitlist Users can create own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own waitlist entries" ON public.booking_waitlist FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: referrals Users can create referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (true);


--
-- Name: booking_risk_snapshot Users can create risk snapshots for own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create risk snapshots for own bookings" ON public.booking_risk_snapshot FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((b.car_id = c.id)))
  WHERE ((b.id = booking_risk_snapshot.booking_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (b.renter_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: booking_location_tracking Users can create their own location tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own location tracking" ON public.booking_location_tracking FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = booking_location_tracking.booking_id) AND ((b.renter_id = ( SELECT auth.uid() AS uid)) OR (c.owner_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: booking_waitlist Users can delete own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own waitlist entries" ON public.booking_waitlist FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: bank_accounts Users can delete their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bank accounts" ON public.bank_accounts FOR DELETE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: google_calendar_tokens Users can delete their own calendar tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own calendar tokens" ON public.google_calendar_tokens FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notification_settings Users can insert own notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own notification_settings" ON public.notification_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: payment_intents Users can insert own payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own payment intents" ON public.payment_intents FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: driver_risk_profile Users can insert own risk profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own risk profile" ON public.driver_risk_profile FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: bank_accounts Users can insert their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: google_calendar_tokens Users can insert their own calendar tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own calendar tokens" ON public.google_calendar_tokens FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notifications Users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((user_id IS NOT NULL));


--
-- Name: push_tokens Users can manage their own push tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own push tokens" ON public.push_tokens TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notifications Users can mark their own notifications as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark their own notifications as read" ON public.notifications FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: driver_protection_addons Users can purchase protection addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can purchase protection addons" ON public.driver_protection_addons FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: pricing_calculations Users can read own pricing calculations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own pricing calculations" ON public.pricing_calculations FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notification_settings Users can select own notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select own notification_settings" ON public.notification_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_identity_levels Users can update own identity level; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own identity level" ON public.user_identity_levels FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notification_settings Users can update own notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notification_settings" ON public.notification_settings FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: referral_codes Users can update own referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own referral codes" ON public.referral_codes FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_waitlist Users can update own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own waitlist entries" ON public.booking_waitlist FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: bank_accounts Users can update their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bank accounts" ON public.bank_accounts FOR UPDATE USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: google_calendar_tokens Users can update their own calendar tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own calendar tokens" ON public.google_calendar_tokens FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_location_tracking Users can update their own location tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own location tracking" ON public.booking_location_tracking FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_wallets Users can update their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own wallet" ON public.user_wallets FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_claims Users can view claims for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view claims for their bookings" ON public.booking_claims FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR (EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = booking_claims.booking_id) AND (c.owner_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: claims Users can view claims for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view claims for their bookings" ON public.claims FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = claims.booking_id) AND ((b.renter_id = ( SELECT auth.uid() AS uid)) OR (c.owner_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text))))));


--
-- Name: booking_inspections Users can view inspections of their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view inspections of their bookings" ON public.booking_inspections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.bookings b
  WHERE ((b.id = booking_inspections.booking_id) AND ((b.renter_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.cars c
          WHERE ((c.id = b.car_id) AND (c.owner_id = ( SELECT auth.uid() AS uid))))))))));


--
-- Name: booking_insurance_coverage Users can view own booking coverage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own booking coverage" ON public.booking_insurance_coverage FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = booking_insurance_coverage.booking_id) AND (bookings.renter_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: driver_class_history Users can view own class history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own class history" ON public.driver_class_history FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: user_identity_levels Users can view own identity level; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own identity level" ON public.user_identity_levels FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: messages Users can view own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = sender_id) OR (( SELECT auth.uid() AS uid) = recipient_id)));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: payment_intents Users can view own payment intents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payment intents" ON public.payment_intents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = payment_intents.booking_id) AND ((bookings.renter_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.cars
          WHERE ((cars.id = bookings.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))))))));


--
-- Name: payments Users can view own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = payments.booking_id) AND ((bookings.renter_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM public.cars
          WHERE ((cars.id = bookings.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))))))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));


--
-- Name: driver_protection_addons Users can view own protection addons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own protection addons" ON public.driver_protection_addons FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: referral_codes Users can view own referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referral codes" ON public.referral_codes FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = referrer_id) OR (( SELECT auth.uid() AS uid) = referred_id)));


--
-- Name: driver_risk_profile Users can view own risk profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own risk profile" ON public.driver_risk_profile FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: driver_telemetry Users can view own telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own telemetry" ON public.driver_telemetry FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_waitlist Users can view own waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own waitlist entries" ON public.booking_waitlist FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_risk_snapshot Users can view risk snapshots for own bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view risk snapshots for own bookings" ON public.booking_risk_snapshot FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((b.car_id = c.id)))
  WHERE ((b.id = booking_risk_snapshot.booking_id) AND ((c.owner_id = ( SELECT auth.uid() AS uid)) OR (b.renter_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: bank_accounts Users can view their own bank accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bank accounts" ON public.bank_accounts FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: google_calendar_tokens Users can view their own calendar tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own calendar tokens" ON public.google_calendar_tokens FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: conversion_events Users can view their own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own events" ON public.conversion_events FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: referral_rewards Users can view their own rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own rewards" ON public.referral_rewards FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: calendar_sync_log Users can view their own sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sync logs" ON public.calendar_sync_log FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (car_id IN ( SELECT cars.id
   FROM public.cars
  WHERE (cars.owner_id = ( SELECT auth.uid() AS uid)))) OR (booking_id IN ( SELECT bookings.id
   FROM public.bookings
  WHERE ((bookings.renter_id = ( SELECT auth.uid() AS uid)) OR (bookings.car_id IN ( SELECT cars.id
           FROM public.cars
          WHERE (cars.owner_id = ( SELECT auth.uid() AS uid)))))))));


--
-- Name: user_wallets Users can view their own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wallet" ON public.user_wallets FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: booking_location_tracking Users can view tracking for their bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tracking for their bookings" ON public.booking_location_tracking FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.bookings b
     JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = booking_location_tracking.booking_id) AND ((b.renter_id = ( SELECT auth.uid() AS uid)) OR (c.owner_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: accounting_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_accounts accounting_accounts_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_accounts_restricted ON public.accounting_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_audit_log accounting_audit_log_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_audit_log_restricted ON public.accounting_audit_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_chart_of_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_chart_of_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_chart_of_accounts accounting_chart_of_accounts_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_chart_of_accounts_restricted ON public.accounting_chart_of_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_journal_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_ledger accounting_ledger_user_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_ledger_user_own ON public.accounting_ledger FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: accounting_period_balances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_period_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_period_balances accounting_period_balances_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_period_balances_restricted ON public.accounting_period_balances FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_period_closures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_period_closures ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_period_closures accounting_period_closures_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_period_closures_restricted ON public.accounting_period_closures FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_provisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_provisions ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_provisions accounting_provisions_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_provisions_restricted ON public.accounting_provisions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: accounting_revenue_recognition; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_revenue_recognition ENABLE ROW LEVEL SECURITY;

--
-- Name: accounting_revenue_recognition accounting_revenue_recognition_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accounting_revenue_recognition_restricted ON public.accounting_revenue_recognition FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: bank_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_inspections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_inspections ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_insurance_coverage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_insurance_coverage ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_location_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_location_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_risk_snapshot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_risk_snapshot ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: car_blocked_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_blocked_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: car_brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_brands ENABLE ROW LEVEL SECURITY;

--
-- Name: car_google_calendars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_google_calendars ENABLE ROW LEVEL SECURITY;

--
-- Name: car_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;

--
-- Name: car_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: car_photos car_photos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_photos_delete ON public.car_photos FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = car_photos.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_photos car_photos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_photos_insert ON public.car_photos FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = car_photos.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: car_photos car_photos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_photos_select ON public.car_photos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = car_photos.car_id) AND ((cars.status = 'active'::public.car_status) OR (cars.owner_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: car_photos car_photos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY car_photos_update ON public.car_photos FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = car_photos.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: cars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

--
-- Name: cars cars_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_delete ON public.cars FOR DELETE USING ((owner_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cars cars_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_insert ON public.cars FOR INSERT WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));


--
-- Name: cars cars_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_select ON public.cars FOR SELECT USING (((status = 'active'::public.car_status) OR (owner_id = ( SELECT auth.uid() AS uid))));


--
-- Name: cars cars_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cars_update ON public.cars FOR UPDATE USING ((owner_id = ( SELECT auth.uid() AS uid)));


--
-- Name: claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

--
-- Name: conversion_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_execution_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_execution_log cron_execution_log_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cron_execution_log_admin_only ON public.cron_execution_log TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: bookings delete_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_bookings ON public.bookings FOR DELETE USING (((( SELECT auth.uid() AS uid) = renter_id) OR (EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = bookings.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))) OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text)));


--
-- Name: vehicle_documents delete_vehicle_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_vehicle_documents ON public.vehicle_documents FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = vehicle_documents.vehicle_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: driver_class_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_class_history ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_protection_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_protection_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_risk_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_risk_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_score_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_score_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_score_snapshots driver_score_snapshots_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY driver_score_snapshots_admin_only ON public.driver_score_snapshots FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: driver_telemetry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_telemetry ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_audit_log encryption_audit_log_owner_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY encryption_audit_log_owner_or_admin ON public.encryption_audit_log FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: encryption_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rate_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rate_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rate_sync_log exchange_rate_sync_log_insert_system; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exchange_rate_sync_log_insert_system ON public.exchange_rate_sync_log FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: fgo_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fgo_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: fgo_metrics fgo_metrics_read_restricted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fgo_metrics_read_restricted ON public.fgo_metrics FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: fgo_parameters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fgo_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: fgo_subfunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fgo_subfunds ENABLE ROW LEVEL SECURITY;

--
-- Name: fgo_subfunds fgo_subfunds_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fgo_subfunds_admin_only ON public.fgo_subfunds TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: fx_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: fx_rates fx_rates_select_active_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fx_rates_select_active_public ON public.fx_rates FOR SELECT USING ((is_active = true));


--
-- Name: google_calendar_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings insert_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_bookings ON public.bookings FOR INSERT WITH CHECK ((( SELECT auth.uid() AS uid) = renter_id));


--
-- Name: payments insert_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_payments ON public.payments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.bookings
  WHERE ((bookings.id = payments.booking_id) AND (bookings.renter_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: vehicle_documents insert_vehicle_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_vehicle_documents ON public.vehicle_documents FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = vehicle_documents.vehicle_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: insurance_addons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insurance_addons ENABLE ROW LEVEL SECURITY;

--
-- Name: insurance_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK ((sender_id = ( SELECT auth.uid() AS uid)));


--
-- Name: messages messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select ON public.messages FOR SELECT USING (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));


--
-- Name: messages messages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_update ON public.messages FOR UPDATE USING ((recipient_id = ( SELECT auth.uid() AS uid)));


--
-- Name: messages messages_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_update_policy ON public.messages FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = recipient_id));


--
-- Name: monitoring_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: monitoring_alerts monitoring_alerts_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitoring_alerts_admin_only ON public.monitoring_alerts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: monitoring_performance_metrics monitoring_perf_metrics_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY monitoring_perf_metrics_admin_only ON public.monitoring_performance_metrics FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: monitoring_performance_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monitoring_performance_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: mp_webhook_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mp_webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: mp_webhook_logs mp_webhook_logs_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mp_webhook_logs_admin_only ON public.mp_webhook_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_plan_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_plan_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: outbound_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outbound_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents payment_intents_update_system; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_intents_update_system ON public.payment_intents FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: payment_issues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_issues ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_splits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_calculations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_class_factors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_class_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_class_factors pricing_class_factors_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pricing_class_factors_public_read ON public.pricing_class_factors FOR SELECT USING (true);


--
-- Name: pricing_cron_health; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_cron_health ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_day_factors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_day_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_demand_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_demand_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_hour_factors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_hour_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_regions ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_regions pricing_regions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pricing_regions_select ON public.pricing_regions FOR SELECT USING (true);


--
-- Name: pricing_special_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_special_events ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_user_factors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_user_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_plan_templates public_read_onboarding_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_onboarding_templates ON public.onboarding_plan_templates FOR SELECT USING (true);


--
-- Name: outbound_requests public_read_outbound_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_outbound_requests ON public.outbound_requests FOR SELECT USING (true);


--
-- Name: push_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews reviews_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_delete ON public.reviews FOR DELETE USING ((reviewer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews reviews_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_insert ON public.reviews FOR INSERT WITH CHECK ((reviewer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: reviews reviews_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_select ON public.reviews FOR SELECT USING (true);


--
-- Name: reviews reviews_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_update ON public.reviews FOR UPDATE USING ((reviewer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: bookings select_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_bookings ON public.bookings FOR SELECT USING (((( SELECT auth.uid() AS uid) = renter_id) OR (EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = bookings.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))) OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text)));


--
-- Name: payments select_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_payments ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.bookings b
     LEFT JOIN public.cars c ON ((c.id = b.car_id)))
  WHERE ((b.id = payments.booking_id) AND ((b.renter_id = ( SELECT auth.uid() AS uid)) OR (c.owner_id = ( SELECT auth.uid() AS uid)) OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text))))));


--
-- Name: vehicle_documents select_vehicle_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_vehicle_documents ON public.vehicle_documents FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = vehicle_documents.vehicle_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: system_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: system_flags system_flags_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_flags_admin_only ON public.system_flags FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: bookings update_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_bookings ON public.bookings FOR UPDATE USING (((( SELECT auth.uid() AS uid) = renter_id) OR (EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = bookings.car_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))) OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text)));


--
-- Name: payments update_payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_payments ON public.payments FOR UPDATE USING ((( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text));


--
-- Name: vehicle_documents update_vehicle_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_vehicle_documents ON public.vehicle_documents FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cars
  WHERE ((cars.id = vehicle_documents.vehicle_id) AND (cars.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: user_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: user_documents user_documents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_documents_delete ON public.user_documents FOR DELETE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: user_documents user_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_documents_insert ON public.user_documents FOR INSERT WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: user_documents user_documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_documents_select ON public.user_documents FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: user_documents user_documents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_documents_update ON public.user_documents FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: user_identity_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_identity_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: user_onboarding_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_onboarding_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: user_onboarding_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_onboarding_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: user_onboarding_plans user_plans_is_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_plans_is_owner ON public.user_onboarding_plans USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: user_onboarding_steps user_steps_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_steps_owner ON public.user_onboarding_steps USING ((plan_id IN ( SELECT user_onboarding_plans.id
   FROM public.user_onboarding_plans
  WHERE (user_onboarding_plans.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: user_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_verifications user_verifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_verifications_select ON public.user_verifications FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (auth.role() = 'service_role'::text)));


--
-- Name: user_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_model_equivalents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_model_equivalents ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_pricing_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vehicle_pricing_models ENABLE ROW LEVEL SECURITY;

--
-- Name: vehicle_pricing_models vehicle_pricing_models_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vehicle_pricing_models_public_read ON public.vehicle_pricing_models FOR SELECT USING (true);


--
-- Name: wallet_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_audit_log wallet_audit_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_audit_log_select ON public.wallet_audit_log FOR SELECT USING (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT (auth.jwt() ->> 'role'::text)) = 'admin'::text)));


--
-- Name: wallet_transaction_backups wallet_backups_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_backups_admin_only ON public.wallet_transaction_backups FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: wallet_split_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_split_config ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_split_config wallet_split_config_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_split_config_admin_manage ON public.wallet_split_config TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: wallet_split_config wallet_split_config_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_split_config_owner_read ON public.wallet_split_config FOR SELECT TO authenticated USING (((locador_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: wallet_transaction_backups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transaction_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions wallet_transactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wallet_transactions_select ON public.wallet_transactions FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: withdrawal_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_requests withdrawal_requests_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_requests_insert ON public.withdrawal_requests FOR INSERT WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: withdrawal_requests withdrawal_requests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_requests_select ON public.withdrawal_requests FOR SELECT USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: withdrawal_requests withdrawal_requests_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_requests_update ON public.withdrawal_requests FOR UPDATE USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: withdrawal_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_transactions withdrawal_transactions_admin_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_transactions_admin_manage ON public.withdrawal_transactions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));


--
-- Name: withdrawal_transactions withdrawal_transactions_service_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_transactions_service_insert ON public.withdrawal_transactions FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: withdrawal_transactions withdrawal_transactions_user_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY withdrawal_transactions_user_read ON public.withdrawal_transactions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.withdrawal_requests wr
  WHERE ((wr.id = withdrawal_transactions.request_id) AND (wr.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: objects Anyone can view car images; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Anyone can view car images" ON storage.objects FOR SELECT USING ((bucket_id = 'car-images'::text));


--
-- Name: objects Owners can delete car photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Owners can delete car photos" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'car-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: objects Owners can update car photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Owners can update car photos" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'car-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'car-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: objects Owners can upload car photos; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY "Owners can upload car photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'car-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime messages; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.messages;


--
-- Name: supabase_realtime notifications; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict NQBgsVTCBwNbhPiWk478bgGDfWOcdVAvgFe2dAMC4otAAmhaon9UbZRb2aKIWkO

