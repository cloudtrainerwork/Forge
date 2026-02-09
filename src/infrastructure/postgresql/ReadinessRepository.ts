import { injectable, inject } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { ReadinessConfiguration, StateConfiguration, ValidationRule } from '../../domain/entities/ReadinessConfiguration.js';
import { ReadinessDimensionKey } from '../../domain/entities/ReadinessState.js';
import type { IWorkItemRepository } from '../../adapters/IWorkItemRepository.js';

/**
 * Filter options for readiness queries
 */
export interface ReadinessFilterOptions {
  dimensions?: {
    [K in ReadinessDimensionKey]?: string | number;
  };
  completionMin?: number;
  completionMax?: number;
  configurationId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Repository for readiness configuration and bulk operations
 * Provides atomic updates and efficient querying
 */
@injectable()
export class ReadinessRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  /**
   * Create a new readiness configuration
   */
  async createConfiguration(configuration: ReadinessConfiguration): Promise<ReadinessConfiguration> {
    try {
      const data = {
        id: configuration.id,
        name: configuration.name,
        description: configuration.description,
        states: configuration.states.map(state => ({
          name: state.name,
          value: state.value,
          minPercentage: state.minPercentage,
          maxPercentage: state.maxPercentage,
          color: state.color,
          description: state.description,
        })),
        validationRules: configuration.validationRules.map(rule => ({
          name: rule.name,
          description: rule.description,
          dependentDimension: rule.dependentDimension,
          requiredDimensions: rule.requiredDimensions,
          requiredState: rule.requiredState,
          errorMessage: rule.errorMessage,
        })),
      };

      const saved = await this.prisma.readinessConfiguration.create({
        data: data as any
      });

      return this.mapToConfiguration(saved);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error(`Configuration name '${configuration.name}' already exists`);
      }
      throw new Error(`Failed to create readiness configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get readiness configuration by ID
   */
  async getConfiguration(id: string): Promise<ReadinessConfiguration | null> {
    try {
      const config = await this.prisma.readinessConfiguration.findUnique({
        where: { id }
      });

      return config ? this.mapToConfiguration(config) : null;
    } catch (error) {
      throw new Error(`Failed to get readiness configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing readiness configuration
   */
  async updateConfiguration(configuration: ReadinessConfiguration): Promise<ReadinessConfiguration> {
    try {
      const data = {
        name: configuration.name,
        description: configuration.description,
        states: configuration.states.map(state => ({
          name: state.name,
          value: state.value,
          minPercentage: state.minPercentage,
          maxPercentage: state.maxPercentage,
          color: state.color,
          description: state.description,
        })),
        validationRules: configuration.validationRules.map(rule => ({
          name: rule.name,
          description: rule.description,
          dependentDimension: rule.dependentDimension,
          requiredDimensions: rule.requiredDimensions,
          requiredState: rule.requiredState,
          errorMessage: rule.errorMessage,
        })),
        updatedAt: new Date(),
      };

      const updated = await this.prisma.readinessConfiguration.update({
        where: { id: configuration.id },
        data: data as any
      });

      return this.mapToConfiguration(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new Error(`Configuration ${configuration.id} not found`);
      }
      throw new Error(`Failed to update readiness configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all readiness configurations
   */
  async listConfigurations(limit: number = 50, offset: number = 0): Promise<{
    configurations: ReadinessConfiguration[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [configurations, total] = await Promise.all([
        this.prisma.readinessConfiguration.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.readinessConfiguration.count()
      ]);

      return {
        configurations: configurations.map(config => this.mapToConfiguration(config)),
        total,
        hasMore: offset + configurations.length < total
      };
    } catch (error) {
      throw new Error(`Failed to list readiness configurations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete readiness configuration
   */
  async deleteConfiguration(id: string): Promise<void> {
    try {
      // First, unlink any work items using this configuration
      await this.prisma.workItem.updateMany({
        where: { readinessConfigurationId: id },
        data: { readinessConfigurationId: null }
      });

      // Then delete the configuration
      await this.prisma.readinessConfiguration.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        throw new Error(`Configuration ${id} not found`);
      }
      throw new Error(`Failed to delete readiness configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Atomic bulk update with transaction support
   */
  async bulkUpdateReadiness(updates: Array<{
    workItemId: string;
    readinessData: any;
  }>): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        let updateCount = 0;

        for (const update of updates) {
          await tx.workItem.update({
            where: { id: update.workItemId },
            data: { readiness: update.readinessData }
          });
          updateCount++;
        }

        return updateCount;
      });
    } catch (error) {
      throw new Error(`Failed to bulk update readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query work items by readiness criteria
   */
  async findByReadinessCriteria(options: ReadinessFilterOptions): Promise<Array<{
    id: string;
    title?: string;
    readiness: any;
  }>> {
    try {
      const {
        dimensions,
        completionMin,
        completionMax,
        configurationId,
        limit = 50,
        offset = 0
      } = options;

      let whereClause: any = {};

      // Filter by configuration if specified
      if (configurationId) {
        whereClause.readinessConfigurationId = configurationId;
      }

      // Build JSON filters for dimensions
      if (dimensions) {
        const jsonFilters: any[] = [];

        for (const [dimension, value] of Object.entries(dimensions)) {
          if (typeof value === 'string') {
            // Filter by state
            jsonFilters.push({
              readiness: {
                path: [dimension],
                equals: value
              }
            });
          } else if (typeof value === 'number') {
            // Filter by percentage
            jsonFilters.push({
              readiness: {
                path: [`${dimension}Percentage`],
                gte: value
              }
            });
          }
        }

        if (jsonFilters.length > 0) {
          whereClause.AND = jsonFilters;
        }
      }

      const workItems = await this.prisma.workItem.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          readiness: true,
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' }
      });

      // Post-process for completion percentage filtering
      let filteredItems = workItems;

      if (completionMin !== undefined || completionMax !== undefined) {
        filteredItems = workItems.filter(item => {
          // Calculate completion percentage from readiness JSON
          const readiness = item.readiness as any;
          const dimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
          const completed = dimensions.filter(dim => readiness[dim] === 'COMPLETE').length;
          const completionPercentage = Math.round((completed / dimensions.length) * 100);

          if (completionMin !== undefined && completionPercentage < completionMin) {
            return false;
          }
          if (completionMax !== undefined && completionPercentage > completionMax) {
            return false;
          }
          return true;
        });
      }

      return filteredItems;
    } catch (error) {
      throw new Error(`Failed to query by readiness criteria: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      let whereClause: any = {};
      if (configurationId) {
        whereClause.readinessConfigurationId = configurationId;
      }

      const workItems = await this.prisma.workItem.findMany({
        where: whereClause,
        select: {
          readiness: true,
        }
      });

      const totalItems = workItems.length;
      if (totalItems === 0) {
        return {
          totalItems: 0,
          completionDistribution: { notStarted: 0, inProgress: 0, complete: 0 },
          dimensionAverages: {
            requirements: 0,
            design: 0,
            frontend: 0,
            backend: 0,
            integration: 0,
            test: 0
          }
        };
      }

      // Calculate completion distribution
      const completionCounts = { notStarted: 0, inProgress: 0, complete: 0 };
      const dimensionTotals = {
        requirements: 0,
        design: 0,
        frontend: 0,
        backend: 0,
        integration: 0,
        test: 0
      };

      for (const item of workItems) {
        const readiness = item.readiness as any;
        const dimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'] as ReadinessDimensionKey[];

        let completedDimensions = 0;
        for (const dimension of dimensions) {
          const state = readiness[dimension];
          if (state === 'COMPLETE') {
            completedDimensions++;
            dimensionTotals[dimension] += 100;
          } else if (state === 'IN_PROGRESS') {
            const percentage = readiness[`${dimension}Percentage`] || 50;
            dimensionTotals[dimension] += percentage;
          }
          // NOT_STARTED adds 0 (default)
        }

        if (completedDimensions === 0) {
          completionCounts.notStarted++;
        } else if (completedDimensions === dimensions.length) {
          completionCounts.complete++;
        } else {
          completionCounts.inProgress++;
        }
      }

      // Calculate averages
      const dimensionAverages = {
        requirements: Math.round(dimensionTotals.requirements / totalItems),
        design: Math.round(dimensionTotals.design / totalItems),
        frontend: Math.round(dimensionTotals.frontend / totalItems),
        backend: Math.round(dimensionTotals.backend / totalItems),
        integration: Math.round(dimensionTotals.integration / totalItems),
        test: Math.round(dimensionTotals.test / totalItems)
      };

      return {
        totalItems,
        completionDistribution: completionCounts,
        dimensionAverages
      };
    } catch (error) {
      throw new Error(`Failed to get readiness aggregation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for repository
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.readinessConfiguration.count();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToConfiguration(record: any): ReadinessConfiguration {
    const states = record.states.map((s: any) => new StateConfiguration(
      s.name,
      s.value,
      s.minPercentage,
      s.maxPercentage,
      s.color,
      s.description
    ));

    const validationRules = record.validationRules.map((r: any) => new ValidationRule(
      r.name,
      r.description,
      r.dependentDimension,
      r.requiredDimensions,
      r.requiredState,
      r.errorMessage
    ));

    const config = new ReadinessConfiguration(
      record.id,
      record.name,
      states,
      validationRules,
      record.description
    );

    config.createdAt = record.createdAt;
    config.updatedAt = record.updatedAt;

    return config;
  }
}