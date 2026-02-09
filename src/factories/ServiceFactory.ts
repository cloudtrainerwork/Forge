import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { Driver } from 'neo4j-driver';
import { WorkItemRepository } from '../infrastructure/postgresql/WorkItemRepository.js';
import { ReadinessRepository } from '../infrastructure/postgresql/ReadinessRepository.js';
import { GraphRepository } from '../infrastructure/neo4j/GraphRepository.js';
import { WorkItemService } from '../services/WorkItemService.js';
import { ReadinessService } from '../services/ReadinessService.js';
import { AuditTrailService } from '../services/AuditTrailService.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { IGraphRepository } from '../adapters/IGraphRepository.js';

/**
 * IoC container configuration using inversify
 * Configures dependency injection per research recommendations
 * Manages singleton lifecycle for database connections and service instances
 */
export class ServiceFactory {
  private container: Container;
  private isConfigured = false;

  constructor() {
    this.container = new Container();
  }

  /**
   * Configure the IoC container with all dependencies
   */
  configure(prismaClient: PrismaClient, neo4jDriver: Driver): void {
    if (this.isConfigured) {
      throw new Error('Container is already configured');
    }

    // Bind database clients as singletons
    this.container.bind<PrismaClient>('PrismaClient').toConstantValue(prismaClient);
    this.container.bind<Driver>('Neo4jDriver').toConstantValue(neo4jDriver);

    // Bind repository interfaces to implementations as singletons
    this.container.bind<IWorkItemRepository>('IWorkItemRepository')
      .toDynamicValue((context) => {
        const prisma = context.container.get<PrismaClient>('PrismaClient');
        return new WorkItemRepository(prisma);
      })
      .inSingletonScope();

    this.container.bind<ReadinessRepository>('ReadinessRepository')
      .toDynamicValue((context) => {
        const prisma = context.container.get<PrismaClient>('PrismaClient');
        return new ReadinessRepository(prisma);
      })
      .inSingletonScope();

    this.container.bind<IGraphRepository>('IGraphRepository')
      .toDynamicValue((context) => {
        const driver = context.container.get<Driver>('Neo4jDriver');
        return new GraphRepository(driver);
      })
      .inSingletonScope();

    // Bind services with their dependencies
    this.container.bind<AuditTrailService>('AuditTrailService')
      .to(AuditTrailService)
      .inSingletonScope();

    this.container.bind<WorkItemService>('WorkItemService')
      .to(WorkItemService)
      .inSingletonScope();

    this.container.bind<ReadinessService>('ReadinessService')
      .to(ReadinessService)
      .inSingletonScope();

    this.isConfigured = true;
  }

  /**
   * Get service instance from container
   */
  getService<T>(identifier: string | symbol): T {
    if (!this.isConfigured) {
      throw new Error('Container must be configured before getting services');
    }

    try {
      return this.container.get<T>(identifier);
    } catch (error) {
      throw new Error(`Failed to resolve service '${String(identifier)}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the container instance for advanced scenarios
   */
  getContainer(): Container {
    if (!this.isConfigured) {
      throw new Error('Container must be configured before accessing');
    }

    return this.container;
  }

  /**
   * Check if container is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Unbind all services and reset container (for testing)
   */
  reset(): void {
    this.container.unbindAll();
    this.isConfigured = false;
  }

  /**
   * Get ReadinessService instance
   */
  getReadinessService(): ReadinessService {
    return this.getService<ReadinessService>('ReadinessService');
  }

  /**
   * Health check - verify all critical services can be resolved
   */
  async healthCheck(): Promise<{
    container: boolean;
    workItemRepository: boolean;
    graphRepository: boolean;
    readinessRepository: boolean;
    workItemService: boolean;
    readinessService: boolean;
    auditTrailService: boolean;
    overall: boolean;
  }> {
    const result = {
      container: false,
      workItemRepository: false,
      graphRepository: false,
      readinessRepository: false,
      workItemService: false,
      readinessService: false,
      auditTrailService: false,
      overall: false
    };

    try {
      if (!this.isConfigured) {
        return result;
      }

      result.container = true;

      // Test repository resolution and health
      const workItemRepo = this.getService<IWorkItemRepository>('IWorkItemRepository');
      result.workItemRepository = await workItemRepo.healthCheck();

      const graphRepo = this.getService<IGraphRepository>('IGraphRepository');
      result.graphRepository = await graphRepo.healthCheck();

      const readinessRepo = this.getService<ReadinessRepository>('ReadinessRepository');
      result.readinessRepository = await readinessRepo.healthCheck();

      // Test service resolution
      const workItemService = this.getService<WorkItemService>('WorkItemService');
      const serviceHealth = await workItemService.healthCheck();
      result.workItemService = serviceHealth.overall;

      const readinessService = this.getService<ReadinessService>('ReadinessService');
      result.readinessService = true; // ReadinessService doesn't have healthCheck method

      const auditService = this.getService<AuditTrailService>('AuditTrailService');
      result.auditTrailService = await auditService.healthCheck();

      result.overall = result.container &&
                      result.workItemRepository &&
                      result.graphRepository &&
                      result.readinessRepository &&
                      result.workItemService &&
                      result.readinessService &&
                      result.auditTrailService;

    } catch (error) {
      console.error('ServiceFactory health check failed:', error);
    }

    return result;
  }
}

/**
 * Global service factory instance
 */
let serviceFactoryInstance: ServiceFactory | null = null;

/**
 * Create or get the global service factory instance
 */
export function createServiceFactory(): ServiceFactory {
  if (!serviceFactoryInstance) {
    serviceFactoryInstance = new ServiceFactory();
  }
  return serviceFactoryInstance;
}

/**
 * Get the configured service factory instance
 */
export function getServiceFactory(): ServiceFactory {
  if (!serviceFactoryInstance) {
    throw new Error('Service factory not created. Call createServiceFactory() first.');
  }
  return serviceFactoryInstance;
}

/**
 * Reset the global service factory (for testing)
 */
export function resetServiceFactory(): void {
  if (serviceFactoryInstance) {
    serviceFactoryInstance.reset();
  }
  serviceFactoryInstance = null;
}

/**
 * Export the container for direct access when needed
 */
export const container = () => getServiceFactory().getContainer();