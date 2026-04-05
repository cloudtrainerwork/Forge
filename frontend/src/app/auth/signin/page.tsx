'use client';

/**
 * Sign-in page — provider selection for FORGE authentication.
 *
 * Provides buttons for Google, Microsoft, and GitHub OAuth.
 * In development mode, includes a dev sign-in bypass.
 */

import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
  {
    id: 'azure-ad',
    name: 'Microsoft',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    bg: 'bg-gray-900 hover:bg-gray-800',
    text: 'text-white',
    border: 'border-gray-900',
  },
];

export default function SignInPage() {
  const { signIn, devSignIn, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV === 'development';

  const handleProviderSignIn = async (providerId: string) => {
    setError(null);
    setSigningIn(providerId);

    try {
      if (isDev && (providerId === 'dev' || true)) {
        // Dev mode: call backend to seed tenant/user, get real JWT
        await devSignIn();
        window.location.href = '/t/dev';
        return;
      }

      // Production: redirect to OAuth provider
      const authUrl = getOAuthUrl(providerId);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setSigningIn(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md mx-4">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <span className="text-3xl font-bold text-white">F</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to FORGE</h1>
          <p className="mt-2 text-gray-400">Sign in to your workspace</p>
        </div>

        {/* Provider buttons */}
        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-gray-700">
          <div className="space-y-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSignIn(provider.id)}
                disabled={isLoading || signingIn !== null}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border ${provider.bg} ${provider.text} ${provider.border} transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {signingIn === provider.id ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  provider.icon
                )}
                <span className="font-medium">
                  Continue with {provider.name}
                </span>
              </button>
            ))}
          </div>

          {isDev && (
            <div className="mt-6 pt-6 border-t border-gray-600">
              <p className="text-xs text-gray-500 text-center mb-3">Development Mode</p>
              <button
                onClick={() => handleProviderSignIn('dev')}
                disabled={isLoading || signingIn !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Dev Sign-In (bypass OAuth)
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By signing in, you agree to FORGE&apos;s Terms of Service.
        </p>
      </div>
    </div>
  );
}

// ── OAuth URL builder ──────────────────────────────────────────────────────────

function getOAuthUrl(providerId: string): string {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  switch (providerId) {
    case 'google':
      return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code&scope=openid%20email%20profile` +
        `&state=google`;
    case 'azure-ad':
      return `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID || 'common'}/oauth2/v2.0/authorize?` +
        `client_id=${process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || ''}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code&scope=openid%20email%20profile` +
        `&state=azure-ad`;
    case 'github':
      return `https://github.com/login/oauth/authorize?` +
        `client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || ''}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=read:user%20user:email` +
        `&state=github`;
    default:
      return '/auth/signin';
  }
}
