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
    PORT: port
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

// Type exports
export type { EnvironmentConfig };
export type DatabaseConfig = typeof databaseConfig;
export type AppConfig = typeof appConfig;