-- Add preferred_regions column to profiles table for international news preferences
ALTER TABLE public.profiles 
ADD COLUMN preferred_regions jsonb DEFAULT '["Brazil"]'::jsonb;