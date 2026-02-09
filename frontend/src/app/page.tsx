'use client';

import { useState } from 'react';
import { checkApiHealth, fetchWorkItems, transformWorkItemToNode } from '@/lib/graphApi';

// Simple types for debugging - extend to match API data
interface GraphNode {
  id: string;
  label: string;
  type: string;
  readiness?: {
    requirements: boolean;
    design: boolean;
    frontend: boolean;
    backend: boolean;
    integration: boolean;
    test: boolean;
  };
}

export default function Home() {
  // Simple state - no useEffect yet
  const [nodes, setNodes] = useState<GraphNode[]>([
    { id: '1', label: 'Sample Node', type: 'task' }
  ]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('Not tested');

  // Safe node addition function
  const addNode = () => {
    const newId = (nodes.length + 1).toString();
    setNodes(prev => [...prev, {
      id: newId,
      label: `Node ${newId}`,
      type: Math.random() > 0.5 ? 'task' : 'feature'
    }]);
  };

  // Manual API data load function - NO automatic useEffect
  const loadApiData = async () => {
    setLoading(true);
    setApiStatus('Testing...');

    try {
      // Step 1: Check API health
      const isHealthy = await checkApiHealth();
      if (!isHealthy) {
        setApiStatus('API Offline');
        return;
      }

      setApiStatus('Connected');

      // Step 2: Fetch work items safely
      const response = await fetchWorkItems({ limit: 10 });
      const apiNodes = response.data.map(transformWorkItemToNode);

      // Debug: Log the data we received
      console.log('API Response:', response);
      console.log('Transformed nodes:', apiNodes);

      // Step 3: Update state safely
      setNodes(apiNodes);
      setApiStatus(`Loaded ${apiNodes.length} items from backend`);

    } catch (error) {
      setApiStatus(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FORGE - Graph Canvas</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Interactive work item dependency visualization</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>System Ready</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={addNode}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Add Node
          </button>
          <button
            onClick={loadApiData}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
          >
            {loading ? 'Loading...' : 'Load API Data'}
          </button>
          <div className="text-gray-500">
            Nodes: {nodes.length} | API: {apiStatus}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4 relative">
        <div className="w-full h-full cursor-grab bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative">
          {/* Enhanced node visualization */}
          {nodes.map((node, index) => (
            <div
              key={node.id}
              className="absolute bg-blue-100 border border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              style={{
                left: 50 + index * 200,
                top: 50 + index * 100,
                minWidth: '180px',
              }}
            >
              <div className="font-medium text-sm text-gray-800">{node.label}</div>
              <div className="text-xs text-gray-600 mt-1">ID: {node.id.slice(0, 8)}...</div>
              <div className="text-xs text-gray-600">Type: {node.type}</div>

              {/* Show readiness if available (API data) */}
              {node.readiness && (
                <div className="mt-2 text-xs">
                  <div className="font-medium text-gray-700">Readiness:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(node.readiness).map(([key, value]) => (
                      <span
                        key={key}
                        className={`px-1 py-0.5 rounded text-xs ${
                          value ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {key.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Debug info */}
          <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
            Debug: {nodes.length} nodes rendered successfully
          </div>
        </div>
      </main>
    </div>
  );
}