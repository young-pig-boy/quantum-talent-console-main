import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
  // Map env vars to standard Supabase names (client-safe only).
  // Priority: already-standard NEXT_PUBLIC_* (real project) > COZE_* fallback (sandbox-provided).
  // Service Role Key is intentionally excluded — it is read server-side via process.env only.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.Coze_SUPABASE_URL ||
      process.env.COZE_SUPABASE_URL ||
      '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.Coze_SUPABASE_ANON_KEY ||
      process.env.COZE_SUPABASE_ANON_KEY ||
      '',
  },
};

export default nextConfig;
