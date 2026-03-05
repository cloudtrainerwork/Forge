---
phase: 06-export-engine
plan: 01b
type: execute
wave: 2
depends_on: [06-01]
files_modified: [
  "src/templates/gsd-plan.hbs",
  "src/services/GSDXmlGenerator.ts"
]
autonomous: true
requirements: [EXPORT-01, EXPORT-05]
user_setup: []

must_haves:
  truths:
    - "System can transform SpecificationTemplate to valid GSD XML structure"
    - "Generated XML follows wave-based execution format with proper task dependencies"
    - "Template engine compiles Handlebars templates and generates XML from specifications"
  artifacts:
    - path: "src/templates/gsd-plan.hbs"
      provides: "Handlebars template for GSD XML generation"
      contains: "GSD XML structure with wave-based tasks"
    - path: "src/services/GSDXmlGenerator.ts"
      provides: "XML generation service with template compilation"
      exports: ["GSDXmlGenerator"]
  key_links:
    - from: "src/services/GSDXmlGenerator.ts"
      to: "src/templates/gsd-plan.hbs"
      via: "Handlebars template compilation"
      pattern: "Handlebars\\.compile"
    - from: "src/services/GSDXmlGenerator.ts"
      to: "SpecificationTemplate"
      via: "specification analysis for task generation"
      pattern: "SpecificationTemplate.*getAllSections"
---

<objective>
Create GSD XML template engine with Handlebars for transforming specifications into wave-based execution plans

Purpose: Enable transformation of work item specifications into executable GSD XML format that supports atomic task generation and wave-based parallelization
Output: Complete template engine infrastructure ready for export service integration
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
@.planning/phases/06-export-engine/06-01-SUMMARY.md

# Phase 5 Dependencies
@.planning/phases/05-specification-foundation/05-01-SUMMARY.md
@.planning/phases/05-specification-foundation/05-02b-SUMMARY.md

# Existing Interfaces
@src/domain/entities/SpecificationTemplate.ts
@src/adapters/ISpecificationService.ts

# Dependencies Required
@src/domain/entities/GSDPlan.ts
</context>

<tasks>

<task type="auto">
  <name>Task 0: Create test scaffold for GSD XML generator</name>
  <files>src/services/GSDXmlGenerator.test.ts</files>
  <action>
    Create test scaffold file for XML generator service:
    - Create src/services/GSDXmlGenerator.test.ts with test structure for XML generation functionality
    - Include describe blocks and empty test placeholders that will be implemented alongside the actual code
    - Use Jest/testing framework established in project
    - Ensure test files can be imported and run without errors (even with pending tests)

    Follow existing test patterns from the codebase for structure and naming conventions.
  </action>
  <verify>
    <automated>npm test src/services/GSDXmlGenerator.test.ts</automated>
  </verify>
  <done>Test scaffold file exists and can be executed without errors</done>
</task>

<task type="auto">
  <name>Task 1: Create Handlebars GSD XML template</name>
  <files>src/templates/gsd-plan.hbs</files>
  <action>
    Create Handlebars template for GSD XML generation based on research findings:
    - Use triple braces {{{value}}} to avoid HTML escaping for XML content
    - Include GSD XML namespace and version headers
    - Support metadata section with title, created timestamp, source, atomicity count
    - Support waves section with wave-based task organization
    - Each wave includes id, parallel flag, dependencies, and tasks
    - Each task includes type, id, name, files, description, and verification sections
    - Use Handlebars helpers for conditional sections ({{#if verification}})
    - Follow research template structure for GSD compliance

    Template must generate valid XML structure that can be validated by xmlbuilder2.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const template=fs.readFileSync('src/templates/gsd-plan.hbs', 'utf8'); console.log('Template length:', template.length); process.exit(template.includes('xmlns') ? 0 : 1)"</automated>
  </verify>
  <done>GSD XML Handlebars template exists with proper XML structure and namespace declarations</done>
</task>

<task type="auto">
  <name>Task 2: Create GSDXmlGenerator service</name>
  <files>src/services/GSDXmlGenerator.ts</files>
  <action>
    Create GSDXmlGenerator service following established service patterns:
    - Use class-based service with dependency injection decorators
    - Pre-compile Handlebars template in constructor for performance per research
    - Implement generateGSDPlan(spec: SpecificationTemplate, workItemId: string): GSDPlan method
    - Convert specification sections to atomic tasks (max 3 tasks per research)
    - Analyze dependencies: requirements → backend → frontend → integration → test order
    - Group tasks into waves based on dependencies (requirements in wave 0, implementation in wave 1)
    - Implement renderGSDXml(plan: GSDPlan): string method with template compilation
    - Add XML validation using xmlbuilder2 before returning
    - Include error handling for template compilation and XML validation failures
    - Use uuid for unique task and plan IDs
    - Implement task generation algorithm from research: requirements analysis + max 2 implementation tasks
  </action>
  <verify>
    <automated>npm test src/services/GSDXmlGenerator.test.ts -t "generates valid GSD XML"</automated>
  </verify>
  <done>GSDXmlGenerator service exists with template compilation and XML generation capabilities</done>
</task>

</tasks>

<verification>
- Handlebars template generates valid XML structure with GSD namespace compliance
- GSDXmlGenerator service can transform SpecificationTemplate to valid GSD XML
- Generated XML follows atomic task principles (max 3 tasks per work item)
- Wave-based execution structure properly handles task dependencies
- Template engine infrastructure ready for export service integration
</verification>

<success_criteria>
- Handlebars template renders valid GSD XML with namespace and wave structure
- GSDXmlGenerator service compiles templates and generates XML from specifications
- All generated XML passes validation and follows GSD atomic task requirements
- Template engine ready for integration with export service
</success_criteria>

<output>
After completion, create `.planning/phases/06-export-engine/06-01b-SUMMARY.md`
</output>