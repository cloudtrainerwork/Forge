'use client';

import React, { useCallback, useState } from 'react';
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
  Panel,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom node types for different workflow components
const nodeTypes = {
  screen: ScreenNode,
  service: ServiceNode,
  database: DatabaseNode,
  component: ComponentNode,
  api: ApiNode,
};

// Node type definitions with readiness metadata
interface WorkflowNodeData {
  label: string;
  type: 'screen' | 'service' | 'database' | 'component' | 'api';
  readiness?: {
    requirements: number;
    design: number;
    frontend: number;
    backend: number;
    integration: number;
    test: number;
  };
  status?: 'committed' | 'bubble' | 'deferred';
  description?: string;
}

// Custom node component for screens
function ScreenNode({ data }: { data: WorkflowNodeData }) {
  const readinessScore = data.readiness ?
    Math.round(Object.values(data.readiness).reduce((a, b) => a + b, 0) / 6) : 0;

  return (
    <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-purple-600 text-xs font-medium">SCREEN</div>
        <div className={`text-xs px-2 py-1 rounded ${
          readinessScore >= 80 ? 'bg-green-100 text-green-700' :
          readinessScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {readinessScore}%
        </div>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-600 mt-1">{data.description}</div>
      )}
      <div className="mt-2 flex gap-1">
        {data.readiness && Object.entries(data.readiness).map(([key, value]) => (
          <div
            key={key}
            className="w-4 h-4 rounded-sm"
            style={{
              backgroundColor: value >= 80 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444',
              opacity: value / 100,
            }}
            title={`${key}: ${value}%`}
          />
        ))}
      </div>
    </div>
  );
}

// Custom node component for services
function ServiceNode({ data }: { data: WorkflowNodeData }) {
  const readinessScore = data.readiness ?
    Math.round(Object.values(data.readiness).reduce((a, b) => a + b, 0) / 6) : 0;

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-blue-600 text-xs font-medium">SERVICE</div>
        <div className={`text-xs px-2 py-1 rounded ${
          readinessScore >= 80 ? 'bg-green-100 text-green-700' :
          readinessScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {readinessScore}%
        </div>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-600 mt-1">{data.description}</div>
      )}
      <div className="mt-2 flex gap-1">
        {data.readiness && Object.entries(data.readiness).map(([key, value]) => (
          <div
            key={key}
            className="w-4 h-4 rounded-sm"
            style={{
              backgroundColor: value >= 80 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444',
              opacity: value / 100,
            }}
            title={`${key}: ${value}%`}
          />
        ))}
      </div>
    </div>
  );
}

// Custom node component for databases
function DatabaseNode({ data }: { data: WorkflowNodeData }) {
  const readinessScore = data.readiness ?
    Math.round(Object.values(data.readiness).reduce((a, b) => a + b, 0) / 6) : 0;

  return (
    <div className="bg-gray-50 border-2 border-gray-400 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-600 text-xs font-medium">DATABASE</div>
        <div className={`text-xs px-2 py-1 rounded ${
          readinessScore >= 80 ? 'bg-green-100 text-green-700' :
          readinessScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {readinessScore}%
        </div>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-600 mt-1">{data.description}</div>
      )}
    </div>
  );
}

// Custom node component for components
function ComponentNode({ data }: { data: WorkflowNodeData }) {
  const readinessScore = data.readiness ?
    Math.round(Object.values(data.readiness).reduce((a, b) => a + b, 0) / 6) : 0;

  return (
    <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-green-600 text-xs font-medium">COMPONENT</div>
        <div className={`text-xs px-2 py-1 rounded ${
          readinessScore >= 80 ? 'bg-green-100 text-green-700' :
          readinessScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {readinessScore}%
        </div>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-600 mt-1">{data.description}</div>
      )}
    </div>
  );
}

// Custom node component for APIs
function ApiNode({ data }: { data: WorkflowNodeData }) {
  const readinessScore = data.readiness ?
    Math.round(Object.values(data.readiness).reduce((a, b) => a + b, 0) / 6) : 0;

  return (
    <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-orange-600 text-xs font-medium">API</div>
        <div className={`text-xs px-2 py-1 rounded ${
          readinessScore >= 80 ? 'bg-green-100 text-green-700' :
          readinessScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {readinessScore}%
        </div>
      </div>
      <div className="font-medium text-gray-900">{data.label}</div>
      {data.description && (
        <div className="text-xs text-gray-600 mt-1">{data.description}</div>
      )}
    </div>
  );
}

// Sample workflow data - ePayment system from screenshots
const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'login-screen',
    type: 'screen',
    position: { x: 100, y: 100 },
    data: {
      label: 'Login Screen',
      type: 'screen',
      description: 'Member authentication',
      readiness: {
        requirements: 100,
        design: 100,
        frontend: 80,
        backend: 60,
        integration: 40,
        test: 20,
      },
    },
  },
  {
    id: 'balance-due-screen',
    type: 'screen',
    position: { x: 100, y: 250 },
    data: {
      label: 'Balance Due',
      type: 'screen',
      description: 'Shows payment amount',
      readiness: {
        requirements: 100,
        design: 100,
        frontend: 60,
        backend: 40,
        integration: 20,
        test: 0,
      },
    },
  },
  {
    id: 'payment-entry-screen',
    type: 'screen',
    position: { x: 100, y: 400 },
    data: {
      label: 'Payment Entry',
      type: 'screen',
      description: 'CC/ACH form',
      readiness: {
        requirements: 100,
        design: 80,
        frontend: 40,
        backend: 20,
        integration: 0,
        test: 0,
      },
    },
  },
  {
    id: 'auth-service',
    type: 'service',
    position: { x: 400, y: 100 },
    data: {
      label: 'Auth Service',
      type: 'service',
      description: 'SiteMinder integration',
      readiness: {
        requirements: 100,
        design: 100,
        frontend: 0,
        backend: 80,
        integration: 60,
        test: 40,
      },
    },
  },
  {
    id: 'billing-service',
    type: 'service',
    position: { x: 400, y: 250 },
    data: {
      label: 'Billing Service',
      type: 'service',
      description: 'Facets real-time API',
      readiness: {
        requirements: 100,
        design: 60,
        frontend: 0,
        backend: 40,
        integration: 20,
        test: 0,
      },
    },
  },
  {
    id: 'payment-service',
    type: 'service',
    position: { x: 400, y: 400 },
    data: {
      label: 'Payment Service',
      type: 'service',
      description: 'Process CC/ACH',
      readiness: {
        requirements: 80,
        design: 40,
        frontend: 0,
        backend: 20,
        integration: 0,
        test: 0,
      },
    },
  },
  {
    id: 'user-db',
    type: 'database',
    position: { x: 700, y: 100 },
    data: {
      label: 'User Database',
      type: 'database',
      description: 'Member profiles',
      readiness: {
        requirements: 100,
        design: 100,
        frontend: 0,
        backend: 100,
        integration: 100,
        test: 80,
      },
    },
  },
  {
    id: 'payment-db',
    type: 'database',
    position: { x: 700, y: 400 },
    data: {
      label: 'Payment Database',
      type: 'database',
      description: 'Transaction history',
      readiness: {
        requirements: 100,
        design: 80,
        frontend: 0,
        backend: 60,
        integration: 40,
        test: 20,
      },
    },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'login-screen', target: 'auth-service', animated: true },
  { id: 'e2', source: 'auth-service', target: 'user-db' },
  { id: 'e3', source: 'balance-due-screen', target: 'billing-service', animated: true },
  { id: 'e4', source: 'payment-entry-screen', target: 'payment-service', animated: true },
  { id: 'e5', source: 'payment-service', target: 'payment-db' },
  { id: 'e6', source: 'billing-service', target: 'payment-service', style: { strokeDasharray: '5 5' } },
];

export default function WorkflowDiagram() {
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-left">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-2">ePayment Workflow</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Ready (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>In Progress (40-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Not Started (&lt;40%)</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}