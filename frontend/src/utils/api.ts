// API utility functions for the FORGE system
import { Node, Edge } from 'reactflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
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

    // Save new dependencies using the enhanced API calls with retry logic
    for (const dependency of dependencies) {
      let retryCount = 0;
      let success = false;

      while (!success && retryCount < 3) {
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
          success = true;
        } catch (error) {
          if (error instanceof APIError) {
            // For 409 (conflict) errors, dependency might already exist - that's fine
            if (error.status === 409) {
              console.log(`Dependency already exists: ${dependency.source} -> ${dependency.target}`);
              success = true;
            } else if (error.status === 400) {
              retryCount++;
              if (retryCount < 3) {
                console.warn(`Retry ${retryCount}/3: Could not create dependency ${dependency.source} -> ${dependency.target}`);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
              } else {
                console.warn(`Failed after 3 attempts: Could not create dependency ${dependency.source} -> ${dependency.target}: Nodes may not exist in backend`);
                // Don't add to errors for 400 as nodes might be created later
                success = true; // Don't retry anymore
              }
            } else {
              errors.push(error);
              console.error(`Failed to create dependency ${dependency.source} -> ${dependency.target}:`, error.message);
              success = true; // Don't retry for other errors
            }
          } else {
            errors.push(new APIError(`Failed to create dependency ${dependency.source} -> ${dependency.target}: ${error}`));
            success = true; // Don't retry for non-API errors
          }
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

    // Small delay to ensure work items are fully persisted before creating dependencies
    if (edges.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      await saveDependencies(screenId, edges);
    }
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

// =====================================
// SPECIFICATION API FUNCTIONS
// =====================================

export interface SpecificationSection {
  content: string;
  status: 'empty' | 'draft' | 'review' | 'complete';
  wordCount: number;
  lastUpdated: string;
}

export interface SpecificationTemplate {
  id: string;
  workItemId: string;
  sections: {
    requirements: SpecificationSection;
    design: SpecificationSection;
    frontend: SpecificationSection;
    backend: SpecificationSection;
    integration: SpecificationSection;
    test: SpecificationSection;
  };
  overallStatus: 'empty' | 'draft' | 'review' | 'complete';
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpecificationValidationResult {
  isValid: boolean;
  completionPercentage: number;
  overallStatus: 'empty' | 'draft' | 'review' | 'complete';
  sectionValidation: {
    [sectionName: string]: {
      isValid: boolean;
      status: 'empty' | 'draft' | 'review' | 'complete';
      wordCount: number;
      issues: string[];
    };
  };
  recommendations: string[];
}

// Request deduplication to prevent duplicate API calls
const activeRequests = new Map<string, Promise<any>>();

function createRequestKey(method: string, url: string, body?: any): string {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
}

async function deduplicatedApiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const requestKey = createRequestKey(options.method || 'GET', endpoint, options.body);

  // Check if we have an active request for this exact call
  if (activeRequests.has(requestKey)) {
    console.log(`Deduplicating API call: ${requestKey}`);
    return activeRequests.get(requestKey) as Promise<T>;
  }

  // Create and store the promise
  const requestPromise = apiCall<T>(endpoint, options, retryCount);
  activeRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up after request completes
    activeRequests.delete(requestKey);
  }
}

/**
 * Fetch specification data for a work item
 * @param workItemId - The work item identifier
 * @returns Promise<SpecificationTemplate> - The specification data
 */
export async function getSpecification(workItemId: string): Promise<SpecificationTemplate> {
  if (!workItemId) {
    throw new ValidationError('Work item ID is required');
  }

  try {
    const result = await deduplicatedApiCall<{ data: SpecificationTemplate }>(
      `/specifications/${workItemId}`
    );

    if (!result.data) {
      throw new APIError('No specification data returned', 404, 'NOT_FOUND_ERROR');
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // If specification doesn't exist, return empty template
      if (error.status === 404) {
        return createEmptySpecificationTemplate(workItemId);
      }
      throw error;
    }
    throw new APIError(`Failed to get specification: ${error}`);
  }
}

/**
 * Update entire specification for a work item
 * @param workItemId - The work item identifier
 * @param specification - The complete specification data
 * @returns Promise<SpecificationTemplate> - The updated specification
 */
export async function updateSpecification(
  workItemId: string,
  specification: SpecificationTemplate
): Promise<SpecificationTemplate> {
  if (!workItemId) {
    throw new ValidationError('Work item ID is required');
  }

  if (!specification) {
    throw new ValidationError('Specification data is required');
  }

  try {
    // Update the updatedAt timestamp
    const updatedSpec = {
      ...specification,
      updatedAt: new Date().toISOString()
    };

    const result = await deduplicatedApiCall<{ data: SpecificationTemplate }>(
      `/specifications/${workItemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updatedSpec)
      }
    );

    if (!result.data) {
      throw new APIError('No specification data returned after update');
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // Silently handle 404 — work item only exists locally (template-based)
      if (error.status === 404) {
        console.debug('[api] updateSpecification: work item not in DB, saving locally only', workItemId);
        return specification;
      }
      throw error;
    }
    throw new APIError(`Failed to update specification: ${error}`);
  }
}

/**
 * Update a specific section of a specification
 * @param workItemId - The work item identifier
 * @param sectionName - The section name (requirements, design, frontend, backend, integration, test)
 * @param content - The section content and metadata
 * @returns Promise<SpecificationSection> - The updated section
 */
export async function updateSpecificationSection(
  workItemId: string,
  sectionName: string,
  content: SpecificationSection
): Promise<SpecificationSection> {
  if (!workItemId) {
    throw new ValidationError('Work item ID is required');
  }

  if (!sectionName) {
    throw new ValidationError('Section name is required');
  }

  if (!content) {
    throw new ValidationError('Section content is required');
  }

  // Validate section name
  const validSections = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
  if (!validSections.includes(sectionName.toLowerCase())) {
    throw new ValidationError(`Invalid section name: ${sectionName}. Must be one of: ${validSections.join(', ')}`);
  }

  try {
    // Update the lastUpdated timestamp
    const updatedContent = {
      ...content,
      lastUpdated: new Date().toISOString()
    };

    const result = await deduplicatedApiCall<{ data: SpecificationSection }>(
      `/specifications/${workItemId}/sections/${sectionName.toLowerCase()}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updatedContent)
      }
    );

    if (!result.data) {
      throw new APIError('No section data returned after update');
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // Silently handle 404 — work item only exists locally (template-based)
      if (error.status === 404) {
        console.debug('[api] updateSpecificationSection: work item not in DB, saving locally only', workItemId);
        return { ...content, lastUpdated: new Date().toISOString() };
      }
      throw error;
    }
    throw new APIError(`Failed to update specification section: ${error}`);
  }
}

/**
 * Validate a specification and get completion status
 * @param workItemId - The work item identifier
 * @returns Promise<SpecificationValidationResult> - Validation results and completion status
 */
export async function validateSpecification(workItemId: string): Promise<SpecificationValidationResult> {
  if (!workItemId) {
    throw new ValidationError('Work item ID is required');
  }

  try {
    const result = await deduplicatedApiCall<{ data: SpecificationValidationResult }>(
      `/specifications/${workItemId}/validate`
    );

    if (!result.data) {
      throw new APIError('No validation data returned');
    }

    return result.data;
  } catch (error) {
    if (error instanceof APIError) {
      // If specification doesn't exist, return empty validation
      if (error.status === 404) {
        return createEmptyValidationResult();
      }
      throw error;
    }
    throw new APIError(`Failed to validate specification: ${error}`);
  }
}

/**
 * Delete a specification for a work item
 * @param workItemId - The work item identifier
 * @returns Promise<void>
 */
export async function deleteSpecification(workItemId: string): Promise<void> {
  if (!workItemId) {
    throw new ValidationError('Work item ID is required');
  }

  try {
    await deduplicatedApiCall<void>(
      `/specifications/${workItemId}`,
      {
        method: 'DELETE'
      }
    );
  } catch (error) {
    if (error instanceof APIError) {
      // If specification doesn't exist, that's fine for deletion
      if (error.status === 404) {
        return;
      }
      throw error;
    }
    throw new APIError(`Failed to delete specification: ${error}`);
  }
}

// Helper function to create empty specification template
function createEmptySpecificationTemplate(workItemId: string): SpecificationTemplate {
  const now = new Date().toISOString();

  const emptySection: SpecificationSection = {
    content: '',
    status: 'empty',
    wordCount: 0,
    lastUpdated: now
  };

  return {
    id: `spec-${workItemId}`,
    workItemId,
    sections: {
      requirements: { ...emptySection },
      design: { ...emptySection },
      frontend: { ...emptySection },
      backend: { ...emptySection },
      integration: { ...emptySection },
      test: { ...emptySection }
    },
    overallStatus: 'empty',
    completionPercentage: 0,
    createdAt: now,
    updatedAt: now
  };
}

// Helper function to create empty validation result
function createEmptyValidationResult(): SpecificationValidationResult {
  const sections = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
  const sectionValidation: { [key: string]: any } = {};

  sections.forEach(section => {
    sectionValidation[section] = {
      isValid: false,
      status: 'empty',
      wordCount: 0,
      issues: ['Section is empty']
    };
  });

  return {
    isValid: false,
    completionPercentage: 0,
    overallStatus: 'empty',
    sectionValidation,
    recommendations: [
      'Add content to specification sections',
      'Start with requirements section to define project scope',
      'Include design specifications for technical implementation'
    ]
  };
}