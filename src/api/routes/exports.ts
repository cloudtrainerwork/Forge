import { Router, Request, Response } from 'express';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import type { ExportResult } from '../../adapters/IExportService.js';

/**
 * Export routes for GSD XML generation and download
 * Provides REST API endpoints for exporting work item specifications as GSD XML files
 *
 * Follows established routing patterns with proper error handling, validation,
 * and file download response formatting consistent with other route modules.
 */
export default function exportsRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  /**
   * POST /api/exports/gsd/:workItemId
   * Export work item specification to GSD XML format
   * Returns file download response with proper headers
   */
  router.post('/gsd/:workItemId', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const { workItemId } = req.params;

      if (!workItemId) {
        return res.status(400).json({
          error: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      // Validate workItemId format (basic validation)
      if (typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid work item ID format',
          timestamp: new Date().toISOString()
        });
      }

      const exportService = serviceFactory.getExportService();
      const exportResult: ExportResult = await exportService.exportWorkItemToGSD(workItemId.trim());

      const processingTime = Date.now() - startTime;

      // Set file download headers
      res.set({
        'Content-Type': exportResult.contentType,
        'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
        'Content-Length': exportResult.buffer.length.toString(),
        'X-Processing-Time': `${processingTime}ms`,
        'X-Export-Type': exportResult.metadata.exportType,
        'X-File-Size': exportResult.metadata.fileSize.toString(),
        'X-Timestamp': exportResult.metadata.timestamp,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Send file buffer as response
      res.send(exportResult.buffer);

    } catch (error) {
      console.error('Error exporting work item to GSD:', error);

      const processingTime = Date.now() - startTime;

      // Handle specific error cases with appropriate status codes
      if (error instanceof Error) {
        // Work item not found
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            timestamp: new Date().toISOString(),
            processingTime: `${processingTime}ms`
          });
        }

        // Empty specification, too incomplete, or export blocked
        if (error.message.includes('empty specification') ||
            error.message.includes('too incomplete') ||
            error.message.includes('Export blocked')) {
          return res.status(400).json({
            error: 'Bad Request',
            message: error.message,
            timestamp: new Date().toISOString(),
            processingTime: `${processingTime}ms`
          });
        }

        // Performance timeout
        if (error.message.includes('5-second')) {
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Export operation timed out. Please try again.',
            timestamp: new Date().toISOString(),
            processingTime: `${processingTime}ms`
          });
        }
      }

      // Generic server error
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to export work item specification',
        timestamp: new Date().toISOString(),
        processingTime: `${processingTime}ms`
      });
    }
  });

  /**
   * GET /api/exports/gsd/:workItemId/validate
   * Validate if work item is ready for GSD export
   * Returns validation status without performing the export
   */
  router.get('/gsd/:workItemId/validate', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId) {
        return res.status(400).json({
          error: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid work item ID format',
          timestamp: new Date().toISOString()
        });
      }

      const exportService = serviceFactory.getExportService();
      const validation = await exportService.validateExportReadiness(workItemId.trim());

      res.json({
        data: validation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error validating export readiness:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate export readiness',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/exports/gsd/:workItemId/metadata
   * Get export metadata without performing the export
   * Provides quick access to export information for UI display
   */
  router.get('/gsd/:workItemId/metadata', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId) {
        return res.status(400).json({
          error: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Invalid work item ID format',
          timestamp: new Date().toISOString()
        });
      }

      const exportService = serviceFactory.getExportService();
      const metadata = await exportService.getExportMetadata(workItemId.trim());

      res.json({
        data: metadata,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting export metadata:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get export metadata',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /api/exports/gsd/:workItemId/preview
   * EXPORT-03: Preview GSD export before downloading
   * Returns the generated plan as readable JSON with XML preview
   */
  router.get('/gsd/:workItemId/preview', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId || typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Valid work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const exportService = serviceFactory.getExportService();
      const preview = await exportService.previewGSDExport(workItemId.trim());

      res.json({
        data: preview,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error generating export preview:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate export preview',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}