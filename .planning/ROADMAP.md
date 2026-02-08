# Roadmap: FORGE

## Overview

FORGE delivers a graph-native execution platform through four focused phases: establishing the hybrid Neo4j/PostgreSQL data foundation, building the interactive React Flow canvas, implementing 6-dimensional readiness tracking, and completing work item management integration. This progression ensures critical architectural decisions are made early while building toward the core differentiator of functional graph-based project management.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Establish hybrid data architecture and project scaffolding
- [x] **Phase 2: Graph Canvas** - Build interactive graph visualization with memory-safe rendering
- [ ] **Phase 3: Readiness System** - Implement 6-dimensional tracking with enforcement rules
- [ ] **Phase 4: Work Integration** - Complete project management integration with graph-native workflows

## Phase Details

### Phase 1: Foundation
**Goal**: Establish the hybrid Neo4j/PostgreSQL data architecture with basic project scaffolding, preventing critical infrastructure pitfalls early
**Depends on**: Nothing (first phase)
**Requirements**: [DATA-01, DATA-02, DATA-03, DATA-04]
**Success Criteria** (what must be TRUE):
  1. Neo4j stores and retrieves graph relationships with production-grade configuration
  2. PostgreSQL stores work item specifications and readiness history with JSONB querying
  3. Backend API maintains data synchronization between Neo4j and PostgreSQL stores
  4. System persists all user interactions and maintains audit trail of state changes
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Docker infrastructure and TypeScript project setup
- [x] 01-02-PLAN.md — Data layer with Prisma schema and repositories
- [x] 01-03-PLAN.md — Service layer with API endpoints and data synchronization

### Phase 2: Graph Canvas
**Goal**: Deliver interactive graph canvas with memory-safe rendering for large graphs and multi-device support
**Depends on**: Phase 1
**Requirements**: [GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05]
**Success Criteria** (what must be TRUE):
  1. User can create, select, and manipulate interactive nodes on infinite canvas
  2. Canvas supports pan and zoom across devices with touch and mouse optimization
  3. Graph renders memory-safe for 500+ nodes without browser crashes or lag
  4. User can create typed relationships (blocks, requires, feeds-into, tested-by, deployed-with) between nodes
  5. Relationship visualization displays functional dependency information, not decorative connections
**Plans**: 4 plans (including gap closure)

Plans:
- [x] 02-01-PLAN.md — Next.js frontend with Cytoscape.js graph canvas foundation
- [x] 02-02-PLAN.md — Interactive node manipulation and typed relationship creation
- [x] 02-03-PLAN.md — Performance optimization for memory-safe rendering
- [x] 02-04-PLAN.md — API endpoint fix for backend connectivity (gap closure)

### Phase 3: Readiness System
**Goal**: Implement 6-dimensional readiness tracking with enforcement rules, delivering core platform differentiator
**Depends on**: Phase 2
**Requirements**: [READ-01, READ-02, READ-03, READ-04]
**Success Criteria** (what must be TRUE):
  1. Each node displays 6-dimensional readiness tracking (Requirements, Design, Frontend, Backend, Integration, Test)
  2. User can update progress for any readiness dimension on any node
  3. Readiness state provides clear visual indication of completion level per dimension
  4. System enforces readiness rules preventing incomplete nodes from entering ready state
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Work Integration
**Goal**: Complete project management integration with graph-native dependency modeling and progress tracking
**Depends on**: Phase 3
**Requirements**: [PM-01, PM-02, PM-03, PM-04, PM-05]
**Success Criteria** (what must be TRUE):
  1. User can create and edit work items as fully functional graph nodes
  2. User can define and visualize dependency relationships using graph edges
  3. System tracks progress across connected work items with real-time updates
  4. Graph provides native dependency visualization that drives functional execution
  5. System enforces 6-dimensional readiness before allowing work item state transitions
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-02-07 |
| 2. Graph Canvas | 4/4 | Complete | 2026-02-08 |
| 3. Readiness System | 0/2 | Not started | - |
| 4. Work Integration | 0/2 | Not started | - |