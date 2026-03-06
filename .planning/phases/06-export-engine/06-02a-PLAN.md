---
phase: 06-export-engine
plan: 02a
type: execute
wave: 4
depends_on: [06-01b]
files_modified: [
  "src/adapters/IExportService.ts",
  "src/services/ExportService.ts"
]
autonomous: true
requirements: [EXPORT-01]
user_setup: []

must_haves:
  truths:
    - "ExportService can export work item specifications to GSD XML format"
    - "Export operations include basic error handling for missing specifications"
    - "Service follows established service patterns with clean interface separation"
  artifacts:
    - path: "src/adapters/IExportService.ts"
      provides: "Clean interface for export operations"
      exports: ["IExportService", "ExportResult"]
    - path: "src/services/ExportService.ts"
      provides: "Core business service for GSD XML export"
      exports: ["ExportService"]
  key_links:
    - from: "src/services/ExportService.ts"
      to: "src/services/GSDXmlGenerator.ts"
      via: "constructor dependency for XML generation"
      pattern: "GSDXmlGenerator.*generateGSDPlan"
    - from: "src/services/ExportService.ts"
      to: "ISpecificationService"
      via: "specification retrieval for export"
      pattern: "ISpecificationService.*getSpecification"
---

<objective>
Create ExportService with clean interface and core XML export functionality

Purpose: Provide business service for transforming work item specifications into GSD XML with proper separation of concerns
Output: Core export service ready for IoC integration and audit enhancement
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
@.planning/phases/06-export-engine/06-01b-SUMMARY.md

# Existing Service Patterns
@src/adapters/ISpecificationService.ts
@src/services/SpecificationService.ts

# Dependencies Required
@src/domain/entities/GSDPlan.ts
@src/services/GSDXmlGenerator.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create IExportService interface</name>
  <files>src/adapters/IExportService.ts</files>
  <action>
    Create clean interface for export operations following established adapter patterns:
    - exportWorkItemToGSD(workItemId: string): Promise<ExportResult> method
    - ExportResult interface with filename, buffer, contentType, metadata properties
    - Include JSDoc documentation for all methods and interfaces
    - Follow naming conventions established in ISpecificationService
    - Include proper TypeScript return types for file download operations
    - Add error handling method signatures for failed exports
    - Include metadata about export operations (timestamp, file size, export type)

    Match existing interface patterns from ISpecificationService and IWorkItemRepository.
  </action>
  <verify>
    <automated>npm run type-check src/adapters/IExportService.ts</automated>
  </verify>
  <done>IExportService interface exists with proper method signatures and TypeScript types</done>
</task>

<task type="auto">
  <name>Task 2: Create core ExportService implementation</name>
  <files>src/services/ExportService.ts</files>
  <action>
    Create ExportService following established service patterns:
    - Use class-based service structure matching SpecificationService
    - Constructor dependency injection for ISpecificationService and GSDXmlGenerator
    - Implement exportWorkItemToGSD method with basic error handling
    - Include error handling for missing specifications and XML generation failures
    - Generate filename with pattern: "forge-workitem-{workItemId}-{timestamp}.xml"
    - Return Buffer.from() for XML content with proper content-type headers
    - Include validation: reject export for empty specifications
    - Follow error message patterns from SpecificationService
    - Keep implementation focused on core export logic (audit and IoC will be added in 02b)

    Use existing patterns from SpecificationService for validation and error handling structure.
  </action>
  <verify>
    <automated>npm test src/services/ExportService.test.ts -t "exports GSD XML"</automated>
  </verify>
  <done>ExportService exists with core export functionality and dependency injection structure</done>
</task>

</tasks>

<verification>
- IExportService interface defines clean contract for export operations
- ExportService implements core business logic with proper dependency structure
- Service follows established patterns from SpecificationService
- Export operations handle basic validation and error cases
- Service ready for IoC integration and audit enhancement
</verification>

<success_criteria>
- IExportService interface exists with proper method signatures and return types
- ExportService implements core export logic with dependency injection structure
- Basic error handling covers missing specifications and XML generation failures
- Service follows established patterns and naming conventions
- Implementation ready for IoC container registration and audit trail addition
</success_criteria>

<output>
After completion, create `.planning/phases/06-export-engine/06-02a-SUMMARY.md`
</output>