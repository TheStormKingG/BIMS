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

// Get redirect URL - use current origin, fallback to production
const getRedirectUrl = (): string => {
  // Use current origin for better mobile compatibility
  // Fallback to production URL if on localhost
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://stashway.app/overview';
    }
    return `${window.location.origin}/overview`;
  }
  return 'https://stashway.app/overview';
};

export const getSupabase = () => {
  if (!supabase) {
    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseAnonKey = getSupabaseAnonKey();
      const redirectUrl = getRedirectUrl();
      
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          redirectTo: redirectUrl,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'sb-auth-token',
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
        const redirectUrl = getRedirectUrl();
        
        supabase = createClient(url, key, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            redirectTo: redirectUrl,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: 'sb-auth-token',
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


