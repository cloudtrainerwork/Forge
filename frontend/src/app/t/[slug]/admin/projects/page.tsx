'use client';

/**
 * Admin projects page — overview of all projects with management actions.
 */

import { useState, useEffect, useCallback } from 'react';
import * as ApiClient from '../../../../../services/ApiClient';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316', green: '#22c55e', red: '#ef4444',
};

interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  memberCount: number;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const res = await ApiClient.get<{ data: AdminProject[] }>(`/projects${query}`);
      setProjects(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (id: string) => {
    await ApiClient.del(`/projects/${id}`);
    load();
  };

  const handleRestore = async (id: string) => {
    await ApiClient.post(`/projects/${id}/restore`, {}, { skipDedup: true });
    load();
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Projects</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'active', 'archived'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? C.accent + '20' : 'transparent', color: filter === f ? C.accent : C.textMuted,
            }}>{f}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 14, paddingTop: 40, textAlign: 'center' }}>Loading projects...</div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Project', 'Status', 'Members', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No projects found</td></tr>
              ) : projects.map(p => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{p.description}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 4,
                      background: p.status === 'active' ? C.green + '20' : C.textDim + '30',
                      color: p.status === 'active' ? C.green : C.textMuted,
                    }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>{p.memberCount}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.status === 'active' ? (
                      <button onClick={() => handleArchive(p.id)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>Archive</button>
                    ) : (
                      <button onClick={() => handleRestore(p.id)} style={{ background: 'none', border: 'none', color: C.green, cursor: 'pointer', fontSize: 13 }}>Restore</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
