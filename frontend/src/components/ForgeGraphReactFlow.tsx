'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  MiniMap,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigationStore } from '@/stores/navigationStore';
import { useCanvasStore } from '@/stores/canvasStore';
import TemplateSelector from './TemplateSelector';
import ProjectNavigator from './ProjectNavigator';
import { SpecificationEditor } from './specifications/SpecificationEditor';
import ReleasePanel from './ReleasePanel';
import { useReleaseStore } from '@/stores/releaseStore';
import { WORKFLOW_TEMPLATES, flattenTemplate } from '@/data/workflowTemplates';

// ── Services ───────────────────────────────────────────────────────────────────
import {
  WorkItemService,
  DependencyService,
  SpecificationService,
} from '../services';
import type { WorkItemDTO, ReadinessState } from '../services';

// ── Local project type for canvas state (graph data stored in localStorage) ──
interface LocalProject {
  id: string;
  name: string;
  templateId?: string;
  nodes?: Node[];
  edges?: Edge[];
}

const LOCAL_STORAGE_KEY = 'forgeProjects';

function loadLocalProjects(): LocalProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalProject[];
  } catch { return []; }
}

function saveLocalProjects(projects: LocalProject[]): void {
  try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects)); } catch {}
}

function addLocalProject(project: LocalProject): LocalProject[] {
  const all = loadLocalProjects();
  const updated = [...all, project];
  saveLocalProjects(updated);
  return updated;
}

function updateLocalGraph(projectId: string, nodes: Node[], edges: Edge[]): LocalProject[] {
  const all = loadLocalProjects();
  const updated = all.map(p => p.id === projectId ? { ...p, nodes, edges } : p);
  saveLocalProjects(updated);
  return updated;
}

function removeLocalProject(projectId: string): LocalProject[] {
  const all = loadLocalProjects().filter(p => p.id !== projectId);
  saveLocalProjects(all);
  return all;
}

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  bg: "#08090d",
  surface: "#111219",
  surfaceAlt: "#161822",
  hover: "#1c1e2d",
  border: "#1f2235",
  borderActive: "#3b4068",
  text: "#e4e6f2",
  textMuted: "#6d7196",
  textDim: "#3a3e5c",
  accent: "#f97316",
  accentDim: "#f9731620",
  green: "#22c55e",
  greenDim: "#22c55e20",
  yellow: "#eab308",
  yellowDim: "#eab30820",
  red: "#ef4444",
  redDim: "#ef444420",
  blue: "#3b82f6",
  blueDim: "#3b82f620",
  purple: "#a855f7",
  purpleDim: "#a855f720",
  cyan: "#06b6d4",
  cyanDim: "#06b6d420",
};

// ── Node type config ───────────────────────────────────────────────────────────
const NTYPES = {
  GENERIC:     { label: "Generic",     color: C.textMuted, icon: "○" },
  FEATURE:     { label: "Feature",     color: C.accent,   icon: "◆" },
  SERVICE:     { label: "Service",     color: C.blue,     icon: "⬡" },
  SCREEN:      { label: "Screen",      color: C.purple,   icon: "◻" },
  INTEGRATION: { label: "Integration", color: C.cyan,     icon: "⬢" },
  DATABASE:    { label: "Database",    color: C.textMuted, icon: "⬈" },
  API:         { label: "API",         color: C.green,    icon: "◇" },
  COMPONENT:   { label: "Component",   color: C.yellow,   icon: "▣" },
  DTO:         { label: "DTO",         color: "#8b5cf6",  icon: "⬦" },
  TEST:        { label: "Test",        color: "#14b8a6",  icon: "✓" },
  CONFIG:      { label: "Config",      color: "#6b7280",  icon: "⚙" },
  DOCUMENT:    { label: "Document",    color: "#d97706",  icon: "📄" },
  VIEWMODEL:   { label: "ViewModel",   color: "#ec4899",  icon: "◈" },
  MANAGER:     { label: "Manager",     color: "#7c3aed",  icon: "◉" },
};

// ── Implementation Status (Harvey Ball) ────────────────────────────────────────
const IMPL_STATUS = {
  NOT_STARTED: { label: 'Not Started', pct: 0,    color: C.textDim },
  STUBBED:     { label: 'Stubbed',     pct: 25,   color: C.yellow },
  PARTIAL:     { label: 'Partial',     pct: 50,   color: C.yellow },
  FUNCTIONAL:  { label: 'Functional',  pct: 75,   color: C.blue },
  PRODUCTION:  { label: 'Production',  pct: 100,  color: C.green },
} as const;

type ImplStatusKey = keyof typeof IMPL_STATUS;
const IMPL_STATUS_ORDER: ImplStatusKey[] = ['NOT_STARTED', 'STUBBED', 'PARTIAL', 'FUNCTIONAL', 'PRODUCTION'];

/** SVG Harvey ball — circle with fill proportional to status */
function HarveyBall({ status, size = 16, onClick }: { status: ImplStatusKey; size?: number; onClick?: (e: React.MouseEvent) => void }) {
  const cfg = IMPL_STATUS[status];
  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;

  // Quarter-based fill using pie slice path
  const pct = cfg.pct / 100;
  let fillPath = '';
  if (pct === 0) {
    fillPath = ''; // empty circle
  } else if (pct >= 1) {
    fillPath = `M ${cx},${cy} m -${r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`; // full circle
  } else {
    // Pie slice from 12 o'clock position
    const angle = pct * 2 * Math.PI;
    const x = cx + r * Math.sin(angle);
    const y = cy - r * Math.cos(angle);
    const largeArc = pct > 0.5 ? 1 : 0;
    fillPath = `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 ${largeArc},1 ${x},${y} Z`;
  }

  return (
    <svg
      width={size}
      height={size}
      style={{ cursor: onClick ? 'pointer' : 'default', flexShrink: 0 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={`Implementation: ${cfg.label} (${cfg.pct}%)`}
    >
      <title>{`${cfg.label} (${cfg.pct}%)`}</title>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.pct > 0 ? cfg.color : C.textDim} strokeWidth={1.5} />
      {/* Fill */}
      {fillPath && <path d={fillPath} fill={cfg.color} />}
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ForgeNodeData {
  id: string;
  type: keyof typeof NTYPES;
  label: string;
  description?: string;
  readiness: {
    Requirements: number;
    Design: number;
    Frontend: number;
    Backend: number;
    Integration: number;
    Test: number;
  };
  confidence: string;
  implementationStatus: ImplStatusKey;
  childCount?: number;
}

// ── AddNodeForm component (stateful, avoids form submission issues in ReactFlow) ─
function AddNodeForm({ onAdd, onCancel }: {
  onAdd: (label: string, nodeType: keyof typeof NTYPES, description?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState<keyof typeof NTYPES>('GENERIC');
  const [desc, setDesc] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, nodeType, desc.trim() || undefined);
    setName(''); setDesc('');
  };

  return (
    <>
      <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>Add Node</h3>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Node name *" maxLength={100}
        className="w-full mb-2 px-2 py-1.5 rounded text-xs"
        style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
      />
      <select value={nodeType} onChange={e => setNodeType(e.target.value as keyof typeof NTYPES)}
        className="w-full mb-2 px-2 py-1.5 rounded text-xs"
        style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, outline: 'none' }}
      >
        {Object.entries(NTYPES).filter(([k]) => k !== 'FEATURE').map(([key, val]) => (
          <option key={key} value={key}>{val.icon} {val.label}</option>
        ))}
      </select>
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" maxLength={200}
        className="w-full mb-3 px-2 py-1.5 rounded text-xs"
        style={{ background: C.surfaceAlt, color: C.text, border: `1px solid ${C.border}`, outline: 'none' }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
      />
      <div className="flex gap-2">
        <button type="button" onClick={handleAdd}
          className="flex-1 px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: C.green, color: 'white', border: 'none', cursor: 'pointer' }}
        >Add</button>
        <button type="button" onClick={onCancel}
          className="flex-1 px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.border}`, cursor: 'pointer' }}
        >Cancel</button>
      </div>
    </>
  );
}

// ── ForgeNode component ────────────────────────────────────────────────────────
function ForgeNode({
  data,
  selected,
  onDrillDown,
  onOpenSpec,
  editingNodeId,
  onStartEdit,
  onFinishEdit,
  onCycleImplStatus,
}: {
  data: ForgeNodeData;
  selected?: boolean;
  onDrillDown?: (nodeId: string) => void;
  onOpenSpec?: (nodeId: string) => void;
  editingNodeId?: string | null;
  onStartEdit?: (nodeId: string, currentLabel: string) => void;
  onFinishEdit?: (nodeId: string, newLabel: string) => void;
  onCycleImplStatus?: (nodeId: string) => void;
}) {
  const nodeType = NTYPES[data.type];

  // Live readiness from localStorage specs (updates each render)
  const liveReadiness = SpecificationService.getReadinessForNode(data.id);
  // Merge: prefer live values if any section has been written, else use template defaults
  const hasLocalSpec = Object.values(liveReadiness).some(v => v > 0);
  const readiness = hasLocalSpec ? liveReadiness : data.readiness;

  const readinessValues = Object.values(readiness);
  const avgReadiness = readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length;

  const statusConfig = {
    READY:       { label: "Ready",       color: C.green,  bg: C.greenDim },
    IN_PROGRESS: { label: "In Progress", color: C.yellow, bg: C.yellowDim },
    BLOCKED:     { label: "Blocked",     color: C.red,    bg: C.redDim },
  };

  const statusMap: Record<string, keyof typeof statusConfig> = {
    COMMITTED: 'READY',
    BUBBLE: 'IN_PROGRESS',
    DEFERRED: 'BLOCKED',
  };
  const status = statusConfig[statusMap[data.confidence] || 'BLOCKED'];

  return (
    <div
      className="forge-node"
      style={{
        width: 180,
        background: selected ? C.hover : C.surface,
        border: `${selected ? 2 : 1.5}px solid ${selected ? C.accent : nodeType.color}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        boxShadow: (data as any).onTheBubble
          ? `0 0 0 2px ${C.red}, 0 0 12px ${C.red}40`
          : selected ? `0 0 12px ${C.accent}40, 0 0 4px ${C.accent}20` : 'none',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Connection Handles */}
      <Handle type="target" position={Position.Left}
        style={{ background: nodeType.color, border: `2px solid ${C.surface}`, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: nodeType.color, border: `2px solid ${C.surface}`, width: 10, height: 10 }} />
      <Handle type="target" position={Position.Top}
        style={{ background: nodeType.color, border: `2px solid ${C.surface}`, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: nodeType.color, border: `2px solid ${C.surface}`, width: 10, height: 10 }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5" style={{ color: nodeType.color, fontSize: 10, fontWeight: 600 }}>
          <HarveyBall
            status={data.implementationStatus || 'NOT_STARTED'}
            size={14}
            onClick={onCycleImplStatus ? (e) => { e.stopPropagation(); onCycleImplStatus(data.id); } : undefined}
          />
          {nodeType.icon} {nodeType.label.toUpperCase()}
          {(data.childCount ?? 0) > 0 && (
            <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 9, marginLeft: 2 }}>
              ({data.childCount})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onDrillDown && (
            (data.childCount ?? 0) > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onDrillDown(data.id); }}
                className="p-1 rounded hover:scale-110 transition-transform"
                style={{
                  background: C.accent, color: 'white', border: 'none',
                  fontSize: 8, width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
                title={`View ${data.childCount} children`}
              >
                ↘
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onDrillDown(data.id); }}
                className="p-1 rounded hover:scale-110 transition-transform"
                style={{
                  background: C.green, color: 'white', border: 'none',
                  fontSize: 10, width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
                title="Add children"
              >
                +
              </button>
            )
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSpec?.(data.id); }}
            style={{
              fontSize: 9, fontWeight: 600,
              background: C.accentDim, color: C.accent,
              border: `1px solid ${C.accent}40`, borderRadius: 3,
              padding: '1px 5px', cursor: 'pointer',
            }}
            title="Open Specification Editor"
          >
            SPEC
          </button>
        </div>
      </div>

      {/* Title (double-click to edit) */}
      {editingNodeId === data.id ? (
        <input
          autoFocus
          defaultValue={data.label}
          onBlur={e => onFinishEdit?.(data.id, e.target.value.trim() || data.label)}
          onKeyDown={e => {
            if (e.key === 'Enter') onFinishEdit?.(data.id, (e.target as HTMLInputElement).value.trim() || data.label);
            if (e.key === 'Escape') onFinishEdit?.(data.id, data.label);
          }}
          onClick={e => e.stopPropagation()}
          style={{
            fontWeight: 600, color: C.text, marginBottom: 4, width: '100%',
            background: C.surfaceAlt, border: `1px solid ${C.accent}`, borderRadius: 3,
            padding: '1px 4px', fontSize: 12, outline: 'none',
          }}
        />
      ) : (
        <div
          style={{ fontWeight: 600, color: C.text, marginBottom: 4, cursor: 'text' }}
          onDoubleClick={e => { e.stopPropagation(); onStartEdit?.(data.id, data.label); }}
          title="Double-click to rename"
        >
          {data.label}
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>{data.description}</div>
      )}

      {/* Readiness indicators — 6 bars */}
      <div className="flex gap-1 mb-2">
        {Object.entries(readiness).map(([key, value]) => (
          <div
            key={key}
            style={{
              width: 20,
              height: 8,
              backgroundColor: value >= 0.8 ? C.green : value >= 0.4 ? C.yellow : C.red,
              opacity: Math.max(value, 0.15), // minimum opacity so empty bars are visible
              borderRadius: 2,
            }}
            title={`${key}: ${Math.round(value * 100)}%`}
          />
        ))}
      </div>

      {/* Status badge */}
      <div
        style={{
          background: status.bg, color: status.color,
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
          fontWeight: 600, textAlign: 'center',
          border: `1px solid ${status.color}20`,
        }}
      >
        {status.label} • {Math.round(avgReadiness * 100)}%
      </div>
    </div>
  );
}

// ── Node types factory ─────────────────────────────────────────────────────────
const createNodeTypes = (
  onDrillDown: (nodeId: string) => void,
  onOpenSpec: (nodeId: string) => void,
  editingNodeId: string | null,
  onStartEdit: (nodeId: string, currentLabel: string) => void,
  onFinishEdit: (nodeId: string, newLabel: string) => void,
  onCycleImplStatus: (nodeId: string) => void,
) => ({
  forgeNode: (props: any) => (
    <ForgeNode {...props} onDrillDown={onDrillDown} onOpenSpec={onOpenSpec}
      editingNodeId={editingNodeId} onStartEdit={onStartEdit} onFinishEdit={onFinishEdit}
      onCycleImplStatus={onCycleImplStatus} />
  ),
});

// ── Main graph component ───────────────────────────────────────────────────────
function ForgeGraphFlow({ projectId }: { projectId?: string }) {
  const routeParams = useParams();
  const releasePanelOpen = useReleaseStore(s => s.panelOpen);
  const toggleReleasePanel = useReleaseStore(s => s.togglePanel);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<ForgeNodeData | null>(null);
  const [showSpecEditor, setShowSpecEditor] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentProject, setCurrentProject] = useState<LocalProject | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [showProjectNav, setShowProjectNav] = useState(false);
  // Incrementing counter to force node re-renders when specs change
  const [specVersion, setSpecVersion] = useState(0);
  const [showAddNode, setShowAddNode] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // ── Hierarchy drill-down state ────────────────────────────────────────────
  const [contextNodeId, setContextNodeId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('node') || null;
  });
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; label: string }>>([
    { id: null, label: 'Root' }
  ]);

  // ── Refs for stable callbacks (prevent nodeTypes recreation) ─────────────
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const currentProjectRef = useRef<LocalProject | null>(null);

  // Keep refs in sync with state
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);

  const reactFlowInstance = useReactFlow();
  const { fitView } = reactFlowInstance;
  const { navigateToDetail } = useNavigationStore();
  const { setProjectContext, clearProjectContext, markDirty, markClean, setSaving, registerSave } = useCanvasStore();

  // ── Canvas store: project context + save ─────────────────────────────────
  useEffect(() => {
    if (currentProject && currentProject.name) {
      setProjectContext(currentProject.id, currentProject.name);
    }
  }, [currentProject, setProjectContext]);

  // Clean up canvas store on unmount
  useEffect(() => {
    return () => clearProjectContext();
  }, [clearProjectContext]);

  // Register save callback
  useEffect(() => {
    const saveToBackend = async () => {
      // Map numeric Harvey ball values (0-4) to backend readiness enum
      const toReadiness = (v: number | string): ReadinessState => {
        if (typeof v === 'string') return v as ReadinessState;
        if (v === 0) return 'NOT_STARTED';
        if (v >= 4) return 'COMPLETE';
        return 'IN_PROGRESS';
      };

      setSaving(true);
      try {
        const allNodes = nodesRef.current;
        const allEdges = edgesRef.current;

        // Upsert all work items
        const workItems: WorkItemDTO[] = allNodes.map(n => ({
          id: n.id,
          title: n.data.label || '',
          description: n.data.description || '',
          type: n.data.type || 'FEATURE',
          x: n.position.x,
          y: n.position.y,
          readiness: {
            requirements: toReadiness(n.data.readiness?.Requirements ?? 0),
            design: toReadiness(n.data.readiness?.Design ?? 0),
            frontend: toReadiness(n.data.readiness?.Frontend ?? 0),
            backend: toReadiness(n.data.readiness?.Backend ?? 0),
            integration: toReadiness(n.data.readiness?.Integration ?? 0),
            test: toReadiness(n.data.readiness?.Test ?? 0),
          },
          confidence: n.data.confidence || 'DEFERRED',
          implementationStatus: n.data.implementationStatus || 'NOT_STARTED',
        }));

        await WorkItemService.upsertMany(workItems);

        // Upsert all edges as dependencies
        const deps = allEdges.map(e => ({
          from: e.source,
          to: e.target,
          type: 'requires',
        }));
        if (deps.length > 0) {
          await DependencyService.upsertMany(deps);
        }

        // Also save to localStorage
        const proj = currentProjectRef.current;
        if (proj) {
          updateLocalGraph(proj.id, allNodes, allEdges);
        }

        markClean();
      } catch (err) {
        console.warn('[ForgeGraph] Save failed:', err);
      } finally {
        setSaving(false);
      }
    };

    registerSave(saveToBackend);
  }, [registerSave, setSaving, markClean]);

  // ── Helper: convert readiness value to 0-1 number ──────────────────────────
  const toReadinessNum = (v: any): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      // Map state strings to percentages
      if (v === 'COMPLETE') return 1;
      if (v === 'IN_PROGRESS') return 0.5;
      return 0; // NOT_STARTED or unknown
    }
    if (v && typeof v === 'object') {
      // Handle {state, percentage} objects
      if (typeof v.percentage === 'number') return v.percentage / 100;
      if (v.state === 'COMPLETE') return 1;
      if (v.state === 'IN_PROGRESS') return 0.5;
      return 0;
    }
    return 0;
  };

  // ── Helper: map WorkItemDTO[] to ReactFlow Node[] ──────────────────────────
  const mapItemsToNodes = (items: import('../services').WorkItemDTO[]): Node[] =>
    items.map((item) => ({
      id: item.id,
      type: 'forgeNode',
      position: { x: item.x ?? Math.random() * 600, y: item.y ?? Math.random() * 400 },
      data: {
        id: item.id,
        type: item.type || 'FEATURE',
        label: item.title,
        description: item.description,
        readiness: {
          Requirements: toReadinessNum(item.readiness?.requirements),
          Design: toReadinessNum(item.readiness?.design),
          Frontend: toReadinessNum(item.readiness?.frontend),
          Backend: toReadinessNum(item.readiness?.backend),
          Integration: toReadinessNum(item.readiness?.integration),
          Test: toReadinessNum(item.readiness?.test),
        },
        confidence: item.confidence || 'DEFERRED',
        implementationStatus: item.implementationStatus || 'NOT_STARTED',
        childCount: item.childCount ?? 0,
        onTheBubble: item.onTheBubble ?? false,
        releaseId: item.releaseId ?? null,
      },
      draggable: true,
    }));

  const mapDepsToEdges = (deps: import('../services').DependencyDTO[]): Edge[] =>
    deps.map((dep, i) => {
      const color = dep.type === 'requires' ? C.red : dep.type === 'contains' ? C.textDim : C.blue;
      const dash = dep.type === 'contains' ? '4,4' : dep.type === 'requires' ? '6,3' : undefined;
      return {
        id: `edge-${i}`,
        source: dep.from,
        target: dep.to,
        type: 'smoothstep',
        style: { stroke: color, strokeWidth: 1.5, strokeDasharray: dash },
        markerEnd: { type: MarkerType.Arrow, color },
      };
    });

  // ── Load breadcrumb trail on mount if deep-linking via ?node= ─────────────
  useEffect(() => {
    if (!contextNodeId) return;
    (async () => {
      const ancestors = await WorkItemService.getAncestors(contextNodeId);
      if (ancestors.length > 0) {
        setBreadcrumbs([
          { id: null, label: 'Root' },
          ...ancestors.map(a => ({ id: a.id, label: a.title })),
        ]);
      }
    })();
  }, []); // Only on mount

  // ── Load data (always from backend — single source of truth) ────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Set project context if we have a projectId
      if (projectId) {
        const projResult = await import('../services/ProjectService').then(m => m.getById(projectId));
        const projName = projResult?.name || '';
        setCurrentProject({ id: projectId, name: projName });
      }

      // Load work items from backend (filtered by hierarchy context)
      try {
        const [workItems, deps] = await Promise.all([
          WorkItemService.listByParent(contextNodeId),
          DependencyService.list(),
        ]);

        if (workItems.length > 0) {
          setNodes(mapItemsToNodes(workItems));
          // Filter edges to only include those between visible nodes
          const visibleIds = new Set(workItems.map(w => w.id));
          const filteredEdges = mapDepsToEdges(deps).filter(
            e => visibleIds.has(e.source) && visibleIds.has(e.target)
          );
          setEdges(filteredEdges);
        } else {
          setNodes([]);
          setEdges([]);
        }
        setLoading(false);
        setTimeout(() => fitView(), 100);
      } catch (error) {
        console.error('Failed to load data from backend:', error);
        setLoading(false);
        if (!contextNodeId) setShowTemplateSelector(true);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, contextNodeId]);

  // ── Load template ──────────────────────────────────────────────────────────
  const loadTemplate = useCallback((templateId: string, customName?: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const projectName = customName || template.name;
    const localProjectId = currentProject?.id || projectId || `project-${Date.now()}`;
    const newProject: LocalProject = { id: localProjectId, name: projectName, templateId };
    setCurrentProject(newProject);

    // Flatten the hierarchical template into a flat list with parentId
    const allNodes = flattenTemplate(template);
    const rootNodes = allNodes.filter(n => n.parentId === null);

    // Build ReactFlow nodes for root level only (children load on drill-down)
    const forgeNodes: Node[] = rootNodes.map((node) => ({
      id: node.id,
      type: 'forgeNode',
      position: { x: node.x, y: node.y },
      data: {
        id: node.id,
        type: node.type as keyof typeof NTYPES,
        label: node.label,
        description: node.description,
        readiness: { Requirements: 0, Design: 0, Frontend: 0, Backend: 0, Integration: 0, Test: 0 },
        confidence: 'DEFERRED',
        implementationStatus: 'NOT_STARTED' as ImplStatusKey,
        childCount: node.childCount,
      },
      draggable: true,
    }));

    const forgeEdges: Edge[] = template.edges.map((edge, i) => ({
      id: edge.id || `edge-${i}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      style: { stroke: C.blue, strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.Arrow, color: C.blue },
    }));

    setNodes(forgeNodes);
    setEdges(forgeEdges);
    setShowTemplateSelector(false);
    setLoading(false);

    // Persist ALL nodes (root + children + grandchildren) to backend
    // Parents must be created before children (FK constraint)
    // Sort: depth 0 first, then depth 1, then depth 2
    const sortedNodes = [...allNodes]; // flattenTemplate already outputs parents before children

    (async () => {
      for (const node of sortedNodes) {
        const dto: WorkItemDTO = {
          id: node.id,
          title: node.label,
          description: node.description,
          type: node.type,
          x: node.x,
          y: node.y,
          readiness: {
            requirements: 'NOT_STARTED', design: 'NOT_STARTED', frontend: 'NOT_STARTED',
            backend: 'NOT_STARTED', integration: 'NOT_STARTED', test: 'NOT_STARTED',
          },
          confidence: 'DEFERRED',
          implementationStatus: 'NOT_STARTED',
          parentId: node.parentId,
        };
        try {
          await WorkItemService.create(dto);
        } catch {
          // May already exist (409) — that's fine
        }
      }
      console.log(`[ForgeGraph] ${sortedNodes.length} template nodes persisted to DB`);
    })();

    setTimeout(() => fitView(), 100);
  }, [fitView]);

  // ── Add new node to canvas ──────────────────────────────────────────────────
  const handleAddNode = useCallback((label: string, nodeType: keyof typeof NTYPES, description?: string) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Place at viewport center
    const vp = reactFlowInstance?.getViewport();
    const x = vp ? (-vp.x + 400) / vp.zoom : 300;
    const y = vp ? (-vp.y + 300) / vp.zoom : 200;

    const newNode: Node = {
      id,
      type: 'forgeNode',
      position: { x, y },
      data: {
        id,
        type: nodeType,
        label,
        description: description || '',
        readiness: { Requirements: 0, Design: 0, Frontend: 0, Backend: 0, Integration: 0, Test: 0 },
        confidence: 'DEFERRED',
        implementationStatus: 'NOT_STARTED' as ImplStatusKey,
      },
      draggable: true,
    };

    setNodes(prev => [...prev, newNode]);
    setShowAddNode(false);
    markDirty();

    // Persist to localStorage (read from refs for stable callback)
    const proj = currentProjectRef.current;
    if (proj) {
      const updatedNodes = [...nodesRef.current, newNode];
      updateLocalGraph(proj.id, updatedNodes, edgesRef.current);
    }

    // Persist to backend (fire-and-forget) — include parentId if drilled in
    const dto: WorkItemDTO = {
      id, title: label, description: description || '', type: nodeType,
      x, y,
      readiness: {
        requirements: 'NOT_STARTED', design: 'NOT_STARTED', frontend: 'NOT_STARTED',
        backend: 'NOT_STARTED', integration: 'NOT_STARTED', test: 'NOT_STARTED',
      },
      confidence: 'low',
      implementationStatus: 'NOT_STARTED',
      parentId: contextNodeId,
    };
    WorkItemService.create(dto).catch(err => console.warn('[ForgeGraph] Failed to save new node:', err));
  }, [reactFlowInstance, contextNodeId]);

  // ── Rename node ────────────────────────────────────────────────────────────
  const handleRenameNode = useCallback((nodeId: string, newLabel: string) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
    ));
    markDirty();
    setEditingNodeId(null);

    // Persist to localStorage (read from refs for stable callback)
    const proj = currentProjectRef.current;
    if (proj) {
      const updatedNodes = nodesRef.current.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n
      );
      updateLocalGraph(proj.id, updatedNodes, edgesRef.current);
    }

    // Persist to backend (fire-and-forget)
    WorkItemService.update(nodeId, { title: newLabel }).catch(err =>
      console.warn('[ForgeGraph] Failed to rename node:', err)
    );
  }, []);

  // ── Node changes (position) ────────────────────────────────────────────────
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(nds => applyNodeChanges(changes, nds));

    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        WorkItemService.updatePosition(change.id, change.position.x, change.position.y);
        markDirty();
      }
    }
  }, [markDirty]);

  // ── Edge changes ───────────────────────────────────────────────────────────
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(eds => applyEdgeChanges(changes, eds));
      if (changes.some(c => c.type === 'remove' || c.type === 'add')) markDirty();
    },
    [markDirty],
  );

  // ── New connections ────────────────────────────────────────────────────────
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const dep = await DependencyService.create(connection.source, connection.target);
    if (dep) {
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: 'smoothstep',
        style: { stroke: C.red, strokeWidth: 1.5, strokeDasharray: '6,3' },
        markerEnd: { type: MarkerType.Arrow, color: C.red },
      };
      setEdges(eds => addEdge(newEdge, eds));
      markDirty();
    }
  }, [markDirty]);

  // ── Node click ─────────────────────────────────────────────────────────────
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data);
  }, []);

  // ── Drill-down (in-place hierarchy navigation) ─────────────────────────────
  const handleDrillDown = useCallback((nodeId: string) => {
    // Find the node's label for breadcrumb
    const node = nodesRef.current.find(n => n.id === nodeId);
    const label = node?.data?.label || nodeId;

    setContextNodeId(nodeId);
    setBreadcrumbs(prev => [...prev, { id: nodeId, label }]);

    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('node', nodeId);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // ── Navigate up one level ─────────────────────────────────────────────────
  const handleNavigateUp = useCallback(() => {
    setBreadcrumbs(prev => {
      if (prev.length <= 1) return prev; // Already at root
      const newBreadcrumbs = prev.slice(0, -1);
      const parentCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      setContextNodeId(parentCrumb.id);

      // Update URL
      const url = new URL(window.location.href);
      if (parentCrumb.id) {
        url.searchParams.set('node', parentCrumb.id);
      } else {
        url.searchParams.delete('node');
      }
      window.history.replaceState({}, '', url.toString());

      return newBreadcrumbs;
    });
  }, []);

  // ── Navigate to specific breadcrumb ───────────────────────────────────────
  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumbs(prev => {
      const newBreadcrumbs = prev.slice(0, index + 1);
      const crumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      setContextNodeId(crumb.id);

      const url = new URL(window.location.href);
      if (crumb.id) {
        url.searchParams.set('node', crumb.id);
      } else {
        url.searchParams.delete('node');
      }
      window.history.replaceState({}, '', url.toString());

      return newBreadcrumbs;
    });
  }, []);

  // ── Backspace to navigate up ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate up on Backspace if not editing a node or in an input
      if (e.key === 'Backspace' && !editingNodeId && !showAddNode) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (contextNodeId) {
          e.preventDefault();
          handleNavigateUp();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextNodeId, editingNodeId, showAddNode, handleNavigateUp]);

  // ── Add child / view children (+ or ↘ button on node) ──────────────────
  // Both buttons just drill down — the + Add Node inside handles creation
  const handleAddChild = useCallback((parentId: string) => {
    handleDrillDown(parentId);
  }, [handleDrillDown]);

  // ── Edge click (Cmd+Click to delete) ──────────────────────────────────────
  const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    if (event.ctrlKey || event.metaKey) {
      const ok = await DependencyService.remove(edge.source, edge.target);
      if (ok) setEdges(eds => eds.filter(e => e.id !== edge.id));
    }
  }, []);

  // ── Open / close spec editor ──────────────────────────────────────────────
  const handleOpenSpec = useCallback((nodeId: string) => {
    setShowSpecEditor(nodeId);
  }, []);

  const handleCloseSpec = useCallback(() => {
    setShowSpecEditor(null);
    // Bump version to force ForgeNode re-renders with fresh readiness data
    setSpecVersion(v => v + 1);
  }, []);

  // ── Node types (memoised) ─────────────────────────────────────────────────
  const handleStartEdit = useCallback((nodeId: string, _currentLabel: string) => {
    setEditingNodeId(nodeId);
  }, []);

  const handleFinishEdit = useCallback((nodeId: string, newLabel: string) => {
    handleRenameNode(nodeId, newLabel);
  }, [handleRenameNode]);

  // ── Cycle implementation status (Harvey ball click) ─────────────────────
  const handleCycleImplStatus = useCallback((nodeId: string) => {
    // Use functional updater so we don't depend on `nodes` state directly
    setNodes(prev => {
      const updated = prev.map(n => {
        if (n.id !== nodeId) return n;
        const currentStatus: ImplStatusKey = n.data.implementationStatus || 'NOT_STARTED';
        const idx = IMPL_STATUS_ORDER.indexOf(currentStatus);
        const nextStatus = IMPL_STATUS_ORDER[(idx + 1) % IMPL_STATUS_ORDER.length];
        return { ...n, data: { ...n.data, implementationStatus: nextStatus } };
      });

      // Persist to localStorage inside the updater (we have the fresh nodes)
      const proj = currentProjectRef.current;
      if (proj) {
        updateLocalGraph(proj.id, updated, edgesRef.current);
      }

      return updated;
    });

    // Persist to backend — read from ref for the current status
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      const currentStatus: ImplStatusKey = node.data.implementationStatus || 'NOT_STARTED';
      const idx = IMPL_STATUS_ORDER.indexOf(currentStatus);
      const nextStatus = IMPL_STATUS_ORDER[(idx + 1) % IMPL_STATUS_ORDER.length];

      WorkItemService.update(nodeId, { implementationStatus: nextStatus } as any).catch(err =>
        console.warn('[ForgeGraph] Failed to update implementation status:', err)
      );
    }
  }, []);

  const nodeTypes = React.useMemo(
    () => createNodeTypes(handleDrillDown, handleOpenSpec, editingNodeId, handleStartEdit, handleFinishEdit, handleCycleImplStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleDrillDown, handleOpenSpec, specVersion, editingNodeId, handleStartEdit, handleFinishEdit, handleCycleImplStatus],
  );

  // ── Auto-save project to localStorage (root level only) ───────────────────
  // Skip when drilled into a child context to avoid overwriting the full graph
  useEffect(() => {
    if (currentProject && nodes.length > 0 && !contextNodeId) {
      const updated = updateLocalGraph(currentProject.id, nodes, edges);
      setProjects(updated);
    }
  }, [nodes, edges, currentProject, contextNodeId]);

  // ── Project navigation ────────────────────────────────────────────────────
  const handleSelectProject = useCallback((project: any) => {
    setCurrentProject(project);
    if (project.nodes?.length) {
      setNodes(project.nodes);
      setEdges(project.edges ?? []);
      setLoading(false);
      setTimeout(() => fitView(), 100);
    }
    setShowProjectNav(false);
  }, [fitView]);

  const handleDeleteProject = useCallback((projectId: string) => {
    const updated = removeLocalProject(projectId);
    setProjects(updated);

    if (currentProjectRef.current?.id === projectId) {
      if (updated.length > 0) {
        handleSelectProject(updated[0]);
      } else {
        setCurrentProject(null);
        setNodes([]);
        setEdges([]);
      }
    }
  }, [handleSelectProject]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: C.bg, color: C.text }}>
        <div className="text-center">
          <div className="text-lg font-bold mb-2">Loading FORGE Workflow</div>
          <div className="text-sm" style={{ color: C.textMuted }}>Connecting to backend...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ background: C.bg }}>
      {/* Hierarchy breadcrumb bar */}
      {contextNodeId && (
        <div
          className="flex-shrink-0 flex items-center gap-1 px-4 py-2 text-xs"
          style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, zIndex: 10 }}
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span style={{ color: C.textDim }}>/</span>}
              <button
                onClick={() => handleBreadcrumbClick(idx)}
                className="hover:underline transition-colors"
                style={{
                  color: idx === breadcrumbs.length - 1 ? C.text : C.textMuted,
                  fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                }}
              >
                {idx === 0 ? '🏠 Root' : crumb.label}
              </button>
            </React.Fragment>
          ))}
          <button
            onClick={handleNavigateUp}
            className="ml-2 px-2 py-0.5 rounded text-xs transition-colors"
            style={{ background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.border}` }}
            title="Navigate up (Backspace)"
          >
            ← Back
          </button>
        </div>
      )}
      <div className="flex-1 flex relative">
      <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={(_event, node) => {
          handleStartEdit(node.id, node.data?.label || '');
        }}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: C.bg }}
      >
        <Background color={C.border} />
        <Controls style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }} />
        <MiniMap
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
          nodeColor={C.accent}
          nodeStrokeWidth={1}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Canvas Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-2" style={{ zIndex: 10 }}>
        <button
          onClick={() => setShowAddNode(!showAddNode)}
          className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] shadow-lg"
          style={{
            background: showAddNode ? C.accent : C.surface,
            color: showAddNode ? 'white' : C.green,
            border: `1px solid ${showAddNode ? C.accent : C.border}`,
          }}
        >
          + Add Node
        </button>

        {projectId && (
          <button
            onClick={toggleReleasePanel}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] shadow-lg"
            style={{
              background: releasePanelOpen ? C.accent : C.surface,
              color: releasePanelOpen ? 'white' : C.blue,
              border: `1px solid ${releasePanelOpen ? C.accent : C.border}`,
            }}
          >
            Releases
          </button>
        )}

        {/* Legacy project nav (when no projectId) */}
        {!projectId && (
          <>
            <button
              onClick={() => setShowProjectNav(!showProjectNav)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] shadow-lg"
              style={{
                background: showProjectNav ? C.accent : C.surface,
                color: showProjectNav ? 'white' : C.text,
                border: `1px solid ${showProjectNav ? C.accent : C.border}`,
              }}
            >
              Projects ({projects.length})
            </button>
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: C.accent, color: 'white', border: 'none' }}
            >
              New from Template
            </button>
          </>
        )}
      </div>

      {/* Add Node Panel */}
      {showAddNode && (
        <div className="absolute top-4 left-72 p-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}`, width: 260 }}>
          <AddNodeForm onAdd={handleAddNode} onCancel={() => setShowAddNode(false)} />
        </div>
      )}

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 p-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: C.text }}>{selectedNode.label}</h3>
            <button onClick={() => setSelectedNode(null)} style={{ color: C.textMuted }} className="text-xs hover:opacity-75">✕</button>
          </div>

          {selectedNode.description && (
            <p className="text-xs mb-4" style={{ color: C.textMuted }}>{selectedNode.description}</p>
          )}

          {/* Implementation Status (Harvey Ball) */}
          <div className="flex items-center gap-2 mb-4">
            <HarveyBall status={selectedNode.implementationStatus || 'NOT_STARTED'} size={18} />
            <span className="text-xs font-medium" style={{ color: C.text }}>
              {IMPL_STATUS[selectedNode.implementationStatus || 'NOT_STARTED'].label}
            </span>
            <span className="text-xs" style={{ color: C.textMuted }}>
              ({IMPL_STATUS[selectedNode.implementationStatus || 'NOT_STARTED'].pct}% built)
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium" style={{ color: C.text }}>Readiness Dimensions</h4>
            {(() => {
              const live = SpecificationService.getReadinessForNode(selectedNode.id);
              const hasLocal = Object.values(live).some(v => v > 0);
              const readiness = hasLocal ? live : selectedNode.readiness;
              return Object.entries(readiness).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: C.textMuted }}>{key}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full" style={{ width: 60, background: C.surfaceAlt }}>
                      <div className="h-full rounded-full" style={{
                        width: `${value * 100}%`,
                        background: value >= 0.8 ? C.green : value >= 0.4 ? C.yellow : C.red,
                      }} />
                    </div>
                    <span className="text-xs" style={{ color: C.text }}>{Math.round(value * 100)}%</span>
                  </div>
                </div>
              ));
            })()}
          </div>

          <button
            onClick={() => setShowSpecEditor(selectedNode.id)}
            className="w-full mt-4 px-3 py-2 rounded text-xs font-medium transition-all hover:scale-[1.02]"
            style={{ background: C.accent, color: 'white', border: 'none' }}
          >
            📋 Open Specification Editor
          </button>
        </div>
      )}

      {/* Specification Editor Modal */}
      {showSpecEditor && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', zIndex: 50 }}
          onClick={handleCloseSpec}
        >
          <div
            className="w-[90%] h-[85%] rounded-lg overflow-auto"
            style={{ background: C.bg }}
            onClick={(e) => e.stopPropagation()}
          >
            <SpecificationEditor
              workItemId={showSpecEditor}
              variant="full"
              onClose={handleCloseSpec}
            />
          </div>
        </div>
      )}

      {/* Template Selector */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onSelectTemplate={loadTemplate}
        onClose={() => setShowTemplateSelector(false)}
      />

      {/* Project Navigator */}
      <ProjectNavigator
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onNewProject={() => setShowTemplateSelector(true)}
        onDeleteProject={handleDeleteProject}
        isOpen={showProjectNav}
        onClose={() => setShowProjectNav(false)}
      />
    </div>
    {/* Release Panel Sidebar */}
    {projectId && releasePanelOpen && (
      <ReleasePanel
        projectId={projectId}
        nodeIds={nodes.map(n => n.id)}
      />
    )}
    </div>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function ForgeGraphReactFlow({ projectId }: { projectId?: string } = {}) {
  return (
    <ReactFlowProvider>
      <ForgeGraphFlow projectId={projectId} />
    </ReactFlowProvider>
  );
}
