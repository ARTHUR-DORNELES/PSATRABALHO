// =====================================================================
// Cliente Supabase (server-side, com service role key)
// ---------------------------------------------------------------------
// Usado dentro de API routes e do sync para queries privilegiadas.
// Nunca exposto ao frontend. Mesmo padrão do psa-bonus-dashboard.
// =====================================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "SUPABASE_SERVICE_ROLE_KEY no .env (ou use USE_MOCK_DATA=true).",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** true quando devemos usar o store em memória (dev sem banco). */
export function usingMockData(): boolean {
  return (
    process.env.USE_MOCK_DATA === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
