# Requirements: FORGE

**Defined:** 2026-02-27
**Core Value:** Engineering teams can model their work as a connected graph with real-time readiness state, eliminating the dependency tracking chaos that happens in spreadsheets and mind maps outside traditional project management tools.

## v1.1 Requirements

Requirements for v1.1 Agentic Export milestone. Each maps to roadmap phases.

### Specification System

- [ ] **SPEC-01**: User can create 6-section specification templates within work items (Requirements, Design, Frontend, Backend, Integration, Test)
- [ ] **SPEC-02**: User can edit specification sections with structured text input
- [ ] **SPEC-03**: User can validate specification completeness against template schema
- [ ] **SPEC-04**: System preserves specification data separately from ReactFlow canvas state
- [ ] **SPEC-05**: User can view specification completion status per section

### Export System

- [x] **EXPORT-01**: User can export individual work item specifications to GSD XML format
- [x] **EXPORT-02**: System generates atomic GSD plans with maximum 3 tasks per work item
- [ ] **EXPORT-03**: User can preview GSD export before downloading
- [ ] **EXPORT-04**: System validates specification completeness before GSD export
- [x] **EXPORT-05**: User receives GSD XML file formatted for wave-based execution

## v1.2+ Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Export Formats

- **EXPORT-06**: User can export specifications to BMAD story format for virtual team development
- **EXPORT-07**: User can export specifications to SpecKit format for GitHub workflow integration
- **EXPORT-08**: User can export specifications to Claude Code format for AI-assisted development
- **EXPORT-09**: User can export specifications to Generic markdown format for universal tool compatibility

### Advanced Operations

- **BULK-01**: User can export multiple work items as ZIP packages
- **BULK-02**: User can track export progress for long-running operations
- **BULK-03**: User receives real-time status updates during bulk exports

### Sprint Integration

- **SPRINT-01**: User can filter work items by readiness for sprint planning
- **SPRINT-02**: User can manage sprint capacity budgets and tracking
- **SPRINT-03**: User can export filtered sprint items as execution-ready backlog
- **SPRINT-04**: System validates readiness before allowing sprint export

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| WYSIWYG spec editor | Breaks structured template consistency, research identified as anti-feature |
| Real-time export sync | Performance overhead, async workflows more appropriate |
| Custom template builder | Breaks cross-team consistency, complicates export systems |
| Multiple specification versions | Adds complexity without clear v1.1 value, defer to v1.2+ |
| Unlimited export formats | Maintenance nightmare, focus on 5 high-value formats |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPEC-01 | Phase 5 | Pending |
| SPEC-02 | Phase 5 | Pending |
| SPEC-03 | Phase 7 | Pending |
| SPEC-04 | Phase 5 | Pending |
| SPEC-05 | Phase 7 | Pending |
| EXPORT-01 | Phase 6 | Complete |
| EXPORT-02 | Phase 6 | Complete |
| EXPORT-03 | Phase 7 | Pending |
| EXPORT-04 | Phase 7 | Pending |
| EXPORT-05 | Phase 6 | Complete |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-27*
*Last updated: 2026-02-27 after roadmap creation*