import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import neo4j, { Driver } from 'neo4j-driver';
import { createServiceFactory } from './factories/ServiceFactory.js';
import { startServer } from './api/server.js';
import { DataSynchronizationObserver } from './observers/DataSynchronizationObserver.js';
import type { IWorkItemRepository } from './adapters/IWorkItemRepository.js';
import type { IGraphRepository } from './adapters/IGraphRepository.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for FORGE Backend API
 * Initializes IoC container, starts database connections, and starts server
 * Includes graceful shutdown handling for database connections
 */
async function main(): Promise<void> {
  let prismaClient: PrismaClient | null = null;
  let neo4jDriver: Driver | null = null;
  let dataObserver: DataSynchronizationObserver | null = null;
  let server: any = null;

  try {
    console.log('🚀 Starting FORGE Backend API...');

    // Validate required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEO4J_URI',
      'NEO4J_USER',
      'NEO4J_PASSWORD'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Initialize PostgreSQL client
    console.log('📊 Connecting to PostgreSQL...');
    prismaClient = new PrismaClient({
      log: ['error'],
      errorFormat: 'minimal'
    });

    // Test PostgreSQL connection
    await prismaClient.$connect();
    console.log('✅ PostgreSQL connected successfully');

    // Initialize Neo4j driver
    console.log('📈 Connecting to Neo4j...');
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
        connectionTimeout: 60000,
        maxTransactionRetryTime: 15000,
      }
    );

    // Test Neo4j connection (retry — container may still be starting)
    const NEO4J_MAX_RETRIES = 10;
    const NEO4J_RETRY_DELAY_MS = 3000;
    for (let attempt = 1; attempt <= NEO4J_MAX_RETRIES; attempt++) {
      try {
        await neo4jDriver.verifyConnectivity();
        console.log('✅ Neo4j connected successfully');
        break;
      } catch (err) {
        if (attempt === NEO4J_MAX_RETRIES) throw err;
        console.log(`⏳ Neo4j not ready (attempt ${attempt}/${NEO4J_MAX_RETRIES}), retrying in ${NEO4J_RETRY_DELAY_MS / 1000}s...`);
        await new Promise(r => setTimeout(r, NEO4J_RETRY_DELAY_MS));
      }
    }

    // Configure IoC container
    console.log('🔧 Configuring dependency injection container...');
    const serviceFactory = createServiceFactory();
    serviceFactory.configure(prismaClient, neo4jDriver);

    // Perform service health check
    const healthCheck = await serviceFactory.healthCheck();
    if (!healthCheck.overall) {
      console.error('❌ Service health check failed:', healthCheck);
      throw new Error('Service initialization failed - health check failure');
    }
    console.log('✅ All services healthy');

    // Initialize data synchronization observer
    console.log('🔄 Starting data synchronization observer...');
    const workItemRepo = serviceFactory.getService<IWorkItemRepository>('IWorkItemRepository');
    const graphRepo = serviceFactory.getService<IGraphRepository>('IGraphRepository');

    dataObserver = new DataSynchronizationObserver(workItemRepo, graphRepo, {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    });

    // Test synchronization system
    const syncHealth = await dataObserver.healthCheck();
    if (!syncHealth.overall) {
      console.error('❌ Data synchronization health check failed:', syncHealth);
      throw new Error('Data synchronization initialization failed');
    }
    console.log('✅ Data synchronization ready');

    // Start HTTP server
    console.log('🌐 Starting HTTP server...');
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || 'localhost';

    const serverResult = await startServer(serviceFactory, port, host);
    server = serverResult.server;

    console.log('🎉 FORGE Backend API started successfully!');
    console.log(`📡 Server: http://${host}:${port}`);
    console.log(`💚 Health: http://${host}:${port}/health`);
    console.log(`📋 API: http://${host}:${port}/api/v1/work-items`);

  } catch (error) {
    console.error('💥 Failed to start FORGE Backend API:', error);

    // Cleanup on startup failure
    await cleanup();
    process.exit(1);
  }

  /**
   * Graceful shutdown function
   */
  async function cleanup(): Promise<void> {
    console.log('\n🛑 Shutting down FORGE Backend API...');

    try {
      // Stop accepting new connections
      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => {
            console.log('✅ HTTP server closed');
            resolve();
          });
        });
      }

      // Shutdown data synchronization observer
      if (dataObserver) {
        await dataObserver.shutdown();
        console.log('✅ Data synchronization observer shutdown');
      }

      // Close database connections
      if (prismaClient) {
        await prismaClient.$disconnect();
        console.log('✅ PostgreSQL disconnected');
      }

      if (neo4jDriver) {
        await neo4jDriver.close();
        console.log('✅ Neo4j disconnected');
      }

      console.log('🏁 Shutdown complete');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  // Setup graceful shutdown handlers
  process.on('SIGTERM', async () => {
    console.log('\n📡 SIGTERM received');
    await cleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n📡 SIGINT received');
    await cleanup();
    process.exit(0);
  });

  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error);
    await cleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    await cleanup();
    process.exit(1);
  });
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Application startup failed:', error);
    process.exit(1);
  });
}

export { main };