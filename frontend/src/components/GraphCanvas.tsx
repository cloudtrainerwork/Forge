'use client';

import { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { zoom, select } from 'd3';
import { WorkItemNode, RelationshipEdge } from '../lib/graphTypes';

interface GraphCanvasProps {
  nodes?: WorkItemNode[];
  edges?: RelationshipEdge[];
  onNodeSelect?: (nodeId: string) => void;
  onCanvasClick?: (position: { x: number; y: number }) => void;
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  isCreatingEdge?: boolean;
  className?: string;
}

interface PerformanceStats {
  renderTime: number;
  memoryUsage: number;
  nodeCount: number;
  edgeCount: number;
  lastUpdate: number;
}

// Performance configuration constants
const PERFORMANCE_CONFIG = {
  batchSize: 100,                    // Nodes to load per batch
  batchDelay: 16,                   // ms between batches (60fps)
  webglThreshold: 200,              // Switch to WebGL after N nodes
  lodZoomThreshold: 0.5,            // Hide edge labels below this zoom
  maxNodes: 1000,                   // Memory safety limit
  memoryCheckInterval: 5000,        // ms between memory checks
  viewportCullingEnabled: true      // Enable viewport-based rendering
};

// Generate styles dynamically for level-of-detail rendering
const createGraphStyles = (zoomLevel: number = 1): cytoscape.StylesheetStyle[] => {
  const showEdgeLabels = zoomLevel >= PERFORMANCE_CONFIG.lodZoomThreshold;
  const enableEdgeInteractions = zoomLevel >= PERFORMANCE_CONFIG.lodZoomThreshold;

  return [
    {
      selector: 'node',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': Math.max(8, 12 * zoomLevel) + 'px', // Scale font with zoom
        'font-weight': 'bold',
        'width': Math.max(40, 60 * Math.min(zoomLevel, 1)), // Scale node size
        'height': Math.max(40, 60 * Math.min(zoomLevel, 1)),
        'border-width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'border-color': '#1e40af',
        'text-wrap': 'wrap',
        'text-max-width': '50px',
        'overlay-opacity': 0,
        'transition-property': enableEdgeInteractions ? 'background-color, border-color' : '',
        'transition-duration': enableEdgeInteractions ? 300 : 0
      }
    },
    {
      selector: 'node:selected, node.selected',
      style: {
        'background-color': '#10b981',
        'border-color': '#059669',
        'border-width': Math.max(2, 3 * Math.min(zoomLevel, 1))
      }
    },
    {
      selector: 'node:hover',
      style: {
        'background-color': enableEdgeInteractions ? '#1d4ed8' : '#3b82f6', // Disable hover when zoomed out
        'border-color': enableEdgeInteractions ? '#1e40af' : '#1e40af'
      }
    },
    // Edge types with level-of-detail styling
    {
      selector: 'edge[type="blocks"]',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'target-arrow-shape': 'triangle',
        'line-style': 'solid',
        'width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'label': showEdgeLabels ? 'data(label)' : '',
        'font-size': showEdgeLabels ? Math.max(8, 10 * zoomLevel) + 'px' : '0px',
        'text-rotation': showEdgeLabels ? 'autorotate' : 'none',
        'opacity': Math.max(0.3, Math.min(1, zoomLevel)) // Fade edges at low zoom
      }
    },
    {
      selector: 'edge[type="requires"]',
      style: {
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6',
        'target-arrow-shape': 'diamond',
        'line-style': 'solid',
        'width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'label': showEdgeLabels ? 'data(label)' : '',
        'font-size': showEdgeLabels ? Math.max(8, 10 * zoomLevel) + 'px' : '0px',
        'text-rotation': showEdgeLabels ? 'autorotate' : 'none',
        'opacity': Math.max(0.3, Math.min(1, zoomLevel))
      }
    },
    {
      selector: 'edge[type="feeds-into"]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'target-arrow-shape': 'triangle',
        'line-style': 'dashed',
        'width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'label': showEdgeLabels ? 'data(label)' : '',
        'font-size': showEdgeLabels ? Math.max(8, 10 * zoomLevel) + 'px' : '0px',
        'text-rotation': showEdgeLabels ? 'autorotate' : 'none',
        'opacity': Math.max(0.3, Math.min(1, zoomLevel))
      }
    },
    {
      selector: 'edge[type="tested-by"]',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'target-arrow-shape': 'circle',
        'line-style': 'solid',
        'width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'label': showEdgeLabels ? 'data(label)' : '',
        'font-size': showEdgeLabels ? Math.max(8, 10 * zoomLevel) + 'px' : '0px',
        'text-rotation': showEdgeLabels ? 'autorotate' : 'none',
        'opacity': Math.max(0.3, Math.min(1, zoomLevel))
      }
    },
    {
      selector: 'edge[type="deployed-with"]',
      style: {
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'target-arrow-shape': 'square',
        'line-style': 'dotted',
        'width': Math.max(1, 2 * Math.min(zoomLevel, 1)),
        'label': showEdgeLabels ? 'data(label)' : '',
        'font-size': showEdgeLabels ? Math.max(8, 10 * zoomLevel) + 'px' : '0px',
        'text-rotation': showEdgeLabels ? 'autorotate' : 'none',
        'opacity': Math.max(0.3, Math.min(1, zoomLevel))
      }
    }
  ];
};

export default function GraphCanvas({
  nodes = [],
  edges = [],
  onNodeSelect,
  onCanvasClick,
  onNodeClick,
  selectedNodeId,
  isCreatingEdge: _ = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  className = "w-full h-screen-safe"
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const isDestroyedRef = useRef(false);
  const performanceStatsRef = useRef<PerformanceStats>({
    renderTime: 0,
    memoryUsage: 0,
    nodeCount: 0,
    edgeCount: 0,
    lastUpdate: Date.now()
  });
  const currentZoomRef = useRef(1);
  const memoryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Performance monitoring utilities
  const updatePerformanceStats = (nodeCount: number, edgeCount: number, renderTime?: number) => {
    const currentMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
    performanceStatsRef.current = {
      renderTime: renderTime || performanceStatsRef.current.renderTime,
      memoryUsage: currentMemory,
      nodeCount,
      edgeCount,
      lastUpdate: Date.now()
    };

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (nodeCount > PERFORMANCE_CONFIG.maxNodes) {
        console.warn(`GraphCanvas: Node count (${nodeCount}) exceeds recommended limit (${PERFORMANCE_CONFIG.maxNodes})`);
      }
      if (currentMemory > 50 * 1024 * 1024) { // 50MB
        console.warn(`GraphCanvas: Memory usage (${Math.round(currentMemory / 1024 / 1024)}MB) is high`);
      }
    }
  };

  const getMemoryUsage = (): number => {
    return (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
  };

  const shouldUseWebGL = (nodeCount: number): boolean => {
    return nodeCount >= PERFORMANCE_CONFIG.webglThreshold;
  };

  const updateZoomLevelStyles = (zoomLevel: number) => {
    if (cyRef.current && !isDestroyedRef.current && Math.abs(currentZoomRef.current - zoomLevel) > 0.1) {
      currentZoomRef.current = zoomLevel;
      try {
        cyRef.current.style(createGraphStyles(zoomLevel));
      } catch (e) {
        // Ignore style update errors during destruction
        if (!isDestroyedRef.current) {
          console.error('GraphCanvas: Error updating zoom styles:', e);
        }
      }
    }
  };

  // Initialize Cytoscape with WebGL rendering and memory-safe configuration
  useEffect(() => {
    if (!containerRef.current || isDestroyedRef.current) return;

    // Reset destroyed flag for new mount
    isDestroyedRef.current = false;

    try {
      // Determine if WebGL rendering should be enabled based on expected node count
      const totalNodeCount = nodes.length;
      const useWebGL = shouldUseWebGL(totalNodeCount);

      // Initialize Cytoscape with performance-optimized configuration
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [], // Start empty for progressive loading
        style: createGraphStyles(1), // Start with full detail
        layout: {
          name: 'preset', // Avoid expensive force-directed layouts initially
          padding: 50
        },
        // Performance-optimized settings
        renderer: {
          name: useWebGL ? 'webgl' : 'canvas', // Use WebGL for large graphs
        },
        wheelSensitivity: 0.15, // Slightly faster zoom for better UX
        maxZoom: 5, // Allow higher zoom for detail viewing
        minZoom: 0.05, // Allow zooming out further for overview
        boxSelectionEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        zoomingEnabled: true,
        userZoomingEnabled: true,
        selectionType: 'single',
        // Memory optimization settings
        hideEdgesOnViewport: PERFORMANCE_CONFIG.viewportCullingEnabled,
        hideLabelsOnViewport: PERFORMANCE_CONFIG.viewportCullingEnabled,
        textureOnViewport: useWebGL, // Use textures for better WebGL performance
        motionBlur: false, // Disable for performance
        pixelRatio: 'auto'
      });

      // Add d3-zoom for multi-device pan/zoom support with level-of-detail updates
      const container = select(containerRef.current);
      const zoomBehavior = zoom()
        .scaleExtent([0.05, 5]) // Match Cytoscape zoom limits
        .on('zoom', (event) => {
          if (cyRef.current && !isDestroyedRef.current) {
            const { transform } = event;
            const zoomLevel = transform.k;

            cyRef.current.zoom(zoomLevel);
            cyRef.current.pan({ x: transform.x, y: transform.y });

            // Update styles based on zoom level for level-of-detail rendering
            updateZoomLevelStyles(zoomLevel);
          }
        });

      container.call(zoomBehavior as never);

      // Add Cytoscape native zoom event to sync with d3-zoom
      if (cyRef.current) {
        cyRef.current.on('zoom', () => {
          if (cyRef.current && !isDestroyedRef.current) {
            const zoomLevel = cyRef.current.zoom();
            updateZoomLevelStyles(zoomLevel);
          }
        });
      }

      // Add event handlers
      if (cyRef.current) {
        // Node click handler
        cyRef.current.on('tap', 'node', (evt) => {
          const nodeId = evt.target.id();
          if (onNodeSelect) onNodeSelect(nodeId);
          if (onNodeClick) onNodeClick(nodeId);
        });

        // Canvas click handler (empty space)
        cyRef.current.on('tap', (evt) => {
          if (evt.target === cyRef.current) {
            const position = evt.position || evt.renderedPosition;
            if (position && onCanvasClick) {
              onCanvasClick({ x: position.x, y: position.y });
            }
          }
        });
      }

      // Start memory monitoring
      if (memoryCheckIntervalRef.current) {
        clearInterval(memoryCheckIntervalRef.current);
      }
      memoryCheckIntervalRef.current = setInterval(() => {
        if (!isDestroyedRef.current) {
          updatePerformanceStats(nodes.length, edges.length);
        }
      }, PERFORMANCE_CONFIG.memoryCheckInterval);

      // Performance monitoring and logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`GraphCanvas: Initialized with ${useWebGL ? 'WebGL' : 'Canvas'} rendering`);
        console.log(`GraphCanvas: Expected nodes: ${totalNodeCount}, WebGL threshold: ${PERFORMANCE_CONFIG.webglThreshold}`);
        console.log(`GraphCanvas: Performance config:`, PERFORMANCE_CONFIG);
      }

    } catch (error) {
      console.error('GraphCanvas: Failed to initialize Cytoscape:', error);
      // Fallback to basic canvas rendering without WebGL
      if (containerRef.current && !isDestroyedRef.current) {
        try {
          cyRef.current = cytoscape({
            container: containerRef.current,
            elements: [],
            style: createGraphStyles(1), // Use dynamic styles even in fallback
            layout: { name: 'preset', padding: 50 },
            renderer: { name: 'canvas' }, // Force canvas renderer
            wheelSensitivity: 0.2,
            maxZoom: 3,
            minZoom: 0.1
          });
          if (process.env.NODE_ENV === 'development') {
            console.log('GraphCanvas: Fallback to Canvas rendering');
          }
        } catch (fallbackError) {
          console.error('GraphCanvas: Fallback initialization failed:', fallbackError);
        }
      }
    }

    // Critical: Cleanup on component unmount to prevent memory leaks and DOM conflicts
    return () => {
      if (cyRef.current && !isDestroyedRef.current) {
        isDestroyedRef.current = true;

        // Clean up memory monitoring
        if (memoryCheckIntervalRef.current) {
          clearInterval(memoryCheckIntervalRef.current);
          memoryCheckIntervalRef.current = null;
        }

        // Remove all event listeners first to prevent callbacks during destruction
        cyRef.current.removeAllListeners();

        // Remove all elements before destroying to prevent DOM conflicts
        try {
          cyRef.current.elements().remove();
        } catch {
          // Ignore errors during cleanup
        }

        // Use setTimeout to ensure React has finished its DOM operations
        setTimeout(() => {
          if (cyRef.current && isDestroyedRef.current) {
            try {
              // Check if container still exists in DOM before destroying
              const container = cyRef.current.container();
              if (container && container.parentNode) {
                cyRef.current.destroy();
              } else {
                // Container was removed by React, just clean up reference
                cyRef.current = null;
              }
            } catch (e) {
              // Ignore destruction errors - component is unmounting anyway
              console.warn('GraphCanvas: Cleanup warning (safe to ignore):', e);
              cyRef.current = null;
            }
          }
        }, 0);
      }
    };
  }, [onNodeSelect, onCanvasClick, onNodeClick, nodes.length, edges.length]);

  // Update selection state
  useEffect(() => {
    if (!cyRef.current || isDestroyedRef.current) return;

    try {
      // Clear all selections
      cyRef.current.nodes().removeClass('selected');

      // Apply selection to the selected node
      if (selectedNodeId) {
        const selectedNode = cyRef.current.getElementById(selectedNodeId);
        if (selectedNode.length > 0) {
          selectedNode.addClass('selected');
        }
      }
    } catch (e) {
      // Ignore selection errors during component destruction
      if (!isDestroyedRef.current) {
        console.error('GraphCanvas: Error during selection update:', e);
      }
    }
  }, [selectedNodeId]);

  // Enhanced progressive loading pattern with performance monitoring
  useEffect(() => {
    if (!cyRef.current || isDestroyedRef.current) return;

    const startTime = performance.now();
    const memoryBefore = getMemoryUsage();

    // Convert nodes and edges to Cytoscape format
    const cytoscapeElements = [
      ...nodes.map(node => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          readiness: node.readiness
        }
      })),
      ...edges.map(edge => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          label: edge.label || edge.type
        }
      }))
    ];

    // Adaptive batch size based on total element count
    const adaptiveBatchSize = cytoscapeElements.length > PERFORMANCE_CONFIG.webglThreshold
      ? Math.max(50, PERFORMANCE_CONFIG.batchSize / 2) // Smaller batches for large datasets
      : PERFORMANCE_CONFIG.batchSize;

    // Enhanced progressive loading with memory monitoring
    const loadBatch = async (startIndex: number) => {
      if (isDestroyedRef.current) return;

      const batch = cytoscapeElements.slice(startIndex, startIndex + adaptiveBatchSize);
      if (batch.length > 0 && cyRef.current && !isDestroyedRef.current) {
        try {
          const batchStartTime = performance.now();

          // Add batch with memory safety check
          cyRef.current.add(batch);

          const batchEndTime = performance.now();
          const batchMemoryAfter = getMemoryUsage();

          // Monitor batch performance
          if (process.env.NODE_ENV === 'development') {
            if (batchEndTime - batchStartTime > 100) { // Batch took more than 100ms
              console.warn(`GraphCanvas: Batch loading slow (${Math.round(batchEndTime - batchStartTime)}ms for ${batch.length} elements)`);
            }
            if (batchMemoryAfter - memoryBefore > 10 * 1024 * 1024) { // 10MB increase
              console.warn(`GraphCanvas: Memory usage increased significantly during loading`);
            }
          }

          // Yield to browser with adaptive timing
          const yieldTime = cytoscapeElements.length > 500 ? PERFORMANCE_CONFIG.batchDelay * 2 : PERFORMANCE_CONFIG.batchDelay;
          await new Promise(resolve => setTimeout(resolve, yieldTime));

          if (startIndex + adaptiveBatchSize < cytoscapeElements.length && !isDestroyedRef.current) {
            await loadBatch(startIndex + adaptiveBatchSize);
          } else if (cyRef.current && !isDestroyedRef.current) {
            // Layout after all elements are loaded - choose layout based on size
            const layoutConfig = cytoscapeElements.length > 500
              ? {
                  name: 'grid',
                  padding: 50,
                  animate: false,
                  rows: Math.ceil(Math.sqrt(nodes.length)),
                  cols: Math.ceil(Math.sqrt(nodes.length))
                }
              : cytoscapeElements.length > 300
                ? {
                    name: 'preset',
                    padding: 50,
                    animate: false
                  }
                : {
                    name: 'breadthfirst',
                    padding: 50,
                    spacingFactor: 1.5,
                    animate: false,
                    directed: true
                  };

            const layout = cyRef.current.layout(layoutConfig);

            layout.run();

            // Final performance measurement
            const endTime = performance.now();
            const memoryAfter = getMemoryUsage();
            updatePerformanceStats(nodes.length, edges.length, endTime - startTime);

            if (process.env.NODE_ENV === 'development') {
              console.log(`GraphCanvas: Loaded ${cytoscapeElements.length} elements in ${Math.round(endTime - startTime)}ms`);
              console.log(`GraphCanvas: Memory usage: ${Math.round(memoryAfter / 1024 / 1024)}MB (${Math.round((memoryAfter - memoryBefore) / 1024 / 1024)}MB increase)`);
            }
          }
        } catch (e) {
          // Component was destroyed during loading, stop gracefully
          if (isDestroyedRef.current) return;
          console.error('GraphCanvas: Error during batch loading:', e);
          throw e;
        }
      }
    };

    // Memory safety check before loading
    if (nodes.length > PERFORMANCE_CONFIG.maxNodes) {
      console.warn(`GraphCanvas: Node count (${nodes.length}) exceeds memory safety limit (${PERFORMANCE_CONFIG.maxNodes}). Consider implementing data virtualization.`);
    }

    // Clear existing elements and load new ones
    try {
      cyRef.current.elements().remove();

      if (cytoscapeElements.length > 0) {
        loadBatch(0).catch(error => {
          if (!isDestroyedRef.current) {
            console.error('GraphCanvas: Progressive loading failed:', error);
          }
        });
      } else {
        // Update stats for empty graph
        updatePerformanceStats(0, 0, 0);
      }
    } catch (e) {
      // Ignore errors if component is being destroyed
      if (!isDestroyedRef.current) {
        console.error('GraphCanvas: Error during progressive loading initialization:', e);
      }
    }
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      className={`${className} cursor-grab active:cursor-grabbing bg-gray-50 border border-gray-200 rounded-lg overflow-hidden`}
      style={{
        // Ensure proper touch handling for multi-device support
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {/* Loading indicator and performance info */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-lg font-semibold">Graph Canvas Ready</div>
            <div className="text-sm mt-2">Load work items to visualize dependencies</div>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs mt-4 text-gray-400 space-y-1">
                <div>WebGL Threshold: {PERFORMANCE_CONFIG.webglThreshold}+ nodes</div>
                <div>Max Nodes: {PERFORMANCE_CONFIG.maxNodes}</div>
                <div>Batch Size: {PERFORMANCE_CONFIG.batchSize}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance indicator for large graphs */}
      {nodes.length > PERFORMANCE_CONFIG.webglThreshold && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {nodes.length > PERFORMANCE_CONFIG.webglThreshold ? 'WebGL' : 'Canvas'} • {nodes.length} nodes
        </div>
      )}
    </div>
  );
}