import { Driver } from 'neo4j-driver';
import { IGraphRepository } from '../../adapters/IGraphRepository.js';

/**
 * Neo4j implementation of the graph repository
 * Handles node and relationship operations with proper session management
 */
export class GraphRepository implements IGraphRepository {
  private driver: Driver;

  constructor(driver: Driver) {
    this.driver = driver;
  }

  async createNode(labels: string[], properties: Record<string, any>): Promise<string> {
    const session = this.driver.session();
    try {
      const labelClause = labels.map(label => `:${label}`).join('');
      const propsKeys = Object.keys(properties);
      const propsClause = propsKeys.length > 0
        ? `{${propsKeys.map(key => `${key}: $${key}`).join(', ')}}`
        : '{}';

      const query = `CREATE (n${labelClause} ${propsClause}) RETURN elementId(n) as id`;

      const result = await session.run(query, properties);

      if (result.records.length === 0) {
        throw new Error('Failed to create node');
      }

      return result.records[0].get('id') as string;
    } catch (error) {
      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async createRelationship(
    fromNodeId: string,
    toNodeId: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): Promise<string> {
    const session = this.driver.session();
    try {
      const propsKeys = Object.keys(properties);
      const propsClause = propsKeys.length > 0
        ? `{${propsKeys.map(key => `${key}: $${key}`).join(', ')}}`
        : '{}';

      const query = `
        MATCH (from), (to)
        WHERE elementId(from) = $fromNodeId AND elementId(to) = $toNodeId
        CREATE (from)-[r:${relationshipType} ${propsClause}]->(to)
        RETURN elementId(r) as id
      `;

      const result = await session.run(query, {
        fromNodeId,
        toNodeId,
        ...properties
      });

      if (result.records.length === 0) {
        throw new Error('Failed to create relationship - nodes not found');
      }

      return result.records[0].get('id') as string;
    } catch (error) {
      throw new Error(`Failed to create relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async traverseDependencies(
    nodeId: string,
    relationshipType: string,
    maxDepth: number = 10
  ): Promise<Array<{ nodeId: string; properties: Record<string, any>; depth: number }>> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH path = (start)-[:${relationshipType}*1..${maxDepth}]->(dep)
        WHERE elementId(start) = $nodeId
        RETURN elementId(dep) as nodeId, properties(dep) as properties, length(path) as depth
        ORDER BY depth, nodeId
      `;

      const result = await session.run(query, { nodeId });

      return result.records.map(record => ({
        nodeId: record.get('nodeId') as string,
        properties: record.get('properties') as Record<string, any>,
        depth: record.get('depth').toNumber() as number,
      }));
    } catch (error) {
      throw new Error(`Failed to traverse dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async findNodesByType(
    label: string,
    properties: Record<string, any> = {},
    limit: number = 100
  ): Promise<Array<{ nodeId: string; properties: Record<string, any> }>> {
    const session = this.driver.session();
    try {
      const propsKeys = Object.keys(properties);
      const whereClause = propsKeys.length > 0
        ? `WHERE ${propsKeys.map(key => `n.${key} = $${key}`).join(' AND ')}`
        : '';

      const query = `
        MATCH (n:${label})
        ${whereClause}
        RETURN elementId(n) as nodeId, properties(n) as properties
        LIMIT ${limit}
      `;

      const result = await session.run(query, properties);

      return result.records.map(record => ({
        nodeId: record.get('nodeId') as string,
        properties: record.get('properties') as Record<string, any>,
      }));
    } catch (error) {
      throw new Error(`Failed to find nodes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async findNodeById(nodeId: string): Promise<{ nodeId: string; properties: Record<string, any> } | null> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (n)
        WHERE elementId(n) = $nodeId
        RETURN elementId(n) as nodeId, properties(n) as properties
      `;

      const result = await session.run(query, { nodeId });

      if (result.records.length === 0) {
        return null;
      }

      return {
        nodeId: result.records[0].get('nodeId') as string,
        properties: result.records[0].get('properties') as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`Failed to find node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async updateNode(nodeId: string, properties: Record<string, any>): Promise<void> {
    const session = this.driver.session();
    try {
      const propsKeys = Object.keys(properties);
      const setClause = propsKeys.map(key => `n.${key} = $${key}`).join(', ');

      const query = `
        MATCH (n)
        WHERE elementId(n) = $nodeId
        SET ${setClause}
        RETURN count(n) as updated
      `;

      const result = await session.run(query, { nodeId, ...properties });

      if (result.records[0].get('updated').toNumber() === 0) {
        throw new Error('Node not found');
      }
    } catch (error) {
      throw new Error(`Failed to update node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (n)
        WHERE elementId(n) = $nodeId
        DETACH DELETE n
        RETURN count(n) as deleted
      `;

      const result = await session.run(query, { nodeId });

      if (result.records[0].get('deleted').toNumber() === 0) {
        throw new Error('Node not found');
      }
    } catch (error) {
      throw new Error(`Failed to delete node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    const session = this.driver.session();
    try {
      const query = `
        MATCH ()-[r]-()
        WHERE elementId(r) = $relationshipId
        DELETE r
        RETURN count(r) as deleted
      `;

      const result = await session.run(query, { relationshipId });

      if (result.records[0].get('deleted').toNumber() === 0) {
        throw new Error('Relationship not found');
      }
    } catch (error) {
      throw new Error(`Failed to delete relationship: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async findNodeRelationships(
    nodeId: string,
    direction: 'IN' | 'OUT' | 'BOTH' = 'BOTH'
  ): Promise<Array<{
    relationshipId: string;
    type: string;
    fromNodeId: string;
    toNodeId: string;
    properties: Record<string, any>;
  }>> {
    const session = this.driver.session();
    try {
      let pattern: string;
      switch (direction) {
        case 'IN':
          pattern = '(other)-[r]->(n)';
          break;
        case 'OUT':
          pattern = '(n)-[r]->(other)';
          break;
        default:
          pattern = '(n)-[r]-(other)';
      }

      const query = `
        MATCH ${pattern}
        WHERE elementId(n) = $nodeId
        RETURN elementId(r) as relationshipId, type(r) as type,
               elementId(startNode(r)) as fromNodeId, elementId(endNode(r)) as toNodeId,
               properties(r) as properties
      `;

      const result = await session.run(query, { nodeId });

      return result.records.map(record => ({
        relationshipId: record.get('relationshipId') as string,
        type: record.get('type') as string,
        fromNodeId: record.get('fromNodeId') as string,
        toNodeId: record.get('toNodeId') as string,
        properties: record.get('properties') as Record<string, any>,
      }));
    } catch (error) {
      throw new Error(`Failed to find relationships: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run('RETURN 1 as health');
      return result.records.length > 0 && result.records[0].get('health').toNumber() === 1;
    } catch (error) {
      return false;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}