import { Router } from 'express';
import { container } from '../../factories/container.js';
import { ReadinessController } from '../../controllers/ReadinessController.js';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { createReadinessValidationMiddleware } from '../../middleware/ReadinessValidationMiddleware.js';

/**
 * Validation middleware for readiness operations
 */
const validateStateTransition = async (req: any, res: any, next: any) => {
  try {
    // Add validation middleware logic here if needed
    // For now, just pass through as validation is handled in the controller
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Validation middleware error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Error handling middleware for readiness operations
 */
const handleReadinessErrors = (error: any, req: any, res: any, next: any) => {
  console.error('Readiness operation error:', error);

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

  if (error.message?.includes('validation') || error.message?.includes('invalid')) {
    res.status(400).json({
      error: 'Bad Request',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error.message?.includes('already exists') || error.message?.includes('Unique constraint')) {
    res.status(409).json({
      error: 'Conflict',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Default to internal server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
};

/**
 * Readiness API routes with OpenAPI schemas and validation
 * Provides endpoints for single updates, bulk operations, and configuration management
 */
export function readinessRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  // Get controller and validation middleware from service factory
  const readinessService = serviceFactory.getReadinessService();
  const validationMiddleware = createReadinessValidationMiddleware(readinessService);

  const getController = (): ReadinessController => {
    try {
      return container.get<ReadinessController>('ReadinessController');
    } catch {
      // Fallback: create controller directly with service factory
      return new ReadinessController(readinessService as any);
    }
  };

  /**
   * @openapi
   * /work-items/{id}/readiness:
   *   put:
   *     summary: Update readiness for a single dimension
   *     tags: [Readiness]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         description: Work item ID
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - dimension
   *             properties:
   *               dimension:
   *                 type: string
   *                 enum: [requirements, design, frontend, backend, integration, test]
   *                 description: Readiness dimension to update
   *               value:
   *                 type: string
   *                 enum: [NOT_STARTED, IN_PROGRESS, COMPLETE]
   *                 description: New state value
   *               percentage:
   *                 type: number
   *                 minimum: 0
   *                 maximum: 100
   *                 description: Percentage completion (0-100)
   *               configurationId:
   *                 type: string
   *                 description: Optional configuration for custom states
   *           examples:
   *             stateUpdate:
   *               summary: Update by state
   *               value:
   *                 dimension: "backend"
   *                 value: "IN_PROGRESS"
   *             percentageUpdate:
   *               summary: Update by percentage
   *               value:
   *                 dimension: "frontend"
   *                 percentage: 75
   *     responses:
   *       200:
   *         description: Readiness updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     workItemId:
   *                       type: string
   *                     readiness:
   *                       $ref: '#/components/schemas/ReadinessState'
   *                     overallCompletion:
   *                       type: number
   *                     isComplete:
   *                       type: boolean
   *                 timestamp:
   *                   type: string
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.put('/work-items/:id/readiness',
    validationMiddleware.validatePercentageUpdate,
    validationMiddleware.validateStateTransition,
    validationMiddleware.logReadinessChange,
    async (req, res) => {
      try {
        const controller = getController();
        await controller.updateReadiness(req, res);
      } catch (error) {
        handleReadinessErrors(error, req, res, null);
      }
    }
  );

  /**
   * @openapi
   * /work-items/readiness/bulk:
   *   put:
   *     summary: Bulk update readiness for multiple work items
   *     tags: [Readiness]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - updates
   *             properties:
   *               updates:
   *                 type: array
   *                 maxItems: 100
   *                 items:
   *                   type: object
   *                   required:
   *                     - workItemId
   *                     - dimension
   *                   properties:
   *                     workItemId:
   *                       type: string
   *                     dimension:
   *                       type: string
   *                       enum: [requirements, design, frontend, backend, integration, test]
   *                     value:
   *                       type: string
   *                       enum: [NOT_STARTED, IN_PROGRESS, COMPLETE]
   *                     percentage:
   *                       type: number
   *                       minimum: 0
   *                       maximum: 100
   *                     configurationId:
   *                       type: string
   *               configurationId:
   *                 type: string
   *                 description: Default configuration for all updates
   *           example:
   *             updates:
   *               - workItemId: "item1"
   *                 dimension: "design"
   *                 value: "COMPLETE"
   *               - workItemId: "item2"
   *                 dimension: "frontend"
   *                 percentage: 80
   *     responses:
   *       200:
   *         description: Bulk update completed successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.put('/work-items/readiness/bulk',
    validationMiddleware.validateBulkOperation,
    validationMiddleware.logReadinessChange,
    async (req, res) => {
      try {
        const controller = getController();
        await controller.bulkUpdateReadiness(req, res);
      } catch (error) {
        handleReadinessErrors(error, req, res, null);
      }
    }
  );

  /**
   * @openapi
   * /work-items/{id}/readiness/summary:
   *   get:
   *     summary: Get aggregated readiness summary
   *     tags: [Readiness]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         description: Work item ID
   *         schema:
   *           type: string
   *       - name: includeChildren
   *         in: query
   *         description: Include child work items in aggregation
   *         schema:
   *           type: boolean
   *           default: false
   *       - name: configurationId
   *         in: query
   *         description: Configuration for color coding
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Readiness summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ReadinessSummary'
   *                 timestamp:
   *                   type: string
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/work-items/:id/readiness/summary', async (req, res) => {
    try {
      const controller = getController();
      await controller.getReadinessSummary(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /work-items/readiness/filter:
   *   get:
   *     summary: Query work items by readiness criteria
   *     tags: [Readiness]
   *     parameters:
   *       - name: dimension
   *         in: query
   *         description: Readiness dimension to filter by
   *         schema:
   *           type: string
   *           enum: [requirements, design, frontend, backend, integration, test]
   *       - name: value
   *         in: query
   *         description: State value to filter by
   *         schema:
   *           type: string
   *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETE]
   *       - name: percentage
   *         in: query
   *         description: Minimum percentage to filter by
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 100
   *       - name: completionMin
   *         in: query
   *         description: Minimum overall completion percentage
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 100
   *       - name: completionMax
   *         in: query
   *         description: Maximum overall completion percentage
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 100
   *       - name: configurationId
   *         in: query
   *         description: Filter by configuration
   *         schema:
   *           type: string
   *       - name: limit
   *         in: query
   *         description: Maximum number of results
   *         schema:
   *           type: number
   *           default: 50
   *           maximum: 100
   *       - name: offset
   *         in: query
   *         description: Number of results to skip
   *         schema:
   *           type: number
   *           default: 0
   *     responses:
   *       200:
   *         description: Filtered work items retrieved successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/work-items/readiness/filter', async (req, res) => {
    try {
      const controller = getController();
      await controller.filterByReadiness(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /readiness/configuration:
   *   post:
   *     summary: Create custom readiness configuration
   *     tags: [Configuration]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateConfigurationRequest'
   *     responses:
   *       201:
   *         description: Configuration created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.post('/readiness/configuration', async (req, res) => {
    try {
      const controller = getController();
      await controller.createConfiguration(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /readiness/configuration/{id}:
   *   get:
   *     summary: Get readiness configuration by ID
   *     tags: [Configuration]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         description: Configuration ID
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Configuration retrieved successfully
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/readiness/configuration/:id', async (req, res) => {
    try {
      const controller = getController();
      await controller.getConfiguration(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /readiness/configuration:
   *   get:
   *     summary: List all readiness configurations
   *     tags: [Configuration]
   *     parameters:
   *       - name: limit
   *         in: query
   *         description: Maximum number of results
   *         schema:
   *           type: number
   *           default: 50
   *           maximum: 100
   *       - name: offset
   *         in: query
   *         description: Number of results to skip
   *         schema:
   *           type: number
   *           default: 0
   *     responses:
   *       200:
   *         description: Configurations retrieved successfully
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/readiness/configuration', async (req, res) => {
    try {
      const controller = getController();
      await controller.listConfigurations(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  /**
   * @openapi
   * /readiness/aggregation:
   *   get:
   *     summary: Get readiness aggregation data
   *     tags: [Analytics]
   *     parameters:
   *       - name: configurationId
   *         in: query
   *         description: Filter by configuration
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Aggregation data retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalItems:
   *                       type: number
   *                     completionDistribution:
   *                       type: object
   *                       properties:
   *                         notStarted:
   *                           type: number
   *                         inProgress:
   *                           type: number
   *                         complete:
   *                           type: number
   *                     dimensionAverages:
   *                       type: object
   *                       properties:
   *                         requirements:
   *                           type: number
   *                         design:
   *                           type: number
   *                         frontend:
   *                           type: number
   *                         backend:
   *                           type: number
   *                         integration:
   *                           type: number
   *                         test:
   *                           type: number
   *                 timestamp:
   *                   type: string
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/readiness/aggregation', async (req, res) => {
    try {
      const controller = getController();
      await controller.getAggregation(req, res);
    } catch (error) {
      handleReadinessErrors(error, req, res, null);
    }
  });

  return router;
}

/**
 * OpenAPI component schemas for readiness API
 */
export const readinessSchemas = {
  ReadinessState: {
    type: 'object',
    properties: {
      requirements: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      design: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      frontend: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      backend: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      integration: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      test: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      requirementsPercentage: { type: 'number', minimum: 0, maximum: 100 },
      designPercentage: { type: 'number', minimum: 0, maximum: 100 },
      frontendPercentage: { type: 'number', minimum: 0, maximum: 100 },
      backendPercentage: { type: 'number', minimum: 0, maximum: 100 },
      integrationPercentage: { type: 'number', minimum: 0, maximum: 100 },
      testPercentage: { type: 'number', minimum: 0, maximum: 100 },
    }
  },

  ReadinessSummary: {
    type: 'object',
    properties: {
      workItemId: { type: 'string' },
      title: { type: 'string' },
      overallCompletion: { type: 'number' },
      readiness: { $ref: '#/components/schemas/ReadinessState' },
      blockers: {
        type: 'array',
        items: { type: 'string' }
      },
      isReady: { type: 'boolean' },
      dimensionSummary: {
        type: 'object',
        properties: {
          requirements: { $ref: '#/components/schemas/DimensionSummary' },
          design: { $ref: '#/components/schemas/DimensionSummary' },
          frontend: { $ref: '#/components/schemas/DimensionSummary' },
          backend: { $ref: '#/components/schemas/DimensionSummary' },
          integration: { $ref: '#/components/schemas/DimensionSummary' },
          test: { $ref: '#/components/schemas/DimensionSummary' },
        }
      }
    }
  },

  DimensionSummary: {
    type: 'object',
    properties: {
      state: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'] },
      percentage: { type: 'number', minimum: 0, maximum: 100 },
      color: { type: 'string' }
    }
  },

  CreateConfigurationRequest: {
    type: 'object',
    required: ['name', 'states', 'validationRules'],
    properties: {
      name: {
        type: 'string',
        description: 'Configuration name (must be unique)'
      },
      description: {
        type: 'string',
        description: 'Optional description'
      },
      states: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'value', 'minPercentage', 'maxPercentage'],
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            minPercentage: { type: 'number', minimum: 0, maximum: 100 },
            maxPercentage: { type: 'number', minimum: 0, maximum: 100 },
            color: { type: 'string' },
            description: { type: 'string' }
          }
        }
      },
      validationRules: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'description', 'dependentDimension', 'requiredDimensions', 'requiredState'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            dependentDimension: {
              type: 'string',
              enum: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test']
            },
            requiredDimensions: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test']
              }
            },
            requiredState: { type: 'string' },
            errorMessage: { type: 'string' }
          }
        }
      }
    }
  }
};

/**
 * OpenAPI response schemas
 */
export const readinessResponses = {
  BadRequest: {
    description: 'Bad Request',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Bad Request' },
            message: { type: 'string', example: 'Validation failed' },
            timestamp: { type: 'string', format: 'date-time' },
            details: { type: 'object' }
          }
        }
      }
    }
  },

  NotFound: {
    description: 'Not Found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Not Found' },
            message: { type: 'string', example: 'Resource not found' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },

  Conflict: {
    description: 'Conflict',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Conflict' },
            message: { type: 'string', example: 'Resource already exists' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },

  InternalError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Internal Server Error' },
            message: { type: 'string', example: 'An unexpected error occurred' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }
};