---
phase: 06-export-engine
plan: 02b
type: execute
wave: 4
depends_on: [06-02a]
files_modified: [
  "src/services/ExportService.ts",
  "src/factories/ServiceFactory.ts"
]
autonomous: true
requirements: [EXPORT-02, EXPORT-05]
user_setup: []

must_haves:
  truths:
    - "ExportService integrates with IoC container and audit trail patterns"
    - "Export operations complete within 5 seconds per requirement"
    - "Service follows established IoC and audit patterns from existing services"
  artifacts:
    - path: "src/services/ExportService.ts"
      provides: "Enhanced ExportService with audit trail integration"
      contains: "@injectable decorator and audit logging"
    - path: "src/factories/ServiceFactory.ts"
      provides: "IoC container registration for ExportService"
      contains: "IExportService binding"
  key_links:
    - from: "src/services/ExportService.ts"
      to: "src/services/AuditTrailService.ts"
      via: "dependency injection for audit logging"
      pattern: "@inject.*AuditTrailService"
    - from: "src/factories/ServiceFactory.ts"
      to: "src/services/ExportService.ts"
      via: "IoC container binding"
      pattern: "bind.*IExportService.*ExportService"
---

<objective>
Enhance ExportService with IoC container integration, audit trail patterns, and performance guarantees

Purpose: Complete export service integration with established infrastructure patterns for production readiness
Output: Fully integrated export service with audit logging and 5-second performance guarantee
</objective>

<execution_context>
@/Users/briannielsen/.claude/get-shit-done/workflows/execute-plan.md
@/Users/briannielsen/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-export-engine/06-RESEARCH.md

# Plan Dependencies
@.planning/phases/06-export-engine/06-02a-SUMMARY.md

# Existing Infrastructure Patterns
@src/services/AuditTrailService.ts
@src/factories/ServiceFactory.ts
@src/services/SpecificationService.ts

# Service to Enhance
@src/services/ExportService.ts
@src/adapters/IExportService.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add IoC and audit integration to ExportService</name>
  <files>src/services/ExportService.ts</files>
  <action>
    Enhance ExportService with infrastructure integration following SpecificationService patterns:
    - Add @injectable decorator for IoC container compatibility
    - Add AuditTrailService dependency injection to constructor
    - Add audit trail logging for all export operations with metadata
    - Add performance monitoring and 5-second timeout handling per requirement
    - Include audit logs with: operation type, workItemId, timestamp, file size, export status
    - Follow exact error handling and audit patterns from SpecificationService
    - Maintain existing core export functionality while adding infrastructure concerns
    - Add performance metrics collection and timeout warnings

    Match the exact patterns used in SpecificationService for audit integration and IoC.
  </action>
  <verify>
    <automated>npm test src/services/ExportService.test.ts -t "logs audit trail"</automated>
  </verify>
  <done>ExportService enhanced with IoC decorators, audit logging, and performance monitoring</done>
</task>

<task type="auto">
  <name>Task 2: Register ExportService in IoC container</name>
  <files>src/factories/ServiceFactory.ts</files>
  <action>
    Register ExportService in IoC container following established patterns:
    - Add IExportService interface import
    - Add ExportService class import
    - Bind IExportService to ExportService with singleton scope in configure() method
    - Add getExportService(): IExportService convenience method
    - Include ExportService in health check monitoring
    - Maintain alphabetical ordering of service registrations
    - Follow exact binding pattern used for ISpecificationService
    - Update type imports and maintain clean import organization

    Match the exact pattern used for SpecificationService registration in ServiceFactory.
  </action>
  <verify>
    <automated>npm test src/factories/ServiceFactory.test.ts -t "can resolve ExportService"</automated>
  </verify>
  <done>ExportService registered in IoC container with singleton lifecycle and health monitoring</done>
</task>

</tasks>

<verification>
- ExportService integrates with IoC container using @injectable decorator
- Service includes audit trail logging for all export operations
- Performance monitoring ensures 5-second export guarantee
- IoC container properly resolves ExportService dependencies
- Service follows established patterns from SpecificationService
</verification>

<success_criteria>
- ExportService uses @injectable decorator and integrates with IoC container
- Audit trail logs all export operations with complete metadata
- Performance monitoring enforces 5-second export time requirement
- ServiceFactory resolves ExportService through IoC container with singleton scope
- Service integration follows established patterns from existing services
</success_criteria>

<output>
After completion, create `.planning/phases/06-export-engine/06-02b-SUMMARY.md`
</output>