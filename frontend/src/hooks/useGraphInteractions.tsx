/**
 * Custom hooks for graph interactions
 * Provides state management and event handlers for graph canvas operations
 */

import { useState, useCallback } from 'react';
import {
  WorkItemNode,
  RelationshipEdge,
  GraphState,
  GraphActions,
  CreateNodeRequest,
  CreateRelationshipRequest,
} from '../lib/graphTypes';
import { createWorkItem, createDependency } from '../lib/graphApi';

export function useNodeSelection(initialNodes: WorkItemNode[] = [], initialEdges: RelationshipEdge[] = []) {
  const [state, setState] = useState<GraphState>({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    isCreatingEdge: false,
    sourceNodeId: null,
    creationMode: 'none',
  });

  const setSelectedNode = useCallback((nodeId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
    }));
  }, []);

  const addNode = useCallback((node: WorkItemNode) => {
    setState(prev => ({
      ...prev,
      nodes: [...prev.nodes, node],
    }));
  }, []);

  const addEdge = useCallback((edge: RelationshipEdge) => {
    setState(prev => ({
      ...prev,
      edges: [...prev.edges, edge],
    }));
  }, []);

  const setCreationMode = useCallback((mode: GraphState['creationMode']) => {
    setState(prev => ({
      ...prev,
      creationMode: mode,
      isCreatingEdge: mode === 'edge',
      sourceNodeId: mode === 'edge' ? prev.sourceNodeId : null,
    }));
  }, []);

  const startEdgeCreation = useCallback((sourceNodeId: string) => {
    setState(prev => ({
      ...prev,
      isCreatingEdge: true,
      sourceNodeId,
      creationMode: 'edge',
      selectedNodeId: sourceNodeId,
    }));
  }, []);

  const cancelEdgeCreation = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCreatingEdge: false,
      sourceNodeId: null,
      creationMode: 'none',
      selectedNodeId: null,
    }));
  }, []);

  const updateNodes = useCallback((nodes: WorkItemNode[]) => {
    setState(prev => ({
      ...prev,
      nodes,
    }));
  }, []);

  const updateEdges = useCallback((edges: RelationshipEdge[]) => {
    setState(prev => ({
      ...prev,
      edges,
    }));
  }, []);

  const actions: GraphActions = {
    setSelectedNode,
    addNode,
    addEdge,
    setCreationMode,
    startEdgeCreation,
    cancelEdgeCreation,
    updateNodes,
    updateEdges,
  };

  return { state, actions };
}

export function useEdgeCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);

  const startCreation = useCallback((nodeId: string) => {
    setSourceNodeId(nodeId);
    setIsCreating(true);
  }, []);

  const cancelCreation = useCallback(() => {
    setSourceNodeId(null);
    setIsCreating(false);
  }, []);

  const completeCreation = useCallback(async (
    targetNodeId: string,
    relationshipType: string,
    label?: string
  ) => {
    if (!sourceNodeId) {
      throw new Error('No source node selected for edge creation');
    }

    const request: CreateRelationshipRequest = {
      sourceNodeId,
      targetNodeId,
      type: relationshipType as any,
      label,
    };

    try {
      // Create dependency relationship via API
      await createDependency(sourceNodeId, {
        toWorkItemId: targetNodeId,
        relationshipType,
        properties: { label },
      });

      // Reset creation state
      setSourceNodeId(null);
      setIsCreating(false);

      return request;
    } catch (error) {
      console.error('Failed to create relationship:', error);
      throw error;
    }
  }, [sourceNodeId]);

  return {
    isCreating,
    sourceNodeId,
    startCreation,
    cancelCreation,
    completeCreation,
  };
}

export function useNodeCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);

  const startCreation = useCallback((position: { x: number; y: number }) => {
    setPendingPosition(position);
    setIsCreating(true);
  }, []);

  const cancelCreation = useCallback(() => {
    setPendingPosition(null);
    setIsCreating(false);
  }, []);

  const completeCreation = useCallback(async (request: CreateNodeRequest) => {
    try {
      const workItemRequest = {
        title: request.label,
        description: request.description,
        spec: {
          type: request.type,
          position: request.position || pendingPosition,
        },
      };

      const response = await createWorkItem(workItemRequest);

      // Reset creation state
      setPendingPosition(null);
      setIsCreating(false);

      return response.data;
    } catch (error) {
      console.error('Failed to create work item:', error);
      throw error;
    }
  }, [pendingPosition]);

  return {
    isCreating,
    pendingPosition,
    startCreation,
    cancelCreation,
    completeCreation,
  };
}