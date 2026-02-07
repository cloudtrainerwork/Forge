# FORGE - Functional Orchestration for Release-Grade Execution

## What This Is

FORGE is a cloud-native SaaS platform that replaces Agile project management with an execution architecture built on graph-based work modeling. The Phase 1 MLP focuses on the core graph canvas with interactive node visualization and 6-dimensional readiness tracking, while scaffolding the full architecture for sprint execution and shovel-ready specifications.

## Core Value

Engineering teams can model their work as a connected graph with real-time readiness state, eliminating the dependency tracking chaos that happens in spreadsheets and mind maps outside traditional project management tools.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive graph canvas supporting infinite zoom and pan across multiple devices
- [ ] Node system with typed relationships (blocks, requires, feeds-into, tested-by, deployed-with)
- [ ] 6-dimensional readiness tracking per node (Requirements, Design, Frontend, Backend, Integration, Test)
- [ ] Visual readiness indicators with multi-dimensional progress display
- [ ] Graph database integration with Neo4j for native graph storage
- [ ] PostgreSQL integration for specs, readiness history, and audit logs
- [ ] Complete schema foundation for sprint execution engine (time windows, capacity budgets, ready queue)
- [ ] Complete schema foundation for shovel-ready specifications (6-section structured specs)
- [ ] Zero hard-coded variables - full configuration management
- [ ] Enterprise design patterns: IoC, Factory, Observer, Builder for future extensibility

### Out of Scope

- Authentication (planned for Entra ID integration post-MLP)
- Multi-tenancy (single-tenant for MLP, schema ready for shared DB with tenant_id)
- Agentic export system (Phase 2 feature)
- Closed-loop reconciliation (Phase 2 feature)
- Sprint execution interface (schema only, UI deferred)
- Specification editing interface (schema only, UI deferred)

## Context

Building from investor deck vision where FORGE addresses the $10B+ project management gap by modeling engineering work as directed graphs instead of flat lists. The MLP proves the core graph visualization and readiness concepts while establishing the technical foundation for all 4 phases outlined in the business plan.

Current spike solution exists in forge-app/ directory demonstrating graph canvas exploration - preserving functional code while building production architecture.

Technical environment: Docker-based development with Neo4j (ports 7474/7687, auth: neo4j/password), modern TypeScript/React stack, emphasis on cross-device compatibility for graph visualization.

## Constraints

- **Multi-device compatibility**: Canvas library must work seamlessly across desktop, tablet, mobile
- **Performance**: Graph visualization must handle complex dependency graphs without lag
- **Architecture**: Zero hard-coded variables, full IoC implementation for easy testing and deployment
- **Future-proofing**: Schema and patterns must support Phase 2-4 features without rework
- **Development**: Monorepo structure with appropriate design patterns (IoC, Factory, Observer, Builder)
- **Data architecture**: Neo4j for graph structure, PostgreSQL for documents/history, backend API maintains sync

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Neo4j + PostgreSQL hybrid | Neo4j for native graph operations, PostgreSQL for structured data and JSONB specs | — Pending |
| Canvas over established PM patterns | Graph visualization is core differentiator vs Jira/Linear flat lists | — Pending |
| Full schema from start | Avoid rework when adding sprint execution and specs in future phases | — Pending |
| Design patterns emphasis | Enable rapid feature development and testing through proper abstractions | — Pending |
| Cross-device canvas priority | Teams work on various devices, graph must be accessible everywhere | — Pending |

---
*Last updated: 2025-02-07 after initialization*