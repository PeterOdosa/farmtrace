import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ycvcfvnyoqcoziddcbrx.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmNmdm55b3Fjb3ppZGRjYnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjM0MzUsImV4cCI6MjEwMTQzOTQzNX0.HM8UneqhC9QUfIL-orTaacJhVMQVeTZNDC2otlAcXGc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
