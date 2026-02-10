import { ReadinessState, ReadinessConfig } from '@/stores/readinessStore';

// Base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_VERSION = 'v1';

// Request timeout
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Types for API requests/responses
export interface UpdateReadinessRequest {
  dimension: keyof Omit<ReadinessState, 'nodeId'>;
  value: number;
}

export interface BulkUpdateReadinessRequest {
  updates: Array<{
    nodeId: string;
    updates: UpdateReadinessRequest[];
  }>;
}

export interface ReadinessSummaryResponse {
  totalNodes: number;
  averageReadiness: number;
  readyNodes: number;
  inProgressNodes: number;
  blockedNodes: number;
  byDimension: {
    design: number;
    backend: number;
    frontend: number;
    integration: number;
    test: number;
    deployment: number;
  };
}

export interface ReadinessHistoryEntry {
  id: string;
  nodeId: string;
  dimension: string;
  previousValue: number;
  newValue: number;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

// Offline queue types
interface QueuedOperation {
  id: string;
  type: 'update' | 'bulk_update';
  payload: any;
  timestamp: number;
  retryCount: number;
}

// Error types
export class ReadinessApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ReadinessApiError';
  }
}

// Utility functions
const createApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}/api/${API_VERSION}${endpoint}`;
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

// Offline queue management
class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;

  add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.queue.push(queuedOp);

    // Save to localStorage
    this.saveQueue();

    // Try to process if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    const toProcess = [...this.queue];

    for (const operation of toProcess) {
      try {
        if (operation.type === 'update') {
          await updateReadiness(operation.payload.nodeId, operation.payload.updates);
        } else if (operation.type === 'bulk_update') {
          await bulkUpdateReadiness(operation.payload);
        }

        // Remove successful operation from queue
        this.queue = this.queue.filter(op => op.id !== operation.id);
      } catch (error) {
        // Increment retry count
        const queuedOp = this.queue.find(op => op.id === operation.id);
        if (queuedOp) {
          queuedOp.retryCount++;

          // Remove after 3 failed attempts
          if (queuedOp.retryCount >= 3) {
            this.queue = this.queue.filter(op => op.id !== operation.id);
            console.error('Failed to sync operation after 3 attempts:', operation);
          }
        }
      }
    }

    this.saveQueue();
    this.isProcessing = false;
  }

  private saveQueue(): void {
    try {
      localStorage.setItem('readiness_offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('readiness_offline_queue');
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  init(): void {
    this.loadQueue();

    // Listen for online events
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}

const offlineQueue = new OfflineQueue();
offlineQueue.init();

// API functions with retry logic
const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  retries: number = 3
): Promise<Response> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await withTimeout(fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }));

      if (!response.ok) {
        throw new ReadinessApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      if (i === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }

  throw new Error('Unexpected error in fetchWithRetry');
};

// Main API functions
export const updateReadiness = async (
  nodeId: string,
  updates: UpdateReadinessRequest[]
): Promise<ReadinessState> => {
  if (!navigator.onLine) {
    offlineQueue.add({
      type: 'update',
      payload: { nodeId, updates },
    });
    throw new ReadinessApiError('Offline - queued for sync', 0);
  }

  try {
    const response = await fetchWithRetry(
      createApiUrl(`/readiness/${encodeURIComponent(nodeId)}`),
      {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      }
    );

    return await response.json();
  } catch (error) {
    // Queue for offline sync if network error
    if (error instanceof ReadinessApiError && error.statusCode === undefined) {
      offlineQueue.add({
        type: 'update',
        payload: { nodeId, updates },
      });
    }
    throw error;
  }
};

export const bulkUpdateReadiness = async (
  updates: BulkUpdateReadinessRequest
): Promise<ReadinessState[]> => {
  if (!navigator.onLine) {
    offlineQueue.add({
      type: 'bulk_update',
      payload: updates,
    });
    throw new ReadinessApiError('Offline - queued for sync', 0);
  }

  try {
    const response = await fetchWithRetry(
      createApiUrl('/readiness/bulk'),
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );

    return await response.json();
  } catch (error) {
    // Queue for offline sync if network error
    if (error instanceof ReadinessApiError && error.statusCode === undefined) {
      offlineQueue.add({
        type: 'bulk_update',
        payload: updates,
      });
    }
    throw error;
  }
};

export const getReadinessSummary = async (): Promise<ReadinessSummaryResponse> => {
  const response = await fetchWithRetry(createApiUrl('/readiness/summary'));
  return await response.json();
};

export const getReadinessHistory = async (
  nodeId?: string,
  limit?: number
): Promise<ReadinessHistoryEntry[]> => {
  const params = new URLSearchParams();
  if (nodeId) params.append('nodeId', nodeId);
  if (limit) params.append('limit', limit.toString());

  const url = createApiUrl(`/readiness/history${params.toString() ? `?${params.toString()}` : ''}`);
  const response = await fetchWithRetry(url);
  return await response.json();
};

export const getReadinessData = async (nodeId?: string): Promise<ReadinessState[]> => {
  const url = nodeId
    ? createApiUrl(`/readiness/${encodeURIComponent(nodeId)}`)
    : createApiUrl('/readiness');

  const response = await fetchWithRetry(url);

  if (nodeId) {
    // Single node response
    const data = await response.json();
    return [data];
  } else {
    // All nodes response
    return await response.json();
  }
};

export const getConfiguration = async (configId?: string): Promise<ReadinessConfig[]> => {
  const url = configId
    ? createApiUrl(`/readiness/config/${encodeURIComponent(configId)}`)
    : createApiUrl('/readiness/config');

  const response = await fetchWithRetry(url);

  if (configId) {
    // Single config response
    const data = await response.json();
    return [data];
  } else {
    // All configs response
    return await response.json();
  }
};

// Optimistic update helpers
export const createOptimisticUpdate = (
  current: ReadinessState,
  updates: UpdateReadinessRequest[]
): ReadinessState => {
  const optimistic = { ...current };

  for (const update of updates) {
    optimistic[update.dimension] = update.value;
  }

  return optimistic;
};

// Health check
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await fetchWithRetry(createApiUrl('/health'), {}, 1); // Single retry
  return await response.json();
};

// Export offline queue for monitoring
export const getOfflineQueueStatus = (): { pendingCount: number } => {
  return {
    pendingCount: offlineQueue.getPendingCount(),
  };
};

// Force sync offline queue (for manual sync button)
export const syncOfflineQueue = async (): Promise<void> => {
  await offlineQueue.processQueue();
};