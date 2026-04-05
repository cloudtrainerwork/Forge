'use client';

/**
 * UserMenu — shows the current user avatar, name, tenant, and sign-out option.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function UserMenu() {
  const { user, activeTenant, tenants, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = (user.name || user.email)
    .split(/[\s@]/)
    .filter(Boolean)
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        {user.image ? (
          <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
        )}
        <span className="text-sm text-gray-300 hidden sm:inline">
          {user.name || user.email}
        </span>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white truncate">{user.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>

          {/* Tenants */}
          {tenants.length > 1 && (
            <div className="py-1 border-b border-gray-700">
              <p className="px-4 py-1 text-xs text-gray-500 uppercase">Workspaces</p>
              {tenants.map((t) => (
                <a
                  key={t.id}
                  href={`/t/${t.slug}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700/50 transition-colors ${
                    activeTenant?.id === t.id ? 'text-indigo-400' : 'text-gray-300'
                  }`}
                >
                  {activeTenant?.id === t.id && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                  <span className="truncate">{t.name}</span>
                </a>
              ))}
              <a
                href="/auth/create-tenant"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Workspace
              </a>
            </div>
          )}

          {/* Admin link (visible only to OWNER/ADMIN) */}
          {activeTenant && ['OWNER', 'ADMIN'].includes(activeTenant.role) && (
            <div className="py-1 border-b border-gray-700">
              <a
                href={`/t/${activeTenant.slug}/admin/members`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Admin
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                signOut();
                window.location.href = '/auth/signin';
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50 transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
