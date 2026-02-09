import { Router } from 'express';
import { container } from '../../factories/container.js';
import { SprintService, AutoPlanningOptions } from '../../services/SprintService.js';
import { Sprint, SprintStatus } from '../../domain/entities/Sprint.js';

const router = Router();

// Get sprint service instance
function getSprintService(): SprintService {
  return container.get<SprintService>('SprintService');
}

/**
 * GET /api/v1/sprints
 * Get all sprints with optional filtering
 */
router.get('/sprints', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const sprintService = getSprintService();

    // For now, return mock sprints - would integrate with repository
    const mockSprints: Sprint[] = [
      Sprint.create('sprint-5', 5, 'User Authentication', new Date('2024-06-01'), new Date('2024-06-14'), 'Implement user login and registration'),
      Sprint.create('sprint-6', 6, 'Core Features', new Date('2024-06-15'), new Date('2024-06-28'), 'Build main application features'),
      Sprint.create('sprint-7', 7, 'Integration Testing', new Date('2024-07-01'), new Date('2024-07-14'), 'Test system integration'),
      Sprint.create('sprint-8', 8, 'Performance & Polish', new Date('2024-07-15'), new Date('2024-07-28'), 'Optimize performance and UI'),
      Sprint.create('sprint-9', 9, 'Release Preparation', new Date('2024-08-01'), new Date('2024-08-14'), 'Final testing and deployment prep')
    ];

    let filteredSprints = mockSprints;

    // Apply status filter
    if (status && Object.values(SprintStatus).includes(status as SprintStatus)) {
      filteredSprints = filteredSprints.filter(sprint => sprint.status === status);
    }

    // Apply date filters
    if (startDate) {
      const filterStartDate = new Date(startDate as string);
      filteredSprints = filteredSprints.filter(sprint => sprint.startDate >= filterStartDate);
    }

    if (endDate) {
      const filterEndDate = new Date(endDate as string);
      filteredSprints = filteredSprints.filter(sprint => sprint.endDate <= filterEndDate);
    }

    res.json({
      success: true,
      data: {
        sprints: filteredSprints,
        total: filteredSprints.length
      }
    });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprints'
    });
  }
});

/**
 * GET /api/v1/sprints/:id
 * Get specific sprint with details
 */
router.get('/sprints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sprintService = getSprintService();

    // For now, return mock sprint - would integrate with repository
    const mockSprint = Sprint.create(id, 5, 'Mock Sprint', new Date(), new Date());

    res.json({
      success: true,
      data: mockSprint
    });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint'
    });
  }
});

/**
 * POST /api/v1/sprints
 * Create a new sprint
 */
router.post('/sprints', async (req, res) => {
  try {
    const { number, name, startDate, endDate, goal, capacity } = req.body;

    if (!number || !name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Sprint number, name, start date, and end date are required'
      });
    }

    const sprintService = getSprintService();
    const sprintId = `sprint-${Date.now()}`;

    const sprint = await sprintService.createSprint(
      sprintId,
      number,
      name,
      new Date(startDate),
      new Date(endDate),
      goal
    );

    // Update capacity if provided
    if (capacity) {
      const updatedSprint = sprint.updateInfo(undefined, undefined, undefined, undefined, capacity);
      res.status(201).json({
        success: true,
        data: updatedSprint
      });
    } else {
      res.status(201).json({
        success: true,
        data: sprint
      });
    }
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create sprint'
    });
  }
});

/**
 * PUT /api/v1/sprints/:id
 * Update sprint information
 */
router.put('/sprints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, goal, acceptanceCriteria, capacity, startDate, endDate, status } = req.body;

    // For now, return mock updated sprint - would integrate with repository
    const updatedSprint = Sprint.create(id, 1, name || 'Updated Sprint', new Date(), new Date(), goal);

    res.json({
      success: true,
      data: updatedSprint
    });
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sprint'
    });
  }
});

/**
 * PUT /api/v1/sprints/:id/groups
 * Assign screen groups to a sprint
 */
router.put('/sprints/:id/groups', async (req, res) => {
  try {
    const { id } = req.params;
    const { groupIds, action = 'set' } = req.body;

    if (!Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        error: 'groupIds must be an array'
      });
    }

    const sprintService = getSprintService();
    let updatedSprint: Sprint;

    switch (action) {
      case 'add':
        updatedSprint = await sprintService.assignGroupsToSprint(id, groupIds);
        break;
      case 'set':
      default:
        updatedSprint = await sprintService.assignGroupsToSprint(id, groupIds);
        break;
    }

    res.json({
      success: true,
      data: updatedSprint
    });
  } catch (error) {
    console.error('Error assigning groups to sprint:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign groups'
    });
  }
});

/**
 * GET /api/v1/sprints/:id/capacity
 * Calculate sprint capacity and utilization
 */
router.get('/sprints/:id/capacity', async (req, res) => {
  try {
    const { id } = req.params;
    const sprintService = getSprintService();

    const capacityResult = await sprintService.calculateSprintCapacity(id);

    res.json({
      success: true,
      data: capacityResult
    });
  } catch (error) {
    console.error('Error calculating sprint capacity:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate capacity'
    });
  }
});

/**
 * GET /api/v1/sprints/:id/readiness
 * Calculate overall sprint readiness
 */
router.get('/sprints/:id/readiness', async (req, res) => {
  try {
    const { id } = req.params;
    const sprintService = getSprintService();

    const readinessResult = await sprintService.calculateSprintReadiness(id);

    res.json({
      success: true,
      data: readinessResult
    });
  } catch (error) {
    console.error('Error calculating sprint readiness:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate readiness'
    });
  }
});

/**
 * GET /api/v1/sprints/:id/blockers
 * Identify blockers in a sprint
 */
router.get('/sprints/:id/blockers', async (req, res) => {
  try {
    const { id } = req.params;
    const sprintService = getSprintService();

    const blockers = await sprintService.identifyBlockers(id);

    res.json({
      success: true,
      data: {
        blockers,
        total: blockers.length,
        critical: blockers.filter(b => b.severity === 'critical').length,
        high: blockers.filter(b => b.severity === 'high').length
      }
    });
  } catch (error) {
    console.error('Error identifying blockers:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to identify blockers'
    });
  }
});

/**
 * GET /api/v1/sprints/timeline
 * Get sprint timeline visualization data
 */
router.get('/sprints/timeline', async (req, res) => {
  try {
    const { sprintIds } = req.query;

    if (!sprintIds || !Array.isArray(sprintIds)) {
      return res.status(400).json({
        success: false,
        error: 'sprintIds query parameter is required and must be an array'
      });
    }

    const sprintService = getSprintService();
    const timelineData = await sprintService.getSprintTimeline(sprintIds as string[]);

    res.json({
      success: true,
      data: timelineData
    });
  } catch (error) {
    console.error('Error getting sprint timeline:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get timeline'
    });
  }
});

/**
 * POST /api/v1/sprints/move-group
 * Move a group between sprints
 */
router.post('/sprints/move-group', async (req, res) => {
  try {
    const { groupId, fromSprintId, toSprintId } = req.body;

    if (!groupId || !fromSprintId || !toSprintId) {
      return res.status(400).json({
        success: false,
        error: 'groupId, fromSprintId, and toSprintId are required'
      });
    }

    const sprintService = getSprintService();
    await sprintService.moveGroupBetweenSprints(groupId, fromSprintId, toSprintId);

    res.json({
      success: true,
      message: 'Group moved successfully'
    });
  } catch (error) {
    console.error('Error moving group between sprints:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move group'
    });
  }
});

/**
 * POST /api/v1/sprints/auto-plan
 * Automatically distribute work across sprints
 */
router.post('/sprints/auto-plan', async (req, res) => {
  try {
    const { groupIds, sprintIds, options = {} } = req.body;

    if (!Array.isArray(groupIds) || !Array.isArray(sprintIds)) {
      return res.status(400).json({
        success: false,
        error: 'groupIds and sprintIds must be arrays'
      });
    }

    const sprintService = getSprintService();
    const planningOptions: AutoPlanningOptions = {
      maxCapacityUtilization: options.maxCapacityUtilization || 80,
      prioritizeCriticalPath: options.prioritizeCriticalPath !== false,
      balanceWorkload: options.balanceWorkload !== false,
      respectDependencies: options.respectDependencies !== false,
      bufferDays: options.bufferDays || 2
    };

    const distribution = await sprintService.autoDistributeGroups(groupIds, sprintIds, planningOptions);

    res.json({
      success: true,
      data: {
        distribution,
        summary: {
          totalGroups: groupIds.length,
          sprintsUsed: distribution.filter(d => d.groupIds.length > 0).length,
          options: planningOptions
        }
      }
    });
  } catch (error) {
    console.error('Error in auto-planning:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Auto-planning failed'
    });
  }
});

/**
 * POST /api/v1/sprints/optimize
 * Optimize sprint plan to minimize dependencies and balance workload
 */
router.post('/sprints/optimize', async (req, res) => {
  try {
    const { sprintIds } = req.body;

    if (!Array.isArray(sprintIds)) {
      return res.status(400).json({
        success: false,
        error: 'sprintIds must be an array'
      });
    }

    const sprintService = getSprintService();
    const optimizationResult = await sprintService.optimizeSprintPlan(sprintIds);

    res.json({
      success: true,
      data: optimizationResult
    });
  } catch (error) {
    console.error('Error optimizing sprint plan:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Optimization failed'
    });
  }
});

/**
 * PUT /api/v1/sprints/:id/status
 * Update sprint status
 */
router.put('/sprints/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(SprintStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${Object.values(SprintStatus).join(', ')}`
      });
    }

    // For now, return success - would integrate with repository
    res.json({
      success: true,
      message: 'Sprint status updated successfully'
    });
  } catch (error) {
    console.error('Error updating sprint status:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update sprint status'
    });
  }
});

/**
 * PUT /api/v1/sprints/:id/velocity
 * Update sprint velocity
 */
router.put('/sprints/:id/velocity', async (req, res) => {
  try {
    const { id } = req.params;
    const { plannedVelocity, actualVelocity } = req.body;

    if (plannedVelocity !== undefined && (typeof plannedVelocity !== 'number' || plannedVelocity < 0)) {
      return res.status(400).json({
        success: false,
        error: 'plannedVelocity must be a non-negative number'
      });
    }

    if (actualVelocity !== undefined && (typeof actualVelocity !== 'number' || actualVelocity < 0)) {
      return res.status(400).json({
        success: false,
        error: 'actualVelocity must be a non-negative number'
      });
    }

    // For now, return success - would integrate with repository
    res.json({
      success: true,
      message: 'Sprint velocity updated successfully'
    });
  } catch (error) {
    console.error('Error updating sprint velocity:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update sprint velocity'
    });
  }
});

/**
 * DELETE /api/v1/sprints/:id
 * Delete a sprint
 */
router.delete('/sprints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reassignGroups } = req.query;

    // For now, return success - would integrate with repository
    res.json({
      success: true,
      message: 'Sprint deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sprint'
    });
  }
});

/**
 * GET /api/v1/sprints/analytics
 * Get sprint analytics and metrics
 */
router.get('/sprints/analytics', async (req, res) => {
  try {
    const { startDate, endDate, includeCompleted = true } = req.query;

    // Mock analytics data
    const analytics = {
      totalSprints: 5,
      activeSprints: 1,
      completedSprints: 0,
      avgVelocity: 32,
      avgCapacityUtilization: 78,
      onTimeDelivery: 80,
      totalGroups: 15,
      groupsOnBubble: 3,
      velocityTrend: [25, 30, 32, 28, 35], // Last 5 sprints
      burndownData: [
        { date: '2024-06-01', remaining: 40, completed: 0 },
        { date: '2024-06-08', remaining: 25, completed: 15 },
        { date: '2024-06-15', remaining: 10, completed: 30 },
        { date: '2024-06-22', remaining: 0, completed: 40 }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting sprint analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

export default router;