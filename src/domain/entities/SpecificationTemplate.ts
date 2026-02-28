import { IsString, IsOptional, IsEnum, IsNotEmpty, validateOrReject } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { z } from 'zod';

/**
 * Status enum for specification sections
 */
export enum SpecificationSectionStatus {
  EMPTY = 'empty',
  DRAFT = 'draft',
  REVIEW = 'review',
  COMPLETE = 'complete'
}

/**
 * Zod schema for SpecificationSectionStatus
 */
export const SpecificationSectionStatusSchema = z.enum(['empty', 'draft', 'review', 'complete']);

/**
 * Individual specification section with content and metadata
 */
export class SpecificationSection {
  @IsString()
  @Expose()
  content: string;

  @IsEnum(SpecificationSectionStatus)
  @Expose()
  status: SpecificationSectionStatus;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  lastUpdated: Date;

  @Expose()
  wordCount: number;

  constructor(
    content: string = '',
    status: SpecificationSectionStatus = SpecificationSectionStatus.EMPTY,
    lastUpdated?: Date,
    wordCount?: number
  ) {
    this.content = content;
    this.status = status;
    this.lastUpdated = lastUpdated || new Date();
    this.wordCount = wordCount ?? this.calculateWordCount(content);
  }

  /**
   * Calculate word count from content
   */
  private calculateWordCount(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }
    return content.trim().split(/\s+/).length;
  }

  /**
   * Update content and recalculate metadata
   */
  updateContent(newContent: string): SpecificationSection {
    return new SpecificationSection(
      newContent,
      newContent.trim() ? SpecificationSectionStatus.DRAFT : SpecificationSectionStatus.EMPTY,
      new Date(),
      this.calculateWordCount(newContent)
    );
  }

  /**
   * Update status
   */
  updateStatus(newStatus: SpecificationSectionStatus): SpecificationSection {
    return new SpecificationSection(
      this.content,
      newStatus,
      new Date(),
      this.wordCount
    );
  }

  /**
   * Check if section has content
   */
  isEmpty(): boolean {
    return this.status === SpecificationSectionStatus.EMPTY ||
           !this.content ||
           this.content.trim().length === 0;
  }

  /**
   * Check if section is complete
   */
  isComplete(): boolean {
    return this.status === SpecificationSectionStatus.COMPLETE;
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      content: this.content,
      status: this.status,
      lastUpdated: this.lastUpdated.toISOString(),
      wordCount: this.wordCount
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): SpecificationSection {
    return new SpecificationSection(
      data.content || '',
      data.status || SpecificationSectionStatus.EMPTY,
      data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
      data.wordCount || 0
    );
  }
}

/**
 * Zod schema for SpecificationSection
 */
export const SpecificationSectionSchema = z.object({
  content: z.string().default(''),
  status: SpecificationSectionStatusSchema.default('empty'),
  lastUpdated: z.string().datetime().or(z.date()).transform(val =>
    typeof val === 'string' ? val : val.toISOString()
  ).default(() => new Date().toISOString()),
  wordCount: z.number().min(0).default(0)
});

/**
 * Complete specification template with 6 standardized sections
 * Maps to existing 6-dimensional readiness system for consistency
 */
export class SpecificationTemplate {
  @IsString()
  @Expose()
  templateVersion: string;

  @Expose()
  requirements: SpecificationSection;

  @Expose()
  design: SpecificationSection;

  @Expose()
  frontend: SpecificationSection;

  @Expose()
  backend: SpecificationSection;

  @Expose()
  integration: SpecificationSection;

  @Expose()
  test: SpecificationSection;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    requirements?: SpecificationSection,
    design?: SpecificationSection,
    frontend?: SpecificationSection,
    backend?: SpecificationSection,
    integration?: SpecificationSection,
    test?: SpecificationSection,
    templateVersion: string = '1.0',
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.templateVersion = templateVersion;
    this.requirements = requirements || new SpecificationSection();
    this.design = design || new SpecificationSection();
    this.frontend = frontend || new SpecificationSection();
    this.backend = backend || new SpecificationSection();
    this.integration = integration || new SpecificationSection();
    this.test = test || new SpecificationSection();
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate the specification template
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
    await validateOrReject(this.requirements);
    await validateOrReject(this.design);
    await validateOrReject(this.frontend);
    await validateOrReject(this.backend);
    await validateOrReject(this.integration);
    await validateOrReject(this.test);
  }

  /**
   * Get all sections as an array for iteration
   */
  getAllSections(): { name: string; section: SpecificationSection }[] {
    return [
      { name: 'requirements', section: this.requirements },
      { name: 'design', section: this.design },
      { name: 'frontend', section: this.frontend },
      { name: 'backend', section: this.backend },
      { name: 'integration', section: this.integration },
      { name: 'test', section: this.test }
    ];
  }

  /**
   * Calculate overall completion percentage
   */
  getCompletionPercentage(): number {
    const sections = this.getAllSections();
    const totalSections = sections.length;

    if (totalSections === 0) {
      return 0;
    }

    const completedSections = sections.filter(({ section }) => section.isComplete()).length;
    return Math.round((completedSections / totalSections) * 100);
  }

  /**
   * Get sections by status
   */
  getSectionsByStatus(status: SpecificationSectionStatus): string[] {
    return this.getAllSections()
      .filter(({ section }) => section.status === status)
      .map(({ name }) => name);
  }

  /**
   * Get incomplete sections
   */
  getIncompleteSections(): string[] {
    return this.getAllSections()
      .filter(({ section }) => !section.isComplete())
      .map(({ name }) => name);
  }

  /**
   * Update a specific section
   */
  updateSection(sectionName: keyof SpecificationTemplate, newSection: SpecificationSection): SpecificationTemplate {
    const validSections = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    if (!validSections.includes(sectionName as string)) {
      throw new Error(`Invalid section name: ${sectionName}`);
    }

    const updates: Partial<SpecificationTemplate> = {
      [sectionName]: newSection,
      updatedAt: new Date()
    };

    return new SpecificationTemplate(
      sectionName === 'requirements' ? newSection : this.requirements,
      sectionName === 'design' ? newSection : this.design,
      sectionName === 'frontend' ? newSection : this.frontend,
      sectionName === 'backend' ? newSection : this.backend,
      sectionName === 'integration' ? newSection : this.integration,
      sectionName === 'test' ? newSection : this.test,
      this.templateVersion,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Get total word count across all sections
   */
  getTotalWordCount(): number {
    return this.getAllSections().reduce((total, { section }) => total + section.wordCount, 0);
  }

  /**
   * Check if any section has content
   */
  hasContent(): boolean {
    return this.getAllSections().some(({ section }) => !section.isEmpty());
  }

  /**
   * Check if all sections are complete
   */
  isComplete(): boolean {
    return this.getAllSections().every(({ section }) => section.isComplete());
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      templateVersion: this.templateVersion,
      requirements: this.requirements.toJSON(),
      design: this.design.toJSON(),
      frontend: this.frontend.toJSON(),
      backend: this.backend.toJSON(),
      integration: this.integration.toJSON(),
      test: this.test.toJSON(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): SpecificationTemplate {
    return new SpecificationTemplate(
      data.requirements ? SpecificationSection.fromJSON(data.requirements) : undefined,
      data.design ? SpecificationSection.fromJSON(data.design) : undefined,
      data.frontend ? SpecificationSection.fromJSON(data.frontend) : undefined,
      data.backend ? SpecificationSection.fromJSON(data.backend) : undefined,
      data.integration ? SpecificationSection.fromJSON(data.integration) : undefined,
      data.test ? SpecificationSection.fromJSON(data.test) : undefined,
      data.templateVersion || '1.0',
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }

  /**
   * Create a new empty specification template
   */
  static createEmpty(): SpecificationTemplate {
    return new SpecificationTemplate();
  }

  /**
   * Validate business rules for specification template
   */
  static async validateBusinessRules(template: SpecificationTemplate): Promise<string[]> {
    const errors: string[] = [];

    // Template version must be valid
    if (!template.templateVersion || template.templateVersion.trim().length === 0) {
      errors.push('Template version is required');
    }

    // At least one section should have content if template is marked as having progress
    if (template.hasContent()) {
      const sectionsWithContent = template.getAllSections().filter(({ section }) => !section.isEmpty());
      if (sectionsWithContent.length === 0) {
        errors.push('Template claims to have content but all sections are empty');
      }
    }

    // Validate each section
    try {
      await template.validate();
    } catch (validationErrors: any) {
      const messages = Array.isArray(validationErrors)
        ? validationErrors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ')
        : validationErrors.message;
      errors.push(`Section validation errors: ${messages}`);
    }

    return errors;
  }
}

/**
 * Zod schema for complete SpecificationTemplate
 */
export const SpecificationTemplateSchema = z.object({
  templateVersion: z.string().default('1.0'),
  requirements: SpecificationSectionSchema.default({}),
  design: SpecificationSectionSchema.default({}),
  frontend: SpecificationSectionSchema.default({}),
  backend: SpecificationSectionSchema.default({}),
  integration: SpecificationSectionSchema.default({}),
  test: SpecificationSectionSchema.default({}),
  createdAt: z.string().datetime().or(z.date()).transform(val =>
    typeof val === 'string' ? val : val.toISOString()
  ).default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().or(z.date()).transform(val =>
    typeof val === 'string' ? val : val.toISOString()
  ).default(() => new Date().toISOString())
}).transform(data => {
  // Transform the plain object into a SpecificationTemplate instance
  return SpecificationTemplate.fromJSON(data);
});