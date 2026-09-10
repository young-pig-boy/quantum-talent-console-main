/**
 * Supabase configuration utility.
 *
 * IMPORTANT: The formal/shared Supabase project takes precedence over the Coze
 * sandbox defaults. This guarantees the console and the public careers site talk
 * to the same database.
 *
 * Variable resolution order:
 *
 *   URL:
 *     NEXT_PUBLIC_SUPABASE_URL → COZE_SUPABASE_URL (fallback)
 *
 *   Anon / Publishable Key:
 *     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY → COZE_SUPABASE_ANON_KEY (fallback)
 *
 *   Service Role / Secret Key (server-only):
 *     SUPABASE_SECRET_KEY → SUPABASE_SERVICE_ROLE_KEY → COZE_SUPABASE_SERVICE_ROLE_KEY (fallback)
 *
 * At startup we also validate that the resolved URL and keys appear to belong to
 * the same project ref. A mismatch throws CONFIGURATION_ERROR instead of silently
 * connecting to the wrong database.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
}

/**
 * Resolve a Supabase env var by checking multiple possible names in priority order.
 */
function resolveEnv(candidates: string[]): string | undefined {
  for (const key of candidates) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

/** Extract project ref from a Supabase URL, e.g. https://<ref>.supabase.co */
function extractProjectRef(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const parts = host.split('.');
    if (parts.length < 2) return null;
    return parts[0];
  } catch {
    return null;
  }
}

/** URL resolution: formal/shared project first, Coze sandbox as fallback */
function resolveUrl(): string | undefined {
  return resolveEnv(['NEXT_PUBLIC_SUPABASE_URL', 'COZE_SUPABASE_URL']);
}

/** Anon / Publishable Key resolution: formal/shared project first */
function resolveAnonKey(): string | undefined {
  return resolveEnv([
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'COZE_SUPABASE_ANON_KEY',
  ]);
}

/** Service Role / Secret Key resolution (server-only, never exposed to client) */
function resolveServiceRoleKey(): string | undefined {
  return resolveEnv([
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'COZE_SUPABASE_SERVICE_ROLE_KEY',
  ]);
}

/**
 * Sanity-check that the resolved URL and keys point to the same Supabase project.
 * This catches accidental mixing of a wbpn URL with a br-rapid key.
 */
function validateProjectConsistency(url: string, anonKey: string, serviceRoleKey: string | null | undefined): void {
  const urlRef = extractProjectRef(url);
  if (!urlRef) return; // can't validate, skip

  // Keys may embed the project ref as a claim. Supabase JWT keys contain the
  // "ref" claim; newer sb_* keys do not, so we only warn when a clear mismatch
  // is detectable (e.g. an eyJ... key whose payload references a different ref).
  const jwtRefs: string[] = [];
  for (const key of [anonKey, serviceRoleKey].filter(Boolean) as string[]) {
    if (!key.startsWith('eyJ')) continue;
    try {
      const payloadPart = key.split('.')[1] || '';
      const payloadJson = typeof Buffer !== 'undefined'
        ? Buffer.from(payloadPart, 'base64url').toString()
        : atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson);
      if (payload.ref && typeof payload.ref === 'string') {
        jwtRefs.push(payload.ref);
      }
    } catch {
      // ignore parse errors
    }
  }

  for (const keyRef of jwtRefs) {
    if (keyRef !== urlRef) {
      throw new Error(
        `CONFIGURATION_ERROR: Supabase URL project ref (${urlRef}) does not match key project ref (${keyRef}). ` +
        'Please ensure URL and keys belong to the same Supabase project.'
      );
    }
  }
}

let cachedConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig;

  const url = resolveUrl();
  const anonKey = resolveAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      'CONFIGURATION_ERROR: Missing Supabase environment variables. ' +
      'Please set COZE_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and ' +
      'COZE_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const serviceRoleKey = resolveServiceRoleKey() || null;

  validateProjectConsistency(url, anonKey, serviceRoleKey ?? undefined);

  cachedConfig = { url, anonKey, serviceRoleKey };
  return cachedConfig;
}

export function hasSupabaseConfig(): boolean {
  return !!(resolveUrl() && resolveAnonKey());
}

export function hasServiceRoleKey(): boolean {
  return !!resolveServiceRoleKey();
}
