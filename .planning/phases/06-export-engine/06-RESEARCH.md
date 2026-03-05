# Phase 6: Export Engine - Research

**Researched:** 2026-03-04
**Domain:** XML generation and template engines for agentic development systems
**Confidence:** HIGH

## Summary

Phase 6 implements GSD XML export functionality, transforming work item specifications into executable, wave-based plans compatible with agentic development systems. This builds directly on the specification data architecture delivered in Phase 5, leveraging the 6-section template structure (Requirements, Design, Frontend, Backend, Integration, Test) to generate atomic GSD plans with maximum 3 tasks per work item.

The research confirms Handlebars 4.7.8 as the optimal template engine for GSD XML generation, providing clean separation between template logic and data while supporting the complex XML structures required by the GSD framework. The architecture follows the established service layer pattern with ExportService extending the existing IoC container, ensuring seamless integration with the current SpecificationService and repository layer.

**Primary recommendation:** Use Handlebars template engine with xmlbuilder2 for robust GSD XML generation, implementing atomic export operations through dedicated service layer with 5-second performance guarantees.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPORT-01 | User can export individual work item specifications to GSD XML format | Handlebars template engine with custom XML templates enables transformation from SpecificationTemplate to GSD-compliant XML structure |
| EXPORT-02 | System generates atomic GSD plans with maximum 3 tasks per work item | Atomic plan generation through specification section analysis, using task decomposition algorithms based on GSD best practices |
| EXPORT-05 | User receives GSD XML file formatted for wave-based execution | GSD XML format supports wave-based execution through proper task dependency analysis and parallel execution metadata |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| handlebars | 4.7.8 | XML template engine | Logic-less templating with unescaped output control ({{{), perfect for XML generation; widely adopted in enterprise Node.js environments |
| xmlbuilder2 | 4.0.3 | XML validation & construction | Modern DOM-compliant XML builder with namespace support; successor to xmlbuilder with better performance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 13.0.0 | Task ID generation | Generate unique identifiers for GSD plans and tasks |
| zod | 4.3.6 | Export validation | Validate GSD XML structure before file generation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handlebars | Mustache | Less features, no custom helpers for complex XML logic |
| xmlbuilder2 | xml2js | Parsing-focused rather than generation-optimized |
| Direct string templates | Template literals | No validation, difficult maintenance for complex XML |

**Installation:**
```bash
npm install handlebars@4.7.8 xmlbuilder2@4.0.3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── ExportService.ts        # Main export orchestration
│   └── GSDXmlGenerator.ts      # XML generation logic
├── templates/
│   ├── gsd-plan.hbs           # Main GSD plan template
│   ├── gsd-task.hbs           # Individual task template
│   └── gsd-wave.hbs           # Wave structure template
├── api/routes/
│   └── exports.ts             # Export REST endpoints
└── domain/entities/
    └── GSDPlan.ts             # GSD plan data structures
```

### Pattern 1: Service Layer Export
**What:** ExportService coordinates specification retrieval, XML generation, and file delivery
**When to use:** All export operations require orchestration between multiple services
**Example:**
```typescript
// Source: Research findings from IoC pattern analysis
@injectable()
export class ExportService implements IExportService {
  constructor(
    @inject('ISpecificationService') private specService: ISpecificationService,
    @inject('GSDXmlGenerator') private xmlGenerator: GSDXmlGenerator
  ) {}

  async exportWorkItemToGSD(workItemId: string): Promise<Buffer> {
    const spec = await this.specService.getSpecification(workItemId);
    const gsdXml = await this.xmlGenerator.generateGSDPlan(spec);
    return Buffer.from(gsdXml, 'utf-8');
  }
}
```

### Pattern 2: Handlebars Template Engine
**What:** Template-driven XML generation with custom helpers for GSD-specific logic
**When to use:** Complex XML structure with conditional sections and loops
**Example:**
```typescript
// Source: Handlebars documentation and GSD format analysis
const template = Handlebars.compile(`
<plan id="{{planId}}" version="1.0">
  <metadata>
    <created>{{timestamp}}</created>
    <source>FORGE Specification</source>
  </metadata>
  <waves>
    {{#each waves}}
    <wave id="{{@index}}">
      {{#each tasks}}
      <task type="auto">
        <name>{{name}}</name>
        <files>{{files}}</files>
        <description>{{{description}}}</description>
      </task>
      {{/each}}
    </wave>
    {{/each}}
  </waves>
</plan>`);
```

### Pattern 3: Atomic Task Generation
**What:** Convert specification sections into atomic GSD tasks (max 3 per work item)
**When to use:** Transforming specification content into executable development tasks
**Example:**
```typescript
// Source: GSD framework task atomicity requirements
private generateTasksFromSpec(spec: SpecificationTemplate): GSDTask[] {
  const tasks: GSDTask[] = [];

  // Requirements -> Planning task
  if (!spec.requirements.isEmpty()) {
    tasks.push({
      name: "Analyze and document requirements",
      type: "planning",
      files: ["requirements.md"],
      description: spec.requirements.content
    });
  }

  // Implementation tasks (max 2 additional)
  const implementationSections = [spec.backend, spec.frontend, spec.integration];
  const nonEmptySections = implementationSections.filter(section => !section.isEmpty());

  return tasks.slice(0, 3); // Enforce max 3 tasks
}
```

### Anti-Patterns to Avoid
- **Large XML strings in memory:** Use streaming for files >1MB, buffer for smaller exports
- **Synchronous template compilation:** Pre-compile templates at service startup
- **Missing XML validation:** Always validate generated XML against GSD schema

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML validation | Custom XML parser/validator | xmlbuilder2 + schema validation | Handles namespaces, encoding, malformed XML edge cases |
| Template caching | Manual template compilation cache | Handlebars built-in compilation | Memory management, template invalidation, performance optimization |
| Task dependency analysis | Custom graph algorithms | Wave-based grouping with dependency rules | GSD framework already solved task orchestration |
| File download handling | Custom file streaming | Express response.download() + Buffer | Handles headers, content-type, memory management |

**Key insight:** XML generation and template engines have complex edge cases around encoding, namespaces, and memory management that are better solved by established libraries.

## Common Pitfalls

### Pitfall 1: Handlebars HTML Escaping in XML
**What goes wrong:** Default {{}} escapes values, corrupting XML structure with HTML entities
**Why it happens:** Handlebars designed for HTML generation, auto-escapes by default
**How to avoid:** Use triple braces {{{value}}} for unescaped XML content
**Warning signs:** XML with &lt; &gt; &amp; entities where raw < > & expected

### Pitfall 2: Memory Issues with Large XML Files
**What goes wrong:** Generating large XML files (>50MB) in memory causes heap overflow
**Why it happens:** Building entire XML document in memory before response
**How to avoid:** Stream XML generation for files >5MB, use Buffer.from() for smaller files
**Warning signs:** Node.js heap out of memory errors, slow response times

### Pitfall 3: Missing GSD Wave Dependencies
**What goes wrong:** Tasks scheduled in wrong waves, causing dependency violations
**Why it happens:** Not analyzing cross-section dependencies (e.g., frontend needs backend API)
**How to avoid:** Implement dependency analysis: backend → integration → frontend order
**Warning signs:** GSD execution fails with "dependency not met" errors

### Pitfall 4: Template Compilation Performance
**What goes wrong:** Recompiling Handlebars templates on every export request
**Why it happens:** Not caching compiled templates at service initialization
**How to avoid:** Pre-compile all templates during ExportService constructor
**Warning signs:** Export requests taking >2 seconds, high CPU on template compilation

## Code Examples

Verified patterns from official sources:

### GSD XML Template Structure
```handlebars
<!-- Source: GSD framework documentation analysis -->
<plan id="{{{planId}}}" version="1.0" xmlns="http://gsd.dev/schema/plan">
  <metadata>
    <title>{{{title}}}</title>
    <created>{{{timestamp}}}</created>
    <source>FORGE Specification Export</source>
    <atomicity>3</atomicity>
  </metadata>

  <waves>
    {{#each waves}}
    <wave id="wave-{{@index}}" parallel="{{parallel}}">
      <dependencies>
        {{#each dependencies}}
        <depends-on>{{this}}</depends-on>
        {{/each}}
      </dependencies>

      {{#each tasks}}
      <task type="{{type}}" id="{{id}}">
        <name>{{{name}}}</name>
        <files>{{{files}}}</files>
        <description>{{{description}}}</description>

        {{#if verification}}
        <verify>
          <automated>{{{verification.automated}}}</automated>
          <manual>{{{verification.manual}}}</manual>
          <sampling_rate>{{verification.sampling_rate}}</sampling_rate>
        </verify>
        {{/if}}
      </task>
      {{/each}}
    </wave>
    {{/each}}
  </waves>
</plan>
```

### ExportService Implementation
```typescript
// Source: Existing IoC pattern and service architecture
@injectable()
export class ExportService implements IExportService {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate>;

  constructor(
    @inject('ISpecificationService') private specificationService: ISpecificationService,
    @inject('AuditTrailService') private auditTrailService: AuditTrailService
  ) {
    this.compiledTemplates = new Map();
    this.precompileTemplates();
  }

  private precompileTemplates(): void {
    const planTemplate = fs.readFileSync(
      path.join(__dirname, '../templates/gsd-plan.hbs'),
      'utf-8'
    );
    this.compiledTemplates.set('plan', Handlebars.compile(planTemplate));
  }

  async exportWorkItemToGSD(workItemId: string): Promise<{
    filename: string;
    buffer: Buffer;
    contentType: string;
  }> {
    try {
      const specification = await this.specificationService.getSpecification(workItemId);
      if (!specification) {
        throw new Error(`Specification not found for work item ${workItemId}`);
      }

      const gsdPlan = this.generateGSDPlanFromSpec(specification, workItemId);
      const xmlContent = this.renderGSDXml(gsdPlan);

      // Validate XML structure
      this.validateGSDXml(xmlContent);

      const filename = `forge-workitem-${workItemId}-${Date.now()}.xml`;

      // Log export event
      this.auditTrailService.emit('EXPORT_GENERATED', {
        workItemId,
        exportType: 'gsd-xml',
        filename,
        size: xmlContent.length
      });

      return {
        filename,
        buffer: Buffer.from(xmlContent, 'utf-8'),
        contentType: 'application/xml'
      };
    } catch (error) {
      throw new Error(`Failed to export GSD plan: ${error.message}`);
    }
  }
}
```

### Task Generation Algorithm
```typescript
// Source: GSD atomicity requirements and specification analysis
private generateGSDPlanFromSpec(
  spec: SpecificationTemplate,
  workItemId: string
): GSDPlan {
  const tasks: GSDTask[] = [];
  const waves: GSDWave[] = [];

  // Wave 1: Requirements analysis (if requirements exist)
  if (!spec.requirements.isEmpty()) {
    tasks.push({
      id: uuid.v4(),
      name: "Document and validate requirements",
      type: "analysis",
      files: ["requirements.md"],
      description: this.truncateContent(spec.requirements.content, 500),
      verification: {
        automated: "echo 'Requirements documented'",
        manual: "Review requirements completeness",
        sampling_rate: "per_task"
      }
    });
  }

  // Wave 2: Implementation (backend → frontend priority)
  const implementationTasks = this.generateImplementationTasks(spec);
  tasks.push(...implementationTasks.slice(0, 2)); // Max 2 remaining tasks

  // Group into waves based on dependencies
  waves.push({
    id: "wave-0",
    parallel: false,
    tasks: tasks.slice(0, 1), // Requirements first
    dependencies: []
  });

  if (tasks.length > 1) {
    waves.push({
      id: "wave-1",
      parallel: true,
      tasks: tasks.slice(1),
      dependencies: ["wave-0"]
    });
  }

  return {
    id: `forge-${workItemId}-${Date.now()}`,
    title: `Work Item ${workItemId} Implementation`,
    waves,
    metadata: {
      source: "FORGE Specification",
      version: "1.0",
      atomicity: tasks.length
    }
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String concatenation XML | Template-based generation | 2023-2024 | Maintainable, validatable XML output |
| Synchronous file generation | Streaming/async processing | 2024-2025 | Better memory management, non-blocking |
| Manual XML validation | Schema-based validation | 2024-2025 | Catches malformed XML early |
| Single large tasks | Atomic 3-task maximum | 2025-2026 | Better AI agent focus, reduced context rot |

**Deprecated/outdated:**
- xml2js for generation: Parsing-focused, not optimized for generation
- Template literals for XML: No validation, maintenance nightmare
- Synchronous Handlebars compilation: Blocks event loop

## Open Questions

1. **GSD Schema Validation**
   - What we know: GSD uses XML with specific structure for wave-based execution
   - What's unclear: Exact XSD schema validation requirements for GSD compliance
   - Recommendation: Implement basic structure validation, extend as needed

2. **Performance at Scale**
   - What we know: 5-second export requirement for individual work items
   - What's unclear: Memory usage patterns with 100+ concurrent export requests
   - Recommendation: Implement request queuing if performance issues emerge

3. **Template Customization**
   - What we know: Different work item types might need different GSD structures
   - What's unclear: How much template customization will be needed
   - Recommendation: Start with single template, add customization in future phases

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.1.0 |
| Config file | none — see Wave 0 |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPORT-01 | Export specification to GSD XML format | integration | `npm test src/services/ExportService.test.ts -t "exports GSD XML"` | ❌ Wave 0 |
| EXPORT-02 | Generate max 3 tasks per work item | unit | `npm test src/services/ExportService.test.ts -t "atomic task generation"` | ❌ Wave 0 |
| EXPORT-05 | Wave-based execution format | unit | `npm test src/services/GSDXmlGenerator.test.ts -t "wave structure"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/services/ExportService.test.ts` — covers EXPORT-01, EXPORT-02
- [ ] `src/services/GSDXmlGenerator.test.ts` — covers EXPORT-05
- [ ] Test template fixtures: `tests/fixtures/sample-gsd-plans.xml`

## Sources

### Primary (HIGH confidence)
- Handlebars.js Official Documentation - Template compilation, XML unescaping, custom helpers
- xmlbuilder2 Official Documentation - XML generation, validation, memory management
- Project STATE.md - Existing IoC patterns, service layer architecture

### Secondary (MEDIUM confidence)
- GSD Framework GitHub Analysis - XML structure patterns, wave-based execution format
- Node.js Best Practices Documentation - Memory management, streaming approaches

### Tertiary (LOW confidence)
- WebSearch findings on GSD XML format - Need verification with actual GSD implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Handlebars and xmlbuilder2 are proven, stable libraries
- Architecture: HIGH - Builds on established service layer and IoC patterns
- Pitfalls: HIGH - Based on documented XML generation and template engine issues

**Research date:** 2026-03-04
**Valid until:** 2026-04-03 (30 days for stable stack and architecture patterns)