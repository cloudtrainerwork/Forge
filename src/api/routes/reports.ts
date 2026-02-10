import { Router, Request, Response } from 'express';
import { container } from '../../factories/container.js';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { ReportingService } from '../../services/ReportingService.js';

/**
 * Error handling middleware for reporting operations
 */
const handleReportingErrors = (error: any, req: Request, res: Response, next: any) => {
  console.error('Reporting operation error:', error);

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

  if (error.message?.includes('unauthorized') || error.message?.includes('permission')) {
    res.status(403).json({
      error: 'Forbidden',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred while generating report',
    timestamp: new Date().toISOString()
  });
};

/**
 * Validation middleware for report generation
 */
const validateReportRequest = (req: Request, res: Response, next: any) => {
  try {
    const { format } = req.query;
    const validFormats = ['json', 'csv', 'pdf', 'markdown'];

    if (format && !validFormats.includes(format as string)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    // Validate date range if provided
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
 * Reports API routes with comprehensive reporting capabilities
 * Provides endpoints for various report types and export functionality
 */
export function reportsRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  const getReportingService = (): ReportingService => {
    try {
      return container.get<ReportingService>('ReportingService');
    } catch {
      // Fallback: create service directly with service factory
      return new ReportingService(
        serviceFactory.getWorkItemRepository() as any,
        serviceFactory.getReadinessService() as any,
        serviceFactory.getSprintService() as any,
        serviceFactory.getGroupingService() as any
      );
    }
  };

  /**
   * @openapi
   * /api/v1/reports/readiness:
   *   get:
   *     summary: Generate comprehensive readiness report
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: configurationId
   *         schema:
   *           type: string
   *         description: Optional readiness configuration ID
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, pdf, markdown]
   *         description: Export format
   *       - in: query
   *         name: includeArchived
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include archived items
   *     responses:
   *       200:
   *         description: Readiness report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 report:
   *                   $ref: '#/components/schemas/ReadinessReport'
   *       400:
   *         description: Invalid request parameters
   *       500:
   *         description: Report generation failed
   */
  router.get('/readiness', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { configurationId, format = 'json', includeArchived = false } = req.query;

      const report = await reportingService.generateReadinessReport(configurationId as string);

      // Handle different export formats
      if (format === 'json') {
        res.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString(),
          metadata: {
            format: 'json',
            generatedBy: 'reporting-service',
            version: '1.0'
          }
        });
      } else if (format === 'csv') {
        const csvData = await reportingService.exportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=readiness-report-${Date.now()}.csv`);
        res.send(csvData);
      } else if (format === 'pdf') {
        const pdfBuffer = await reportingService.exportToPDF(report);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=readiness-report-${Date.now()}.pdf`);
        res.send(pdfBuffer);
      } else if (format === 'markdown') {
        const markdownData = await reportingService.exportToMarkdown(report);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename=readiness-report-${Date.now()}.md`);
        res.send(markdownData);
      }
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/sprint/{id}:
   *   get:
   *     summary: Generate sprint-specific readiness report
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Sprint ID
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, pdf, markdown]
   *         description: Export format
   *       - in: query
   *         name: includeMetrics
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include velocity and performance metrics
   *     responses:
   *       200:
   *         description: Sprint report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 report:
   *                   $ref: '#/components/schemas/SprintReadinessReport'
   *       404:
   *         description: Sprint not found
   *       500:
   *         description: Report generation failed
   */
  router.get('/sprint/:id', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { id: sprintId } = req.params;
      const { format = 'json', includeMetrics = true } = req.query;

      if (!sprintId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Sprint ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const report = await reportingService.getSprintReadinessReport(sprintId);

      if (format === 'json') {
        res.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString(),
          metadata: {
            sprintId,
            format: 'json',
            includeMetrics: includeMetrics === 'true'
          }
        });
      } else {
        // For other formats, convert sprint report to general format for export
        const generalReport = {
          id: `sprint-${sprintId}-${Date.now()}`,
          type: 'sprint_progress',
          title: `Sprint ${report.sprintName} Progress Report`,
          generatedAt: report.generatedAt,
          summary: {
            totalItems: report.screenGroups.reduce((sum, sg) => sum + sg.plannedItems, 0),
            overallCompletion: report.progress.overallCompletion,
            itemsComplete: report.screenGroups.reduce((sum, sg) => sum + sg.completedItems, 0),
            itemsInProgress: report.screenGroups.reduce((sum, sg) => sum + (sg.plannedItems - sg.completedItems), 0),
            itemsNotStarted: 0,
            criticalBlockers: report.blockers.length
          },
          dimensionBreakdown: {},
          sprintBreakdown: [{
            sprintId: report.sprintId,
            sprintName: report.sprintName,
            sprintNumber: report.sprintNumber,
            status: report.status,
            overallCompletion: report.progress.overallCompletion,
            plannedItems: report.screenGroups.reduce((sum, sg) => sum + sg.plannedItems, 0),
            completedItems: report.screenGroups.reduce((sum, sg) => sum + sg.completedItems, 0),
            onTrack: report.progress.onTrack,
            estimatedCompletion: null
          }],
          screenGroupBreakdown: report.screenGroups.map(sg => ({
            groupId: sg.groupId,
            groupName: sg.groupName,
            overallCompletion: sg.completion,
            totalWorkItems: sg.plannedItems,
            readyItems: sg.completedItems,
            blockedItems: sg.blockers.length,
            priority: 1
          })),
          criticalPath: [],
          atRiskItems: [],
          velocityMetrics: {
            currentVelocity: 0,
            averageVelocity: 0,
            velocityTrend: 0,
            completionRate: report.progress.overallCompletion,
            throughput: report.screenGroups.reduce((sum, sg) => sum + sg.completedItems, 0)
          },
          projectedCompletion: {
            estimatedCompletionDate: null,
            confidenceInterval: { optimistic: new Date(), pessimistic: new Date() },
            remainingWork: 100 - report.progress.overallCompletion,
            atCurrentPace: null,
            withImprovements: null
          }
        };

        if (format === 'csv') {
          const csvData = await reportingService.exportToCSV(generalReport as any);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=sprint-${sprintId}-report-${Date.now()}.csv`);
          res.send(csvData);
        } else if (format === 'pdf') {
          const pdfBuffer = await reportingService.exportToPDF(generalReport as any);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=sprint-${sprintId}-report-${Date.now()}.pdf`);
          res.send(pdfBuffer);
        } else if (format === 'markdown') {
          const markdownData = await reportingService.exportToMarkdown(generalReport as any);
          res.setHeader('Content-Type', 'text/markdown');
          res.setHeader('Content-Disposition', `attachment; filename=sprint-${sprintId}-report-${Date.now()}.md`);
          res.send(markdownData);
        }
      }
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/screen/{id}:
   *   get:
   *     summary: Generate screen group readiness report
   *     tags: [Reports]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Screen group ID
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, pdf, markdown]
   *         description: Export format
   *       - in: query
   *         name: includeDependencies
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include dependency analysis
   *     responses:
   *       200:
   *         description: Screen group report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 report:
   *                   $ref: '#/components/schemas/ScreenReadinessReport'
   *       404:
   *         description: Screen group not found
   *       500:
   *         description: Report generation failed
   */
  router.get('/screen/:id', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { id: screenGroupId } = req.params;
      const { format = 'json', includeDependencies = true } = req.query;

      if (!screenGroupId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Screen group ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const report = await reportingService.getScreenReadinessReport(screenGroupId);

      if (format === 'json') {
        res.json({
          success: true,
          data: report,
          timestamp: new Date().toISOString(),
          metadata: {
            screenGroupId,
            format: 'json',
            includeDependencies: includeDependencies === 'true'
          }
        });
      } else {
        // For other formats, we'd need to implement specific export logic for screen reports
        res.status(501).json({
          error: 'Not Implemented',
          message: `Screen group export in ${format} format not yet implemented`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/critical-path:
   *   get:
   *     summary: Generate critical path analysis report
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: projectId
   *         schema:
   *           type: string
   *         description: Optional project ID filter
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, pdf, markdown]
   *         description: Export format
   *       - in: query
   *         name: includeAlternatives
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include alternative path analysis
   *     responses:
   *       200:
   *         description: Critical path report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 criticalPath:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/CriticalPathItem'
   *       500:
   *         description: Report generation failed
   */
  router.get('/critical-path', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { projectId, format = 'json', includeAlternatives = true } = req.query;

      const criticalPath = await reportingService.getCriticalPathReport();

      res.json({
        success: true,
        data: {
          criticalPath,
          totalDuration: criticalPath.reduce((sum, item) => sum + item.estimatedDuration, 0),
          criticalItems: criticalPath.filter(item => item.isBlocking).length,
          includeAlternatives: includeAlternatives === 'true'
        },
        timestamp: new Date().toISOString(),
        metadata: {
          projectId,
          format,
          analysisType: 'critical-path'
        }
      });
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/at-risk:
   *   get:
   *     summary: Generate at-risk items report
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: riskLevel
   *         schema:
   *           type: string
   *           enum: [low, medium, high, critical]
   *         description: Filter by minimum risk level
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv, pdf, markdown]
   *         description: Export format
   *       - in: query
   *         name: includeRecommendations
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include recommended actions
   *     responses:
   *       200:
   *         description: At-risk items report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 atRiskItems:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/AtRiskItem'
   *       500:
   *         description: Report generation failed
   */
  router.get('/at-risk', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { riskLevel, format = 'json', includeRecommendations = true } = req.query;

      let atRiskItems = await reportingService.getAtRiskReport();

      // Filter by risk level if specified
      if (riskLevel) {
        const riskLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const minRiskLevel = riskLevels[riskLevel as keyof typeof riskLevels] || 1;

        atRiskItems = atRiskItems.filter(item => {
          const itemRiskLevel = riskLevels[item.riskLevel];
          return itemRiskLevel >= minRiskLevel;
        });
      }

      res.json({
        success: true,
        data: {
          atRiskItems,
          summary: {
            totalAtRisk: atRiskItems.length,
            criticalRisk: atRiskItems.filter(item => item.riskLevel === 'critical').length,
            highRisk: atRiskItems.filter(item => item.riskLevel === 'high').length,
            mediumRisk: atRiskItems.filter(item => item.riskLevel === 'medium').length,
            lowRisk: atRiskItems.filter(item => item.riskLevel === 'low').length
          },
          includeRecommendations: includeRecommendations === 'true'
        },
        timestamp: new Date().toISOString(),
        metadata: {
          riskLevel: riskLevel || 'all',
          format,
          analysisType: 'at-risk'
        }
      });
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/export:
   *   post:
   *     summary: Generate custom export with specific configuration
   *     tags: [Reports]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               format:
   *                 type: string
   *                 enum: [json, csv, pdf, markdown]
   *               scope:
   *                 type: string
   *                 enum: [all, filtered, selected]
   *               sections:
   *                 type: object
   *                 properties:
   *                   summary:
   *                     type: boolean
   *                   dimensions:
   *                     type: boolean
   *                   sprints:
   *                     type: boolean
   *                   groups:
   *                     type: boolean
   *                   risks:
   *                     type: boolean
   *                   timeline:
   *                     type: boolean
   *                   blockers:
   *                     type: boolean
   *                   analytics:
   *                     type: boolean
   *               filters:
   *                 type: object
   *                 properties:
   *                   dateRange:
   *                     type: object
   *                     properties:
   *                       start:
   *                         type: string
   *                         format: date-time
   *                       end:
   *                         type: string
   *                         format: date-time
   *                   sprintIds:
   *                     type: array
   *                     items:
   *                       type: string
   *                   groupIds:
   *                     type: array
   *                     items:
   *                       type: string
   *                   riskLevels:
   *                     type: array
   *                     items:
   *                       type: string
   *                       enum: [low, medium, high, critical]
   *     responses:
   *       200:
   *         description: Custom export generated successfully
   *       400:
   *         description: Invalid export configuration
   *       500:
   *         description: Export generation failed
   */
  router.post('/export', async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const exportConfig = req.body;

      // Validate export configuration
      if (!exportConfig.format || !['json', 'csv', 'pdf', 'markdown'].includes(exportConfig.format)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Valid format is required (json, csv, pdf, markdown)',
          timestamp: new Date().toISOString()
        });
      }

      if (!exportConfig.scope || !['all', 'filtered', 'selected'].includes(exportConfig.scope)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Valid scope is required (all, filtered, selected)',
          timestamp: new Date().toISOString()
        });
      }

      // Generate base report
      const report = await reportingService.generateReadinessReport();

      // Apply filters and sections based on configuration
      const filteredReport = applyExportConfiguration(report, exportConfig);

      // Export in requested format
      if (exportConfig.format === 'json') {
        res.json({
          success: true,
          data: filteredReport,
          timestamp: new Date().toISOString(),
          metadata: {
            exportConfig,
            generatedBy: 'custom-export'
          }
        });
      } else if (exportConfig.format === 'csv') {
        const csvData = await reportingService.exportToCSV(filteredReport);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=custom-export-${Date.now()}.csv`);
        res.send(csvData);
      } else if (exportConfig.format === 'pdf') {
        const pdfBuffer = await reportingService.exportToPDF(filteredReport);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=custom-export-${Date.now()}.pdf`);
        res.send(pdfBuffer);
      } else if (exportConfig.format === 'markdown') {
        const markdownData = await reportingService.exportToMarkdown(filteredReport);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename=custom-export-${Date.now()}.md`);
        res.send(markdownData);
      }
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/velocity:
   *   get:
   *     summary: Generate velocity metrics report
   *     tags: [Reports]
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
   *           enum: [week, month, quarter]
   *         description: Analysis timeframe
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, csv]
   *         description: Export format
   *     responses:
   *       200:
   *         description: Velocity report generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 velocityMetrics:
   *                   $ref: '#/components/schemas/VelocityMetrics'
   *       500:
   *         description: Report generation failed
   */
  router.get('/velocity', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { sprintIds, timeframe = 'month', format = 'json' } = req.query;

      const sprintIdList = sprintIds ? (sprintIds as string).split(',') : undefined;
      const velocityMetrics = await reportingService.getVelocityReport(sprintIdList);

      res.json({
        success: true,
        data: {
          velocityMetrics,
          timeframe,
          sprintCount: sprintIdList?.length || 'all'
        },
        timestamp: new Date().toISOString(),
        metadata: {
          analysisType: 'velocity',
          format
        }
      });
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /api/v1/reports/executive-summary:
   *   get:
   *     summary: Generate executive summary report
   *     tags: [Reports]
   *     parameters:
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [json, pdf, markdown]
   *         description: Export format
   *     responses:
   *       200:
   *         description: Executive summary generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 summary:
   *                   type: object
   *       500:
   *         description: Report generation failed
   */
  router.get('/executive-summary', validateReportRequest, async (req: Request, res: Response) => {
    try {
      const reportingService = getReportingService();
      const { format = 'json' } = req.query;

      const executiveSummary = await reportingService.generateExecutiveSummary();

      if (format === 'json') {
        res.json({
          success: true,
          data: executiveSummary,
          timestamp: new Date().toISOString(),
          metadata: {
            reportType: 'executive-summary',
            format
          }
        });
      } else {
        // For PDF/Markdown, create a formatted report
        res.status(501).json({
          error: 'Not Implemented',
          message: `Executive summary export in ${format} format not yet implemented`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      handleReportingErrors(error, req, res, null);
    }
  });

  return router;
}

/**
 * Helper function to apply export configuration filters and sections
 */
function applyExportConfiguration(report: any, config: any): any {
  const filteredReport = { ...report };

  // Apply section filters
  if (config.sections) {
    Object.keys(config.sections).forEach(section => {
      if (!config.sections[section] && filteredReport[section]) {
        delete filteredReport[section];
      }
    });
  }

  // Apply data filters
  if (config.filters) {
    if (config.filters.sprintIds && config.filters.sprintIds.length > 0) {
      filteredReport.sprintBreakdown = filteredReport.sprintBreakdown?.filter((sprint: any) =>
        config.filters.sprintIds.includes(sprint.sprintId)
      ) || [];
    }

    if (config.filters.groupIds && config.filters.groupIds.length > 0) {
      filteredReport.screenGroupBreakdown = filteredReport.screenGroupBreakdown?.filter((group: any) =>
        config.filters.groupIds.includes(group.groupId)
      ) || [];
    }

    if (config.filters.riskLevels && config.filters.riskLevels.length > 0) {
      filteredReport.atRiskItems = filteredReport.atRiskItems?.filter((item: any) =>
        config.filters.riskLevels.includes(item.riskLevel)
      ) || [];
    }

    // Date range filtering would be more complex and require historical data
    if (config.filters.dateRange) {
      // Implementation would depend on having historical data structure
      console.log('Date range filtering not yet implemented:', config.filters.dateRange);
    }
  }

  return filteredReport;
}