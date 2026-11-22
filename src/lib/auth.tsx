import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Category, PlatformSettings, Profile, Worker } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** The signed-in user's worker profile, if they registered as a worker. */
  worker: Worker | null;
  settings: PlatformSettings;
  categories: Category[];
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const FALLBACK_SETTINGS: PlatformSettings = {
  id: 1,
  name: 'manino_one',
  currency: 'UZS',
  commission_percent: 5,
  support_phone: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(FALLBACK_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string | undefined) => {
    if (!userId) { setProfile(null); setWorker(null); return; }
    setProfileLoading(true);
    const [p, w] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('workers').select('*').eq('profile_id', userId).maybeSingle(),
    ]);
    setProfile(p.data as Profile | null);
    setWorker(w.data as Worker | null);
    setProfileLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
    if (error) console.error('Could not load platform_settings (has the marketplace migration been run?):', error.message);
    if (data) setSettings({ ...(data as PlatformSettings), commission_percent: Number(data.commission_percent) });
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort').order('name');
    setCategories((data as Category[]) ?? []);
  };

  useEffect(() => { loadProfile(session?.user.id); }, [session?.user.id]);
  useEffect(() => { loadSettings(); loadCategories(); }, []);

  const value: AuthState = {
    session,
    profile,
    worker,
    settings,
    categories,
    loading: sessionLoading || profileLoading,
    refreshProfile: () => loadProfile(session?.user.id),
    refreshSettings: loadSettings,
    refreshCategories: loadCategories,
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
