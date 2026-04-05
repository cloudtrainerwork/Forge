import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variable schema with validation
interface EnvironmentConfig {
  // Neo4j Configuration
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;

  // PostgreSQL Configuration
  DATABASE_URL: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;

  // Application Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Auth Configuration
  JWT_SECRET: string;
  JWT_EXPIRY_SECONDS: number;
  CORS_ORIGIN: string;

  // OAuth Providers (optional — only needed when providers are enabled)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AZURE_AD_CLIENT_ID?: string;
  AZURE_AD_CLIENT_SECRET?: string;
  AZURE_AD_TENANT_ID?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

/**
 * Validates and parses environment variables with proper type checking
 * Throws descriptive errors for missing or invalid configuration
 */
function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  // Required environment variables with validation
  const requiredVars: (keyof EnvironmentConfig)[] = [
    'NEO4J_URI',
    'NEO4J_USER',
    'NEO4J_PASSWORD',
    'DATABASE_URL',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB'
  ];

  // Check for missing required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV as EnvironmentConfig['NODE_ENV'];
  if (!nodeEnv || !['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be one of: development, production, test');
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('PORT must be a valid port number (1-65535)');
  }

  // Validate JWT_SECRET (required for auth)
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    errors.push('JWT_SECRET is required and must be at least 32 characters');
  }

  // JWT expiry (default 24h)
  const jwtExpiry = parseInt(process.env.JWT_EXPIRY_SECONDS || '86400', 10);

  // Validate Neo4j URI format
  const neo4jUri = process.env.NEO4J_URI;
  if (neo4jUri && !neo4jUri.match(/^(bolt|bolt\+s|neo4j|neo4j\+s):\/\/.+/)) {
    errors.push('NEO4J_URI must be a valid Neo4j connection URI (bolt://, bolt+s://, neo4j://, neo4j+s://)');
  }

  // Validate PostgreSQL DATABASE_URL format
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && !databaseUrl.match(/^postgresql:\/\/.+/)) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string (postgresql://)');
  }

  if (errors.length > 0) {
    throw new Error(`Environment configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  return {
    NEO4J_URI: process.env.NEO4J_URI!,
    NEO4J_USER: process.env.NEO4J_USER!,
    NEO4J_PASSWORD: process.env.NEO4J_PASSWORD!,
    DATABASE_URL: process.env.DATABASE_URL!,
    POSTGRES_USER: process.env.POSTGRES_USER!,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD!,
    POSTGRES_DB: process.env.POSTGRES_DB!,
    NODE_ENV: nodeEnv,
    PORT: port,
    JWT_SECRET: jwtSecret!,
    JWT_EXPIRY_SECONDS: jwtExpiry,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  };
}

// Validate and export configuration
export const config = validateEnvironment();

// Export individual config sections for convenience
export const databaseConfig = {
  neo4j: {
    uri: config.NEO4J_URI,
    user: config.NEO4J_USER,
    password: config.NEO4J_PASSWORD
  },
  postgres: {
    url: config.DATABASE_URL,
    user: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DB
  }
};

export const appConfig = {
  env: config.NODE_ENV,
  port: config.PORT,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test'
};

export const authConfig = {
  jwtSecret: config.JWT_SECRET,
  jwtExpirySeconds: config.JWT_EXPIRY_SECONDS,
  corsOrigin: config.CORS_ORIGIN,
  providers: {
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    },
    azureAd: {
      clientId: config.AZURE_AD_CLIENT_ID,
      clientSecret: config.AZURE_AD_CLIENT_SECRET,
      tenantId: config.AZURE_AD_TENANT_ID,
    },
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
    },
  },
};

// Type exports
export type { EnvironmentConfig };
export type DatabaseConfig = typeof databaseConfig;
export type AppConfig = typeof appConfig;