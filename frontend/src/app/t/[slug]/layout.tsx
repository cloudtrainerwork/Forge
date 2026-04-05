'use client';

/**
 * Tenant-scoped layout — wraps all pages under /t/{slug}/.
 *
 * Renders the unified header with:
 *   - FORGE logo (links to project browser)
 *   - Breadcrumb trail (Workspace > Projects > [Project Name])
 *   - Admin link (OWNER/ADMIN only)
 *   - Save button (when on canvas with dirty state)
 *   - UserMenu
 */

import { useEffect } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { useCanvasStore } from '../../../stores/canvasStore';
import UserMenu from '../../../components/auth/UserMenu';

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { isAuthenticated, isLoading, activeTenant } = useAuth();
  const { projectId, projectName, isDirty, isSaving, saveFn } = useCanvasStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = '/auth/signin';
      return;
    }
    if (activeTenant && activeTenant.slug !== params.slug) {
      window.location.href = `/t/${activeTenant.slug}`;
    }
  }, [isLoading, isAuthenticated, activeTenant, params.slug]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isAdmin = activeTenant && ['OWNER', 'ADMIN'].includes(activeTenant.role);
  const slug = params.slug;

  const handleSave = async () => {
    if (!saveFn) return;
    try {
      await saveFn();
    } catch (err) {
      console.warn('[Layout] Save failed:', err);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 relative z-20">

        {/* Left: Logo + Breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0">
          {/* FORGE logo — always links to project browser */}
          <a
            href={`/t/${slug}/projects`}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <span className="text-indigo-400 font-bold text-lg">FORGE</span>
          </a>

          {/* Breadcrumb separator */}
          <span className="text-gray-600 text-sm flex-shrink-0">/</span>

          {/* Workspace name */}
          {activeTenant && (
            <a
              href={`/t/${slug}/projects`}
              className="text-gray-400 text-sm hover:text-gray-200 transition-colors truncate max-w-[140px] flex-shrink-0"
            >
              {activeTenant.name}
            </a>
          )}

          {/* Project breadcrumb (when on canvas or detail view) */}
          {projectName && projectId && (
            <>
              <span className="text-gray-600 text-sm flex-shrink-0">/</span>
              <a
                href={`/t/${slug}/projects/${projectId}`}
                className="text-gray-200 text-sm font-medium truncate max-w-[200px] hover:text-white transition-colors"
              >
                {projectName}
              </a>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save button — only shown when canvas has a save function */}
          {saveFn && (
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isDirty
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-default'
              } ${isSaving ? 'opacity-60' : ''}`}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : isDirty ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </>
              )}
            </button>
          )}

          {/* Admin link — top-level, visible to OWNER/ADMIN */}
          {isAdmin && (
            <a
              href={`/t/${slug}/admin/members`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </a>
          )}

          <UserMenu />
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
