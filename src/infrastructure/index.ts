// Infrastructure layer - database connections and external services
// This directory contains database connections, external API clients, and other infrastructure concerns
export * from './database.js';
export * from './external.js';

// Repository implementations
export { GraphRepository } from './neo4j/GraphRepository.js';
export { WorkItemRepository } from './postgresql/WorkItemRepository.js';