'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';

interface Sprint {
  id: string;
  number: number;
  name: string;
  startDate: Date;
  endDate: Date;
  plannedGroupIds: string[];
  status: 'planning' | 'active' | 'complete';
  capacity?: number;
  plannedVelocity?: number;
  goal?: string;
}

interface ScreenGroup {
  id: string;
  name: string;
  onTheBubble: boolean;
  nodeIds: string[];
  colorConfig: {
    primary: string;
    border: string;
    background: string;
  };
}

interface TimelineEntry {
  sprint: Sprint;
  groups: GroupTimelineInfo[];
  capacity: number;
  plannedVelocity: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  position: {
    startX: number;
    endX: number;
    width: number;
  };
}

interface GroupTimelineInfo {
  group: ScreenGroup;
  estimatedEffort: number;
  readinessPercentage: number;
  onTheBubble: boolean;
  blockers: string[];
}

interface Milestone {
  id: string;
  name: string;
  date: Date;
  type: 'release' | 'demo' | 'review' | 'deadline';
  associatedSprints: string[];
}

interface SprintTimelineProps {
  sprints: Sprint[];
  groups: ScreenGroup[];
  milestones?: Milestone[];
  timelineData?: TimelineEntry[];
  className?: string;
  showCapacityIndicators?: boolean;
  showVelocityChart?: boolean;
  showCriticalPath?: boolean;
  zoomLevel?: number;
  onSprintClick?: (sprintId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onMoveGroupBetweenSprints?: (groupId: string, fromSprintId: string, toSprintId: string) => void;
  onUpdateSprintDates?: (sprintId: string, startDate: Date, endDate: Date) => void;
  onCreateMilestone?: (date: Date, type: string) => void;
}

// Draggable Group Component
function DraggableGroup({
  group,
  sprintId,
  estimatedEffort,
  readinessPercentage,
  onTheBubble,
  onGroupClick
}: {
  group: ScreenGroup;
  sprintId: string;
  estimatedEffort: number;
  readinessPercentage: number;
  onTheBubble: boolean;
  onGroupClick?: (groupId: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'group',
    item: { groupId: group.id, sourceSprintId: sprintId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getReadinessColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981'; // Green
    if (percentage >= 60) return '#F59E0B'; // Yellow
    if (percentage >= 30) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  return (
    <div
      ref={drag}
      onClick={() => onGroupClick?.(group.id)}
      className={`
        relative p-2 mb-2 rounded cursor-pointer transition-all duration-200
        ${isDragging ? 'opacity-50 transform scale-95' : 'hover:shadow-md'}
        ${onTheBubble ? 'border-2 border-red-500 border-dashed' : 'border border-gray-200'}
      `}
      style={{
        backgroundColor: group.colorConfig.background,
        borderColor: onTheBubble ? '#EF4444' : group.colorConfig.border
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{group.name}</div>
          <div className="text-xs text-gray-500">
            {estimatedEffort} pts • {group.nodeIds.length} items
          </div>
        </div>

        <div className="ml-2 flex items-center space-x-2">
          {/* Readiness Indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getReadinessColor(readinessPercentage) }}
            title={`${readinessPercentage}% ready`}
          />

          {/* On the bubble indicator */}
          {onTheBubble && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="On the bubble" />
          )}
        </div>
      </div>
    </div>
  );
}

// Droppable Sprint Lane Component
function SprintLane({
  timelineEntry,
  onMoveGroup,
  onGroupClick,
  onSprintClick
}: {
  timelineEntry: TimelineEntry;
  onMoveGroup?: (groupId: string, fromSprintId: string, toSprintId: string) => void;
  onGroupClick?: (groupId: string) => void;
  onSprintClick?: (sprintId: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'group',
    drop: (item: { groupId: string; sourceSprintId: string }) => {
      if (item.sourceSprintId !== timelineEntry.sprint.id) {
        onMoveGroup?.(item.groupId, item.sourceSprintId, timelineEntry.sprint.id);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const { sprint, groups, capacity, plannedVelocity, utilizationPercentage, isOverloaded } = timelineEntry;

  return (
    <div
      ref={drop}
      className={`
        relative min-h-32 p-3 rounded-lg border-2 transition-all duration-200
        ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}
        ${isOverloaded ? 'bg-red-50 border-red-300' : ''}
      `}
    >
      {/* Sprint Header */}
      <div
        className="mb-3 cursor-pointer"
        onClick={() => onSprintClick?.(sprint.id)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              Sprint {sprint.number}: {sprint.name}
            </h3>
            <div className="text-sm text-gray-500">
              {sprint.startDate.toLocaleDateString()} - {sprint.endDate.toLocaleDateString()}
            </div>
          </div>

          {/* Capacity Indicator */}
          <div className="text-right">
            <div className={`text-sm font-medium ${isOverloaded ? 'text-red-600' : 'text-gray-900'}`}>
              {plannedVelocity} / {capacity} pts
            </div>
            <div className="text-xs text-gray-500">
              {utilizationPercentage}% capacity
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isOverloaded ? 'bg-red-500' : utilizationPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
          />
          {isOverloaded && (
            <div
              className="h-2 bg-red-300 rounded-full -mt-2"
              style={{ width: `${utilizationPercentage}%` }}
            />
          )}
        </div>
      </div>

      {/* Groups in Sprint */}
      <div className="space-y-1">
        {groups.map((groupInfo) => (
          <DraggableGroup
            key={groupInfo.group.id}
            group={groupInfo.group}
            sprintId={sprint.id}
            estimatedEffort={groupInfo.estimatedEffort}
            readinessPercentage={groupInfo.readinessPercentage}
            onTheBubble={groupInfo.onTheBubble}
            onGroupClick={onGroupClick}
          />
        ))}

        {/* Drop Zone */}
        {(groups.length === 0 || isOver) && (
          <div className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200
            ${isOver ? 'border-blue-400 bg-blue-100' : 'border-gray-300 bg-gray-50'}
          `}>
            <div className="text-gray-500 text-sm">
              {isOver ? 'Drop group here' : 'Drag groups here to assign to sprint'}
            </div>
          </div>
        )}
      </div>

      {/* Sprint Status Badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${sprint.status === 'active' ? 'bg-green-100 text-green-800' :
              sprint.status === 'complete' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'}
          `}
        >
          {sprint.status}
        </span>
      </div>
    </div>
  );
}

export function SprintTimeline({
  sprints,
  groups,
  milestones = [],
  timelineData,
  className = '',
  showCapacityIndicators = true,
  showVelocityChart = false,
  showCriticalPath = false,
  zoomLevel = 1,
  onSprintClick,
  onGroupClick,
  onMoveGroupBetweenSprints,
  onUpdateSprintDates,
  onCreateMilestone
}: SprintTimelineProps) {
  const [currentDate] = useState(new Date());
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Generate timeline data if not provided
  const computedTimelineData = useMemo(() => {
    if (timelineData) return timelineData;

    // Sort sprints by start date
    const sortedSprints = [...sprints].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    const earliestStart = sortedSprints[0]?.startDate || new Date();
    const latestEnd = sortedSprints[sortedSprints.length - 1]?.endDate || new Date();
    const totalDuration = Math.ceil(
      (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    return sortedSprints.map((sprint): TimelineEntry => {
      const sprintGroups = groups.filter(group =>
        sprint.plannedGroupIds.includes(group.id)
      );

      const sprintGroupsInfo: GroupTimelineInfo[] = sprintGroups.map(group => ({
        group,
        estimatedEffort: Math.max(group.nodeIds.length, 1), // Simple estimation
        readinessPercentage: Math.floor(Math.random() * 100), // Placeholder
        onTheBubble: group.onTheBubble,
        blockers: [] // Placeholder
      }));

      const totalEffort = sprintGroupsInfo.reduce((sum, info) => sum + info.estimatedEffort, 0);
      const capacity = sprint.capacity || 40;
      const plannedVelocity = sprint.plannedVelocity || totalEffort;
      const utilizationPercentage = capacity > 0 ? Math.round((plannedVelocity / capacity) * 100) : 0;

      // Calculate position
      const startOffset = Math.ceil(
        (sprint.startDate.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const duration = Math.ceil(
        (sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const startX = totalDuration > 0 ? (startOffset / totalDuration) * 100 : 0;
      const width = totalDuration > 0 ? (duration / totalDuration) * 100 : 100;

      return {
        sprint,
        groups: sprintGroupsInfo,
        capacity,
        plannedVelocity,
        utilizationPercentage,
        isOverloaded: utilizationPercentage > 100,
        position: {
          startX,
          endX: startX + width,
          width
        }
      };
    });
  }, [sprints, groups, timelineData]);

  const handleSprintClick = useCallback((sprintId: string) => {
    setSelectedSprintId(selectedSprintId === sprintId ? null : sprintId);
    onSprintClick?.(sprintId);
  }, [selectedSprintId, onSprintClick]);

  const handleMoveGroup = useCallback((groupId: string, fromSprintId: string, toSprintId: string) => {
    onMoveGroupBetweenSprints?.(groupId, fromSprintId, toSprintId);
  }, [onMoveGroupBetweenSprints]);

  // Calculate timeline scale for milestones
  const timelineScale = useMemo(() => {
    if (computedTimelineData.length === 0) return { start: new Date(), end: new Date(), duration: 0 };

    const start = Math.min(...computedTimelineData.map(entry => entry.sprint.startDate.getTime()));
    const end = Math.max(...computedTimelineData.map(entry => entry.sprint.endDate.getTime()));

    return {
      start: new Date(start),
      end: new Date(end),
      duration: Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    };
  }, [computedTimelineData]);

  // Get milestone position on timeline
  const getMilestonePosition = useCallback((date: Date) => {
    const milestoneTime = date.getTime();
    const startTime = timelineScale.start.getTime();
    const duration = timelineScale.duration;

    if (duration === 0) return 0;

    const offset = Math.ceil((milestoneTime - startTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(100, (offset / duration) * 100));
  }, [timelineScale]);

  // Get current date position
  const currentDatePosition = getMilestonePosition(currentDate);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sprint Timeline</h2>
          <p className="text-sm text-gray-600">
            {timelineScale.duration} days • {computedTimelineData.length} sprints
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowMilestones(!showMilestones)}
            className={`px-3 py-2 text-sm rounded-lg border ${
              showMilestones
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            Milestones
          </button>

          {showVelocityChart && (
            <button className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Velocity Chart
            </button>
          )}

          <div className="text-sm text-gray-500">
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div
        ref={timelineRef}
        className="relative bg-white rounded-lg border border-gray-200 overflow-hidden"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
      >
        {/* Timeline Header with Dates */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="relative h-8">
            {/* Date Markers */}
            {computedTimelineData.map((entry, index) => (
              <div
                key={entry.sprint.id}
                className="absolute top-0 text-xs text-gray-600"
                style={{ left: `${entry.position.startX}%` }}
              >
                <div className="font-medium">
                  {entry.sprint.startDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-gray-400">
                  Sprint {entry.sprint.number}
                </div>
              </div>
            ))}

            {/* Current Date Marker */}
            {currentDatePosition > 0 && currentDatePosition < 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                style={{ left: `${currentDatePosition}%` }}
              >
                <div className="absolute -top-1 -left-6 w-12 text-center">
                  <div className="text-xs font-medium text-red-600 bg-white px-1 rounded shadow">
                    Today
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Milestones Row */}
        {showMilestones && milestones.length > 0 && (
          <div className="relative bg-blue-50 border-b border-blue-200 p-2">
            <div className="text-xs font-medium text-blue-800 mb-2">Milestones</div>
            <div className="relative h-6">
              {milestones.map((milestone) => {
                const position = getMilestonePosition(milestone.date);
                if (position < 0 || position > 100) return null;

                return (
                  <div
                    key={milestone.id}
                    className="absolute top-0"
                    style={{ left: `${position}%` }}
                  >
                    <div className={`
                      w-3 h-3 rounded-full
                      ${milestone.type === 'release' ? 'bg-green-500' :
                        milestone.type === 'demo' ? 'bg-blue-500' :
                        milestone.type === 'deadline' ? 'bg-red-500' :
                        'bg-yellow-500'}
                    `} />
                    <div className="absolute -top-6 -left-8 w-16 text-center">
                      <div className="text-xs font-medium text-gray-700 bg-white px-1 rounded shadow">
                        {milestone.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sprint Lanes */}
        <div className="p-4">
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${computedTimelineData.length}, 1fr)` }}>
            {computedTimelineData.map((entry) => (
              <SprintLane
                key={entry.sprint.id}
                timelineEntry={entry}
                onMoveGroup={handleMoveGroup}
                onGroupClick={onGroupClick}
                onSprintClick={handleSprintClick}
              />
            ))}
          </div>

          {/* Empty State */}
          {computedTimelineData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No sprints configured</div>
              <div className="text-gray-400 text-sm mt-2">
                Create sprints and assign groups to see the timeline
              </div>
            </div>
          )}
        </div>

        {/* Critical Path Overlay */}
        {showCriticalPath && (
          <div className="absolute inset-0 pointer-events-none">
            {/* This would render SVG lines showing critical path dependencies */}
            <svg className="w-full h-full">
              {/* Placeholder for critical path visualization */}
            </svg>
          </div>
        )}
      </div>

      {/* Timeline Summary */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {computedTimelineData.reduce((sum, entry) => sum + entry.groups.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Groups</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">
            {computedTimelineData.reduce((sum, entry) => sum + entry.plannedVelocity, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Velocity</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">
            {computedTimelineData.filter(entry => entry.isOverloaded).length}
          </div>
          <div className="text-sm text-gray-600">Overloaded Sprints</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {computedTimelineData.reduce(
              (sum, entry) => sum + entry.groups.filter(g => g.onTheBubble).length,
              0
            )}
          </div>
          <div className="text-sm text-gray-600">On the Bubble</div>
        </div>
      </div>
    </div>
  );
}

export default SprintTimeline;