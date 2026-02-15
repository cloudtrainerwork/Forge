'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigationStore } from '@/stores/navigationStore';
import TemplateSelector from './TemplateSelector';
import ProjectNavigator from './ProjectNavigator';
import { WORKFLOW_TEMPLATES } from '@/data/workflowTemplates';

// FORGE color palette
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

// Node types with icons
const NTYPES = {
  FEATURE: { label: "Feature", color: C.accent, icon: "◆" },
  SERVICE: { label: "Service", color: C.blue, icon: "⬡" },
  SCREEN: { label: "Screen", color: C.purple, icon: "◻" },
  INTEGRATION: { label: "Integration", color: C.cyan, icon: "⬢" },
  DATABASE: { label: "Database", color: C.textMuted, icon: "⬈" },
  API: { label: "API", color: C.green, icon: "◇" },
  COMPONENT: { label: "Component", color: C.yellow, icon: "▣" },
};

// Types
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
}

interface ForgeEdgeData {
  from: string;
  to: string;
  type: 'requires' | 'contains' | 'feeds-into';
}

// Custom Node Component
function ForgeNode({ data, onDrillDown }: { data: ForgeNodeData; onDrillDown?: (nodeId: string) => void }) {
  const nodeType = NTYPES[data.type];
  const readinessValues = Object.values(data.readiness);
  const avgReadiness = readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length;

  // Debug logging removed - was causing console spam

  const statusConfig = {
    READY: { label: "Ready", color: C.green, bg: C.greenDim },
    IN_PROGRESS: { label: "In Progress", color: C.yellow, bg: C.yellowDim },
    BLOCKED: { label: "Blocked", color: C.red, bg: C.redDim },
  };

  // Map old confidence values to new status
  const statusMap: { [key: string]: keyof typeof statusConfig } = {
    COMMITTED: 'READY',
    BUBBLE: 'IN_PROGRESS',
    DEFERRED: 'BLOCKED'
  };
  const status = statusConfig[statusMap[data.confidence] || 'BLOCKED'];

  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDrillDown) {
      onDrillDown(data.id);
    }
  };

  return (
    <div
      className="forge-node"
      style={{
        width: 180,
        background: C.surface,
        border: `1.5px solid ${nodeType.color}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
      }}
    >
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: nodeType.color,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: nodeType.color,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: nodeType.color,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: nodeType.color,
          border: `2px solid ${C.surface}`,
          width: 10,
          height: 10,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div style={{ color: nodeType.color, fontSize: 10, fontWeight: 600 }}>
          {nodeType.icon} {nodeType.label.toUpperCase()}
        </div>
        <div className="flex items-center gap-1">
          {/* Drill down button for SCREEN nodes */}
          {data.type === 'SCREEN' && onDrillDown && (
            <button
              onClick={handleDrillDown}
              className="p-1 rounded hover:scale-110 transition-transform"
              style={{
                background: C.accent,
                color: 'white',
                border: 'none',
                fontSize: 8,
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Drill down into screen details"
            >
              ↘
            </button>
          )}
          <div style={{ fontSize: 10, fontWeight: 600 }}>
            SPEC
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>
        {data.label}
      </div>

      {/* Description */}
      {data.description && (
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 8 }}>
          {data.description}
        </div>
      )}

      {/* Readiness indicators */}
      <div className="flex gap-1 mb-2">
        {Object.entries(data.readiness).map(([key, value]) => (
          <div
            key={key}
            style={{
              width: 20,
              height: 8,
              backgroundColor: value >= 0.8 ? C.green : value >= 0.4 ? C.yellow : C.red,
              opacity: value,
              borderRadius: 2,
            }}
            title={`${key}: ${Math.round(value * 100)}%`}
          />
        ))}
      </div>

      {/* Status badge */}
      <div
        style={{
          background: status.bg,
          color: status.color,
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 600,
          textAlign: 'center',
          border: `1px solid ${status.color}20`,
        }}
      >
        {status.label} • {Math.round(avgReadiness * 100)}%
      </div>
    </div>
  );
}

// Node types for ReactFlow - moved inside component to access handleDrillDown

// API functions
async function saveNodePosition(nodeId: string, x: number, y: number) {
  try {
    const response = await fetch(`http://localhost:3001/api/v1/work-items/${nodeId}/position`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save node position:', error);
    return false;
  }
}

async function createDependency(from: string, to: string, type = 'requires') {
  try {
    const response = await fetch('http://localhost:3001/api/v1/dependencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, type }),
    });
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Failed to create dependency:', error);
    return null;
  }
}

async function deleteDependency(from: string, to: string) {
  try {
    const response = await fetch(`http://localhost:3001/api/v1/dependencies/${from}/${to}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete dependency:', error);
    return false;
  }
}

// Main ReactFlow component
function ForgeGraphFlow() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<ForgeNodeData | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentProject, setCurrentProject] = useState<{id: string; name: string; templateId?: string} | null>(null);
  const [projects, setProjects] = useState<Array<{id: string; name: string; templateId?: string; nodes?: Node[]; edges?: Edge[]}>>([]);
  const [showProjectNav, setShowProjectNav] = useState(false);

  const { fitView } = useReactFlow();
  const { navigateToDetail } = useNavigationStore();

  // Load data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load work items
        const workItemsResponse = await fetch('http://localhost:3001/api/v1/work-items');
        const workItemsData = await workItemsResponse.json();

        // Load dependencies
        const dependenciesResponse = await fetch('http://localhost:3001/api/v1/dependencies');
        const dependenciesData = await dependenciesResponse.json();

        // Transform work items to ReactFlow nodes
        const reactFlowNodes: Node[] = workItemsData.data.map((item: any) => ({
          id: item.id,
          type: 'forgeNode',
          position: { x: item.x, y: item.y },
          data: {
            id: item.id,
            type: item.type,
            label: item.title,
            description: item.description,
            readiness: item.readiness,
            confidence: item.confidence,
          },
          draggable: true,
        }));

        // Transform dependencies to ReactFlow edges
        const reactFlowEdges: Edge[] = dependenciesData.data.map((dep: ForgeEdgeData, i: number) => {
          const color = dep.type === 'requires' ? C.red : dep.type === 'contains' ? C.textDim : C.blue;
          const style = dep.type === 'contains' ? '4,4' : dep.type === 'requires' ? '6,3' : 'none';

          return {
            id: `edge-${i}`,
            source: dep.from,
            target: dep.to,
            type: 'smoothstep',
            style: {
              stroke: color,
              strokeWidth: 1.5,
              strokeDasharray: style !== 'none' ? style : undefined,
            },
            markerEnd: {
              type: 'arrow',
              color: color,
            },
          };
        });

        setNodes(reactFlowNodes);
        setEdges(reactFlowEdges);
        setLoading(false);

        // Fit view after data loads
        setTimeout(() => fitView(), 100);
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [fitView]);

  // Load template when selected
  const loadTemplate = useCallback((templateId: string, customName?: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Store project with custom name
    const projectName = customName || template.name;
    const projectId = `project-${Date.now()}`;
    const newProject = { id: projectId, name: projectName, templateId };
    setCurrentProject(newProject);

    // Transform template nodes to FORGE format
    const forgeNodes: Node[] = template.nodes.map((node) => ({
      id: node.id,
      type: 'forgeNode',
      position: node.position,
      data: {
        id: node.id,
        type: node.data.type as keyof typeof NTYPES,
        label: node.data.label,
        description: node.data.description,
        readiness: {
          Requirements: node.data.readiness?.requirements || 0,
          Design: node.data.readiness?.design || 0,
          Frontend: node.data.readiness?.frontend || 0,
          Backend: node.data.readiness?.backend || 0,
          Integration: node.data.readiness?.integration || 0,
          Test: node.data.readiness?.test || 0,
        },
        confidence: 'medium',
      },
      draggable: true,
    }));

    // Transform template edges to FORGE format
    const forgeEdges: Edge[] = template.edges.map((edge, i) => ({
      id: edge.id || `edge-${i}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      style: {
        stroke: C.blue,
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: 'arrow',
        color: C.blue,
      },
    }));

    setNodes(forgeNodes);
    setEdges(forgeEdges);

    // Save project to projects list
    const projectWithData = {
      ...newProject,
      nodes: forgeNodes,
      edges: forgeEdges
    };
    setProjects(prev => {
      const updated = [...prev, projectWithData];
      // Save to localStorage
      localStorage.setItem('forgeProjects', JSON.stringify(updated));
      return updated;
    });

    setShowTemplateSelector(false);
    setLoading(false);

    // Fit view after template loads
    setTimeout(() => fitView(), 100);
  }, [fitView]);

  // Handle node changes (position updates)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      // Save position changes to backend
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          saveNodePosition(change.id, change.position.x, change.position.y);
        }
      });
    },
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle new connections
  const onConnect = useCallback(
    async (connection: Connection) => {
      if (connection.source && connection.target) {
        const newDep = await createDependency(connection.source, connection.target);
        if (newDep) {
          const newEdge = {
            id: `edge-${Date.now()}`,
            source: connection.source,
            target: connection.target,
            type: 'smoothstep',
            style: {
              stroke: C.red,
              strokeWidth: 1.5,
              strokeDasharray: '6,3',
            },
            markerEnd: {
              type: 'arrow',
              color: C.red,
            },
          };
          setEdges((eds) => addEdge(newEdge, eds));
        }
      }
    },
    []
  );

  // Handle node selection (single click)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data);
  }, []);

  // Handle drill-down navigation
  const handleDrillDown = useCallback((nodeId: string) => {
    // Navigate to detailed view for screens
    window.location.href = `/workflow/${nodeId}`;
  }, []);

  // Handle edge deletion
  const onEdgeClick = useCallback(async (event: React.MouseEvent, edge: Edge) => {
    if (event.ctrlKey || event.metaKey) {
      const success = await deleteDependency(edge.source, edge.target);
      if (success) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    }
  }, []);

  // Node types with drill-down handler - memoized to prevent recreating on every render
  const nodeTypes = React.useMemo(
    () => createNodeTypes(handleDrillDown),
    [handleDrillDown]
  );

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('forgeProjects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed);
        // Load the first project by default
        if (parsed.length > 0 && !currentProject) {
          const firstProject = parsed[0];
          setCurrentProject(firstProject);
          if (firstProject.nodes && firstProject.edges) {
            setNodes(firstProject.nodes);
            setEdges(firstProject.edges);
          }
        }
      } catch (e) {
        console.error('Failed to load saved projects:', e);
      }
    }
  }, []);

  // Handle project selection
  const handleSelectProject = useCallback((project: any) => {
    setCurrentProject(project);
    if (project.nodes && project.edges) {
      setNodes(project.nodes);
      setEdges(project.edges);
      setLoading(false);
      setTimeout(() => fitView(), 100);
    }
    setShowProjectNav(false);
  }, [fitView]);

  // Handle project deletion
  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.id !== projectId);
      localStorage.setItem('forgeProjects', JSON.stringify(updated));

      // If deleting current project, switch to another or clear
      if (currentProject?.id === projectId) {
        if (updated.length > 0) {
          handleSelectProject(updated[0]);
        } else {
          setCurrentProject(null);
          setNodes([]);
          setEdges([]);
        }
      }

      return updated;
    });
  }, [currentProject, handleSelectProject]);

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
    <div className="w-full h-full" style={{ background: C.bg }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: C.bg }}
      >
        <Background color={C.border} />
        <Controls style={{ button: { background: C.surface, border: `1px solid ${C.border}`, color: C.text } }} />
        <MiniMap
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
          nodeColor={C.accent}
          nodeStrokeWidth={1}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Legend & Controls */}
      <div className="absolute top-4 left-4 p-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: C.text }}>
          {currentProject ? currentProject.name : 'FORGE Workflow'}
        </h2>

        {/* Projects Button */}
        <button
          onClick={() => setShowProjectNav(!showProjectNav)}
          className="w-full mb-2 px-3 py-2 rounded text-xs font-medium transition-all hover:scale-[1.02]"
          style={{
            background: showProjectNav ? C.accent : C.surfaceAlt,
            color: showProjectNav ? 'white' : C.text,
            border: `1px solid ${showProjectNav ? C.accent : C.border}`,
          }}
        >
          📁 Projects ({projects.length})
        </button>

        {/* Template Button */}
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="w-full mb-3 px-3 py-2 rounded text-xs font-medium transition-all hover:scale-[1.02]"
          style={{
            background: C.accent,
            color: 'white',
            border: 'none',
          }}
        >
          🚀 New from Template
        </button>

        <div className="space-y-1 text-xs" style={{ color: C.textMuted }}>
          <div>• Drag nodes to move</div>
          <div>• Drag from handles to connect</div>
          <div>• Cmd+Click edge to delete</div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 p-4 rounded-lg" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: C.text }}>{selectedNode.label}</h3>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ color: C.textMuted }}
              className="text-xs hover:opacity-75"
            >
              ✕
            </button>
          </div>

          {selectedNode.description && (
            <p className="text-xs mb-4" style={{ color: C.textMuted }}>
              {selectedNode.description}
            </p>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-medium" style={{ color: C.text }}>Readiness Dimensions</h4>
            {Object.entries(selectedNode.readiness).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>{key}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: 60,
                      background: C.surfaceAlt,
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${value * 100}%`,
                        background: value >= 0.8 ? C.green : value >= 0.4 ? C.yellow : C.red,
                      }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: C.text }}>{Math.round(value * 100)}%</span>
                </div>
              </div>
            ))}
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
  );
}

// Define nodeTypes outside of component to prevent recreation
const createNodeTypes = (onDrillDown: (nodeId: string) => void) => ({
  forgeNode: (props: any) => <ForgeNode {...props} onDrillDown={onDrillDown} />,
});

// Wrapper component with ReactFlowProvider
export default function ForgeGraphReactFlow() {
  return (
    <ReactFlowProvider>
      <ForgeGraphFlow />
    </ReactFlowProvider>
  );
}