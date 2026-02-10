'use client';

import React, { useState, useEffect } from 'react';

// Types for export functionality
interface ExportConfig {
  format: 'json' | 'csv' | 'pdf' | 'markdown';
  scope: 'all' | 'filtered' | 'selected';
  sections: {
    summary: boolean;
    dimensions: boolean;
    sprints: boolean;
    groups: boolean;
    risks: boolean;
    timeline: boolean;
    blockers: boolean;
    analytics: boolean;
  };
  filters?: {
    dateRange?: { start: Date; end: Date };
    sprintIds?: string[];
    groupIds?: string[];
    riskLevels?: ('low' | 'medium' | 'high' | 'critical')[];
    completionRange?: { min: number; max: number };
  };
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<ExportConfig>;
  category: 'executive' | 'detailed' | 'team' | 'compliance';
}

interface ScheduledExport {
  id: string;
  name: string;
  config: ExportConfig;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  recipients: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}

interface ExportHistory {
  id: string;
  name: string;
  format: string;
  timestamp: Date;
  size: string;
  status: 'completed' | 'failed' | 'processing';
  downloadUrl?: string;
  error?: string;
}

interface GitHubActionsConfig {
  enabled: boolean;
  repositoryUrl: string;
  webhookUrl: string;
  triggers: {
    onCompletion: boolean;
    onRiskChange: boolean;
    onSchedule: boolean;
  };
  authentication: {
    token: string;
    type: 'personal' | 'app';
  };
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<ExportConfig>;
  selectedItems?: string[];
  onExport: (config: ExportConfig) => Promise<void>;
  onScheduleExport?: (schedule: ScheduledExport) => Promise<void>;
  onConfigureGitHub?: (config: GitHubActionsConfig) => Promise<void>;
}

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for stakeholders',
    category: 'executive',
    config: {
      format: 'pdf',
      scope: 'all',
      sections: {
        summary: true,
        dimensions: false,
        sprints: true,
        groups: false,
        risks: true,
        timeline: false,
        blockers: true,
        analytics: false
      }
    }
  },
  {
    id: 'sprint-review',
    name: 'Sprint Review',
    description: 'Detailed sprint progress and metrics',
    category: 'team',
    config: {
      format: 'markdown',
      scope: 'filtered',
      sections: {
        summary: true,
        dimensions: true,
        sprints: true,
        groups: true,
        risks: true,
        timeline: true,
        blockers: true,
        analytics: true
      }
    }
  },
  {
    id: 'team-standup',
    name: 'Team Standup',
    description: 'Daily standup report with blockers',
    category: 'team',
    config: {
      format: 'markdown',
      scope: 'all',
      sections: {
        summary: true,
        dimensions: false,
        sprints: false,
        groups: false,
        risks: true,
        timeline: false,
        blockers: true,
        analytics: false
      }
    }
  },
  {
    id: 'architecture-review',
    name: 'Architecture Review',
    description: 'Technical progress and dependencies',
    category: 'detailed',
    config: {
      format: 'json',
      scope: 'all',
      sections: {
        summary: true,
        dimensions: true,
        sprints: false,
        groups: true,
        risks: true,
        timeline: true,
        blockers: true,
        analytics: true
      }
    }
  },
  {
    id: 'risk-assessment',
    name: 'Risk Assessment',
    description: 'Risk analysis and mitigation tracking',
    category: 'detailed',
    config: {
      format: 'pdf',
      scope: 'all',
      sections: {
        summary: true,
        dimensions: false,
        sprints: false,
        groups: false,
        risks: true,
        timeline: false,
        blockers: true,
        analytics: true
      }
    }
  },
  {
    id: 'compliance-audit',
    name: 'Compliance Audit',
    description: 'Comprehensive audit trail for compliance',
    category: 'compliance',
    config: {
      format: 'csv',
      scope: 'all',
      sections: {
        summary: true,
        dimensions: true,
        sprints: true,
        groups: true,
        risks: true,
        timeline: true,
        blockers: true,
        analytics: true
      }
    }
  }
];

export default function ExportDialog({
  isOpen,
  onClose,
  initialConfig,
  selectedItems = [],
  onExport,
  onScheduleExport,
  onConfigureGitHub
}: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'schedule' | 'history' | 'github'>('export');
  const [config, setConfig] = useState<ExportConfig>({
    format: 'json',
    scope: 'all',
    sections: {
      summary: true,
      dimensions: true,
      sprints: true,
      groups: true,
      risks: true,
      timeline: true,
      blockers: true,
      analytics: true
    },
    ...initialConfig
  });
  const [loading, setLoading] = useState(false);
  const [scheduledExports, setScheduledExports] = useState<ScheduledExport[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [gitHubConfig, setGitHubConfig] = useState<GitHubActionsConfig>({
    enabled: false,
    repositoryUrl: '',
    webhookUrl: '',
    triggers: {
      onCompletion: false,
      onRiskChange: false,
      onSchedule: false
    },
    authentication: {
      token: '',
      type: 'personal'
    }
  });
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduledExport>>({
    name: '',
    config: config,
    schedule: {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      time: '09:00'
    },
    recipients: [],
    enabled: true
  });

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadScheduledExports();
      loadExportHistory();
      loadGitHubConfig();
    }
  }, [isOpen]);

  const loadScheduledExports = async () => {
    // Mock data - in real app, fetch from API
    const mockSchedules: ScheduledExport[] = [
      {
        id: 'schedule-1',
        name: 'Weekly Executive Report',
        config: EXPORT_TEMPLATES[0].config as ExportConfig,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '09:00'
        },
        recipients: ['exec@company.com', 'pm@company.com'],
        enabled: true,
        lastRun: new Date('2024-02-05'),
        nextRun: new Date('2024-02-12')
      },
      {
        id: 'schedule-2',
        name: 'Daily Standup Report',
        config: EXPORT_TEMPLATES[2].config as ExportConfig,
        schedule: {
          frequency: 'daily',
          time: '08:30'
        },
        recipients: ['team@company.com'],
        enabled: true,
        lastRun: new Date('2024-02-09'),
        nextRun: new Date('2024-02-10')
      }
    ];
    setScheduledExports(mockSchedules);
  };

  const loadExportHistory = async () => {
    // Mock data - in real app, fetch from API
    const mockHistory: ExportHistory[] = [
      {
        id: 'export-1',
        name: 'Executive Summary',
        format: 'PDF',
        timestamp: new Date('2024-02-09 14:30'),
        size: '2.3 MB',
        status: 'completed',
        downloadUrl: '/exports/exec-summary-20240209.pdf'
      },
      {
        id: 'export-2',
        name: 'Sprint Review',
        format: 'Markdown',
        timestamp: new Date('2024-02-08 16:15'),
        size: '156 KB',
        status: 'completed',
        downloadUrl: '/exports/sprint-review-20240208.md'
      },
      {
        id: 'export-3',
        name: 'Risk Assessment',
        format: 'CSV',
        timestamp: new Date('2024-02-07 11:45'),
        size: '89 KB',
        status: 'failed',
        error: 'Network timeout during generation'
      }
    ];
    setExportHistory(mockHistory);
  };

  const loadGitHubConfig = async () => {
    // Mock data - in real app, fetch from API
    const mockConfig: GitHubActionsConfig = {
      enabled: false,
      repositoryUrl: 'https://github.com/company/project-reports',
      webhookUrl: 'https://api.github.com/repos/company/project-reports/dispatches',
      triggers: {
        onCompletion: false,
        onRiskChange: true,
        onSchedule: true
      },
      authentication: {
        token: '',
        type: 'personal'
      }
    };
    setGitHubConfig(mockConfig);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await onExport(config);

      // Add to history
      const newExport: ExportHistory = {
        id: `export-${Date.now()}`,
        name: `Custom Export`,
        format: config.format.toUpperCase(),
        timestamp: new Date(),
        size: 'Calculating...',
        status: 'processing'
      };
      setExportHistory(prev => [newExport, ...prev]);

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: ExportTemplate) => {
    setConfig(prev => ({
      ...prev,
      ...template.config
    }));
  };

  const handleSectionToggle = (section: keyof ExportConfig['sections']) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections[section]
      }
    }));
  };

  const handleScheduleExport = async () => {
    if (!newSchedule.name || !onScheduleExport) return;

    try {
      setLoading(true);
      const schedule: ScheduledExport = {
        id: `schedule-${Date.now()}`,
        name: newSchedule.name,
        config: config,
        schedule: newSchedule.schedule!,
        recipients: newSchedule.recipients || [],
        enabled: newSchedule.enabled || true,
        nextRun: calculateNextRun(newSchedule.schedule!)
      };

      await onScheduleExport(schedule);
      setScheduledExports(prev => [...prev, schedule]);

      // Reset form
      setNewSchedule({
        name: '',
        config: config,
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '09:00'
        },
        recipients: [],
        enabled: true
      });
    } catch (error) {
      console.error('Failed to schedule export:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubConfigSave = async () => {
    if (!onConfigureGitHub) return;

    try {
      setLoading(true);
      await onConfigureGitHub(gitHubConfig);
    } catch (error) {
      console.error('Failed to configure GitHub Actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRun = (schedule: ScheduledExport['schedule']): Date => {
    const now = new Date();
    const nextRun = new Date();

    if (schedule.frequency === 'daily') {
      nextRun.setDate(now.getDate() + 1);
    } else if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
      const daysUntilNext = (schedule.dayOfWeek - now.getDay() + 7) % 7;
      nextRun.setDate(now.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext));
    } else if (schedule.frequency === 'monthly' && schedule.dayOfMonth !== undefined) {
      nextRun.setMonth(now.getMonth() + 1);
      nextRun.setDate(schedule.dayOfMonth);
    }

    const [hours, minutes] = schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return nextRun;
  };

  const toggleScheduledExport = async (id: string, enabled: boolean) => {
    setScheduledExports(prev =>
      prev.map(schedule =>
        schedule.id === id ? { ...schedule, enabled } : schedule
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Export Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'export', label: 'Export', icon: '📁' },
            { key: 'schedule', label: 'Schedule', icon: '🕒' },
            { key: 'history', label: 'History', icon: '📋' },
            { key: 'github', label: 'GitHub', icon: '🚀' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Templates */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EXPORT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          template.category === 'executive' ? 'bg-purple-100 text-purple-800' :
                          template.category === 'detailed' ? 'bg-blue-100 text-blue-800' :
                          template.category === 'team' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Format: {template.config.format?.toUpperCase()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Format</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(['json', 'csv', 'pdf', 'markdown'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setConfig(prev => ({ ...prev, format }))}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        config.format === format
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Scope</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'filtered', 'selected'] as const).map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setConfig(prev => ({ ...prev, scope }))}
                      disabled={scope === 'selected' && selectedItems.length === 0}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        config.scope === scope
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {scope.charAt(0).toUpperCase() + scope.slice(1)}
                      {scope === 'selected' && ` (${selectedItems.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Sections to Include</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(config.sections).map(([section, included]) => (
                    <label key={section} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => handleSectionToggle(section as keyof ExportConfig['sections'])}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Existing Schedules */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Scheduled Exports</h3>
                {scheduledExports.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledExports.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{schedule.name}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              schedule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {schedule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {schedule.schedule.frequency.charAt(0).toUpperCase() + schedule.schedule.frequency.slice(1)} at {schedule.schedule.time}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Next run: {schedule.nextRun.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleScheduledExport(schedule.id, !schedule.enabled)}
                            className={`px-3 py-1 text-xs rounded-md ${
                              schedule.enabled
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {schedule.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No scheduled exports configured
                  </div>
                )}
              </div>

              {/* New Schedule Form */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Schedule New Export</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Export name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={newSchedule.schedule?.frequency}
                      onChange={(e) => setNewSchedule(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, frequency: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={newSchedule.schedule?.time}
                      onChange={(e) => setNewSchedule(prev => ({
                        ...prev,
                        schedule: { ...prev.schedule!, time: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                    <input
                      type="text"
                      value={newSchedule.recipients?.join(', ')}
                      onChange={(e) => setNewSchedule(prev => ({
                        ...prev,
                        recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email1@company.com, email2@company.com"
                    />
                  </div>
                </div>
                <button
                  onClick={handleScheduleExport}
                  disabled={!newSchedule.name || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule Export
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Export History</h3>
              {exportHistory.length > 0 ? (
                <div className="space-y-3">
                  {exportHistory.map((export_) => (
                    <div key={export_.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{export_.name}</h4>
                          <span className="text-sm text-gray-500">{export_.format}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            export_.status === 'completed' ? 'bg-green-100 text-green-800' :
                            export_.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {export_.status.charAt(0).toUpperCase() + export_.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {export_.timestamp.toLocaleString()} • {export_.size}
                        </div>
                        {export_.error && (
                          <div className="text-sm text-red-600 mt-1">
                            {export_.error}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {export_.downloadUrl && export_.status === 'completed' && (
                          <a
                            href={export_.downloadUrl}
                            download
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            Download
                          </a>
                        )}
                        {export_.status === 'failed' && (
                          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No export history available
                </div>
              )}
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">GitHub Actions Integration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure automatic report generation and delivery via GitHub Actions workflows.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={gitHubConfig.enabled}
                    onChange={(e) => setGitHubConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Enable GitHub Actions Integration</span>
                </label>

                {gitHubConfig.enabled && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repository URL</label>
                        <input
                          type="url"
                          value={gitHubConfig.repositoryUrl}
                          onChange={(e) => setGitHubConfig(prev => ({ ...prev, repositoryUrl: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://github.com/company/project-reports"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                        <input
                          type="url"
                          value={gitHubConfig.webhookUrl}
                          onChange={(e) => setGitHubConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://api.github.com/repos/company/project-reports/dispatches"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                        <input
                          type="password"
                          value={gitHubConfig.authentication.token}
                          onChange={(e) => setGitHubConfig(prev => ({
                            ...prev,
                            authentication: { ...prev.authentication, token: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="GitHub Personal Access Token"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Triggers</label>
                      <div className="space-y-2">
                        {Object.entries(gitHubConfig.triggers).map(([trigger, enabled]) => (
                          <label key={trigger} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => setGitHubConfig(prev => ({
                                ...prev,
                                triggers: { ...prev.triggers, [trigger]: e.target.checked }
                              }))}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">
                              {trigger === 'onCompletion' ? 'On Task Completion' :
                               trigger === 'onRiskChange' ? 'On Risk Level Change' :
                               'On Schedule'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {activeTab === 'export' && (
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Exporting...' : 'Export Now'}
            </button>
          )}
          {activeTab === 'github' && gitHubConfig.enabled && (
            <button
              onClick={handleGitHubConfigSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}