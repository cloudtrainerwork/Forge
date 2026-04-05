'use client';

/**
 * Admin members page — manage tenant members, invite users, change roles.
 */

import { useState, useEffect, useCallback } from 'react';
import * as ApiClient from '../../../../../services/ApiClient';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316', green: '#22c55e', red: '#ef4444',
};

const TENANT_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

interface TenantMember {
  id: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null; image: string | null };
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ data: TenantMember[] }>('/admin/members');
      setMembers(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await ApiClient.post('/admin/members/invite', { email: inviteEmail.trim(), role: inviteRole }, { skipDedup: true });
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await ApiClient.put(`/admin/members/${userId}/role`, { role });
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this member from the workspace?')) return;
    try {
      await ApiClient.del(`/admin/members/${userId}`);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Members</h1>
        <button onClick={() => setShowInvite(true)} style={{
          padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff',
          border: 'none', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg>
          Invite Member
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 8, background: C.red + '15', border: `1px solid ${C.red}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: C.red, fontSize: 14 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: C.textMuted, fontSize: 14, paddingTop: 40, textAlign: 'center' }}>Loading members...</div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Member', 'Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: C.accent }}>
                        {(m.user.name || m.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{m.user.name || 'Unnamed'}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.userId, e.target.value)}
                      style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}
                    >
                      {TENANT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 4,
                      background: m.status === 'active' ? C.green + '20' : C.accent + '20',
                      color: m.status === 'active' ? C.green : C.accent,
                    }}>{m.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textMuted }}>
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleRemove(m.userId)} style={{
                      background: 'none', border: 'none', color: C.red, cursor: 'pointer',
                      fontSize: 13, opacity: 0.7, padding: '4px 8px',
                    }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowInvite(false)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>Invite Member</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" autoFocus
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  {TENANT_ROLES.filter(r => r !== 'OWNER').map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowInvite(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}
                  style={{ padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontSize: 14, cursor: inviteEmail.trim() && !inviting ? 'pointer' : 'not-allowed', opacity: inviteEmail.trim() && !inviting ? 1 : 0.5 }}>
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
