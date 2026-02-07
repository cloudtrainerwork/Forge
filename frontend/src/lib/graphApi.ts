/**
 * API client for FORGE backend integration
 * Connects to Phase 1 backend APIs on port 3001 with proper error handling
 */

// API Response types matching backend structure
export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// Work Item types matching backend domain entities
export interface BackendWorkItem {
  id: string;
  title?: string;
  description?: string;
  spec: Record<string, unknown>;
  readiness: {
    requirements: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    design: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    frontend: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    backend: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    integration: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    test: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkItemRequest {
  id?: string;
  title: string;
  description?: string;
  spec?: Record<string, unknown>;
  readiness?: Partial<BackendWorkItem['readiness']>;
}

export interface UpdateReadinessRequest {
  dimension: keyof BackendWorkItem['readiness'];
  value: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
}

export interface CreateDependencyRequest {
  toWorkItemId: string;
  relationshipType?: string;
  properties?: Record<string, unknown>;
}

export interface DependencyResponse {
  relationshipId: string;
  fromWorkItemId: string;
  toWorkItemId: string;
  relationshipType: string;
  properties: Record<string, unknown>;
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_ENDPOINTS = {
  workItems: '/api/work-items',
  workItem: (id: string) => `/api/work-items/${id}`,
  readiness: (id: string) => `/api/work-items/${id}/readiness`,
  dependencies: (id: string) => `/api/work-items/${id}/dependencies`,
} as const;

// Error classes for proper error handling
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

// HTTP client with proper error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorDetails: unknown = undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.details;
      } catch {
        // If response is not JSON, use status text
      }

      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors (CORS, connection refused, etc.)
    throw new NetworkError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

// Work Items API functions

/**
 * Fetch all work items with optional filtering
 */
export async function fetchWorkItems(options?: {
  dimension?: keyof BackendWorkItem['readiness'];
  value?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedApiResponse<BackendWorkItem>> {
  const searchParams = new URLSearchParams();

  if (options?.dimension) searchParams.set('dimension', options.dimension);
  if (options?.value) searchParams.set('value', options.value);
  if (options?.search) searchParams.set('search', options.search);
  if (options?.limit) searchParams.set('limit', options.limit.toString());
  if (options?.offset) searchParams.set('offset', options.offset.toString());

  const endpoint = `${API_ENDPOINTS.workItems}?${searchParams.toString()}`;

  return apiRequest<PaginatedApiResponse<BackendWorkItem>>(endpoint, {
    method: 'GET',
  });
}

/**
 * Create a new work item
 */
export async function createWorkItem(
  workItem: CreateWorkItemRequest
): Promise<ApiResponse<BackendWorkItem>> {
  return apiRequest<ApiResponse<BackendWorkItem>>(API_ENDPOINTS.workItems, {
    method: 'POST',
    body: JSON.stringify(workItem),
  });
}

/**
 * Get a work item by ID
 */
export async function getWorkItem(id: string): Promise<ApiResponse<BackendWorkItem>> {
  return apiRequest<ApiResponse<BackendWorkItem>>(API_ENDPOINTS.workItem(id), {
    method: 'GET',
  });
}

/**
 * Update work item readiness dimension
 */
export async function updateWorkItem(
  id: string,
  update: UpdateReadinessRequest
): Promise<ApiResponse<BackendWorkItem>> {
  return apiRequest<ApiResponse<BackendWorkItem>>(API_ENDPOINTS.readiness(id), {
    method: 'PUT',
    body: JSON.stringify(update),
  });
}

/**
 * Create dependency relationship between work items
 */
export async function createDependency(
  fromWorkItemId: string,
  dependency: CreateDependencyRequest
): Promise<ApiResponse<DependencyResponse>> {
  return apiRequest<ApiResponse<DependencyResponse>>(
    API_ENDPOINTS.dependencies(fromWorkItemId),
    {
      method: 'POST',
      body: JSON.stringify(dependency),
    }
  );
}

/**
 * Get dependency graph for a work item
 */
export async function getDependencies(
  id: string,
  options?: {
    relationshipType?: string;
    maxDepth?: number;
  }
): Promise<ApiResponse<unknown[]>> {
  const searchParams = new URLSearchParams();

  if (options?.relationshipType) {
    searchParams.set('relationshipType', options.relationshipType);
  }
  if (options?.maxDepth) {
    searchParams.set('maxDepth', options.maxDepth.toString());
  }

  const endpoint = `${API_ENDPOINTS.dependencies(id)}?${searchParams.toString()}`;

  return apiRequest<ApiResponse<unknown[]>>(endpoint, {
    method: 'GET',
  });
}

// Utility functions for data transformation

/**
 * Transform backend work item to frontend format
 */
export function transformWorkItemToNode(workItem: BackendWorkItem): {
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
} {
  return {
    id: workItem.id,
    label: workItem.title || `Work Item ${workItem.id.slice(0, 8)}`,
    type: (typeof workItem.spec.type === 'string' ? workItem.spec.type : 'work-item'),
    readiness: {
      requirements: workItem.readiness.requirements === 'COMPLETE',
      design: workItem.readiness.design === 'COMPLETE',
      frontend: workItem.readiness.frontend === 'COMPLETE',
      backend: workItem.readiness.backend === 'COMPLETE',
      integration: workItem.readiness.integration === 'COMPLETE',
      test: workItem.readiness.test === 'COMPLETE',
    },
  };
}

/**
 * Check if backend service is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    // Try a simple request to check if backend is running
    await fetch(`${API_BASE_URL}/api/work-items?limit=1`);
    return true;
  } catch {
    return false;
  }
}