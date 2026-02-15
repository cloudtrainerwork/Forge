/**
 * Offline queue hook for work item operations
 * Provides offline capability with automatic retry and sync
 */

import { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

export interface QueuedOperation {
  id: string;
  type: 'saveScreen' | 'saveNode' | 'createNode' | 'deleteNode' | 'createEdge' | 'deleteEdge';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  screenId: string;
}

export interface OfflineQueueState {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  hasErrors: boolean;
  lastSyncError?: string;
  lastSyncTime?: number;
}

const STORAGE_KEY = 'forge_offline_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const SYNC_INTERVAL = 5000; // Check every 5 seconds when online

export function useOfflineQueue(screenId: string) {
  const [state, setState] = useState<OfflineQueueState>({
    isOnline: true, // Start optimistically online to prevent hydration mismatch
    isSyncing: false,
    queueLength: 0,
    hasErrors: false,
  });

  // Load queue from localStorage (client-side only)
  const loadQueue = useCallback((): QueuedOperation[] => {
    try {
      if (typeof window === 'undefined') return [];

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  }, []);

  // Save queue to localStorage (client-side only)
  const saveQueue = useCallback((queue: QueuedOperation[]) => {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      setState(prev => ({ ...prev, queueLength: queue.length }));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }, []);

  // Add operation to queue
  const queueOperation = useCallback((
    type: QueuedOperation['type'],
    data: any,
    maxRetries: number = MAX_RETRIES
  ) => {
    const operation: QueuedOperation = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      screenId,
    };

    const queue = loadQueue();
    queue.push(operation);
    saveQueue(queue);

    console.log(`Queued ${type} operation:`, operation.id);
  }, [loadQueue, saveQueue, screenId]);

  // Remove operation from queue
  const removeFromQueue = useCallback((operationId: string) => {
    const queue = loadQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    saveQueue(filtered);
  }, [loadQueue, saveQueue]);

  // Execute a single operation
  const executeOperation = useCallback(async (operation: QueuedOperation): Promise<boolean> => {
    try {
      switch (operation.type) {
        case 'saveScreen':
          const { saveScreenData } = await import('../utils/api');
          await saveScreenData(
            operation.data.screenId,
            operation.data.nodes,
            operation.data.edges
          );
          break;

        case 'saveNode':
          const response = await fetch(`http://localhost:3001/api/v1/work-items/${operation.data.id}/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x: operation.data.x,
              y: operation.data.y,
            }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          break;

        case 'createNode':
          const createResponse = await fetch('http://localhost:3001/api/v1/work-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(operation.data),
          });
          if (!createResponse.ok) throw new Error(`HTTP ${createResponse.status}`);
          break;

        case 'deleteNode':
          const deleteResponse = await fetch(`http://localhost:3001/api/v1/work-items/${operation.data.id}`, {
            method: 'DELETE',
          });
          if (!deleteResponse.ok) throw new Error(`HTTP ${deleteResponse.status}`);
          break;

        case 'createEdge':
          const edgeResponse = await fetch('http://localhost:3001/api/v1/dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: operation.data.source,
              to: operation.data.target,
              type: operation.data.type || 'requires',
            }),
          });
          if (!edgeResponse.ok) throw new Error(`HTTP ${edgeResponse.status}`);
          break;

        case 'deleteEdge':
          const deleteEdgeResponse = await fetch(`http://localhost:3001/api/v1/dependencies/${operation.data.id}`, {
            method: 'DELETE',
          });
          if (!deleteEdgeResponse.ok) throw new Error(`HTTP ${deleteEdgeResponse.status}`);
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to execute ${operation.type} operation:`, error);
      return false;
    }
  }, []);

  // Process the entire queue
  const processQueue = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) return;

    const queue = loadQueue();
    if (queue.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true, hasErrors: false }));

    const updatedQueue: QueuedOperation[] = [];
    let hasErrors = false;

    for (const operation of queue) {
      const success = await executeOperation(operation);

      if (success) {
        console.log(`✅ Successfully executed ${operation.type} operation:`, operation.id);
      } else {
        operation.retryCount++;

        if (operation.retryCount < operation.maxRetries) {
          // Add exponential backoff delay
          const delay = RETRY_DELAY_BASE * Math.pow(2, operation.retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));

          updatedQueue.push(operation);
          console.log(`⏳ Retrying ${operation.type} operation (${operation.retryCount}/${operation.maxRetries}):`, operation.id);
        } else {
          hasErrors = true;
          console.error(`❌ Failed ${operation.type} operation after ${operation.maxRetries} retries:`, operation.id);
          // Optionally keep failed operations for manual retry
          // updatedQueue.push(operation);
        }
      }
    }

    saveQueue(updatedQueue);

    setState(prev => ({
      ...prev,
      isSyncing: false,
      hasErrors,
      lastSyncTime: Date.now(),
      lastSyncError: hasErrors ? 'Some operations failed after maximum retries' : undefined,
    }));
  }, [state.isOnline, state.isSyncing, loadQueue, executeOperation, saveQueue]);

  // Handle online/offline status changes
  useEffect(() => {
    // Set initial online status after hydration
    setState(prev => ({ ...prev, isOnline: navigator.onLine }));

    const handleOnline = () => {
      console.log('🌐 Connection restored - processing offline queue');
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      console.log('📡 Connection lost - enabling offline mode');
      setState(prev => ({ ...prev, isOnline: false, isSyncing: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (!state.isOnline) return;

    const interval = setInterval(processQueue, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [state.isOnline, processQueue]);

  // Initial queue length check
  useEffect(() => {
    const queue = loadQueue();
    setState(prev => ({ ...prev, queueLength: queue.length }));
  }, [loadQueue]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (state.isOnline && !state.isSyncing) {
      await processQueue();
    }
  }, [state.isOnline, state.isSyncing, processQueue]);

  // Clear queue (for debugging/recovery)
  const clearQueue = useCallback(() => {
    saveQueue([]);
    setState(prev => ({
      ...prev,
      queueLength: 0,
      hasErrors: false,
      lastSyncError: undefined,
    }));
  }, [saveQueue]);

  // Queue specific operations
  const queueScreenSave = useCallback((nodes: Node[], edges: Edge[]) => {
    queueOperation('saveScreen', { screenId, nodes, edges });
  }, [queueOperation, screenId]);

  const queueNodeUpdate = useCallback((node: Node) => {
    queueOperation('saveNode', {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
    });
  }, [queueOperation]);

  const queueEdgeCreate = useCallback((edge: Edge) => {
    queueOperation('createEdge', {
      source: edge.source,
      target: edge.target,
      type: edge.type,
    });
  }, [queueOperation]);

  return {
    state,
    queueScreenSave,
    queueNodeUpdate,
    queueEdgeCreate,
    syncNow,
    clearQueue,
  };
}