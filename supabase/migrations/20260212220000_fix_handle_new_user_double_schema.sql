-- Fix: handle_new_user() had "public.public.profiles" (double schema prefix)
-- PostgreSQL treats 3-part names as database.schema.table → cross-database reference error
-- This blocked ALL new user registrations (500: Database error creating new user)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, default_currency, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'default_currency', 'ARS'),
    'locatario',
    false
  );
  RETURN NEW;
END;
$$;
