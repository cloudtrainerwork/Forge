# FORGE - Functional Orchestration for Release-Grade Execution

## What This Is

FORGE is a cloud-native SaaS platform that replaces Agile project management with an execution architecture built on graph-based work modeling. The v1.0 MVP delivers interactive graph canvas with 6-dimensional readiness tracking, full backend integration, and production-ready infrastructure for managing work as connected dependencies rather than flat lists.

## Core Value

Engineering teams can model their work as a connected graph with real-time readiness state, eliminating the dependency tracking chaos that happens in spreadsheets and mind maps outside traditional project management tools.

## Requirements

### Validated

- ✓ Interactive graph canvas supporting infinite zoom and pan across multiple devices — v1.0
- ✓ Node system with typed relationships (blocks, requires, feeds-into, tested-by, deployed-with) — v1.0
- ✓ 6-dimensional readiness tracking per node (Requirements, Design, Frontend, Backend, Integration, Test) — v1.0
- ✓ Visual readiness indicators with multi-dimensional progress display — v1.0
- ✓ Graph database integration with Neo4j for native graph storage — v1.0
- ✓ PostgreSQL integration for specs, readiness history, and audit logs — v1.0
- ✓ Zero hard-coded variables - full configuration management — v1.0
- ✓ Enterprise design patterns: IoC, Factory, Observer, Builder for future extensibility — v1.0

### Active

- [ ] Sprint execution engine with time windows and capacity budgets
- [ ] Shovel-ready specifications with 6-section structured templates
- [ ] Real-time collaborative editing with conflict resolution
- [ ] ML-enhanced completion predictions and risk assessment
- [ ] Advanced analytics dashboard with executive reporting
- [ ] Multi-tenant architecture with tenant isolation
- [ ] Entra ID authentication integration
- [ ] API platform for third-party integrations

### Out of Scope

- Authentication (planned for Entra ID integration post-MLP)
- Multi-tenancy (single-tenant for MLP, schema ready for shared DB with tenant_id)
- Agentic export system (Phase 2 feature)
- Closed-loop reconciliation (Phase 2 feature)
- Sprint execution interface (schema only, UI deferred)
- Specification editing interface (schema only, UI deferred)

## Current Milestone: v1.1 Agentic Export

**Goal:** Transform graph nodes into executable specifications with multi-framework agentic export

**Target features:**
- Shovel-ready specifications with 6-section structured templates
- Export engine supporting 5 formats (GSD, BMAD, SpecKit, Claude Code, Generic)
- Sprint execution engine with ready queue and capacity management

## Context

Building from investor deck vision where FORGE addresses the $10B+ project management gap by modeling engineering work as directed graphs instead of flat lists. The v1.0 MVP successfully proves the core graph visualization and readiness concepts with production-ready implementation.

**Current State (v1.0 shipped):**
- 69,420 lines of TypeScript across frontend and backend
- ReactFlow graph canvas with 500+ node performance
- Hybrid Neo4j/PostgreSQL architecture with event-driven sync
- Comprehensive 6-dimensional readiness tracking
- Full offline capability with automatic sync
- Production error handling and monitoring

**Tech Stack:** Next.js frontend, Express backend, Neo4j graph database, PostgreSQL with Prisma, ReactFlow visualization, TypeScript throughout, Docker containerization.

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
| Neo4j + PostgreSQL hybrid | Neo4j for native graph operations, PostgreSQL for structured data and JSONB specs | ✓ Good - Clean separation of concerns |
| ReactFlow over Cytoscape | Better React integration, performance, and developer experience | ✓ Good - Excellent performance at 500+ nodes |
| Full schema from start | Avoid rework when adding sprint execution and specs in future phases | ✓ Good - Schema ready for v2 features |
| Design patterns emphasis | Enable rapid feature development and testing through proper abstractions | ✓ Good - Clean architecture enabled fast development |
| Cross-device canvas priority | Teams work on various devices, graph must be accessible everywhere | ✓ Good - Works seamlessly on all devices |
| Offline-first architecture | Network resilience critical for real-world usage | ✓ Good - Queue system prevents data loss |
| Event-driven audit trail | Reliable state tracking and debugging capability | ✓ Good - Complete history of all changes |

---
*Last updated: 2026-02-27 after v1.1 start*