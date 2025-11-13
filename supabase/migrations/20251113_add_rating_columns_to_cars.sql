-- ============================================================================
-- AUTORENTAR - Add rating columns to cars table
-- ============================================================================
-- Purpose: Add rating_avg and rating_count columns to cars table to support
--          car ratings display in CarCard component and prevent API errors
-- Date: 2025-11-13
-- ============================================================================

-- Add rating columns to cars table with default values
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0.0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0);

-- Add index for filtering/sorting by rating
CREATE INDEX IF NOT EXISTS idx_cars_rating_avg ON public.cars(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_cars_rating_count ON public.cars(rating_count DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.cars.rating_avg IS 'Average rating from reviews (0-5 stars)';
COMMENT ON COLUMN public.cars.rating_count IS 'Total number of reviews for this car';

-- ============================================================================
-- Update existing car stats from reviews table (if reviews system is set up)
-- ============================================================================
-- This will populate the rating columns for cars that already have reviews
-- If the car_stats table exists, use it. Otherwise, calculate from reviews.

DO $$
BEGIN
  -- Try to update from car_stats if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'car_stats') THEN
    UPDATE public.cars c
    SET
      rating_avg = COALESCE(cs.rating_avg, 0.0),
      rating_count = COALESCE(cs.reviews_count, 0)
    FROM public.car_stats cs
    WHERE c.id = cs.car_id;

    RAISE NOTICE 'Updated car ratings from car_stats table';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    -- If car_stats doesn't exist but reviews does, calculate directly from reviews
    UPDATE public.cars c
    SET
      rating_avg = COALESCE(
        (SELECT AVG(rating_overall)
         FROM public.reviews
         WHERE car_id = c.id AND is_visible = true),
        0.0
      ),
      rating_count = COALESCE(
        (SELECT COUNT(*)
         FROM public.reviews
         WHERE car_id = c.id AND is_visible = true),
        0
      );

    RAISE NOTICE 'Updated car ratings from reviews table';
  ELSE
    RAISE NOTICE 'No reviews or car_stats tables found - skipping rating update';
  END IF;
END $$;

-- ============================================================================
-- Create trigger to keep ratings in sync with reviews (if reviews exists)
-- ============================================================================
-- This trigger will automatically update car ratings when reviews change

CREATE OR REPLACE FUNCTION public.update_car_rating_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the car's rating whenever a review is inserted, updated, or deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE public.cars
    SET
      rating_avg = COALESCE(
        (SELECT AVG(rating_overall)
         FROM public.reviews
         WHERE car_id = OLD.car_id AND is_visible = true),
        0.0
      ),
      rating_count = COALESCE(
        (SELECT COUNT(*)
         FROM public.reviews
         WHERE car_id = OLD.car_id AND is_visible = true),
        0
      )
    WHERE id = OLD.car_id;
  ELSE
    UPDATE public.cars
    SET
      rating_avg = COALESCE(
        (SELECT AVG(rating_overall)
         FROM public.reviews
         WHERE car_id = NEW.car_id AND is_visible = true),
        0.0
      ),
      rating_count = COALESCE(
        (SELECT COUNT(*)
         FROM public.reviews
         WHERE car_id = NEW.car_id AND is_visible = true),
        0
      )
    WHERE id = NEW.car_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on reviews table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP TRIGGER IF EXISTS trigger_update_car_rating ON public.reviews;
    CREATE TRIGGER trigger_update_car_rating
      AFTER INSERT OR UPDATE OR DELETE ON public.reviews
      FOR EACH ROW
      EXECUTE FUNCTION public.update_car_rating_on_review_change();

    RAISE NOTICE 'Created trigger to sync car ratings with reviews';
  ELSE
    RAISE NOTICE 'Reviews table not found - skipping trigger creation';
  END IF;
END $$;

-- ============================================================================
-- Migration complete
-- ============================================================================
RAISE NOTICE '✅ Migration 20251113_add_rating_columns_to_cars completed successfully';
