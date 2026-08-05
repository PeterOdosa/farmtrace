import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
  setIsCheckingAuth: (value: boolean) => void;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, role: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isCheckingAuth: true,
  isAuthenticated: false,
  setIsCheckingAuth: (value: boolean) => set({ isCheckingAuth: value }),

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const hasUser = session?.user ?? null;
    set({ session, user: hasUser, isLoading: false, isAuthenticated: !!hasUser });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      set({ session, user, isAuthenticated: !!user });
    });

    // Store subscription for cleanup (returned separately if needed)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _cleanup = () => subscription.unsubscribe();
  },

  signUp: async (email: string, password: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }
      }
    });

    if (!error && data.user) {
      // Create profile immediately
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        role
      });
    }

    return { error };
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },

  refreshSession: async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (!error && session) {
      set({ session, user: session.user });
    }
  }
}));
