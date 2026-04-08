'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useReleaseStore } from '../stores/releaseStore';
import * as ReleaseService from '../services/ReleaseService';
import * as WorkItemService from '../services/WorkItemService';
import type { ReleaseDTO } from '../services/ReleaseService';
import type { WorkItemDTO } from '../services/WorkItemService';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822',
  border: '#1f2235', text: '#e4e6f2', textMuted: '#6d7196', textDim: '#3a3e5c',
  accent: '#f97316', green: '#22c55e', yellow: '#eab308', red: '#ef4444', blue: '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: C.blue, IN_PROGRESS: C.yellow, RELEASED: C.green, CANCELLED: C.textDim,
};

// ── Tree node type ──────────────────────────────────────────────────────────

interface TreeNode {
  item: WorkItemDTO;
  children: TreeNode[];
}

function buildTree(items: WorkItemDTO[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const item of items) {
    map.set(item.id, { item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Collect all descendant IDs from a tree node */
function getAllDescendantIds(node: TreeNode): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.item.id);
    ids.push(...getAllDescendantIds(child));
  }
  return ids;
}

/** Walk up the item list to find all ancestors of an item */
function getAncestorIds(itemId: string, itemMap: Map<string, WorkItemDTO>): string[] {
  const ids: string[] = [];
  let current = itemMap.get(itemId);
  while (current?.parentId) {
    ids.push(current.parentId);
    current = itemMap.get(current.parentId);
  }
  return ids;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ReleasePanelProps {
  projectId: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ReleasePanel({ projectId }: ReleasePanelProps) {
  const { releases, isLoading, loadReleases, selectedReleaseId, selectRelease } = useReleaseStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');

  // All work items in the project (for node picker)
  const [allItems, setAllItems] = useState<WorkItemDTO[]>([]);
  // Set of checked item IDs (pending assignment state)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  // Original set when panel opened (to detect dirty)
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  // Expanded tree nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Saving state
  const [saving, setSaving] = useState(false);

  // Load releases
  useEffect(() => {
    if (projectId) loadReleases(projectId);
  }, [projectId, loadReleases]);

  // Load all work items when a release is selected
  useEffect(() => {
    if (!selectedReleaseId || !projectId) {
      setAllItems([]);
      setCheckedIds(new Set());
      setOriginalIds(new Set());
      return;
    }
    (async () => {
      const items = await WorkItemService.list();
      setAllItems(items);
      // Pre-check items already assigned to this release
      const assigned = new Set(
        items.filter(i => i.releaseId === selectedReleaseId).map(i => i.id)
      );
      setCheckedIds(assigned);
      setOriginalIds(new Set(assigned));
      // Auto-expand roots that have checked children
      const withCheckedChildren = new Set<string>();
      for (const item of items) {
        if (assigned.has(item.id) && item.parentId) {
          withCheckedChildren.add(item.parentId);
        }
      }
      setExpandedIds(withCheckedChildren);
    })();
  }, [selectedReleaseId, projectId]);

  const tree = useMemo(() => buildTree(allItems), [allItems]);
  const itemMap = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
  const treeMap = useMemo(() => {
    const m = new Map<string, TreeNode>();
    function walk(nodes: TreeNode[]) {
      for (const n of nodes) { m.set(n.item.id, n); walk(n.children); }
    }
    walk(tree);
    return m;
  }, [tree]);

  const isDirty = useMemo(() => {
    if (checkedIds.size !== originalIds.size) return true;
    for (const id of checkedIds) { if (!originalIds.has(id)) return true; }
    return false;
  }, [checkedIds, originalIds]);

  // ── Toggle a node ─────────────────────────────────────────────────────────

  const handleToggle = useCallback((itemId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      const treeNode = treeMap.get(itemId);

      if (next.has(itemId)) {
        // Unchecking: remove this + all descendants
        next.delete(itemId);
        if (treeNode) {
          for (const descId of getAllDescendantIds(treeNode)) {
            next.delete(descId);
          }
        }
      } else {
        // Checking: add this + all ancestors + all descendants
        next.add(itemId);
        // Auto-include ancestors
        for (const ancestorId of getAncestorIds(itemId, itemMap)) {
          next.add(ancestorId);
        }
        // Auto-include descendants
        if (treeNode) {
          for (const descId of getAllDescendantIds(treeNode)) {
            next.add(descId);
          }
        }
      }
      return next;
    });
  }, [treeMap, itemMap]);

  // ── Save changes ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!selectedReleaseId || !projectId) return;
    setSaving(true);

    // Items to assign (newly checked)
    const toAssign = [...checkedIds].filter(id => !originalIds.has(id));
    // Items to unassign (unchecked from original)
    const toUnassign = [...originalIds].filter(id => !checkedIds.has(id));

    if (toAssign.length > 0) {
      await ReleaseService.assignWorkItems(projectId, selectedReleaseId, toAssign);
    }
    if (toUnassign.length > 0) {
      await ReleaseService.unassignWorkItems(projectId, selectedReleaseId, toUnassign);
    }

    // Refresh
    setOriginalIds(new Set(checkedIds));
    await loadReleases(projectId);
    // Reload items to get updated releaseIds
    const items = await WorkItemService.list();
    setAllItems(items);
    setSaving(false);
  }, [selectedReleaseId, projectId, checkedIds, originalIds, loadReleases]);

  // ── Toggle on-the-bubble ──────────────────────────────────────────────────

  const handleBubbleToggle = useCallback(async (itemId: string, current: boolean) => {
    await ReleaseService.setOnTheBubble(projectId, itemId, !current);
    // Update local state
    setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, onTheBubble: !current } : i));
  }, [projectId]);

  // ── Create release ────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newVersion.trim() || !newName.trim()) return;
    await ReleaseService.create(projectId, {
      version: newVersion.trim(), name: newName.trim(), targetDate: newDate || undefined,
    });
    setShowCreate(false);
    setNewVersion(''); setNewName(''); setNewDate('');
    loadReleases(projectId);
  }, [projectId, newVersion, newName, newDate, loadReleases]);

  const handleDelete = useCallback(async (releaseId: string) => {
    await ReleaseService.remove(projectId, releaseId);
    selectRelease(null);
    loadReleases(projectId);
  }, [projectId, loadReleases, selectRelease]);

  const handleStatusChange = useCallback(async (releaseId: string, status: string) => {
    await ReleaseService.update(projectId, releaseId, { status });
    loadReleases(projectId);
  }, [projectId, loadReleases]);

  const selectedRelease = releases.find(r => r.id === selectedReleaseId);

  // ── Tree node renderer ────────────────────────────────────────────────────

  const renderTreeNode = (node: TreeNode, depth: number) => {
    const isChecked = checkedIds.has(node.item.id);
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.item.id);
    const isBubble = node.item.onTheBubble && isChecked;

    return (
      <div key={node.item.id}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', paddingLeft: 8 + depth * 16,
            borderRadius: 4, cursor: 'pointer',
            background: isChecked ? C.accent + '10' : 'transparent',
          }}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setExpandedIds(prev => {
                const next = new Set(prev);
                next.has(node.item.id) ? next.delete(node.item.id) : next.add(node.item.id);
                return next;
              }); }}
              style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 10, width: 14, padding: 0 }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span style={{ width: 14 }} />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => handleToggle(node.item.id)}
            style={{ accentColor: C.accent, cursor: 'pointer' }}
          />

          {/* Label */}
          <span
            onClick={() => handleToggle(node.item.id)}
            style={{ fontSize: 11, color: isChecked ? C.text : C.textMuted, flex: 1, cursor: 'pointer' }}
          >
            {node.item.title || node.item.id}
          </span>

          {/* Type badge */}
          <span style={{ fontSize: 8, color: C.textDim, textTransform: 'uppercase' }}>
            {(node.item.type || '').substring(0, 4)}
          </span>

          {/* On-the-bubble toggle (only for checked items) */}
          {isChecked && (
            <button
              onClick={(e) => { e.stopPropagation(); handleBubbleToggle(node.item.id, !!node.item.onTheBubble); }}
              title={isBubble ? 'Remove at-risk flag' : 'Flag as at-risk'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, padding: 0,
                color: isBubble ? C.red : C.textDim,
              }}
            >
              {isBubble ? '🔴' : '⚪'}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      width: 340, height: '100%', background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Releases</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: C.accent, color: '#fff', border: 'none' }}
        >+ New</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input placeholder="Version (e.g. 1.0)" value={newVersion} onChange={e => setNewVersion(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          <input placeholder="Release name" value={newName} onChange={e => setNewName(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCreate} style={{ flex: 1, padding: '5px', borderRadius: 6, background: C.green, color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '5px', borderRadius: 6, background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Release list (compact when a release is selected) */}
      <div style={{ overflow: 'auto', padding: 6, ...(selectedReleaseId ? { maxHeight: 140 } : { flex: 1 }) }}>
        {isLoading && <div style={{ padding: 12, color: C.textMuted, fontSize: 11, textAlign: 'center' }}>Loading...</div>}
        {releases.map(release => (
          <div
            key={release.id}
            onClick={() => selectRelease(selectedReleaseId === release.id ? null : release.id)}
            style={{
              padding: 10, marginBottom: 4, borderRadius: 6, cursor: 'pointer',
              background: selectedReleaseId === release.id ? C.surfaceAlt : 'transparent',
              border: `1px solid ${selectedReleaseId === release.id ? C.accent + '60' : release.isFuture ? C.textDim + '40' : C.border}`,
              borderStyle: release.isFuture ? 'dashed' : 'solid',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{release.version}</span>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 600, background: STATUS_COLORS[release.status] + '20', color: STATUS_COLORS[release.status] }}>
                {release.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{release.name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 4 }}>
              <span>{release.workItemCount} items</span>
              {release.onBubbleCount > 0 && <span style={{ color: C.red, fontWeight: 600 }}>{release.onBubbleCount} at risk</span>}
              {release.targetDate && <span>{new Date(release.targetDate).toLocaleDateString()}</span>}
            </div>
            {release.workItemCount > 0 && (
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: C.bg }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.round((release.completedCount / release.workItemCount) * 100)}%`, background: C.green }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Selected release: node picker + controls */}
      {selectedRelease && (
        <div style={{ flex: 1, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Release info bar */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              {selectedRelease.version} — {checkedIds.size} items
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['PLANNING', 'IN_PROGRESS', 'RELEASED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => handleStatusChange(selectedRelease.id, s)}
                  style={{
                    padding: '1px 5px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
                    background: selectedRelease.status === s ? STATUS_COLORS[s] + '30' : 'transparent',
                    color: selectedRelease.status === s ? STATUS_COLORS[s] : C.textDim,
                    border: `1px solid ${selectedRelease.status === s ? STATUS_COLORS[s] : C.border}`,
                  }}
                >{s.replace('_', ' ')}</button>
              ))}
            </div>
          </div>

          {/* Node picker tree */}
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {tree.map(node => renderTreeNode(node, 0))}
            {tree.length === 0 && (
              <div style={{ padding: 16, color: C.textDim, fontSize: 11, textAlign: 'center' }}>No work items in project</div>
            )}
          </div>

          {/* Save bar + delete */}
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6 }}>
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: isDirty ? 'pointer' : 'default',
                background: isDirty ? C.green : C.surfaceAlt,
                color: isDirty ? '#fff' : C.textDim,
                border: 'none',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}
            </button>
            {!selectedRelease.isFuture && (
              <button
                onClick={() => handleDelete(selectedRelease.id)}
                style={{ padding: '6px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', background: 'transparent', color: C.red, border: `1px solid ${C.red}40` }}
                title="Delete release (moves items to Future)"
              >✕</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
