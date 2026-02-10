'use client';

import { useState, useEffect } from 'react';
import { checkApiHealth, fetchWorkItems, transformWorkItemToNode } from '@/lib/graphApi';
import { useReadinessStore, ReadinessState } from '@/stores/readinessStore';
import { getReadinessData, getConfiguration } from '@/lib/readinessApi';
import ReadinessIndicator from '@/components/ReadinessIndicator';
import NodeReadinessOverlay from '@/components/NodeReadinessOverlay';
import ReadinessPanel from '@/components/ReadinessPanel';

// Updated types for readiness integration
interface GraphNode {
  id: string;
  label: string;
  type: string;
  nodeType?: 'screen' | 'service' | 'component' | 'api' | 'database' | 'other';
  readiness?: ReadinessState;
}

export default function Home() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<string>('Not tested');

  // Readiness store integration
  const {
    readinessData,
    displayMode,
    selectedNodes,
    panelOpen,
    setDisplayMode,
    setPanelOpen,
    loadReadinessData,
    loadConfigurations,
    toggleNodeSelection,
  } = useReadinessStore();

  // Initialize readiness data on component mount
  useEffect(() => {
    initializeReadinessData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeReadinessData = async () => {
    try {
      // Load configurations
      const configs = await getConfiguration();
      loadConfigurations(configs);

      // Load readiness data
      const readinessDataList = await getReadinessData();
      loadReadinessData(readinessDataList);

      // Create sample nodes with readiness data
      const sampleNodes: GraphNode[] = [
        {
          id: 'login-screen',
          label: 'Login Screen',
          type: 'screen',
          nodeType: 'screen',
        },
        {
          id: 'user-api',
          label: 'User API Service',
          type: 'service',
          nodeType: 'service',
        },
        {
          id: 'auth-component',
          label: 'Auth Component',
          type: 'component',
          nodeType: 'component',
        },
        {
          id: 'database-users',
          label: 'Users Database',
          type: 'database',
          nodeType: 'database',
        },
      ];

      // Generate readiness data for sample nodes if not exists
      const missingReadiness: ReadinessState[] = [];
      for (const node of sampleNodes) {
        if (!readinessDataList.find(r => r.nodeId === node.id)) {
          missingReadiness.push({
            nodeId: node.id,
            design: Math.floor(Math.random() * 101),
            backend: Math.floor(Math.random() * 101),
            frontend: Math.floor(Math.random() * 101),
            integration: Math.floor(Math.random() * 101),
            test: Math.floor(Math.random() * 101),
            deployment: Math.floor(Math.random() * 101),
          });
        }
      }

      if (missingReadiness.length > 0) {
        loadReadinessData([...readinessDataList, ...missingReadiness]);
      }

      setNodes(sampleNodes);
    } catch (error) {
      console.error('Failed to initialize readiness data:', error);
      // Fallback to sample data
      initializeSampleData();
    }
  };

  const initializeSampleData = () => {
    const sampleNodes: GraphNode[] = [
      {
        id: 'sample-1',
        label: 'Sample Screen',
        type: 'screen',
        nodeType: 'screen',
      },
      {
        id: 'sample-2',
        label: 'Sample Service',
        type: 'service',
        nodeType: 'service',
      },
    ];

    const sampleReadiness: ReadinessState[] = [
      {
        nodeId: 'sample-1',
        design: 100,
        backend: 60,
        frontend: 40,
        integration: 20,
        test: 0,
        deployment: 0,
      },
      {
        nodeId: 'sample-2',
        design: 80,
        backend: 100,
        frontend: 0,
        integration: 0,
        test: 0,
        deployment: 0,
      },
    ];

    setNodes(sampleNodes);
    loadReadinessData(sampleReadiness);
  };

  // Enhanced node addition function
  const addNode = () => {
    const newId = `node-${Date.now()}`;
    const nodeTypes: GraphNode['nodeType'][] = ['screen', 'service', 'component', 'api', 'database'];
    const randomNodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];

    const newNode: GraphNode = {
      id: newId,
      label: `New ${randomNodeType}`,
      type: randomNodeType || 'other',
      nodeType: randomNodeType,
    };

    // Add node with initial readiness
    const newReadiness: ReadinessState = {
      nodeId: newId,
      design: 0,
      backend: 0,
      frontend: 0,
      integration: 0,
      test: 0,
      deployment: 0,
    };

    setNodes(prev => [...prev, newNode]);
    loadReadinessData([...Array.from(readinessData.values()), newReadiness]);
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
            {/* Readiness Summary */}
            <div className="flex items-center gap-2 text-xs">
              <span>Total Readiness:</span>
              <ReadinessIndicator
                readiness={{
                  nodeId: 'summary',
                  design: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.design, 0) / Math.max(readinessData.size, 1)),
                  backend: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.backend, 0) / Math.max(readinessData.size, 1)),
                  frontend: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.frontend, 0) / Math.max(readinessData.size, 1)),
                  integration: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.integration, 0) / Math.max(readinessData.size, 1)),
                  test: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.test, 0) / Math.max(readinessData.size, 1)),
                  deployment: Math.round(Array.from(readinessData.values()).reduce((acc, r) => acc + r.deployment, 0) / Math.max(readinessData.size, 1)),
                }}
                variant="small"
                displayMode={displayMode}
                showHover={false}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* Display Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-gray-600">View:</label>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as 'percentage' | 'states')}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="percentage">Percentage</option>
              <option value="states">States</option>
            </select>
          </div>

          <button
            onClick={addNode}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Add Node
          </button>

          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm"
            disabled={selectedNodes.size === 0}
          >
            Readiness Panel {selectedNodes.size > 0 && `(${selectedNodes.size})`}
          </button>

          <button
            onClick={loadApiData}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
          >
            {loading ? 'Loading...' : 'Load API Data'}
          </button>

          <div className="text-gray-500">
            Nodes: {nodes.length} | Selected: {selectedNodes.size} | API: {apiStatus}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4 relative">
        <div className="w-full h-full cursor-grab bg-gray-50 border border-gray-200 rounded-lg overflow-hidden relative">
          {/* Enhanced node visualization with readiness overlays */}
          {nodes.map((node, index) => {
            const nodeReadiness = readinessData.get(node.id);
            const isSelected = selectedNodes.has(node.id);

            return (
              <div
                key={node.id}
                className={`absolute bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' : 'border-gray-300'
                } ${node.nodeType === 'screen' ? 'border-blue-300 bg-blue-50' : ''}
                ${node.nodeType === 'service' ? 'border-green-300 bg-green-50' : ''}
                ${node.nodeType === 'component' ? 'border-purple-300 bg-purple-50' : ''}
                ${node.nodeType === 'api' ? 'border-orange-300 bg-orange-50' : ''}
                ${node.nodeType === 'database' ? 'border-gray-400 bg-gray-50' : ''}`}
                style={{
                  left: 50 + (index % 4) * 250,
                  top: 50 + Math.floor(index / 4) * 150,
                  minWidth: '200px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNodeSelection(node.id);
                }}
              >
                <div className="font-medium text-sm text-gray-800">{node.label}</div>
                <div className="text-xs text-gray-600 mt-1">ID: {node.id}</div>
                <div className="text-xs text-gray-600">Type: {node.nodeType || node.type}</div>

                {/* Readiness Overlay */}
                {nodeReadiness && (
                  <NodeReadinessOverlay
                    nodeId={node.id}
                    nodeType={node.nodeType}
                    position="top-right"
                    onOpenForm={(nodeId) => {
                      toggleNodeSelection(nodeId);
                      setPanelOpen(true);
                    }}
                  />
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -inset-1 border-2 border-blue-500 rounded-lg pointer-events-none"></div>
                )}
              </div>
            );
          })}

          {/* Instructions overlay */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-medium mb-2">Welcome to FORGE</h3>
                <p className="text-sm mb-4">Click &ldquo;Add Node&rdquo; to start building your dependency graph</p>
                <p className="text-xs">Nodes will show readiness indicators once added</p>
              </div>
            </div>
          )}

          {/* Debug info */}
          <div className="absolute bottom-4 left-4 text-xs text-gray-400 bg-white px-2 py-1 rounded border">
            Debug: {nodes.length} nodes | {readinessData.size} readiness entries
          </div>
        </div>

        {/* Readiness Panel */}
        <ReadinessPanel onClose={() => setPanelOpen(false)} />
      </main>
    </div>
  );
}