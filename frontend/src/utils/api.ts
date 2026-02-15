// API utility functions for the FORGE system
import { Node, Edge } from 'reactflow';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Error types for better error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  constructor(message: string = 'Network connection failed') {
    super(message, undefined, 'NETWORK_ERROR', true);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR', false);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

export class ServerError extends APIError {
  constructor(message: string = 'Server error occurred') {
    super(message, 500, 'SERVER_ERROR', true);
    this.name = 'ServerError';
  }
}

// Enhanced fetch with timeout and error handling
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }
      if (error.message.includes('fetch')) {
        throw new NetworkError('Network connection failed');
      }
    }

    throw error;
  }
}

// Categorize HTTP errors
function createAPIError(response: Response, message?: string): APIError {
  const status = response.status;
  const statusText = response.statusText;
  const defaultMessage = message || `HTTP ${status}: ${statusText}`;

  switch (true) {
    case status === 400:
      return new ValidationError(defaultMessage);
    case status === 401:
      return new AuthenticationError(defaultMessage);
    case status === 403:
      return new APIError('Access forbidden', status, 'FORBIDDEN_ERROR', false);
    case status === 404:
      return new APIError('Resource not found', status, 'NOT_FOUND_ERROR', false);
    case status >= 500:
      return new ServerError(defaultMessage);
    case status >= 400:
      return new APIError(defaultMessage, status, 'CLIENT_ERROR', false);
    default:
      return new APIError(defaultMessage, status, 'UNKNOWN_ERROR', true);
  }
}

// Enhanced API call with retry logic and error handling
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = createAPIError(response);

      // Try to get error details from response body
      try {
        const errorBody = await response.text();
        if (errorBody) {
          const parsed = JSON.parse(errorBody);
          if (parsed.message) {
            error.message = parsed.message;
          }
          if (parsed.details && error instanceof ValidationError) {
            error.details = parsed.details;
          }
        }
      } catch {
        // Ignore JSON parsing errors for error details
      }

      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Retry logic for retryable errors
    if (error instanceof APIError && error.retryable && retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
      console.log(`Retrying API call to ${endpoint} after ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return apiCall<T>(endpoint, options, retryCount + 1);
    }

    throw error;
  }
}

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

    const errors: APIError[] = [];
    const createdItems = new Set<string>();

    // First, try to create or update each work item
    for (const item of workItems) {
      try {
        // First, try to check if the item exists by updating its position
        try {
          await apiCall(`/work-items/${item.id}/position`, {
            method: 'PUT',
            body: JSON.stringify({
              x: item.x,
              y: item.y,
            }),
          });
        } catch (positionError) {
          // If we get a 404, the item doesn't exist - create it
          if (positionError instanceof APIError && positionError.status === 404) {
            // Create the work item
            await apiCall('/work-items', {
              method: 'POST',
              body: JSON.stringify({
                id: item.id,
                title: item.label,
                description: item.notes || '',
                type: item.type || 'task',
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
                confidence: item.state || 'low',
              }),
            });
            createdItems.add(item.id);
            console.log(`Created new work item: ${item.id}`);
          } else {
            throw positionError;
          }
        }
      } catch (error) {
        if (error instanceof APIError) {
          // Ignore 409 conflicts (item already exists)
          if (error.status !== 409) {
            errors.push(error);
            console.error(`Failed to save work item ${item.id}:`, error.message);
          }
        } else {
          errors.push(new APIError(`Failed to save item ${item.id}: ${error}`));
        }
      }
    }

    // If we have critical errors, throw
    if (errors.length > 0 && errors.some(e => !e.retryable && e.status !== 409)) {
      throw new APIError(`Failed to save ${errors.length} work items`);
    }

    if (createdItems.size > 0) {
      console.log(`Successfully created ${createdItems.size} new work items`);
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to save work items');
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

    const errors: APIError[] = [];

    // Save new dependencies using the enhanced API calls
    for (const dependency of dependencies) {
      try {
        await apiCall('/dependencies', {
          method: 'POST',
          body: JSON.stringify({
            from: dependency.source,
            to: dependency.target,
            type: dependency.type || 'requires',
          }),
        });
        console.log(`Created dependency: ${dependency.source} -> ${dependency.target}`);
      } catch (error) {
        if (error instanceof APIError) {
          // For 409 (conflict) errors, dependency might already exist - that's fine
          // For 400 errors, nodes might not exist yet - log but don't fail
          if (error.status === 409) {
            console.log(`Dependency already exists: ${dependency.source} -> ${dependency.target}`);
          } else if (error.status === 400) {
            console.warn(`Could not create dependency ${dependency.source} -> ${dependency.target}: Nodes may not exist in backend yet`);
            // Don't add to errors for 400 as nodes might be created later
          } else {
            errors.push(error);
            console.error(`Failed to create dependency ${dependency.source} -> ${dependency.target}:`, error.message);
          }
        } else {
          errors.push(new APIError(`Failed to create dependency ${dependency.source} -> ${dependency.target}: ${error}`));
        }
      }
    }

    // If we have critical errors, throw
    if (errors.length > 0 && errors.some(e => !e.retryable && e.status !== 409)) {
      throw new APIError(`Failed to save ${errors.length} dependencies`);
    }
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to save dependencies');
  }
}

// Load work items for a specific screen and return as ReactFlow nodes
export async function loadWorkItems(screenId: string): Promise<Node[]> {
  try {
    // For now, load all work items since we don't have screen filtering in the mock backend
    const result = await apiCall<{ data?: any[] }>('/work-items');
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
    if (error instanceof APIError) {
      console.error('Failed to load work items:', error.message);
      // For network errors, return empty array to allow offline usage
      if (error instanceof NetworkError) {
        return [];
      }
      throw error;
    }
    console.error('Error loading work items:', error);
    return [];
  }
}

// Load dependencies for a specific screen and return as ReactFlow edges
export async function loadDependencies(screenId: string): Promise<Edge[]> {
  try {
    // For now, load all dependencies since we don't have screen filtering in the mock backend
    const result = await apiCall<{ data?: any[] }>('/dependencies');
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
    if (error instanceof APIError) {
      console.error('Failed to load dependencies:', error.message);
      // For network errors, return empty array to allow offline usage
      if (error instanceof NetworkError) {
        return [];
      }
      throw error;
    }
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
    // Save work items first, then dependencies
    // This ensures nodes exist before creating dependencies between them
    await saveWorkItems(screenId, nodes);
    await saveDependencies(screenId, edges);
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