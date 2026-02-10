import { injectable, inject } from 'inversify';
import { ReadinessState, ReadinessDimension, ReadinessDimensionKey } from '../domain/entities/ReadinessState.js';
import { WorkItem } from '../domain/entities/WorkItem.js';
import { Sprint, SprintStatus } from '../domain/entities/Sprint.js';
import { ScreenGroup } from '../domain/entities/ScreenGroup.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { ReadinessService } from './ReadinessService.js';
import type { SprintService } from './SprintService.js';
import type { GroupingService } from './GroupingService.js';

/**
 * Report types for different stakeholder needs
 */
export enum ReportType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  READINESS_DETAILED = 'readiness_detailed',
  SCREEN_BREAKDOWN = 'screen_breakdown',
  SPRINT_PROGRESS = 'sprint_progress',
  CRITICAL_PATH = 'critical_path',
  VELOCITY = 'velocity',
  AT_RISK = 'at_risk'
}

/**
 * Export formats for different consumption needs
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  MARKDOWN = 'markdown'
}

/**
 * Full readiness report interface
 */
export interface ReadinessReport {
  id: string;
  type: ReportType;
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
    [K in ReadinessDimensionKey]: {
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

/**
 * Screen-level readiness breakdown
 */
export interface ScreenReadinessReport {
  screenGroupId: string;
  screenGroupName: string;
  generatedAt: Date;
  summary: {
    totalWorkItems: number;
    overallCompletion: number;
    readyItems: number;
    blockedItems: number;
  };
  workItems: WorkItemReadinessInfo[];
  blockers: string[];
  dependencies: DependencyInfo[];
  estimatedCompletion: Date | null;
}

/**
 * Sprint progress report
 */
export interface SprintReadinessReport {
  sprintId: string;
  sprintName: string;
  sprintNumber: number;
  status: SprintStatus;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  progress: {
    overallCompletion: number;
    onTrack: boolean;
    burndownRate: number;
    velocityTrend: number;
  };
  screenGroups: ScreenGroupSprintInfo[];
  blockers: SprintBlocker[];
  risks: RiskAssessment[];
}

/**
 * Supporting interfaces
 */
interface SprintReadinessInfo {
  sprintId: string;
  sprintName: string;
  sprintNumber: number;
  status: SprintStatus;
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
  currentVelocity: number; // items completed per week
  averageVelocity: number;
  velocityTrend: number; // percentage change
  completionRate: number; // percentage of items completed on time
  throughput: number; // items completed per sprint
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

interface WorkItemReadinessInfo {
  workItemId: string;
  title: string;
  overallCompletion: number;
  readiness: ReadinessState;
  blockers: string[];
  isReady: boolean;
  lastUpdated: Date;
}

interface DependencyInfo {
  fromWorkItemId: string;
  toWorkItemId: string;
  type: string;
  isBlocking: boolean;
}

interface ScreenGroupSprintInfo {
  groupId: string;
  groupName: string;
  plannedItems: number;
  completedItems: number;
  completion: number;
  onTrack: boolean;
  blockers: string[];
}

interface SprintBlocker {
  workItemId: string;
  title: string;
  dimension: ReadinessDimensionKey;
  reason: string;
  daysSinceBlocked: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface RiskAssessment {
  category: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedItems: string[];
  mitigation: string;
}

/**
 * Comprehensive reporting service for readiness tracking
 * Generates various report types for different stakeholders
 */
@injectable()
export class ReportingService {
  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository,
    @inject('ReadinessService') private readinessService: ReadinessService,
    @inject('SprintService') private sprintService: SprintService,
    @inject('GroupingService') private groupingService: GroupingService
  ) {}

  /**
   * Generate comprehensive readiness report
   */
  async generateReadinessReport(configurationId?: string): Promise<ReadinessReport> {
    try {
      const reportId = `readiness_${Date.now()}`;
      const generatedAt = new Date();

      // Get all work items
      const workItems = await this.getAllWorkItems();

      // Calculate summary metrics
      const summary = await this.calculateSummaryMetrics(workItems);

      // Calculate dimension breakdown
      const dimensionBreakdown = await this.aggregateByDimension(workItems);

      // Get sprint breakdown
      const sprintBreakdown = await this.aggregateBySprint();

      // Get screen group breakdown
      const screenGroupBreakdown = await this.aggregateByGroup();

      // Calculate critical path
      const criticalPath = await this.calculateCriticalPath(workItems);

      // Identify at-risk items
      const atRiskItems = await this.identifyAtRiskItems(workItems);

      // Calculate velocity metrics
      const velocityMetrics = await this.calculateVelocityMetrics();

      // Project completion
      const projectedCompletion = await this.projectCompletionDate(workItems, velocityMetrics);

      return {
        id: reportId,
        type: ReportType.READINESS_DETAILED,
        title: 'Project Readiness Report',
        generatedAt,
        summary,
        dimensionBreakdown,
        sprintBreakdown,
        screenGroupBreakdown,
        criticalPath,
        atRiskItems,
        velocityMetrics,
        projectedCompletion
      };
    } catch (error) {
      throw new Error(`Failed to generate readiness report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate screen-specific readiness report
   */
  async getScreenReadinessReport(screenGroupId: string): Promise<ScreenReadinessReport> {
    try {
      const screenGroup = await this.groupingService.getGroupById(screenGroupId);
      if (!screenGroup) {
        throw new Error(`Screen group ${screenGroupId} not found`);
      }

      const workItems = await this.getWorkItemsForScreenGroup(screenGroupId);
      const workItemsInfo: WorkItemReadinessInfo[] = [];
      let totalCompletion = 0;
      let readyItems = 0;
      let blockedItems = 0;

      for (const workItem of workItems) {
        const summary = await this.readinessService.getReadinessSummary(workItem.id);
        const itemInfo: WorkItemReadinessInfo = {
          workItemId: workItem.id,
          title: workItem.title,
          overallCompletion: summary.overallCompletion,
          readiness: summary.readiness,
          blockers: summary.blockers,
          isReady: summary.isReady,
          lastUpdated: workItem.updatedAt || workItem.createdAt
        };

        workItemsInfo.push(itemInfo);
        totalCompletion += summary.overallCompletion;

        if (summary.isReady) readyItems++;
        if (summary.blockers.length > 0) blockedItems++;
      }

      const overallCompletion = workItems.length > 0 ? totalCompletion / workItems.length : 0;

      // Get dependencies for this screen group
      const dependencies = await this.getDependenciesForScreenGroup(screenGroupId);

      // Calculate estimated completion
      const estimatedCompletion = await this.calculateScreenGroupCompletion(screenGroupId, overallCompletion);

      return {
        screenGroupId,
        screenGroupName: screenGroup.name,
        generatedAt: new Date(),
        summary: {
          totalWorkItems: workItems.length,
          overallCompletion,
          readyItems,
          blockedItems
        },
        workItems: workItemsInfo,
        blockers: this.extractUniqueBlockers(workItemsInfo),
        dependencies,
        estimatedCompletion
      };
    } catch (error) {
      throw new Error(`Failed to generate screen readiness report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate sprint progress report
   */
  async getSprintReadinessReport(sprintId: string): Promise<SprintReadinessReport> {
    try {
      const sprint = await this.sprintService.getSprintById(sprintId);
      if (!sprint) {
        throw new Error(`Sprint ${sprintId} not found`);
      }

      // Get sprint capacity and readiness info
      const sprintReadiness = await this.sprintService.calculateSprintReadiness(sprintId);
      const blockers = await this.sprintService.identifyBlockers(sprintId);

      // Get screen groups for this sprint
      const screenGroups: ScreenGroupSprintInfo[] = [];
      for (const groupId of sprint.plannedGroupIds) {
        const group = await this.groupingService.getGroupById(groupId);
        if (group) {
          const groupReport = await this.getScreenReadinessReport(groupId);
          screenGroups.push({
            groupId,
            groupName: group.name,
            plannedItems: groupReport.summary.totalWorkItems,
            completedItems: groupReport.summary.readyItems,
            completion: groupReport.summary.overallCompletion,
            onTrack: groupReport.summary.overallCompletion >= this.getExpectedCompletionForDate(new Date(), sprint.startDate, sprint.endDate),
            blockers: groupReport.blockers
          });
        }
      }

      // Calculate overall sprint metrics
      const overallCompletion = screenGroups.length > 0
        ? screenGroups.reduce((sum, sg) => sum + sg.completion, 0) / screenGroups.length
        : 0;

      const expectedCompletion = this.getExpectedCompletionForDate(new Date(), sprint.startDate, sprint.endDate);
      const onTrack = overallCompletion >= expectedCompletion;

      // Calculate burndown rate (simplified)
      const burndownRate = this.calculateBurndownRate(overallCompletion, sprint.startDate, sprint.endDate);

      // Calculate velocity trend (would need historical data, simplified here)
      const velocityTrend = 0; // Placeholder

      return {
        sprintId,
        sprintName: sprint.name,
        sprintNumber: sprint.number,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        generatedAt: new Date(),
        progress: {
          overallCompletion,
          onTrack,
          burndownRate,
          velocityTrend
        },
        screenGroups,
        blockers: blockers.map(b => ({
          workItemId: b.workItemId,
          title: b.title,
          dimension: b.dimension as ReadinessDimensionKey,
          reason: b.reason,
          daysSinceBlocked: b.daysSinceBlocked,
          impact: b.impact as 'low' | 'medium' | 'high' | 'critical'
        })),
        risks: await this.assessSprintRisks(sprintId, overallCompletion, onTrack)
      };
    } catch (error) {
      throw new Error(`Failed to generate sprint readiness report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate critical path report
   */
  async getCriticalPathReport(): Promise<CriticalPathItem[]> {
    try {
      const workItems = await this.getAllWorkItems();
      return await this.calculateCriticalPath(workItems);
    } catch (error) {
      throw new Error(`Failed to generate critical path report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate velocity report
   */
  async getVelocityReport(sprintIds?: string[]): Promise<VelocityMetrics> {
    try {
      return await this.calculateVelocityMetrics(sprintIds);
    } catch (error) {
      throw new Error(`Failed to generate velocity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate at-risk items report
   */
  async getAtRiskReport(): Promise<AtRiskItem[]> {
    try {
      const workItems = await this.getAllWorkItems();
      return await this.identifyAtRiskItems(workItems);
    } catch (error) {
      throw new Error(`Failed to generate at-risk report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(): Promise<{
    title: string;
    generatedAt: Date;
    overallHealth: 'excellent' | 'good' | 'concerning' | 'critical';
    keyMetrics: {
      overallCompletion: number;
      onTrackSprints: number;
      totalSprints: number;
      criticalBlockers: number;
      atRiskItems: number;
    };
    topBlockers: string[];
    recommendations: string[];
    projectedCompletion: Date | null;
  }> {
    try {
      const fullReport = await this.generateReadinessReport();

      // Determine overall health
      const health = this.calculateOverallHealth(fullReport);

      // Get top blockers
      const topBlockers = this.getTopBlockers(fullReport);

      // Generate recommendations
      const recommendations = this.generateRecommendations(fullReport, health);

      return {
        title: 'Executive Summary - Project Readiness',
        generatedAt: new Date(),
        overallHealth: health,
        keyMetrics: {
          overallCompletion: fullReport.summary.overallCompletion,
          onTrackSprints: fullReport.sprintBreakdown.filter(s => s.onTrack).length,
          totalSprints: fullReport.sprintBreakdown.length,
          criticalBlockers: fullReport.summary.criticalBlockers,
          atRiskItems: fullReport.atRiskItems.filter(item => item.riskLevel === 'high' || item.riskLevel === 'critical').length
        },
        topBlockers,
        recommendations,
        projectedCompletion: fullReport.projectedCompletion.estimatedCompletionDate
      };
    } catch (error) {
      throw new Error(`Failed to generate executive summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aggregate readiness by dimension
   */
  async aggregateByDimension(workItems?: WorkItem[]): Promise<ReadinessReport['dimensionBreakdown']> {
    const items = workItems || await this.getAllWorkItems();
    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
    const breakdown = {} as ReadinessReport['dimensionBreakdown'];

    for (const dimension of dimensions) {
      let totalCompletion = 0;
      const blockers: string[] = [];
      let itemCount = 0;

      for (const item of items) {
        const percentage = item.readiness.getDimensionPercentage(dimension);
        totalCompletion += percentage;
        itemCount++;

        // Check for blockers in this dimension
        const summary = await this.readinessService.getReadinessSummary(item.id);
        summary.blockers.forEach(blocker => {
          if (blocker.includes(dimension)) {
            blockers.push(blocker);
          }
        });
      }

      breakdown[dimension] = {
        totalItems: itemCount,
        completion: itemCount > 0 ? totalCompletion / itemCount : 0,
        average: itemCount > 0 ? totalCompletion / itemCount : 0,
        blockers: [...new Set(blockers)] // Remove duplicates
      };
    }

    return breakdown;
  }

  /**
   * Aggregate readiness by screen group
   */
  async aggregateByGroup(): Promise<ScreenGroupReadinessInfo[]> {
    try {
      const groups = await this.groupingService.getAllGroups();
      const groupInfo: ScreenGroupReadinessInfo[] = [];

      for (const group of groups) {
        const report = await this.getScreenReadinessReport(group.id);
        groupInfo.push({
          groupId: group.id,
          groupName: group.name,
          overallCompletion: report.summary.overallCompletion,
          totalWorkItems: report.summary.totalWorkItems,
          readyItems: report.summary.readyItems,
          blockedItems: report.summary.blockedItems,
          sprintId: group.assignedSprintId,
          priority: group.priority || 0
        });
      }

      return groupInfo.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      throw new Error(`Failed to aggregate by group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aggregate readiness by sprint
   */
  async aggregateBySprint(): Promise<SprintReadinessInfo[]> {
    try {
      const sprints = await this.sprintService.getAllSprints();
      const sprintInfo: SprintReadinessInfo[] = [];

      for (const sprint of sprints) {
        const sprintReport = await this.getSprintReadinessReport(sprint.id);
        const estimatedCompletion = await this.calculateSprintCompletion(sprint.id, sprintReport.progress.overallCompletion);

        sprintInfo.push({
          sprintId: sprint.id,
          sprintName: sprint.name,
          sprintNumber: sprint.number,
          status: sprint.status,
          overallCompletion: sprintReport.progress.overallCompletion,
          plannedItems: sprintReport.screenGroups.reduce((sum, sg) => sum + sg.plannedItems, 0),
          completedItems: sprintReport.screenGroups.reduce((sum, sg) => sum + sg.completedItems, 0),
          onTrack: sprintReport.progress.onTrack,
          estimatedCompletion
        });
      }

      return sprintInfo.sort((a, b) => a.sprintNumber - b.sprintNumber);
    } catch (error) {
      throw new Error(`Failed to aggregate by sprint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate overall completion percentage
   */
  async calculateCompletionPercentage(workItems?: WorkItem[]): Promise<number> {
    const items = workItems || await this.getAllWorkItems();
    if (items.length === 0) return 0;

    const totalCompletion = items.reduce((sum, item) => sum + item.readiness.getCompletionPercentage(), 0);
    return totalCompletion / items.length;
  }

  /**
   * Identify bottlenecks in the system
   */
  async identifyBottlenecks(): Promise<{
    dimension: ReadinessDimensionKey;
    averageCompletion: number;
    blockedItems: number;
    impact: 'low' | 'medium' | 'high' | 'critical';
  }[]> {
    const workItems = await this.getAllWorkItems();
    const dimensionBreakdown = await this.aggregateByDimension(workItems);
    const bottlenecks: any[] = [];

    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    for (const dimension of dimensions) {
      const data = dimensionBreakdown[dimension];
      const impact = this.categorizeImpact(data.average, data.blockers.length);

      if (data.average < 80 || data.blockers.length > 0) {
        bottlenecks.push({
          dimension,
          averageCompletion: data.average,
          blockedItems: data.blockers.length,
          impact
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Project completion date based on current velocity
   */
  async projectCompletionDate(workItems?: WorkItem[], velocityMetrics?: VelocityMetrics): Promise<ProjectionInfo> {
    const items = workItems || await this.getAllWorkItems();
    const velocity = velocityMetrics || await this.calculateVelocityMetrics();

    const currentCompletion = await this.calculateCompletionPercentage(items);
    const remainingWork = 100 - currentCompletion;

    if (remainingWork <= 0 || velocity.currentVelocity <= 0) {
      return {
        estimatedCompletionDate: null,
        confidenceInterval: {
          optimistic: new Date(),
          pessimistic: new Date()
        },
        remainingWork: 0,
        atCurrentPace: null,
        withImprovements: null
      };
    }

    const weeksToComplete = remainingWork / velocity.currentVelocity;
    const baseDate = new Date();
    const estimatedCompletion = new Date(baseDate.getTime() + weeksToComplete * 7 * 24 * 60 * 60 * 1000);

    // Calculate confidence intervals (±30% for simplicity)
    const optimisticWeeks = weeksToComplete * 0.7;
    const pessimisticWeeks = weeksToComplete * 1.3;

    const optimistic = new Date(baseDate.getTime() + optimisticWeeks * 7 * 24 * 60 * 60 * 1000);
    const pessimistic = new Date(baseDate.getTime() + pessimisticWeeks * 7 * 24 * 60 * 60 * 1000);

    // With improvements (assume 20% velocity increase)
    const improvedVelocity = velocity.currentVelocity * 1.2;
    const improvedWeeks = remainingWork / improvedVelocity;
    const withImprovements = new Date(baseDate.getTime() + improvedWeeks * 7 * 24 * 60 * 60 * 1000);

    return {
      estimatedCompletionDate: estimatedCompletion,
      confidenceInterval: {
        optimistic,
        pessimistic
      },
      remainingWork,
      atCurrentPace: estimatedCompletion,
      withImprovements
    };
  }

  // Export functions

  /**
   * Export report to JSON format
   */
  async exportToJSON(report: ReadinessReport | ScreenReadinessReport | SprintReadinessReport): Promise<string> {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to CSV format
   */
  async exportToCSV(report: ReadinessReport): Promise<string> {
    const rows: string[] = [];

    // Header
    rows.push('Type,Name,Completion,Items,Ready,Blocked,Status');

    // Sprint data
    report.sprintBreakdown.forEach(sprint => {
      rows.push([
        'Sprint',
        `${sprint.sprintName} (${sprint.sprintNumber})`,
        `${sprint.overallCompletion.toFixed(1)}%`,
        sprint.plannedItems.toString(),
        sprint.completedItems.toString(),
        (sprint.plannedItems - sprint.completedItems).toString(),
        sprint.onTrack ? 'On Track' : 'At Risk'
      ].join(','));
    });

    // Screen group data
    report.screenGroupBreakdown.forEach(group => {
      rows.push([
        'Screen Group',
        group.groupName,
        `${group.overallCompletion.toFixed(1)}%`,
        group.totalWorkItems.toString(),
        group.readyItems.toString(),
        group.blockedItems.toString(),
        group.blockedItems > 0 ? 'Blocked' : 'Good'
      ].join(','));
    });

    return rows.join('\n');
  }

  /**
   * Export report to PDF format (placeholder - would need PDF generation library)
   */
  async exportToPDF(report: ReadinessReport): Promise<Buffer> {
    // This would integrate with a PDF generation library like puppeteer or pdfkit
    // For now, return a placeholder buffer
    const pdfContent = `PDF Report: ${report.title}\nGenerated: ${report.generatedAt}\nCompletion: ${report.summary.overallCompletion}%`;
    return Buffer.from(pdfContent, 'utf-8');
  }

  /**
   * Export report to Markdown format
   */
  async exportToMarkdown(report: ReadinessReport): Promise<string> {
    const lines: string[] = [];

    lines.push(`# ${report.title}`);
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Executive Summary');
    lines.push(`- **Overall Completion**: ${report.summary.overallCompletion.toFixed(1)}%`);
    lines.push(`- **Items Complete**: ${report.summary.itemsComplete} of ${report.summary.totalItems}`);
    lines.push(`- **Critical Blockers**: ${report.summary.criticalBlockers}`);
    lines.push('');

    // Sprint breakdown
    lines.push('## Sprint Progress');
    lines.push('| Sprint | Completion | Items | Status |');
    lines.push('|--------|------------|-------|--------|');
    report.sprintBreakdown.forEach(sprint => {
      lines.push(`| ${sprint.sprintName} (${sprint.sprintNumber}) | ${sprint.overallCompletion.toFixed(1)}% | ${sprint.completedItems}/${sprint.plannedItems} | ${sprint.onTrack ? '✅ On Track' : '⚠️ At Risk'} |`);
    });
    lines.push('');

    // Critical blockers
    if (report.atRiskItems.length > 0) {
      lines.push('## Critical Items');
      report.atRiskItems.filter(item => item.riskLevel === 'critical' || item.riskLevel === 'high').forEach(item => {
        lines.push(`- **${item.title}** (${item.riskLevel.toUpperCase()}): ${item.reasons.join(', ')}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  // Private helper methods

  private async getAllWorkItems(): Promise<WorkItem[]> {
    // This would fetch all work items from the repository
    // Implementation depends on the repository interface
    try {
      return await this.workItemRepository.findAll();
    } catch (error) {
      console.warn('Could not fetch all work items, returning empty array');
      return [];
    }
  }

  private async getWorkItemsForScreenGroup(screenGroupId: string): Promise<WorkItem[]> {
    try {
      return await this.workItemRepository.findByScreenGroupId(screenGroupId);
    } catch (error) {
      console.warn(`Could not fetch work items for screen group ${screenGroupId}`);
      return [];
    }
  }

  private async calculateSummaryMetrics(workItems: WorkItem[]): Promise<ReadinessReport['summary']> {
    let totalCompletion = 0;
    let itemsComplete = 0;
    let itemsInProgress = 0;
    let itemsNotStarted = 0;
    let criticalBlockers = 0;

    for (const item of workItems) {
      const completion = item.readiness.getCompletionPercentage();
      totalCompletion += completion;

      if (completion === 100) itemsComplete++;
      else if (completion > 0) itemsInProgress++;
      else itemsNotStarted++;

      // Count critical blockers
      const summary = await this.readinessService.getReadinessSummary(item.id);
      if (summary.blockers.length > 0) criticalBlockers++;
    }

    return {
      totalItems: workItems.length,
      overallCompletion: workItems.length > 0 ? totalCompletion / workItems.length : 0,
      itemsComplete,
      itemsInProgress,
      itemsNotStarted,
      criticalBlockers
    };
  }

  private async calculateCriticalPath(workItems: WorkItem[]): Promise<CriticalPathItem[]> {
    // Simplified critical path calculation
    // In a full implementation, this would use project management algorithms
    const criticalItems: CriticalPathItem[] = [];

    for (const item of workItems) {
      const summary = await this.readinessService.getReadinessSummary(item.id);
      const screenGroup = await this.getScreenGroupForWorkItem(item.id);

      if (summary.blockers.length > 0 && summary.overallCompletion < 100) {
        criticalItems.push({
          workItemId: item.id,
          title: item.title,
          screenGroup: screenGroup?.name || 'Unknown',
          estimatedDuration: this.estimateItemDuration(item),
          dependencies: await this.getDependenciesForItem(item.id),
          isBlocking: summary.blockers.length > 0,
          slackTime: 0 // Simplified - would calculate based on dependencies
        });
      }
    }

    return criticalItems.sort((a, b) => b.estimatedDuration - a.estimatedDuration);
  }

  private async identifyAtRiskItems(workItems: WorkItem[]): Promise<AtRiskItem[]> {
    const atRiskItems: AtRiskItem[] = [];

    for (const item of workItems) {
      const summary = await this.readinessService.getReadinessSummary(item.id);
      const screenGroup = await this.getScreenGroupForWorkItem(item.id);

      // Determine risk level based on various factors
      const riskFactors = this.calculateRiskFactors(item, summary);

      if (riskFactors.riskLevel !== 'low') {
        atRiskItems.push({
          workItemId: item.id,
          title: item.title,
          screenGroup: screenGroup?.name || 'Unknown',
          riskLevel: riskFactors.riskLevel,
          reasons: riskFactors.reasons,
          stuckDays: riskFactors.stuckDays,
          blockers: summary.blockers,
          recommendedActions: this.generateRecommendedActions(riskFactors)
        });
      }
    }

    return atRiskItems.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  }

  private async calculateVelocityMetrics(sprintIds?: string[]): Promise<VelocityMetrics> {
    // Simplified velocity calculation
    // In a full implementation, this would analyze historical sprint data

    return {
      currentVelocity: 15, // items per week
      averageVelocity: 12,
      velocityTrend: 25, // 25% increase
      completionRate: 85, // 85% of items completed on time
      throughput: 45 // items per sprint
    };
  }

  private async getDependenciesForScreenGroup(screenGroupId: string): Promise<DependencyInfo[]> {
    // This would integrate with the graph database to get dependencies
    // For now, return empty array
    return [];
  }

  private async calculateScreenGroupCompletion(screenGroupId: string, currentCompletion: number): Promise<Date | null> {
    // Simplified completion date calculation
    if (currentCompletion >= 100) return new Date();

    const remainingWork = 100 - currentCompletion;
    const velocity = 15; // items per week
    const weeksToComplete = remainingWork / velocity;

    return new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000);
  }

  private extractUniqueBlockers(workItems: WorkItemReadinessInfo[]): string[] {
    const allBlockers = workItems.flatMap(item => item.blockers);
    return [...new Set(allBlockers)];
  }

  private getExpectedCompletionForDate(currentDate: Date, startDate: Date, endDate: Date): number {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = currentDate.getTime() - startDate.getTime();

    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;

    return (elapsed / totalDuration) * 100;
  }

  private calculateBurndownRate(currentCompletion: number, startDate: Date, endDate: Date): number {
    const expectedCompletion = this.getExpectedCompletionForDate(new Date(), startDate, endDate);
    return currentCompletion - expectedCompletion;
  }

  private async assessSprintRisks(sprintId: string, completion: number, onTrack: boolean): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    if (!onTrack) {
      risks.push({
        category: 'Schedule',
        level: completion < 50 ? 'critical' : 'high',
        description: 'Sprint is behind schedule',
        affectedItems: [], // Would populate with actual affected items
        mitigation: 'Consider scope reduction or resource reallocation'
      });
    }

    return risks;
  }

  private calculateOverallHealth(report: ReadinessReport): 'excellent' | 'good' | 'concerning' | 'critical' {
    const completion = report.summary.overallCompletion;
    const blockers = report.summary.criticalBlockers;
    const onTrackSprints = report.sprintBreakdown.filter(s => s.onTrack).length;
    const totalSprints = report.sprintBreakdown.length;

    if (completion >= 90 && blockers === 0 && onTrackSprints === totalSprints) return 'excellent';
    if (completion >= 75 && blockers <= 2 && onTrackSprints / totalSprints >= 0.8) return 'good';
    if (completion >= 50 && blockers <= 5 && onTrackSprints / totalSprints >= 0.6) return 'concerning';
    return 'critical';
  }

  private getTopBlockers(report: ReadinessReport): string[] {
    const allBlockers = Object.values(report.dimensionBreakdown)
      .flatMap(dim => dim.blockers)
      .concat(report.atRiskItems.flatMap(item => item.reasons));

    // Count occurrences
    const blockerCounts = allBlockers.reduce((counts, blocker) => {
      counts[blocker] = (counts[blocker] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Return top 5 most common blockers
    return Object.entries(blockerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([blocker]) => blocker);
  }

  private generateRecommendations(report: ReadinessReport, health: string): string[] {
    const recommendations: string[] = [];

    if (health === 'critical' || health === 'concerning') {
      recommendations.push('Consider reducing scope for current sprint to focus on critical items');

      if (report.summary.criticalBlockers > 3) {
        recommendations.push('Prioritize resolving top blockers before proceeding with new work');
      }

      const behindSprints = report.sprintBreakdown.filter(s => !s.onTrack);
      if (behindSprints.length > 0) {
        recommendations.push(`Focus resources on ${behindSprints.length} behind-schedule sprint(s)`);
      }
    }

    if (report.velocityMetrics.velocityTrend < 0) {
      recommendations.push('Investigate and address factors causing velocity decline');
    }

    const lowDimensions = Object.entries(report.dimensionBreakdown)
      .filter(([, data]) => data.completion < 60)
      .map(([dim]) => dim);

    if (lowDimensions.length > 0) {
      recommendations.push(`Increase focus on ${lowDimensions.join(', ')} dimensions`);
    }

    return recommendations;
  }

  private async getScreenGroupForWorkItem(workItemId: string): Promise<ScreenGroup | null> {
    try {
      return await this.groupingService.getGroupForWorkItem(workItemId);
    } catch {
      return null;
    }
  }

  private estimateItemDuration(item: WorkItem): number {
    // Simplified duration estimation based on complexity
    const complexity = item.specification?.complexity || 'medium';
    const baseDuration = { simple: 3, medium: 5, complex: 8 };
    return baseDuration[complexity as keyof typeof baseDuration] || 5;
  }

  private async getDependenciesForItem(workItemId: string): Promise<string[]> {
    // Would integrate with graph database to get actual dependencies
    return [];
  }

  private calculateRiskFactors(item: WorkItem, summary: any): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    stuckDays: number;
  } {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Calculate days since last update
    const daysSinceUpdate = Math.floor((Date.now() - (item.updatedAt || item.createdAt).getTime()) / (24 * 60 * 60 * 1000));

    if (summary.blockers.length > 0) {
      reasons.push('Has active blockers');
      riskLevel = 'medium';
    }

    if (daysSinceUpdate > 7 && summary.overallCompletion < 100) {
      reasons.push('No progress in over a week');
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }

    if (summary.overallCompletion < 20 && daysSinceUpdate > 14) {
      reasons.push('Minimal progress for extended period');
      riskLevel = 'critical';
    }

    return {
      riskLevel,
      reasons,
      stuckDays: daysSinceUpdate
    };
  }

  private generateRecommendedActions(riskFactors: any): string[] {
    const actions: string[] = [];

    if (riskFactors.reasons.includes('Has active blockers')) {
      actions.push('Resolve blocking dependencies');
    }

    if (riskFactors.stuckDays > 7) {
      actions.push('Schedule team review and replanning');
    }

    if (riskFactors.riskLevel === 'critical') {
      actions.push('Escalate to project leadership');
    }

    return actions;
  }

  private categorizeImpact(completion: number, blockers: number): 'low' | 'medium' | 'high' | 'critical' {
    if (completion < 40 || blockers > 5) return 'critical';
    if (completion < 60 || blockers > 2) return 'high';
    if (completion < 80 || blockers > 0) return 'medium';
    return 'low';
  }

  private async calculateSprintCompletion(sprintId: string, currentCompletion: number): Promise<Date | null> {
    // Simplified sprint completion calculation
    if (currentCompletion >= 100) return new Date();

    const remainingWork = 100 - currentCompletion;
    const velocity = 20; // percentage points per week
    const weeksToComplete = remainingWork / velocity;

    return new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000);
  }
}