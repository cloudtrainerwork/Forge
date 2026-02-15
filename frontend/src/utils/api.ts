// API utility functions for the FORGE system
import { Node, Edge } from 'reactflow';

const API_BASE_URL = 'http://localhost:3001/api/v1';

export interface WorkItem {
  id: string;
  label: string;
  type: string;
  description?: string;
  x: number;
  y: number;
  readiness?: {
    requirements?: number;
    design?: number;
    frontend?: number;
    backend?: number;
    integration?: number;
    test?: number;
  };
  state?: string;
  notes?: string;
  templateKey?: string;
  screenId?: string;
}

export interface Dependency {
  id: string;
  source: string;
  target: string;
  type?: string;
  screenId?: string;
}

// ReactFlow transformation functions
export function transformReactFlowToWorkItem(node: Node): WorkItem {
  return {
    id: node.id,
    label: node.data.label || 'Untitled',
    type: node.data.templateKey || 'unknown',
    description: node.data.notes || '',
    x: node.position.x,
    y: node.position.y,
    readiness: node.data.readiness || {
      requirements: 0,
      design: 0,
      frontend: 0,
      backend: 0,
      integration: 0,
      test: 0,
    },
    state: node.data.currentState,
    notes: node.data.notes,
    templateKey: node.data.templateKey,
    screenId: undefined, // Will be set by caller
  };
}

export function transformWorkItemToReactFlow(workItem: WorkItem): Node {
  return {
    id: workItem.id,
    type: 'editable',
    position: { x: workItem.x || 0, y: workItem.y || 0 },
    data: {
      id: workItem.id,
      label: workItem.label,
      templateKey: workItem.templateKey || workItem.type,
      currentState: workItem.state,
      notes: workItem.notes || workItem.description,
      readiness: workItem.readiness,
      onUpdate: (data: any) => {
        // This will be set by the component
        console.log('Node update placeholder:', data);
      },
      onDelete: () => {
        // This will be set by the component
        console.log('Node delete placeholder');
      },
    },
  };
}

export function transformReactFlowToDependency(edge: Edge): Dependency {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'dependency',
    screenId: undefined, // Will be set by caller
  };
}

export function transformDependencyToReactFlowEdge(dependency: Dependency): Edge {
  return {
    id: dependency.id,
    source: dependency.source,
    target: dependency.target,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed' as any,
      color: '#f97316',
    },
  };
}

// Save work items for a specific screen - accepts ReactFlow nodes
export async function saveWorkItems(screenId: string, nodes: Node[]): Promise<void> {
  try {
    // Transform ReactFlow nodes to WorkItems
    const workItems = nodes.map(node => {
      const workItem = transformReactFlowToWorkItem(node);
      workItem.screenId = screenId;
      return workItem;
    });

    // Since we don't have screen-specific endpoints in the mock backend yet,
    // we'll use the basic endpoints for now
    for (const item of workItems) {
      try {
        // Try to update existing item first
        await fetch(`${API_BASE_URL}/work-items/${item.id}/position`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            x: item.x,
            y: item.y,
          }),
        });
      } catch (error) {
        // If update fails, this might be a new item
        console.log(`Could not update position for ${item.id}, may be new item`);
      }
    }
  } catch (error) {
    console.error('Error saving work items:', error);
    throw new Error('Failed to save work items');
  }
}

// Save dependencies for a specific screen - accepts ReactFlow edges
export async function saveDependencies(screenId: string, edges: Edge[]): Promise<void> {
  try {
    // Transform ReactFlow edges to Dependencies
    const dependencies = edges.map(edge => {
      const dependency = transformReactFlowToDependency(edge);
      dependency.screenId = screenId;
      return dependency;
    });

    // Save new dependencies using the mock backend endpoints
    for (const dependency of dependencies) {
      try {
        await fetch(`${API_BASE_URL}/dependencies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: dependency.source,
            to: dependency.target,
            type: dependency.type || 'requires',
          }),
        });
      } catch (error) {
        // Dependency might already exist, continue with others
        console.log(`Could not create dependency ${dependency.source} -> ${dependency.target}:`, error);
      }
    }
  } catch (error) {
    console.error('Error saving dependencies:', error);
    throw new Error('Failed to save dependencies');
  }
}

// Load work items for a specific screen and return as ReactFlow nodes
export async function loadWorkItems(screenId: string): Promise<Node[]> {
  try {
    // For now, load all work items since we don't have screen filtering in the mock backend
    const response = await fetch(`${API_BASE_URL}/work-items`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    const workItems = result.data || [];

    // Transform backend work items to ReactFlow nodes
    return workItems.map((item: any) => {
      const workItem: WorkItem = {
        id: item.id,
        label: item.title,
        type: item.type,
        description: item.description,
        x: item.x,
        y: item.y,
        readiness: item.readiness || {
          requirements: 0,
          design: 0,
          frontend: 0,
          backend: 0,
          integration: 0,
          test: 0,
        },
        state: item.confidence,
        notes: item.description,
        templateKey: item.type?.toLowerCase(),
        screenId,
      };
      return transformWorkItemToReactFlow(workItem);
    });
  } catch (error) {
    console.error('Error loading work items:', error);
    return [];
  }
}

// Load dependencies for a specific screen and return as ReactFlow edges
export async function loadDependencies(screenId: string): Promise<Edge[]> {
  try {
    // For now, load all dependencies since we don't have screen filtering in the mock backend
    const response = await fetch(`${API_BASE_URL}/dependencies`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    const dependencies = result.data || [];

    // Transform backend dependencies to ReactFlow edges
    return dependencies.map((dep: any) => {
      const dependency: Dependency = {
        id: `${dep.from}-${dep.to}`,
        source: dep.from,
        target: dep.to,
        type: dep.type,
        screenId,
      };
      return transformDependencyToReactFlowEdge(dependency);
    });
  } catch (error) {
    console.error('Error loading dependencies:', error);
    return [];
  }
}

// Save both work items and dependencies for a screen
export async function saveScreenData(
  screenId: string,
  nodes: Node[],
  edges: Edge[]
): Promise<void> {
  try {
    // Save both in parallel using the updated functions
    await Promise.all([
      saveWorkItems(screenId, nodes),
      saveDependencies(screenId, edges),
    ]);
  } catch (error) {
    console.error('Error saving screen data:', error);
    throw error;
  }
}

// Load both work items and dependencies for a screen as ReactFlow data
export async function loadScreenData(screenId: string): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  try {
    const [nodes, edges] = await Promise.all([
      loadWorkItems(screenId),
      loadDependencies(screenId),
    ]);

    return { nodes, edges };
  } catch (error) {
    console.error('Error loading screen data:', error);
    return { nodes: [], edges: [] };
  }
}