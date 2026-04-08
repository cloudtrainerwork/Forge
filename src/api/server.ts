import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { workItemRoutes } from './routes/workItems.js';
import { readinessRoutes } from './routes/readiness.js';
import exportsRoutes from './routes/exports.js';
import groupingRoutes from './routes/grouping.js';
import sprintsRoutes from './routes/sprints.js';
import specificationsRoutes from './routes/specifications.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import adminRoutes from './routes/admin.js';
import dependencyRoutes from './routes/dependencies.js';
import releaseRoutes from './routes/releases.js';
import { ServiceFactory } from '../factories/ServiceFactory.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';

/**
 * Express server with middleware for JSON parsing, CORS, and error handling
 * Integrates with IoC container for dependency injection into routes
 */
export class ApiServer {
  private app: Express;
  private serviceFactory: ServiceFactory;

  constructor(serviceFactory: ServiceFactory) {
    this.app = express();
    this.serviceFactory = serviceFactory;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware for security, logging, and parsing
   */
  private setupMiddleware(): void {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Request logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  /**
   * Setup API routes with dependency injection
   *
   * Route structure:
   *   /health                        — public health check
   *   /api/v1/auth/*                 — public auth routes (no JWT needed)
   *   /api/v1/t/:tenantSlug/*        — tenant-scoped, protected routes
   */
  private setupRoutes(): void {
    // Health check endpoint (public)
    this.app.get('/health', this.healthCheck.bind(this));

    // ── Public auth routes (no JWT required) ──────────────────────────────
    this.app.use('/api/v1/auth', authRoutes(this.serviceFactory));

    // ── Auth middleware setup ──────────────────────────────────────────────
    const authMiddleware = createAuthMiddleware(this.serviceFactory);
    const prisma = this.serviceFactory.getService<PrismaClient>('PrismaClient');

    // ── Tenant-scoped protected routes ────────────────────────────────────
    const tenantRouter = express.Router({ mergeParams: true });

    // Work item routes with service injection
    tenantRouter.use('/work-items', workItemRoutes(this.serviceFactory));

    // Readiness routes with service injection
    tenantRouter.use('/readiness', readinessRoutes(this.serviceFactory));

    // Mount readiness routes directly for convenience
    tenantRouter.use('/', readinessRoutes(this.serviceFactory));

    // Exports routes with service injection
    tenantRouter.use('/exports', exportsRoutes(this.serviceFactory));

    // Grouping routes
    tenantRouter.use('/', groupingRoutes);

    // Sprint routes
    tenantRouter.use('/', sprintsRoutes);

    // Specifications routes with service injection
    tenantRouter.use('/specifications', specificationsRoutes(this.serviceFactory));

    // Dependency routes (graph edges)
    tenantRouter.use('/dependencies', dependencyRoutes(this.serviceFactory));

    // Project routes
    tenantRouter.use('/projects', projectRoutes(this.serviceFactory));

    // Release routes (nested under projects)
    tenantRouter.use('/projects/:projectId/releases', releaseRoutes(this.serviceFactory));

    // Admin routes (tenant management)
    tenantRouter.use('/admin', adminRoutes(this.serviceFactory));

    // Mount tenant-scoped router with auth chain:
    //   extractToken → requireAuth → requireTenant (sets RLS) → routes
    this.app.use(
      '/api/v1/t/:tenantSlug',
      ...authMiddleware.requireAuthentication,
      authMiddleware.createTenantResolver(prisma),
      tenantRouter,
    );

    // ── Legacy unscoped routes (backward-compat, still require auth) ──────
    // These use JWT tenant context instead of URL slug
    const legacyRouter = express.Router();
    legacyRouter.use('/work-items', workItemRoutes(this.serviceFactory));
    legacyRouter.use('/readiness', readinessRoutes(this.serviceFactory));
    legacyRouter.use('/', readinessRoutes(this.serviceFactory));
    legacyRouter.use('/exports', exportsRoutes(this.serviceFactory));
    legacyRouter.use('/', groupingRoutes);
    legacyRouter.use('/', sprintsRoutes);
    legacyRouter.use('/specifications', specificationsRoutes(this.serviceFactory));
    legacyRouter.use('/dependencies', dependencyRoutes(this.serviceFactory));
    legacyRouter.use('/projects/:projectId/releases', releaseRoutes(this.serviceFactory));
    legacyRouter.use('/projects', projectRoutes(this.serviceFactory));
    legacyRouter.use('/admin', adminRoutes(this.serviceFactory));

    this.app.use(
      '/api/v1',
      ...authMiddleware.requireAuthentication,
      authMiddleware.createTenantResolver(prisma),
      authMiddleware.authErrorHandler,
      legacyRouter,
    );

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'FORGE Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          auth: '/api/v1/auth',
          tenantScoped: '/api/v1/t/{slug}/',
          workItems: '/api/v1/t/{slug}/work-items',
          readiness: '/api/v1/t/{slug}/readiness',
          exports: '/api/v1/t/{slug}/exports',
          groups: '/api/v1/t/{slug}/groups',
          sprints: '/api/v1/t/{slug}/sprints',
          specifications: '/api/v1/t/{slug}/specifications',
          dependencies: '/api/v1/t/{slug}/dependencies',
          projects: '/api/v1/t/{slug}/projects',
          admin: '/api/v1/t/{slug}/admin',
        },
      });
    });

    // Catch-all for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Setup global error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Global error handler:', err);

      // Validation errors (400)
      if (err.name === 'ValidationError' || err.message?.includes('validation')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: err.message || 'Validation failed',
          timestamp: new Date().toISOString(),
          details: err.details || null
        });
      }

      // Business logic errors (400)
      if (err.message?.includes('Business rule') || err.message?.includes('Invalid')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: err.message,
          timestamp: new Date().toISOString()
        });
      }

      // Not found errors (404)
      if (err.message?.includes('not found') || err.message?.includes('Not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: err.message,
          timestamp: new Date().toISOString()
        });
      }

      // Database connection errors (503)
      if (err.message?.includes('connection') || err.message?.includes('database')) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Database connection error',
          timestamp: new Date().toISOString()
        });
      }

      // Default to internal server error (500)
      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
      });
    });
  }

  /**
   * Health check endpoint with service factory status
   */
  private async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const health = await this.serviceFactory.healthCheck();
      const status = health.overall ? 200 : 503;

      res.status(status).json({
        status: health.overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: health,
        version: '1.0.0'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '1.0.0'
      });
    }
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * Start the server on specified port
 */
export async function startServer(
  serviceFactory: ServiceFactory,
  port: number = parseInt(process.env.PORT || '3001'),
  host: string = process.env.HOST || 'localhost'
): Promise<{ server: any; app: Express }> {
  try {
    // Verify service factory is configured
    if (!serviceFactory.isReady()) {
      throw new Error('Service factory must be configured before starting server');
    }

    // Create server instance
    const apiServer = new ApiServer(serviceFactory);
    const app = apiServer.getApp();

    // Start listening
    const server = app.listen(port, host, () => {
      console.log(`🚀 FORGE Backend API running at http://${host}:${port}`);
      console.log(`📊 Health check: http://${host}:${port}/health`);
      console.log(`📝 Work Items API: http://${host}:${port}/api/v1/work-items`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return { server, app };
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Export the app for testing
export const app = (serviceFactory: ServiceFactory) => new ApiServer(serviceFactory).getApp();