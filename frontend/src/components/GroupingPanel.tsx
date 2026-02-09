'use client';

import React, { useState, useCallback, useMemo } from 'react';

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

interface Sprint {
  id: string;
  number: number;
  name: string;
  startDate: Date;
  endDate: Date;
  plannedGroupIds: string[];
  status: 'planning' | 'active' | 'complete';
}

interface FilterOptions {
  sprint?: string;
  status?: 'complete' | 'in-progress' | 'not-started' | 'on-bubble';
  deliverableType?: string;
  search?: string;
}

interface GroupTemplate {
  id: string;
  name: string;
  description: string;
  componentTypes: string[];
  estimatedEffort: number;
  priority: 'high' | 'medium' | 'low';
}

interface ComponentSuggestion {
  id: string;
  name: string;
  deliverableType: string;
  description: string;
  priority: 'must-have' | 'should-have' | 'could-have';
  estimatedComplexity: 'low' | 'medium' | 'high';
}

interface GroupingPanelProps {
  groups: ScreenGroup[];
  workItems: WorkItem[];
  sprints: Sprint[];
  selectedWorkItems?: string[];
  className?: string;

  // Event handlers
  onCreateGroup?: (name: string, description?: string, nodeIds?: string[]) => void;
  onDeleteGroup?: (groupId: string) => void;
  onAssignToSprint?: (groupIds: string[], sprintId: string) => void;
  onBulkUpdateReadiness?: (groupIds: string[], dimension: string, value: number) => void;
  onBreakIntoComponents?: (groupId: string, screenName: string) => void;
  onExportSprintPlan?: (sprintIds: string[]) => void;
  onSelectGroup?: (groupId: string) => void;
  onSelectWorkItems?: (workItemIds: string[]) => void;
}

const DEFAULT_TEMPLATES: GroupTemplate[] = [
  {
    id: 'list-screen',
    name: 'List Screen',
    description: 'Data listing screen with search and pagination',
    componentTypes: ['screen', 'service', 'api', 'test'],
    estimatedEffort: 13,
    priority: 'high'
  },
  {
    id: 'form-screen',
    name: 'Form Screen',
    description: 'Data entry form with validation',
    componentTypes: ['screen', 'service', 'api', 'test', 'dto'],
    estimatedEffort: 21,
    priority: 'high'
  },
  {
    id: 'detail-screen',
    name: 'Detail Screen',
    description: 'Read-only detail view',
    componentTypes: ['screen', 'service', 'api', 'test'],
    estimatedEffort: 8,
    priority: 'medium'
  },
  {
    id: 'dashboard-screen',
    name: 'Dashboard Screen',
    description: 'Analytics and metrics dashboard',
    componentTypes: ['screen', 'service', 'api', 'test', 'component'],
    estimatedEffort: 34,
    priority: 'high'
  }
];

export function GroupingPanel({
  groups,
  workItems,
  sprints,
  selectedWorkItems = [],
  className = '',
  onCreateGroup,
  onDeleteGroup,
  onAssignToSprint,
  onBulkUpdateReadiness,
  onBreakIntoComponents,
  onExportSprintPlan,
  onSelectGroup,
  onSelectWorkItems
}: GroupingPanelProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'create' | 'sprints'>('groups');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<GroupTemplate | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showBreakdownWizard, setShowBreakdownWizard] = useState(false);
  const [breakdownScreenName, setBreakdownScreenName] = useState('');
  const [suggestedComponents, setSuggestedComponents] = useState<ComponentSuggestion[]>([]);

  // Filter and search functionality
  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      // Text search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!group.name.toLowerCase().includes(searchLower) &&
            !group.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Sprint filter
      if (filters.sprint && filters.sprint !== 'all') {
        const sprint = sprints.find(s => s.id === filters.sprint);
        if (!sprint?.plannedGroupIds.includes(group.id)) {
          return false;
        }
      }

      // Status filter
      if (filters.status) {
        const groupItems = workItems.filter(item => group.nodeIds.includes(item.id));
        const avgReadiness = groupItems.length > 0
          ? groupItems.reduce((sum, item) => {
              const itemAvg = Object.values(item.readiness).reduce((a, b) => a + b, 0) / 6;
              return sum + itemAvg;
            }, 0) / groupItems.length
          : 0;

        switch (filters.status) {
          case 'complete':
            if (avgReadiness < 90) return false;
            break;
          case 'in-progress':
            if (avgReadiness === 0 || avgReadiness >= 90) return false;
            break;
          case 'not-started':
            if (avgReadiness > 0) return false;
            break;
          case 'on-bubble':
            if (!group.onTheBubble) return false;
            break;
        }
      }

      return true;
    });
  }, [groups, filters, workItems, sprints]);

  // Calculate group statistics
  const groupStats = useMemo(() => {
    const stats = groups.map(group => {
      const groupItems = workItems.filter(item => group.nodeIds.includes(item.id));
      const avgReadiness = groupItems.length > 0
        ? groupItems.reduce((sum, item) => {
            const itemAvg = Object.values(item.readiness).reduce((a, b) => a + b, 0) / 6;
            return sum + itemAvg;
          }, 0) / groupItems.length
        : 0;

      // Analyze component types
      const typeCount = new Map<string, number>();
      groupItems.forEach(item => {
        const type = item.deliverableType || 'component';
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      });

      const expectedTypes = ['screen', 'service', 'api', 'test'];
      const missingTypes = expectedTypes.filter(type => !typeCount.has(type));

      return {
        groupId: group.id,
        readiness: avgReadiness,
        itemCount: groupItems.length,
        missingTypes,
        isComplete: missingTypes.length === 0 && avgReadiness >= 90,
        onTheBubble: group.onTheBubble
      };
    });

    const totalGroups = stats.length;
    const completeGroups = stats.filter(s => s.isComplete).length;
    const onBubbleGroups = stats.filter(s => s.onTheBubble).length;
    const avgReadiness = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + s.readiness, 0) / stats.length)
      : 0;

    return {
      individual: stats,
      overall: {
        totalGroups,
        completeGroups,
        onBubbleGroups,
        avgReadiness
      }
    };
  }, [groups, workItems]);

  const handleCreateGroup = useCallback(() => {
    if (!newGroupName.trim()) return;

    const nodeIds = selectedTemplate
      ? [] // Will be populated by template
      : selectedWorkItems;

    onCreateGroup?.(newGroupName, newGroupDescription || undefined, nodeIds);

    // Reset form
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedTemplate(null);
    setActiveTab('groups');
  }, [newGroupName, newGroupDescription, selectedTemplate, selectedWorkItems, onCreateGroup]);

  const handleTemplateSelect = useCallback((template: GroupTemplate) => {
    setSelectedTemplate(template);
    if (!newGroupName) {
      setNewGroupName(template.name);
    }
    if (!newGroupDescription) {
      setNewGroupDescription(template.description);
    }
  }, [newGroupName, newGroupDescription]);

  const handleGroupSelect = useCallback((groupId: string, isShift: boolean = false) => {
    if (isShift && selectedGroups.length > 0) {
      // Range selection
      const groupIds = filteredGroups.map(g => g.id);
      const lastIndex = groupIds.indexOf(selectedGroups[selectedGroups.length - 1]);
      const currentIndex = groupIds.indexOf(groupId);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = groupIds.slice(start, end + 1);
      setSelectedGroups(rangeIds);
    } else if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(id => id !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }

    onSelectGroup?.(groupId);
  }, [selectedGroups, filteredGroups, onSelectGroup]);

  const handleBulkAction = useCallback((action: string, value?: any) => {
    if (selectedGroups.length === 0) return;

    switch (action) {
      case 'assign-sprint':
        if (value) onAssignToSprint?.(selectedGroups, value);
        break;
      case 'mark-complete':
        onBulkUpdateReadiness?.(selectedGroups, 'all', 100);
        break;
      case 'reset-progress':
        onBulkUpdateReadiness?.(selectedGroups, 'all', 0);
        break;
      case 'delete':
        selectedGroups.forEach(groupId => onDeleteGroup?.(groupId));
        setSelectedGroups([]);
        break;
    }
  }, [selectedGroups, onAssignToSprint, onBulkUpdateReadiness, onDeleteGroup]);

  const handleBreakIntoComponents = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setBreakdownScreenName(group.name);
    setShowBreakdownWizard(true);

    // Mock component suggestions
    const suggestions: ComponentSuggestion[] = [
      {
        id: 'screen-comp',
        name: `${group.name} Screen Component`,
        deliverableType: 'screen',
        description: `React component for ${group.name}`,
        priority: 'must-have',
        estimatedComplexity: 'medium'
      },
      {
        id: 'service',
        name: `${group.name} Service`,
        deliverableType: 'service',
        description: `Business logic service`,
        priority: 'must-have',
        estimatedComplexity: 'medium'
      },
      {
        id: 'api',
        name: `${group.name} API`,
        deliverableType: 'api',
        description: `REST API endpoints`,
        priority: 'must-have',
        estimatedComplexity: 'medium'
      },
      {
        id: 'tests',
        name: `${group.name} Tests`,
        deliverableType: 'test',
        description: `Unit and integration tests`,
        priority: 'should-have',
        estimatedComplexity: 'medium'
      }
    ];

    setSuggestedComponents(suggestions);
  }, [groups]);

  const confirmBreakdown = useCallback(() => {
    if (breakdownScreenName) {
      const groupId = groups.find(g => g.name === breakdownScreenName)?.id;
      if (groupId) {
        onBreakIntoComponents?.(groupId, breakdownScreenName);
      }
    }
    setShowBreakdownWizard(false);
    setBreakdownScreenName('');
    setSuggestedComponents([]);
  }, [breakdownScreenName, groups, onBreakIntoComponents]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Panel Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Screen Groups</h2>

          {/* Tab Navigation */}
          <div className="flex space-x-1">
            {(['groups', 'create', 'sprints'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">{groupStats.overall.totalGroups}</div>
            <div className="text-sm text-gray-600">Total Groups</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{groupStats.overall.completeGroups}</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{groupStats.overall.onBubbleGroups}</div>
            <div className="text-sm text-gray-600">On Bubble</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{groupStats.overall.avgReadiness}%</div>
            <div className="text-sm text-gray-600">Avg Readiness</div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            {/* Filters */}
            <div className="mb-4 space-y-3">
              <div className="flex space-x-3">
                {/* Search */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Sprint Filter */}
                <select
                  value={filters.sprint || 'all'}
                  onChange={(e) => setFilters({ ...filters, sprint: e.target.value === 'all' ? undefined : e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sprints</option>
                  {sprints.map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      Sprint {sprint.number}: {sprint.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filters.status || 'all'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value === 'all' ? undefined : e.target.value as any })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="complete">Complete</option>
                  <option value="in-progress">In Progress</option>
                  <option value="not-started">Not Started</option>
                  <option value="on-bubble">On Bubble</option>
                </select>
              </div>

              {/* Bulk Actions */}
              {selectedGroups.length > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    {selectedGroups.length} groups selected
                  </span>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction('assign-sprint', e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="px-2 py-1 text-sm border border-blue-200 rounded"
                  >
                    <option value="">Assign to Sprint</option>
                    {sprints.map(sprint => (
                      <option key={sprint.id} value={sprint.id}>
                        Sprint {sprint.number}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleBulkAction('mark-complete')}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Mark Complete
                  </button>

                  <button
                    onClick={() => handleBulkAction('reset-progress')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => setSelectedGroups([])}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            {/* Groups List */}
            <div className="space-y-2">
              {filteredGroups.map((group) => {
                const stats = groupStats.individual.find(s => s.groupId === group.id);
                const isSelected = selectedGroups.includes(group.id);

                return (
                  <div
                    key={group.id}
                    onClick={(e) => handleGroupSelect(group.id, e.shiftKey)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : group.onTheBubble
                          ? 'border-red-300 bg-red-50 hover:bg-red-100'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{group.name}</h3>
                          {group.onTheBubble && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              On Bubble
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{stats?.itemCount || 0} items</span>
                          {stats?.missingTypes.length ? (
                            <span className="text-yellow-600">
                              Missing: {stats.missingTypes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-green-600">Complete components</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Readiness */}
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(stats?.readiness || 0)}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div
                              className="h-1 rounded-full bg-blue-500"
                              style={{ width: `${stats?.readiness || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBreakIntoComponents(group.id);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {filters.search || filters.sprint || filters.status
                    ? 'No groups match the current filters'
                    : 'No groups created yet'
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Template Selection */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Choose Template</h3>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="text-xs text-gray-500">
                        {template.componentTypes.length} components
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {template.estimatedEffort} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group Details */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Group Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter group name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description..."
                  />
                </div>
              </div>
            </div>

            {/* Selected Work Items */}
            {selectedWorkItems.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">
                  Selected Work Items ({selectedWorkItems.length})
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {selectedWorkItems.map(itemId => {
                    const item = workItems.find(w => w.id === itemId);
                    return (
                      <div key={itemId} className="text-sm text-gray-700">
                        {item?.title || itemId}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create Button */}
            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Group
            </button>
          </div>
        )}

        {/* Sprints Tab */}
        {activeTab === 'sprints' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Sprint Assignment</h3>
              <button
                onClick={() => onExportSprintPlan?.(sprints.map(s => s.id))}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
              >
                Export Plan
              </button>
            </div>

            {sprints.map((sprint) => {
              const assignedGroups = groups.filter(g => sprint.plannedGroupIds.includes(g.id));
              const totalEffort = assignedGroups.reduce((sum, g) => sum + g.nodeIds.length, 0);

              return (
                <div key={sprint.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Sprint {sprint.number}: {sprint.name}
                      </h4>
                      <div className="text-sm text-gray-600">
                        {sprint.startDate.toLocaleDateString()} - {sprint.endDate.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {assignedGroups.length} groups
                      </div>
                      <div className="text-xs text-gray-500">
                        {totalEffort} estimated points
                      </div>
                    </div>
                  </div>

                  {assignedGroups.length > 0 ? (
                    <div className="space-y-2">
                      {assignedGroups.map((group) => (
                        <div key={group.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{group.name}</span>
                          <span className="text-sm text-gray-600">{group.nodeIds.length} items</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No groups assigned to this sprint
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Component Breakdown Wizard */}
      {showBreakdownWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Break into Components
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screen Name
              </label>
              <input
                type="text"
                value={breakdownScreenName}
                onChange={(e) => setBreakdownScreenName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Suggested Components</h4>
              <div className="space-y-2">
                {suggestedComponents.map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{component.name}</div>
                      <div className="text-xs text-gray-600">{component.description}</div>
                    </div>
                    <div className="text-xs">
                      <span className={`
                        px-2 py-1 rounded-full
                        ${component.priority === 'must-have' ? 'bg-red-100 text-red-700' :
                          component.priority === 'should-have' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'}
                      `}>
                        {component.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowBreakdownWizard(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBreakdown}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Components
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupingPanel;