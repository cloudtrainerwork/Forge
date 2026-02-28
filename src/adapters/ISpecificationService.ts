import { SpecificationTemplate } from '../domain/entities/SpecificationTemplate.js';

/**
 * Interface for specification service operations
 * Provides business logic for managing WorkItem specifications
 */
export interface ISpecificationService {
  /**
   * Update specification for a work item
   * Updates the spec JSONB field with new specification data
   */
  updateSpecification(workItemId: string, specification: SpecificationTemplate): Promise<SpecificationTemplate>;

  /**
   * Get specification for a work item
   * Extracts and validates spec from WorkItem using SpecificationTemplateSchema
   */
  getSpecification(workItemId: string): Promise<SpecificationTemplate | null>;

  /**
   * Validate completeness of specification
   * Returns completion report with section-by-section status
   */
  validateCompleteness(workItemId: string): Promise<{
    completionPercentage: number;
    completeSections: string[];
    incompleteSections: string[];
    emptySections: string[];
    totalWordCount: number;
    isComplete: boolean;
  }>;
}