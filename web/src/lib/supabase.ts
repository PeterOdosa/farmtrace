import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Profile = {
  id: string;
  email: string;
  role: 'farmer' | 'agronomist' | 'org_admin';
  created_at: string;
  updated_at: string;
};

export type Farm = {
  id: string;
  name: string;
  owner_id: string;
  crop_type: string | null;
  area_hectares: number | null;
  perimeter_km: number | null;
  boundary: any | null;
  created_at: string;
  updated_at: string;
};

export type Road = {
  id: string;
  farm_id: string;
  label: string;
  path: any;
  length_km: number | null;
  created_at: string;
  updated_at: string;
};

export type FarmPlan = {
  id: string;
  farm_id: string;
  created_by: string | null;
  updated_by: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed';
  elements: any[] | null;
  created_at: string;
  updated_at: string;
};
