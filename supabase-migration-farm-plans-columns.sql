-- Add missing columns to farm_plans
ALTER TABLE public.farm_plans ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;
ALTER TABLE public.farm_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

-- Update the trigger to handle status column if needed (no, it's auto-handled)

-- Ensure status has a default for existing rows
UPDATE public.farm_plans SET status = 'draft' WHERE status IS NULL;
