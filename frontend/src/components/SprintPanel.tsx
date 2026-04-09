'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSprintStore } from '../stores/sprintStore';
import * as SprintService from '../services/SprintService';
import * as WorkItemService from '../services/WorkItemService';
import type { SprintDTO } from '../services/SprintService';
import type { WorkItemDTO } from '../services/WorkItemService';

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822',
  border: '#1f2235', text: '#e4e6f2', textMuted: '#6d7196', textDim: '#3a3e5c',
  accent: '#f97316', green: '#22c55e', yellow: '#eab308', red: '#ef4444', blue: '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: C.blue, ACTIVE: C.green, COMPLETE: C.textMuted, CANCELLED: C.textDim,
};

// ── Tree helpers (same as ReleasePanel) ─────────────────────────────────────

interface TreeNode { item: WorkItemDTO; children: TreeNode[]; }

function buildTree(items: WorkItemDTO[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const item of items) map.set(item.id, { item, children: [] });
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) map.get(item.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function getAllDescendantIds(node: TreeNode): string[] {
  const ids: string[] = [];
  for (const c of node.children) { ids.push(c.item.id); ids.push(...getAllDescendantIds(c)); }
  return ids;
}

function getAncestorIds(itemId: string, itemMap: Map<string, WorkItemDTO>): string[] {
  const ids: string[] = [];
  let cur = itemMap.get(itemId);
  while (cur?.parentId) { ids.push(cur.parentId); cur = itemMap.get(cur.parentId); }
  return ids;
}

// ── Component ───────────────────────────────────────────────────────────────

interface SprintPanelProps { projectId: string; }

export default function SprintPanel({ projectId }: SprintPanelProps) {
  const { sprints, isLoading, loadSprints, selectedSprintId, selectSprint } = useSprintStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newNum, setNewNum] = useState('');
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const [allItems, setAllItems] = useState<WorkItemDTO[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (projectId) loadSprints(projectId); }, [projectId, loadSprints]);

  // Load items when sprint selected
  useEffect(() => {
    if (!selectedSprintId || !projectId) { setAllItems([]); setCheckedIds(new Set()); setOriginalIds(new Set()); return; }
    (async () => {
      const items = await WorkItemService.list();
      setAllItems(items);
      const assigned = new Set(items.filter(i => i.sprintId === selectedSprintId).map(i => i.id));
      setCheckedIds(assigned);
      setOriginalIds(new Set(assigned));
      const withCheckedChildren = new Set<string>();
      for (const item of items) { if (assigned.has(item.id) && item.parentId) withCheckedChildren.add(item.parentId); }
      setExpandedIds(withCheckedChildren);
    })();
  }, [selectedSprintId, projectId]);

  const tree = useMemo(() => buildTree(allItems), [allItems]);
  const itemMap = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);
  const treeMap = useMemo(() => {
    const m = new Map<string, TreeNode>();
    function walk(nodes: TreeNode[]) { for (const n of nodes) { m.set(n.item.id, n); walk(n.children); } }
    walk(tree); return m;
  }, [tree]);

  const isDirty = useMemo(() => {
    if (checkedIds.size !== originalIds.size) return true;
    for (const id of checkedIds) { if (!originalIds.has(id)) return true; }
    return false;
  }, [checkedIds, originalIds]);

  const handleToggle = useCallback((itemId: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      const treeNode = treeMap.get(itemId);
      if (next.has(itemId)) {
        next.delete(itemId);
        if (treeNode) for (const id of getAllDescendantIds(treeNode)) next.delete(id);
      } else {
        next.add(itemId);
        for (const id of getAncestorIds(itemId, itemMap)) next.add(id);
        if (treeNode) for (const id of getAllDescendantIds(treeNode)) next.add(id);
      }
      return next;
    });
  }, [treeMap, itemMap]);

  const handleSave = useCallback(async () => {
    if (!selectedSprintId || !projectId) return;
    setSaving(true);
    const toAssign = [...checkedIds].filter(id => !originalIds.has(id));
    const toUnassign = [...originalIds].filter(id => !checkedIds.has(id));
    if (toAssign.length > 0) await SprintService.assignWorkItems(projectId, selectedSprintId, toAssign);
    if (toUnassign.length > 0) await SprintService.unassignWorkItems(projectId, selectedSprintId, toUnassign);
    setOriginalIds(new Set(checkedIds));
    await loadSprints(projectId);
    const items = await WorkItemService.list();
    setAllItems(items);
    setSaving(false);
  }, [selectedSprintId, projectId, checkedIds, originalIds, loadSprints]);

  const handleCreate = useCallback(async () => {
    if (!newNum || !newName.trim() || !newStart || !newEnd) return;
    await SprintService.create(projectId, {
      number: parseInt(newNum), name: newName.trim(),
      startDate: newStart, endDate: newEnd, goal: newGoal || undefined,
    });
    setShowCreate(false); setNewNum(''); setNewName(''); setNewStart(''); setNewEnd(''); setNewGoal('');
    loadSprints(projectId);
  }, [projectId, newNum, newName, newStart, newEnd, newGoal, loadSprints]);

  const handleDelete = useCallback(async (id: string) => {
    await SprintService.remove(projectId, id);
    selectSprint(null);
    loadSprints(projectId);
  }, [projectId, loadSprints, selectSprint]);

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    const result = await SprintService.updateStatus(projectId, id, status);
    if (!result) alert('Cannot activate: another sprint is already active.');
    loadSprints(projectId);
  }, [projectId, loadSprints]);

  const selectedSprint = sprints.find(s => s.id === selectedSprintId);

  const renderTreeNode = (node: TreeNode, depth: number) => {
    const isChecked = checkedIds.has(node.item.id);
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.item.id);
    return (
      <div key={node.item.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 8 + depth * 16, borderRadius: 4, background: isChecked ? C.green + '10' : 'transparent' }}>
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); setExpandedIds(prev => { const n = new Set(prev); n.has(node.item.id) ? n.delete(node.item.id) : n.add(node.item.id); return n; }); }}
              style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 10, width: 14, padding: 0 }}>
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : <span style={{ width: 14 }} />}
          <input type="checkbox" checked={isChecked} onChange={() => handleToggle(node.item.id)} style={{ accentColor: C.green, cursor: 'pointer' }} />
          <span onClick={() => handleToggle(node.item.id)} style={{ fontSize: 11, color: isChecked ? C.text : C.textMuted, flex: 1, cursor: 'pointer' }}>
            {node.item.title || node.item.id}
          </span>
          <span style={{ fontSize: 8, color: C.textDim, textTransform: 'uppercase' }}>{(node.item.type || '').substring(0, 4)}</span>
        </div>
        {hasChildren && isExpanded && node.children.map(c => renderTreeNode(c, depth + 1))}
      </div>
    );
  };

  // ── Backlog count (items not in any sprint) ─────────────────────────────
  const backlogCount = allItems.filter(i => !i.sprintId && !i.parentId).length;

  return (
    <div style={{ width: 340, height: '100%', background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Sprints</h3>
        <button onClick={() => setShowCreate(!showCreate)}
          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: C.green, color: '#fff', border: 'none' }}>+ New</button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="#" value={newNum} onChange={e => setNewNum(e.target.value)} style={{ width: 40, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
            <input placeholder="Sprint name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
            <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          </div>
          <input placeholder="Sprint goal (optional)" value={newGoal} onChange={e => setNewGoal(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.text, fontSize: 11 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCreate} style={{ flex: 1, padding: '5px', borderRadius: 6, background: C.green, color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '5px', borderRadius: 6, background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Sprint list + backlog indicator */}
      <div style={{ overflow: 'auto', padding: 6, ...(selectedSprintId ? { maxHeight: 160 } : { flex: 1 }) }}>
        {isLoading && <div style={{ padding: 12, color: C.textMuted, fontSize: 11, textAlign: 'center' }}>Loading...</div>}

        {/* Backlog indicator (SP-07) */}
        {backlogCount > 0 && !selectedSprintId && (
          <div style={{ padding: 8, marginBottom: 4, borderRadius: 6, border: `1px dashed ${C.textDim}40`, fontSize: 11, color: C.textDim }}>
            {backlogCount} items in backlog (unassigned)
          </div>
        )}

        {sprints.map(sprint => (
          <div key={sprint.id} onClick={() => selectSprint(selectedSprintId === sprint.id ? null : sprint.id)}
            style={{
              padding: 10, marginBottom: 4, borderRadius: 6, cursor: 'pointer',
              background: selectedSprintId === sprint.id ? C.surfaceAlt : 'transparent',
              border: `1px solid ${selectedSprintId === sprint.id ? C.green + '60' : C.border}`,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>#{sprint.number} {sprint.name}</span>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 600, background: STATUS_COLORS[sprint.status] + '20', color: STATUS_COLORS[sprint.status] }}>
                {sprint.status}
              </span>
            </div>
            <div style={{ fontSize: 10, color: C.textDim }}>
              {new Date(sprint.startDate).toLocaleDateString()} — {new Date(sprint.endDate).toLocaleDateString()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.textDim, marginTop: 4 }}>
              <span>{sprint.workItemCount} items</span>
              {(sprint.totalEstimatedHours > 0 || sprint.totalActualHours > 0) && (
                <span style={{ color: sprint.totalActualHours > sprint.totalEstimatedHours ? C.red : C.green }}>
                  {sprint.totalActualHours.toFixed(0)}/{sprint.totalEstimatedHours.toFixed(0)}h
                </span>
              )}
            </div>
            {sprint.workItemCount > 0 && (
              <div style={{ marginTop: 4, height: 3, borderRadius: 2, background: C.bg }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.round((sprint.completedCount / sprint.workItemCount) * 100)}%`, background: C.green }} />
              </div>
            )}
          </div>
        ))}
        {sprints.length === 0 && !isLoading && (
          <div style={{ padding: 16, color: C.textDim, fontSize: 11, textAlign: 'center' }}>No sprints yet</div>
        )}
      </div>

      {/* Selected sprint: node picker */}
      {selectedSprint && (
        <div style={{ flex: 1, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>#{selectedSprint.number} — {checkedIds.size} items</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['PLANNING', 'ACTIVE', 'COMPLETE', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => handleStatusChange(selectedSprint.id, s)}
                  style={{
                    padding: '1px 5px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
                    background: selectedSprint.status === s ? STATUS_COLORS[s] + '30' : 'transparent',
                    color: selectedSprint.status === s ? STATUS_COLORS[s] : C.textDim,
                    border: `1px solid ${selectedSprint.status === s ? STATUS_COLORS[s] : C.border}`,
                  }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {tree.map(node => renderTreeNode(node, 0))}
            {tree.length === 0 && <div style={{ padding: 16, color: C.textDim, fontSize: 11, textAlign: 'center' }}>No work items</div>}
          </div>

          <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 6 }}>
            <button onClick={handleSave} disabled={!isDirty || saving}
              style={{
                flex: 1, padding: '6px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: isDirty ? 'pointer' : 'default',
                background: isDirty ? C.green : C.surfaceAlt,
                color: isDirty ? '#fff' : C.textDim, border: 'none', opacity: saving ? 0.6 : 1,
              }}>{saving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}</button>
            <button onClick={() => handleDelete(selectedSprint.id)}
              style={{ padding: '6px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', background: 'transparent', color: C.red, border: `1px solid ${C.red}40` }}
              title="Delete sprint">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
