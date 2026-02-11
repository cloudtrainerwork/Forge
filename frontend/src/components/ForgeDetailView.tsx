'use client';

import React, { useCallback, useState } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import ForgeDetailNode from './ForgeDetailNode';

const nodeTypes = {
  detail: ForgeDetailNode,
};

// FORGE color palette
const C = {
  bg: "#08090d",
  surface: "#111219",
  border: "#1f2235",
  accent: "#f97316",
};

interface ForgeDetailViewProps {
  screenId: string;
  screenName: string;
}

function ForgeDetailFlow({ screenId, screenName }: ForgeDetailViewProps) {
  // Create initial nodes for detailed view (matching screens-e-signature.png pattern)
  const initialNodes: Node[] = [
    // Center main screen node
    {
      id: 'main-screen',
      type: 'detail',
      position: { x: 400, y: 300 },
      data: {
        label: screenName,
        category: 'screen',
        isMain: true
      },
    },

    // UI Components cluster (top right)
    {
      id: 'ui-cluster',
      type: 'detail',
      position: { x: 700, y: 100 },
      data: {
        label: 'UI',
        category: 'ui-group',
        items: []
      },
    },
    {
      id: 'ui-error',
      type: 'detail',
      position: { x: 850, y: 50 },
      data: { label: 'Error Display', category: 'ui' },
    },
    {
      id: 'ui-jump',
      type: 'detail',
      position: { x: 850, y: 120 },
      data: { label: 'Jump to page', category: 'ui' },
    },
    {
      id: 'ui-previous',
      type: 'detail',
      position: { x: 850, y: 190 },
      data: { label: 'Previous', category: 'ui' },
    },

    // WIP/Navigation cluster (bottom right)
    {
      id: 'nav-cluster',
      type: 'detail',
      position: { x: 700, y: 450 },
      data: {
        label: 'WIP/Navigation',
        category: 'navigation-group'
      },
    },
    {
      id: 'nav-section',
      type: 'detail',
      position: { x: 850, y: 420 },
      data: { label: 'Section', category: 'navigation' },
    },
    {
      id: 'nav-jump',
      type: 'detail',
      position: { x: 850, y: 480 },
      data: { label: 'Jump to Page', category: 'navigation' },
    },
    {
      id: 'nav-sign',
      type: 'detail',
      position: { x: 850, y: 540 },
      data: { label: 'Sign CIS', category: 'navigation' },
    },

    // Services cluster (left side)
    {
      id: 'service-cluster',
      type: 'detail',
      position: { x: 50, y: 300 },
      data: {
        label: 'Services',
        category: 'service-group'
      },
    },
    {
      id: 'service-validation',
      type: 'detail',
      position: { x: 50, y: 400 },
      data: { label: 'Save/Validation Application', category: 'service' },
    },
    {
      id: 'service-person',
      type: 'detail',
      position: { x: 50, y: 480 },
      data: { label: 'Create Person', category: 'service' },
    },

    // DTO/Data cluster (bottom left)
    {
      id: 'dto-cluster',
      type: 'detail',
      position: { x: 50, y: 600 },
      data: {
        label: 'DTO',
        category: 'dto-group'
      },
    },
    {
      id: 'dto-error',
      type: 'detail',
      position: { x: 50, y: 680 },
      data: { label: 'Error Messages DTO', category: 'dto' },
    },
    {
      id: 'dto-field',
      type: 'detail',
      position: { x: 50, y: 740 },
      data: { label: 'DTO Field Name', category: 'dto' },
    },

    // Document Management (bottom)
    {
      id: 'doc-mgmt',
      type: 'detail',
      position: { x: 400, y: 600 },
      data: { label: 'Document Management', category: 'integration' },
    },

    // View Models (top)
    {
      id: 'view-model',
      type: 'detail',
      position: { x: 400, y: 50 },
      data: { label: 'View Model', category: 'model' },
    },
    {
      id: 'skeleton',
      type: 'detail',
      position: { x: 250, y: 50 },
      data: { label: 'Skeleton', category: 'model' },
    },
    {
      id: 'device-int',
      type: 'detail',
      position: { x: 550, y: 50 },
      data: { label: 'Device Integration', category: 'integration' },
    },
  ];

  // Create initial edges
  const initialEdges: Edge[] = [
    // From main screen to clusters
    { id: 'e-main-ui', source: 'main-screen', target: 'ui-cluster', type: 'smoothstep' },
    { id: 'e-main-nav', source: 'main-screen', target: 'nav-cluster', type: 'smoothstep' },
    { id: 'e-main-service', source: 'main-screen', target: 'service-cluster', type: 'smoothstep' },
    { id: 'e-main-dto', source: 'main-screen', target: 'dto-cluster', type: 'smoothstep' },
    { id: 'e-main-doc', source: 'main-screen', target: 'doc-mgmt', type: 'smoothstep' },
    { id: 'e-main-view', source: 'main-screen', target: 'view-model', type: 'smoothstep' },
    { id: 'e-main-skeleton', source: 'main-screen', target: 'skeleton', type: 'smoothstep' },
    { id: 'e-main-device', source: 'main-screen', target: 'device-int', type: 'smoothstep' },

    // UI cluster connections
    { id: 'e-ui-error', source: 'ui-cluster', target: 'ui-error', type: 'smoothstep' },
    { id: 'e-ui-jump', source: 'ui-cluster', target: 'ui-jump', type: 'smoothstep' },
    { id: 'e-ui-prev', source: 'ui-cluster', target: 'ui-previous', type: 'smoothstep' },

    // Nav cluster connections
    { id: 'e-nav-section', source: 'nav-cluster', target: 'nav-section', type: 'smoothstep' },
    { id: 'e-nav-jump', source: 'nav-cluster', target: 'nav-jump', type: 'smoothstep' },
    { id: 'e-nav-sign', source: 'nav-cluster', target: 'nav-sign', type: 'smoothstep' },

    // Service connections
    { id: 'e-service-val', source: 'service-cluster', target: 'service-validation', type: 'smoothstep' },
    { id: 'e-service-person', source: 'service-cluster', target: 'service-person', type: 'smoothstep' },

    // DTO connections
    { id: 'e-dto-error', source: 'dto-cluster', target: 'dto-error', type: 'smoothstep' },
    { id: 'e-dto-field', source: 'dto-cluster', target: 'dto-field', type: 'smoothstep' },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      style={{ background: C.bg }}
    >
      <Background color={C.border} />
      <Controls />
      <MiniMap nodeColor={C.accent} />
    </ReactFlow>
  );
}

export default function ForgeDetailView(props: ForgeDetailViewProps) {
  return (
    <ReactFlowProvider>
      <ForgeDetailFlow {...props} />
    </ReactFlowProvider>
  );
}