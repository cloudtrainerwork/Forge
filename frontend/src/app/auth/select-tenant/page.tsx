'use client';

/**
 * Tenant selection page — shown after sign-in when user has multiple tenants.
 * Auto-redirects if user has exactly one tenant.
 * Offers tenant creation if user has no tenants.
 */

import { useEffect, useState } from 'react';
import { useAuth, TenantInfo } from '../../../auth/AuthContext';

export default function SelectTenantPage() {
  const { tenants, activeTenant, switchTenant, isAuthenticated, isLoading, user } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if exactly one tenant
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      window.location.href = '/auth/signin';
      return;
    }

    if (tenants.length === 0) {
      window.location.href = '/auth/create-tenant';
      return;
    }

    if (tenants.length === 1 && activeTenant) {
      window.location.href = `/t/${activeTenant.slug}`;
      return;
    }
  }, [isLoading, isAuthenticated, tenants, activeTenant]);

  const handleSelectTenant = async (tenant: TenantInfo) => {
    setError(null);
    setSwitching(tenant.id);
    try {
      await switchTenant(tenant.id);
      window.location.href = `/t/${tenant.slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch tenant');
      setSwitching(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Select Workspace</h1>
          <p className="mt-2 text-gray-400">
            Welcome back{user?.name ? `, ${user.name}` : ''}. Choose a workspace.
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 shadow-xl border border-gray-700">
          <div className="space-y-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                disabled={switching !== null}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 ${
                  activeTenant?.id === tenant.id
                    ? 'border-indigo-500 bg-indigo-900/20'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-700/30'
                } disabled:opacity-50`}
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-400 font-bold text-lg">
                    {tenant.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{tenant.name}</p>
                  <p className="text-sm text-gray-400 truncate">/{tenant.slug}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                  {tenant.role}
                </span>
                {switching === tenant.id && (
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <a
              href="/auth/create-tenant"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Workspace
            </a>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
