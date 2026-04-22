import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Service-role client for use inside edge functions.
 * Bypasses RLS. Never expose this key to the browser.
 *
 * Uses SB_SERVICE_KEY (custom secret) if set, otherwise falls back to the
 * auto-injected SUPABASE_SERVICE_ROLE_KEY. The custom secret is needed when
 * the project uses the new ES256 API key format because the auto-injected key
 * may be the opaque `sb_secret_…` format which @supabase/supabase-js does not
 * yet accept for admin operations.
 */
export function adminClient(): SupabaseClient {
  const url =
    Deno.env.get('SB_URL') ||
    Deno.env.get('SUPABASE_URL');
  const key =
    Deno.env.get('SB_SERVICE_KEY') ||
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(`Missing env — url=${!!url} key=${!!key}`);
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const META_GRAPH_VERSION = Deno.env.get('META_GRAPH_VERSION') ?? 'v21.0';
