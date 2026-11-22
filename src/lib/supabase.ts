import { createClient } from '@supabase/supabase-js';

// Publishable keys are safe to ship in client code. Env vars (web/.env or your
// hosting provider's settings) override these defaults.
const DEFAULT_URL = 'https://osaulyeznusxugmejzaz.supabase.co';
const DEFAULT_KEY = 'sb_publishable_T6F7ByYY1ivoMhJ-J9ytCw_YBKgqaao';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

export const supabase = createClient(url, anonKey);
