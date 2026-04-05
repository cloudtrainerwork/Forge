import { injectable, inject } from 'inversify';
import { SpecificationTemplate, SpecificationTemplateSchema, SpecificationSectionStatus } from '../domain/entities/SpecificationTemplate.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { AuditTrailService } from './AuditTrailService.js';
import type { ISpecificationService, SpecificationValidationResult, SectionStatusResult } from '../adapters/ISpecificationService.js';

/**
 * Business service for specification operations
 * Provides CRUD operations for WorkItem specifications with validation and audit logging
 */
@injectable()
export class SpecificationService implements ISpecificationService {
  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository,
    @inject('AuditTrailService') private auditTrailService: AuditTrailService
  ) {}

  /**
   * Update specification for a work item
   * Updates the spec JSONB field with new specification data
   */
  async updateSpecification(workItemId: string, specification: SpecificationTemplate): Promise<SpecificationTemplate> {
    try {
      // Get the existing work item
      const existingWorkItem = await this.workItemRepository.findById(workItemId);
      if (!existingWorkItem) {
        throw new Error(`Work item ${workItemId} not found`);
      }

      // Validate the specification using business rules
      const validationErrors = await SpecificationTemplate.validateBusinessRules(specification);
      if (validationErrors.length > 0) {
        throw new Error(`Specification validation failed: ${validationErrors.join(', ')}`);
      }

      // Update the work item's spec field with the specification
      const specData = specification.toJSON();
      const updatedWorkItem = existingWorkItem.updateSpec({ specification: specData });

      // Save to repository
      const savedWorkItem = await this.workItemRepository.save(updatedWorkItem);

      // Log the specification update to audit trail (best-effort)
      try {
        await this.workItemRepository.logStateChange(
          workItemId,
          'WORK_ITEM_UPDATED',
          {
            specificationUpdated: true,
            completionPercentage: specification.getCompletionPercentage(),
            incompleteSections: specification.getIncompleteSections(),
            totalWordCount: specification.getTotalWordCount()
          },
          {
            operation: 'updateSpecification',
            templateVersion: specification.templateVersion
          },
          existingWorkItem.tenantId
        );
      } catch (auditError) {
        console.warn(`[SpecificationService] Audit log failed for ${workItemId}:`, auditError);
      }

      // Emit audit event for specification update
      this.auditTrailService.emit('WORK_ITEM_UPDATED', {
        workItemId,
        type: 'specification_updated',
        completionPercentage: specification.getCompletionPercentage(),
        incompleteSections: specification.getIncompleteSections(),
        totalWordCount: specification.getTotalWordCount()
      });

      return specification;
    } catch (error) {
      throw new Error(`Failed to update specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get specification for a work item
   * Extracts and validates spec from WorkItem using SpecificationTemplateSchema
   */
  async getSpecification(workItemId: string): Promise<SpecificationTemplate | null> {
    try {
      // Get the work item from repository
      const workItem = await this.workItemRepository.findById(workItemId);
      if (!workItem) {
        return null;
      }

      // Check if work item has specification data in the spec field
      const specData = workItem.spec?.specification;
      if (!specData) {
        // Return empty specification template if none exists
        return SpecificationTemplate.createEmpty();
      }

      // Validate and parse the specification using Zod schema
      try {
        const validatedSpec = SpecificationTemplateSchema.parse(specData);
        return validatedSpec;
      } catch (parseError) {
        // If parsing fails, log warning and return empty template
        console.warn(`Invalid specification data for work item ${workItemId}:`, parseError);
        return SpecificationTemplate.createEmpty();
      }
    } catch (error) {
      throw new Error(`Failed to get specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate completeness of specification
   * Returns completion report with section-by-section status
   */
  async validateCompleteness(workItemId: string): Promise<{
    completionPercentage: number;
    completeSections: string[];
    incompleteSections: string[];
    emptySections: string[];
    totalWordCount: number;
    isComplete: boolean;
  }> {
    try {
      // Get the specification for the work item
      const specification = await this.getSpecification(workItemId);
      if (!specification) {
        // Return empty completion report if no specification exists
        return {
          completionPercentage: 0,
          completeSections: [],
          incompleteSections: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'],
          emptySections: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'],
          totalWordCount: 0,
          isComplete: false
        };
      }

      // Generate completion report
      const allSections = specification.getAllSections();
      const completeSections = allSections
        .filter(({ section }) => section.isComplete())
        .map(({ name }) => name);

      const incompleteSections = specification.getIncompleteSections();

      const emptySections = allSections
        .filter(({ section }) => section.isEmpty())
        .map(({ name }) => name);

      return {
        completionPercentage: specification.getCompletionPercentage(),
        completeSections,
        incompleteSections,
        emptySections,
        totalWordCount: specification.getTotalWordCount(),
        isComplete: specification.isComplete()
      };
    } catch (error) {
      throw new Error(`Failed to validate completeness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SPEC-03: Validate specification against template schema
   * Provides detailed per-section validation with guidance for incomplete sections
   */
  async validateAgainstSchema(workItemId: string): Promise<SpecificationValidationResult> {
    try {
      const specification = await this.getSpecification(workItemId);
      if (!specification) {
        return {
          isValid: false,
          overallCompletion: 0,
          sectionValidations: [],
          schemaErrors: [`Work item ${workItemId} not found or has no specification`],
          recommendations: ['Create a specification template for this work item before validation.']
        };
      }

      // Validate against Zod schema
      const schemaErrors: string[] = [];
      try {
        SpecificationTemplateSchema.parse(specification.toJSON());
      } catch (zodError: any) {
        if (zodError.errors) {
          for (const err of zodError.errors) {
            schemaErrors.push(`${err.path.join('.')}: ${err.message}`);
          }
        }
      }

      // Validate business rules
      const businessErrors = await SpecificationTemplate.validateBusinessRules(specification);
      schemaErrors.push(...businessErrors);

      // Section-level validation with guidance
      const allSections = specification.getAllSections();
      const sectionGuidance: Record<string, string> = {
        requirements: 'Define user stories, acceptance criteria, and functional requirements. Include measurable success criteria.',
        design: 'Document architecture decisions, data models, and system design. Include diagrams or component descriptions.',
        frontend: 'Specify UI components, layouts, user flows, and interaction patterns. Reference design system elements.',
        backend: 'Detail API endpoints, data processing logic, database operations, and service integrations.',
        integration: 'Describe how components connect, API contracts, event flows, and third-party service interactions.',
        test: 'Outline test strategy, test cases, coverage targets, and quality gates. Include unit, integration, and E2E tests.'
      };

      const minWordCounts: Record<string, number> = {
        requirements: 50,
        design: 30,
        frontend: 30,
        backend: 30,
        integration: 20,
        test: 20
      };

      const sectionValidations = allSections.map(({ name, section }) => {
        const issues: string[] = [];
        const minWords = minWordCounts[name] || 20;

        if (section.isEmpty()) {
          issues.push(`Section is empty. Add content to proceed.`);
        } else if (section.wordCount < minWords) {
          issues.push(`Section has ${section.wordCount} words, minimum recommended is ${minWords}.`);
        }

        if (section.status === SpecificationSectionStatus.DRAFT && section.wordCount >= minWords) {
          issues.push('Section has sufficient content but is still in draft. Consider advancing to review.');
        }

        return {
          section: name,
          status: section.status,
          isValid: section.isComplete() || (section.wordCount >= minWords && section.status !== SpecificationSectionStatus.EMPTY),
          wordCount: section.wordCount,
          issues,
          guidance: issues.length > 0 ? sectionGuidance[name] || 'Add content to this section.' : 'Section meets requirements.'
        };
      });

      // Generate recommendations
      const recommendations: string[] = [];
      const emptySections = sectionValidations.filter(v => v.status === SpecificationSectionStatus.EMPTY);
      const draftSections = sectionValidations.filter(v => v.status === SpecificationSectionStatus.DRAFT);

      if (emptySections.length > 0) {
        recommendations.push(`Fill in empty sections: ${emptySections.map(s => s.section).join(', ')}.`);
      }
      if (draftSections.length > 0) {
        recommendations.push(`Review and advance draft sections: ${draftSections.map(s => s.section).join(', ')}.`);
      }
      if (specification.getCompletionPercentage() < 100 && emptySections.length === 0) {
        recommendations.push('All sections have content. Mark completed sections as "complete" to reach 100%.');
      }

      const isValid = schemaErrors.length === 0 && sectionValidations.every(v => v.isValid);

      return {
        isValid,
        overallCompletion: specification.getCompletionPercentage(),
        sectionValidations,
        schemaErrors,
        recommendations
      };
    } catch (error) {
      throw new Error(`Failed to validate against schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SPEC-05: Get per-section completion status with progress indicators
   * Returns section-level detail with visual progress indicator mapping
   */
  async getSectionStatus(workItemId: string): Promise<SectionStatusResult> {
    try {
      const specification = await this.getSpecification(workItemId);
      if (!specification) {
        return {
          workItemId,
          overallCompletion: 0,
          isComplete: false,
          totalWordCount: 0,
          sections: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'].map(name => ({
            name,
            status: SpecificationSectionStatus.EMPTY,
            completion: 0,
            wordCount: 0,
            lastUpdated: new Date().toISOString(),
            progressIndicator: 'not-started' as const
          }))
        };
      }

      const allSections = specification.getAllSections();
      const sections = allSections.map(({ name, section }) => {
        // Map section status to progress indicator
        let progressIndicator: 'not-started' | 'in-progress' | 'review' | 'complete';
        let completion: number;

        switch (section.status) {
          case SpecificationSectionStatus.COMPLETE:
            progressIndicator = 'complete';
            completion = 100;
            break;
          case SpecificationSectionStatus.REVIEW:
            progressIndicator = 'review';
            completion = 75;
            break;
          case SpecificationSectionStatus.DRAFT:
            progressIndicator = 'in-progress';
            completion = 40;
            break;
          default:
            progressIndicator = 'not-started';
            completion = 0;
        }

        return {
          name,
          status: section.status,
          completion,
          wordCount: section.wordCount,
          lastUpdated: section.lastUpdated.toISOString(),
          progressIndicator
        };
      });

      return {
        workItemId,
        overallCompletion: specification.getCompletionPercentage(),
        isComplete: specification.isComplete(),
        totalWordCount: specification.getTotalWordCount(),
        sections
      };
    } catch (error) {
      throw new Error(`Failed to get section status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}