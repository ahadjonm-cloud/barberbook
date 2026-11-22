import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, ShopSettings } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  settings: ShopSettings | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const FALLBACK_SETTINGS: ShopSettings = {
  id: 1,
  name: 'Barbershop',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currency: 'USD',
  slot_minutes: 15,
  min_notice_minutes: 60,
  max_days_ahead: 30,
  phone: null,
  address: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
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
    if (!userId) { setProfile(null); return; }
    setProfileLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
    setProfileLoading(false);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (error) console.error('Could not load shop_settings (has the SQL migration been run?):', error.message);
    setSettings((data as ShopSettings | null) ?? FALLBACK_SETTINGS);
  };

  useEffect(() => { loadProfile(session?.user.id); }, [session?.user.id]);
  useEffect(() => { loadSettings(); }, []);

  const value: AuthState = {
    session,
    profile,
    settings,
    loading: sessionLoading || profileLoading || !settings,
    refreshProfile: () => loadProfile(session?.user.id),
    refreshSettings: loadSettings,
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
