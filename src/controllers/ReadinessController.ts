import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { ReadinessService, UpdateReadinessRequest, BulkUpdateReadinessRequest } from '../services/ReadinessService.js';
import { ReadinessConfiguration, StateConfiguration, ValidationRule } from '../domain/entities/ReadinessConfiguration.js';
import { ReadinessDimension, ReadinessDimensionKey } from '../domain/entities/ReadinessState.js';

/**
 * Request body for updating single dimension
 */
interface UpdateReadinessRequestBody {
  dimension: ReadinessDimensionKey;
  value?: ReadinessDimension;
  percentage?: number;
  configurationId?: string;
}

/**
 * Request body for bulk updates
 */
interface BulkUpdateRequestBody {
  updates: Array<{
    workItemId: string;
    dimension: ReadinessDimensionKey;
    value?: ReadinessDimension;
    percentage?: number;
    configurationId?: string;
  }>;
  configurationId?: string;
}

/**
 * Request body for creating configuration
 */
interface CreateConfigurationRequestBody {
  name: string;
  description?: string;
  states: Array<{
    name: string;
    value: string;
    minPercentage: number;
    maxPercentage: number;
    color?: string;
    description?: string;
  }>;
  validationRules: Array<{
    name: string;
    description: string;
    dependentDimension: ReadinessDimensionKey;
    requiredDimensions: ReadinessDimensionKey[];
    requiredState: string;
    errorMessage?: string;
  }>;
}

/**
 * Controller for readiness tracking API endpoints
 * Handles single updates, bulk operations, and configuration management
 */
@injectable()
export class ReadinessController {
  constructor(
    @inject('ReadinessService') private readinessService: ReadinessService
  ) {}

  /**
   * PUT /work-items/:id/readiness - Update single dimension
   */
  async updateReadiness(req: Request, res: Response): Promise<void> {
    try {
      const workItemId = req.params.id;
      const body = req.body as UpdateReadinessRequestBody;

      // Validate request body
      if (!body.dimension) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'dimension is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate dimension is valid
      const validDimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
      if (!validDimensions.includes(body.dimension)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate state if provided
      if (body.value && !Object.values(ReadinessDimension).includes(body.value)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Invalid state. Must be one of: ${Object.values(ReadinessDimension).join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate percentage if provided
      if (body.percentage !== undefined && (body.percentage < 0 || body.percentage > 100)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'percentage must be between 0 and 100',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Must provide either value or percentage
      if (!body.value && body.percentage === undefined) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Either value or percentage must be provided',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const request: UpdateReadinessRequest = {
        workItemId,
        dimension: body.dimension,
        value: body.value,
        percentage: body.percentage,
        configurationId: body.configurationId
      };

      const updatedReadiness = await this.readinessService.updateReadiness(request);

      res.json({
        success: true,
        data: {
          workItemId,
          readiness: updatedReadiness.toJSON(),
          overallCompletion: updatedReadiness.getCompletionPercentage(),
          isComplete: updatedReadiness.isComplete()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else if (error instanceof Error && error.message.includes('Validation failed')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * PUT /work-items/readiness/bulk - Bulk updates
   */
  async bulkUpdateReadiness(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as BulkUpdateRequestBody;

      // Validate request body
      if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'updates array is required and must not be empty',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (body.updates.length > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Maximum 100 updates allowed per bulk request',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate each update
      const validDimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

      for (let i = 0; i < body.updates.length; i++) {
        const update = body.updates[i];

        if (!update.workItemId) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Update ${i + 1}: workItemId is required`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!update.dimension || !validDimensions.includes(update.dimension)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Update ${i + 1}: invalid dimension. Must be one of: ${validDimensions.join(', ')}`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (update.value && !Object.values(ReadinessDimension).includes(update.value)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Update ${i + 1}: invalid state. Must be one of: ${Object.values(ReadinessDimension).join(', ')}`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (update.percentage !== undefined && (update.percentage < 0 || update.percentage > 100)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Update ${i + 1}: percentage must be between 0 and 100`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!update.value && update.percentage === undefined) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Update ${i + 1}: either value or percentage must be provided`,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      const request: BulkUpdateReadinessRequest = {
        updates: body.updates.map(update => ({
          workItemId: update.workItemId,
          dimension: update.dimension,
          value: update.value,
          percentage: update.percentage,
          configurationId: update.configurationId || body.configurationId
        })),
        configurationId: body.configurationId
      };

      const updatedStates = await this.readinessService.bulkUpdateReadiness(request);

      res.json({
        success: true,
        data: {
          updatedCount: updatedStates.length,
          updates: updatedStates.map((state, index) => ({
            workItemId: body.updates[index].workItemId,
            readiness: state.toJSON(),
            overallCompletion: state.getCompletionPercentage(),
            isComplete: state.isComplete()
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * GET /work-items/:id/readiness/summary - Get aggregated readiness
   */
  async getReadinessSummary(req: Request, res: Response): Promise<void> {
    try {
      const workItemId = req.params.id;
      const includeChildren = req.query.includeChildren === 'true';
      const configurationId = req.query.configurationId as string | undefined;

      const summary = await this.readinessService.getReadinessSummary(
        workItemId,
        includeChildren,
        configurationId
      );

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * GET /work-items/readiness/filter - Query by readiness state
   */
  async filterByReadiness(req: Request, res: Response): Promise<void> {
    try {
      const {
        dimension,
        value,
        percentage,
        completionMin,
        completionMax,
        configurationId,
        limit = '50',
        offset = '0'
      } = req.query;

      // Build filter options
      const options: any = {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0
      };

      if (completionMin) {
        options.completionMin = parseInt(completionMin as string);
      }
      if (completionMax) {
        options.completionMax = parseInt(completionMax as string);
      }
      if (configurationId) {
        options.configurationId = configurationId as string;
      }

      // Add dimension filter if provided
      if (dimension && (value || percentage)) {
        options.dimensions = {};

        if (value) {
          // Validate state value
          if (!Object.values(ReadinessDimension).includes(value as ReadinessDimension)) {
            res.status(400).json({
              error: 'Bad Request',
              message: `Invalid state value. Must be one of: ${Object.values(ReadinessDimension).join(', ')}`,
              timestamp: new Date().toISOString()
            });
            return;
          }
          options.dimensions[dimension as string] = value;
        }

        if (percentage) {
          const percentValue = parseInt(percentage as string);
          if (percentValue < 0 || percentValue > 100) {
            res.status(400).json({
              error: 'Bad Request',
              message: 'percentage must be between 0 and 100',
              timestamp: new Date().toISOString()
            });
            return;
          }
          options.dimensions[dimension as string] = percentValue;
        }
      }

      // TODO: Implement filtering in service layer
      // For now, return empty results as the filtering logic would be implemented in the repository
      res.json({
        success: true,
        data: {
          items: [],
          total: 0,
          hasMore: false,
          filters: options
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /readiness/configuration - Create custom configuration
   */
  async createConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as CreateConfigurationRequestBody;

      // Validate request body
      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'name is required and must be a non-empty string',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!body.states || !Array.isArray(body.states) || body.states.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'states array is required and must not be empty',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!body.validationRules || !Array.isArray(body.validationRules)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'validationRules array is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate states
      for (let i = 0; i < body.states.length; i++) {
        const state = body.states[i];
        if (!state.name || !state.value || typeof state.minPercentage !== 'number' || typeof state.maxPercentage !== 'number') {
          res.status(400).json({
            error: 'Bad Request',
            message: `State ${i + 1}: name, value, minPercentage, and maxPercentage are required`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (state.minPercentage < 0 || state.maxPercentage > 100 || state.minPercentage > state.maxPercentage) {
          res.status(400).json({
            error: 'Bad Request',
            message: `State ${i + 1}: invalid percentage range`,
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Validate validation rules
      const validDimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

      for (let i = 0; i < body.validationRules.length; i++) {
        const rule = body.validationRules[i];

        if (!rule.name || !rule.description || !rule.dependentDimension || !Array.isArray(rule.requiredDimensions) || !rule.requiredState) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Validation rule ${i + 1}: name, description, dependentDimension, requiredDimensions, and requiredState are required`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        if (!validDimensions.includes(rule.dependentDimension)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Validation rule ${i + 1}: invalid dependentDimension`,
            timestamp: new Date().toISOString()
          });
          return;
        }

        for (const reqDim of rule.requiredDimensions) {
          if (!validDimensions.includes(reqDim)) {
            res.status(400).json({
              error: 'Bad Request',
              message: `Validation rule ${i + 1}: invalid required dimension: ${reqDim}`,
              timestamp: new Date().toISOString()
            });
            return;
          }
        }
      }

      // Create domain entities
      const states = body.states.map(s => new StateConfiguration(
        s.name,
        s.value,
        s.minPercentage,
        s.maxPercentage,
        s.color,
        s.description
      ));

      const validationRules = body.validationRules.map(r => new ValidationRule(
        r.name,
        r.description,
        r.dependentDimension,
        r.requiredDimensions,
        r.requiredState,
        r.errorMessage
      ));

      const configuration = new ReadinessConfiguration(
        '', // ID will be generated by the service
        body.name.trim(),
        states,
        validationRules,
        body.description?.trim()
      );

      const saved = await this.readinessService.createConfiguration(configuration);

      res.status(201).json({
        success: true,
        data: saved.toJSON(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: 'Conflict',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else if (error instanceof Error && error.message.includes('validation')) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * GET /readiness/configuration/:id - Get configuration
   */
  async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const configurationId = req.params.id;

      const configurations = await this.readinessService.listConfigurations(1, 0);
      const configuration = configurations.configurations.find(c => c.id === configurationId);

      if (!configuration) {
        res.status(404).json({
          error: 'Not Found',
          message: `Configuration ${configurationId} not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: configuration.toJSON(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /readiness/configuration - List configurations
   */
  async listConfigurations(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.readinessService.listConfigurations(limit, offset);

      res.json({
        success: true,
        data: {
          configurations: result.configurations.map(c => c.toJSON()),
          total: result.total,
          hasMore: result.hasMore,
          pagination: {
            limit,
            offset,
            count: result.configurations.length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /readiness/aggregation - Get readiness aggregation data
   */
  async getAggregation(req: Request, res: Response): Promise<void> {
    try {
      const configurationId = req.query.configurationId as string | undefined;

      const aggregation = await this.readinessService.getReadinessAggregation(configurationId);

      res.json({
        success: true,
        data: aggregation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}