import { injectable, inject } from 'inversify';
import { ReadinessState, ReadinessDimension, ReadinessDimensionKey } from '../domain/entities/ReadinessState.js';
import { ReadinessConfiguration } from '../domain/entities/ReadinessConfiguration.js';
import { WorkItem } from '../domain/entities/WorkItem.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { AuditTrailService } from './AuditTrailService.js';
import { ReadinessRepository } from '../infrastructure/postgresql/ReadinessRepository.js';

/**
 * Request interface for updating readiness
 */
export interface UpdateReadinessRequest {
  workItemId: string;
  dimension: ReadinessDimensionKey;
  value?: ReadinessDimension;
  percentage?: number;
  configurationId?: string;
}

/**
 * Request interface for bulk updating readiness
 */
export interface BulkUpdateReadinessRequest {
  updates: UpdateReadinessRequest[];
  configurationId?: string;
}

/**
 * Readiness summary interface
 */
export interface ReadinessSummary {
  workItemId: string;
  title?: string;
  overallCompletion: number;
  readiness: ReadinessState;
  blockers: string[];
  isReady: boolean;
  dimensionSummary: {
    [K in ReadinessDimensionKey]: {
      state: ReadinessDimension;
      percentage: number;
      color?: string;
    };
  };
}

/**
 * Business service for readiness operations with configurable states
 * Implements validation rules, bulk operations, and aggregation
 */
@injectable()
export class ReadinessService {
  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository,
    @inject('AuditTrailService') private auditTrailService: AuditTrailService,
    @inject('ReadinessRepository') private readinessRepository: ReadinessRepository
  ) {}

  /**
   * Update readiness for a single dimension with validation
   */
  async updateReadiness(request: UpdateReadinessRequest): Promise<ReadinessState> {
    const { workItemId, dimension, value, percentage, configurationId } = request;

    try {
      // Get current work item
      const workItem = await this.workItemRepository.findById(workItemId);
      if (!workItem) {
        throw new Error(`Work item ${workItemId} not found`);
      }

      // Get configuration if specified
      let configuration: ReadinessConfiguration | null = null;
      if (configurationId) {
        configuration = await this.getReadinessConfiguration(configurationId);
        if (!configuration) {
          throw new Error(`Readiness configuration ${configurationId} not found`);
        }
      }

      // Determine new state and percentage
      let newState = value;
      let newPercentage = percentage;

      if (value && !percentage && configuration) {
        // Calculate percentage from state using configuration
        const stateConfig = configuration.states.find(s => s.value === value);
        if (stateConfig) {
          newPercentage = stateConfig.maxPercentage;
        }
      } else if (percentage && !value && configuration) {
        // Calculate state from percentage using configuration
        const stateConfig = configuration.getStateForPercentage(percentage);
        if (stateConfig) {
          newState = stateConfig.value as ReadinessDimension;
        }
      } else if (percentage && !value) {
        // Fallback to standard state calculation
        if (percentage === 0) newState = ReadinessDimension.NOT_STARTED;
        else if (percentage === 100) newState = ReadinessDimension.COMPLETE;
        else newState = ReadinessDimension.IN_PROGRESS;
      }

      if (!newState) {
        throw new Error('Unable to determine new readiness state');
      }

      // Validate state transition
      const validationErrors = this.validateStateTransition(
        workItem.readiness,
        dimension,
        newState,
        configuration
      );

      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Update readiness
      const updatedReadiness = workItem.readiness.updateDimension(dimension, newState, newPercentage);
      const updatedWorkItem = new WorkItem(
        workItem.id,
        workItem.spec,
        workItem.title,
        workItem.description,
        updatedReadiness,
        workItem.groupId,
        workItem.sprintId,
        workItem.parentId,
        workItem.deliverableType,
        workItem.createdAt,
        new Date()
      );

      // Save to repository
      await this.workItemRepository.save(updatedWorkItem);

      // Log the change
      await this.auditTrailService.logStateChange(workItemId, 'READINESS_UPDATED', {
        dimension,
        oldValue: workItem.readiness[dimension],
        newValue: newState,
        oldPercentage: workItem.readiness[`${dimension}Percentage` as keyof ReadinessState],
        newPercentage,
        configurationId
      });

      return updatedReadiness;
    } catch (error) {
      throw new Error(`Failed to update readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk update readiness with transaction support
   */
  async bulkUpdateReadiness(request: BulkUpdateReadinessRequest): Promise<ReadinessState[]> {
    const { updates, configurationId } = request;

    if (updates.length === 0) {
      return [];
    }

    try {
      // Get all affected work items
      const workItemIds = [...new Set(updates.map(u => u.workItemId))];
      const workItems = await Promise.all(
        workItemIds.map(id => this.workItemRepository.findById(id))
      );

      // Check all work items exist
      const missingItems = workItems
        .map((item, index) => item ? null : workItemIds[index])
        .filter(Boolean);

      if (missingItems.length > 0) {
        throw new Error(`Work items not found: ${missingItems.join(', ')}`);
      }

      // Get configuration if specified
      let configuration: ReadinessConfiguration | null = null;
      if (configurationId) {
        configuration = await this.getReadinessConfiguration(configurationId);
        if (!configuration) {
          throw new Error(`Readiness configuration ${configurationId} not found`);
        }
      }

      // Validate all updates before applying any
      const validationResults = updates.map(update => {
        const workItem = workItems.find(item => item!.id === update.workItemId)!;
        const errors = this.validateStateTransition(
          workItem.readiness,
          update.dimension,
          update.value || ReadinessDimension.NOT_STARTED,
          configuration
        );
        return { update, errors };
      });

      const allErrors = validationResults
        .filter(result => result.errors.length > 0)
        .map(result => `${result.update.workItemId}:${result.update.dimension} - ${result.errors.join(', ')}`)
        .join('; ');

      if (allErrors) {
        throw new Error(`Bulk validation failed: ${allErrors}`);
      }

      // Apply all updates
      const results: ReadinessState[] = [];
      const auditEntries: Array<{
        workItemId: string;
        changes: any;
      }> = [];

      for (const update of updates) {
        const workItem = workItems.find(item => item!.id === update.workItemId)!;

        // Determine new state and percentage (same logic as updateReadiness)
        let newState = update.value;
        let newPercentage = update.percentage;

        if (update.value && !update.percentage && configuration) {
          const stateConfig = configuration.states.find(s => s.value === update.value);
          if (stateConfig) {
            newPercentage = stateConfig.maxPercentage;
          }
        } else if (update.percentage && !update.value && configuration) {
          const stateConfig = configuration.getStateForPercentage(update.percentage);
          if (stateConfig) {
            newState = stateConfig.value as ReadinessDimension;
          }
        } else if (update.percentage && !update.value) {
          if (update.percentage === 0) newState = ReadinessDimension.NOT_STARTED;
          else if (update.percentage === 100) newState = ReadinessDimension.COMPLETE;
          else newState = ReadinessDimension.IN_PROGRESS;
        }

        if (!newState) {
          throw new Error(`Unable to determine new state for ${update.workItemId}:${update.dimension}`);
        }

        const updatedReadiness = workItem.readiness.updateDimension(
          update.dimension,
          newState,
          newPercentage
        );

        const updatedWorkItem = new WorkItem(
          workItem.id,
          workItem.spec,
          workItem.title,
          workItem.description,
          updatedReadiness,
          workItem.groupId,
          workItem.sprintId,
          workItem.parentId,
          workItem.deliverableType,
          workItem.createdAt,
          new Date()
        );
        await this.workItemRepository.save(updatedWorkItem);

        results.push(updatedReadiness);

        // Prepare audit entry
        auditEntries.push({
          workItemId: update.workItemId,
          changes: {
            dimension: update.dimension,
            oldValue: workItem.readiness[update.dimension],
            newValue: newState,
            oldPercentage: workItem.readiness[`${update.dimension}Percentage` as keyof ReadinessState],
            newPercentage,
            configurationId: update.configurationId || configurationId
          }
        });
      }

      // Log all changes
      for (const entry of auditEntries) {
        await this.auditTrailService.logStateChange(
          entry.workItemId,
          'READINESS_UPDATED',
          entry.changes
        );
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to bulk update readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get readiness summary for a work item with aggregation
   */
  async getReadinessSummary(
    workItemId: string,
    includeChildren: boolean = false,
    configurationId?: string
  ): Promise<ReadinessSummary> {
    try {
      const workItem = await this.workItemRepository.findById(workItemId);
      if (!workItem) {
        throw new Error(`Work item ${workItemId} not found`);
      }

      let aggregatedReadiness = workItem.readiness;

      // Aggregate child readiness if requested
      if (includeChildren) {
        const children = await this.getChildWorkItems(workItemId);
        if (children.length > 0) {
          const childReadinessStates = children.map(child => child.readiness);
          aggregatedReadiness = ReadinessState.aggregateChildReadiness([
            workItem.readiness,
            ...childReadinessStates
          ]);
        }
      }

      // Get configuration for color coding
      let configuration: ReadinessConfiguration | null = null;
      if (configurationId) {
        configuration = await this.getReadinessConfiguration(configurationId);
      }

      // Build dimension summary
      const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
      const dimensionSummary = {} as ReadinessSummary['dimensionSummary'];

      for (const dimension of dimensions) {
        const state = aggregatedReadiness[dimension];
        const percentage = aggregatedReadiness.getDimensionPercentage(dimension);
        const color = configuration?.getColorForValue(state) || undefined;

        dimensionSummary[dimension] = {
          state,
          percentage,
          color
        };
      }

      // Get blockers
      const blockers = this.getBlockersForReadiness(aggregatedReadiness, configuration);

      return {
        workItemId,
        title: workItem.title,
        overallCompletion: aggregatedReadiness.getCompletionPercentage(),
        readiness: aggregatedReadiness,
        blockers,
        isReady: aggregatedReadiness.isComplete(),
        dimensionSummary
      };
    } catch (error) {
      throw new Error(`Failed to get readiness summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate state transition with business rules
   */
  private validateStateTransition(
    currentReadiness: ReadinessState,
    dimension: ReadinessDimensionKey,
    newValue: ReadinessDimension,
    configuration?: ReadinessConfiguration | null
  ): string[] {
    let errors: string[] = [];

    // Use configuration validation if available
    if (configuration) {
      const currentStates = {
        requirements: currentReadiness.requirements,
        design: currentReadiness.design,
        frontend: currentReadiness.frontend,
        backend: currentReadiness.backend,
        integration: currentReadiness.integration,
        test: currentReadiness.test,
      };

      errors = configuration.validateStateTransition(dimension, newValue, currentStates);
    } else {
      // Fallback to built-in validation
      errors = currentReadiness.validateStateTransition(dimension, newValue);
    }

    return errors;
  }

  /**
   * Get blockers for current readiness state
   */
  private getBlockersForReadiness(
    readiness: ReadinessState,
    configuration?: ReadinessConfiguration | null
  ): string[] {
    const blockers: string[] = [];
    const incomplete = readiness.getIncompleteDimensions();

    // Check each incomplete dimension for dependencies
    for (const dimension of incomplete as ReadinessDimensionKey[]) {
      if (configuration) {
        const rules = configuration.validationRules.filter(r => r.dependentDimension === dimension);
        for (const rule of rules) {
          const unmetRequirements = rule.requiredDimensions.filter(
            req => readiness[req] !== ReadinessDimension.COMPLETE
          );
          if (unmetRequirements.length > 0) {
            blockers.push(`${dimension}: requires ${unmetRequirements.join(', ')} to be complete`);
          }
        }
      } else {
        // Built-in blocker logic
        if (dimension === 'backend' && readiness.design !== ReadinessDimension.COMPLETE) {
          blockers.push('Backend: requires Design to be complete');
        }
        if (dimension === 'integration' && (
          readiness.frontend !== ReadinessDimension.COMPLETE ||
          readiness.backend !== ReadinessDimension.COMPLETE
        )) {
          blockers.push('Integration: requires Frontend and Backend to be complete');
        }
        if (dimension === 'test' && readiness.integration !== ReadinessDimension.COMPLETE) {
          blockers.push('Test: requires Integration to be complete');
        }
      }
    }

    return blockers;
  }

  /**
   * Get child work items for aggregation
   */
  private async getChildWorkItems(workItemId: string): Promise<Array<{ readiness: ReadinessState }>> {
    // This would integrate with the graph repository to find child nodes
    // For now, return empty array as child aggregation is not required for Phase 3
    return [];
  }

  /**
   * Get readiness configuration by ID
   */
  private async getReadinessConfiguration(configurationId: string): Promise<ReadinessConfiguration | null> {
    try {
      return await this.readinessRepository.getConfiguration(configurationId);
    } catch (error) {
      throw new Error(`Failed to get readiness configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new readiness configuration
   */
  async createConfiguration(configuration: ReadinessConfiguration, tenantId?: string): Promise<ReadinessConfiguration> {
    try {
      // Validate configuration
      const validationErrors = configuration.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const saved = await this.readinessRepository.createConfiguration(configuration, tenantId);

      // Log creation
      await this.auditTrailService.logStateChange(
        configuration.id,
        'READINESS_CONFIG_CREATED',
        { name: configuration.name, description: configuration.description }
      );

      return saved;
    } catch (error) {
      throw new Error(`Failed to create configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing readiness configuration
   */
  async updateConfiguration(configuration: ReadinessConfiguration): Promise<ReadinessConfiguration> {
    try {
      // Validate configuration
      const validationErrors = configuration.validate();
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      const updated = await this.readinessRepository.updateConfiguration(configuration);

      // Log update
      await this.auditTrailService.logStateChange(
        configuration.id,
        'READINESS_CONFIG_UPDATED',
        { name: configuration.name, description: configuration.description }
      );

      return updated;
    } catch (error) {
      throw new Error(`Failed to update configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List readiness configurations
   */
  async listConfigurations(limit: number = 50, offset: number = 0): Promise<{
    configurations: ReadinessConfiguration[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      return await this.readinessRepository.listConfigurations(limit, offset);
    } catch (error) {
      throw new Error(`Failed to list configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get readiness aggregation data
   */
  async getReadinessAggregation(configurationId?: string): Promise<{
    totalItems: number;
    completionDistribution: {
      notStarted: number;
      inProgress: number;
      complete: number;
    };
    dimensionAverages: {
      [K in ReadinessDimensionKey]: number;
    };
  }> {
    try {
      return await this.readinessRepository.getReadinessAggregation(configurationId);
    } catch (error) {
      throw new Error(`Failed to get readiness aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}