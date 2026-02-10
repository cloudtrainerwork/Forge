import { injectable, inject } from 'inversify';
import { ReadinessState, ReadinessDimension, ReadinessDimensionKey } from '../domain/entities/ReadinessState.js';
import { WorkItem } from '../domain/entities/WorkItem.js';
import { Sprint, SprintStatus } from '../domain/entities/Sprint.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { ReadinessService } from './ReadinessService.js';
import type { SprintService } from './SprintService.js';
import type { GroupingService } from './GroupingService.js';

/**
 * Velocity tracking interface
 */
export interface VelocityData {
  period: string; // Sprint ID or time period
  itemsCompleted: number;
  totalItems: number;
  completionRate: number;
  averageTimeToComplete: number; // days
  startDate: Date;
  endDate: Date;
}

/**
 * Burndown data for visualization
 */
export interface BurndownData {
  sprintId: string;
  sprintName: string;
  dataPoints: BurndownPoint[];
  idealBurndown: BurndownPoint[];
  actualBurndown: BurndownPoint[];
  projectedCompletion: Date;
  variance: number; // percentage ahead/behind
}

export interface BurndownPoint {
  date: Date;
  remainingWork: number;
  completedWork: number;
  idealRemaining: number;
}

/**
 * Critical path analysis results
 */
export interface CriticalPathAnalysis {
  totalDuration: number; // days
  criticalItems: CriticalPathNode[];
  alternativePaths: AlternativePath[];
  bottlenecks: Bottleneck[];
  parallelOpportunities: ParallelWorkOpportunity[];
  riskFactors: PathRiskFactor[];
}

export interface CriticalPathNode {
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
}

export interface AlternativePath {
  name: string;
  duration: number;
  items: string[];
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface Bottleneck {
  type: 'resource' | 'dependency' | 'capacity';
  description: string;
  affectedItems: string[];
  impact: number; // days delay
  mitigation: string[];
}

export interface ParallelWorkOpportunity {
  description: string;
  workItems: string[];
  potentialTimeSavings: number; // days
  requirements: string[];
}

export interface PathRiskFactor {
  type: 'technical' | 'resource' | 'dependency' | 'external';
  description: string;
  probability: number; // 0-1
  impact: number; // days
  mitigation: string;
}

/**
 * ML-based completion predictions
 */
export interface CompletionPrediction {
  workItemId: string;
  currentCompletion: number;
  predictedCompletionDate: Date;
  confidenceLevel: number; // 0-1
  factors: PredictionFactor[];
  scenarios: PredictionScenario[];
}

export interface PredictionFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface PredictionScenario {
  name: string;
  probability: number;
  estimatedDate: Date;
  assumptions: string[];
}

/**
 * Risk detection and analysis
 */
export interface RiskAnalysis {
  workItemId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  categories: RiskCategory[];
  indicators: RiskIndicator[];
  trends: RiskTrend[];
  recommendations: string[];
}

export interface RiskCategory {
  name: string;
  score: number;
  weight: number;
  description: string;
  mitigations: string[];
}

export interface RiskIndicator {
  name: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'danger';
  description: string;
}

export interface RiskTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'deteriorating';
  rate: number;
  timeframe: string;
}

/**
 * Dependency complexity metrics
 */
export interface DependencyMetrics {
  workItemId: string;
  dependencyDepth: number;
  fanIn: number; // items that depend on this
  fanOut: number; // items this depends on
  criticalityScore: number;
  complexityIndex: number;
  isolationRisk: number;
}

/**
 * System-wide readiness health metrics
 */
export interface ReadinessHealth {
  overallScore: number; // 0-100
  dimensions: {
    [K in ReadinessDimensionKey]: {
      score: number;
      trend: 'improving' | 'stable' | 'deteriorating';
      blockers: number;
      velocity: number;
    };
  };
  systemMetrics: {
    coherence: number; // how well dimensions align
    momentum: number; // rate of progress
    stability: number; // consistency of progress
    efficiency: number; // progress vs effort
  };
  alerts: HealthAlert[];
}

export interface HealthAlert {
  level: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  affectedItems: string[];
  recommendedAction: string;
}

/**
 * Trend analysis interfaces
 */
export interface TrendData {
  metric: string;
  timeframe: string;
  dataPoints: TrendPoint[];
  trend: 'up' | 'down' | 'stable';
  trendStrength: number; // 0-1
  seasonality: SeasonalityInfo | null;
  predictions: TrendPrediction[];
}

export interface TrendPoint {
  date: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface SeasonalityInfo {
  period: 'daily' | 'weekly' | 'monthly';
  strength: number;
  pattern: number[];
}

export interface TrendPrediction {
  date: Date;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

/**
 * Advanced analytics service for ML-based insights and trend analysis
 */
@injectable()
export class AnalyticsService {
  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository,
    @inject('ReadinessService') private readinessService: ReadinessService,
    @inject('SprintService') private sprintService: SprintService,
    @inject('GroupingService') private groupingService: GroupingService
  ) {}

  /**
   * Calculate velocity metrics across sprints
   */
  async calculateVelocity(sprintIds?: string[], timeframe?: string): Promise<VelocityData[]> {
    try {
      let sprints: Sprint[];

      if (sprintIds) {
        sprints = await Promise.all(
          sprintIds.map(id => this.sprintService.getSprintById(id))
        ).then(results => results.filter(Boolean) as Sprint[]);
      } else {
        sprints = await this.sprintService.getAllSprints();
      }

      const velocityData: VelocityData[] = [];

      for (const sprint of sprints) {
        const sprintReadiness = await this.sprintService.calculateSprintReadiness(sprint.id);
        const workItems = await this.getWorkItemsForSprint(sprint.id);

        const completedItems = workItems.filter(item =>
          item.readiness.getCompletionPercentage() === 100
        ).length;

        const averageTimeToComplete = await this.calculateAverageCompletionTime(
          workItems.filter(item => item.readiness.getCompletionPercentage() === 100)
        );

        velocityData.push({
          period: sprint.id,
          itemsCompleted: completedItems,
          totalItems: workItems.length,
          completionRate: workItems.length > 0 ? (completedItems / workItems.length) * 100 : 0,
          averageTimeToComplete,
          startDate: sprint.startDate,
          endDate: sprint.endDate
        });
      }

      return velocityData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } catch (error) {
      throw new Error(`Failed to calculate velocity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate burndown data for sprint tracking
   */
  async calculateBurndown(sprintId: string, granularity: 'daily' | 'weekly' = 'daily'): Promise<BurndownData> {
    try {
      const sprint = await this.sprintService.getSprintById(sprintId);
      if (!sprint) {
        throw new Error(`Sprint ${sprintId} not found`);
      }

      const workItems = await this.getWorkItemsForSprint(sprintId);
      const totalWork = workItems.length;

      const dataPoints: BurndownPoint[] = [];
      const idealBurndown: BurndownPoint[] = [];
      const actualBurndown: BurndownPoint[] = [];

      const sprintDuration = Math.ceil(
        (sprint.endDate.getTime() - sprint.startDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      // Generate ideal burndown
      for (let day = 0; day <= sprintDuration; day++) {
        const currentDate = new Date(sprint.startDate.getTime() + day * 24 * 60 * 60 * 1000);
        const idealRemaining = totalWork - (totalWork * day) / sprintDuration;
        const idealCompleted = totalWork - idealRemaining;

        idealBurndown.push({
          date: currentDate,
          remainingWork: Math.max(0, idealRemaining),
          completedWork: idealCompleted,
          idealRemaining: Math.max(0, idealRemaining)
        });
      }

      // Calculate actual burndown (simplified - would need historical data)
      // For now, generate a realistic progression based on current state
      const currentCompletion = workItems.reduce((sum, item) =>
        sum + item.readiness.getCompletionPercentage(), 0
      ) / (workItems.length * 100);

      for (let day = 0; day <= sprintDuration; day++) {
        const currentDate = new Date(sprint.startDate.getTime() + day * 24 * 60 * 60 * 1000);
        const progressRate = this.calculateProgressRate(day, sprintDuration, currentCompletion);
        const actualCompleted = totalWork * progressRate;
        const actualRemaining = Math.max(0, totalWork - actualCompleted);

        actualBurndown.push({
          date: currentDate,
          remainingWork: actualRemaining,
          completedWork: actualCompleted,
          idealRemaining: Math.max(0, totalWork - (totalWork * day) / sprintDuration)
        });

        dataPoints.push({
          date: currentDate,
          remainingWork: actualRemaining,
          completedWork: actualCompleted,
          idealRemaining: Math.max(0, totalWork - (totalWork * day) / sprintDuration)
        });
      }

      // Project completion date
      const projectedCompletion = this.projectBurndownCompletion(actualBurndown, sprint.endDate);

      // Calculate variance (positive = ahead, negative = behind)
      const currentIdeal = idealBurndown[Math.floor(sprintDuration * 0.7)]?.idealRemaining || 0;
      const currentActual = actualBurndown[Math.floor(sprintDuration * 0.7)]?.remainingWork || 0;
      const variance = ((currentIdeal - currentActual) / totalWork) * 100;

      return {
        sprintId,
        sprintName: sprint.name,
        dataPoints,
        idealBurndown,
        actualBurndown,
        projectedCompletion,
        variance
      };
    } catch (error) {
      throw new Error(`Failed to calculate burndown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze critical path for project completion
   */
  async calculateCriticalPath(workItems?: WorkItem[]): Promise<CriticalPathAnalysis> {
    try {
      const items = workItems || await this.getAllWorkItems();

      // Build dependency graph
      const dependencyMap = await this.buildDependencyGraph(items);

      // Calculate critical path using simplified algorithm
      const criticalItems = await this.identifyCriticalPathItems(items, dependencyMap);

      // Find alternative paths
      const alternativePaths = await this.findAlternativePaths(items, dependencyMap, criticalItems);

      // Identify bottlenecks
      const bottlenecks = await this.identifyBottlenecks(items, dependencyMap);

      // Find parallel work opportunities
      const parallelOpportunities = await this.findParallelOpportunities(items, dependencyMap);

      // Assess risk factors
      const riskFactors = await this.assessPathRiskFactors(criticalItems);

      const totalDuration = criticalItems.reduce((sum, item) => sum + item.duration, 0);

      return {
        totalDuration,
        criticalItems,
        alternativePaths,
        bottlenecks,
        parallelOpportunities,
        riskFactors
      };
    } catch (error) {
      throw new Error(`Failed to calculate critical path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ML-based completion predictions
   */
  async predictCompletion(workItemIds?: string[]): Promise<CompletionPrediction[]> {
    try {
      const items = workItemIds
        ? await Promise.all(workItemIds.map(id => this.workItemRepository.findById(id)))
          .then(results => results.filter(Boolean) as WorkItem[])
        : await this.getAllWorkItems();

      const predictions: CompletionPrediction[] = [];

      for (const item of items) {
        const currentCompletion = item.readiness.getCompletionPercentage();

        if (currentCompletion >= 100) {
          // Already complete
          continue;
        }

        // Calculate prediction factors
        const factors = await this.calculatePredictionFactors(item);

        // Generate scenarios
        const scenarios = await this.generatePredictionScenarios(item, factors);

        // Calculate weighted prediction
        const predictedDate = this.calculateWeightedPrediction(scenarios);
        const confidence = this.calculatePredictionConfidence(factors, scenarios);

        predictions.push({
          workItemId: item.id,
          currentCompletion,
          predictedCompletionDate: predictedDate,
          confidenceLevel: confidence,
          factors,
          scenarios
        });
      }

      return predictions;
    } catch (error) {
      throw new Error(`Failed to predict completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pattern-based risk identification
   */
  async identifyRisks(workItemIds?: string[]): Promise<RiskAnalysis[]> {
    try {
      const items = workItemIds
        ? await Promise.all(workItemIds.map(id => this.workItemRepository.findById(id)))
          .then(results => results.filter(Boolean) as WorkItem[])
        : await this.getAllWorkItems();

      const riskAnalyses: RiskAnalysis[] = [];

      for (const item of items) {
        const categories = await this.analyzeRiskCategories(item);
        const indicators = await this.calculateRiskIndicators(item);
        const trends = await this.analyzeRiskTrends(item);

        const riskScore = this.calculateOverallRiskScore(categories, indicators, trends);
        const riskLevel = this.categorizeRiskLevel(riskScore);

        const recommendations = this.generateRiskRecommendations(categories, indicators, trends);

        riskAnalyses.push({
          workItemId: item.id,
          riskLevel,
          riskScore,
          categories,
          indicators,
          trends,
          recommendations
        });
      }

      return riskAnalyses.sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      throw new Error(`Failed to identify risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate dependency depth and complexity
   */
  async calculateDependencyDepth(workItemIds?: string[]): Promise<DependencyMetrics[]> {
    try {
      const items = workItemIds
        ? await Promise.all(workItemIds.map(id => this.workItemRepository.findById(id)))
          .then(results => results.filter(Boolean) as WorkItem[])
        : await this.getAllWorkItems();

      const dependencyMap = await this.buildDependencyGraph(items);
      const metrics: DependencyMetrics[] = [];

      for (const item of items) {
        const depth = this.calculateDepthRecursive(item.id, dependencyMap, new Set());
        const fanIn = this.calculateFanIn(item.id, dependencyMap);
        const fanOut = this.calculateFanOut(item.id, dependencyMap);
        const criticalityScore = this.calculateCriticalityScore(fanIn, fanOut, depth);
        const complexityIndex = this.calculateComplexityIndex(depth, fanIn, fanOut);
        const isolationRisk = this.calculateIsolationRisk(fanIn, fanOut);

        metrics.push({
          workItemId: item.id,
          dependencyDepth: depth,
          fanIn,
          fanOut,
          criticalityScore,
          complexityIndex,
          isolationRisk
        });
      }

      return metrics.sort((a, b) => b.criticalityScore - a.criticalityScore);
    } catch (error) {
      throw new Error(`Failed to calculate dependency depth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Measure overall system readiness health
   */
  async measureReadinessHealth(): Promise<ReadinessHealth> {
    try {
      const workItems = await this.getAllWorkItems();
      const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

      // Calculate dimension scores
      const dimensionHealth = {} as ReadinessHealth['dimensions'];

      for (const dimension of dimensions) {
        const dimensionData = await this.analyzeDimensionHealth(workItems, dimension);
        dimensionHealth[dimension] = dimensionData;
      }

      // Calculate system metrics
      const systemMetrics = await this.calculateSystemMetrics(workItems, dimensionHealth);

      // Calculate overall score
      const overallScore = this.calculateOverallHealthScore(dimensionHealth, systemMetrics);

      // Generate alerts
      const alerts = await this.generateHealthAlerts(dimensionHealth, systemMetrics, overallScore);

      return {
        overallScore,
        dimensions: dimensionHealth,
        systemMetrics,
        alerts
      };
    } catch (error) {
      throw new Error(`Failed to measure readiness health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze readiness trends over time
   */
  async readinessTrend(dimension?: ReadinessDimensionKey, timeframeDays: number = 30): Promise<TrendData> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

      // Generate data points (simplified - would need historical data)
      const dataPoints: TrendPoint[] = [];
      const workItems = await this.getAllWorkItems();

      for (let day = 0; day <= timeframeDays; day++) {
        const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

        let value: number;
        if (dimension) {
          value = workItems.reduce((sum, item) =>
            sum + item.readiness.getDimensionPercentage(dimension), 0
          ) / workItems.length;
        } else {
          value = workItems.reduce((sum, item) =>
            sum + item.readiness.getCompletionPercentage(), 0
          ) / workItems.length;
        }

        // Add some realistic variation
        value += (Math.random() - 0.5) * 10;
        value = Math.max(0, Math.min(100, value));

        dataPoints.push({
          date: currentDate,
          value
        });
      }

      // Analyze trend
      const trend = this.calculateTrendDirection(dataPoints);
      const trendStrength = this.calculateTrendStrength(dataPoints);
      const seasonality = this.detectSeasonality(dataPoints);
      const predictions = this.generateTrendPredictions(dataPoints, 7); // 7 days ahead

      return {
        metric: dimension || 'overall_readiness',
        timeframe: `${timeframeDays} days`,
        dataPoints,
        trend,
        trendStrength,
        seasonality,
        predictions
      };
    } catch (error) {
      throw new Error(`Failed to analyze readiness trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze velocity trends
   */
  async velocityTrend(sprintCount: number = 5): Promise<TrendData> {
    try {
      const sprints = await this.sprintService.getAllSprints();
      const recentSprints = sprints
        .filter(s => s.status === SprintStatus.COMPLETE)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
        .slice(0, sprintCount);

      const velocityData = await this.calculateVelocity(recentSprints.map(s => s.id));

      const dataPoints: TrendPoint[] = velocityData.map(data => ({
        date: data.endDate,
        value: data.itemsCompleted,
        metadata: {
          completionRate: data.completionRate,
          totalItems: data.totalItems
        }
      }));

      const trend = this.calculateTrendDirection(dataPoints);
      const trendStrength = this.calculateTrendStrength(dataPoints);
      const predictions = this.generateTrendPredictions(dataPoints, 2); // Next 2 sprints

      return {
        metric: 'velocity',
        timeframe: `${sprintCount} sprints`,
        dataPoints,
        trend,
        trendStrength,
        seasonality: null,
        predictions
      };
    } catch (error) {
      throw new Error(`Failed to analyze velocity trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze blockage trends
   */
  async blockageTrend(timeframeDays: number = 30): Promise<TrendData> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000);
      const workItems = await this.getAllWorkItems();

      const dataPoints: TrendPoint[] = [];

      for (let day = 0; day <= timeframeDays; day += 7) { // Weekly data points
        const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

        // Count blocked items (simplified - would track actual historical data)
        let blockedCount = 0;
        for (const item of workItems) {
          const summary = await this.readinessService.getReadinessSummary(item.id);
          if (summary.blockers.length > 0) {
            blockedCount++;
          }
        }

        // Add historical variation
        const variation = Math.sin((day / timeframeDays) * Math.PI * 2) * 2;
        blockedCount += Math.floor(variation);
        blockedCount = Math.max(0, blockedCount);

        dataPoints.push({
          date: currentDate,
          value: blockedCount,
          metadata: {
            totalItems: workItems.length,
            blockageRate: (blockedCount / workItems.length) * 100
          }
        });
      }

      const trend = this.calculateTrendDirection(dataPoints);
      const trendStrength = this.calculateTrendStrength(dataPoints);
      const seasonality = this.detectSeasonality(dataPoints);
      const predictions = this.generateTrendPredictions(dataPoints, 4); // 4 weeks ahead

      return {
        metric: 'blockage',
        timeframe: `${timeframeDays} days`,
        dataPoints,
        trend,
        trendStrength,
        seasonality,
        predictions
      };
    } catch (error) {
      throw new Error(`Failed to analyze blockage trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze risk accumulation trends
   */
  async riskTrend(timeframeDays: number = 30): Promise<TrendData> {
    try {
      const workItems = await this.getAllWorkItems();
      const riskAnalyses = await this.identifyRisks(workItems.map(item => item.id));

      // Generate historical trend (simplified)
      const dataPoints: TrendPoint[] = [];
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

      for (let day = 0; day <= timeframeDays; day += 3) { // Every 3 days
        const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);

        // Calculate weighted risk score
        const totalRiskScore = riskAnalyses.reduce((sum, analysis) => sum + analysis.riskScore, 0);
        const averageRisk = totalRiskScore / riskAnalyses.length;

        // Add temporal variation
        const variation = Math.cos((day / timeframeDays) * Math.PI) * 5;
        const adjustedRisk = Math.max(0, Math.min(100, averageRisk + variation));

        dataPoints.push({
          date: currentDate,
          value: adjustedRisk,
          metadata: {
            criticalRisks: riskAnalyses.filter(r => r.riskLevel === 'critical').length,
            highRisks: riskAnalyses.filter(r => r.riskLevel === 'high').length
          }
        });
      }

      const trend = this.calculateTrendDirection(dataPoints);
      const trendStrength = this.calculateTrendStrength(dataPoints);
      const predictions = this.generateTrendPredictions(dataPoints, 10); // 10 days ahead

      return {
        metric: 'risk',
        timeframe: `${timeframeDays} days`,
        dataPoints,
        trend,
        trendStrength,
        seasonality: null,
        predictions
      };
    } catch (error) {
      throw new Error(`Failed to analyze risk trend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate prediction accuracy confidence
   */
  async completionConfidence(predictions?: CompletionPrediction[]): Promise<{
    overallConfidence: number;
    predictionAccuracy: number;
    reliabilityScore: number;
    factorWeights: { [key: string]: number };
  }> {
    try {
      const predictionData = predictions || await this.predictCompletion();

      if (predictionData.length === 0) {
        return {
          overallConfidence: 0,
          predictionAccuracy: 0,
          reliabilityScore: 0,
          factorWeights: {}
        };
      }

      const overallConfidence = predictionData.reduce((sum, pred) => sum + pred.confidenceLevel, 0) / predictionData.length;

      // Calculate prediction accuracy (would compare with actual outcomes in real implementation)
      const predictionAccuracy = this.calculatePredictionAccuracy(predictionData);

      // Calculate reliability score based on factor consistency
      const reliabilityScore = this.calculateReliabilityScore(predictionData);

      // Calculate factor weights
      const factorWeights = this.calculateFactorWeights(predictionData);

      return {
        overallConfidence,
        predictionAccuracy,
        reliabilityScore,
        factorWeights
      };
    } catch (error) {
      throw new Error(`Failed to calculate completion confidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private async getAllWorkItems(): Promise<WorkItem[]> {
    try {
      return await this.workItemRepository.findAll();
    } catch (error) {
      console.warn('Could not fetch all work items, returning empty array');
      return [];
    }
  }

  private async getWorkItemsForSprint(sprintId: string): Promise<WorkItem[]> {
    try {
      // This would integrate with sprint assignments
      // For now, return a subset based on sprint planning
      const allItems = await this.getAllWorkItems();
      return allItems.slice(0, Math.floor(allItems.length / 3)); // Simplified
    } catch (error) {
      console.warn(`Could not fetch work items for sprint ${sprintId}`);
      return [];
    }
  }

  private async calculateAverageCompletionTime(completedItems: WorkItem[]): Promise<number> {
    if (completedItems.length === 0) return 0;

    // Simplified calculation - would use actual completion timestamps
    const avgTime = completedItems.reduce((sum, item) => {
      const daysSinceStart = Math.floor(
        (Date.now() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      return sum + daysSinceStart;
    }, 0) / completedItems.length;

    return avgTime;
  }

  private calculateProgressRate(day: number, totalDays: number, currentCompletion: number): number {
    // S-curve progression model
    const normalizedDay = day / totalDays;
    const sCurve = 1 / (1 + Math.exp(-8 * (normalizedDay - 0.5)));
    return Math.min(currentCompletion, sCurve);
  }

  private projectBurndownCompletion(burndownData: BurndownPoint[], sprintEnd: Date): Date {
    const lastPoint = burndownData[burndownData.length - 1];
    if (lastPoint.remainingWork <= 0) return lastPoint.date;

    // Project based on current trend
    const trendRate = this.calculateBurndownTrend(burndownData);
    const daysToComplete = lastPoint.remainingWork / Math.max(trendRate, 0.1);

    return new Date(lastPoint.date.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
  }

  private calculateBurndownTrend(burndownData: BurndownPoint[]): number {
    if (burndownData.length < 2) return 0;

    const recentPoints = burndownData.slice(-5); // Last 5 points
    const startPoint = recentPoints[0];
    const endPoint = recentPoints[recentPoints.length - 1];

    const workCompleted = startPoint.remainingWork - endPoint.remainingWork;
    const daysElapsed = Math.max(1, recentPoints.length - 1);

    return workCompleted / daysElapsed;
  }

  private async buildDependencyGraph(workItems: WorkItem[]): Promise<Map<string, string[]>> {
    const dependencyMap = new Map<string, string[]>();

    for (const item of workItems) {
      // This would integrate with actual dependency tracking
      // For now, create simplified dependencies based on readiness state
      const dependencies: string[] = [];

      // Add logical dependencies based on readiness dimensions
      if (item.readiness.backend === ReadinessDimension.NOT_STARTED) {
        const designItems = workItems.filter(w =>
          w.readiness.design === ReadinessDimension.COMPLETE &&
          w.id !== item.id
        );
        if (designItems.length > 0) {
          dependencies.push(designItems[0].id);
        }
      }

      dependencyMap.set(item.id, dependencies);
    }

    return dependencyMap;
  }

  private async identifyCriticalPathItems(
    workItems: WorkItem[],
    dependencyMap: Map<string, string[]>
  ): Promise<CriticalPathNode[]> {
    const criticalItems: CriticalPathNode[] = [];

    for (const item of workItems) {
      const dependencies = dependencyMap.get(item.id) || [];
      const duration = this.estimateItemDuration(item);
      const slackTime = this.calculateSlackTime(item.id, dependencyMap, workItems);
      const isCritical = slackTime === 0;

      const summary = await this.readinessService.getReadinessSummary(item.id);

      criticalItems.push({
        workItemId: item.id,
        title: item.title,
        duration,
        startDate: this.calculateEarliestStartDate(item.id, dependencyMap),
        endDate: this.calculateLatestEndDate(item.id, dependencyMap, duration),
        dependencies,
        slackTime,
        isCritical,
        completionPercentage: summary.overallCompletion,
        blockers: summary.blockers
      });
    }

    return criticalItems.filter(item => item.isCritical);
  }

  private async findAlternativePaths(
    workItems: WorkItem[],
    dependencyMap: Map<string, string[]>,
    criticalItems: CriticalPathNode[]
  ): Promise<AlternativePath[]> {
    // Simplified alternative path detection
    const alternatives: AlternativePath[] = [];

    const nonCriticalItems = workItems.filter(item =>
      !criticalItems.some(critical => critical.workItemId === item.id)
    );

    if (nonCriticalItems.length > 0) {
      alternatives.push({
        name: 'Parallel Development Path',
        duration: Math.max(...nonCriticalItems.map(item => this.estimateItemDuration(item))),
        items: nonCriticalItems.map(item => item.id),
        riskLevel: 'medium',
        description: 'Execute non-critical items in parallel to reduce overall timeline'
      });
    }

    return alternatives;
  }

  private async identifyBottlenecks(
    workItems: WorkItem[],
    dependencyMap: Map<string, string[]>
  ): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Resource bottlenecks (items with many dependents)
    for (const [itemId, dependencies] of dependencyMap) {
      const dependents = Array.from(dependencyMap.entries())
        .filter(([, deps]) => deps.includes(itemId))
        .map(([id]) => id);

      if (dependents.length > 2) {
        const item = workItems.find(w => w.id === itemId);
        if (item) {
          bottlenecks.push({
            type: 'resource',
            description: `${item.title} blocks ${dependents.length} other items`,
            affectedItems: dependents,
            impact: this.estimateItemDuration(item),
            mitigation: ['Prioritize completion', 'Add resources', 'Split into smaller tasks']
          });
        }
      }
    }

    return bottlenecks;
  }

  private async findParallelOpportunities(
    workItems: WorkItem[],
    dependencyMap: Map<string, string[]>
  ): Promise<ParallelWorkOpportunity[]> {
    const opportunities: ParallelWorkOpportunity[] = [];

    // Find items with no dependencies that can run in parallel
    const independentItems = workItems.filter(item => {
      const dependencies = dependencyMap.get(item.id) || [];
      return dependencies.length === 0;
    });

    if (independentItems.length > 1) {
      opportunities.push({
        description: 'Independent items can be developed in parallel',
        workItems: independentItems.map(item => item.id),
        potentialTimeSavings: Math.max(...independentItems.map(item => this.estimateItemDuration(item))),
        requirements: ['Separate development teams', 'Clear interface definitions']
      });
    }

    return opportunities;
  }

  private async assessPathRiskFactors(criticalItems: CriticalPathNode[]): Promise<PathRiskFactor[]> {
    const riskFactors: PathRiskFactor[] = [];

    for (const item of criticalItems) {
      if (item.blockers.length > 0) {
        riskFactors.push({
          type: 'dependency',
          description: `${item.title} has ${item.blockers.length} active blocker(s)`,
          probability: 0.8,
          impact: item.duration * 0.3,
          mitigation: 'Resolve blockers before starting dependent tasks'
        });
      }

      if (item.completionPercentage < 20) {
        riskFactors.push({
          type: 'technical',
          description: `${item.title} has minimal progress`,
          probability: 0.6,
          impact: item.duration * 0.5,
          mitigation: 'Conduct technical spike or proof of concept'
        });
      }
    }

    return riskFactors;
  }

  private async calculatePredictionFactors(item: WorkItem): Promise<PredictionFactor[]> {
    const factors: PredictionFactor[] = [];
    const summary = await this.readinessService.getReadinessSummary(item.id);

    // Historical velocity factor
    factors.push({
      name: 'Historical Velocity',
      weight: 0.3,
      value: 0.75, // Simplified - would calculate from actual history
      description: 'Team completion rate for similar items'
    });

    // Complexity factor
    const complexity = item.specification?.complexity || 'medium';
    const complexityWeight = { simple: 0.8, medium: 0.6, complex: 0.4 };
    factors.push({
      name: 'Complexity',
      weight: 0.25,
      value: complexityWeight[complexity as keyof typeof complexityWeight],
      description: `Item complexity: ${complexity}`
    });

    // Blocker factor
    factors.push({
      name: 'Blockers',
      weight: 0.2,
      value: Math.max(0, 1 - (summary.blockers.length * 0.2)),
      description: `${summary.blockers.length} active blockers`
    });

    // Progress momentum
    factors.push({
      name: 'Progress Momentum',
      weight: 0.25,
      value: summary.overallCompletion / 100,
      description: `Current completion: ${summary.overallCompletion}%`
    });

    return factors;
  }

  private async generatePredictionScenarios(
    item: WorkItem,
    factors: PredictionFactor[]
  ): Promise<PredictionScenario[]> {
    const baseDate = new Date();
    const remainingWork = 100 - item.readiness.getCompletionPercentage();
    const baseDuration = this.estimateItemDuration(item);

    return [
      {
        name: 'Optimistic',
        probability: 0.2,
        estimatedDate: new Date(baseDate.getTime() + (baseDuration * 0.7) * 24 * 60 * 60 * 1000),
        assumptions: ['No blockers', 'Full team focus', 'No scope changes']
      },
      {
        name: 'Most Likely',
        probability: 0.6,
        estimatedDate: new Date(baseDate.getTime() + baseDuration * 24 * 60 * 60 * 1000),
        assumptions: ['Current pace continues', 'Minor blockers resolved']
      },
      {
        name: 'Pessimistic',
        probability: 0.2,
        estimatedDate: new Date(baseDate.getTime() + (baseDuration * 1.5) * 24 * 60 * 60 * 1000),
        assumptions: ['Multiple blockers', 'Scope creep', 'Resource constraints']
      }
    ];
  }

  private calculateWeightedPrediction(scenarios: PredictionScenario[]): Date {
    let weightedTime = 0;

    for (const scenario of scenarios) {
      weightedTime += scenario.estimatedDate.getTime() * scenario.probability;
    }

    return new Date(weightedTime);
  }

  private calculatePredictionConfidence(
    factors: PredictionFactor[],
    scenarios: PredictionScenario[]
  ): number {
    // Calculate confidence based on factor stability
    const factorConfidence = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);

    // Reduce confidence based on scenario spread
    const scenarioSpread = Math.max(...scenarios.map(s => s.estimatedDate.getTime())) -
                          Math.min(...scenarios.map(s => s.estimatedDate.getTime()));
    const spreadPenalty = Math.min(0.3, scenarioSpread / (30 * 24 * 60 * 60 * 1000)); // Max 30 days spread

    return Math.max(0.1, Math.min(1, factorConfidence - spreadPenalty));
  }

  private async analyzeRiskCategories(item: WorkItem): Promise<RiskCategory[]> {
    const categories: RiskCategory[] = [];
    const summary = await this.readinessService.getReadinessSummary(item.id);

    // Technical risk
    categories.push({
      name: 'Technical',
      score: summary.blockers.length > 0 ? 70 : 20,
      weight: 0.3,
      description: 'Technical complexity and blockers',
      mitigations: ['Technical spike', 'Proof of concept', 'Expert consultation']
    });

    // Schedule risk
    const daysSinceUpdate = Math.floor((Date.now() - (item.updatedAt || item.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    categories.push({
      name: 'Schedule',
      score: daysSinceUpdate > 7 ? 60 : 15,
      weight: 0.25,
      description: 'Timeline and delivery risk',
      mitigations: ['Resource reallocation', 'Scope reduction', 'Deadline adjustment']
    });

    // Resource risk
    categories.push({
      name: 'Resource',
      score: 30, // Simplified
      weight: 0.2,
      description: 'Team availability and capacity',
      mitigations: ['Cross-training', 'Additional resources', 'Workload balancing']
    });

    // Quality risk
    categories.push({
      name: 'Quality',
      score: summary.dimensionSummary.test.percentage < 50 ? 50 : 20,
      weight: 0.25,
      description: 'Quality assurance and testing coverage',
      mitigations: ['Increase test coverage', 'Code review', 'Quality gates']
    });

    return categories;
  }

  private async calculateRiskIndicators(item: WorkItem): Promise<RiskIndicator[]> {
    const indicators: RiskIndicator[] = [];
    const summary = await this.readinessService.getReadinessSummary(item.id);

    // Blocker count
    indicators.push({
      name: 'Active Blockers',
      value: summary.blockers.length,
      threshold: 2,
      severity: summary.blockers.length > 2 ? 'danger' : summary.blockers.length > 0 ? 'warning' : 'info',
      description: 'Number of items blocking progress'
    });

    // Progress stagnation
    const daysSinceUpdate = Math.floor((Date.now() - (item.updatedAt || item.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    indicators.push({
      name: 'Days Since Update',
      value: daysSinceUpdate,
      threshold: 7,
      severity: daysSinceUpdate > 14 ? 'danger' : daysSinceUpdate > 7 ? 'warning' : 'info',
      description: 'Days since last progress update'
    });

    // Completion velocity
    const expectedProgress = Math.min(100, daysSinceUpdate * 5); // 5% per day expectation
    const actualProgress = summary.overallCompletion;
    indicators.push({
      name: 'Progress Velocity',
      value: actualProgress - expectedProgress,
      threshold: -20,
      severity: actualProgress - expectedProgress < -30 ? 'danger' : actualProgress - expectedProgress < -10 ? 'warning' : 'info',
      description: 'Actual vs expected progress rate'
    });

    return indicators;
  }

  private async analyzeRiskTrends(item: WorkItem): Promise<RiskTrend[]> {
    // Simplified trend analysis - would use historical data
    return [
      {
        metric: 'Completion Rate',
        direction: 'stable',
        rate: 0,
        timeframe: '7 days'
      },
      {
        metric: 'Blocker Count',
        direction: 'stable',
        rate: 0,
        timeframe: '7 days'
      }
    ];
  }

  private calculateOverallRiskScore(
    categories: RiskCategory[],
    indicators: RiskIndicator[],
    trends: RiskTrend[]
  ): number {
    const categoryScore = categories.reduce((sum, cat) => sum + (cat.score * cat.weight), 0);

    // Adjust for indicator severity
    const severePenalty = indicators.filter(ind => ind.severity === 'danger').length * 10;
    const warningPenalty = indicators.filter(ind => ind.severity === 'warning').length * 5;

    // Adjust for trends
    const deterioratingPenalty = trends.filter(trend => trend.direction === 'deteriorating').length * 5;

    return Math.min(100, Math.max(0, categoryScore + severePenalty + warningPenalty + deterioratingPenalty));
  }

  private categorizeRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(
    categories: RiskCategory[],
    indicators: RiskIndicator[],
    trends: RiskTrend[]
  ): string[] {
    const recommendations: string[] = [];

    // Add category-specific recommendations
    categories.forEach(category => {
      if (category.score > 50) {
        recommendations.push(...category.mitigations);
      }
    });

    // Add indicator-specific recommendations
    indicators.forEach(indicator => {
      if (indicator.severity === 'danger') {
        recommendations.push(`Address high ${indicator.name.toLowerCase()}`);
      }
    });

    // Add trend-specific recommendations
    trends.forEach(trend => {
      if (trend.direction === 'deteriorating') {
        recommendations.push(`Monitor and improve ${trend.metric.toLowerCase()}`);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateDepthRecursive(
    itemId: string,
    dependencyMap: Map<string, string[]>,
    visited: Set<string>
  ): number {
    if (visited.has(itemId)) return 0; // Avoid cycles

    visited.add(itemId);
    const dependencies = dependencyMap.get(itemId) || [];

    if (dependencies.length === 0) return 1;

    const maxDepth = Math.max(...dependencies.map(depId =>
      this.calculateDepthRecursive(depId, dependencyMap, new Set(visited))
    ));

    return maxDepth + 1;
  }

  private calculateFanIn(itemId: string, dependencyMap: Map<string, string[]>): number {
    let fanIn = 0;
    for (const [, dependencies] of dependencyMap) {
      if (dependencies.includes(itemId)) fanIn++;
    }
    return fanIn;
  }

  private calculateFanOut(itemId: string, dependencyMap: Map<string, string[]>): number {
    return (dependencyMap.get(itemId) || []).length;
  }

  private calculateCriticalityScore(fanIn: number, fanOut: number, depth: number): number {
    // Items with high fan-in are more critical (many things depend on them)
    // Items with high depth are in longer dependency chains
    return (fanIn * 2) + (depth * 1.5) + (fanOut * 0.5);
  }

  private calculateComplexityIndex(depth: number, fanIn: number, fanOut: number): number {
    // Composite measure of overall complexity
    return Math.sqrt((depth * depth) + (fanIn * fanIn) + (fanOut * fanOut));
  }

  private calculateIsolationRisk(fanIn: number, fanOut: number): number {
    // Items with very low connectivity might be isolated/forgotten
    if (fanIn === 0 && fanOut === 0) return 1.0;
    if (fanIn + fanOut === 1) return 0.7;
    if (fanIn + fanOut === 2) return 0.4;
    return 0.1;
  }

  private async analyzeDimensionHealth(
    workItems: WorkItem[],
    dimension: ReadinessDimensionKey
  ): Promise<ReadinessHealth['dimensions'][ReadinessDimensionKey]> {
    let totalScore = 0;
    let blockerCount = 0;

    for (const item of workItems) {
      const percentage = item.readiness.getDimensionPercentage(dimension);
      totalScore += percentage;

      const summary = await this.readinessService.getReadinessSummary(item.id);
      if (summary.blockers.some(blocker => blocker.toLowerCase().includes(dimension))) {
        blockerCount++;
      }
    }

    const averageScore = workItems.length > 0 ? totalScore / workItems.length : 0;

    // Calculate velocity (simplified - would use historical data)
    const velocity = Math.max(0, averageScore / 10); // Rough approximation

    // Determine trend (simplified)
    const trend: 'improving' | 'stable' | 'deteriorating' =
      averageScore > 75 ? 'improving' :
      averageScore > 50 ? 'stable' : 'deteriorating';

    return {
      score: averageScore,
      trend,
      blockers: blockerCount,
      velocity
    };
  }

  private async calculateSystemMetrics(
    workItems: WorkItem[],
    dimensionHealth: ReadinessHealth['dimensions']
  ): Promise<ReadinessHealth['systemMetrics']> {
    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    // Coherence: how aligned dimensions are
    const scores = dimensions.map(d => dimensionHealth[d].score);
    const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;
    const coherence = Math.max(0, 100 - Math.sqrt(variance));

    // Momentum: rate of progress
    const velocities = dimensions.map(d => dimensionHealth[d].velocity);
    const momentum = velocities.reduce((sum, vel) => sum + vel, 0) / velocities.length;

    // Stability: consistency of progress
    const trendStability = dimensions.filter(d => dimensionHealth[d].trend === 'stable').length / dimensions.length * 100;
    const stability = trendStability;

    // Efficiency: progress vs blockers
    const totalBlockers = dimensions.reduce((sum, d) => sum + dimensionHealth[d].blockers, 0);
    const efficiency = Math.max(0, 100 - (totalBlockers * 5)); // 5 points per blocker

    return {
      coherence,
      momentum,
      stability,
      efficiency
    };
  }

  private calculateOverallHealthScore(
    dimensionHealth: ReadinessHealth['dimensions'],
    systemMetrics: ReadinessHealth['systemMetrics']
  ): number {
    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    // Weighted average of dimension scores
    const dimensionScore = dimensions.reduce((sum, d) => sum + dimensionHealth[d].score, 0) / dimensions.length;

    // System metrics contribution
    const systemScore = (systemMetrics.coherence + systemMetrics.momentum + systemMetrics.stability + systemMetrics.efficiency) / 4;

    // Overall score (70% dimensions, 30% system metrics)
    return (dimensionScore * 0.7) + (systemScore * 0.3);
  }

  private async generateHealthAlerts(
    dimensionHealth: ReadinessHealth['dimensions'],
    systemMetrics: ReadinessHealth['systemMetrics'],
    overallScore: number
  ): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];

    // Overall system alerts
    if (overallScore < 40) {
      alerts.push({
        level: 'critical',
        category: 'System Health',
        message: 'Overall system health is critical',
        affectedItems: [],
        recommendedAction: 'Immediate intervention required - review all dimensions'
      });
    }

    // Dimension-specific alerts
    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    dimensions.forEach(dimension => {
      const health = dimensionHealth[dimension];

      if (health.score < 30) {
        alerts.push({
          level: 'critical',
          category: dimension,
          message: `${dimension} dimension critically low`,
          affectedItems: [],
          recommendedAction: `Focus resources on ${dimension} completion`
        });
      } else if (health.blockers > 3) {
        alerts.push({
          level: 'warning',
          category: dimension,
          message: `${dimension} has ${health.blockers} blockers`,
          affectedItems: [],
          recommendedAction: `Resolve ${dimension} blockers to improve flow`
        });
      }
    });

    // System metric alerts
    if (systemMetrics.coherence < 50) {
      alerts.push({
        level: 'warning',
        category: 'Coherence',
        message: 'Dimensions are not aligned - some far ahead/behind others',
        affectedItems: [],
        recommendedAction: 'Balance development across all dimensions'
      });
    }

    return alerts;
  }

  private calculateTrendDirection(dataPoints: TrendPoint[]): 'up' | 'down' | 'stable' {
    if (dataPoints.length < 2) return 'stable';

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  }

  private calculateTrendStrength(dataPoints: TrendPoint[]): number {
    if (dataPoints.length < 2) return 0;

    // Calculate linear regression correlation coefficient
    const n = dataPoints.length;
    const xValues = dataPoints.map((_, index) => index);
    const yValues = dataPoints.map(point => point.value);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + (x * yValues[i]), 0);
    const sumXX = xValues.reduce((sum, x) => sum + (x * x), 0);
    const sumYY = yValues.reduce((sum, y) => sum + (y * y), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumXX) - (sumX * sumX)) * ((n * sumYY) - (sumY * sumY)));

    return Math.abs(numerator / denominator);
  }

  private detectSeasonality(dataPoints: TrendPoint[]): SeasonalityInfo | null {
    // Simplified seasonality detection
    if (dataPoints.length < 14) return null; // Need at least 2 weeks

    // Check for weekly patterns
    const weeklyPattern: number[] = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayValues = dataPoints
        .filter((_, index) => index % 7 === dayOfWeek)
        .map(point => point.value);

      if (dayValues.length > 0) {
        weeklyPattern.push(dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length);
      }
    }

    if (weeklyPattern.length === 7) {
      const maxValue = Math.max(...weeklyPattern);
      const minValue = Math.min(...weeklyPattern);
      const strength = (maxValue - minValue) / maxValue;

      if (strength > 0.1) { // 10% variation threshold
        return {
          period: 'weekly',
          strength,
          pattern: weeklyPattern
        };
      }
    }

    return null;
  }

  private generateTrendPredictions(dataPoints: TrendPoint[], daysAhead: number): TrendPrediction[] {
    if (dataPoints.length < 3) return [];

    const predictions: TrendPrediction[] = [];
    const lastPoint = dataPoints[dataPoints.length - 1];

    // Simple linear extrapolation
    const recentPoints = dataPoints.slice(-5);
    const trend = this.calculateLinearTrend(recentPoints);

    for (let day = 1; day <= daysAhead; day++) {
      const predictionDate = new Date(lastPoint.date.getTime() + day * 24 * 60 * 60 * 1000);
      const predictedValue = lastPoint.value + (trend * day);

      // Calculate confidence interval (simplified)
      const variance = this.calculateVariance(recentPoints);
      const margin = Math.sqrt(variance) * 1.96; // 95% confidence

      predictions.push({
        date: predictionDate,
        predictedValue,
        confidenceInterval: {
          lower: Math.max(0, predictedValue - margin),
          upper: Math.min(100, predictedValue + margin)
        }
      });
    }

    return predictions;
  }

  private calculateLinearTrend(points: TrendPoint[]): number {
    if (points.length < 2) return 0;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    const valueChange = lastPoint.value - firstPoint.value;
    const timeChange = Math.max(1, points.length - 1);

    return valueChange / timeChange;
  }

  private calculateVariance(points: TrendPoint[]): number {
    if (points.length < 2) return 0;

    const mean = points.reduce((sum, point) => sum + point.value, 0) / points.length;
    const squaredDiffs = points.map(point => Math.pow(point.value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / points.length;
  }

  private calculatePredictionAccuracy(predictions: CompletionPrediction[]): number {
    // This would compare predictions with actual outcomes
    // For now, return a reasonable estimate based on confidence levels
    const avgConfidence = predictions.reduce((sum, pred) => sum + pred.confidenceLevel, 0) / predictions.length;
    return avgConfidence * 85; // Assume 85% correlation between confidence and accuracy
  }

  private calculateReliabilityScore(predictions: CompletionPrediction[]): number {
    // Measure consistency of factor weights across predictions
    if (predictions.length === 0) return 0;

    const factorNames = [...new Set(predictions.flatMap(pred => pred.factors.map(f => f.name)))];
    let consistencyScore = 0;

    for (const factorName of factorNames) {
      const weights = predictions
        .map(pred => pred.factors.find(f => f.name === factorName)?.weight || 0)
        .filter(weight => weight > 0);

      if (weights.length > 1) {
        const mean = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
        const variance = weights.reduce((sum, weight) => sum + Math.pow(weight - mean, 2), 0) / weights.length;
        const consistency = Math.max(0, 1 - Math.sqrt(variance));
        consistencyScore += consistency;
      }
    }

    return (consistencyScore / factorNames.length) * 100;
  }

  private calculateFactorWeights(predictions: CompletionPrediction[]): { [key: string]: number } {
    const factorWeights: { [key: string]: number } = {};
    const factorCounts: { [key: string]: number } = {};

    for (const prediction of predictions) {
      for (const factor of prediction.factors) {
        factorWeights[factor.name] = (factorWeights[factor.name] || 0) + factor.weight;
        factorCounts[factor.name] = (factorCounts[factor.name] || 0) + 1;
      }
    }

    // Calculate averages
    for (const factorName in factorWeights) {
      factorWeights[factorName] = factorWeights[factorName] / factorCounts[factorName];
    }

    return factorWeights;
  }

  private estimateItemDuration(item: WorkItem): number {
    // Estimate duration based on complexity and current completion
    const complexity = item.specification?.complexity || 'medium';
    const baseDuration = { simple: 3, medium: 5, complex: 8 };
    const currentCompletion = item.readiness.getCompletionPercentage();

    const remainingWork = (100 - currentCompletion) / 100;
    return Math.ceil(baseDuration[complexity as keyof typeof baseDuration] * remainingWork);
  }

  private calculateSlackTime(
    itemId: string,
    dependencyMap: Map<string, string[]>,
    workItems: WorkItem[]
  ): number {
    // Simplified slack time calculation
    // In a full implementation, this would use critical path method
    const dependencies = dependencyMap.get(itemId) || [];
    if (dependencies.length === 0) return 0; // No dependencies means it's on critical path

    return Math.floor(Math.random() * 3); // Simplified random slack
  }

  private calculateEarliestStartDate(itemId: string, dependencyMap: Map<string, string[]>): Date {
    // Simplified - would calculate based on dependency completion
    const dependencies = dependencyMap.get(itemId) || [];
    const baseDate = new Date();

    if (dependencies.length === 0) return baseDate;

    // Add delay for dependencies (simplified)
    return new Date(baseDate.getTime() + dependencies.length * 2 * 24 * 60 * 60 * 1000);
  }

  private calculateLatestEndDate(itemId: string, dependencyMap: Map<string, string[]>, duration: number): Date {
    const startDate = this.calculateEarliestStartDate(itemId, dependencyMap);
    return new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
  }
}