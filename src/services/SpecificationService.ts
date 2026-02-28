import { injectable, inject } from 'inversify';
import { SpecificationTemplate, SpecificationTemplateSchema } from '../domain/entities/SpecificationTemplate.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { AuditTrailService } from './AuditTrailService.js';
import type { ISpecificationService } from '../adapters/ISpecificationService.js';

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

      // Log the specification update to audit trail
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
        }
      );

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
}