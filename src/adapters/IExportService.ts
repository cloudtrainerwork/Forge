/**
 * Result type for export operations
 * Contains all necessary data for file download and metadata tracking
 */
export interface ExportResult {
  /** Filename for the exported file */
  filename: string;
  /** File content as Buffer for download operations */
  buffer: Buffer;
  /** MIME content type for proper HTTP headers */
  contentType: string;
  /** Export metadata for tracking and audit purposes */
  metadata: {
    /** Timestamp when export was performed */
    timestamp: string;
    /** Size of exported file in bytes */
    fileSize: number;
    /** Type of export performed (e.g., 'gsd-xml', 'json') */
    exportType: string;
    /** ID of the work item being exported */
    workItemId: string;
    /** Version of the specification at time of export */
    specificationVersion?: string;
  };
}

/**
 * Interface for export service operations
 * Provides business logic for transforming work items into various export formats
 *
 * Following established adapter patterns with clean interface separation
 * and comprehensive error handling for export operations
 */
export interface IExportService {
  /**
   * Export work item specification to GSD XML format
   *
   * Transforms a work item's specification into GSD-compatible XML for
   * use with agentic execution systems. Includes validation to ensure
   * the specification contains sufficient content for export.
   *
   * @param workItemId - Unique identifier of the work item to export
   * @returns Promise resolving to ExportResult with XML buffer and metadata
   * @throws Error when work item not found, specification is empty, or XML generation fails
   */
  exportWorkItemToGSD(workItemId: string): Promise<ExportResult>;

  /**
   * Validate if work item is ready for export
   *
   * Checks if a work item has sufficient specification content to generate
   * a meaningful export. Returns validation details for error handling.
   *
   * @param workItemId - Unique identifier of the work item to validate
   * @returns Promise resolving to validation result with readiness status
   * @throws Error when work item not found or validation fails
   */
  validateExportReadiness(workItemId: string): Promise<{
    /** Whether the work item is ready for export */
    isReady: boolean;
    /** List of validation issues preventing export */
    issues: string[];
    /** Completion percentage of the specification */
    completionPercentage: number;
    /** Sections that have content */
    completeSections: string[];
    /** Sections missing content */
    missingSections: string[];
  }>;

  /**
   * Get export operation metadata without performing the export
   *
   * Provides quick access to export metadata for UI display or
   * preliminary checks without the overhead of full XML generation.
   *
   * @param workItemId - Unique identifier of the work item
   * @returns Promise resolving to export metadata information
   * @throws Error when work item not found
   */
  getExportMetadata(workItemId: string): Promise<{
    /** Estimated filename for the export */
    estimatedFilename: string;
    /** Estimated file size in bytes */
    estimatedSize: number;
    /** Export type that would be generated */
    exportType: string;
    /** Current specification completion status */
    specificationStatus: {
      completionPercentage: number;
      lastModified: string;
      totalWordCount: number;
    };
  }>;
}