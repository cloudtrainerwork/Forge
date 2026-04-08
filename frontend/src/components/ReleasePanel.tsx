'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useReleaseStore } from '../stores/releaseStore';
import * as ReleaseService from '../services/ReleaseService';
import type { ReleaseDTO, ReleaseSummaryDTO } from '../services/ReleaseService';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822',
  border: '#1f2235', text: '#e4e6f2', textMuted: '#6d7196', textDim: '#3a3e5c',
  accent: '#f97316', green: '#22c55e', yellow: '#eab308', red: '#ef4444', blue: '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: C.blue, IN_PROGRESS: C.yellow, RELEASED: C.green, CANCELLED: C.textDim,
};

interface ReleasePanelProps {
  projectId: string;
  nodeIds: string[]; // Currently visible node IDs for assignment
  onAssignNodes?: (releaseId: string, nodeIds: string[]) => void;
}

export default function ReleasePanel({ projectId, nodeIds, onAssignNodes }: ReleasePanelProps) {
  const { releases, isLoading, loadReleases, selectedReleaseId, selectRelease } = useReleaseStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [summary, setSummary] = useState<ReleaseSummaryDTO | null>(null);

  useEffect(() => {
    if (projectId) loadReleases(projectId);
  }, [projectId, loadReleases]);

  // Load summary when a release is selected
  useEffect(() => {
    if (!selectedReleaseId || !projectId) { setSummary(null); return; }
    ReleaseService.getSummary(projectId, selectedReleaseId).then(setSummary);
  }, [selectedReleaseId, projectId]);

  const handleCreate = useCallback(async () => {
    if (!newVersion.trim() || !newName.trim()) return;
    await ReleaseService.create(projectId, {
      version: newVersion.trim(),
      name: newName.trim(),
      targetDate: newDate || undefined,
    });
    setShowCreate(false);
    setNewVersion('');
    setNewName('');
    setNewDate('');
    loadReleases(projectId);
  }, [projectId, newVersion, newName, newDate, loadReleases]);

  const handleDelete = useCallback(async (releaseId: string) => {
    await ReleaseService.remove(projectId, releaseId);
    selectRelease(null);
    loadReleases(projectId);
  }, [projectId, loadReleases, selectRelease]);

  const handleAssignSelected = useCallback(async (releaseId: string) => {
    if (nodeIds.length === 0) return;
    await ReleaseService.assignWorkItems(projectId, releaseId, nodeIds);
    loadReleases(projectId);
    if (selectedReleaseId) {
      ReleaseService.getSummary(projectId, selectedReleaseId).then(setSummary);
    }
  }, [projectId, nodeIds, loadReleases, selectedReleaseId]);

  const handleStatusChange = useCallback(async (releaseId: string, status: string) => {
    await ReleaseService.update(projectId, releaseId, { status });
    loadReleases(projectId);
  }, [projectId, loadReleases]);

  const selectedRelease = releases.find(r => r.id === selectedReleaseId);

  return (
    <div style={{
      width: 320, height: '100%', background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Releases</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: C.accent, color: '#fff', border: 'none',
          }}
        >
          + New
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            placeholder="Version (e.g. 1.0)"
            value={newVersion} onChange={e => setNewVersion(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 12 }}
          />
          <input
            placeholder="Release name"
            value={newName} onChange={e => setNewName(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 12 }}
          />
          <input
            type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCreate} style={{ flex: 1, padding: '6px', borderRadius: 6, background: C.green, color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '6px', borderRadius: 6, background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Release list */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {isLoading && <div style={{ padding: 16, color: C.textMuted, fontSize: 12, textAlign: 'center' }}>Loading...</div>}
        {releases.map(release => (
          <div
            key={release.id}
            onClick={() => selectRelease(selectedReleaseId === release.id ? null : release.id)}
            style={{
              padding: 12, marginBottom: 6, borderRadius: 8, cursor: 'pointer',
              background: selectedReleaseId === release.id ? C.surfaceAlt : 'transparent',
              border: `1px solid ${selectedReleaseId === release.id ? C.accent + '60' : release.isFuture ? C.textDim + '40' : C.border}`,
              borderStyle: release.isFuture ? 'dashed' : 'solid',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{release.version}</span>
              <span style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                background: STATUS_COLORS[release.status] + '20',
                color: STATUS_COLORS[release.status],
              }}>{release.status}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{release.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textDim }}>
              <span>{release.workItemCount} items</span>
              {release.onBubbleCount > 0 && (
                <span style={{ color: C.red, fontWeight: 600 }}>{release.onBubbleCount} at risk</span>
              )}
              {release.targetDate && (
                <span>{new Date(release.targetDate).toLocaleDateString()}</span>
              )}
            </div>
            {/* Completion bar */}
            {release.workItemCount > 0 && (
              <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: C.bg }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.round((release.completedCount / release.workItemCount) * 100)}%`,
                  background: C.green,
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected release detail */}
      {selectedRelease && summary && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 12, maxHeight: 250, overflow: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>
            {summary.release.name} — {summary.completionPercentage}% complete
          </div>

          {/* Status controls */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
            {['PLANNING', 'IN_PROGRESS', 'RELEASED', 'CANCELLED'].map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(selectedRelease.id, s)}
                style={{
                  padding: '2px 6px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                  background: selectedRelease.status === s ? STATUS_COLORS[s] + '30' : 'transparent',
                  color: selectedRelease.status === s ? STATUS_COLORS[s] : C.textDim,
                  border: `1px solid ${selectedRelease.status === s ? STATUS_COLORS[s] : C.border}`,
                }}
              >{s.replace('_', ' ')}</button>
            ))}
          </div>

          {/* Assign visible nodes button */}
          {nodeIds.length > 0 && !selectedRelease.isFuture && (
            <button
              onClick={() => handleAssignSelected(selectedRelease.id)}
              style={{
                width: '100%', padding: '6px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: C.accent + '20', color: C.accent, border: `1px solid ${C.accent}40`,
                marginBottom: 8,
              }}
            >
              Assign {nodeIds.length} visible nodes to {selectedRelease.version}
            </button>
          )}

          {/* Items by type breakdown (RL-08) */}
          {Object.entries(summary.itemsByType).map(([type, stats]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 11 }}>
              <span style={{ color: C.textMuted, textTransform: 'uppercase' }}>{type}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 40, height: 3, borderRadius: 2, background: C.bg }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${stats.percentage}%`, background: stats.percentage === 100 ? C.green : C.yellow }} />
                </div>
                <span style={{ color: C.text, fontSize: 10 }}>{stats.completed}/{stats.total}</span>
              </div>
            </div>
          ))}

          {/* Delete button (not for Future) */}
          {!selectedRelease.isFuture && (
            <button
              onClick={() => handleDelete(selectedRelease.id)}
              style={{
                width: '100%', padding: '6px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                background: 'transparent', color: C.red, border: `1px solid ${C.red}40`,
                marginTop: 8,
              }}
            >
              Delete Release (moves items to Future)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
