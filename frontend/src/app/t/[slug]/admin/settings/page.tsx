'use client';

/**
 * Admin settings page — tenant name, plan, and danger zone.
 */

import { useState, useEffect, useCallback } from 'react';
import * as ApiClient from '../../../../../services/ApiClient';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316', green: '#22c55e', red: '#ef4444',
};

interface TenantSettings {
  id: string;
  slug: string;
  name: string;
  status: string;
  planTier: string;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ data: TenantSettings }>('/admin/settings');
      setSettings(res.data);
      setName(res.data.name);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await ApiClient.put<{ data: TenantSettings }>('/admin/settings', { name: name.trim() });
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 32, color: C.textMuted }}>Loading settings...</div>;
  if (!settings) return <div style={{ padding: 32, color: C.textMuted }}>Failed to load settings</div>;

  const PLAN_COLORS: Record<string, string> = {
    free: '#6b7280', starter: '#3b82f6', pro: '#8b5cf6', enterprise: '#f97316',
  };

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 32px' }}>Workspace Settings</h1>

      {/* General */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>General</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Workspace Name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: 'none' }}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button onClick={handleSave} disabled={saving || name === settings.name}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none', fontSize: 14,
                  background: saved ? C.green : C.accent,
                  color: '#fff', cursor: saving || name === settings.name ? 'not-allowed' : 'pointer',
                  opacity: saving || name === settings.name ? 0.5 : 1,
                }}>
                {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Workspace Slug</label>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14 }}>
              {settings.slug}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Created</label>
            <div style={{ fontSize: 14, color: C.textMuted }}>{new Date(settings.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Plan</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 14, fontWeight: 600, padding: '4px 12px', borderRadius: 6,
              background: (PLAN_COLORS[settings.planTier] || C.textDim) + '20',
              color: PLAN_COLORS[settings.planTier] || C.textMuted,
              textTransform: 'capitalize',
            }}>{settings.planTier}</span>
            <span style={{ fontSize: 14, color: C.textMuted }}>Current plan</span>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: C.red }}>Danger Zone</h2>
        <div style={{ background: C.surface, border: `1px solid ${C.red}30`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Delete Workspace</div>
              <div style={{ fontSize: 13, color: C.textMuted }}>Permanently delete this workspace and all its data</div>
            </div>
            <button style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.red}50`,
              background: 'transparent', color: C.red, fontSize: 14, cursor: 'pointer',
            }}>Delete</button>
          </div>
        </div>
      </section>
    </div>
  );
}
