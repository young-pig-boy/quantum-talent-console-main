'use client';

import { ReactNode } from 'react';

/**
 * Minimal client layout wrapper — no AuthProvider needed.
 *
 * Authentication is fully server-side via quantum_console_access HttpOnly cookie.
 * The middleware gate handles redirects, and /api/auth/me provides header identity.
 */
export function ClientLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
