#!/usr/bin/env tsx

import { DatabaseHealthCheck } from '../config/database';
import { config } from '../config/environment';

async function testConnections() {
  console.log('🔄 Testing database connections...\n');

  console.log('Environment configuration:');
  console.log(`- NODE_ENV: ${config.NODE_ENV}`);
  console.log(`- Neo4j URI: ${config.NEO4J_URI}`);
  console.log(`- PostgreSQL DB: ${config.POSTGRES_DB}\n`);

  try {
    const health = await DatabaseHealthCheck.checkHealth();

    console.log('Database Health Check Results:');
    console.log(`- Neo4j: ${health.neo4j ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- PostgreSQL: ${health.postgres ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- Overall: ${health.overall ? '✅ All systems healthy' : '❌ Some systems down'}\n`);

    if (health.overall) {
      console.log('🎉 All database connections successful!');
      process.exit(0);
    } else {
      console.log('💥 Some database connections failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Connection test failed:', error);
    process.exit(1);
  }
}

testConnections();