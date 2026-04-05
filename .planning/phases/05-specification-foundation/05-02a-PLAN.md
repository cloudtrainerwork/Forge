---
phase: 05-specification-foundation
plan: 02a
type: execute
wave: 2
depends_on: ["05-01"]
files_modified: [
  "frontend/src/components/specifications/SpecificationSection.tsx",
  "frontend/src/components/specifications/SpecificationStatusIndicator.tsx",
  "frontend/src/utils/api.ts"
]
autonomous: false

must_haves:
  truths:
    - "User can edit specification sections with structured text input"
    - "User can see section completion status in real-time"
    - "System has API endpoints for specification operations"
  artifacts:
    - path: "frontend/src/components/specifications/SpecificationSection.tsx"
      provides: "Individual section editor component"
      min_lines: 50
    - path: "frontend/src/components/specifications/SpecificationStatusIndicator.tsx"
      provides: "Visual status indicator component"
      min_lines: 30
    - path: "frontend/src/utils/api.ts"
      provides: "API endpoints for specification operations"
      contains: "specification"
  key_links:
    - from: "frontend/src/components/specifications/SpecificationSection.tsx"
      to: "react-hook-form"
      via: "Form control integration"
      pattern: "Controller.*name=.*section"
---

<objective>
Create core specification UI components and API functions

Purpose: Build reusable components for specification editing and establish API layer
Output: React components with form integration and API utilities
</objective>

<execution_context>
@/Users/briannielsen/.claude/get-shit-done/workflows/execute-plan.md
@/Users/briannielsen/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/briannielsen/forge/.planning/PROJECT.md
@/Users/briannielsen/forge/.planning/ROADMAP.md
@/Users/briannielsen/forge/.planning/STATE.md
@/Users/briannielsen/forge/.planning/phases/05-specification-foundation/05-RESEARCH.md
@/Users/briannielsen/forge/.planning/phases/05-specification-foundation/05-01-SUMMARY.md

# Frontend architecture patterns
@/Users/briannielsen/forge/frontend/src/components/ForgeGraph.tsx
@/Users/briannielsen/forge/frontend/src/utils/api.ts
@/Users/briannielsen/forge/frontend/package.json
</context>

<tasks>

<task type="auto">
  <name>Create SpecificationSection Component</name>
  <files>frontend/src/components/specifications/SpecificationSection.tsx</files>
  <action>
Create reusable SpecificationSection component following research recommendations:

1. Accept props: sectionName, control (from React Hook Form), sectionData, onStatusChange
2. Use Controller from react-hook-form to manage textarea input
3. Add section header with completion status indicator (empty/draft/review/complete)
4. Implement auto-save functionality with debounced API calls (500ms delay)
5. Calculate and display word count in real-time
6. Add visual states: border colors for section status (gray/yellow/orange/green)
7. Include section-specific placeholder text (e.g., "Define functional requirements..." for requirements section)
8. Handle loading and error states gracefully
9. Use Tailwind CSS following existing component patterns
10. Add proper TypeScript types for all props

Component should be controlled by parent form but handle its own status updates and word counting.
  </action>
  <verify>Component renders without errors and integrates with React Hook Form Controller</verify>
  <done>SpecificationSection component provides structured text input with status tracking and auto-save</done>
</task>

<task type="auto">
  <name>Create Specification Status Indicator</name>
  <files>frontend/src/components/specifications/SpecificationStatusIndicator.tsx</files>
  <action>
Create SpecificationStatusIndicator component for visual completion tracking:

1. Accept props: status ('empty' | 'draft' | 'review' | 'complete'), size ('sm' | 'md' | 'lg')
2. Render circular progress indicator using existing design patterns
3. Color coding: gray (empty), yellow (draft), orange (review), green (complete)
4. Include percentage completion and status text
5. Add hover tooltip with detailed status information
6. Support different sizes for use in section headers vs overview displays
7. Use consistent styling with existing UI components
8. Add proper accessibility attributes (aria-label, role)

Follow existing component patterns from ForgeGraph.tsx and other components for consistency.
  </action>
  <verify>Status indicator renders correctly for all status types and sizes</verify>
  <done>SpecificationStatusIndicator provides visual status feedback with accessibility support</done>
</task>

<task type="auto">
  <name>Extend API Utils</name>
  <files>frontend/src/utils/api.ts</files>
  <action>
Add specification-related API functions to existing api.ts file:

1. Add getSpecification(workItemId: string) function that fetches specification from backend
2. Add updateSpecification(workItemId: string, specification: SpecificationTemplate) function
3. Add updateSpecificationSection(workItemId: string, section: string, content: SpecificationSection) function for granular updates
4. Add validateSpecification(workItemId: string) function that returns completion status
5. Include proper error handling with meaningful error messages
6. Use existing API patterns and base URL configuration
7. Add proper TypeScript types for request/response objects
8. Include request deduplication to prevent duplicate API calls
9. Add retry logic for failed requests (3 retries with exponential backoff)
10. Maintain consistency with existing API function patterns

Functions should integrate with existing error handling and authentication patterns.
  </action>
  <verify>API functions handle specification operations and integrate with existing patterns</verify>
  <done>API utilities support specification CRUD operations with proper error handling</done>
</task>

</tasks>

<verification>
- All React components compile without TypeScript errors
- API functions handle specification operations correctly
- Components integrate with existing design system and patterns
</verification>

<success_criteria>
1. User can edit specification sections with structured text input
2. User can see real-time completion status for each specification section
3. System has API endpoints for specification operations
</success_criteria>

<output>
After completion, create `.planning/phases/05-specification-foundation/05-02a-SUMMARY.md`
</output>