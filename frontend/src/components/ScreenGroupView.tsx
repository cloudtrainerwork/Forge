'use client';

import React, { useState, useCallback, useMemo } from 'react';
// @ts-ignore
import { useDrop } from 'react-dnd';

interface WorkItem {
  id: string;
  title?: string;
  description?: string;
  deliverableType?: string;
  readiness: {
    design: number;
    frontend: number;
    backend: number;
    integration: number;
    test: number;
    deployment: number;
  };
  groupId?: string;
  sprintId?: string;
  parentId?: string;
}

interface ScreenGroup {
  id: string;
  name: string;
  description?: string;
  nodeIds: string[];
  onTheBubble: boolean;
  colorConfig: {
    primary: string;
    border: string;
    background: string;
  };
  parentGroupId?: string;
  childGroupIds: string[];
}

interface ScreenGroupViewProps {
  group: ScreenGroup;
  workItems: WorkItem[];
  isExpanded?: boolean;
  isSelected?: boolean;
  showComponentBreakdown?: boolean;
  onToggleExpanded?: (groupId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onAddNodes?: (groupId: string, nodeIds: string[]) => void;
  onRemoveNodes?: (groupId: string, nodeIds: string[]) => void;
  onMarkOnBubble?: (groupId: string, onBubble: boolean) => void;
  onBreakIntoComponents?: (groupId: string) => void;
  onBulkUpdateReadiness?: (groupId: string, dimension: string, value: number) => void;
  className?: string;
}

export function ScreenGroupView({
  group,
  workItems,
  isExpanded = false,
  isSelected = false,
  showComponentBreakdown = true,
  onToggleExpanded,
  onSelectGroup,
  onAddNodes,
  onRemoveNodes,
  onMarkOnBubble,
  onBreakIntoComponents,
  onBulkUpdateReadiness,
  className = ''
}: ScreenGroupViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter work items that belong to this group
  const groupWorkItems = useMemo(() =>
    workItems.filter(item => group.nodeIds.includes(item.id)),
    [workItems, group.nodeIds]
  );

  // Calculate aggregated readiness
  const groupReadiness = useMemo(() => {
    if (groupWorkItems.length === 0) {
      return {
        overall: 0,
        byDimension: {
          design: 0,
          frontend: 0,
          backend: 0,
          integration: 0,
          test: 0,
          deployment: 0
        },
        completedItems: 0,
        inProgressItems: 0,
        notStartedItems: 0
      };
    }

    const totalReadiness = groupWorkItems.reduce((sum, item) => {
      const itemTotal = Object.values(item.readiness).reduce((a, b) => a + b, 0) / 6;
      return sum + itemTotal;
    }, 0);

    const byDimension = {
      design: groupWorkItems.reduce((sum, item) => sum + item.readiness.design, 0) / groupWorkItems.length,
      frontend: groupWorkItems.reduce((sum, item) => sum + item.readiness.frontend, 0) / groupWorkItems.length,
      backend: groupWorkItems.reduce((sum, item) => sum + item.readiness.backend, 0) / groupWorkItems.length,
      integration: groupWorkItems.reduce((sum, item) => sum + item.readiness.integration, 0) / groupWorkItems.length,
      test: groupWorkItems.reduce((sum, item) => sum + item.readiness.test, 0) / groupWorkItems.length,
      deployment: groupWorkItems.reduce((sum, item) => sum + item.readiness.deployment, 0) / groupWorkItems.length
    };

    const completedItems = groupWorkItems.filter(item =>
      Object.values(item.readiness).every(val => val === 100)
    ).length;

    const notStartedItems = groupWorkItems.filter(item =>
      Object.values(item.readiness).every(val => val === 0)
    ).length;

    const inProgressItems = groupWorkItems.length - completedItems - notStartedItems;

    return {
      overall: Math.round(totalReadiness / groupWorkItems.length),
      byDimension,
      completedItems,
      inProgressItems,
      notStartedItems
    };
  }, [groupWorkItems]);

  // Component breakdown analysis
  const componentAnalysis = useMemo(() => {
    const typeCount = new Map<string, number>();
    groupWorkItems.forEach(item => {
      const type = item.deliverableType || 'component';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    const expectedComponents = ['screen', 'service', 'api', 'test', 'dto'];
    const missingComponents = expectedComponents.filter(type => !typeCount.has(type));

    return {
      present: Array.from(typeCount.entries()),
      missing: missingComponents,
      isComplete: missingComponents.length === 0
    };
  }, [groupWorkItems]);

  // Drag and drop setup
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'work-item',
    drop: (item: { id: string }) => {
      if (onAddNodes && !group.nodeIds.includes(item.id)) {
        onAddNodes(group.id, [item.id]);
      }
    },
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleToggleExpanded = useCallback(() => {
    onToggleExpanded?.(group.id);
  }, [onToggleExpanded, group.id]);

  const handleSelectGroup = useCallback(() => {
    onSelectGroup?.(group.id);
  }, [onSelectGroup, group.id]);

  const handleRemoveItem = useCallback((itemId: string) => {
    onRemoveNodes?.(group.id, [itemId]);
  }, [onRemoveNodes, group.id]);

  const handleToggleBubble = useCallback(() => {
    onMarkOnBubble?.(group.id, !group.onTheBubble);
  }, [onMarkOnBubble, group.id, group.onTheBubble]);

  const handleBreakIntoComponents = useCallback(() => {
    onBreakIntoComponents?.(group.id);
  }, [onBreakIntoComponents, group.id]);

  const handleBulkUpdate = useCallback((dimension: string, value: number) => {
    onBulkUpdateReadiness?.(group.id, dimension, value);
  }, [onBulkUpdateReadiness, group.id]);

  // Get readiness color based on percentage
  const getReadinessColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Yellow
    if (percentage >= 30) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Get border style for group
  const getBorderStyle = () => {
    let borderColor = group.colorConfig.border;
    let borderWidth = '2px';

    if (group.onTheBubble) {
      borderColor = '#EF4444'; // Red for "on the bubble"
      borderWidth = '3px';
    }

    if (isSelected) {
      borderWidth = '3px';
    }

    if (isOver) {
      borderColor = '#3B82F6'; // Blue for drop target
    }

    return {
      borderColor,
      borderWidth,
      borderStyle: 'solid'
    };
  };

  return (
    <div
      ref={drop}
      className={`
        bg-white rounded-lg shadow-md transition-all duration-200 hover:shadow-lg
        ${isHovered ? 'transform -translate-y-1' : ''}
        ${className}
      `}
      style={{
        backgroundColor: group.colorConfig.background,
        ...getBorderStyle()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleSelectGroup}
    >
      {/* Group Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Expand/Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpanded();
              }}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
                  isExpanded ? 'transform rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Group Name and Info */}
            <div>
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-gray-600 mt-1">{group.description}</p>
              )}
            </div>

            {/* On The Bubble Badge */}
            {group.onTheBubble && (
              <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                On the Bubble
              </div>
            )}
          </div>

          {/* Group Actions */}
          <div className="flex items-center space-x-2">
            {/* Overall Progress */}
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium">
                {groupReadiness.overall}%
              </div>
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${groupReadiness.overall}%`,
                    backgroundColor: getReadinessColor(groupReadiness.overall)
                  }}
                />
              </div>
            </div>

            {/* Node Count */}
            <div className="text-sm text-gray-500">
              {groupWorkItems.length} items
            </div>

            {/* More Actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBulkActions(!showBulkActions);
              }}
              className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Bulk Actions</h4>
              <button
                onClick={handleToggleBubble}
                className={`px-3 py-1 text-xs rounded-full ${
                  group.onTheBubble
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {group.onTheBubble ? 'Remove from Bubble' : 'Mark on Bubble'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(groupReadiness.byDimension).map(([dimension, value]) => (
                <div key={dimension} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{dimension}:</span>
                  <div className="flex items-center space-x-1">
                    <span>{Math.round(value)}%</span>
                    <button
                      onClick={() => handleBulkUpdate(dimension, 100)}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {showComponentBreakdown && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBreakIntoComponents();
                }}
                className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Break Into Components
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Component Breakdown */}
          {showComponentBreakdown && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Component Breakdown</h4>

              {/* Present Components */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {componentAnalysis.present.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>

              {/* Missing Components Warning */}
              {componentAnalysis.missing.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                  <div className="text-yellow-800 text-xs font-medium mb-1">
                    Missing Components:
                  </div>
                  <div className="text-yellow-700 text-xs">
                    {componentAnalysis.missing.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Work Items List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Work Items ({groupWorkItems.length})</h4>
            {groupWorkItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.title || item.id}</div>
                  {item.description && (
                    <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                  )}
                  {item.deliverableType && (
                    <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full mt-1">
                      {item.deliverableType}
                    </div>
                  )}
                </div>

                {/* Item Progress */}
                <div className="flex items-center space-x-2">
                  <div className="text-xs">
                    {Math.round(
                      Object.values(item.readiness).reduce((a, b) => a + b, 0) / 6
                    )}%
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(item.id);
                    }}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Drop Zone for New Items */}
            {groupWorkItems.length === 0 || isOver ? (
              <div className={`
                border-2 border-dashed rounded-lg p-6 text-center
                ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
              `}>
                <div className="text-gray-500 text-sm">
                  {isOver ? 'Drop work items here' : 'Drag work items here to add to group'}
                </div>
              </div>
            ) : null}
          </div>

          {/* Group Statistics */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {groupReadiness.completedItems}
                </div>
                <div className="text-xs text-gray-600">Complete</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">
                  {groupReadiness.inProgressItems}
                </div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-600">
                  {groupReadiness.notStartedItems}
                </div>
                <div className="text-xs text-gray-600">Not Started</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dependency Lines Placeholder */}
      {/* This would be implemented with SVG overlays connecting groups */}
    </div>
  );
}

export default ScreenGroupView;