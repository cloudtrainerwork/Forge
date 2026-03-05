import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';
import { ServiceFactory } from './ServiceFactory.js';
import type { IExportService } from '../adapters/IExportService.js';

describe('ServiceFactory', () => {
  let serviceFactory: ServiceFactory;
  let prismaClient: PrismaClient;
  let neo4jDriver: any;

  beforeEach(() => {
    serviceFactory = new ServiceFactory();

    // Create mock clients that won't actually connect
    prismaClient = {} as PrismaClient;
    neo4jDriver = {
      verifyConnectivity: () => Promise.resolve(),
      close: () => Promise.resolve()
    };

    serviceFactory.configure(prismaClient, neo4jDriver);
  });

  afterEach(() => {
    serviceFactory.reset();
  });

  describe('ExportService resolution', () => {
    it('can resolve ExportService from IoC container', () => {
      // Act: Resolve ExportService through container
      const exportService = serviceFactory.getExportService();

      // Assert: Service should be resolved successfully
      expect(exportService).toBeDefined();
      expect(exportService).toHaveProperty('exportWorkItemToGSD');
      expect(exportService).toHaveProperty('validateExportReadiness');
      expect(exportService).toHaveProperty('getExportMetadata');
    });

    it('returns same instance on multiple calls (singleton)', () => {
      // Act: Get service multiple times
      const service1 = serviceFactory.getExportService();
      const service2 = serviceFactory.getExportService();

      // Assert: Should be same instance
      expect(service1).toBe(service2);
    });

    it('can resolve ExportService via interface binding', () => {
      // Act: Resolve via interface
      const exportService = serviceFactory.getService<IExportService>('IExportService');

      // Assert: Should resolve successfully
      expect(exportService).toBeDefined();
      expect(exportService).toHaveProperty('exportWorkItemToGSD');
    });
  });

  describe('health check includes ExportService', () => {
    it('includes ExportService in health check results', async () => {
      // Act: Run health check
      const healthResult = await serviceFactory.healthCheck();

      // Assert: Should include ExportService
      expect(healthResult).toHaveProperty('exportService');
      expect(healthResult.exportService).toBe(true);
    });
  });
});