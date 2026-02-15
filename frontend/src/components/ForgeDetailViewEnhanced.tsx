'use client';

import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowInstance,
  XYPosition,
  MarkerType,
  NodeResizer,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ForgeDetailNodeEditable from './ForgeDetailNodeEditable';
import { NODE_TEMPLATES } from './NodePalette';
import { saveScreenData, loadScreenData } from '../utils/api';

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
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

interface ForgeDetailViewEnhancedProps {
  screenId: string;
  screenName: string;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

// Group node component with editable label and resizable container
const GroupNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editLabel, setEditLabel] = React.useState(data.label);

  // Update local state when data.label changes
  React.useEffect(() => {
    setEditLabel(data.label);
  }, [data.label]);

  const handleSave = () => {
    if (data.onUpdate && editLabel !== data.label) {
      data.onUpdate({ label: editLabel });
    }
    setIsEditing(false);
  };

  return (
    <>
      <NodeResizer
        color={C.accent}
        isVisible={selected}
        minWidth={180}
        minHeight={100}
      />
      <div
        style={{
          padding: '20px',
          background: `${C.surfaceAlt}40`,
          border: `2px dashed ${selected ? C.accent : C.border}`,
          borderRadius: 8,
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
      <div className="text-sm font-medium mb-2" style={{ color: C.textMuted }}>
        <span style={{ marginRight: '8px' }}>📁</span>
        {isEditing ? (
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditLabel(data.label);
                setIsEditing(false);
              }
            }}
            className="px-1 py-0.5 rounded text-sm"
            style={{
              background: C.bg,
              border: `1px solid ${C.accent}`,
              color: C.text,
              outline: 'none',
            }}
            autoFocus
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            style={{ cursor: 'text' }}
            title="Double-click to rename"
          >
            {data.label}
          </span>
        )}
      </div>
      <div className="text-xs" style={{ color: C.textDim }}>
        Drop nodes here to group them together
      </div>
      </div>
    </>
  );
};

// Custom node types that support editing
const nodeTypes = {
  editable: ForgeDetailNodeEditable,
  group: GroupNode,
};

function ForgeDetailFlowEnhanced({ screenId, screenName, onSave }: ForgeDetailViewEnhancedProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  // Create initial nodes - start with just the main screen
  const initialNodes: Node[] = [
    {
      id: 'main-screen',
      type: 'editable',
      position: { x: 400, y: 300 },
      data: {
        id: 'main-screen',
        label: screenName,
        templateKey: 'screen',
        currentState: 'Active',
        isMain: true,
        notes: `Main screen for ${screenName}`,
        onUpdate: (data: any) => handleNodeUpdate('main-screen', data),
        onDelete: () => handleNodeDelete('main-screen'),
      },
    },
  ];

  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);


  // Load existing data when component mounts
  React.useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const screenData = await loadScreenData(screenId);

        if (screenData.nodes.length > 0) {
          // Set real backend data with proper onUpdate and onDelete handlers
          const nodesWithHandlers = screenData.nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              onUpdate: (data: any) => handleNodeUpdate(node.id, data),
              onDelete: () => handleNodeDelete(node.id),
            },
          }));
          setNodes(nodesWithHandlers);
          setEdges(screenData.edges);
        } else {
          // Keep the initial main screen node if no data exists
          console.log('No existing data found, using initial main screen');
        }
      } catch (error) {
        console.error('Failed to load screen data:', error);
        // Keep initial nodes on error
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [screenId]);

  // Handle node updates
  const handleNodeUpdate = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      })
    );
    setUnsavedChanges(true);
  }, [setNodes]);

  // Handle node deletion
  const handleNodeDelete = useCallback((nodeId: string) => {
    if (nodeId === 'main-screen') {
      alert('Cannot delete the main screen node');
      return;
    }
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setUnsavedChanges(true);
  }, [setNodes, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: C.accent, strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: C.accent,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setUnsavedChanges(true);
    },
    [setEdges]
  );

  // Handle edge deletion
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setUnsavedChanges(true);
    }
  }, [setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      setSelectedNodes((prev) => {
        if (prev.includes(node.id)) {
          return prev.filter(id => id !== node.id);
        }
        return [...prev, node.id];
      });
    } else {
      // Single select
      setSelectedNodes([node.id]);
    }

    // Node selection handled by selectedNodes state
  }, []);

  // Handle selection change
  const onSelectionChange = useCallback((elements: { nodes: Node[], edges: Edge[] }) => {
    const nodeIds = elements.nodes.map(n => n.id);
    console.log('Selection changed:', nodeIds);
    setSelectedNodes(nodeIds);
  }, []);

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const templateKey = event.dataTransfer.getData('templateKey');
      if (!templateKey || !NODE_TEMPLATES[templateKey as keyof typeof NODE_TEMPLATES]) {
        return;
      }

      const template = NODE_TEMPLATES[templateKey as keyof typeof NODE_TEMPLATES];
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `node-${Date.now()}-${nodeIdCounter}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'editable',
        position,
        data: {
          id: newNodeId,
          label: `${template.label} ${nodeIdCounter}`,
          templateKey: templateKey as keyof typeof NODE_TEMPLATES,
          currentState: template.defaultState || template.states?.[0],
          customStates: template.states,
          notes: '',
          onUpdate: (data: any) => handleNodeUpdate(newNodeId, data),
          onDelete: () => handleNodeDelete(newNodeId),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setNodeIdCounter((prev) => prev + 1);
      setUnsavedChanges(true);
    },
    [reactFlowInstance, nodeIdCounter, setNodes, handleNodeUpdate, handleNodeDelete]
  );

  // Add node programmatically - functionality available but currently unused in UI
  // Will be integrated with palette functionality in future improvements

  // Save changes
  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      await saveScreenData(screenId, nodes, edges);

      if (onSave) {
        onSave(nodes, edges);
      }

      setUnsavedChanges(false);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [screenId, nodes, edges, onSave]);

  // Clear all (except main)
  const handleClear = useCallback(() => {
    if (confirm('Clear all nodes except the main screen? This cannot be undone.')) {
      setNodes((nds) => nds.filter(node => node.id === 'main-screen'));
      setEdges([]);
      setNodeIdCounter(1);
      setUnsavedChanges(true);
    }
  }, [setNodes, setEdges]);

  // Auto-layout nodes
  const handleAutoLayout = useCallback(() => {
    // Simple radial layout around the main screen
    const mainNode = nodes.find(n => n.id === 'main-screen');
    if (!mainNode) return;

    const otherNodes = nodes.filter(n => n.id !== 'main-screen');
    const angleStep = (2 * Math.PI) / otherNodes.length;
    const radius = 300;

    const updatedNodes = nodes.map((node) => {
      if (node.id === 'main-screen') {
        return { ...node, position: { x: 400, y: 300 } };
      }

      const nodeIndex = otherNodes.findIndex(n => n.id === node.id);
      const angle = nodeIndex * angleStep;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return { ...node, position: { x, y } };
    });

    setNodes(updatedNodes);
    setUnsavedChanges(true);
  }, [nodes, setNodes]);

  // Group selected nodes
  const handleGroupNodes = useCallback(() => {
    if (selectedNodes.length < 2) {
      alert('Select at least 2 nodes to group');
      return;
    }

    const selectedNodeObjects = nodes.filter(n => selectedNodes.includes(n.id));

    // Calculate bounding box of selected nodes
    const minX = Math.min(...selectedNodeObjects.map(n => n.position.x));
    const minY = Math.min(...selectedNodeObjects.map(n => n.position.y));
    const maxX = Math.max(...selectedNodeObjects.map(n => n.position.x + 140)); // approximate node width
    const maxY = Math.max(...selectedNodeObjects.map(n => n.position.y + 80)); // approximate node height

    const groupId = `group-${Date.now()}`;
    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: minX - 20, y: minY - 20 },
      style: {
        width: maxX - minX + 40,
        height: maxY - minY + 40,
      },
      data: {
        label: `Group ${Math.floor(Math.random() * 100)}`,
        onUpdate: (data: any) => handleNodeUpdate(groupId, data),
      },
      resizing: true,
    };

    // Update selected nodes to be children of the group
    const updatedNodes = nodes.map(node => {
      if (selectedNodes.includes(node.id)) {
        return {
          ...node,
          parentId: groupId,
          extent: 'parent' as const,
          position: {
            x: node.position.x - minX + 20,
            y: node.position.y - minY + 20,
          },
        };
      }
      return node;
    });

    setNodes([groupNode, ...updatedNodes]);
    setSelectedNodes([]);
    setUnsavedChanges(true);
  }, [selectedNodes, nodes, setNodes, handleNodeUpdate]);

  // Ungroup selected group
  const handleUngroup = useCallback(() => {
    const groupNode = nodes.find(n => selectedNodes.includes(n.id) && n.type === 'group');
    if (!groupNode) {
      alert('Select a group node to ungroup');
      return;
    }

    // Remove the group node and update child positions

    // Update child nodes to remove parent relationship
    const updatedNodes = nodes.map(node => {
      if (node.parentId === groupNode.id) {
        return {
          ...node,
          parentId: undefined,
          extent: undefined,
          position: {
            x: groupNode.position.x + node.position.x,
            y: groupNode.position.y + node.position.y,
          },
        };
      }
      return node;
    }).filter(n => n.id !== groupNode.id); // Remove the group node

    setNodes(updatedNodes);
    setSelectedNodes([]);
    setUnsavedChanges(true);
  }, [selectedNodes, nodes, setNodes]);

  // Add group node
  const handleAddGroup = useCallback(() => {
    const groupId = `group-${Date.now()}`;
    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 },
      style: {
        width: 250,
        height: 200,
        zIndex: -1, // Groups should be behind other nodes
      },
      data: {
        label: `Group ${Math.floor(Math.random() * 100)}`,
        onUpdate: (data: any) => handleNodeUpdate(groupId, data),
      },
      resizing: true,
    };

    setNodes((nds) => nds.concat(groupNode));
    setUnsavedChanges(true);
  }, [setNodes, handleNodeUpdate]);

  // Handle node drag stop to check for grouping
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node drag stop:', node.id, 'Position:', node.position);

    // Don't group the node if it's already in a group or is a group itself
    if (node.parentId || node.type === 'group') {
      console.log('Skipping grouping - node is already in group or is group itself');
      return;
    }

    // Find if the dragged node is over any group - use current nodes from state
    const groupNodes = nodes.filter(n => n.type === 'group' && n.id !== node.id);
    console.log('Found group nodes:', groupNodes.map(g => ({ id: g.id, pos: g.position, size: g.style })));

    for (const groupNode of groupNodes) {
      const groupBounds = {
        left: groupNode.position.x,
        top: groupNode.position.y,
        right: groupNode.position.x + (groupNode.style?.width as number || 250),
        bottom: groupNode.position.y + (groupNode.style?.height as number || 200),
      };

      // Check if the node center is inside the group bounds
      const nodeCenter = {
        x: node.position.x + 70, // Approximate node width / 2
        y: node.position.y + 40, // Approximate node height / 2
      };

      console.log(`Checking collision - Node center: ${nodeCenter.x}, ${nodeCenter.y} | Group bounds:`, groupBounds);

      if (nodeCenter.x >= groupBounds.left &&
          nodeCenter.x <= groupBounds.right &&
          nodeCenter.y >= groupBounds.top &&
          nodeCenter.y <= groupBounds.bottom) {

        console.log(`✅ Node ${node.id} dropped into group ${groupNode.id}`);

        // Add node to group
        setNodes((nds) => nds.map(n => {
          if (n.id === node.id) {
            return {
              ...n,
              parentId: groupNode.id,
              extent: 'parent' as const,
              position: {
                x: node.position.x - groupNode.position.x,
                y: node.position.y - groupNode.position.y,
              },
            };
          }
          return n;
        }));

        setUnsavedChanges(true);
        break; // Only add to the first group found
      } else {
        console.log(`❌ Node ${node.id} not in group ${groupNode.id}`);
      }
    }
  }, [nodes, setNodes]);

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          setUnsavedChanges(true);
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          setUnsavedChanges(true);
        }}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        style={{ background: C.bg }}
        multiSelectionKeyCode="Meta"
        selectionKeyCode="Meta"
        panOnDrag={true}
      >
        <Background color={C.border} gap={20} />
        <Controls style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }} />
        <MiniMap
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
          nodeColor={C.accent}
          nodeStrokeWidth={1}
          pannable
          zoomable
        />

        {/* Toolbar Panel */}
        <Panel position="top-left" className="p-4" style={{ zIndex: 1000, pointerEvents: 'none' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, pointerEvents: 'auto' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: C.text }}>
              {screenName} - Detail View
            </h3>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: showPalette ? C.accent : C.surfaceAlt,
                  color: showPalette ? 'white' : C.text,
                  border: `1px solid ${showPalette ? C.accent : C.border}`,
                }}
              >
                {showPalette ? '🎨 Hide Palette' : '🎨 Show Palette'}
              </button>

              <button
                onClick={handleAutoLayout}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: C.surfaceAlt,
                  color: C.text,
                  border: `1px solid ${C.border}`,
                }}
              >
                🎯 Auto Layout
              </button>

              <button
                onClick={handleAddGroup}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: C.surfaceAlt,
                  color: C.purple,
                  border: `1px solid ${C.border}`,
                }}
              >
                📁 Add Group
              </button>

              {selectedNodes.length > 1 && (
                <button
                  onClick={handleGroupNodes}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: C.purple,
                    color: 'white',
                    border: `1px solid ${C.purple}`,
                  }}
                >
                  🔗 Group ({selectedNodes.length})
                </button>
              )}

              {selectedNodes.length === 1 && nodes.find(n => selectedNodes.includes(n.id))?.type === 'group' && (
                <button
                  onClick={handleUngroup}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                  style={{
                    background: C.yellow,
                    color: 'white',
                    border: `1px solid ${C.yellow}`,
                  }}
                >
                  💥 Ungroup
                </button>
              )}

              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: C.surfaceAlt,
                  color: C.red,
                  border: `1px solid ${C.border}`,
                }}
              >
                🗑️ Clear All
              </button>

              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: unsavedChanges ? C.green : C.surfaceAlt,
                  color: unsavedChanges ? 'white' : C.textDim,
                  border: `1px solid ${unsavedChanges ? C.green : C.border}`,
                }}
              >
                💾 Save {unsavedChanges && '•'}
              </button>

              {/* Debug Info */}
              {selectedNodes.length > 0 && (
                <div className="mt-2 p-2 rounded text-xs" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.textMuted }}>Selected: {selectedNodes.join(', ')}</div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-4 pt-4 border-t text-xs space-y-1" style={{ borderColor: C.border, color: C.textMuted }}>
              <div>• Drag from palette to add</div>
              <div>• Double-click to edit labels</div>
              <div>• Drag handles to connect</div>
              <div>• Cmd+Click edge to delete</div>
              <div>• Select + Delete key to remove</div>
              <div>• Cmd+Click multiple nodes to group</div>
              <div>• Drop nodes into groups to organize</div>
            </div>
          </div>
        </Panel>

        {/* Node Palette */}
        {showPalette && (
          <Panel position="top-right" className="p-4">
            <div
              className="w-64 max-h-[600px] overflow-y-auto rounded-lg"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
              }}
            >
              <div className="p-3 border-b" style={{ borderColor: C.border }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: C.text }}>
                  Node Library
                </h3>
              </div>

              <div className="p-2">
                {Object.entries(NODE_TEMPLATES).map(([key, template]) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('templateKey', key);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="p-2 mb-1 rounded cursor-pointer transition-all hover:scale-[1.02]"
                    style={{
                      background: C.surfaceAlt,
                      border: `1px solid ${C.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = template.color;
                      e.currentTarget.style.background = C.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.background = C.surfaceAlt;
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: template.color, fontSize: '16px' }}>
                        {template.icon}
                      </span>
                      <span className="text-xs font-medium" style={{ color: C.text }}>
                        {template.label}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {template.states.map((state, i) => (
                        <span
                          key={state}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background: i === 0 ? `${template.color}20` : C.bg,
                            color: i === 0 ? template.color : C.textMuted,
                            border: `1px solid ${i === 0 ? template.color : C.border}`,
                          }}
                        >
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* Status Bar */}
        <Panel position="bottom-left" className="px-4 py-2">
          <div
            className="flex items-center gap-4 text-xs"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: '8px 12px',
              color: C.textMuted
            }}
          >
            <span>{nodes.length} nodes</span>
            <span>•</span>
            <span>{edges.length} connections</span>
            {unsavedChanges && (
              <>
                <span>•</span>
                <span style={{ color: C.yellow }}>Unsaved changes</span>
              </>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function ForgeDetailViewEnhanced(props: ForgeDetailViewEnhancedProps) {
  return (
    <ReactFlowProvider>
      <ForgeDetailFlowEnhanced {...props} />
    </ReactFlowProvider>
  );
}