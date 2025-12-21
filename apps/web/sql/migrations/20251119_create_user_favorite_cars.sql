-- Migration: Create user_favorite_cars table for Renter Flow V3
-- Description: Allows users to save/favorite cars for later viewing
-- Author: Claude Code
-- Date: 2025-11-19

-- Create table
CREATE TABLE IF NOT EXISTS public.user_favorite_cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, car_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_favorite_cars_user_id ON public.user_favorite_cars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_cars_car_id ON public.user_favorite_cars(car_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_cars_created_at ON public.user_favorite_cars(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_favorite_cars ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorite_cars
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can add favorites
CREATE POLICY "Users can add favorites"
  ON public.user_favorite_cars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
  ON public.user_favorite_cars
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.user_favorite_cars IS 'Stores user favorite/saved cars for Renter Flow V3';
COMMENT ON COLUMN public.user_favorite_cars.user_id IS 'User who favorited the car';
COMMENT ON COLUMN public.user_favorite_cars.car_id IS 'The favorited car';
COMMENT ON COLUMN public.user_favorite_cars.created_at IS 'When the car was favorited';
