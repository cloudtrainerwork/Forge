'use client';

/**
 * AuthWrapper — client component that wraps the app with AuthProvider.
 * Separated from layout.tsx because layout is a server component by default.
 */

import { AuthProvider } from '../auth/AuthContext';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
