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

  /**
   * SPEC-03: Validate specification against template schema
   * Returns detailed validation with section-specific guidance
   */
  validateAgainstSchema(workItemId: string): Promise<SpecificationValidationResult>;

  /**
   * SPEC-05: Get per-section completion status with progress indicators
   * Returns section-level detail for UI display
   */
  getSectionStatus(workItemId: string): Promise<SectionStatusResult>;
}

/**
 * Detailed validation result for SPEC-03
 */
export interface SpecificationValidationResult {
  isValid: boolean;
  overallCompletion: number;
  sectionValidations: Array<{
    section: string;
    status: string;
    isValid: boolean;
    wordCount: number;
    issues: string[];
    guidance: string;
  }>;
  schemaErrors: string[];
  recommendations: string[];
}

/**
 * Per-section status result for SPEC-05
 */
export interface SectionStatusResult {
  workItemId: string;
  overallCompletion: number;
  isComplete: boolean;
  totalWordCount: number;
  sections: Array<{
    name: string;
    status: string;
    completion: number;
    wordCount: number;
    lastUpdated: string;
    progressIndicator: 'not-started' | 'in-progress' | 'review' | 'complete';
  }>;
}