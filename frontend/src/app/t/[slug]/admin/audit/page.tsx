'use client';

/**
 * Admin audit log page — paginated, filterable audit event viewer.
 */

import { useState, useEffect, useCallback } from 'react';
import * as ApiClient from '../../../../../services/ApiClient';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316',
};

const EVENT_TYPES = [
  'WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED',
  'RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED',
  'READINESS_UPDATED', 'READINESS_CONFIG_CREATED', 'READINESS_CONFIG_UPDATED',
  'TENANT_CREATED', 'USER_JOINED', 'USER_LEFT',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED',
  'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED', 'PROJECT_MEMBER_ROLE_UPDATED',
];

interface AuditEntry {
  id: string;
  type: string;
  entityId: string;
  actorId: string | null;
  changes: Record<string, unknown>;
  timestamp: string;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (typeFilter) params.set('type', typeFilter);
      const res = await ApiClient.get<{ data: AuditEntry[]; pagination: { total: number } }>(`/admin/audit-logs?${params}`);
      setEntries(res.data);
      setTotal(res.pagination.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Audit Log</h1>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        >
          <option value="">All events</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 14, paddingTop: 40, textAlign: 'center' }}>Loading audit log...</div>
      ) : (
        <>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Timestamp', 'Event', 'Entity', 'Details'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: C.textMuted }}>No audit events found</td></tr>
                ) : entries.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: C.textMuted, whiteSpace: 'nowrap' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontSize: 12, padding: '2px 8px', borderRadius: 4,
                        background: C.accent + '15', color: C.accent, fontFamily: 'monospace',
                      }}>{e.type}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: C.textMuted, fontFamily: 'monospace' }}>
                      {e.entityId.slice(0, 12)}...
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: C.textDim, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(e.changes).slice(0, 80)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
                background: 'transparent', color: page === 0 ? C.textDim : C.textMuted,
                cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13,
              }}>Previous</button>
              <span style={{ fontSize: 13, color: C.textMuted }}>Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`,
                background: 'transparent', color: page >= totalPages - 1 ? C.textDim : C.textMuted,
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 13,
              }}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
