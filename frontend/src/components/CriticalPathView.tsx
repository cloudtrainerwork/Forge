'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Types for critical path data
interface CriticalPathNode {
  workItemId: string;
  title: string;
  duration: number;
  startDate: Date;
  endDate: Date;
  dependencies: string[];
  slackTime: number;
  isCritical: boolean;
  completionPercentage: number;
  blockers: string[];
  screenGroup: string;
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: number;
}

interface AlternativePath {
  name: string;
  duration: number;
  items: CriticalPathNode[];
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  timeSavings: number;
  resourceRequirements: string[];
}

interface PathOptimization {
  type: 'parallel' | 'resource' | 'scope' | 'dependency';
  description: string;
  impact: number; // days saved
  effort: number; // effort required (1-10)
  riskLevel: 'low' | 'medium' | 'high';
  affectedItems: string[];
  implementation: string[];
}

interface WhatIfScenario {
  name: string;
  description: string;
  changes: ScenarioChange[];
  impact: {
    durationChange: number;
    riskChange: number;
    effortChange: number;
  };
  probability: number;
}

interface ScenarioChange {
  type: 'duration' | 'resource' | 'dependency' | 'scope';
  itemId: string;
  change: number | string;
  reason: string;
}

interface CriticalPathViewProps {
  projectId?: string;
  sprintId?: string;
  onItemClick?: (item: CriticalPathNode) => void;
  onOptimizationApply?: (optimization: PathOptimization) => void;
  onScenarioRun?: (scenario: WhatIfScenario) => void;
}

const PRIORITY_COLORS = {
  low: '#10B981',       // Green
  medium: '#F59E0B',    // Yellow
  high: '#EF4444',      // Red
  critical: '#7C2D12'   // Dark red
};

const STATUS_COLORS = {
  blocked: '#EF4444',      // Red
  critical: '#DC2626',     // Dark red
  'on-track': '#10B981',   // Green
  'at-risk': '#F59E0B'     // Yellow
};

export default function CriticalPathView({
  projectId,
  sprintId,
  onItemClick,
  onOptimizationApply,
  onScenarioRun
}: CriticalPathViewProps) {
  const [criticalPath, setCriticalPath] = useState<CriticalPathNode[]>([]);
  const [alternativePaths, setAlternativePaths] = useState<AlternativePath[]>([]);
  const [optimizations, setOptimizations] = useState<PathOptimization[]>([]);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'timeline' | 'network' | 'gantt' | 'optimization'>('timeline');
  const [selectedNode, setSelectedNode] = useState<CriticalPathNode | null>(null);
  const [showOptimizations, setShowOptimizations] = useState(false);
  const [activeScenario, setActiveScenario] = useState<WhatIfScenario | null>(null);
  const [timelineScale, setTimelineScale] = useState<'days' | 'weeks' | 'months'>('days');

  // Fetch critical path data
  useEffect(() => {
    const fetchCriticalPathData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock data - in real app, this would fetch from API
        const mockCriticalPath: CriticalPathNode[] = [
          {
            workItemId: 'auth-001',
            title: 'User Authentication System',
            duration: 8,
            startDate: new Date('2024-02-01'),
            endDate: new Date('2024-02-08'),
            dependencies: [],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 25,
            blockers: ['API design review pending'],
            screenGroup: 'Authentication',
            assignedTo: 'John Doe',
            priority: 'critical',
            estimatedEffort: 32
          },
          {
            workItemId: 'auth-002',
            title: 'JWT Token Management',
            duration: 5,
            startDate: new Date('2024-02-09'),
            endDate: new Date('2024-02-13'),
            dependencies: ['auth-001'],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 0,
            blockers: [],
            screenGroup: 'Authentication',
            assignedTo: 'Jane Smith',
            priority: 'high',
            estimatedEffort: 20
          },
          {
            workItemId: 'dash-001',
            title: 'Main Dashboard API',
            duration: 10,
            startDate: new Date('2024-02-14'),
            endDate: new Date('2024-02-23'),
            dependencies: ['auth-002'],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 0,
            blockers: [],
            screenGroup: 'Dashboard',
            assignedTo: 'Mike Johnson',
            priority: 'high',
            estimatedEffort: 40
          },
          {
            workItemId: 'dash-002',
            title: 'Dashboard UI Components',
            duration: 12,
            startDate: new Date('2024-02-24'),
            endDate: new Date('2024-03-07'),
            dependencies: ['dash-001'],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 0,
            blockers: [],
            screenGroup: 'Dashboard',
            assignedTo: 'Sarah Wilson',
            priority: 'medium',
            estimatedEffort: 48
          },
          {
            workItemId: 'int-001',
            title: 'Frontend-Backend Integration',
            duration: 6,
            startDate: new Date('2024-03-08'),
            endDate: new Date('2024-03-13'),
            dependencies: ['dash-002'],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 0,
            blockers: [],
            screenGroup: 'Integration',
            assignedTo: 'Tom Brown',
            priority: 'critical',
            estimatedEffort: 24
          },
          {
            workItemId: 'test-001',
            title: 'End-to-End Testing',
            duration: 8,
            startDate: new Date('2024-03-14'),
            endDate: new Date('2024-03-21'),
            dependencies: ['int-001'],
            slackTime: 0,
            isCritical: true,
            completionPercentage: 0,
            blockers: [],
            screenGroup: 'Testing',
            assignedTo: 'Lisa Davis',
            priority: 'high',
            estimatedEffort: 32
          }
        ];

        const mockAlternativePaths: AlternativePath[] = [
          {
            name: 'Parallel Development Path',
            duration: 35,
            items: mockCriticalPath.filter(item => !item.isCritical).slice(0, 3) as CriticalPathNode[],
            riskLevel: 'medium',
            description: 'Develop UI components in parallel with API development',
            timeSavings: 8,
            resourceRequirements: ['Additional frontend developer', 'Mock API endpoints']
          },
          {
            name: 'MVP Fast Track',
            duration: 28,
            items: mockCriticalPath.slice(0, 4) as CriticalPathNode[],
            riskLevel: 'high',
            description: 'Reduce scope to core MVP features only',
            timeSavings: 15,
            resourceRequirements: ['Product owner approval', 'Reduced testing scope']
          }
        ];

        const mockOptimizations: PathOptimization[] = [
          {
            type: 'parallel',
            description: 'Run UI development parallel to API development using mock endpoints',
            impact: 8,
            effort: 6,
            riskLevel: 'medium',
            affectedItems: ['dash-002', 'dash-001'],
            implementation: [
              'Create mock API endpoints',
              'Set up parallel development branches',
              'Define interface contracts early'
            ]
          },
          {
            type: 'resource',
            description: 'Add senior developer to authentication module',
            impact: 3,
            effort: 3,
            riskLevel: 'low',
            affectedItems: ['auth-001', 'auth-002'],
            implementation: [
              'Hire contractor or reassign team member',
              'Knowledge transfer session',
              'Pair programming setup'
            ]
          },
          {
            type: 'scope',
            description: 'Defer advanced authentication features to phase 2',
            impact: 5,
            effort: 2,
            riskLevel: 'low',
            affectedItems: ['auth-001'],
            implementation: [
              'Stakeholder approval',
              'Update requirements document',
              'Adjust test cases'
            ]
          },
          {
            type: 'dependency',
            description: 'Remove hard dependency between dashboard API and UI components',
            impact: 10,
            effort: 7,
            riskLevel: 'high',
            affectedItems: ['dash-001', 'dash-002'],
            implementation: [
              'Create API specification first',
              'Build mock server',
              'Implement contract testing'
            ]
          }
        ];

        const mockScenarios: WhatIfScenario[] = [
          {
            name: 'Team Member Unavailable',
            description: 'What if key team member becomes unavailable for 1 week?',
            changes: [
              {
                type: 'duration',
                itemId: 'auth-001',
                change: 5,
                reason: 'Reassignment and knowledge transfer delay'
              }
            ],
            impact: {
              durationChange: 5,
              riskChange: 0.3,
              effortChange: 1.2
            },
            probability: 0.25
          },
          {
            name: 'Scope Increase',
            description: 'What if we add OAuth integration requirement?',
            changes: [
              {
                type: 'duration',
                itemId: 'auth-001',
                change: 8,
                reason: 'Additional OAuth integration complexity'
              }
            ],
            impact: {
              durationChange: 8,
              riskChange: 0.4,
              effortChange: 1.5
            },
            probability: 0.15
          },
          {
            name: 'Performance Issues',
            description: 'What if we discover performance bottlenecks?',
            changes: [
              {
                type: 'duration',
                itemId: 'dash-001',
                change: 6,
                reason: 'Performance optimization and caching layer'
              }
            ],
            impact: {
              durationChange: 6,
              riskChange: 0.2,
              effortChange: 1.3
            },
            probability: 0.3
          }
        ];

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        setCriticalPath(mockCriticalPath);
        setAlternativePaths(mockAlternativePaths);
        setOptimizations(mockOptimizations);
        setScenarios(mockScenarios);
      } catch (err) {
        setError('Failed to load critical path data');
        console.error('Error fetching critical path:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalPathData();
  }, [projectId, sprintId]);

  const totalDuration = criticalPath.reduce((sum, item) => sum + item.duration, 0);
  const totalEffort = criticalPath.reduce((sum, item) => sum + item.estimatedEffort, 0);
  const blockedItems = criticalPath.filter(item => item.blockers.length > 0);
  const avgCompletion = criticalPath.length > 0
    ? criticalPath.reduce((sum, item) => sum + item.completionPercentage, 0) / criticalPath.length
    : 0;

  const handleNodeClick = (node: CriticalPathNode) => {
    setSelectedNode(node);
    if (onItemClick) {
      onItemClick(node);
    }
  };

  const handleOptimizationApply = (optimization: PathOptimization) => {
    if (onOptimizationApply) {
      onOptimizationApply(optimization);
    }
    // In real app, this would recalculate the critical path
    console.log('Applying optimization:', optimization);
  };

  const handleScenarioRun = (scenario: WhatIfScenario) => {
    setActiveScenario(scenario);
    if (onScenarioRun) {
      onScenarioRun(scenario);
    }
    // In real app, this would calculate the impact and show modified path
    console.log('Running scenario:', scenario);
  };

  const getItemStatus = (item: CriticalPathNode): 'blocked' | 'critical' | 'on-track' | 'at-risk' => {
    if (item.blockers.length > 0) return 'blocked';
    if (item.priority === 'critical') return 'critical';
    if (item.completionPercentage > 50) return 'on-track';
    return 'at-risk';
  };

  const renderTimelineView = () => (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Critical Path Timeline</h3>
          <p className="text-sm text-gray-600">
            Total Duration: {totalDuration} days • Total Effort: {totalEffort} hours
          </p>
        </div>
        <div className="flex space-x-2">
          {(['days', 'weeks', 'months'] as const).map((scale) => (
            <button
              key={scale}
              onClick={() => setTimelineScale(scale)}
              className={`px-3 py-1 text-sm rounded-md ${
                timelineScale === scale
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scale.charAt(0).toUpperCase() + scale.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Items */}
      <div className="space-y-3">
        {criticalPath.map((item, index) => {
          const status = getItemStatus(item);
          const isLast = index === criticalPath.length - 1;

          return (
            <div key={item.workItemId} className="relative">
              {/* Timeline Line */}
              {!isLast && (
                <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-300" />
              )}

              {/* Timeline Item */}
              <div
                className={`flex items-start space-x-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedNode?.workItemId === item.workItemId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => handleNodeClick(item)}
              >
                {/* Timeline Dot */}
                <div className={`w-4 h-4 rounded-full mt-1 flex-shrink-0 ${
                  status === 'blocked' ? 'bg-red-500' :
                  status === 'critical' ? 'bg-red-600' :
                  status === 'on-track' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{item.duration} days</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-gray-500">Start Date</div>
                      <div className="font-medium">{item.startDate.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">End Date</div>
                      <div className="font-medium">{item.endDate.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Completion</div>
                      <div className="font-medium">{item.completionPercentage}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Assigned To</div>
                      <div className="font-medium">{item.assignedTo || 'Unassigned'}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.completionPercentage >= 100 ? 'bg-green-500' :
                        item.completionPercentage >= 70 ? 'bg-blue-500' :
                        item.completionPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.completionPercentage}%` }}
                    />
                  </div>

                  {/* Dependencies */}
                  {item.dependencies.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">
                        Dependencies: {item.dependencies.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Blockers */}
                  {item.blockers.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>Blocked: {item.blockers.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderNetworkView = () => (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Dependency Network</h3>
      <div className="text-center text-gray-500 py-8">
        <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <p>Interactive network diagram would be rendered here</p>
        <p className="text-sm mt-2">Shows dependencies and critical path relationships</p>
      </div>
    </div>
  );

  const renderGanttView = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Gantt Chart View</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-gray-200 pb-2 mb-4">
            <div className="w-64 font-medium text-sm">Task</div>
            <div className="flex-1 grid grid-cols-30 text-xs text-gray-500">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className="text-center border-l border-gray-100">
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Bars */}
          {criticalPath.map((item) => {
            const startDay = Math.floor((item.startDate.getTime() - new Date('2024-02-01').getTime()) / (24 * 60 * 60 * 1000));
            const duration = item.duration;
            const status = getItemStatus(item);

            return (
              <div key={item.workItemId} className="flex items-center mb-3">
                <div className="w-64 text-sm font-medium truncate pr-4">
                  {item.title}
                </div>
                <div className="flex-1 grid grid-cols-30 relative h-6">
                  <div
                    className={`absolute h-4 rounded ${
                      status === 'blocked' ? 'bg-red-500' :
                      status === 'critical' ? 'bg-red-600' :
                      status === 'on-track' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{
                      left: `${(startDay / 30) * 100}%`,
                      width: `${(duration / 30) * 100}%`
                    }}
                  >
                    <div className="text-xs text-white px-1 py-0.5 truncate">
                      {item.completionPercentage}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderOptimizationView = () => (
    <div className="space-y-6">
      {/* Suggested Optimizations */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Suggested Optimizations</h3>
        <div className="space-y-4">
          {optimizations.map((optimization, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    optimization.type === 'parallel' ? 'bg-blue-100 text-blue-800' :
                    optimization.type === 'resource' ? 'bg-green-100 text-green-800' :
                    optimization.type === 'scope' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {optimization.type.charAt(0).toUpperCase() + optimization.type.slice(1)}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    optimization.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    optimization.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {optimization.riskLevel.charAt(0).toUpperCase() + optimization.riskLevel.slice(1)} Risk
                  </span>
                </div>
                <button
                  onClick={() => handleOptimizationApply(optimization)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>

              <p className="text-gray-700 mb-3">{optimization.description}</p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Time Saved</div>
                  <div className="font-semibold text-green-600">-{optimization.impact} days</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Effort Required</div>
                  <div className="font-semibold">{optimization.effort}/10</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Affected Items</div>
                  <div className="font-semibold">{optimization.affectedItems.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Risk Level</div>
                  <div className={`font-semibold ${
                    optimization.riskLevel === 'low' ? 'text-green-600' :
                    optimization.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {optimization.riskLevel.charAt(0).toUpperCase() + optimization.riskLevel.slice(1)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Implementation Steps:</div>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {optimization.implementation.map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternative Paths */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Alternative Paths</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alternativePaths.map((path, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{path.name}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-600">
                    -{path.timeSavings} days
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    path.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    path.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {path.riskLevel.charAt(0).toUpperCase() + path.riskLevel.slice(1)} Risk
                  </span>
                </div>
              </div>

              <p className="text-gray-700 text-sm mb-3">{path.description}</p>

              <div className="mb-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Duration: {path.duration} days</div>
                <div className="text-sm text-gray-600">Items: {path.items.length}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Requirements:</div>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {path.resourceRequirements.map((req, reqIndex) => (
                    <li key={reqIndex}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What-If Scenarios */}
      <div>
        <h3 className="text-lg font-semibold mb-4">What-If Scenarios</h3>
        <div className="space-y-4">
          {scenarios.map((scenario, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{scenario.name}</h4>
                  <p className="text-sm text-gray-600">
                    Probability: {(scenario.probability * 100).toFixed(0)}%
                  </p>
                </div>
                <button
                  onClick={() => handleScenarioRun(scenario)}
                  className={`px-4 py-2 text-sm rounded-md ${
                    activeScenario?.name === scenario.name
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {activeScenario?.name === scenario.name ? 'Running' : 'Run Scenario'}
                </button>
              </div>

              <p className="text-gray-700 mb-4">{scenario.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Duration Impact</div>
                  <div className={`font-semibold ${
                    scenario.impact.durationChange > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {scenario.impact.durationChange > 0 ? '+' : ''}{scenario.impact.durationChange} days
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Risk Change</div>
                  <div className={`font-semibold ${
                    scenario.impact.riskChange > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {scenario.impact.riskChange > 0 ? '+' : ''}{(scenario.impact.riskChange * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Effort Change</div>
                  <div className={`font-semibold ${
                    scenario.impact.effortChange > 1 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {scenario.impact.effortChange.toFixed(1)}x
                  </div>
                </div>
              </div>

              {activeScenario?.name === scenario.name && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm font-medium text-blue-800 mb-2">Scenario Results:</div>
                  <div className="text-sm text-blue-700">
                    This scenario would extend the critical path by {scenario.impact.durationChange} days,
                    bringing the total project duration to {totalDuration + scenario.impact.durationChange} days.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Critical Path</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Critical Path Analysis</h1>
            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
              <span>Total Duration: <strong>{totalDuration} days</strong></span>
              <span>Average Completion: <strong>{avgCompletion.toFixed(1)}%</strong></span>
              <span>Blocked Items: <strong className="text-red-600">{blockedItems.length}</strong></span>
            </div>
          </div>

          <button
            onClick={() => setShowOptimizations(!showOptimizations)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showOptimizations ? 'Hide' : 'Show'} Optimizations
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 mt-6">
          {[
            { key: 'timeline', label: 'Timeline', icon: '📅' },
            { key: 'network', label: 'Network', icon: '🔗' },
            { key: 'gantt', label: 'Gantt', icon: '📊' },
            { key: 'optimization', label: 'Optimization', icon: '⚡' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {selectedView === 'timeline' && renderTimelineView()}
        {selectedView === 'network' && renderNetworkView()}
        {selectedView === 'gantt' && renderGanttView()}
        {selectedView === 'optimization' && renderOptimizationView()}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{selectedNode.title}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium">{selectedNode.duration} days</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Effort</div>
                <div className="font-medium">{selectedNode.estimatedEffort} hours</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="font-medium">{selectedNode.startDate.toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End Date</div>
                <div className="font-medium">{selectedNode.endDate.toLocaleDateString()}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 bg-blue-500 rounded-full"
                  style={{ width: `${selectedNode.completionPercentage}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {selectedNode.completionPercentage}% complete
              </div>
            </div>

            {selectedNode.dependencies.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-2">Dependencies</div>
                <div className="text-sm text-gray-700">
                  {selectedNode.dependencies.join(', ')}
                </div>
              </div>
            )}

            {selectedNode.blockers.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-2">Blockers</div>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {selectedNode.blockers.map((blocker, index) => (
                    <li key={index}>{blocker}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  console.log('Edit item:', selectedNode.workItemId);
                  setSelectedNode(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}