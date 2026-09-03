-- ==========================================
-- FarmTrace: Add RPC for creating farms with GPS boundary
-- Run this in the Supabase SQL Editor
-- ==========================================

-- Function to create a farm with GeoJSON boundary
-- Converts GeoJSON to PostGIS geometry and computes area/perimeter
CREATE OR REPLACE FUNCTION public.create_farm_with_boundary(
  p_name TEXT,
  p_owner_id UUID,
  p_crop_type TEXT,
  p_boundary JSONB
)
RETURNS public.farms
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner's privileges (bypasses RLS)
AS $$
DECLARE
  v_farm public.farms;
BEGIN
  -- Validate boundary has required geometry type
  IF p_boundary->>'type' NOT IN ('Polygon', 'MultiPolygon') THEN
    RAISE EXCEPTION 'Boundary must be a Polygon or MultiPolygon';
  END IF;

  -- Insert farm with boundary converted from GeoJSON to PostGIS
  INSERT INTO public.farms (name, owner_id, crop_type, boundary)
  VALUES (
    p_name,
    p_owner_id,
    p_crop_type,
    ST_SetSRID(
      ST_GeomFromGeoJSON(p_boundary::text),
      4326
    )
  )
  RETURNING * INTO v_farm;

  RETURN v_farm;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_farm_with_boundary TO authenticated;
