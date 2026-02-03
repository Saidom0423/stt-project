import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ENV DEBUG:", import.meta.env);
  throw new Error("Supabase ENV vars missing");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
