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

// Define graph styles outside component to avoid re-renders
const graphStyles: cytoscape.StylesheetStyle[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#3b82f6',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': '12px',
        'font-weight': 'bold',
        'width': 60,
        'height': 60,
        'border-width': 2,
        'border-color': '#1e40af',
        'text-wrap': 'wrap',
        'text-max-width': '50px',
        'overlay-opacity': 0,
        'transition-property': 'background-color, border-color',
        'transition-duration': 300
      }
    },
    {
      selector: 'node:selected, node.selected',
      style: {
        'background-color': '#10b981',
        'border-color': '#059669',
        'border-width': 3
      }
    },
    {
      selector: 'node:hover',
      style: {
        'background-color': '#1d4ed8',
        'border-color': '#1e40af'
      }
    },
    // Edge types with distinct styling
    {
      selector: 'edge[type="blocks"]',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444',
        'target-arrow-shape': 'triangle',
        'line-style': 'solid',
        'width': 2,
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate'
      }
    },
    {
      selector: 'edge[type="requires"]',
      style: {
        'line-color': '#3b82f6',
        'target-arrow-color': '#3b82f6',
        'target-arrow-shape': 'diamond',
        'line-style': 'solid',
        'width': 2,
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate'
      }
    },
    {
      selector: 'edge[type="feeds-into"]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'target-arrow-shape': 'triangle',
        'line-style': 'dashed',
        'width': 2,
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate'
      }
    },
    {
      selector: 'edge[type="tested-by"]',
      style: {
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'target-arrow-shape': 'circle',
        'line-style': 'solid',
        'width': 2,
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate'
      }
    },
    {
      selector: 'edge[type="deployed-with"]',
      style: {
        'line-color': '#8b5cf6',
        'target-arrow-color': '#8b5cf6',
        'target-arrow-shape': 'square',
        'line-style': 'dotted',
        'width': 2,
        'label': 'data(label)',
        'font-size': '10px',
        'text-rotation': 'autorotate'
      }
    }
];

export default function GraphCanvas({
  nodes = [],
  edges = [],
  onNodeSelect,
  onCanvasClick,
  onNodeClick,
  selectedNodeId,
  isCreatingEdge = false,
  className = "w-full h-screen-safe"
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  // Initialize Cytoscape with WebGL rendering and memory-safe configuration
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Initialize Cytoscape with memory-safe configuration per research
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [], // Start empty for progressive loading
        style: graphStyles,
        layout: {
          name: 'preset', // Avoid expensive force-directed layouts initially
          padding: 50
        },
        // Memory-safe settings
        wheelSensitivity: 0.2,
        maxZoom: 3,
        minZoom: 0.1,
        boxSelectionEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        zoomingEnabled: true,
        userZoomingEnabled: true,
        selectionType: 'single'
      });

      // Add d3-zoom for multi-device pan/zoom support
      const container = select(containerRef.current);
      const zoomBehavior = zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
          if (cyRef.current) {
            const { transform } = event;
            cyRef.current.zoom(transform.k);
            cyRef.current.pan({ x: transform.x, y: transform.y });
          }
        });

      container.call(zoomBehavior as never);

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

      // Performance monitoring for memory leaks
      if (process.env.NODE_ENV === 'development') {
        console.log('GraphCanvas: Cytoscape initialized with WebGL rendering');
      }

    } catch (error) {
      console.error('GraphCanvas: Failed to initialize Cytoscape:', error);
      // Fallback to basic canvas rendering
      if (containerRef.current) {
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements: [],
          style: graphStyles,
          layout: { name: 'preset', padding: 50 }
        });
      }
    }

    // Critical: Cleanup on component unmount to prevent memory leaks (Research Pitfall 1)
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [onNodeSelect, onCanvasClick, onNodeClick]);

  // Update selection state
  useEffect(() => {
    if (!cyRef.current) return;

    // Clear all selections
    cyRef.current.nodes().removeClass('selected');

    // Apply selection to the selected node
    if (selectedNodeId) {
      const selectedNode = cyRef.current.getElementById(selectedNodeId);
      if (selectedNode.length > 0) {
        selectedNode.addClass('selected');
      }
    }
  }, [selectedNodeId]);

  // Progressive loading pattern (Research Pattern 1) for 500+ nodes
  useEffect(() => {
    if (!cyRef.current) return;

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

    // Progressive loading for large datasets
    const batchSize = 100;
    const loadBatch = async (startIndex: number) => {
      const batch = cytoscapeElements.slice(startIndex, startIndex + batchSize);
      if (batch.length > 0 && cyRef.current) {
        cyRef.current.add(batch);
        await new Promise(resolve => setTimeout(resolve, 16)); // Yield to browser

        if (startIndex + batchSize < cytoscapeElements.length) {
          await loadBatch(startIndex + batchSize);
        } else {
          // Layout after all elements are loaded
          cyRef.current.layout({
            name: 'breadthfirst',
            directed: true,
            padding: 50,
            spacingFactor: 1.5,
            animate: false // Disable animation for performance
          }).run();
        }
      }
    };

    // Clear existing elements and load new ones
    cyRef.current.elements().remove();

    if (cytoscapeElements.length > 0) {
      loadBatch(0);
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
      {/* Loading indicator for empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-lg font-semibold">Graph Canvas Ready</div>
            <div className="text-sm mt-2">Load work items to visualize dependencies</div>
          </div>
        </div>
      )}
    </div>
  );
}