
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Directly use the provided Supabase URL and Anon Key
const supabaseUrl: string = "https://arildmnldxlfokubxyee.supabase.co";
const supabaseAnonKey: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyaWxkbW5sZHhsZm9rdWJ4eWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MzQ2NjUsImV4cCI6MjA2NjExMDY2NX0.ahi6V2bth87VmAR84bx5dUMOiGC3pQhQ-5W3-gVhCc4"

if (!supabaseUrl || !supabaseAnonKey) {
  // This warning should ideally not be hit now since keys are hardcoded.
  // Kept for robustness, but can be removed if confident keys are always present.
  if (typeof window !== 'undefined') { 
    console.warn(
`Supabase URL or Anon Key is missing or invalid. 
Please ensure the supabaseUrl and supabaseAnonKey constants in lib/supabaseClient.ts are correctly set.
Functionality will be limited.`
    );
  }
}

// Ensure placeholders if actual keys are missing (though they are hardcoded now)
// This is more of a safety net if the hardcoded values were accidentally cleared.
const finalSupabaseUrl = supabaseUrl || "http://localhost:54321"; 
const finalSupabaseAnonKey = supabaseAnonKey || "your-anon-key"; 

export const supabase: SupabaseClient = createClient(finalSupabaseUrl, finalSupabaseAnonKey);
