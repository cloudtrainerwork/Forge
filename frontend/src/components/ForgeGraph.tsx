'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// Color palette from original FORGE
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

// Dimensions for readiness tracking
const DIMS = ["Requirements", "Design", "Frontend", "Backend", "Integration", "Test"];

// Confidence states
const CONF = {
  COMMITTED: { label: "Committed", color: C.green, bg: C.greenDim },
  BUBBLE: { label: "On the Bubble", color: C.yellow, bg: C.yellowDim },
  DEFERRED: { label: "Deferred", color: C.textMuted, bg: "#1e2040" },
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

// Helper functions
const avg = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0) / Object.values(r).length;
const rColor = (v: number) => v >= 0.8 ? C.green : v >= 0.5 ? C.yellow : v >= 0.2 ? C.accent : C.red;

interface ForgeNode {
  id: string;
  type: keyof typeof NTYPES;
  label: string;
  x: number;
  y: number;
  readiness: Record<string, number>;
  confidence: keyof typeof CONF;
  release?: string;
  sprint?: string;
  hasSpec?: boolean;
  description?: string;
}

interface ForgeEdge {
  from: string;
  to: string;
  type: 'requires' | 'contains' | 'feeds-into';
}

// Sample data - ePayment system
const INITIAL_NODES: ForgeNode[] = [
  {
    id: "login-screen",
    type: "SCREEN",
    label: "Login Screen",
    x: 140,
    y: 100,
    readiness: { Requirements: 1.0, Design: 1.0, Frontend: 0.8, Backend: 0.6, Integration: 0.4, Test: 0.2 },
    confidence: "COMMITTED",
    release: "1.0",
    sprint: "Sprint 6",
    hasSpec: true,
    description: "Member authentication"
  },
  {
    id: "balance-due",
    type: "SCREEN",
    label: "Balance Due",
    x: 140,
    y: 250,
    readiness: { Requirements: 1.0, Design: 1.0, Frontend: 0.6, Backend: 0.4, Integration: 0.2, Test: 0 },
    confidence: "BUBBLE",
    release: "1.0",
    sprint: "Sprint 7",
    hasSpec: true,
    description: "Shows payment amount"
  },
  {
    id: "payment-entry",
    type: "SCREEN",
    label: "Payment Entry",
    x: 140,
    y: 400,
    readiness: { Requirements: 1.0, Design: 0.8, Frontend: 0.4, Backend: 0.2, Integration: 0, Test: 0 },
    confidence: "BUBBLE",
    release: "1.1",
    sprint: "Sprint 8",
    hasSpec: true,
    description: "CC/ACH form"
  },
  {
    id: "auth-service",
    type: "SERVICE",
    label: "Auth Service",
    x: 400,
    y: 100,
    readiness: { Requirements: 1.0, Design: 1.0, Frontend: 0, Backend: 0.8, Integration: 0.6, Test: 0.4 },
    confidence: "COMMITTED",
    release: "1.0",
    sprint: "Sprint 5",
    hasSpec: false,
    description: "SiteMinder integration"
  },
  {
    id: "billing-service",
    type: "SERVICE",
    label: "Billing Service",
    x: 400,
    y: 250,
    readiness: { Requirements: 1.0, Design: 0.6, Frontend: 0, Backend: 0.4, Integration: 0.2, Test: 0 },
    confidence: "BUBBLE",
    release: "1.0",
    sprint: "Sprint 7",
    hasSpec: true,
    description: "Facets real-time API"
  },
  {
    id: "payment-service",
    type: "SERVICE",
    label: "Payment Service",
    x: 400,
    y: 400,
    readiness: { Requirements: 0.8, Design: 0.4, Frontend: 0, Backend: 0.2, Integration: 0, Test: 0 },
    confidence: "DEFERRED",
    release: "1.1",
    sprint: null,
    hasSpec: false,
    description: "Process CC/ACH"
  },
  {
    id: "user-db",
    type: "DATABASE",
    label: "User Database",
    x: 660,
    y: 100,
    readiness: { Requirements: 1.0, Design: 1.0, Frontend: 0, Backend: 1.0, Integration: 1.0, Test: 0.8 },
    confidence: "COMMITTED",
    release: "1.0",
    sprint: "Done",
    hasSpec: false,
    description: "Member profiles"
  },
  {
    id: "payment-db",
    type: "DATABASE",
    label: "Payment Database",
    x: 660,
    y: 400,
    readiness: { Requirements: 1.0, Design: 0.8, Frontend: 0, Backend: 0.6, Integration: 0.4, Test: 0.2 },
    confidence: "BUBBLE",
    release: "1.1",
    sprint: "Sprint 9",
    hasSpec: false,
    description: "Transaction history"
  },
  {
    id: "e-signature",
    type: "INTEGRATION",
    label: "E-Signature",
    x: -60,
    y: 280,
    readiness: { Requirements: 0.4, Design: 0.5, Frontend: 0.2, Backend: 0.1, Integration: 0.1, Test: 0 },
    confidence: "DEFERRED",
    release: "1.2",
    sprint: null,
    hasSpec: true,
    description: "DocuSign integration"
  },
];


export default function ForgeGraph() {
  const [nodes, setNodes] = useState<ForgeNode[]>([]);
  const [edges, setEdges] = useState<ForgeEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 100, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);


  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load work items
        const workItemsResponse = await fetch('http://localhost:3001/api/v1/work-items');
        if (!workItemsResponse.ok) throw new Error('Failed to load work items');
        const workItemsData = await workItemsResponse.json();

        // Transform to ForgeNode format
        const transformedNodes: ForgeNode[] = workItemsData.data.map((item: any) => ({
          id: item.id,
          type: item.type,
          label: item.title,
          x: item.x,
          y: item.y,
          readiness: item.readiness,
          confidence: item.confidence,
          description: item.description,
        }));

        setNodes(transformedNodes);

        // Load dependencies
        const depsResponse = await fetch('http://localhost:3001/api/v1/dependencies');
        if (!depsResponse.ok) throw new Error('Failed to load dependencies');
        const depsData = await depsResponse.json();
        setEdges(depsData.data);

      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save node position to backend
  const saveNodePosition = async (nodeId: string, x: number, y: number) => {
    try {
      await fetch(`http://localhost:3001/api/v1/work-items/${nodeId}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      });
    } catch (error) {
      console.error('Failed to save position:', error);
    }
  };

  // Create dependency in backend
  const createDependency = async (fromId: string, toId: string, type: 'requires' | 'contains' | 'feeds-into' = 'requires') => {
    try {
      console.log('Creating dependency:', { from: fromId, to: toId, type });
      const response = await fetch('http://localhost:3001/api/v1/dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromId, to: toId, type }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', response.status, errorText);
        throw new Error(`Failed to create dependency: ${response.status}`);
      }
      const data = await response.json();
      console.log('Backend response:', data);
      return data.data;
    } catch (error) {
      console.error('Failed to create dependency:', error);
      return null;
    }
  };

  // Delete dependency from backend
  const deleteDependency = async (fromId: string, toId: string) => {
    try {
      await fetch(`http://localhost:3001/api/v1/dependencies/${fromId}/${toId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete dependency:', error);
    }
  };

  // Handle canvas dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('svg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    } else if (draggedNode) {
      // Handle node dragging
      const deltaX = e.clientX - nodeDragStart.x;
      const deltaY = e.clientY - nodeDragStart.y;
      const newX = nodeDragStart.nodeX + deltaX;
      const newY = nodeDragStart.nodeY + deltaY;

      // Update node position in state
      setNodes(prev => prev.map(node =>
        node.id === draggedNode
          ? { ...node, x: newX, y: newY }
          : node
      ));
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      // Save final position to backend
      const draggedNodeData = nodes.find(n => n.id === draggedNode);
      if (draggedNodeData) {
        saveNodePosition(draggedNode, draggedNodeData.x, draggedNodeData.y);
      }
      setDraggedNode(null);
    }
    setIsDragging(false);
  };

  // Handle node dragging
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string, nodeX: number, nodeY: number) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      console.log('Connection mode disabled - coordinate issues being debugged');
      return;
    } else {
      // Start node dragging
      setDraggedNode(nodeId);
      setNodeDragStart({
        x: e.clientX,
        y: e.clientY,
        nodeX,
        nodeY,
      });
    }
  };

  // Handle connection completion
  const handleNodeClick = async (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedId(nodeId);
  };

  const selectedNode = nodes.find(n => n.id === selectedId);

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-900 relative overflow-hidden flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-white">Loading FORGE data...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 relative overflow-hidden" style={{ background: C.bg }}>
      {/* Graph Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1000,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible'
          }}
          width="100%"
          height="100%"
          viewBox="0 0 2000 2000"
        >
          <defs>
            <marker id="arrow-requires" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto">
              <path d="M0,0 L10,3 L0,6" fill={C.red} opacity="0.5" />
            </marker>
            <marker id="arrow-contains" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto">
              <path d="M0,0 L10,3 L0,6" fill={C.textDim} opacity="0.4" />
            </marker>
            <marker id="arrow-feeds" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="7" markerHeight="5" orient="auto">
              <path d="M0,0 L10,3 L0,6" fill={C.blue} opacity="0.5" />
            </marker>
          </defs>

          {edges.map((edge, i) => {
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const fx = fromNode.x + offset.x + 90;
            const fy = fromNode.y + offset.y + 35;
            const tx = toNode.x + offset.x + 90;
            const ty = toNode.y + offset.y + 35;

            const color = edge.type === 'requires' ? C.red : edge.type === 'contains' ? C.textDim : C.blue;
            const marker = edge.type === 'requires' ? 'arrow-requires' : edge.type === 'contains' ? 'arrow-contains' : 'arrow-feeds';
            const dashArray = edge.type === 'contains' ? '4,4' : edge.type === 'requires' ? '6,3' : 'none';

            return (
              <g key={i}>
                <line
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray={dashArray}
                  opacity={0.4}
                  markerEnd={`url(#${marker})`}
                />
                {/* Invisible wider line for easier clicking */}
                <line
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  stroke="transparent"
                  strokeWidth={8}
                  style={{ cursor: 'pointer' }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (e.ctrlKey || e.metaKey) {
                      await deleteDependency(edge.from, edge.to);
                      setEdges(prev => prev.filter(e => !(e.from === edge.from && e.to === edge.to)));
                    }
                  }}
                  title="Ctrl+Click to delete connection"
                />
              </g>
            );
          })}

        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const nodeType = NTYPES[node.type];
          const overallReadiness = avg(node.readiness);
          const conf = CONF[node.confidence];
          const isSelected = node.id === selectedId;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id, node.x, node.y)}
              onClick={(e) => handleNodeClick(e, node.id)}
              className="absolute"
              style={{
                left: node.x + offset.x,
                top: node.y + offset.y,
                width: 180,
                background: isSelected ? C.hover : C.surface,
                border: `1.5px solid ${isSelected ? nodeType.color : C.border}`,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: draggedNode === node.id ? 'grabbing' : 'grab',
                transition: draggedNode === node.id ? 'none' : 'all 0.2s',
                boxShadow: isSelected ? `0 0 20px ${nodeType.color}15` : '0 2px 6px #00000030',
                zIndex: isSelected || draggedNode === node.id ? 10 : 1,
                userSelect: 'none',
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 12, color: nodeType.color }}>{nodeType.icon}</span>
                <span style={{ fontSize: 9, color: nodeType.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  {nodeType.label}
                </span>
                {node.hasSpec && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded" style={{ background: C.accentDim, color: C.accent, fontSize: 8, fontWeight: 700 }}>
                    SPEC
                  </span>
                )}
              </div>

              {/* Label */}
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6, lineHeight: 1.3 }}>
                {node.label}
              </div>

              {/* Description */}
              {node.description && (
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 6 }}>
                  {node.description}
                </div>
              )}

              {/* Readiness bars */}
              <div className="flex gap-1 mb-2">
                {DIMS.map(dim => (
                  <div key={dim} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: C.border }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(node.readiness[dim] || 0) * 100}%`,
                        background: rColor(node.readiness[dim] || 0),
                      }}
                      title={`${dim}: ${Math.round((node.readiness[dim] || 0) * 100)}%`}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  color: rColor(overallReadiness),
                  background: overallReadiness >= 0.8 ? '#10b98130' : overallReadiness >= 0.5 ? '#f59e0b30' : '#ef444430',
                  fontWeight: 600
                }}>
                  {overallReadiness >= 0.8 ? 'Ready' : overallReadiness >= 0.5 ? 'In Progress' : 'Blocked'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: rColor(overallReadiness), fontFamily: 'monospace' }}>
                  {Math.round(overallReadiness * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Panel */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur rounded-lg p-4 text-white" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>FORGE Workflow</h3>


        <div className="space-y-1">
          <div className="text-xs" style={{ color: C.textMuted }}>Readiness</div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: C.green }} />
            <span className="text-xs" style={{ color: C.text }}>80%+ Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: C.yellow }} />
            <span className="text-xs" style={{ color: C.text }}>50-79% Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: C.red }} />
            <span className="text-xs" style={{ color: C.text }}>&lt;50% Blocked</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t" style={{ borderColor: C.border }}>
          <div className="text-xs mb-2" style={{ color: C.textMuted }}>Controls</div>
          <div className="space-y-1">
            <div className="text-xs" style={{ color: C.text }}>• Drag nodes to move</div>
            <div className="text-xs" style={{ color: C.text }}>• Cmd+Drag to connect nodes</div>
            <div className="text-xs" style={{ color: C.text }}>• Cmd+Click edge to delete</div>
          </div>
        </div>

      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur rounded-lg p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>{selectedNode.label}</h3>

          <div className="space-y-3">
            <div>
              <div className="text-xs mb-1" style={{ color: C.textMuted }}>Type</div>
              <div className="text-sm" style={{ color: NTYPES[selectedNode.type].color }}>
                {NTYPES[selectedNode.type].icon} {NTYPES[selectedNode.type].label}
              </div>
            </div>

            {selectedNode.description && (
              <div>
                <div className="text-xs mb-1" style={{ color: C.textMuted }}>Description</div>
                <div className="text-sm" style={{ color: C.text }}>{selectedNode.description}</div>
              </div>
            )}

            <div>
              <div className="text-xs mb-2" style={{ color: C.textMuted }}>Readiness by Dimension</div>
              <div className="space-y-2">
                {DIMS.map(dim => {
                  const value = selectedNode.readiness[dim] || 0;
                  return (
                    <div key={dim}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: C.text }}>{dim}</span>
                        <span style={{ color: rColor(value) }}>{Math.round(value * 100)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${value * 100}%`, background: rColor(value) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: C.textMuted }}>Release</div>
                <div className="text-sm" style={{ color: C.text }}>{selectedNode.release || 'TBD'}</div>
              </div>
              <div className="flex-1">
                <div className="text-xs mb-1" style={{ color: C.textMuted }}>Sprint</div>
                <div className="text-sm" style={{ color: C.text }}>{selectedNode.sprint || 'Not Scheduled'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}