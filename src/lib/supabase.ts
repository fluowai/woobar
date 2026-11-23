import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string) => {
  return (window as any).ENV?.[key] || (import.meta as any).env[key] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);