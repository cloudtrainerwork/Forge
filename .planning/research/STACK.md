# Stack Research

**Domain:** Graph-based project management platform
**Researched:** 2025-02-07
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Flow | ^12.3.0 | Primary graph visualization | Purpose-built for React with excellent multi-device support, viewport-based rendering for performance, and built-in touch gesture handling. Best-in-class for interactive node-based editors |
| Next.js | ^15.0.0 | React framework | Enterprise-grade SSR/SSG, App Router for modern routing, excellent TypeScript support, and built-in optimization for multi-device delivery |
| TypeScript | ^5.6.0 | Type safety | Industry standard for enterprise React apps, provides compile-time error catching, enhanced IDE support, and self-documenting code |
| Zustand | ^5.0.0 | Client state management | Lightweight (3KB), excellent TypeScript support, minimal boilerplate, perfect middle ground between Context API complexity and Redux overhead |
| Neo4j | ^5.26.0 | Graph database | Purpose-built graph database with Cypher query language, excellent relationship traversal performance, and native support for graph analytics |
| PostgreSQL | ^17.0 | Relational database | Enterprise-grade ACID compliance, excellent JSON support for hybrid data models, mature ecosystem, and strong integration with Neo4j |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @neo4j/cypher-builder | ^1.0.0 | Neo4j query builder | Type-safe Cypher query construction, prevents injection attacks, improves maintainability |
| react-spring | ^9.7.0 | Animation library | Smooth graph transitions, optimized for touch devices, physics-based animations |
| @tanstack/react-query | ^5.56.0 | Server state management | Caching, background updates, optimistic mutations for real-time graph data |
| socket.io-client | ^4.8.0 | Real-time communication | Multi-user collaboration, real-time graph updates, optimized for mobile networks |
| @radix-ui/react-* | ^1.1.0 | Accessible UI primitives | WAI-ARIA compliant components, mobile-optimized touch targets, consistent across devices |
| vite | ^6.0.0 | Build tool | Lightning-fast HMR, optimized builds, excellent TypeScript support, superior to webpack for modern React |
| vitest | ^2.1.0 | Testing framework | Fast test execution, excellent TypeScript integration, built-in mocking, coverage reports |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | Code quality | Use @typescript-eslint/recommended, react-hooks rules |
| Prettier | Code formatting | Consistent formatting across team, integrates with VSCode |
| Husky | Git hooks | Pre-commit linting, automated testing before push |
| Docker | Containerization | Multi-stage builds, consistent dev/prod environments |

## Installation

```bash
# Core
npm install react-flow-renderer @neo4j/driver @tanstack/react-query zustand

# Graph and visualization
npm install react-spring d3-force @types/d3-force

# UI and interaction
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-toast
npm install socket.io-client

# Database integration
npm install @neo4j/cypher-builder pg @types/pg

# Dev dependencies
npm install -D vite @vitejs/plugin-react vitest @testing-library/react
npm install -D typescript @types/react @types/node
npm install -D eslint @typescript-eslint/eslint-plugin prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React Flow | Cytoscape.js | When handling >10k nodes, need WebGL rendering, or building network analysis tools rather than workflow editors |
| React Flow | D3.js | When requiring complete custom visualization control, unique graph layouts, or have dedicated D3 expertise |
| Zustand | Redux Toolkit | In large enterprise teams (50+ developers) requiring strict state management patterns and extensive middleware |
| Zustand | Jotai | When state relationships are highly complex and granular re-render optimization is critical |
| Next.js | Vite + React Router | For simple SPAs without SSR needs, or when bundle size is extremely critical |
| PostgreSQL | MongoDB | When document structure varies significantly or when JSON-first data model is preferred |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App | Deprecated, poor performance, limited TypeScript support | Next.js or Vite |
| Class Components | Outdated pattern, harder to test, no hooks support | Function Components with hooks |
| Enzyme | No longer maintained, React 18 incompatibility | React Testing Library |
| Chart.js/Recharts | Not optimized for graph networks, poor touch support | React Flow or Cytoscape.js |
| Redux (classic) | Excessive boilerplate for modern apps | Redux Toolkit or Zustand |
| Webpack | Complex configuration, slower HMR | Vite |

## Stack Patterns by Variant

**If building for enterprise with 50+ developers:**
- Use Redux Toolkit instead of Zustand
- Add Nx monorepo tooling
- Because standardized patterns and tooling become critical at scale

**If building analytics-heavy graphs (>5k nodes):**
- Use Cytoscape.js instead of React Flow
- Add WebGL rendering
- Because performance requirements exceed React Flow's DOM-based rendering

**If building real-time collaborative editing:**
- Add Yjs for conflict-free replicated data types
- Use WebRTC for direct peer connections
- Because operational transforms are complex to implement correctly

**If targeting primarily mobile users:**
- Use React Native with react-native-graph-view
- Add gesture libraries like react-native-reanimated
- Because native performance is superior to web views for complex interactions

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React Flow 12.x | React 18.x | Requires React 18 for concurrent features |
| Zustand 5.x | React 16.8+ | Works with any React version supporting hooks |
| @tanstack/react-query 5.x | React 18.x | V5 requires React 18 for Suspense integration |
| Next.js 15.x | React 18.x | App Router requires React 18 features |
| TypeScript 5.6.x | Node 18+ | Requires modern Node for ESM support |

## Multi-Device Considerations

### Touch Optimization
- React Flow provides built-in touch gesture support (pan, zoom, pinch)
- Use `react-spring` for smooth animations on lower-end mobile devices
- Implement viewport-based virtualization for mobile performance

### Responsive Design Patterns
- Collapsible sidebars using `@radix-ui/react-collapsible`
- Context-aware toolbars that adapt to screen size
- Touch-friendly hit targets (minimum 44px as per accessibility guidelines)

### Performance Considerations
- Lazy load graph sections using React.lazy and Suspense
- Use `react-window` for large node lists on mobile
- Implement service workers for offline graph caching

## Real-Time State Management

### WebSocket Integration
- Socket.io for reliable real-time communication with fallback support
- Zustand middleware for WebSocket state synchronization
- Optimistic updates with rollback for poor network conditions

### Conflict Resolution
- Use operational transforms for collaborative editing
- Implement last-write-wins for simple property updates
- Vector clocks for complex merge scenarios

## Neo4j + PostgreSQL Hybrid Architecture

### Data Distribution Strategy
- **PostgreSQL**: User accounts, permissions, audit logs, time-series data
- **Neo4j**: Project relationships, dependency graphs, path analysis
- **Synchronization**: Use change data capture (CDC) with Debezium

### Query Patterns
```typescript
// PostgreSQL for structured queries
const users = await pg.query('SELECT * FROM users WHERE org_id = $1', [orgId]);

// Neo4j for relationship queries
const dependencies = await neo4j.run(`
  MATCH (p:Project)-[:DEPENDS_ON*]->(dep:Project)
  WHERE p.id = $projectId
  RETURN dep
`, { projectId });
```

## Enterprise Design Patterns

### Factory Pattern Implementation
```typescript
interface GraphNodeFactory {
  createNode(type: NodeType, data: NodeData): GraphNode;
}

class ProjectNodeFactory implements GraphNodeFactory {
  createNode(type: NodeType, data: NodeData): GraphNode {
    switch (type) {
      case 'task': return new TaskNode(data);
      case 'milestone': return new MilestoneNode(data);
      default: throw new Error(`Unknown node type: ${type}`);
    }
  }
}
```

### Observer Pattern with Zustand
```typescript
const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  subscribe: (callback: (state: GraphState) => void) => {
    // Observer pattern implementation
    return store.subscribe(callback);
  }
}));
```

### Builder Pattern for Complex Queries
```typescript
class CypherQueryBuilder {
  private query: string = '';

  match(pattern: string): this {
    this.query += `MATCH ${pattern} `;
    return this;
  }

  where(condition: string): this {
    this.query += `WHERE ${condition} `;
    return this;
  }

  build(): string {
    return this.query.trim();
  }
}
```

## Sources

- React Flow Documentation - [HIGH confidence] - Latest API and performance characteristics
- Zustand GitHub Repository - [HIGH confidence] - Current version features and TypeScript support
- Neo4j Developer Documentation - [HIGH confidence] - Hybrid architecture patterns
- LogRocket React Chart Libraries 2025 - [MEDIUM confidence] - Multi-device support comparison
- DEV.to State Management 2025 - [MEDIUM confidence] - Community adoption trends
- Various WebSearch results - [LOW confidence] - Market trends and community insights

---
*Stack research for: Graph-based project management platform*
*Researched: 2025-02-07*