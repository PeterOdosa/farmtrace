-- ==========================================
-- FarmTrace Supabase Migration Script
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'agronomist', 'org_admin')),
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update the 'updated_at' column on row update
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles.updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create farms table
CREATE TABLE public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_type TEXT,
  boundary GEOMETRY(Polygon, 4326),
  area_hectares DOUBLE PRECISION GENERATED ALWAYS AS (ST_Area(boundary::geography) / 10000) STORED,
  perimeter_km DOUBLE PRECISION GENERATED ALWAYS AS (ST_Length(boundary::geography) / 1000) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for farms.updated_at
CREATE TRIGGER set_farms_updated_at
  BEFORE UPDATE ON public.farms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. Create roads table
CREATE TABLE public.roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  label TEXT,
  path GEOMETRY(LineString, 4326),
  length_km DOUBLE PRECISION GENERATED ALWAYS AS (ST_Length(path::geography) / 1000) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create farm_plans table (versioned)
CREATE TABLE public.farm_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  elements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON public.farm_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Create collaborations table
CREATE TABLE public.collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agronomist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'edit' CHECK (permission_level IN ('view', 'suggest', 'edit')),
  UNIQUE(farm_id, farmer_id, agronomist_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables (profiles already enabled above)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Farms policies
CREATE POLICY "Users can view owned or shared farms"
  ON public.farms FOR SELECT
  USING (
    auth.uid() = owner_id
    OR id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid())
  );

CREATE POLICY "Users can create farms"
  ON public.farms FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own farms"
  ON public.farms FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own farms"
  ON public.farms FOR DELETE
  USING (auth.uid() = owner_id);

-- Roads policies
CREATE POLICY "Users can view roads of owned farms"
  ON public.roads FOR SELECT
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid()));

CREATE POLICY "Users can create roads on owned farms"
  ON public.roads FOR INSERT
  WITH CHECK (
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid())
  );

CREATE POLICY "Users can delete roads on owned farms"
  ON public.roads FOR DELETE
  USING (
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid())
  );

-- Farm Plans policies
CREATE POLICY "Users can view plans of owned farms"
  ON public.farm_plans FOR SELECT
  USING (farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid()));

CREATE POLICY "Users can create plans on owned farms"
  ON public.farm_plans FOR INSERT
  WITH CHECK (
    farm_id IN (SELECT id FROM public.farms WHERE owner_id = auth.uid())
    OR farm_id IN (SELECT farm_id FROM public.collaborations WHERE agronomist_id = auth.uid())
  );

-- Collaborations policies
CREATE POLICY "Farm owners can manage collaborations"
  ON public.collaborations FOR ALL
  USING (auth.uid() = farmer_id);

-- ==========================================
-- STORAGE (Optional: for farm images/boundaries)
-- ==========================================
-- Create storage bucket for farm media if needed
-- INSERT INTO storage.buckets (id, name, public) VALUES ('farm-media', 'farm-media', false);
