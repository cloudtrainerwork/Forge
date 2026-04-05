---
phase: 05-specification-foundation
plan: 02b
type: execute
wave: 3
depends_on: ["05-02a"]
files_modified: [
  "frontend/src/components/specifications/SpecificationEditor.tsx",
  "frontend/src/hooks/useSpecification.tsx"
]
autonomous: false

must_haves:
  truths:
    - "User can save specification changes without affecting canvas state"
    - "System preserves specification data separately from ReactFlow state"
    - "User has complete specification editing interface"
  artifacts:
    - path: "frontend/src/components/specifications/SpecificationEditor.tsx"
      provides: "Main specification editing interface"
      min_lines: 100
    - path: "frontend/src/hooks/useSpecification.tsx"
      provides: "Specification state management hook"
      exports: ["useSpecification"]
  key_links:
    - from: "frontend/src/components/specifications/SpecificationEditor.tsx"
      to: "frontend/src/hooks/useSpecification.tsx"
      via: "React Hook Form integration"
      pattern: "useForm.*SpecificationTemplate"
    - from: "frontend/src/hooks/useSpecification.tsx"
      to: "frontend/src/utils/api.ts"
      via: "API calls for CRUD operations"
      pattern: "fetch.*specification"
---

<objective>
Create specification state management and main editing interface

Purpose: Integrate components into complete editing experience with proper state management
Output: Hook for specification state and comprehensive editing component
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
@/Users/briannielsen/forge/.planning/phases/05-specification-foundation/05-02a-SUMMARY.md

# Frontend architecture patterns
@/Users/briannielsen/forge/frontend/src/components/ForgeGraph.tsx
@/Users/briannielsen/forge/frontend/src/utils/api.ts
@/Users/briannielsen/forge/frontend/package.json
</context>

<tasks>

<task type="auto">
  <name>Create useSpecification Hook</name>
  <files>frontend/src/hooks/useSpecification.tsx</files>
  <action>
Create useSpecification hook for specification state management:

1. Accept workItemId parameter and return specification state and operations
2. Use React Hook Form with Zod resolver for form state management
3. Implement auto-save with debounced API calls (500ms delay after typing stops)
4. Provide methods: updateSection, getCompletionPercentage, validateSection
5. Handle loading, error, and success states with proper error messages
6. Include optimistic updates for better UX (update UI immediately, sync to server)
7. Add proper TypeScript types matching SpecificationTemplate from backend
8. Use existing API patterns for HTTP requests
9. Include cleanup on unmount to prevent memory leaks
10. Cache specification data to prevent unnecessary API calls

Hook should integrate seamlessly with React Hook Form and provide clean API for components.
  </action>
  <verify>Hook provides specification CRUD operations and integrates with React Hook Form</verify>
  <done>useSpecification hook manages specification state with auto-save and validation</done>
</task>

<task type="auto">
  <name>Create SpecificationEditor Component</name>
  <files>frontend/src/components/specifications/SpecificationEditor.tsx</files>
  <action>
Create main SpecificationEditor component integrating all specification functionality:

1. Accept workItemId prop and use useSpecification hook for state management
2. Render 6 SpecificationSection components for each section (requirements, design, frontend, backend, integration, test)
3. Include overall completion progress bar at top showing total specification progress
4. Add section navigation tabs/sidebar for easy switching between sections
5. Display save status indicator (saving/saved/error) with appropriate icons
6. Handle validation errors and display them clearly per section
7. Include expand/collapse functionality for better space utilization
8. Add keyboard shortcuts for common actions (Ctrl+S for manual save, Ctrl+Tab for section switching)
9. Responsive design that works on desktop and mobile
10. Use consistent styling and spacing following existing component patterns

Component should provide complete specification editing experience while maintaining performance.
  </action>
  <verify>SpecificationEditor renders all sections and provides complete editing interface</verify>
  <done>SpecificationEditor provides comprehensive specification editing with progress tracking</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete specification editing interface with structured text input, status indicators, and auto-save functionality</what-built>
  <how-to-verify>
    1. Navigate to a work item in the application
    2. Look for specification editing interface (may need to add to existing UI)
    3. Test editing each of the 6 specification sections (requirements, design, frontend, backend, integration, test)
    4. Verify status indicators update as content is added
    5. Confirm auto-save functionality works (changes persist without manual save)
    6. Check that specification state remains separate from canvas interactions
    7. Verify form validation displays appropriate error messages
    8. Test overall progress indicator updates correctly
  </how-to-verify>
  <resume-signal>Type "approved" if specification editing works correctly, or describe issues found</resume-signal>
</task>

</tasks>

<verification>
- useSpecification hook provides complete specification state management
- Components integrate with existing design system and patterns
- Auto-save functionality prevents data loss
</verification>

<success_criteria>
1. User can save specification changes without affecting canvas state
2. System preserves specification data separately from ReactFlow state preventing performance issues
3. User has complete specification editing interface with progress tracking
4. Specification changes auto-save without blocking UI interactions
</success_criteria>

<output>
After completion, create `.planning/phases/05-specification-foundation/05-02b-SUMMARY.md`
</output>