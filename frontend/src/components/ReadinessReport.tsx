'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Treemap } from 'recharts';

// Types for the reporting data
interface ReadinessReport {
  id: string;
  type: string;
  title: string;
  generatedAt: Date;
  summary: {
    totalItems: number;
    overallCompletion: number;
    itemsComplete: number;
    itemsInProgress: number;
    itemsNotStarted: number;
    criticalBlockers: number;
  };
  dimensionBreakdown: {
    [key: string]: {
      totalItems: number;
      completion: number;
      average: number;
      blockers: string[];
    };
  };
  sprintBreakdown: SprintReadinessInfo[];
  screenGroupBreakdown: ScreenGroupReadinessInfo[];
  criticalPath: CriticalPathItem[];
  atRiskItems: AtRiskItem[];
  velocityMetrics: VelocityMetrics;
  projectedCompletion: ProjectionInfo;
}

interface SprintReadinessInfo {
  sprintId: string;
  sprintName: string;
  sprintNumber: number;
  status: string;
  overallCompletion: number;
  plannedItems: number;
  completedItems: number;
  onTrack: boolean;
  estimatedCompletion: Date | null;
}

interface ScreenGroupReadinessInfo {
  groupId: string;
  groupName: string;
  overallCompletion: number;
  totalWorkItems: number;
  readyItems: number;
  blockedItems: number;
  sprintId?: string;
  priority: number;
}

interface CriticalPathItem {
  workItemId: string;
  title: string;
  screenGroup: string;
  estimatedDuration: number;
  dependencies: string[];
  isBlocking: boolean;
  slackTime: number;
}

interface AtRiskItem {
  workItemId: string;
  title: string;
  screenGroup: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  stuckDays: number;
  blockers: string[];
  recommendedActions: string[];
}

interface VelocityMetrics {
  currentVelocity: number;
  averageVelocity: number;
  velocityTrend: number;
  completionRate: number;
  throughput: number;
}

interface ProjectionInfo {
  estimatedCompletionDate: Date | null;
  confidenceInterval: {
    optimistic: Date;
    pessimistic: Date;
  };
  remainingWork: number;
  atCurrentPace: Date | null;
  withImprovements: Date | null;
}

interface ReadinessReportProps {
  reportId?: string;
  configurationId?: string;
  onExport?: (format: 'json' | 'csv' | 'pdf' | 'markdown') => void;
}

// Color schemes for visualizations
const DIMENSION_COLORS = {
  requirements: '#8B5CF6', // Purple
  design: '#06B6D4',       // Cyan
  frontend: '#10B981',     // Emerald
  backend: '#F59E0B',      // Amber
  integration: '#EF4444',  // Red
  test: '#6366F1'          // Indigo
};

const RISK_COLORS = {
  low: '#10B981',       // Green
  medium: '#F59E0B',    // Yellow
  high: '#EF4444',      // Red
  critical: '#7C2D12'   // Dark red
};

const STATUS_COLORS = {
  complete: '#10B981',    // Green
  onTrack: '#06B6D4',     // Cyan
  atRisk: '#F59E0B',      // Yellow
  blocked: '#EF4444'      // Red
};

export default function ReadinessReport({ reportId, configurationId, onExport }: ReadinessReportProps) {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'dimensions' | 'sprints' | 'groups' | 'risks' | 'timeline'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock data for demonstration - in real app, this would fetch from API
        const mockReport: ReadinessReport = {
          id: reportId || `report_${Date.now()}`,
          type: 'readiness_detailed',
          title: 'Project Readiness Report',
          generatedAt: new Date(),
          summary: {
            totalItems: 45,
            overallCompletion: 68.5,
            itemsComplete: 15,
            itemsInProgress: 22,
            itemsNotStarted: 8,
            criticalBlockers: 3
          },
          dimensionBreakdown: {
            requirements: { totalItems: 45, completion: 85.2, average: 85.2, blockers: ['Missing API specs'] },
            design: { totalItems: 45, completion: 78.4, average: 78.4, blockers: ['UX review pending'] },
            frontend: { totalItems: 45, completion: 65.1, average: 65.1, blockers: ['Component library updates'] },
            backend: { totalItems: 45, completion: 72.3, average: 72.3, blockers: [] },
            integration: { totalItems: 45, completion: 45.8, average: 45.8, blockers: ['API endpoints missing', 'Environment setup'] },
            test: { totalItems: 45, completion: 38.9, average: 38.9, blockers: ['Test data setup', 'CI/CD pipeline'] }
          },
          sprintBreakdown: [
            {
              sprintId: 'sprint-1',
              sprintName: 'Foundation Sprint',
              sprintNumber: 1,
              status: 'complete',
              overallCompletion: 95.0,
              plannedItems: 12,
              completedItems: 11,
              onTrack: true,
              estimatedCompletion: new Date('2024-01-15')
            },
            {
              sprintId: 'sprint-2',
              sprintName: 'Core Features',
              sprintNumber: 2,
              status: 'active',
              overallCompletion: 72.5,
              plannedItems: 18,
              completedItems: 4,
              onTrack: true,
              estimatedCompletion: new Date('2024-02-01')
            },
            {
              sprintId: 'sprint-3',
              sprintName: 'Integration Phase',
              sprintNumber: 3,
              status: 'planning',
              overallCompletion: 25.0,
              plannedItems: 15,
              completedItems: 0,
              onTrack: false,
              estimatedCompletion: new Date('2024-02-15')
            }
          ],
          screenGroupBreakdown: [
            {
              groupId: 'auth',
              groupName: 'Authentication',
              overallCompletion: 85.0,
              totalWorkItems: 8,
              readyItems: 6,
              blockedItems: 1,
              priority: 1
            },
            {
              groupId: 'dashboard',
              groupName: 'Dashboard',
              overallCompletion: 62.5,
              totalWorkItems: 12,
              readyItems: 4,
              blockedItems: 2,
              priority: 2
            },
            {
              groupId: 'reporting',
              groupName: 'Reporting',
              overallCompletion: 45.0,
              totalWorkItems: 15,
              readyItems: 2,
              blockedItems: 3,
              priority: 3
            }
          ],
          criticalPath: [
            {
              workItemId: 'item-1',
              title: 'API Authentication',
              screenGroup: 'Authentication',
              estimatedDuration: 5,
              dependencies: [],
              isBlocking: true,
              slackTime: 0
            },
            {
              workItemId: 'item-2',
              title: 'Dashboard Data Service',
              screenGroup: 'Dashboard',
              estimatedDuration: 8,
              dependencies: ['item-1'],
              isBlocking: true,
              slackTime: 0
            }
          ],
          atRiskItems: [
            {
              workItemId: 'item-15',
              title: 'Report Generation Engine',
              screenGroup: 'Reporting',
              riskLevel: 'high',
              reasons: ['Complex data aggregation', 'Performance requirements'],
              stuckDays: 12,
              blockers: ['Database optimization needed'],
              recommendedActions: ['Technical spike', 'Performance testing']
            },
            {
              workItemId: 'item-23',
              title: 'User Management UI',
              screenGroup: 'Authentication',
              riskLevel: 'medium',
              reasons: ['UX requirements unclear'],
              stuckDays: 5,
              blockers: ['Design review pending'],
              recommendedActions: ['Schedule design review']
            }
          ],
          velocityMetrics: {
            currentVelocity: 15,
            averageVelocity: 12,
            velocityTrend: 25,
            completionRate: 85,
            throughput: 45
          },
          projectedCompletion: {
            estimatedCompletionDate: new Date('2024-03-15'),
            confidenceInterval: {
              optimistic: new Date('2024-02-28'),
              pessimistic: new Date('2024-04-01')
            },
            remainingWork: 31.5,
            atCurrentPace: new Date('2024-03-15'),
            withImprovements: new Date('2024-03-01')
          }
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReport(mockReport);
      } catch (err) {
        setError('Failed to load report data');
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, configurationId]);

  // Prepare chart data
  const prepareDimensionPieData = () => {
    if (!report) return [];

    return Object.entries(report.dimensionBreakdown).map(([dimension, data]) => ({
      name: dimension.charAt(0).toUpperCase() + dimension.slice(1),
      value: data.completion,
      fill: DIMENSION_COLORS[dimension as keyof typeof DIMENSION_COLORS] || '#8B5CF6'
    }));
  };

  const prepareSprintBarData = () => {
    if (!report) return [];

    return report.sprintBreakdown.map(sprint => ({
      name: `Sprint ${sprint.sprintNumber}`,
      completion: sprint.overallCompletion,
      planned: sprint.plannedItems,
      completed: sprint.completedItems,
      fill: sprint.onTrack ? STATUS_COLORS.onTrack : STATUS_COLORS.atRisk
    }));
  };

  const prepareGroupHeatmapData = () => {
    if (!report) return [];

    return report.screenGroupBreakdown.map(group => ({
      name: group.groupName,
      completion: group.overallCompletion,
      items: group.totalWorkItems,
      blocked: group.blockedItems,
      size: group.totalWorkItems * 10, // For treemap sizing
      fill: group.blockedItems > 0 ? STATUS_COLORS.blocked :
            group.overallCompletion > 80 ? STATUS_COLORS.complete :
            group.overallCompletion > 60 ? STATUS_COLORS.onTrack : STATUS_COLORS.atRisk
    }));
  };

  const prepareTimelineData = () => {
    if (!report) return [];

    // Generate historical progress data (mock)
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i <= 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const progress = Math.min(report.summary.overallCompletion,
        20 + (i / 30) * (report.summary.overallCompletion - 20) + (Math.random() - 0.5) * 5);

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: Math.max(0, progress),
        ideal: 20 + (i / 30) * 80 // Linear ideal progress
      });
    }

    return data;
  };

  const handleExport = (format: 'json' | 'csv' | 'pdf' | 'markdown') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export behavior
      console.log(`Exporting report in ${format} format`);
      // In real implementation, this would trigger API call to export endpoint
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Report</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generated on {report.generatedAt.toLocaleDateString()} at {report.generatedAt.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            >
              PDF
            </button>
            <button
              onClick={() => handleExport('markdown')}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md text-white"
            >
              Export
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'dimensions', label: 'Dimensions' },
            { key: 'sprints', label: 'Sprints' },
            { key: 'groups', label: 'Groups' },
            { key: 'risks', label: 'At Risk' },
            { key: 'timeline', label: 'Timeline' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeView === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{report.summary.overallCompletion.toFixed(1)}%</div>
                <div className="text-sm text-blue-800">Overall Complete</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{report.summary.itemsComplete}</div>
                <div className="text-sm text-green-800">Items Complete</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{report.summary.itemsInProgress}</div>
                <div className="text-sm text-yellow-800">In Progress</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{report.summary.itemsNotStarted}</div>
                <div className="text-sm text-gray-800">Not Started</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{report.summary.criticalBlockers}</div>
                <div className="text-sm text-red-800">Critical Blockers</div>
              </div>
            </div>

            {/* Key Metrics Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Completion by Dimension</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareDimensionPieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareDimensionPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Sprint Progress</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareSprintBarData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completion" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Velocity Metrics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Velocity Metrics</h3>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold">{report.velocityMetrics.currentVelocity}</div>
                  <div className="text-sm text-gray-600">Current Velocity</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{report.velocityMetrics.averageVelocity}</div>
                  <div className="text-sm text-gray-600">Average Velocity</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">+{report.velocityMetrics.velocityTrend}%</div>
                  <div className="text-sm text-gray-600">Velocity Trend</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{report.velocityMetrics.completionRate}%</div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{report.velocityMetrics.throughput}</div>
                  <div className="text-sm text-gray-600">Throughput</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'dimensions' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Dimension Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={Object.entries(report.dimensionBreakdown).map(([dim, data]) => ({
                  name: dim.charAt(0).toUpperCase() + dim.slice(1),
                  completion: data.completion,
                  blockers: data.blockers.length,
                  fill: DIMENSION_COLORS[dim as keyof typeof DIMENSION_COLORS]
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completion" fill="#8884d8" name="Completion %" />
                </BarChart>
              </ResponsiveContainer>

              <div className="space-y-4">
                {Object.entries(report.dimensionBreakdown).map(([dimension, data]) => (
                  <div key={dimension} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold capitalize">{dimension}</h4>
                      <span className="text-lg font-bold">{data.completion.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${data.completion}%`,
                          backgroundColor: DIMENSION_COLORS[dimension as keyof typeof DIMENSION_COLORS]
                        }}
                      />
                    </div>
                    {data.blockers.length > 0 && (
                      <div className="text-sm text-red-600">
                        <strong>Blockers:</strong> {data.blockers.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'sprints' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Sprint Progress</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">On Track</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Completion</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.sprintBreakdown.map((sprint) => (
                    <tr key={sprint.sprintId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{sprint.sprintName}</div>
                        <div className="text-sm text-gray-500">Sprint {sprint.sprintNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sprint.status === 'complete' ? 'bg-green-100 text-green-800' :
                          sprint.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 mr-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  sprint.overallCompletion >= 90 ? 'bg-green-500' :
                                  sprint.overallCompletion >= 70 ? 'bg-blue-500' :
                                  sprint.overallCompletion >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${sprint.overallCompletion}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium">{sprint.overallCompletion.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sprint.completedItems} / {sprint.plannedItems}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sprint.onTrack ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {sprint.onTrack ? 'On Track' : 'At Risk'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sprint.estimatedCompletion ? sprint.estimatedCompletion.toLocaleDateString() : 'TBD'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === 'groups' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Screen Group Progress</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={prepareGroupHeatmapData()}
                  dataKey="size"
                  aspectRatio={4/3}
                  stroke="#fff"
                  fill="#8884d8"
                />
              </ResponsiveContainer>

              <div className="space-y-4">
                {report.screenGroupBreakdown
                  .sort((a, b) => b.overallCompletion - a.overallCompletion)
                  .map((group) => (
                  <div key={group.groupId} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{group.groupName}</h4>
                      <span className="text-lg font-bold">{group.overallCompletion.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                      <div
                        className={`h-3 rounded-full ${
                          group.overallCompletion >= 80 ? 'bg-green-500' :
                          group.overallCompletion >= 60 ? 'bg-blue-500' :
                          group.overallCompletion >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${group.overallCompletion}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total:</span> <strong>{group.totalWorkItems}</strong>
                      </div>
                      <div>
                        <span className="text-gray-600">Ready:</span> <strong className="text-green-600">{group.readyItems}</strong>
                      </div>
                      <div>
                        <span className="text-gray-600">Blocked:</span> <strong className="text-red-600">{group.blockedItems}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'risks' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">At-Risk Items</h3>

            {/* Critical Path Items */}
            {report.criticalPath.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-3 text-red-600">Critical Path Blockers</h4>
                <div className="space-y-3">
                  {report.criticalPath.map((item) => (
                    <div key={item.workItemId} className="p-4 border-l-4 border-red-500 bg-red-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold text-gray-900">{item.title}</h5>
                          <p className="text-sm text-gray-600">{item.screenGroup}</p>
                          <p className="text-sm text-gray-700 mt-1">
                            Duration: {item.estimatedDuration} days | Slack: {item.slackTime} days
                          </p>
                        </div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Critical
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* At-Risk Items */}
            <div>
              <h4 className="text-md font-semibold mb-3">High-Risk Items</h4>
              <div className="space-y-4">
                {report.atRiskItems
                  .sort((a, b) => {
                    const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
                  })
                  .map((item) => (
                  <div key={item.workItemId} className={`p-4 border-l-4 ${
                    item.riskLevel === 'critical' ? 'border-red-500 bg-red-50' :
                    item.riskLevel === 'high' ? 'border-orange-500 bg-orange-50' :
                    item.riskLevel === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-500 bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-semibold text-gray-900">{item.title}</h5>
                        <p className="text-sm text-gray-600">{item.screenGroup}</p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        RISK_COLORS[item.riskLevel] === '#10B981' ? 'bg-green-100 text-green-800' :
                        RISK_COLORS[item.riskLevel] === '#F59E0B' ? 'bg-yellow-100 text-yellow-800' :
                        RISK_COLORS[item.riskLevel] === '#EF4444' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)} Risk
                      </span>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Reasons:</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside ml-2">
                        {item.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    {item.blockers.length > 0 && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Current Blockers:</p>
                        <ul className="text-sm text-red-600 list-disc list-inside ml-2">
                          {item.blockers.map((blocker, index) => (
                            <li key={index}>{blocker}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mb-2">
                      <p className="text-sm font-medium text-gray-700">Recommended Actions:</p>
                      <ul className="text-sm text-blue-600 list-disc list-inside ml-2">
                        {item.recommendedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-xs text-gray-500">
                      Stuck for {item.stuckDays} days
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'timeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Progress Timeline</h3>
              <div className="flex space-x-2">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={prepareTimelineData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Actual Progress"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Ideal Progress"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Gantt Chart Placeholder */}
            <div className="mt-8">
              <h4 className="text-md font-semibold mb-4">Sprint Timeline</h4>
              <div className="space-y-2">
                {report.sprintBreakdown.map((sprint, index) => (
                  <div key={sprint.sprintId} className="flex items-center space-x-4">
                    <div className="w-24 text-sm font-medium">{sprint.sprintName}</div>
                    <div className="flex-1 h-8 bg-gray-200 rounded relative overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          sprint.status === 'complete' ? 'bg-green-500' :
                          sprint.status === 'active' ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${sprint.overallCompletion}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {sprint.overallCompletion.toFixed(0)}%
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600">
                      {sprint.completedItems}/{sprint.plannedItems}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}