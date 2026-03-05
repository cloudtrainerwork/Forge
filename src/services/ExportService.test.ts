import { describe, it, expect, beforeEach } from 'vitest';
import { ExportService } from './ExportService.js';
import { SpecificationTemplate, SpecificationSection } from '../domain/entities/SpecificationTemplate.js';
import { GSDPlan } from '../domain/entities/GSDPlan.js';

// Mock implementations for testing
class MockSpecificationService {
  private specifications = new Map<string, SpecificationTemplate>();

  async getSpecification(workItemId: string): Promise<SpecificationTemplate | null> {
    return this.specifications.get(workItemId) || null;
  }

  setSpecification(workItemId: string, spec: SpecificationTemplate): void {
    this.specifications.set(workItemId, spec);
  }
}

class MockGSDXmlGenerator {
  generateGSDPlan(spec: SpecificationTemplate, workItemId: string): GSDPlan {
    // Create a simple mock plan
    return GSDPlan.createEmpty(`Test Plan for ${workItemId}`);
  }

  renderGSDXml(plan: GSDPlan): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<gsd-plan xmlns="http://gsd.dev/schema/plan">
  <metadata>
    <title>${plan.title}</title>
    <id>${plan.id}</id>
  </metadata>
  <waves></waves>
</gsd-plan>`;
  }
}

describe('ExportService', () => {
  let exportService: ExportService;
  let mockSpecService: MockSpecificationService;
  let mockXmlGenerator: MockGSDXmlGenerator;

  beforeEach(() => {
    mockSpecService = new MockSpecificationService();
    mockXmlGenerator = new MockGSDXmlGenerator();

    // Create ExportService with mocked dependencies
    exportService = new (class extends ExportService {
      constructor() {
        super(mockSpecService as any, mockXmlGenerator as any);
      }
    })();
  });

  describe('exportWorkItemToGSD', () => {
    it('exports GSD XML for valid specification', async () => {
      // Arrange: Create a specification with content
      const spec = new SpecificationTemplate();
      spec.backend = new SpecificationSection('API implementation details', 'complete' as any);
      mockSpecService.setSpecification('test-work-item', spec);

      // Act: Export the work item
      const result = await exportService.exportWorkItemToGSD('test-work-item');

      // Assert: Verify export result
      expect(result).to.have.property('filename');
      expect(result.filename).to.match(/^forge-workitem-test-work-item-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.xml$/);
      expect(result).to.have.property('buffer');
      expect(result.buffer).to.be.instanceOf(Buffer);
      expect(result).to.have.property('contentType', 'application/xml');
      expect(result).to.have.property('metadata');
      expect(result.metadata).to.have.property('exportType', 'gsd-xml');
      expect(result.metadata).to.have.property('workItemId', 'test-work-item');

      // Verify the XML content
      const xmlContent = result.buffer.toString('utf-8');
      expect(xmlContent).to.include('<?xml version="1.0"');
      expect(xmlContent).to.include('gsd-plan');
    });

    it('throws error for non-existent work item', async () => {
      // Act & Assert: Try to export non-existent work item
      try {
        await exportService.exportWorkItemToGSD('non-existent');
        expect.fail('Should have thrown error for non-existent work item');
      } catch (error) {
        expect(error.message).to.include('Work item non-existent not found');
      }
    });

    it('throws error for empty specification', async () => {
      // Arrange: Create empty specification
      const emptySpec = SpecificationTemplate.createEmpty();
      mockSpecService.setSpecification('empty-item', emptySpec);

      // Act & Assert: Try to export empty specification
      try {
        await exportService.exportWorkItemToGSD('empty-item');
        expect.fail('Should have thrown error for empty specification');
      } catch (error) {
        expect(error.message).to.include('Cannot export empty specification');
      }
    });
  });

  describe('validateExportReadiness', () => {
    it('returns not ready for empty specification', async () => {
      // Arrange: Create empty specification
      const emptySpec = SpecificationTemplate.createEmpty();
      mockSpecService.setSpecification('empty-item', emptySpec);

      // Act: Validate export readiness
      const result = await exportService.validateExportReadiness('empty-item');

      // Assert: Should not be ready
      expect(result.isReady).to.be.false;
      expect(result.issues).to.include('Specification is completely empty. Please add content to at least one section.');
      expect(result.completionPercentage).to.equal(0);
    });

    it('returns not ready for non-existent work item', async () => {
      // Act: Validate non-existent work item
      const result = await exportService.validateExportReadiness('non-existent');

      // Assert: Should not be ready
      expect(result.isReady).to.be.false;
      expect(result.issues).to.include('Work item non-existent not found');
    });
  });

  describe('getExportMetadata', () => {
    it('returns metadata for valid work item', async () => {
      // Arrange: Create specification with content
      const spec = new SpecificationTemplate();
      spec.backend = new SpecificationSection('API implementation', 'complete' as any);
      mockSpecService.setSpecification('test-item', spec);

      // Act: Get export metadata
      const result = await exportService.getExportMetadata('test-item');

      // Assert: Verify metadata
      expect(result).to.have.property('estimatedFilename');
      expect(result.estimatedFilename).to.include('forge-workitem-test-item');
      expect(result).to.have.property('exportType', 'gsd-xml');
      expect(result).to.have.property('specificationStatus');
      expect(result.specificationStatus).to.have.property('completionPercentage');
    });

    it('throws error for non-existent work item', async () => {
      // Act & Assert: Try to get metadata for non-existent work item
      try {
        await exportService.getExportMetadata('non-existent');
        expect.fail('Should have thrown error for non-existent work item');
      } catch (error) {
        expect(error.message).to.include('Work item non-existent not found');
      }
    });
  });
});