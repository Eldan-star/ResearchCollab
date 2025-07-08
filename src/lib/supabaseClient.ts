
import { createClient, SupabaseClient } from '@supabase/supabase-js';


const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This warning will now trigger if the .env variables are also missing.
  if (typeof window !== 'undefined') { 
    console.warn(
`Supabase URL or Anon Key is missing. 
Please create a .env file in your project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
Functionality will be limited.`
    );
  }
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);