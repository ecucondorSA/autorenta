-- Verificar autos sin region_id
SELECT id, brand, model, year, region_id 
FROM cars 
WHERE region_id IS NULL 
ORDER BY created_at DESC;

-- Asignar region_id por defecto (Buenos Aires) a los autos que no lo tienen
-- Primero obtener el ID de la región de Buenos Aires
WITH buenos_aires AS (
  SELECT id FROM regions WHERE name = 'Buenos Aires' LIMIT 1
)
UPDATE cars 
SET region_id = (SELECT id FROM buenos_aires)
WHERE region_id IS NULL;

-- Verificar actualización
SELECT id, brand, model, year, region_id 
FROM cars 
WHERE brand IN ('Chevrolet', 'Toyota') 
  AND model IN ('Onix', 'Cruze', 'Hilux')
  AND year = 2025;
