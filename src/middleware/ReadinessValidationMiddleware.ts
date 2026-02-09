import { Request, Response, NextFunction } from 'express';
import { ReadinessService } from '../services/ReadinessService.js';
import { ReadinessDimension, ReadinessDimensionKey } from '../domain/entities/ReadinessState.js';

/**
 * Enhanced validation middleware for readiness operations
 * Provides additional business rule validation and logging
 */
export class ReadinessValidationMiddleware {
  constructor(private readinessService: ReadinessService) {}

  /**
   * Middleware to validate state transition before processing
   */
  validateStateTransition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workItemId = req.params.id;
      const body = req.body;

      // Skip validation if not a readiness update
      if (!body.dimension || !workItemId) {
        next();
        return;
      }

      // Get current work item to check current readiness state
      const summary = await this.readinessService.getReadinessSummary(workItemId);

      if (!summary) {
        res.status(404).json({
          error: 'Not Found',
          message: `Work item ${workItemId} not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate the transition
      const dimension = body.dimension as ReadinessDimensionKey;
      const newValue = body.value as ReadinessDimension;
      const configurationId = body.configurationId as string | undefined;

      if (newValue) {
        // Get validation errors
        const validationErrors = await this.validateTransitionWithConfiguration(
          summary.readiness,
          dimension,
          newValue,
          configurationId
        );

        if (validationErrors.length > 0) {
          res.status(400).json({
            error: 'Bad Request',
            message: `State transition validation failed: ${validationErrors.join(', ')}`,
            details: {
              dimension,
              requestedValue: newValue,
              currentReadiness: summary.readiness.toJSON(),
              validationErrors
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      // Add validation context to request for logging
      (req as any).readinessContext = {
        currentState: summary.readiness[dimension],
        newState: newValue,
        dimension,
        workItemId,
        configurationId
      };

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
   * Middleware to validate bulk operations before processing
   */
  validateBulkOperation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body;

      if (!body.updates || !Array.isArray(body.updates)) {
        next();
        return;
      }

      // Validate each update in the batch
      const validationResults: Array<{
        workItemId: string;
        dimension: ReadinessDimensionKey;
        errors: string[];
      }> = [];

      for (const update of body.updates) {
        if (!update.workItemId || !update.dimension) {
          continue;
        }

        try {
          const summary = await this.readinessService.getReadinessSummary(update.workItemId);

          if (summary && update.value) {
            const errors = await this.validateTransitionWithConfiguration(
              summary.readiness,
              update.dimension,
              update.value,
              update.configurationId || body.configurationId
            );

            if (errors.length > 0) {
              validationResults.push({
                workItemId: update.workItemId,
                dimension: update.dimension,
                errors
              });
            }
          }
        } catch (error) {
          // Individual work item validation failures are collected
          validationResults.push({
            workItemId: update.workItemId,
            dimension: update.dimension,
            errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`]
          });
        }
      }

      // If any validation errors found, return them
      if (validationResults.length > 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Bulk operation validation failed',
          details: {
            failedUpdates: validationResults,
            totalUpdates: body.updates.length,
            failedCount: validationResults.length
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Add bulk validation context to request
      (req as any).bulkReadinessContext = {
        updateCount: body.updates.length,
        configurationId: body.configurationId
      };

      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Bulk validation middleware error',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Middleware to log readiness changes for audit trail
   */
  logReadinessChange = (req: Request, res: Response, next: NextFunction): void => {
    const context = (req as any).readinessContext;

    if (context) {
      console.log('Readiness change request:', {
        workItemId: context.workItemId,
        dimension: context.dimension,
        transition: `${context.currentState} -> ${context.newState}`,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }

    const bulkContext = (req as any).bulkReadinessContext;

    if (bulkContext) {
      console.log('Bulk readiness change request:', {
        updateCount: bulkContext.updateCount,
        configurationId: bulkContext.configurationId,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }

    next();
  };

  /**
   * Middleware to validate percentage-based updates
   */
  validatePercentageUpdate = (req: Request, res: Response, next: NextFunction): void => {
    const body = req.body;

    if (body.percentage !== undefined) {
      // Validate percentage range
      if (typeof body.percentage !== 'number' || body.percentage < 0 || body.percentage > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'percentage must be a number between 0 and 100',
          details: { providedPercentage: body.percentage },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate that percentage aligns with state if both provided
      if (body.value) {
        const isValidCombination = this.validatePercentageStateAlignment(body.percentage, body.value);

        if (!isValidCombination) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'percentage value does not align with state value',
            details: {
              percentage: body.percentage,
              state: body.value,
              expectedRanges: {
                [ReadinessDimension.NOT_STARTED]: '0',
                [ReadinessDimension.IN_PROGRESS]: '1-99',
                [ReadinessDimension.COMPLETE]: '100'
              }
            },
            timestamp: new Date().toISOString()
          });
          return;
        }
      }
    }

    next();
  };

  /**
   * Helper method to validate state transitions with configuration
   */
  private async validateTransitionWithConfiguration(
    currentReadiness: any,
    dimension: ReadinessDimensionKey,
    newValue: ReadinessDimension,
    configurationId?: string
  ): Promise<string[]> {
    try {
      // If configuration is specified, use it for validation
      if (configurationId) {
        const configurations = await this.readinessService.listConfigurations(1, 0);
        const config = configurations.configurations.find(c => c.id === configurationId);

        if (config) {
          const currentStates = {
            requirements: currentReadiness.requirements,
            design: currentReadiness.design,
            frontend: currentReadiness.frontend,
            backend: currentReadiness.backend,
            integration: currentReadiness.integration,
            test: currentReadiness.test,
          };

          return config.validateStateTransition(dimension, newValue, currentStates);
        }
      }

      // Fallback to built-in validation
      return currentReadiness.validateStateTransition(dimension, newValue);
    } catch (error) {
      return [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  }

  /**
   * Helper method to validate percentage and state alignment
   */
  private validatePercentageStateAlignment(percentage: number, state: ReadinessDimension): boolean {
    switch (state) {
      case ReadinessDimension.NOT_STARTED:
        return percentage === 0;
      case ReadinessDimension.IN_PROGRESS:
        return percentage > 0 && percentage < 100;
      case ReadinessDimension.COMPLETE:
        return percentage === 100;
      default:
        return false;
    }
  }
}

/**
 * Factory function to create validation middleware with service injection
 */
export function createReadinessValidationMiddleware(readinessService: ReadinessService): ReadinessValidationMiddleware {
  return new ReadinessValidationMiddleware(readinessService);
}