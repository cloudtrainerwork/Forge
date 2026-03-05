import { injectable, inject } from 'inversify';
import type { IExportService, ExportResult } from '../adapters/IExportService.js';
import type { ISpecificationService } from '../adapters/ISpecificationService.js';
import type { GSDXmlGenerator } from './GSDXmlGenerator.js';

/**
 * Core business service for export operations
 * Transforms work item specifications into GSD XML with proper validation and error handling
 *
 * Follows established service patterns with dependency injection structure
 * matching SpecificationService for consistency and maintainability.
 */
@injectable()
export class ExportService implements IExportService {
  constructor(
    @inject('ISpecificationService') private specificationService: ISpecificationService,
    @inject('GSDXmlGenerator') private gsdXmlGenerator: GSDXmlGenerator
  ) {}

  /**
   * Export work item specification to GSD XML format
   *
   * Transforms a work item's specification into GSD-compatible XML for
   * use with agentic execution systems. Includes validation and error handling.
   */
  async exportWorkItemToGSD(workItemId: string): Promise<ExportResult> {
    try {
      // Retrieve the specification for the work item
      const specification = await this.specificationService.getSpecification(workItemId);
      if (!specification) {
        throw new Error(`Work item ${workItemId} not found`);
      }

      // Validate specification has sufficient content for export
      if (!specification.hasContent()) {
        throw new Error(`Cannot export empty specification for work item ${workItemId}. Please add content to at least one section before exporting.`);
      }

      // Check if specification meets minimum completeness threshold
      const completionPercentage = specification.getCompletionPercentage();
      if (completionPercentage < 10) {
        throw new Error(`Specification for work item ${workItemId} is too incomplete for export (${completionPercentage}% complete). Please add more content before exporting.`);
      }

      // Generate GSD plan from specification
      const gsdPlan = this.gsdXmlGenerator.generateGSDPlan(specification, workItemId);

      // Render the plan to XML
      const xmlContent = this.gsdXmlGenerator.renderGSDXml(gsdPlan);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `forge-workitem-${workItemId}-${timestamp}.xml`;

      // Convert XML string to Buffer for file download
      const buffer = Buffer.from(xmlContent, 'utf-8');

      // Create export result with metadata
      const exportResult: ExportResult = {
        filename,
        buffer,
        contentType: 'application/xml',
        metadata: {
          timestamp: new Date().toISOString(),
          fileSize: buffer.length,
          exportType: 'gsd-xml',
          workItemId,
          specificationVersion: specification.templateVersion
        }
      };

      return exportResult;
    } catch (error) {
      // Follow error message patterns from SpecificationService
      if (error instanceof Error) {
        // Re-throw known errors with context
        if (error.message.includes('not found') || error.message.includes('empty specification') || error.message.includes('too incomplete')) {
          throw error;
        }
        // Wrap XML generation errors
        throw new Error(`Failed to export work item to GSD XML: ${error.message}`);
      }
      throw new Error(`Failed to export work item to GSD XML: Unknown error occurred`);
    }
  }

  /**
   * Validate if work item is ready for export
   *
   * Checks specification completeness and content requirements for successful export.
   */
  async validateExportReadiness(workItemId: string): Promise<{
    isReady: boolean;
    issues: string[];
    completionPercentage: number;
    completeSections: string[];
    missingSections: string[];
  }> {
    try {
      const specification = await this.specificationService.getSpecification(workItemId);
      if (!specification) {
        return {
          isReady: false,
          issues: [`Work item ${workItemId} not found`],
          completionPercentage: 0,
          completeSections: [],
          missingSections: ['requirements', 'design', 'frontend', 'backend', 'integration', 'test']
        };
      }

      const issues: string[] = [];
      const completionPercentage = specification.getCompletionPercentage();
      const incompleteSections = specification.getIncompleteSections();

      // Get section status for detailed feedback
      const allSections = specification.getAllSections();
      const completeSections = allSections
        .filter(({ section }) => section.isComplete())
        .map(({ name }) => name);

      // Check for empty specification
      if (!specification.hasContent()) {
        issues.push('Specification is completely empty. Please add content to at least one section.');
      }

      // Check minimum completeness threshold
      if (completionPercentage < 10) {
        issues.push(`Specification is too incomplete for export (${completionPercentage}% complete). Please add more content.`);
      }

      // Check if at least one implementation section has content
      const implementationSections = ['backend', 'frontend', 'integration'];
      const hasImplementationContent = implementationSections.some(sectionName => {
        const section = allSections.find(({ name }) => name === sectionName);
        return section && !section.section.isEmpty();
      });

      if (!hasImplementationContent && completionPercentage > 0) {
        issues.push('No implementation content found. Please add content to backend, frontend, or integration sections.');
      }

      return {
        isReady: issues.length === 0,
        issues,
        completionPercentage,
        completeSections,
        missingSections: incompleteSections
      };
    } catch (error) {
      throw new Error(`Failed to validate export readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get export operation metadata without performing the export
   *
   * Provides quick access to export information for UI display and preliminary checks.
   */
  async getExportMetadata(workItemId: string): Promise<{
    estimatedFilename: string;
    estimatedSize: number;
    exportType: string;
    specificationStatus: {
      completionPercentage: number;
      lastModified: string;
      totalWordCount: number;
    };
  }> {
    try {
      const specification = await this.specificationService.getSpecification(workItemId);
      if (!specification) {
        throw new Error(`Work item ${workItemId} not found`);
      }

      // Generate estimated filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const estimatedFilename = `forge-workitem-${workItemId}-${timestamp}.xml`;

      // Estimate file size based on specification content
      const totalWordCount = specification.getTotalWordCount();
      const estimatedSize = Math.max(2048, totalWordCount * 8); // Minimum 2KB, ~8 bytes per word for XML overhead

      return {
        estimatedFilename,
        estimatedSize,
        exportType: 'gsd-xml',
        specificationStatus: {
          completionPercentage: specification.getCompletionPercentage(),
          lastModified: new Date().toISOString(), // Would be actual last modified from database in real implementation
          totalWordCount
        }
      };
    } catch (error) {
      throw new Error(`Failed to get export metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}