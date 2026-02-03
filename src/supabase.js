import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 👇 HARD FAIL WITH CLEAR ERROR
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ENV DEBUG:", import.meta.env);
  throw new Error("Supabase environment variables are missing");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
