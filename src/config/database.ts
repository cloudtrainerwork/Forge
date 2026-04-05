import * as neo4j from 'neo4j-driver';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { databaseConfig, appConfig } from './environment';

/**
 * Neo4j Connection Factory
 * Manages Neo4j driver lifecycle with proper error handling and singleton pattern
 */
export class Neo4jConnectionFactory {
  private static driver: neo4j.Driver | null = null;
  private static isConnected = false;

  /**
   * Creates and returns a singleton Neo4j driver instance
   * Includes connection verification and proper authentication
   */
  static async createDriver(): Promise<neo4j.Driver> {
    if (!this.driver) {
      try {
        this.driver = neo4j.driver(
          databaseConfig.neo4j.uri,
          neo4j.auth.basic(
            databaseConfig.neo4j.user,
            databaseConfig.neo4j.password
          ),
          {
            // Production-grade connection configuration
            maxConnectionLifetime: 3600000, // 1 hour
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 60000, // 1 minute
            disableLosslessIntegers: true
          }
        );

        // Verify connectivity on creation
        await this.verifyConnectivity();
        this.isConnected = true;

        if (appConfig.isDevelopment) {
          console.log('✅ Neo4j driver created and verified');
        }
      } catch (error) {
        this.driver = null;
        throw new Error(`Failed to create Neo4j driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.driver;
  }

  /**
   * Creates a new Neo4j session with proper configuration
   */
  static async createSession(mode: neo4j.SessionMode = neo4j.session.READ): Promise<neo4j.Session> {
    const driver = await this.createDriver();
    return driver.session({
      defaultAccessMode: mode,
      database: 'neo4j' // Using default database
    });
  }

  /**
   * Verifies Neo4j connectivity by getting server info
   */
  private static async verifyConnectivity(): Promise<void> {
    if (!this.driver) {
      throw new Error('Driver not initialized');
    }

    try {
      await this.driver.getServerInfo();
    } catch (error) {
      throw new Error(`Neo4j connection verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gracefully closes the Neo4j driver
   */
  static async closeDriver(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
        this.driver = null;
        this.isConnected = false;

        if (appConfig.isDevelopment) {
          console.log('✅ Neo4j driver closed gracefully');
        }
      } catch (error) {
        console.error('Error closing Neo4j driver:', error);
      }
    }
  }

  /**
   * Checks if the driver is connected and healthy
   */
  static get connected(): boolean {
    return this.isConnected && this.driver !== null;
  }
}

/**
 * PostgreSQL Connection Factory (via Prisma)
 * Manages Prisma client lifecycle with connection pooling
 */
export class PrismaConnectionFactory {
  private static client: PrismaClient | null = null;
  private static pool: Pool | null = null;
  private static isConnected = false;

  /**
   * Creates and returns a singleton Prisma client instance
   * Uses PostgreSQL adapter for enhanced performance and connection pooling
   */
  static async createClient(): Promise<PrismaClient> {
    if (!this.client) {
      try {
        // Create PostgreSQL connection pool
        this.pool = new Pool({
          connectionString: databaseConfig.postgres.url,
          ssl: appConfig.isProduction ? { rejectUnauthorized: false } : false,
          max: 20, // Maximum connections in pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });

        // Create Prisma client with standard connection (uses DATABASE_URL from env)
        this.client = new PrismaClient({
          log: appConfig.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error']
        });

        // Verify connectivity
        await this.verifyConnectivity();
        this.isConnected = true;

        if (appConfig.isDevelopment) {
          console.log('✅ Prisma client created and verified');
        }
      } catch (error) {
        this.client = null;
        this.pool = null;
        throw new Error(`Failed to create Prisma client: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.client;
  }

  /**
   * Verifies PostgreSQL connectivity by executing a simple query
   */
  private static async verifyConnectivity(): Promise<void> {
    if (!this.client) {
      throw new Error('Prisma client not initialized');
    }

    try {
      await this.client.$queryRaw`SELECT 1 as connected`;
    } catch (error) {
      throw new Error(`PostgreSQL connection verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gracefully closes the Prisma client and connection pool
   */
  static async closeClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.$disconnect();
        this.client = null;
        this.isConnected = false;

        if (this.pool) {
          await this.pool.end();
          this.pool = null;
        }

        if (appConfig.isDevelopment) {
          console.log('✅ Prisma client closed gracefully');
        }
      } catch (error) {
        console.error('Error closing Prisma client:', error);
      }
    }
  }

  /**
   * Checks if the client is connected and healthy
   */
  static get connected(): boolean {
    return this.isConnected && this.client !== null;
  }
}

/**
 * Database health check utility
 * Verifies connectivity to both Neo4j and PostgreSQL
 */
export class DatabaseHealthCheck {
  /**
   * Performs health check on both databases
   */
  static async checkHealth(): Promise<{ neo4j: boolean; postgres: boolean; overall: boolean }> {
    const results = {
      neo4j: false,
      postgres: false,
      overall: false
    };

    // Check Neo4j
    try {
      await Neo4jConnectionFactory.createDriver();
      const session = await Neo4jConnectionFactory.createSession();
      await session.run('RETURN 1 as test');
      await session.close();
      results.neo4j = true;
    } catch (error) {
      console.error('Neo4j health check failed:', error);
    }

    // Check PostgreSQL
    try {
      const client = await PrismaConnectionFactory.createClient();
      await client.$queryRaw`SELECT 1 as test`;
      results.postgres = true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    results.overall = results.neo4j && results.postgres;
    return results;
  }
}

/**
 * Graceful shutdown handler for all database connections
 * Should be called when the application is shutting down
 */
export async function gracefulDatabaseShutdown(): Promise<void> {
  console.log('🔄 Gracefully shutting down database connections...');

  await Promise.allSettled([
    Neo4jConnectionFactory.closeDriver(),
    PrismaConnectionFactory.closeClient()
  ]);

  console.log('✅ Database connections closed');
}

// Setup graceful shutdown handlers for process signals
if (!appConfig.isTest) {
  process.on('SIGTERM', gracefulDatabaseShutdown);
  process.on('SIGINT', gracefulDatabaseShutdown);
  process.on('beforeExit', gracefulDatabaseShutdown);
}