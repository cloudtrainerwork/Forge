# Architecture Research

**Domain:** Graph-based SaaS platforms with real-time collaboration
**Researched:** February 7, 2025
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ React   │  │ Graph   │  │ Collab  │  │ State   │        │
│  │ App     │  │ Viz     │  │ Editor  │  │ Mgmt    │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                  Real-time Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │        WebSocket + CRDT Sync Layer                 │    │
│  │        (Yjs + Hocuspocus WebSocket Server)         │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                   Backend Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ GraphQL  │  │ Business │  │ Auth &   │                   │
│  │ Gateway  │  │ Logic    │  │ Multi-   │                   │
│  │          │  │ Services │  │ Tenancy  │                   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                   │
│       │             │             │                         │
├───────┴─────────────┴─────────────┴─────────────────────────┤
│                   Data Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Neo4j    │  │ PostgreSQL │  │ Redis    │                   │
│  │ Graph    │  │ Metadata  │  │ Cache &  │                   │
│  │ Store    │  │ Store     │  │ Sessions │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React App | UI orchestration, routing, component composition | Next.js 15+ with TypeScript, enterprise routing |
| Graph Visualization | Interactive graph rendering, user interactions | React Flow Pro, ReGraph, or custom WebGL |
| Collaborative Editor | Real-time multi-user editing, conflict resolution | Yjs CRDT with custom graph operations |
| State Management | Client-side state, caching, optimistic updates | Zustand/Redux RTK with normalized graph state |
| WebSocket Server | Real-time communication, CRDT synchronization | Hocuspocus (Yjs-compatible) with clustering |
| GraphQL Gateway | API aggregation, type safety, caching | Apollo Server with federated schemas |
| Business Logic | Domain logic, validation, authorization | Microservices with IoC containers (TypeScript) |
| Auth & Multi-tenancy | Authentication, authorization, tenant isolation | Row-level security with tenant-aware contexts |
| Neo4j Graph Store | Graph relationships, traversals, analytics | Neo4j Infinigraph for unified ops/analytics |
| PostgreSQL Metadata | Structured data, user accounts, configurations | Standard ACID transactions with JSON support |
| Redis Cache | Session store, real-time presence, pub/sub | Clustered Redis with persistence |

## Recommended Project Structure

```
apps/
├── web/                    # Next.js frontend application
│   ├── components/         # React components
│   │   ├── graph/         # Graph visualization components
│   │   ├── collaboration/ # Real-time editing UI
│   │   └── shared/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # State management
│   └── pages/             # Next.js pages and API routes
├── api/                   # Backend API services
│   ├── gateway/           # GraphQL gateway service
│   ├── graph/             # Graph domain service
│   ├── auth/              # Authentication service
│   └── realtime/          # WebSocket collaboration service
packages/
├── shared/                # Shared types and utilities
│   ├── types/             # TypeScript type definitions
│   ├── graph/             # Graph data structures and operations
│   └── collaboration/     # CRDT operations and sync logic
├── ui/                    # Shared UI component library
└── config/                # Shared configuration
tools/
├── database/              # Database migrations and seeds
└── deployment/            # Infrastructure as code
```

### Structure Rationale

- **apps/:** Separates frontend and backend applications for independent deployment and scaling
- **packages/:** Shared code enables type safety across the monorepo while preventing circular dependencies
- **Graph domain isolation:** Graph-specific logic is centralized for easier testing and evolution
- **Collaboration as first-class:** Real-time collaboration is treated as a core architectural concern, not an add-on

## Architectural Patterns

### Pattern 1: CRDT-based Collaborative State

**What:** Conflict-free Replicated Data Types manage distributed graph state without requiring operational transforms or conflict resolution algorithms
**When to use:** Multi-user real-time editing of graph structures where eventual consistency is acceptable
**Trade-offs:** Excellent conflict resolution and offline support, but larger memory footprint and eventual consistency model

**Example:**
```typescript
// Yjs-based graph state management
import { YMap, YArray } from 'yjs'

interface GraphCRDT {
  nodes: YMap<GraphNode>
  edges: YArray<GraphEdge>
  selections: YMap<UserSelection>
}

// Enterprise IoC container pattern
class CollaborationService {
  constructor(
    private graphCRDT: GraphCRDT,
    private websocketProvider: WebSocketProvider,
    private authService: AuthService
  ) {}

  subscribeToChanges(callback: (delta: GraphDelta) => void) {
    this.graphCRDT.nodes.observe(callback)
  }
}
```

### Pattern 2: Hybrid Database Architecture

**What:** Combines Neo4j for graph relationships/analytics with PostgreSQL for structured metadata and strong consistency requirements
**When to use:** Applications requiring both complex graph traversals and traditional ACID transactions
**Trade-offs:** Optimal for each data type but requires data synchronization between stores

**Example:**
```typescript
// Repository pattern with database-specific implementations
interface GraphRepository {
  findConnectedNodes(nodeId: string, depth: number): Promise<GraphNode[]>
  createRelationship(from: string, to: string, type: string): Promise<void>
}

class Neo4jGraphRepository implements GraphRepository {
  async findConnectedNodes(nodeId: string, depth: number) {
    return this.neo4jDriver.executeQuery(
      'MATCH (n)-[*1..{depth}]-(connected) WHERE ID(n) = {nodeId} RETURN connected',
      { nodeId, depth }
    )
  }
}
```

### Pattern 3: Multi-tenant Row-Level Security

**What:** Database-level tenant isolation using Row-Level Security policies with automatic tenant ID injection
**When to use:** SaaS applications requiring strong data isolation with cost-effective shared infrastructure
**Trade-offs:** Strong isolation with good performance, but requires careful query design and security auditing

**Example:**
```typescript
// Tenant-aware service with automatic isolation
class TenantAwareGraphService {
  constructor(
    @Inject('TenantContext') private tenantContext: TenantContext,
    private graphRepo: GraphRepository
  ) {}

  async getGraph(graphId: string): Promise<Graph> {
    // Tenant ID automatically injected by RLS
    return this.graphRepo.findByIdAndTenant(
      graphId,
      this.tenantContext.tenantId
    )
  }
}
```

## Data Flow

### Request Flow

```
[User Action]
    ↓
[React Component] → [State Manager] → [GraphQL Mutation] → [Business Service]
    ↓                     ↓               ↓                    ↓
[UI Update] ← [Optimistic Update] ← [Response] ← [Database Write]
    ↓
[CRDT Sync] → [WebSocket Broadcast] → [Other Clients]
```

### Real-time Collaboration Flow

```
[User Edit]
    ↓
[Local CRDT State] → [Yjs Document] → [WebSocket Provider] → [Hocuspocus Server]
    ↓                     ↓                ↓                       ↓
[UI Update] ← [Merge Operation] ← [Broadcast] ← [Persistence & Relay]
```

### Key Data Flows

1. **Graph Updates:** User edits trigger CRDT operations, sync via WebSocket, persist to Neo4j, and broadcast to collaborators
2. **Authentication Flow:** JWT tokens with tenant context, validated at gateway, injected into all downstream services
3. **Multi-tenant Queries:** Automatic tenant ID injection at database level ensures data isolation across all operations

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single-instance deployment with shared database, minimal caching |
| 1k-100k users | Horizontal scaling of WebSocket servers, Redis clustering, read replicas |
| 100k+ users | Graph database clustering (Neo4j Infinigraph), microservice decomposition, CDN integration |

### Scaling Priorities

1. **WebSocket connections:** First bottleneck due to real-time requirements; scale with sticky sessions and Redis pub/sub
2. **Graph query performance:** Optimize with proper indexing, query caching, and eventual Neo4j clustering for analytics

## Anti-Patterns

### Anti-Pattern 1: Operational Transform for Graph Data

**What people do:** Implement operational transforms (OT) for collaborative graph editing
**Why it's wrong:** Graph structures are non-linear and OT algorithms become extremely complex for graph operations
**Do this instead:** Use CRDTs like Yjs which handle graph-like structures naturally and provide automatic conflict resolution

### Anti-Pattern 2: Single Database for Everything

**What people do:** Store all graph relationships and metadata in either PostgreSQL or Neo4j exclusively
**Why it's wrong:** PostgreSQL struggles with deep graph traversals; Neo4j is overkill for simple CRUD operations
**Do this instead:** Hybrid approach with Neo4j for relationships and analytics, PostgreSQL for structured metadata and user data

### Anti-Pattern 3: Client-side Security for Multi-tenancy

**What people do:** Rely on frontend filtering or middleware-only tenant isolation
**Why it's wrong:** Vulnerable to data leaks through API manipulation, direct database access, or application bugs
**Do this instead:** Implement Row-Level Security at the database level as the ultimate security boundary

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Authentication | OAuth 2.0 + OIDC | Support for enterprise SSO providers |
| File Storage | S3-compatible API | For graph exports, user uploads, backups |
| Analytics | Event streaming | Track user interactions and collaboration patterns |
| Monitoring | OpenTelemetry | Distributed tracing across microservices |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Gateway | GraphQL over HTTPS | Type-safe schema with automatic validation |
| Gateway ↔ Services | gRPC or REST | Prefer gRPC for internal communication efficiency |
| Services ↔ Databases | Connection pooling | Use read replicas for analytics queries |
| Real-time ↔ Services | Event-driven | Decouple real-time sync from business logic |

## Enterprise Pattern Integration

### Inversion of Control (IoC) Container

```typescript
// Dependency injection setup
container.bind<GraphService>(TYPES.GraphService)
  .to(Neo4jGraphService)
  .inSingletonScope()

container.bind<CollaborationService>(TYPES.CollaborationService)
  .to(YjsCollaborationService)
  .whenTargetNamed("primary")
```

### Factory Pattern for Multi-tenant Resources

```typescript
class TenantGraphFactory {
  createGraphService(tenantId: string): GraphService {
    const config = this.getTenantConfig(tenantId)
    return config.tier === 'enterprise'
      ? new DedicatedGraphService(config)
      : new SharedGraphService(config)
  }
}
```

### Observer Pattern for State Synchronization

```typescript
class GraphStateManager implements Observer {
  update(event: GraphChangeEvent): void {
    this.notifySubscribers(event)
    this.persistChanges(event)
    this.broadcastToCollaborators(event)
  }
}
```

### Builder Pattern for Complex Graph Queries

```typescript
class GraphQueryBuilder {
  private query: CypherQuery = new CypherQuery()

  withNodes(types: string[]): this {
    this.query.addNodeFilter(types)
    return this
  }

  withRelationships(types: string[]): this {
    this.query.addRelationshipFilter(types)
    return this
  }

  build(): ExecutableQuery {
    return this.query.compile()
  }
}
```

## Multi-tenancy Preparation

### Tenant Isolation Strategy

- **Shared Schema:** Use tenant_id columns with Row-Level Security for cost efficiency
- **Hybrid Model:** Premium tenants get dedicated database instances for enhanced isolation
- **Graph Isolation:** Implement tenant labels on all Neo4j nodes and relationships

### Scaling Preparation

- **Connection Pooling:** Per-tenant connection pools with resource limits
- **Data Partitioning:** Logical partitioning by tenant for improved query performance
- **Backup Strategy:** Per-tenant backup and restore capabilities for enterprise customers

### Configuration Management

- **Feature Flags:** Tenant-specific feature enablement for gradual rollouts
- **Resource Quotas:** Configurable limits on graph size, concurrent users, API calls
- **Custom Branding:** Support for tenant-specific UI themes and branding

## Sources

- [Neo4j Infinigraph Architecture](https://neo4j.com/) - HIGH confidence
- [Yjs CRDT Documentation](https://yjs.dev/) - HIGH confidence
- [React Flow Collaborative Editing](https://reactflow.dev/examples/interaction/collaborative) - MEDIUM confidence
- [Multi-tenant SaaS Patterns - Azure](https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns) - HIGH confidence
- [WorkOS Multi-tenant Architecture Guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) - HIGH confidence
- [Enterprise React Architecture Patterns 2025](https://www.geeksforgeeks.org/reactjs/react-architecture-pattern-and-best-practices/) - MEDIUM confidence

---
*Architecture research for: Graph-based SaaS platforms with real-time collaboration*
*Researched: February 7, 2025*