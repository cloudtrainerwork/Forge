import { Router, Request, Response } from 'express';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { SpecificationTemplate, SpecificationTemplateSchema, SpecificationSection, SpecificationSectionStatus } from '../../domain/entities/SpecificationTemplate.js';

export default function specificationsRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  // GET /api/specifications/:workItemId
  router.get('/:workItemId', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId) {
        return res.status(400).json({ error: 'Work item ID is required' });
      }

      const specificationService = serviceFactory.getSpecificationService();
      const specification = await specificationService.getSpecification(workItemId);

      // If no specification exists, return an empty template
      if (!specification) {
        const emptySpec = new SpecificationTemplate();
        emptySpec.templateVersion = '1.0';
        emptySpec.requirements = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.design = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.frontend = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.backend = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.integration = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.test = new SpecificationSection('', SpecificationSectionStatus.EMPTY);
        emptySpec.createdAt = new Date();
        emptySpec.updatedAt = new Date();
        return res.json({ data: emptySpec });
      }

      res.json({ data: specification });
    } catch (error) {
      console.error('Error getting specification:', error);
      res.status(500).json({ error: 'Failed to retrieve specification' });
    }
  });

  // PUT /api/specifications/:workItemId
  router.put('/:workItemId', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;
      const specification = req.body;

      if (!workItemId) {
        return res.status(400).json({ error: 'Work item ID is required' });
      }

      if (!specification) {
        return res.status(400).json({ error: 'Specification data is required' });
      }

      // Parse through Zod schema to get a proper SpecificationTemplate instance
      const parsedSpec = SpecificationTemplateSchema.parse(specification);

      const specificationService = serviceFactory.getSpecificationService();
      const updatedSpec = await specificationService.updateSpecification(workItemId, parsedSpec);

      res.json({ data: updatedSpec });
    } catch (error) {
      console.error('Error updating specification:', error);
      res.status(500).json({ error: 'Failed to update specification' });
    }
  });

  // PATCH/PUT /api/specifications/:workItemId/sections/:sectionName
  const sectionHandler = async (req: Request, res: Response) => {
    try {
      const { workItemId, sectionName } = req.params;
      const sectionData = req.body;

      if (!workItemId) {
        return res.status(400).json({ error: 'Work item ID is required' });
      }

      if (!sectionName) {
        return res.status(400).json({ error: 'Section name is required' });
      }

      const validSections = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
      if (!validSections.includes(sectionName)) {
        return res.status(400).json({ error: `Invalid section name. Must be one of: ${validSections.join(', ')}` });
      }

      const specificationService = serviceFactory.getSpecificationService();

      // Get current specification
      const currentSpec = await specificationService.getSpecification(workItemId);

      if (!currentSpec) {
        return res.status(404).json({ error: 'Specification not found' });
      }

      // Build a proper SpecificationSection instance from the request data
      const updatedSection = new SpecificationSection(
        sectionData.content || '',
        sectionData.status || SpecificationSectionStatus.DRAFT,
        new Date(),
        undefined // wordCount auto-calculated
      );

      // Clone current spec with the updated section
      const updatedSpec = SpecificationTemplate.fromJSON({
        ...currentSpec.toJSON(),
        [sectionName]: updatedSection.toJSON(),
        updatedAt: new Date().toISOString()
      });

      const result = await specificationService.updateSpecification(workItemId, updatedSpec);

      // Return the updated section
      const returnSection = result[sectionName as keyof SpecificationTemplate];
      res.json({ data: returnSection });
    } catch (error) {
      console.error('Error updating specification section:', error);
      res.status(500).json({ error: 'Failed to update specification section' });
    }
  };
  router.patch('/:workItemId/sections/:sectionName', sectionHandler);
  router.put('/:workItemId/sections/:sectionName', sectionHandler);

  // POST /api/specifications/:workItemId/validate
  router.post('/:workItemId/validate', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId) {
        return res.status(400).json({ error: 'Work item ID is required' });
      }

      const specificationService = serviceFactory.getSpecificationService();
      const validationResult = await specificationService.validateCompleteness(workItemId);

      res.json({ data: validationResult });
    } catch (error) {
      console.error('Error validating specification:', error);
      res.status(500).json({ error: 'Failed to validate specification' });
    }
  });

  // POST /api/specifications/:workItemId/validate-schema
  // SPEC-03: Validate specification against template schema with detailed guidance
  router.post('/:workItemId/validate-schema', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId || typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Valid work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const specificationService = serviceFactory.getSpecificationService();
      const validationResult = await specificationService.validateAgainstSchema(workItemId.trim());

      res.json({
        data: validationResult,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating specification against schema:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate specification against schema',
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/specifications/:workItemId/status
  // SPEC-05: Per-section completion status with progress indicators
  router.get('/:workItemId/status', async (req: Request, res: Response) => {
    try {
      const { workItemId } = req.params;

      if (!workItemId || typeof workItemId !== 'string' || workItemId.trim().length === 0) {
        return res.status(400).json({
          error: 'Valid work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const specificationService = serviceFactory.getSpecificationService();
      const sectionStatus = await specificationService.getSectionStatus(workItemId.trim());

      res.json({
        data: sectionStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting section status:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get section status',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}