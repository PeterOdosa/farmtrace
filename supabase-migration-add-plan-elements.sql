-- Add elements JSONB column to farm_plans table
-- Stores drawn plan elements (zones, paths, markers) as GeoJSON

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farm_plans' AND column_name = 'elements'
  ) THEN
    ALTER TABLE farm_plans ADD COLUMN elements JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added elements JSONB column to farm_plans';
  ELSE
    RAISE NOTICE 'elements column already exists on farm_plans';
  END IF;
END
$$;
