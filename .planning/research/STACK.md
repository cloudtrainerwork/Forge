# Technology Stack Additions for v1.1 Agentic Export

**Project:** FORGE v1.1 - Agentic Export and Specification Systems
**Researched:** 2026-02-27
**Focus:** Stack additions for specification management and multi-format export capabilities

## Executive Summary

Building on v1.0's validated stack (Next.js + Express + Neo4j + PostgreSQL), v1.1 requires targeted additions for specification templates, multi-format export, and document generation. The existing hybrid architecture supports these additions without major changes.

## Recommended Stack Additions

### Template Engine
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| handlebars | 4.7.8 | Template compilation for all export formats | Built-in TypeScript support, faster than Mustache (5-7x), handles complex logic with helpers |

**Rationale:** Handlebars includes native TypeScript definitions (no @types needed) and provides the logic-less templating needed for GSD XML, BMAD stories, SpecKit markdown, and generic formats. Performance advantage over alternatives is critical for bulk export operations.

### Schema Validation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | 4.3.6 | Runtime validation for specification sections | 14x faster than v3, native TypeScript integration, already in frontend stack |

**Rationale:** Zod v4's performance improvements (7x faster array parsing, 6.5x faster object parsing) make it suitable for validating the 6-section specification structure. Consistency with existing frontend validation reduces cognitive load.

### Document Generation
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| xmlbuilder2 | 4.0.0 | GSD XML export generation | Native TypeScript support, modern DOM compliance, replaces legacy xmlbuilder |
| remark | 15.0.1 | Markdown processing and generation | Part of unified ecosystem, handles YAML frontmatter, required for SpecKit format |
| remark-frontmatter | 5.0.0 | YAML frontmatter support | Required for SpecKit .specify files with metadata |
| remark-gfm | 4.0.0 | GitHub Flavored Markdown | BMAD stories and SpecKit compatibility |

**Rationale:**
- **xmlbuilder2** over jstoxml: Better TypeScript integration and DOM compliance for GSD XML format
- **remark ecosystem**: Unified framework required for SpecKit's .specify directory structure and BMAD story markdown generation

### File Operations
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| archiver | 7.0.1 | ZIP file creation for bulk exports | Streaming support for large specification sets, memory efficient |

**Rationale:** Required for "Export All" functionality where users download complete specification sets. Streaming approach prevents memory issues with large projects.

## Export Format Requirements

### 1. GSD XML Format
- **Template:** Handlebars with XML escaping helpers
- **Generation:** xmlbuilder2 for structured XML output
- **Schema:** 6-section specs → GSD planning structure
- **Integration:** Express middleware for /export/gsd endpoint

### 2. BMAD Stories Format
- **Template:** Handlebars for story file generation
- **Structure:** Epic sharding → hyper-detailed stories with architectural context
- **Format:** Markdown with YAML frontmatter via remark-frontmatter
- **Output:** Individual story files per specification section

### 3. SpecKit Format
- **Structure:** .specify directory with spec.md, plan.md, tasks/ folder
- **Template:** Handlebars for .specify templates
- **Processing:** remark + remark-frontmatter for GitHub-compatible markdown
- **Commands:** Generate /speckit.specify, /speckit.plan, /speckit.tasks metadata

### 4. Claude Code Format
- **Structure:** System prompts with specification context
- **Template:** Handlebars for prompt formatting
- **Integration:** Direct specification → Claude prompt structure
- **Output:** Text files ready for Claude Code consumption

### 5. Generic Markdown
- **Template:** Simple Handlebars markdown template
- **Processing:** remark for clean markdown generation
- **Purpose:** Universal format for non-specific AI tools

## Integration Points with Existing Stack

### Backend (Express + TypeScript)
```typescript
// New export service
export interface ExportService {
  exportToGSD(specificationId: string): Promise<string>
  exportToBMAD(specificationId: string): Promise<string[]>
  exportToSpecKit(specificationId: string): Promise<SpecKitBundle>
  exportToClaudeCode(specificationId: string): Promise<string>
  exportToGeneric(specificationId: string): Promise<string>
}
```

**No database changes required** - Specifications already stored as JSONB in PostgreSQL with 6-section structure.

### Frontend (Next.js + React)
- **Export UI:** File download components using browser File API
- **Bulk Operations:** Progress indicators for multi-file exports
- **Preview:** Real-time template rendering before export

## Installation Commands

```bash
# Backend additions
cd backend
npm install handlebars@4.7.8 xmlbuilder2@4.0.0 remark@15.0.1 remark-frontmatter@5.0.0 remark-gfm@4.0.0 archiver@7.0.1

# TypeScript types (some included in packages)
npm install -D @types/archiver
```

## What NOT to Add

### Rejected Alternatives

| Technology | Why Rejected |
|------------|--------------|
| jstoxml | ES modules only, requires bundler, less TypeScript friendly |
| mustache | Slower than Handlebars (5-7x performance difference) |
| ajv | Overkill for specification validation, Zod already in stack |
| ejs/pug | More complex than needed for document templates |
| yaml | Not needed, remark-frontmatter handles YAML parsing |

### Avoided Complexity
- **PDF generation:** Not required for agentic export formats
- **Rich text editors:** Specifications remain JSONB structure
- **Template engines:** Single engine (Handlebars) handles all formats
- **Document databases:** PostgreSQL JSONB sufficient for specifications

## Architecture Integration

### Service Layer Pattern
```
ExportService
├── GSDExporter (xmlbuilder2 + handlebars)
├── BMADExporter (remark + handlebars)
├── SpecKitExporter (remark + frontmatter + handlebars)
├── ClaudeExporter (handlebars)
└── GenericExporter (remark + handlebars)
```

### Template Management
- Templates stored in `/backend/src/templates/`
- Handlebars helpers for format-specific logic
- Validation via Zod schemas before export

### Performance Considerations
- **Streaming:** All exports use streaming for memory efficiency
- **Caching:** Template compilation cached at startup
- **Concurrency:** Bulk exports processed in parallel with worker threads

## Risk Mitigation

### Template Security
- All user data escaped via Handlebars built-in XSS protection
- No eval() or dynamic code generation
- Input validation via Zod before template processing

### Format Compatibility
- GSD XML validated against industrial automation schemas
- BMAD stories tested with actual BMAD-METHOD framework
- SpecKit output tested with GitHub Copilot integration

### Version Stability
- All dependencies on stable major versions (v4+)
- Handlebars v4.7.8 mature and unchanged for 3+ years
- xmlbuilder2 v4+ represents stable API after major rewrite

## Migration Path

1. **Phase 1:** Add template engine and basic export routes
2. **Phase 2:** Implement individual format exporters
3. **Phase 3:** Add bulk export and ZIP functionality
4. **Phase 4:** Integration testing with actual agentic frameworks

**Estimated integration effort:** 3-4 days for core functionality, 2-3 days for comprehensive testing.

## Sources

**HIGH CONFIDENCE:**
- Handlebars 4.7.8: Official npm, includes TypeScript definitions
- Zod 4.3.6: Official releases, performance benchmarks verified
- xmlbuilder2 4.0.0: GitHub releases, TypeScript support confirmed

**MEDIUM CONFIDENCE:**
- BMAD/SpecKit formats: Based on 2025 documentation and framework analysis
- Performance comparisons: Multiple benchmark sources, may vary by use case

**LOW CONFIDENCE:**
- Future format stability: Agentic frameworks evolving rapidly