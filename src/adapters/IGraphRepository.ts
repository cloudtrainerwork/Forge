/**
 * Graph repository interface for Neo4j operations
 * Handles node and relationship operations in the graph database
 */
export interface IGraphRepository {
  /**
   * Create a node in the graph database
   */
  createNode(labels: string[], properties: Record<string, any>): Promise<string>;

  /**
   * Create a relationship between two nodes
   */
  createRelationship(
    fromNodeId: string,
    toNodeId: string,
    relationshipType: string,
    properties?: Record<string, any>
  ): Promise<string>;

  /**
   * Traverse dependencies from a given node
   */
  traverseDependencies(
    nodeId: string,
    relationshipType: string,
    maxDepth?: number
  ): Promise<Array<{ nodeId: string; properties: Record<string, any>; depth: number }>>;

  /**
   * Find nodes by type and optional properties
   */
  findNodesByType(
    label: string,
    properties?: Record<string, any>,
    limit?: number
  ): Promise<Array<{ nodeId: string; properties: Record<string, any> }>>;

  /**
   * Find a node by its ID
   */
  findNodeById(nodeId: string): Promise<{ nodeId: string; properties: Record<string, any> } | null>;

  /**
   * Update node properties
   */
  updateNode(nodeId: string, properties: Record<string, any>): Promise<void>;

  /**
   * Delete a node and all its relationships
   */
  deleteNode(nodeId: string): Promise<void>;

  /**
   * Delete a relationship by ID
   */
  deleteRelationship(relationshipId: string): Promise<void>;

  /**
   * Find all relationships for a node
   */
  findNodeRelationships(
    nodeId: string,
    direction?: 'IN' | 'OUT' | 'BOTH'
  ): Promise<Array<{
    relationshipId: string;
    type: string;
    fromNodeId: string;
    toNodeId: string;
    properties: Record<string, any>;
  }>>;

  /**
   * Check if repository is healthy
   */
  healthCheck(): Promise<boolean>;

  /**
   * Close database connection
   */
  close(): Promise<void>;
}