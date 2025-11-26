import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Strict check for production
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('FATAL: Missing Supabase environment variables in production build.');
}

// Fallback for development only
const urlToUse = supabaseUrl || 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

if (!supabaseUrl) {
  console.warn(
    '⚠️  VITE_SUPABASE_URL is missing. Using placeholder URL.\n' +
    'Authentication and database features will NOT work.\n' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(urlToUse, keyToUse);