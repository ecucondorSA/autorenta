-- Arreglar las políticas RLS con el nombre correcto de columna

-- Eliminar políticas existentes que fallaron
DROP POLICY IF EXISTS "Users can view coverage of their bookings" ON booking_insurance_coverage;
DROP POLICY IF EXISTS "Users can view claims they're involved in" ON insurance_claims;
DROP POLICY IF EXISTS "Users can report claims for their bookings" ON insurance_claims;

-- Recrear con renter_id correcto
CREATE POLICY "Users can view coverage of their bookings"
ON booking_insurance_coverage FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings WHERE renter_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view claims they're involved in"
ON insurance_claims FOR SELECT
USING (
  reported_by = auth.uid() OR
  booking_id IN (
    SELECT id FROM bookings WHERE renter_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can report claims for their bookings"
ON insurance_claims FOR INSERT
WITH CHECK (
  reported_by = auth.uid() AND
  booking_id IN (
    SELECT id FROM bookings WHERE renter_id = auth.uid()
    UNION
    SELECT b.id FROM bookings b JOIN cars c ON b.car_id = c.id WHERE c.owner_id = auth.uid()
  )
);
