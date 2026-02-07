'use client';

import { useState } from 'react';
import GraphCanvas, { WorkItemNode, WorkItemEdge } from '@/components/GraphCanvas';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Sample data for testing the canvas
  const sampleNodes: WorkItemNode[] = [
    {
      id: 'node1',
      label: 'User Auth',
      type: 'feature',
      readiness: {
        requirements: true,
        design: true,
        frontend: false,
        backend: true,
        integration: false,
        test: false
      }
    },
    {
      id: 'node2',
      label: 'Database Schema',
      type: 'infrastructure',
      readiness: {
        requirements: true,
        design: true,
        frontend: true,
        backend: true,
        integration: true,
        test: false
      }
    },
    {
      id: 'node3',
      label: 'API Endpoints',
      type: 'backend',
      readiness: {
        requirements: true,
        design: false,
        frontend: false,
        backend: false,
        integration: false,
        test: false
      }
    }
  ];

  const sampleEdges: WorkItemEdge[] = [
    {
      id: 'edge1',
      source: 'node2',
      target: 'node1',
      type: 'requires',
      label: 'requires'
    },
    {
      id: 'edge2',
      source: 'node2',
      target: 'node3',
      type: 'feeds-into',
      label: 'feeds into'
    }
  ];

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    console.log('Node selected:', nodeId);
  };

  return (
    <div className="h-screen-safe flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FORGE - Graph Canvas</h1>
          <p className="text-sm text-gray-600">Interactive work item dependency visualization</p>
        </div>
        {selectedNodeId && (
          <div className="text-sm text-gray-600">
            Selected: <span className="font-medium">{selectedNodeId}</span>
          </div>
        )}
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4">
        <GraphCanvas
          nodes={sampleNodes}
          edges={sampleEdges}
          onNodeSelect={handleNodeSelect}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
