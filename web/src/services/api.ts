import { supabase, Profile, Farm, Road, FarmPlan } from '../lib/supabase';

// --- Auth ---
export async function signUp(email: string, password: string, role: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// --- Profile ---
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

// --- Farms ---
export async function getFarms() {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Farm[];
}

export async function createFarm(name: string, cropType: string | null, boundary: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Convert GeoJSON boundary to PostGIS geometry via ST_GeomFromGeoJSON
  const { data, error } = await supabase.rpc('create_farm_with_boundary', {
    p_name: name,
    p_owner_id: user.id,
    p_crop_type: cropType,
    p_boundary: boundary,
  });
  if (error) throw error;
  return data as Farm;
}

export async function updateFarm(farmId: string, updates: Partial<Pick<Farm, 'name' | 'crop_type' | 'boundary'>>) {
  const { data, error } = await supabase
    .from('farms')
    .update(updates)
    .eq('id', farmId)
    .select()
    .single();
  if (error) throw error;
  return data as Farm;
}

export async function getFarm(farmId: string) {
  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('id', farmId)
    .single();
  if (error) throw error;
  return data as Farm;
}

export async function deleteFarm(farmId: string) {
  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('id', farmId);
  if (error) throw error;
}

// --- Roads ---
export async function getRoads(farmId: string) {
  const { data, error } = await supabase
    .from('roads')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as Road[];
}

export async function createRoad(farmId: string, label: string, path: any) {
  const { data, error } = await supabase
    .from('roads')
    .insert({
      farm_id: farmId,
      label,
      path,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Road;
}

// --- Farm Plans ---
export async function getFarmPlans(farmId: string) {
  const { data, error } = await supabase
    .from('farm_plans')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as FarmPlan[];
}

export async function createFarmPlan(farmId: string, title: string, description: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('farm_plans')
    .insert({
      farm_id: farmId,
      user_id: user.id,
      title,
      description,
      status: 'draft',
    })
    .select()
    .single();
  if (error) throw error;
  return data as FarmPlan;
}
