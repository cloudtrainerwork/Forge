'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';

// Types for analytics data
interface AnalyticsDashboardData {
  realTimeMetrics: RealTimeMetrics;
  velocityData: VelocityData[];
  burndownData: BurndownData;
  riskMatrix: RiskMatrixData[];
  completionPrediction: CompletionPrediction;
  topBlockers: BlockerData[];
  trendAnalysis: TrendAnalysis[];
  performanceIndicators: PerformanceIndicator[];
}

interface RealTimeMetrics {
  overallCompletion: number;
  dailyVelocity: number;
  activeItems: number;
  completedToday: number;
  blockedItems: number;
  atRiskItems: number;
  teamUtilization: number;
  qualityScore: number;
}

interface VelocityData {
  period: string;
  actual: number;
  target: number;
  items: number;
  efficiency: number;
}

interface BurndownData {
  sprintName: string;
  dataPoints: BurndownPoint[];
  projectedCompletion: Date;
  variance: number;
}

interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
  actual: number;
}

interface RiskMatrixData {
  name: string;
  probability: number;
  impact: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface CompletionPrediction {
  estimatedDate: Date;
  confidence: number;
  scenarios: PredictionScenario[];
  factors: PredictionFactor[];
}

interface PredictionScenario {
  name: string;
  date: Date;
  probability: number;
  description: string;
}

interface PredictionFactor {
  name: string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface BlockerData {
  id: string;
  title: string;
  category: string;
  affectedItems: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';
}

interface TrendAnalysis {
  metric: string;
  current: number;
  previous: number;
  change: number;
  direction: 'up' | 'down' | 'stable';
  forecast: number[];
}

interface PerformanceIndicator {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'danger';
}

interface AnalyticsDashboardProps {
  sprintId?: string;
  teamId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number;
  onDrillDown?: (metric: string, filters: any) => void;
  onAlertSubscribe?: (alertType: string, threshold: number) => void;
}

const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C2D12'
};

const TREND_COLORS = {
  up: '#10B981',
  down: '#EF4444',
  stable: '#6B7280'
};

const STATUS_COLORS = {
  good: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444'
};

export default function AnalyticsDashboard({
  sprintId,
  teamId,
  dateRange,
  refreshInterval = 300000, // 5 minutes
  onDrillDown,
  onAlertSubscribe
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'target'>('previous');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Mock data - in real app, this would fetch from API
        const mockData: AnalyticsDashboardData = {
          realTimeMetrics: {
            overallCompletion: 68.5,
            dailyVelocity: 3.2,
            activeItems: 28,
            completedToday: 2,
            blockedItems: 5,
            atRiskItems: 7,
            teamUtilization: 82.4,
            qualityScore: 94.2
          },
          velocityData: generateVelocityData(),
          burndownData: generateBurndownData(),
          riskMatrix: generateRiskMatrixData(),
          completionPrediction: {
            estimatedDate: new Date('2024-03-15'),
            confidence: 0.78,
            scenarios: [
              {
                name: 'Optimistic',
                date: new Date('2024-02-28'),
                probability: 0.2,
                description: 'All blockers resolved quickly'
              },
              {
                name: 'Most Likely',
                date: new Date('2024-03-15'),
                probability: 0.6,
                description: 'Current pace continues'
              },
              {
                name: 'Pessimistic',
                date: new Date('2024-04-01'),
                probability: 0.2,
                description: 'Additional complications arise'
              }
            ],
            factors: [
              {
                name: 'Team Velocity',
                weight: 0.35,
                impact: 'positive',
                description: 'Consistent delivery pace'
              },
              {
                name: 'Technical Complexity',
                weight: 0.25,
                impact: 'negative',
                description: 'Complex integration requirements'
              },
              {
                name: 'Resource Availability',
                weight: 0.20,
                impact: 'neutral',
                description: 'Stable team composition'
              },
              {
                name: 'External Dependencies',
                weight: 0.20,
                impact: 'negative',
                description: 'Waiting on third-party APIs'
              }
            ]
          },
          topBlockers: [
            {
              id: 'blocker-1',
              title: 'API Integration Dependencies',
              category: 'External',
              affectedItems: 8,
              duration: 12,
              severity: 'high',
              trend: 'stable'
            },
            {
              id: 'blocker-2',
              title: 'Database Performance Issues',
              category: 'Technical',
              affectedItems: 5,
              duration: 8,
              severity: 'medium',
              trend: 'improving'
            },
            {
              id: 'blocker-3',
              title: 'UX Design Review Bottleneck',
              category: 'Process',
              affectedItems: 12,
              duration: 15,
              severity: 'medium',
              trend: 'worsening'
            },
            {
              id: 'blocker-4',
              title: 'Test Environment Instability',
              category: 'Infrastructure',
              affectedItems: 3,
              duration: 6,
              severity: 'high',
              trend: 'stable'
            }
          ],
          trendAnalysis: [
            {
              metric: 'Velocity',
              current: 15,
              previous: 12,
              change: 25,
              direction: 'up',
              forecast: [15, 16, 17, 18, 17]
            },
            {
              metric: 'Quality Score',
              current: 94.2,
              previous: 91.8,
              change: 2.6,
              direction: 'up',
              forecast: [94.2, 94.5, 94.8, 95.0, 95.2]
            },
            {
              metric: 'Blocker Count',
              current: 5,
              previous: 8,
              change: -37.5,
              direction: 'down',
              forecast: [5, 4, 3, 2, 3]
            },
            {
              metric: 'Risk Level',
              current: 2.3,
              previous: 2.1,
              change: 9.5,
              direction: 'up',
              forecast: [2.3, 2.2, 2.0, 1.9, 2.1]
            }
          ],
          performanceIndicators: [
            {
              name: 'Sprint Velocity',
              value: 15,
              target: 12,
              unit: 'items/sprint',
              trend: 'up',
              status: 'good'
            },
            {
              name: 'Cycle Time',
              value: 8.5,
              target: 10,
              unit: 'days',
              trend: 'down',
              status: 'good'
            },
            {
              name: 'Defect Rate',
              value: 5.8,
              target: 8,
              unit: '%',
              trend: 'stable',
              status: 'good'
            },
            {
              name: 'Team Utilization',
              value: 82.4,
              target: 80,
              unit: '%',
              trend: 'up',
              status: 'warning'
            },
            {
              name: 'Customer Satisfaction',
              value: 4.6,
              target: 4.5,
              unit: '/5',
              trend: 'up',
              status: 'good'
            },
            {
              name: 'Technical Debt',
              value: 12.3,
              target: 15,
              unit: 'hours',
              trend: 'down',
              status: 'good'
            }
          ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setData(mockData);
        setLastUpdate(new Date());
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();

    // Set up refresh interval
    const interval = setInterval(fetchAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [sprintId, teamId, dateRange, refreshInterval]);

  // Generate mock data functions
  function generateVelocityData(): VelocityData[] {
    const data = [];
    const today = new Date();

    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      data.push({
        period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actual: Math.floor(Math.random() * 8) + 10,
        target: 12,
        items: Math.floor(Math.random() * 5) + 8,
        efficiency: Math.floor(Math.random() * 20) + 75
      });
    }

    return data;
  }

  function generateBurndownData(): BurndownData {
    const dataPoints = [];
    const totalWork = 45;
    const sprintDays = 14;

    for (let day = 0; day <= sprintDays; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (sprintDays - day));

      const ideal = Math.max(0, totalWork - (totalWork * day) / sprintDays);
      const actual = Math.max(0, totalWork - day * 2.8 - Math.random() * 3);
      const remaining = Math.max(0, totalWork - day * 2.5);

      dataPoints.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        remaining,
        ideal,
        actual
      });
    }

    return {
      sprintName: 'Current Sprint',
      dataPoints,
      projectedCompletion: new Date('2024-02-15'),
      variance: 8.5
    };
  }

  function generateRiskMatrixData(): RiskMatrixData[] {
    return [
      { name: 'API Delays', probability: 0.7, impact: 0.8, riskLevel: 'high', category: 'External' },
      { name: 'Team Capacity', probability: 0.3, impact: 0.6, riskLevel: 'medium', category: 'Resource' },
      { name: 'Technical Debt', probability: 0.4, impact: 0.4, riskLevel: 'medium', category: 'Technical' },
      { name: 'Scope Creep', probability: 0.6, impact: 0.7, riskLevel: 'high', category: 'Requirements' },
      { name: 'Infrastructure', probability: 0.2, impact: 0.9, riskLevel: 'medium', category: 'Technical' },
      { name: 'Skills Gap', probability: 0.3, impact: 0.5, riskLevel: 'low', category: 'Resource' },
      { name: 'Regulatory Changes', probability: 0.1, impact: 0.8, riskLevel: 'low', category: 'External' },
      { name: 'Performance Issues', probability: 0.5, impact: 0.6, riskLevel: 'medium', category: 'Technical' }
    ];
  }

  const handleDrillDown = (metric: string, data?: any) => {
    if (onDrillDown) {
      onDrillDown(metric, { timeframe: selectedTimeframe, data });
    }
  };

  const handleSetAlert = (metric: string, threshold: number) => {
    if (onAlertSubscribe) {
      onAlertSubscribe(metric, threshold);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
              {sprintId && ` • Sprint: ${sprintId}`}
              {teamId && ` • Team: ${teamId}`}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <div className="flex space-x-1">
              {(['day', 'week', 'month', 'quarter'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    selectedTimeframe === timeframe
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                </button>
              ))}
            </div>

            {/* Compare Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compare</span>
            </label>

            {/* Alerts Toggle */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Alerts</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-colors"
               onClick={() => handleDrillDown('completion', data.realTimeMetrics)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.realTimeMetrics.overallCompletion.toFixed(1)}%</div>
                <div className="text-blue-100">Overall Complete</div>
              </div>
              <div className="w-12 h-12">
                <CircularProgressbar
                  value={data.realTimeMetrics.overallCompletion}
                  styles={buildStyles({
                    pathColor: '#ffffff',
                    trailColor: 'rgba(255,255,255,0.3)',
                    textColor: '#ffffff',
                    textSize: '24px'
                  })}
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition-colors"
               onClick={() => handleDrillDown('velocity', data.velocityData)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.realTimeMetrics.dailyVelocity}</div>
                <div className="text-green-100">Daily Velocity</div>
              </div>
              <div className="text-green-100">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-4 rounded-lg cursor-pointer hover:from-yellow-600 hover:to-yellow-700 transition-colors"
               onClick={() => handleDrillDown('risk', data.riskMatrix)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.realTimeMetrics.atRiskItems}</div>
                <div className="text-yellow-100">At Risk Items</div>
              </div>
              <div className="text-yellow-100">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg cursor-pointer hover:from-red-600 hover:to-red-700 transition-colors"
               onClick={() => handleDrillDown('blockers', data.topBlockers)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{data.realTimeMetrics.blockedItems}</div>
                <div className="text-red-100">Blocked Items</div>
              </div>
              <div className="text-red-100">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Velocity Gauge */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Velocity Trend</h3>
              <button
                onClick={() => handleSetAlert('velocity', 10)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Set Alert
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Actual Velocity"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Target"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Burndown Chart */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sprint Burndown</h3>
              <div className="text-sm text-gray-600">
                Variance: {data.burndownData.variance > 0 ? '+' : ''}{data.burndownData.variance.toFixed(1)}%
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.burndownData.dataPoints}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  stackId="1"
                  stroke="#9CA3AF"
                  fill="rgba(156, 163, 175, 0.3)"
                  name="Ideal Burndown"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stackId="2"
                  stroke="#3B82F6"
                  fill="rgba(59, 130, 246, 0.3)"
                  name="Actual Progress"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Assessment Matrix */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Risk Matrix</h3>
              <button
                onClick={() => handleDrillDown('risk-detail', data.riskMatrix)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View Details
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="probability"
                  domain={[0, 1]}
                  name="Probability"
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <YAxis
                  type="number"
                  dataKey="impact"
                  domain={[0, 1]}
                  name="Impact"
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: any, name?: string) => [
                    name === 'probability' ? `${(value * 100).toFixed(0)}%` : `${(value * 100).toFixed(0)}%`,
                    name === 'probability' ? 'Probability' : 'Impact'
                  ] as any}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.name;
                    }
                    return '';
                  }}
                />
                <Scatter
                  name="Risks"
                  data={data.riskMatrix}
                  fill="#8884d8"
                >
                  {data.riskMatrix.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.riskLevel]}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Completion Prediction */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Completion Prediction</h3>
              <div className="text-sm text-gray-600">
                Confidence: {(data.completionPrediction.confidence * 100).toFixed(0)}%
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {data.completionPrediction.estimatedDate.toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Estimated Completion</div>
              </div>

              <div className="space-y-2">
                {data.completionPrediction.scenarios.map((scenario) => (
                  <div key={scenario.name} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <div className="font-medium">{scenario.name}</div>
                      <div className="text-sm text-gray-600">{scenario.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{scenario.date.toLocaleDateString()}</div>
                      <div className="text-sm text-gray-500">{(scenario.probability * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t">
                <h4 className="font-medium text-sm mb-2">Key Factors</h4>
                <div className="space-y-1">
                  {data.completionPrediction.factors.map((factor) => (
                    <div key={factor.name} className="flex items-center justify-between text-sm">
                      <span>{factor.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${factor.weight * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs ${
                          factor.impact === 'positive' ? 'text-green-600' :
                          factor.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {factor.impact === 'positive' ? '↑' : factor.impact === 'negative' ? '↓' : '→'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Blockers List */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Top Blockers</h3>
          <div className="space-y-3">
            {data.topBlockers.map((blocker) => (
              <div key={blocker.id} className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{blocker.title}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        blocker.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        blocker.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        blocker.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {blocker.severity.charAt(0).toUpperCase() + blocker.severity.slice(1)}
                      </span>
                      <span className={`text-sm ${
                        blocker.trend === 'improving' ? 'text-green-600' :
                        blocker.trend === 'worsening' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {blocker.trend === 'improving' ? '↓' :
                         blocker.trend === 'worsening' ? '↑' : '→'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {blocker.category} • {blocker.affectedItems} items affected • {blocker.duration} days
                    </div>
                  </div>
                  <button
                    onClick={() => handleDrillDown('blocker-detail', blocker)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.performanceIndicators.map((indicator) => (
              <div key={indicator.name} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{indicator.name}</h4>
                  <span className={`text-sm ${TREND_COLORS[indicator.trend]}`}>
                    {indicator.trend === 'up' ? '↗' : indicator.trend === 'down' ? '↙' : '→'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl font-bold">{indicator.value}</div>
                  <div className="text-sm text-gray-500">{indicator.unit}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Target: {indicator.target}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    indicator.status === 'good' ? 'bg-green-500' :
                    indicator.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200">
              High Risk Only
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
              Behind Schedule
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
              Critical Path Items
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
              Blocked Items
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
              My Team Only
            </button>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">
              Last 30 Days
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}