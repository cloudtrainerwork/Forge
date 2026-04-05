'use client';

/**
 * Tenant creation page — for new users who need to set up their workspace.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../../auth/AuthContext';

export default function CreateTenantPage() {
  const { createTenant, isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48),
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setError(null);
    setCreating(true);

    try {
      const tenant = await createTenant(name.trim(), slug.trim());
      window.location.href = `/t/${tenant.slug}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      setCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isLoading) {
    if (typeof window !== 'undefined') window.location.href = '/auth/signin';
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create Your Workspace</h1>
          <p className="mt-2 text-gray-400">
            Set up a workspace for your team to start building with FORGE.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 shadow-xl border border-gray-700"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Workspace Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Company"
                required
                maxLength={100}
                className="w-full px-4 py-3 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-2">
                URL Slug
              </label>
              <div className="flex items-center gap-0">
                <span className="px-3 py-3 rounded-l-lg bg-gray-700 border border-r-0 border-gray-600 text-gray-400 text-sm">
                  forge.app/t/
                </span>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-company"
                  required
                  maxLength={48}
                  pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
                  className="flex-1 px-4 py-3 rounded-r-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim() || !slug.trim()}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
