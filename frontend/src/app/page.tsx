'use client';

import { useState, useEffect } from 'react';
import GraphCanvas, { WorkItemNode, WorkItemEdge } from '@/components/GraphCanvas';
import {
  fetchWorkItems,
  transformWorkItemToNode,
  checkApiHealth,
  ApiError,
  NetworkError
} from '@/lib/graphApi';

export default function Home() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<WorkItemNode[]>([]);
  const [edges, setEdges] = useState<WorkItemEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Load work items from backend API
  useEffect(() => {
    async function loadWorkItems() {
      setLoading(true);
      setError(null);

      try {
        // First check if API is available
        const healthCheck = await checkApiHealth();
        setApiAvailable(healthCheck);

        if (!healthCheck) {
          // Use sample data if API is not available
          console.warn('Backend API not available, using sample data');
          setNodes([
            {
              id: 'sample-1',
              label: 'User Auth System',
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
              id: 'sample-2',
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
              id: 'sample-3',
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
          ]);

          setEdges([
            {
              id: 'sample-edge-1',
              source: 'sample-2',
              target: 'sample-1',
              type: 'requires',
              label: 'requires database'
            },
            {
              id: 'sample-edge-2',
              source: 'sample-2',
              target: 'sample-3',
              type: 'feeds-into',
              label: 'enables API'
            }
          ]);

          return;
        }

        // Load actual work items from backend
        const response = await fetchWorkItems({
          limit: 50, // Start with reasonable limit
        });

        // Transform backend data to graph nodes
        const transformedNodes = response.data.map(transformWorkItemToNode);
        setNodes(transformedNodes);

        // For now, set empty edges since we're focusing on nodes
        // Future: Load actual dependency relationships
        setEdges([]);

        console.log(`Loaded ${transformedNodes.length} work items from backend`);

      } catch (err) {
        console.error('Failed to load work items:', err);

        if (err instanceof ApiError) {
          setError(`API Error (${err.status}): ${err.message}`);
        } else if (err instanceof NetworkError) {
          setError(`Network Error: ${err.message}`);
        } else {
          setError('Unknown error occurred while loading work items');
        }

        // Fall back to sample data on error
        setNodes([
          {
            id: 'error-fallback',
            label: 'Error Loading Data',
            type: 'error',
            readiness: {
              requirements: false,
              design: false,
              frontend: false,
              backend: false,
              integration: false,
              test: false
            }
          }
        ]);
        setEdges([]);

      } finally {
        setLoading(false);
      }
    }

    loadWorkItems();
  }, []);

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    console.log('Node selected:', nodeId);

    // Log node details for debugging
    const selectedNode = nodes.find(node => node.id === nodeId);
    if (selectedNode) {
      console.log('Selected node details:', selectedNode);
    }
  };

  return (
    <div className="h-screen-safe flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FORGE - Graph Canvas</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Interactive work item dependency visualization</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${apiAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{apiAvailable ? 'API Connected' : 'API Offline'}</span>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {error && (
            <div className="text-red-600 bg-red-50 px-3 py-1 rounded">
              {error}
            </div>
          )}
          {selectedNodeId && (
            <div className="text-gray-600">
              Selected: <span className="font-medium">{selectedNodeId}</span>
            </div>
          )}
          <div className="text-gray-500">
            Nodes: {nodes.length}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4">
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodeSelect={handleNodeSelect}
          className="w-full h-full"
        />
      </main>
    </div>
  );
}
