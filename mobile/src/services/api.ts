import { supabase } from './supabaseClient';
import { User, PostgrestError } from '@supabase/supabase-js';

// --- Types ---
export interface Farm {
  id: string;
  name: string;
  owner_id: string;
  crop_type?: string;
  boundary?: { type: string; coordinates: number[][][] };
  area_hectares?: number;
  perimeter_km?: number;
  created_at: string;
  updated_at: string;
}

export interface Road {
  id: string;
  farm_id: string;
  label?: string;
  path: { type: string; coordinates: number[][] };
  length_km?: number;
  created_at: string;
}

export interface FarmPlan {
  id: string;
  farm_id: string;
  created_by: string;
  updated_by: string;
  version: number;
  elements: any[];
  created_at: string;
  updated_at: string;
}

export interface Collaboration {
  id: string;
  farm_id: string;
  farmer_id: string;
  agronomist_id: string;
  permission_level: string;
}

// --- Farms ---
export async function getFarms() {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Farm[];
}

export async function createFarm(name: string, crop_type: string, boundary: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('farms')
    .insert({ name, owner_id: user.id, crop_type, boundary })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Farm;
}

export async function getFarm(id: string) {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Farm;
}

export async function updateFarm(id: string, updates: Partial<Farm>) {
  const { data, error } = await supabase
    .from('farms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Farm;
}

export async function deleteFarm(id: string) {
  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// --- Roads ---
export async function getRoads(farmId: string) {
  const { data, error } = await supabase
    .from('roads')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at');

  if (error) throw new Error(error.message);
  return data as Road[];
}

export async function createRoad(farmId: string, label: string, path: any) {
  const { data, error } = await supabase
    .from('roads')
    .insert({ farm_id: farmId, label, path })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Road;
}

export async function deleteRoad(farmId: string, roadId: string) {
  const { error } = await supabase
    .from('roads')
    .delete()
    .eq('id', roadId)
    .eq('farm_id', farmId);

  if (error) throw new Error(error.message);
}

// --- Plans ---
export async function getPlan(farmId: string) {
  const { data, error } = await supabase
    .from('farm_plans')
    .select('*')
    .eq('farm_id', farmId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data as FarmPlan | null;
}

export async function savePlan(farmId: string, elements: any[]) {
  // Get current max version
  const { data: latest } = await supabase
    .from('farm_plans')
    .select('version')
    .eq('farm_id', farmId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  const { data, error } = await supabase
    .from('farm_plans')
    .insert({ farm_id: farmId, version, elements })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FarmPlan;
}

export async function getPlanHistory(farmId: string) {
  const { data, error } = await supabase
    .from('farm_plans')
    .select('*')
    .eq('farm_id', farmId)
    .order('version', { ascending: false });

  if (error) throw new Error(error.message);
  return data as FarmPlan[];
}

// --- Collaborations ---
export async function inviteCollaborator(farmId: string, agronomistEmail: string) {
  // First, find the agronomist's user ID
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', agronomistEmail)
    .eq('role', 'agronomist')
    .single();

  if (userError || !user) throw new Error('Agronomist not found');

  const { data, error } = await supabase
    .from('collaborations')
    .insert({
      farm_id: farmId,
      farmer_id: (await supabase.auth.getUser()).data.user?.id,
      agronomist_id: user.id,
      permission_level: 'edit'
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Collaboration;
}

export async function getCollaborators(farmId: string) {
  const { data, error } = await supabase
    .from('collaborations')
    .select('*, profiles!agronomist_id(email), profiles!farmer_id(email)')
    .eq('farm_id', farmId);

  if (error) throw new Error(error.message);
  return data as any[];
}

export async function updatePermission(farmId: string, userId: string, permissionLevel: string) {
  const { data, error } = await supabase
    .from('collaborations')
    .update({ permission_level: permissionLevel })
    .eq('farm_id', farmId)
    .eq('agronomist_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Collaboration;
}

// --- Auth Helpers (legacy compatibility) ---
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
