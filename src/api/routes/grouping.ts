import { Router } from 'express';
import { container } from '../../factories/container.js';
import { GroupingService } from '../../services/GroupingService.js';
import { ScreenGroup } from '../../domain/entities/ScreenGroup.js';
import { WorkItem } from '../../domain/entities/WorkItem.js';

const router = Router();

// Get grouping service instance
function getGroupingService(): GroupingService {
  return container.get<GroupingService>('GroupingService');
}

/**
 * GET /api/v1/groups
 * Get all screen groups with optional filtering
 */
router.get('/groups', async (req, res) => {
  try {
    const { sprint, status, search } = req.query;
    const groupingService = getGroupingService();

    // For now, return empty groups - would integrate with repository
    const groups: ScreenGroup[] = [];

    // Apply filters if needed
    let filteredGroups = groups;

    if (search) {
      const searchTerm = search.toString().toLowerCase();
      filteredGroups = filteredGroups.filter(group =>
        group.name.toLowerCase().includes(searchTerm) ||
        group.description?.toLowerCase().includes(searchTerm)
      );
    }

    res.json({
      success: true,
      data: {
        groups: filteredGroups,
        total: filteredGroups.length
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

/**
 * GET /api/v1/groups/:id
 * Get specific screen group with details
 */
router.get('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    // For now, return mock group - would integrate with repository
    const group: ScreenGroup | null = null;

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch group'
    });
  }
});

/**
 * POST /api/v1/groups
 * Create a new screen group
 */
router.post('/groups', async (req, res) => {
  try {
    const { name, description, parentGroupId, nodeIds } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required'
      });
    }

    const groupingService = getGroupingService();
    const groupId = `group-${Date.now()}`;

    const group = await groupingService.createScreenGroup(
      groupId,
      name,
      description,
      parentGroupId
    );

    // Add nodes if provided
    if (nodeIds && Array.isArray(nodeIds) && nodeIds.length > 0) {
      await groupingService.addNodesToGroup(groupId, nodeIds);
    }

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group'
    });
  }
});

/**
 * PUT /api/v1/groups/:id
 * Update screen group information
 */
router.put('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, colorConfig } = req.body;
    const groupingService = getGroupingService();

    // For now, return mock response - would integrate with repository
    const updatedGroup = ScreenGroup.create(id, name || 'Updated Group', description);

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update group'
    });
  }
});

/**
 * PUT /api/v1/groups/:id/nodes
 * Update nodes in a group (add/remove work items)
 */
router.put('/groups/:id/nodes', async (req, res) => {
  try {
    const { id } = req.params;
    const { nodeIds, action = 'set' } = req.body;

    if (!Array.isArray(nodeIds)) {
      return res.status(400).json({
        success: false,
        error: 'nodeIds must be an array'
      });
    }

    const groupingService = getGroupingService();
    let updatedGroup: ScreenGroup;

    switch (action) {
      case 'add':
        updatedGroup = await groupingService.addNodesToGroup(id, nodeIds);
        break;
      case 'remove':
        updatedGroup = await groupingService.removeNodesFromGroup(id, nodeIds);
        break;
      case 'set':
      default:
        // First remove all existing nodes, then add new ones
        const existingGroup = ScreenGroup.create(id, 'Temp Group');
        await groupingService.removeNodesFromGroup(id, existingGroup.nodeIds);
        updatedGroup = await groupingService.addNodesToGroup(id, nodeIds);
        break;
    }

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group nodes:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update group nodes'
    });
  }
});

/**
 * GET /api/v1/groups/:id/readiness
 * Get aggregated readiness for a group
 */
router.get('/groups/:id/readiness', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    // Mock work items for demonstration
    const workItems: WorkItem[] = [];

    const readinessResult = await groupingService.calculateGroupReadiness(id, workItems);

    res.json({
      success: true,
      data: readinessResult
    });
  } catch (error) {
    console.error('Error calculating group readiness:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate readiness'
    });
  }
});

/**
 * GET /api/v1/groups/:id/hierarchy
 * Get hierarchical structure of a group
 */
router.get('/groups/:id/hierarchy', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    const hierarchy = await groupingService.getGroupHierarchy(id);

    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error getting group hierarchy:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get hierarchy'
    });
  }
});

/**
 * POST /api/v1/groups/:id/break-down
 * Auto-create component work items for a screen group
 */
router.post('/groups/:id/break-down', async (req, res) => {
  try {
    const { id } = req.params;
    const { screenName } = req.body;

    if (!screenName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Screen name is required for breakdown'
      });
    }

    const groupingService = getGroupingService();
    const breakdownResult = await groupingService.breakScreenIntoComponents(id, screenName);

    res.json({
      success: true,
      data: breakdownResult
    });
  } catch (error) {
    console.error('Error breaking down screen:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to break down screen'
    });
  }
});

/**
 * PUT /api/v1/groups/:id/bubble
 * Mark group as "on the bubble" (at risk)
 */
router.put('/groups/:id/bubble', async (req, res) => {
  try {
    const { id } = req.params;
    const { onTheBubble } = req.body;

    if (typeof onTheBubble !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'onTheBubble must be a boolean value'
      });
    }

    const groupingService = getGroupingService();
    const updatedGroup = await groupingService.markGroupOnBubble(id, onTheBubble);

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating bubble status:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bubble status'
    });
  }
});

/**
 * GET /api/v1/groups/:id/validation
 * Validate group completeness
 */
router.get('/groups/:id/validation', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    const validation = await groupingService.validateGroupCompleteness(id);

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating group:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate group'
    });
  }
});

/**
 * GET /api/v1/groups/:id/dependencies
 * Get missing dependencies for a group
 */
router.get('/groups/:id/dependencies', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    const dependencies = await groupingService.identifyMissingDependencies(id);

    res.json({
      success: true,
      data: dependencies
    });
  } catch (error) {
    console.error('Error getting dependencies:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dependencies'
    });
  }
});

/**
 * GET /api/v1/groups/:id/risk-assessment
 * Get risk assessment for a group
 */
router.get('/groups/:id/risk-assessment', async (req, res) => {
  try {
    const { id } = req.params;
    const groupingService = getGroupingService();

    const riskAssessment = await groupingService.calculateReleaseRisk(id);

    res.json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    console.error('Error calculating risk:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate risk'
    });
  }
});

/**
 * DELETE /api/v1/groups/:id
 * Delete a screen group
 */
router.delete('/groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade = false } = req.query;

    // For now, return success - would integrate with repository
    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group'
    });
  }
});

/**
 * POST /api/v1/groups/bulk-operations
 * Perform bulk operations on multiple groups
 */
router.post('/groups/bulk-operations', async (req, res) => {
  try {
    const { groupIds, operation, data } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'groupIds must be a non-empty array'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required'
      });
    }

    const groupingService = getGroupingService();
    const results: any[] = [];

    switch (operation) {
      case 'mark-bubble':
        for (const groupId of groupIds) {
          const result = await groupingService.markGroupOnBubble(groupId, data?.onTheBubble || false);
          results.push(result);
        }
        break;

      case 'assign-sprint':
        // This would integrate with sprint service
        results.push({ message: 'Sprint assignment not implemented yet' });
        break;

      case 'delete':
        // This would integrate with repository
        results.push({ message: 'Bulk delete not implemented yet' });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported operation: ${operation}`
        });
    }

    res.json({
      success: true,
      data: {
        processed: groupIds.length,
        results
      }
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Bulk operation failed'
    });
  }
});

export default router;