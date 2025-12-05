import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment or localStorage
const getSupabaseUrl = (): string => {
  // Check localStorage first (for user-provided URL)
  const storedUrl = localStorage.getItem('SUPABASE_URL');
  if (storedUrl) return storedUrl;
  
  // Fallback to environment variable
  const envUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (envUrl) return envUrl;
  
  throw new Error('Supabase URL not configured');
};

const getSupabaseAnonKey = (): string => {
  // Check localStorage first (for user-provided key)
  const storedKey = localStorage.getItem('SUPABASE_ANON_KEY');
  if (storedKey) return storedKey;
  
  // Fallback to environment variable
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (envKey) return envKey;
  
  throw new Error('Supabase anon key not configured');
};

// Initialize Supabase client
let supabase: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (!supabase) {
    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          redirectTo: window.location.origin + window.location.pathname,
        },
      });
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      // Prompt user for credentials if not found
      const url = prompt('Please enter your Supabase Project URL:\n\nFind it at: https://supabase.com/dashboard/project/_/settings/api');
      const key = prompt('Please enter your Supabase Anon/Public Key:\n\nFind it at: https://supabase.com/dashboard/project/_/settings/api');
      
      if (url && key) {
        localStorage.setItem('SUPABASE_URL', url);
        localStorage.setItem('SUPABASE_ANON_KEY', key);
        supabase = createClient(url, key, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            redirectTo: window.location.origin + window.location.pathname,
          },
        });
      } else {
        throw new Error('Supabase credentials are required');
      }
    }
  }
  return supabase;
};

export default getSupabase;


