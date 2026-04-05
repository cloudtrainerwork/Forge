'use client';

/**
 * Project browser — file-explorer-style landing page after login.
 * Lists all projects in the tenant with search, filter, and create functionality.
 * Create flow integrates template selection from workflow templates.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Node, Edge, MarkerType } from 'reactflow';
import { useProjectStore } from '../../../../stores/projectStore';
import { useAuth } from '../../../../auth/AuthContext';
import { WORKFLOW_TEMPLATES, TEMPLATE_CATEGORIES } from '../../../../data/workflowTemplates';
import { WorkItemService } from '../../../../services';
import type { ReadinessState } from '../../../../services/WorkItemService';

const C = {
  bg: '#08090d',
  surface: '#111219',
  surfaceAlt: '#161822',
  hover: '#1c1e2d',
  border: '#1f2235',
  borderActive: '#3b4068',
  text: '#e4e6f2',
  textMuted: '#6d7196',
  textDim: '#3a3e5c',
  accent: '#f97316',
  accentDim: '#f9731620',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
};

// ── localStorage helpers for graph data ──────────────────────────────────────
const LOCAL_STORAGE_KEY = 'forgeProjects';

interface LocalProject {
  id: string;
  name: string;
  templateId?: string;
  nodes?: Node[];
  edges?: Edge[];
}

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

function addLocalProject(project: LocalProject): void {
  const all = loadLocalProjects();
  // Replace if same ID exists, otherwise append
  const idx = all.findIndex(p => p.id === project.id);
  if (idx >= 0) all[idx] = project;
  else all.push(project);
  saveLocalProjects(all);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function getComplexityColor(c: string) {
  return c === 'low' ? C.green : c === 'medium' ? '#f59e0b' : C.red;
}

/** Convert a workflow template into ReactFlow nodes+edges, keyed to a specific project ID */
function templateToGraph(templateId: string, backendProjectId: string, projectName: string) {
  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  const nodes: Node[] = template.nodes.map((node) => ({
    id: node.id,
    type: 'forgeNode',
    position: node.position,
    data: {
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      description: node.data.description,
      readiness: {
        Requirements: node.data.readiness?.requirements || 0,
        Design:       node.data.readiness?.design       || 0,
        Frontend:     node.data.readiness?.frontend      || 0,
        Backend:      node.data.readiness?.backend       || 0,
        Integration:  node.data.readiness?.integration   || 0,
        Test:         node.data.readiness?.test           || 0,
      },
      confidence: 'medium',
    },
    draggable: true,
  }));

  const edges: Edge[] = template.edges.map((edge, i) => ({
    id: edge.id || `edge-${i}`,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: { stroke: C.blue, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.Arrow, color: C.blue },
  }));

  const local: LocalProject = {
    id: backendProjectId,
    name: projectName,
    templateId,
    nodes,
    edges,
  };

  return { local, nodes };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProjectBrowserPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const { projects, isLoading, error, loadProjects, createProject, archiveProject, restoreProject, clearError } = useProjectStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create flow state
  type CreateStep = 'closed' | 'pick-template' | 'name';
  const [createStep, setCreateStep] = useState<CreateStep>('closed');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects(filter === 'all' ? undefined : filter);
  }, [loadProjects, filter]);

  const filtered = projects.filter(p => {
    // Client-side status filter (in case store updates status without re-fetch)
    if (filter === 'active' && p.status !== 'active') return false;
    if (filter === 'archived' && p.status !== 'archived') return false;
    // Search text filter
    return p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
  });

  // ── Template selection ────────────────────────────────────────────────────

  const handlePickTemplate = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    setSelectedTemplateId(templateId);
    setNewName(template?.name || '');
    setCreateStep('name');
  };

  const handlePickBlank = () => {
    setSelectedTemplateId(null);
    setNewName('');
    setCreateStep('name');
  };

  const handleCloseCreate = () => {
    setCreateStep('closed');
    setSelectedTemplateId(null);
    setSelectedCategory(null);
    setNewName('');
    setNewDesc('');
  };

  // ── Create project ────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      // 1. Create backend project
      const project = await createProject(newName.trim(), newDesc.trim() || undefined);

      // 2. If a template was selected, save graph data to localStorage keyed by backend project ID
      if (selectedTemplateId) {
        const result = templateToGraph(selectedTemplateId, project.id, project.name);
        if (result) {
          addLocalProject(result.local);
          // Also persist work items to backend so spec API calls work
          const workItems = result.nodes.map((n: Node) => ({
            id: n.id,
            title: n.data.label,
            description: n.data.description || '',
            type: n.data.type || 'task',
            x: n.position.x,
            y: n.position.y,
            readiness: { requirements: 'NOT_STARTED' as ReadinessState, design: 'NOT_STARTED' as ReadinessState, frontend: 'NOT_STARTED' as ReadinessState, backend: 'NOT_STARTED' as ReadinessState, integration: 'NOT_STARTED' as ReadinessState, test: 'NOT_STARTED' as ReadinessState },
            confidence: n.data.confidence || 'low',
            implementationStatus: 'NOT_STARTED',
          }));
          WorkItemService.upsertMany(workItems).catch(err =>
            console.warn('[ProjectBrowser] Failed to save template work items:', err)
          );
        }
      }

      // 3. Navigate to the canvas
      handleCloseCreate();
      router.push(`/t/${slug}/projects/${project.id}`);
    } catch {
      // error is set in store
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, selectedTemplateId, createProject, router, slug]);

  const handleOpen = (projectId: string) => {
    router.push(`/t/${slug}/projects/${projectId}`);
  };

  const handleArchive = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await archiveProject(deleteTarget.id);
      // Also remove localStorage graph data
      try {
        const all = loadLocalProjects().filter(p => p.id !== deleteTarget.id);
        saveLocalProjects(all);
      } catch { /* ignore */ }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, archiveProject]);

  const handleRestore = useCallback(async (projectId: string) => {
    await restoreProject(projectId);
  }, [restoreProject]);

  // ── Template grid (reused in the picker) ──────────────────────────────────

  const filteredTemplates = selectedCategory
    ? WORKFLOW_TEMPLATES.filter(t => t.category === selectedCategory)
    : WORKFLOW_TEMPLATES;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: `1px solid ${C.border}`, background: C.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Projects</h1>
        </div>
        <button
          onClick={() => setCreateStep('pick-template')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: C.accent, color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
      </header>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 32px',
        borderBottom: `1px solid ${C.border}`, background: C.surface,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: 1,
          padding: '8px 12px', borderRadius: 8,
          background: C.surfaceAlt, border: `1px solid ${C.border}`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text" placeholder="Search projects..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['active', 'archived', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? C.accent + '20' : 'transparent', color: filter === f ? C.accent : C.textMuted,
            }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: '16px 32px 0', padding: '12px 16px', borderRadius: 8,
          background: C.red + '15', border: `1px solid ${C.red}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: C.red, fontSize: 14 }}>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Project list */}
      <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        {isLoading && projects.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ color: C.textMuted, fontSize: 14 }}>Loading projects...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', paddingTop: 80, gap: 16,
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: C.textMuted, fontSize: 16, margin: 0 }}>
              {search ? 'No projects match your search' : 'No projects yet'}
            </p>
            {!search && (
              <button onClick={() => setCreateStep('pick-template')} style={{
                padding: '10px 20px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none', fontSize: 14, cursor: 'pointer',
              }}>
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map(project => (
              <div
                key={project.id}
                onClick={() => project.status === 'active' && handleOpen(project.id)}
                style={{
                  padding: 20, borderRadius: 12,
                  cursor: project.status === 'active' ? 'pointer' : 'default',
                  background: C.surfaceAlt, border: `1px solid ${C.border}`, transition: 'all 150ms ease',
                  opacity: project.status === 'archived' ? 0.6 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderActive; (e.currentTarget as HTMLElement).style.background = C.hover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = C.surfaceAlt; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: project.status === 'active' ? C.green + '20' : C.textDim + '30',
                      color: project.status === 'active' ? C.green : C.textMuted,
                    }}>{project.status}</span>
                    {/* Archive / Restore / Delete button */}
                    {project.status === 'active' ? (
                      <button
                        title="Archive project"
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ id: project.id, name: project.name }); }}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'transparent', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.red + '20'; (e.currentTarget as HTMLElement).style.color = C.red; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        title="Restore project"
                        onClick={e => { e.stopPropagation(); handleRestore(project.id); }}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'transparent', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.green + '20'; (e.currentTarget as HTMLElement).style.color = C.green; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {project.description && (
                  <p style={{
                    margin: '0 0 12px', fontSize: 13, color: C.textMuted,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  } as any}>{project.description}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: C.textMuted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                    {project.memberCount ?? 0}
                  </span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 1: Template Picker Modal ──────────────────────────────────── */}
      {createStep === 'pick-template' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,13,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={handleCloseCreate}
        >
          <div
            style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
              width: '90vw', maxWidth: 1100, maxHeight: '90vh', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>New Project</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: C.textMuted }}>Start with a template or create a blank project</p>
              </div>
              <button onClick={handleCloseCreate} style={{
                width: 32, height: 32, borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`,
                color: C.text, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* Category filters */}
            <div style={{ padding: '16px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button onClick={() => setSelectedCategory(null)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                background: !selectedCategory ? C.accent : 'transparent', color: !selectedCategory ? '#fff' : C.textMuted,
                border: `1px solid ${!selectedCategory ? C.accent : C.border}`,
              }}>All Templates</button>
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, cat]) => (
                <button key={key} onClick={() => setSelectedCategory(key)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  background: selectedCategory === key ? (cat as any).color : 'transparent',
                  color: selectedCategory === key ? '#fff' : C.textMuted,
                  border: `1px solid ${selectedCategory === key ? (cat as any).color : C.border}`,
                }}>
                  <span>{(cat as any).icon}</span> {(cat as any).name}
                </button>
              ))}
            </div>

            {/* Template grid + Blank option */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

                {/* Blank project card */}
                <div
                  onClick={handlePickBlank}
                  style={{
                    padding: 24, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms ease',
                    background: C.surfaceAlt, border: `2px dashed ${C.border}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 180,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <h3 style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 600 }}>Blank Project</h3>
                  <p style={{ margin: 0, fontSize: 13, color: C.textMuted, textAlign: 'center' }}>Start from scratch with an empty canvas</p>
                </div>

                {/* Template cards */}
                {filteredTemplates.map(template => {
                  const cat = TEMPLATE_CATEGORIES[template.category] as any;
                  return (
                    <div
                      key={template.id}
                      onClick={() => handlePickTemplate(template.id)}
                      style={{
                        padding: 24, borderRadius: 12, cursor: 'pointer', transition: 'all 150ms ease',
                        background: C.surfaceAlt, border: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = cat.color; (e.currentTarget as HTMLElement).style.background = C.hover; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = C.surfaceAlt; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{cat.icon}</span>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase',
                            background: cat.color + '20', color: cat.color, border: `1px solid ${cat.color}`,
                          }}>{cat.name}</span>
                        </div>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                          background: getComplexityColor(template.estimatedComplexity) + '20',
                          color: getComplexityColor(template.estimatedComplexity),
                          border: `1px solid ${getComplexityColor(template.estimatedComplexity)}`,
                        }}>{template.estimatedComplexity.toUpperCase()}</span>
                      </div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{template.name}</h3>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: C.textMuted, lineHeight: 1.4 }}>{template.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textDim }}>
                        <span>{template.nodes.length} components &bull; {template.edges.length} connections</span>
                        <span>{template.estimatedTimeframe}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Name & Create Modal ───────────────────────────────────── */}
      {createStep === 'name' && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,13,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}
          onClick={handleCloseCreate}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 460, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600 }}>
              {selectedTemplateId ? 'Name Your Project' : 'Create Blank Project'}
            </h2>
            {selectedTemplateId && (
              <p style={{ margin: '0 0 20px', fontSize: 13, color: C.textMuted }}>
                Template: {WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplateId)?.name}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Project Name</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Customer Portal Redesign" autoFocus
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: C.surfaceAlt, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: C.textMuted, marginBottom: 6 }}>Description (optional)</label>
                <textarea
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Brief description of the project..." rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    background: C.surfaceAlt, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => setCreateStep('pick-template')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, background: 'transparent',
                    border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCloseCreate} style={{
                    padding: '8px 16px', borderRadius: 8, background: 'transparent',
                    border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14, cursor: 'pointer',
                  }}>Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    style={{
                      padding: '8px 16px', borderRadius: 8, background: C.accent, color: '#fff', border: 'none',
                      fontSize: 14, cursor: newName.trim() && !creating ? 'pointer' : 'not-allowed',
                      opacity: newName.trim() && !creating ? 1 : 0.5,
                    }}
                  >
                    {creating ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────── */}
      {deleteTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(8,9,13,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 420, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.red + '15', border: `1px solid ${C.red}30`,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Archive Project</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: C.textMuted }}>This can be undone from the Archived filter</p>
              </div>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: C.textMuted, lineHeight: 1.5 }}>
              Are you sure you want to archive <strong style={{ color: C.text }}>{deleteTarget.name}</strong>? The project will be hidden from the active list but can be restored later.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{
                  padding: '8px 16px', borderRadius: 8, background: 'transparent',
                  border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={deleting}
                style={{
                  padding: '8px 16px', borderRadius: 8, background: C.red, color: '#fff', border: 'none',
                  fontSize: 14, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
