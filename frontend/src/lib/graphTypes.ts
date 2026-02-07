/**
 * TypeScript definitions for graph elements
 * Provides type-safe interfaces for work items, relationships, and graph interactions
 */

export interface WorkItemNode {
  id: string;
  label: string;
  type: string;
  readiness: {
    requirements: boolean;
    design: boolean;
    frontend: boolean;
    backend: boolean;
    integration: boolean;
    test: boolean;
  };
  position?: {
    x: number;
    y: number;
  };
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
}

export type RelationshipType =
  | 'blocks'
  | 'requires'
  | 'feeds-into'
  | 'tested-by'
  | 'deployed-with';

export interface CreateNodeRequest {
  label: string;
  description?: string;
  type: string;
  position?: {
    x: number;
    y: number;
  };
}

export interface CreateRelationshipRequest {
  sourceNodeId: string;
  targetNodeId: string;
  type: RelationshipType;
  label?: string;
}

export interface GraphState {
  nodes: WorkItemNode[];
  edges: RelationshipEdge[];
  selectedNodeId: string | null;
  isCreatingEdge: boolean;
  sourceNodeId: string | null;
  creationMode: 'none' | 'node' | 'edge';
}

export interface GraphActions {
  setSelectedNode: (nodeId: string | null) => void;
  addNode: (node: WorkItemNode) => void;
  addEdge: (edge: RelationshipEdge) => void;
  setCreationMode: (mode: GraphState['creationMode']) => void;
  startEdgeCreation: (sourceNodeId: string) => void;
  cancelEdgeCreation: () => void;
  updateNodes: (nodes: WorkItemNode[]) => void;
  updateEdges: (edges: RelationshipEdge[]) => void;
}