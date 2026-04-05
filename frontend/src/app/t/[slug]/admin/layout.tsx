'use client';

/**
 * Admin layout — provides side navigation for tenant administration.
 */

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316',
};

const NAV_ITEMS = [
  { label: 'Members', path: 'members', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
  { label: 'Projects', path: 'projects', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  { label: 'Roles', path: 'roles', icon: 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z' },
  { label: 'Audit Log', path: 'audit', icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' },
  { label: 'Settings', path: 'settings', icon: 'M12 6V4m0 2a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m-6 8a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6V4' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const basePath = `/t/${slug}/admin`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: C.bg, color: C.text }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, borderRight: `1px solid ${C.border}`, background: C.surface,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <Link href={`/t/${slug}/projects`} style={{ color: C.textMuted, textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Projects
          </Link>
          <h2 style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 600 }}>Admin</h2>
        </div>
        <nav style={{ padding: '8px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const href = `${basePath}/${item.path}`;
            const isActive = pathname.includes(`/admin/${item.path}`);
            return (
              <Link
                key={item.path}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                  textDecoration: 'none', fontSize: 14,
                  background: isActive ? C.accent + '15' : 'transparent',
                  color: isActive ? C.accent : C.textMuted,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                  {item.label === 'Members' && <circle cx="9" cy="7" r="4" />}
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
