import { injectable, inject } from 'inversify';
import type { IExportService, ExportResult } from '../adapters/IExportService.js';
import type { ISpecificationService } from '../adapters/ISpecificationService.js';
import type { AuditTrailService } from './AuditTrailService.js';
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
    @inject('AuditTrailService') private auditTrailService: AuditTrailService,
    @inject('GSDXmlGenerator') private gsdXmlGenerator: GSDXmlGenerator
  ) {}

  /**
   * Export work item specification to GSD XML format
   *
   * Transforms a work item's specification into GSD-compatible XML for
   * use with agentic execution systems. Includes validation, error handling,
   * audit logging, and performance monitoring.
   */
  async exportWorkItemToGSD(workItemId: string): Promise<ExportResult> {
    const startTime = Date.now();
    const operationId = `export-${workItemId}-${Date.now()}`;

    try {
      // Log export operation start
      this.auditTrailService.emit('WORK_ITEM_UPDATED', {
        workItemId,
        type: 'export_started',
        operationId,
        timestamp: new Date().toISOString()
      });

      // Retrieve the specification for the work item
      const specification = await this.specificationService.getSpecification(workItemId);
      if (!specification) {
        // Log failure and throw
        this.auditTrailService.emit('WORK_ITEM_UPDATED', {
          workItemId,
          type: 'export_failed',
          operationId,
          error: 'Work item not found',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Work item ${workItemId} not found`);
      }

      // Validate specification has sufficient content for export
      if (!specification.hasContent()) {
        // Log validation failure
        this.auditTrailService.emit('WORK_ITEM_UPDATED', {
          workItemId,
          type: 'export_failed',
          operationId,
          error: 'Empty specification',
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Cannot export empty specification for work item ${workItemId}. Please add content to at least one section before exporting.`);
      }

      // Check if specification meets minimum completeness threshold
      const completionPercentage = specification.getCompletionPercentage();
      if (completionPercentage < 10) {
        // Log validation failure
        this.auditTrailService.emit('WORK_ITEM_UPDATED', {
          workItemId,
          type: 'export_failed',
          operationId,
          error: 'Specification too incomplete',
          completionPercentage,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Specification for work item ${workItemId} is too incomplete for export (${completionPercentage}% complete). Please add more content before exporting.`);
      }

      // Check for 5-second performance requirement before continuing
      const currentDuration = Date.now() - startTime;
      if (currentDuration > 4000) {
        console.warn(`Export operation ${operationId} approaching 5-second limit at validation phase: ${currentDuration}ms`);
      }

      // Generate GSD plan from specification
      const gsdPlan = this.gsdXmlGenerator.generateGSDPlan(specification, workItemId);

      // Render the plan to XML
      const xmlContent = this.gsdXmlGenerator.renderGSDXml(gsdPlan);

      // Check performance after XML generation
      const xmlGenerationTime = Date.now() - startTime;
      if (xmlGenerationTime > 4500) {
        console.warn(`Export operation ${operationId} approaching 5-second limit at XML generation: ${xmlGenerationTime}ms`);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `forge-workitem-${workItemId}-${timestamp}.xml`;

      // Convert XML string to Buffer for file download
      const buffer = Buffer.from(xmlContent, 'utf-8');

      const finalDuration = Date.now() - startTime;

      // Warn if approaching 5-second limit
      if (finalDuration > 4800) {
        console.warn(`Export operation ${operationId} very close to 5-second limit: ${finalDuration}ms`);
      }

      // Enforce 5-second performance requirement
      if (finalDuration > 5000) {
        // Log performance violation
        this.auditTrailService.emit('WORK_ITEM_UPDATED', {
          workItemId,
          type: 'export_timeout',
          operationId,
          duration: finalDuration,
          fileSize: buffer.length,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Export operation exceeded 5-second performance requirement (${finalDuration}ms). Please try again or contact support.`);
      }

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

      // Log successful export with full metadata
      this.auditTrailService.emit('WORK_ITEM_UPDATED', {
        workItemId,
        type: 'export_completed',
        operationId,
        duration: finalDuration,
        fileSize: buffer.length,
        filename,
        completionPercentage,
        specificationVersion: specification.templateVersion,
        timestamp: new Date().toISOString()
      });

      return exportResult;
    } catch (error) {
      const finalDuration = Date.now() - startTime;

      // Log error with audit trail
      this.auditTrailService.emit('WORK_ITEM_UPDATED', {
        workItemId,
        type: 'export_error',
        operationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: finalDuration,
        timestamp: new Date().toISOString()
      });

      // Follow error message patterns from SpecificationService
      if (error instanceof Error) {
        // Re-throw known errors with context
        if (error.message.includes('not found') || error.message.includes('empty specification') || error.message.includes('too incomplete') || error.message.includes('exceeded 5-second')) {
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