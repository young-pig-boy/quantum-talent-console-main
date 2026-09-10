import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin(): ReturnType<typeof createClient> {
  if (adminClient) return adminClient;

  const config = getSupabaseConfig();

  if (!config.serviceRoleKey) {
    throw new Error(
      'CONFIGURATION_ERROR: Missing service role key. ' +
      'Please set COZE_SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  adminClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

// Untyped helper — use in repositories to bypass schema type checking
// until Supabase types are generated with `supabase gen types typescript`
export function getSupabaseAdminUntyped() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseAdmin() as any;
}
