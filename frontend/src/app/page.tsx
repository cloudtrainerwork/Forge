'use client';

import { useState, useEffect, useCallback } from 'react';
import GraphCanvas from '@/components/GraphCanvas';
import GraphCanvasErrorBoundary from '@/components/GraphCanvasErrorBoundary';
import { NodeCreationPanel } from '@/components/NodeCreation';
import { RelationshipPanel } from '@/components/RelationshipPanel';
import {
  RelationshipEdge,
  CreateNodeRequest,
  CreateRelationshipRequest,
} from '@/lib/graphTypes';
import {
  fetchWorkItems,
  transformWorkItemToNode,
  checkApiHealth,
  createWorkItem,
  createDependency,
  ApiError,
  NetworkError
} from '@/lib/graphApi';
import { useNodeSelection } from '@/hooks/useGraphInteractions';

export default function Home() {
  // Graph state management
  const { state: graphState, actions: graphActions } = useNodeSelection();

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Creation state
  const [showNodeCreation, setShowNodeCreation] = useState(false);
  const [nodeCreationPosition, setNodeCreationPosition] = useState<{ x: number; y: number } | null>(null);
  const [showRelationshipPanel, setShowRelationshipPanel] = useState(false);

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
          const sampleNodes = [
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
          ];

          const sampleEdges = [
            {
              id: 'sample-edge-1',
              source: 'sample-2',
              target: 'sample-1',
              type: 'requires' as const,
              label: 'requires database'
            },
            {
              id: 'sample-edge-2',
              source: 'sample-2',
              target: 'sample-3',
              type: 'feeds-into' as const,
              label: 'enables API'
            }
          ];

          graphActions.updateNodes(sampleNodes);
          graphActions.updateEdges(sampleEdges);

          return;
        }

        // Load actual work items from backend
        const response = await fetchWorkItems({
          limit: 50, // Start with reasonable limit
        });

        // Transform backend data to graph nodes
        const transformedNodes = response.data.map(transformWorkItemToNode);
        graphActions.updateNodes(transformedNodes);

        // For now, set empty edges since we're focusing on nodes
        // Future: Load actual dependency relationships
        graphActions.updateEdges([]);

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
        graphActions.updateNodes([
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
        graphActions.updateEdges([]);

      } finally {
        setLoading(false);
      }
    }

    loadWorkItems();
  }, [graphActions]);

  // Event handlers for graph interactions
  const handleCanvasClick = useCallback((position: { x: number; y: number }) => {
    if (graphState.isCreatingEdge) {
      // Cancel edge creation on canvas click
      graphActions.cancelEdgeCreation();
      setShowRelationshipPanel(false);
    } else {
      // Start node creation
      setNodeCreationPosition(position);
      setShowNodeCreation(true);
      graphActions.setCreationMode('node');
    }
  }, [graphState.isCreatingEdge, graphActions]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (graphState.isCreatingEdge && graphState.sourceNodeId) {
      // Complete edge creation
      if (nodeId !== graphState.sourceNodeId) {
        setShowRelationshipPanel(true);
      }
    } else {
      // Start edge creation or select node
      graphActions.setSelectedNode(nodeId);
      graphActions.startEdgeCreation(nodeId);
      setShowRelationshipPanel(true);
    }
  }, [graphState.isCreatingEdge, graphState.sourceNodeId, graphActions]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    graphActions.setSelectedNode(nodeId);
    console.log('Node selected:', nodeId);

    // Log node details for debugging
    const selectedNode = graphState.nodes.find(node => node.id === nodeId);
    if (selectedNode) {
      console.log('Selected node details:', selectedNode);
    }
  }, [graphActions, graphState.nodes]);

  // Node creation handler
  const handleCreateNode = useCallback(async (request: CreateNodeRequest) => {
    try {
      const workItemRequest = {
        title: request.label,
        description: request.description,
        spec: {
          type: request.type,
          position: request.position,
        },
      };

      const response = await createWorkItem(workItemRequest);
      const newNode = transformWorkItemToNode(response.data);

      graphActions.addNode(newNode);
      setShowNodeCreation(false);
      setNodeCreationPosition(null);
      graphActions.setCreationMode('none');

      console.log('Created new node:', newNode);
    } catch (error) {
      console.error('Failed to create node:', error);
      throw error;
    }
  }, [graphActions]);

  // Relationship creation handler
  const handleCreateRelationship = useCallback(async (request: CreateRelationshipRequest) => {
    try {
      const dependencyRequest = {
        toWorkItemId: request.targetNodeId,
        relationshipType: request.type,
        properties: { label: request.label },
      };

      const response = await createDependency(request.sourceNodeId, dependencyRequest);

      const newEdge: RelationshipEdge = {
        id: response.data.relationshipId,
        source: request.sourceNodeId,
        target: request.targetNodeId,
        type: request.type,
        label: request.label,
      };

      graphActions.addEdge(newEdge);
      setShowRelationshipPanel(false);
      graphActions.cancelEdgeCreation();

      console.log('Created new relationship:', newEdge);
    } catch (error) {
      console.error('Failed to create relationship:', error);
      throw error;
    }
  }, [graphActions]);

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
          {graphState.selectedNodeId && (
            <div className="text-gray-600">
              Selected: <span className="font-medium">{graphState.selectedNodeId}</span>
            </div>
          )}
          {graphState.isCreatingEdge && (
            <div className="text-blue-600 bg-blue-50 px-3 py-1 rounded">
              Creating relationship from: {graphState.sourceNodeId}
            </div>
          )}
          <div className="text-gray-500">
            Nodes: {graphState.nodes.length} | Edges: {graphState.edges.length}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 p-4 relative">
        <GraphCanvasErrorBoundary>
          <GraphCanvas
            nodes={graphState.nodes}
            edges={graphState.edges}
            onNodeSelect={handleNodeSelect}
            onCanvasClick={handleCanvasClick}
            onNodeClick={handleNodeClick}
            selectedNodeId={graphState.selectedNodeId}
            isCreatingEdge={graphState.isCreatingEdge}
            className="w-full h-full"
          />
        </GraphCanvasErrorBoundary>

        {/* Node Creation Panel */}
        <NodeCreationPanel
          isVisible={showNodeCreation}
          position={nodeCreationPosition || undefined}
          onCreateNode={handleCreateNode}
          onCancel={() => {
            setShowNodeCreation(false);
            setNodeCreationPosition(null);
            graphActions.setCreationMode('none');
          }}
        />

        {/* Relationship Creation Panel */}
        <RelationshipPanel
          isVisible={showRelationshipPanel && graphState.sourceNodeId !== null}
          sourceNodeId={graphState.sourceNodeId}
          sourceNodeLabel={
            graphState.sourceNodeId
              ? graphState.nodes.find(n => n.id === graphState.sourceNodeId)?.label
              : undefined
          }
          availableTargets={graphState.nodes
            .filter(node => node.id !== graphState.sourceNodeId)
            .map(node => ({ id: node.id, label: node.label }))
          }
          onCreateRelationship={handleCreateRelationship}
          onCancel={() => {
            setShowRelationshipPanel(false);
            graphActions.cancelEdgeCreation();
          }}
        />
      </main>
    </div>
  );
}
