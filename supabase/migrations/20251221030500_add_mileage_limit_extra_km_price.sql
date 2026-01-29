alter table cars
  add column if not exists mileage_limit integer,
  add column if not exists extra_km_price numeric;
