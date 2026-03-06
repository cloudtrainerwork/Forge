import { Router, Request, Response } from 'express';
import { container } from '../../factories/container.js';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { AnalyticsService } from '../../services/AnalyticsService.js';

/**
 * Error handling middleware for analytics operations
 */
const handleAnalyticsErrors = (error: any, req: Request, res: Response, next: any) => {
  console.error('Analytics operation error:', error);

  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message,
      timestamp: new Date().toISOString(),
      details: error.details || null
    });
    return;
  }

  if (error.message?.includes('not found')) {
    res.status(404).json({
      error: 'Not Found',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error.message?.includes('insufficient data')) {
    res.status(422).json({
      error: 'Unprocessable Entity',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred during analytics calculation',
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation middleware for analytics requests
 */
const validateAnalyticsRequest = (req: Request, res: Response, next: any) => {
  try {
    const { timeframe } = req.query;
    const validTimeframes = ['day', 'week', 'month', 'quarter', 'year'];

    if (timeframe && !validTimeframes.includes(timeframe as string)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate date parameters
    const { startDate, endDate } = req.query;
    if (startDate && isNaN(Date.parse(startDate as string))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid startDate format. Use ISO 8601 format.',
        timestamp: new Date().toISOString()
      });
    }

    if (endDate && isNaN(Date.parse(endDate as string))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid endDate format. Use ISO 8601 format.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate granularity for specific endpoints
    const { granularity } = req.query;
    const validGranularities = ['daily', 'weekly', 'monthly'];
    if (granularity && !validGranularities.includes(granularity as string)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Request validation error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Analytics API routes with ML-based insights and trend analysis
 * Provides endpoints for velocity, burndown, predictions, and risk analysis
 */
export function analyticsRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  const getAnalyticsService = (): AnalyticsService => {
    try {
      return container.get<AnalyticsService>('AnalyticsService');
    } catch {
      // TODO: Implement service integrations after full service registration
      // Analytics functionality temporarily disabled until service layer is complete
      throw new Error('AnalyticsService not available - service registration incomplete');

      // Fallback would be:
      // return new AnalyticsService(
      //   serviceFactory.getService<IWorkItemRepository>('IWorkItemRepository'),
      //   serviceFactory.getReadinessService(),
      //   serviceFactory.getService<SprintService>('SprintService'),
      //   serviceFactory.getService<GroupingService>('GroupingService')
      // );
    }
  };

  /**
   * @openapi
   * /api/v1/analytics/velocity:
   *   get:
   *     summary: Get velocity metrics and trends
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: sprintIds
   *         schema:
   *           type: string
   *         description: Comma-separated sprint IDs
   *       - in: query
   *         name: timeframe
   *         schema:
   *           type: string
   *           enum: [day, week, month, quarter]
   *         description: Analysis timeframe
   *       - in: query
   *         name: includeProjections
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include velocity projections
   *     responses:
   *       200:
   *         description: Velocity data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 velocityData:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/VelocityData'
   *                 trends:
   *                   $ref: '#/components/schemas/TrendData'
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Analytics calculation failed
   */
  router.get('/velocity', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const { sprintIds, timeframe = 'month', includeProjections = true } = req.query;

      const sprintIdList = sprintIds ? (sprintIds as string).split(',') : undefined;

      // Get velocity data
      const velocityData = await analyticsService.calculateVelocity(sprintIdList, timeframe as string);

      // Get velocity trends
      const sprintCount = sprintIdList?.length || 5; // Default to last 5 sprints
      const velocityTrends = await analyticsService.velocityTrend(sprintCount);

      const response: any = {
        success: true,
        data: {
          velocityData,
          currentVelocity: velocityData.length > 0 ? velocityData[velocityData.length - 1].itemsCompleted : 0,
          averageVelocity: velocityData.length > 0
            ? velocityData.reduce((sum, v) => sum + v.itemsCompleted, 0) / velocityData.length
            : 0,
          completionRate: velocityData.length > 0
            ? velocityData.reduce((sum, v) => sum + v.completionRate, 0) / velocityData.length
            : 0
        },
        timestamp: new Date().toISOString(),
        metadata: {
          timeframe,
          sprintCount: velocityData.length,
          includeProjections: includeProjections === 'true'
        }
      };

      // Add trend analysis if requested
      if (includeProjections === 'true') {
        response.data.trends = velocityTrends;
        response.data.projections = {
          nextSprintEstimate: velocityTrends.predictions.length > 0
            ? velocityTrends.predictions[0].predictedValue
            : response.data.averageVelocity,
          trendDirection: velocityTrends.trend,
          confidence: velocityTrends.trendStrength
        };
      }

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/burndown:
   *   get:
   *     summary: Get burndown chart data for sprint tracking
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: sprintId
   *         required: true
   *         schema:
   *           type: string
   *         description: Sprint ID for burndown analysis
   *       - in: query
   *         name: granularity
   *         schema:
   *           type: string
   *           enum: [daily, weekly]
   *           default: daily
   *         description: Data point granularity
   *       - in: query
   *         name: includeProjection
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include completion projection
   *     responses:
   *       200:
   *         description: Burndown data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 burndownData:
   *                   $ref: '#/components/schemas/BurndownData'
   *       400:
   *         description: Invalid or missing sprint ID
   *       404:
   *         description: Sprint not found
   *       500:
   *         description: Burndown calculation failed
   */
  router.get('/burndown', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const { sprintId, granularity = 'daily', includeProjection = true } = req.query;

      if (!sprintId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Sprint ID is required for burndown analysis',
          timestamp: new Date().toISOString()
        });
      }

      const burndownData = await analyticsService.calculateBurndown(
        sprintId as string,
        granularity as 'daily' | 'weekly'
      );

      const response = {
        success: true,
        data: {
          burndownData,
          summary: {
            totalDataPoints: burndownData.dataPoints.length,
            currentVariance: burndownData.variance,
            projectedCompletion: burndownData.projectedCompletion,
            onTrack: Math.abs(burndownData.variance) <= 10 // Within 10% is considered on track
          }
        },
        timestamp: new Date().toISOString(),
        metadata: {
          sprintId,
          granularity,
          includeProjection: includeProjection === 'true'
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/predictions:
   *   get:
   *     summary: Get ML-based completion predictions
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: workItemIds
   *         schema:
   *           type: string
   *         description: Comma-separated work item IDs (optional, defaults to all)
   *       - in: query
   *         name: confidenceThreshold
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 1
   *           default: 0.7
   *         description: Minimum confidence level for predictions
   *       - in: query
   *         name: horizon
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 365
   *           default: 30
   *         description: Prediction horizon in days
   *     responses:
   *       200:
   *         description: Predictions generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 predictions:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/CompletionPrediction'
   *                 confidence:
   *                   $ref: '#/components/schemas/ConfidenceMetrics'
   *       422:
   *         description: Insufficient data for predictions
   *       500:
   *         description: Prediction calculation failed
   */
  router.get('/predictions', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const {
        workItemIds,
        confidenceThreshold = 0.7,
        horizon = 30
      } = req.query;

      const workItemIdList = workItemIds ? (workItemIds as string).split(',') : undefined;
      const threshold = parseFloat(confidenceThreshold as string);

      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Confidence threshold must be between 0 and 1',
          timestamp: new Date().toISOString()
        });
      }

      // Get completion predictions
      const predictions = await analyticsService.predictCompletion(workItemIdList);

      // Filter by confidence threshold
      const highConfidencePredictions = predictions.filter(p => p.confidenceLevel >= threshold);

      // Get overall confidence metrics
      const confidenceMetrics = await analyticsService.completionConfidence(predictions);

      const response = {
        success: true,
        data: {
          predictions: highConfidencePredictions,
          filteredCount: highConfidencePredictions.length,
          totalCount: predictions.length,
          confidence: confidenceMetrics,
          summary: {
            averageConfidence: predictions.reduce((sum, p) => sum + p.confidenceLevel, 0) / predictions.length,
            earliestCompletion: predictions.reduce((earliest, p) =>
              !earliest || p.predictedCompletionDate < earliest ? p.predictedCompletionDate : earliest,
              null as Date | null
            ),
            latestCompletion: predictions.reduce((latest, p) =>
              !latest || p.predictedCompletionDate > latest ? p.predictedCompletionDate : latest,
              null as Date | null
            )
          }
        },
        timestamp: new Date().toISOString(),
        metadata: {
          confidenceThreshold: threshold,
          horizon: parseInt(horizon as string),
          workItemCount: workItemIdList?.length || 'all'
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/risks:
   *   get:
   *     summary: Get pattern-based risk analysis
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: workItemIds
   *         schema:
   *           type: string
   *         description: Comma-separated work item IDs (optional, defaults to all)
   *       - in: query
   *         name: minRiskScore
   *         schema:
   *           type: integer
   *           minimum: 0
   *           maximum: 100
   *           default: 40
   *         description: Minimum risk score threshold
   *       - in: query
   *         name: includeRecommendations
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include risk mitigation recommendations
   *     responses:
   *       200:
   *         description: Risk analysis completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 riskAnalysis:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/RiskAnalysis'
   *                 summary:
   *                   type: object
   *       500:
   *         description: Risk analysis failed
   */
  router.get('/risks', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const {
        workItemIds,
        minRiskScore = 40,
        includeRecommendations = true
      } = req.query;

      const workItemIdList = workItemIds ? (workItemIds as string).split(',') : undefined;
      const threshold = parseInt(minRiskScore as string);

      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Risk score threshold must be between 0 and 100',
          timestamp: new Date().toISOString()
        });
      }

      // Get risk analysis
      const riskAnalysis = await analyticsService.identifyRisks(workItemIdList);

      // Filter by risk score threshold
      const filteredRisks = riskAnalysis.filter(risk => risk.riskScore >= threshold);

      // Calculate risk distribution
      const riskDistribution = {
        critical: filteredRisks.filter(r => r.riskLevel === 'critical').length,
        high: filteredRisks.filter(r => r.riskLevel === 'high').length,
        medium: filteredRisks.filter(r => r.riskLevel === 'medium').length,
        low: filteredRisks.filter(r => r.riskLevel === 'low').length
      };

      const response = {
        success: true,
        data: {
          riskAnalysis: filteredRisks,
          summary: {
            totalRisks: filteredRisks.length,
            averageRiskScore: filteredRisks.reduce((sum, r) => sum + r.riskScore, 0) / filteredRisks.length,
            distribution: riskDistribution,
            highestRisk: filteredRisks.length > 0 ? Math.max(...filteredRisks.map(r => r.riskScore)) : 0
          },
          includeRecommendations: includeRecommendations === 'true'
        },
        timestamp: new Date().toISOString(),
        metadata: {
          minRiskScore: threshold,
          workItemCount: workItemIdList?.length || 'all',
          filteredCount: filteredRisks.length,
          totalCount: riskAnalysis.length
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/trends:
   *   get:
   *     summary: Get trend analysis for various metrics
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: metrics
   *         schema:
   *           type: string
   *         description: Comma-separated metrics (readiness, velocity, blockage, risk)
   *       - in: query
   *         name: timeframeDays
   *         schema:
   *           type: integer
   *           minimum: 7
   *           maximum: 365
   *           default: 30
   *         description: Analysis timeframe in days
   *       - in: query
   *         name: dimension
   *         schema:
   *           type: string
   *           enum: [requirements, design, frontend, backend, integration, test]
   *         description: Specific readiness dimension for readiness trends
   *     responses:
   *       200:
   *         description: Trend analysis completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 trends:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/TrendData'
   *       400:
   *         description: Invalid metrics or timeframe
   *       500:
   *         description: Trend analysis failed
   */
  router.get('/trends', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const {
        metrics = 'readiness,velocity,blockage,risk',
        timeframeDays = 30,
        dimension
      } = req.query;

      const metricList = (metrics as string).split(',');
      const validMetrics = ['readiness', 'velocity', 'blockage', 'risk'];
      const invalidMetrics = metricList.filter(m => !validMetrics.includes(m.trim()));

      if (invalidMetrics.length > 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid metrics: ${invalidMetrics.join(', ')}. Valid metrics: ${validMetrics.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      const timeframe = parseInt(timeframeDays as string);
      if (isNaN(timeframe) || timeframe < 7 || timeframe > 365) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Timeframe must be between 7 and 365 days',
          timestamp: new Date().toISOString()
        });
      }

      // Generate trends for each requested metric
      const trends = [];

      for (const metric of metricList) {
        const trimmedMetric = metric.trim();
        let trendData;

        switch (trimmedMetric) {
          case 'readiness':
            trendData = await analyticsService.readinessTrend(
              dimension as any,
              timeframe
            );
            break;
          case 'velocity':
            const sprintCount = Math.max(1, Math.floor(timeframe / 14)); // Assume 2-week sprints
            trendData = await analyticsService.velocityTrend(sprintCount);
            break;
          case 'blockage':
            trendData = await analyticsService.blockageTrend(timeframe);
            break;
          case 'risk':
            trendData = await analyticsService.riskTrend(timeframe);
            break;
          default:
            continue;
        }

        trends.push({
          metric: trimmedMetric,
          ...trendData
        });
      }

      const response = {
        success: true,
        data: {
          trends,
          summary: {
            timeframeDays: timeframe,
            metricsAnalyzed: trends.length,
            upwardTrends: trends.filter(t => t.trend === 'up').length,
            downwardTrends: trends.filter(t => t.trend === 'down').length,
            stableTrends: trends.filter(t => t.trend === 'stable').length
          }
        },
        timestamp: new Date().toISOString(),
        metadata: {
          timeframeDays: timeframe,
          dimension: dimension || 'all',
          requestedMetrics: metricList.map(m => m.trim())
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/dependencies:
   *   get:
   *     summary: Get dependency depth and complexity analysis
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: workItemIds
   *         schema:
   *           type: string
   *         description: Comma-separated work item IDs (optional, defaults to all)
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [criticality, complexity, depth, isolation]
   *           default: criticality
   *         description: Sort results by metric
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Maximum number of results
   *     responses:
   *       200:
   *         description: Dependency analysis completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 dependencyMetrics:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/DependencyMetrics'
   *       500:
   *         description: Dependency analysis failed
   */
  router.get('/dependencies', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const {
        workItemIds,
        sortBy = 'criticality',
        limit = 20
      } = req.query;

      const workItemIdList = workItemIds ? (workItemIds as string).split(',') : undefined;
      const limitNum = parseInt(limit as string);
      const validSortOptions = ['criticality', 'complexity', 'depth', 'isolation'];

      if (!validSortOptions.includes(sortBy as string)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid sortBy option. Must be one of: ${validSortOptions.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Limit must be between 1 and 100',
          timestamp: new Date().toISOString()
        });
      }

      // Get dependency metrics
      let dependencyMetrics = await analyticsService.calculateDependencyDepth(workItemIdList);

      // Sort by requested metric
      const sortKey = sortBy as keyof typeof dependencyMetrics[0];
      dependencyMetrics.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));

      // Apply limit
      dependencyMetrics = dependencyMetrics.slice(0, limitNum);

      // Calculate summary statistics
      const allMetrics = await analyticsService.calculateDependencyDepth(workItemIdList);
      const summary = {
        totalItems: allMetrics.length,
        averageDepth: allMetrics.reduce((sum, m) => sum + m.dependencyDepth, 0) / allMetrics.length,
        averageCriticality: allMetrics.reduce((sum, m) => sum + m.criticalityScore, 0) / allMetrics.length,
        highComplexityItems: allMetrics.filter(m => m.complexityIndex > 5).length,
        isolatedItems: allMetrics.filter(m => m.isolationRisk > 0.5).length
      };

      const response = {
        success: true,
        data: {
          dependencyMetrics,
          summary,
          sortedBy: sortBy,
          limitApplied: limitNum
        },
        timestamp: new Date().toISOString(),
        metadata: {
          workItemCount: workItemIdList?.length || 'all',
          sortBy,
          limit: limitNum
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/health:
   *   get:
   *     summary: Get system-wide readiness health assessment
   *     tags: [Analytics]
   *     parameters:
   *       - in: query
   *         name: includeAlerts
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include health alerts and recommendations
   *       - in: query
   *         name: alertLevel
   *         schema:
   *           type: string
   *           enum: [info, warning, critical]
   *           default: warning
   *         description: Minimum alert level to include
   *     responses:
   *       200:
   *         description: Health assessment completed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 health:
   *                   $ref: '#/components/schemas/ReadinessHealth'
   *       500:
   *         description: Health assessment failed
   */
  router.get('/health', validateAnalyticsRequest, async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const { includeAlerts = true, alertLevel = 'warning' } = req.query;

      const validAlertLevels = ['info', 'warning', 'critical'];
      if (!validAlertLevels.includes(alertLevel as string)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid alert level. Must be one of: ${validAlertLevels.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      const health = await analyticsService.measureReadinessHealth();

      // Filter alerts by level if requested
      let filteredAlerts = health.alerts;
      if (includeAlerts === 'true' && alertLevel !== 'info') {
        const levelPriority = { info: 1, warning: 2, critical: 3 };
        const minPriority = levelPriority[alertLevel as keyof typeof levelPriority];

        filteredAlerts = health.alerts.filter(alert => {
          const alertPriority = levelPriority[alert.level];
          return alertPriority >= minPriority;
        });
      }

      const response = {
        success: true,
        data: {
          ...health,
          alerts: includeAlerts === 'true' ? filteredAlerts : [],
          healthGrade: getHealthGrade(health.overallScore),
          recommendations: generateHealthRecommendations(health)
        },
        timestamp: new Date().toISOString(),
        metadata: {
          includeAlerts: includeAlerts === 'true',
          alertLevel,
          filteredAlerts: filteredAlerts.length,
          totalAlerts: health.alerts.length
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/analytics/calculate:
   *   post:
   *     summary: Perform on-demand analytics calculation
   *     tags: [Analytics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               analysisType:
   *                 type: string
   *                 enum: [velocity, burndown, predictions, risks, trends, dependencies, health]
   *               parameters:
   *                 type: object
   *                 description: Analysis-specific parameters
   *               workItemIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Optional work item filter
   *     responses:
   *       200:
   *         description: Analysis completed successfully
   *       400:
   *         description: Invalid analysis type or parameters
   *       500:
   *         description: Analysis calculation failed
   */
  router.post('/calculate', async (req: Request, res: Response) => {
    try {
      const analyticsService = getAnalyticsService();
      const { analysisType, parameters = {}, workItemIds } = req.body;

      const validAnalysisTypes = ['velocity', 'burndown', 'predictions', 'risks', 'trends', 'dependencies', 'health'];
      if (!validAnalysisTypes.includes(analysisType)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid analysis type. Must be one of: ${validAnalysisTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      let result;

      switch (analysisType) {
        case 'velocity':
          result = await analyticsService.calculateVelocity(
            parameters.sprintIds,
            parameters.timeframe
          );
          break;

        case 'burndown':
          if (!parameters.sprintId) {
            return res.status(400).json({
              error: 'Bad Request',
              message: 'sprintId is required for burndown analysis',
              timestamp: new Date().toISOString()
            });
          }
          result = await analyticsService.calculateBurndown(
            parameters.sprintId,
            parameters.granularity || 'daily'
          );
          break;

        case 'predictions':
          result = await analyticsService.predictCompletion(workItemIds);
          break;

        case 'risks':
          result = await analyticsService.identifyRisks(workItemIds);
          break;

        case 'trends':
          result = await analyticsService.readinessTrend(
            parameters.dimension,
            parameters.timeframeDays || 30
          );
          break;

        case 'dependencies':
          result = await analyticsService.calculateDependencyDepth(workItemIds);
          break;

        case 'health':
          result = await analyticsService.measureReadinessHealth();
          break;

        default:
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Unknown analysis type',
            timestamp: new Date().toISOString()
          });
      }

      const response = {
        success: true,
        data: {
          analysisType,
          result,
          calculatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        metadata: {
          analysisType,
          parameters,
          workItemCount: workItemIds?.length || 'all'
        }
      };

      res.json(response);
    } catch (error) {
      handleAnalyticsErrors(error, req, res, null);
    }
  });

  return router;
}

/**
 * Helper function to generate health grade based on score
 */
function getHealthGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Helper function to generate health recommendations
 */
function generateHealthRecommendations(health: any): string[] {
  const recommendations: string[] = [];

  if (health.overallScore < 60) {
    recommendations.push('System health is critical - immediate intervention required');
  }

  if (health.systemMetrics.coherence < 50) {
    recommendations.push('Dimension alignment is poor - balance development across all areas');
  }

  if (health.systemMetrics.momentum < 30) {
    recommendations.push('Progress velocity is low - consider resource reallocation');
  }

  if (health.systemMetrics.efficiency < 40) {
    recommendations.push('Too many blockers affecting efficiency - prioritize blocker resolution');
  }

  const criticalAlerts = health.alerts.filter((alert: any) => alert.level === 'critical');
  if (criticalAlerts.length > 0) {
    recommendations.push(`Address ${criticalAlerts.length} critical system alert(s)`);
  }

  return recommendations.length > 0 ? recommendations : ['System health is good - continue current practices'];
}