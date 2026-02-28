# Roadmap: FORGE v1.1

**Milestone:** v1.1 Agentic Export and Specification Systems
**Target:** Transform graph nodes into executable specifications with multi-framework agentic export
**Requirements:** 10 total (SPEC: 5, EXPORT: 5)
**Coverage:** 10/10 requirements mapped ✓

## Overview

Building on the proven v1.0 foundation, v1.1 adds structured specification templates and GSD XML export capabilities to enable agentic development workflows. The roadmap prioritizes data architecture first to avoid ReactFlow state pollution, then implements export engines for shovel-ready specifications that bridge traditional project management with AI-assisted development.

## Phases

### Phase 5: Specification Foundation

**Goal:** Users can create and manage structured specifications within work items

**Dependencies:** v1.0 graph canvas and readiness system (shipped)

**Requirements:**
- SPEC-01: User can create 6-section specification templates within work items
- SPEC-02: User can edit specification sections with structured text input
- SPEC-04: System preserves specification data separately from ReactFlow canvas state

**Success Criteria:**
1. User can create new work items with built-in 6-section specification template (Requirements, Design, Frontend, Backend, Integration, Test)
2. User can edit any specification section with structured text input that preserves formatting
3. User can save specification changes without affecting canvas performance or visual state
4. System stores specification data in PostgreSQL JSONB fields separate from Neo4j graph structure

---

### Phase 6: Export Engine

**Goal:** Users can export work item specifications as executable GSD XML plans

**Dependencies:** Phase 5 (specification data architecture)

**Requirements:**
- EXPORT-01: User can export individual work item specifications to GSD XML format
- EXPORT-02: System generates atomic GSD plans with maximum 3 tasks per work item
- EXPORT-05: User receives GSD XML file formatted for wave-based execution

**Success Criteria:**
1. User can select any work item and export its specification as GSD XML file download
2. Generated GSD XML contains atomic plans with maximum 3 tasks derived from specification sections
3. Exported XML follows wave-based execution format compatible with GSD workflow orchestrators
4. Export process completes within 5 seconds for individual work items without blocking UI

---

### Phase 7: Validation & Preview

**Goal:** Users have quality gates ensuring specification completeness before export

**Dependencies:** Phase 6 (basic export functionality)

**Requirements:**
- SPEC-03: User can validate specification completeness against template schema
- SPEC-05: User can view specification completion status per section
- EXPORT-03: User can preview GSD export before downloading
- EXPORT-04: System validates specification completeness before GSD export

**Success Criteria:**
1. User can view real-time completion status for each specification section with visual progress indicators
2. User can validate entire specification against schema and receive specific guidance for incomplete sections
3. User can preview generated GSD XML in readable format before committing to download
4. System blocks GSD export attempts for incomplete specifications and displays clear completion requirements

## Progress

| Phase | Goal | Status | Success Criteria | Requirements |
|-------|------|--------|------------------|--------------|
| 5 - Specification Foundation | Users can create and manage structured specifications | Pending | 4 criteria | SPEC-01, SPEC-02, SPEC-04 |
| 6 - Export Engine | Users can export specifications as GSD XML | Pending | 4 criteria | EXPORT-01, EXPORT-02, EXPORT-05 |
| 7 - Validation & Preview | Users have quality gates for export | Pending | 4 criteria | SPEC-03, SPEC-05, EXPORT-03, EXPORT-04 |

**Next:** Plan Phase 5 to begin implementation

---
*Generated: 2026-02-27*
*Milestone: v1.1 Agentic Export*