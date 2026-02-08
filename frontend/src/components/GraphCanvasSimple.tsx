'use client';

import React from 'react';

interface GraphCanvasSimpleProps {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string }>;
  onNodeSelect?: (nodeId: string) => void;
  onCanvasClick?: (position: { x: number; y: number }) => void;
  onNodeClick?: (nodeId: string, position: { x: number; y: number }) => void;
  selectedNodeId?: string | null;
  isCreatingEdge?: boolean;
  className?: string;
}

/**
 * Simplified Graph Canvas component without Cytoscape.js
 * Used as a fallback to prevent DOM errors while debugging
 */
export default function GraphCanvasSimple({
  nodes,
  edges,
  onCanvasClick,
  className = '',
}: GraphCanvasSimpleProps) {
  return (
    <div
      className={`${className} cursor-grab active:cursor-grabbing bg-gray-50 border border-gray-200 rounded-lg overflow-hidden`}
      style={{
        touchAction: 'none',
        userSelect: 'none'
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onCanvasClick?.({ x, y });
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg font-semibold">Graph Canvas</div>
          <div className="text-sm mt-2">
            {nodes.length > 0 ? (
              <>Loaded {nodes.length} nodes and {edges.length} edges</>
            ) : (
              <>Load work items to visualize dependencies</>
            )}
          </div>

          {/* Simple node list when data is available */}
          {nodes.length > 0 && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="text-xs font-medium mb-2">Work Items:</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="text-xs bg-white border rounded px-2 py-1 text-left"
                  >
                    <div className="font-medium">{node.label}</div>
                    <div className="text-gray-400">Type: {node.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs mt-4 text-gray-400">
            Simplified view (Cytoscape disabled)
          </div>
        </div>
      </div>
    </div>
  );
}