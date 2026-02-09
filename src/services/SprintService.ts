import { Sprint } from '../domain/entities/Sprint.js';
import { ScreenGroup } from '../domain/entities/ScreenGroup.js';
import { WorkItem } from '../domain/entities/WorkItem.js';

export interface ISprintService {
  createSprint(
    id: string,
    number: number,
    name: string,
    startDate: Date,
    endDate: Date,
    goal?: string
  ): Promise<Sprint>;

  assignGroupsToSprint(sprintId: string, groupIds: string[]): Promise<Sprint>;
  calculateSprintCapacity(sprintId: string): Promise<SprintCapacityResult>;
  getSprintTimeline(sprintIds: string[]): Promise<SprintTimelineData>;
  moveGroupBetweenSprints(groupId: string, fromSprintId: string, toSprintId: string): Promise<void>;
  calculateSprintReadiness(sprintId: string): Promise<SprintReadinessResult>;
  identifyBlockers(sprintId: string): Promise<SprintBlocker[]>;
}

export interface SprintCapacityResult {
  sprintId: string;
  capacity: number;
  plannedVelocity: number;
  actualVelocity: number;
  utilizationPercentage: number;
  isOverCapacity: boolean;
  recommendedCapacity: number;
  effortByGroup: { groupId: string; groupName: string; estimatedEffort: number }[];
}

export interface SprintTimelineData {
  sprints: SprintTimelineEntry[];
  totalDuration: number;
  criticalPath: string[];
  milestones: Milestone[];
  dependencies: TimelineDependency[];
}

export interface SprintTimelineEntry {
  sprint: Sprint;
  groups: GroupTimelineInfo[];
  capacity: number;
  plannedVelocity: number;
  utilizationPercentage: number;
  isOverloaded: boolean;
  position: {
    startX: number;
    endX: number;
    width: number;
  };
}

export interface GroupTimelineInfo {
  group: ScreenGroup;
  estimatedEffort: number;
  readinessPercentage: number;
  onTheBubble: boolean;
  blockers: string[];
}

export interface Milestone {
  id: string;
  name: string;
  date: Date;
  type: 'release' | 'demo' | 'review' | 'deadline';
  associatedSprints: string[];
}

export interface TimelineDependency {
  fromGroupId: string;
  toGroupId: string;
  type: 'blocks' | 'feeds-into' | 'requires';
  impact: 'low' | 'medium' | 'high';
}

export interface SprintReadinessResult {
  sprintId: string;
  overallReadiness: number;
  groupReadiness: { groupId: string; readiness: number; status: string }[];
  blockedGroups: string[];
  readyForRelease: boolean;
  estimatedCompletionDate: Date;
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface SprintBlocker {
  id: string;
  type: 'dependency' | 'resource' | 'technical' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedGroups: string[];
  suggestedResolution: string;
  estimatedResolutionTime: number; // in days
}

export interface AutoPlanningOptions {
  maxCapacityUtilization: number;
  prioritizeCriticalPath: boolean;
  balanceWorkload: boolean;
  respectDependencies: boolean;
  bufferDays: number;
}

export interface SprintOptimizationResult {
  originalPlan: { sprintId: string; groupIds: string[] }[];
  optimizedPlan: { sprintId: string; groupIds: string[] }[];
  improvements: string[];
  risksReduced: string[];
  efficiencyGain: number;
}

/**
 * Service for managing sprints and timeline planning
 * Handles capacity planning, dependencies, and automated distribution
 */
export class SprintService implements ISprintService {
  private sprints: Map<string, Sprint> = new Map();
  private groups: Map<string, ScreenGroup> = new Map();
  private workItems: Map<string, WorkItem> = new Map();
  private defaultCapacity: number = 40; // Default story points per sprint

  constructor() {}

  /**
   * Create a new sprint
   */
  async createSprint(
    id: string,
    number: number,
    name: string,
    startDate: Date,
    endDate: Date,
    goal?: string
  ): Promise<Sprint> {
    const sprint = Sprint.create(id, number, name, startDate, endDate, goal);

    // Validate business rules
    const errors = await Sprint.validateBusinessRules(sprint);
    if (errors.length > 0) {
      throw new Error(`Sprint validation failed: ${errors.join(', ')}`);
    }

    this.sprints.set(id, sprint);
    return sprint;
  }

  /**
   * Assign screen groups to a sprint
   */
  async assignGroupsToSprint(sprintId: string, groupIds: string[]): Promise<Sprint> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    // Validate all groups exist
    for (const groupId of groupIds) {
      if (!this.groups.has(groupId)) {
        throw new Error(`Group ${groupId} not found`);
      }
    }

    let updatedSprint = sprint;
    for (const groupId of groupIds) {
      updatedSprint = updatedSprint.addGroup(groupId);
    }

    this.sprints.set(sprintId, updatedSprint);

    // Update work items with sprint assignment
    for (const groupId of groupIds) {
      const group = this.groups.get(groupId)!;
      for (const nodeId of group.nodeIds) {
        const workItem = this.workItems.get(nodeId);
        if (workItem) {
          const updatedWorkItem = workItem.updateAssignments(undefined, sprintId);
          this.workItems.set(nodeId, updatedWorkItem);
        }
      }
    }

    return updatedSprint;
  }

  /**
   * Calculate sprint capacity and utilization
   */
  async calculateSprintCapacity(sprintId: string): Promise<SprintCapacityResult> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const capacity = sprint.capacity || this.defaultCapacity;
    const plannedVelocity = sprint.plannedVelocity || 0;
    const actualVelocity = sprint.actualVelocity || 0;

    const effortByGroup: { groupId: string; groupName: string; estimatedEffort: number }[] = [];
    let totalEstimatedEffort = 0;

    for (const groupId of sprint.plannedGroupIds) {
      const group = this.groups.get(groupId);
      if (group) {
        const groupEffort = this.estimateGroupEffort(group);
        totalEstimatedEffort += groupEffort;

        effortByGroup.push({
          groupId,
          groupName: group.name,
          estimatedEffort: groupEffort
        });
      }
    }

    const utilizationPercentage = capacity > 0
      ? Math.round((plannedVelocity / capacity) * 100)
      : 0;

    const isOverCapacity = plannedVelocity > capacity;
    const recommendedCapacity = Math.ceil(totalEstimatedEffort * 1.2); // 20% buffer

    return {
      sprintId,
      capacity,
      plannedVelocity,
      actualVelocity,
      utilizationPercentage,
      isOverCapacity,
      recommendedCapacity,
      effortByGroup
    };
  }

  /**
   * Generate timeline visualization data
   */
  async getSprintTimeline(sprintIds: string[]): Promise<SprintTimelineData> {
    const sprints = sprintIds
      .map(id => this.sprints.get(id))
      .filter(sprint => sprint !== undefined) as Sprint[];

    if (sprints.length === 0) {
      throw new Error('No valid sprints found');
    }

    // Sort sprints by start date
    sprints.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const earliestStart = sprints[0].startDate;
    const latestEnd = sprints[sprints.length - 1].endDate;
    const totalDuration = Math.ceil(
      (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const timelineEntries: SprintTimelineEntry[] = [];

    for (const sprint of sprints) {
      const capacity = await this.calculateSprintCapacity(sprint.id);

      const groups: GroupTimelineInfo[] = [];
      for (const groupId of sprint.plannedGroupIds) {
        const group = this.groups.get(groupId);
        if (group) {
          const groupInfo: GroupTimelineInfo = {
            group,
            estimatedEffort: this.estimateGroupEffort(group),
            readinessPercentage: await this.calculateGroupReadiness(group),
            onTheBubble: group.onTheBubble,
            blockers: await this.getGroupBlockers(group)
          };
          groups.push(groupInfo);
        }
      }

      // Calculate position on timeline
      const startOffset = Math.ceil(
        (sprint.startDate.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const duration = sprint.getDurationDays();
      const startX = (startOffset / totalDuration) * 100;
      const width = (duration / totalDuration) * 100;
      const endX = startX + width;

      timelineEntries.push({
        sprint,
        groups,
        capacity: capacity.capacity,
        plannedVelocity: capacity.plannedVelocity,
        utilizationPercentage: capacity.utilizationPercentage,
        isOverloaded: capacity.isOverCapacity,
        position: {
          startX,
          endX,
          width
        }
      });
    }

    // Generate milestones (placeholder)
    const milestones: Milestone[] = [
      {
        id: 'sprint-5-demo',
        name: 'Sprint 5 Demo',
        date: new Date('2024-07-15'),
        type: 'demo',
        associatedSprints: ['sprint-5']
      },
      {
        id: 'release-candidate',
        name: 'Release Candidate',
        date: new Date('2024-08-01'),
        type: 'release',
        associatedSprints: sprints.slice(0, 3).map(s => s.id)
      }
    ];

    return {
      sprints: timelineEntries,
      totalDuration,
      criticalPath: await this.calculateCriticalPath(sprints),
      milestones,
      dependencies: await this.identifyTimelineDependencies(sprints)
    };
  }

  /**
   * Move a group from one sprint to another
   */
  async moveGroupBetweenSprints(
    groupId: string,
    fromSprintId: string,
    toSprintId: string
  ): Promise<void> {
    const fromSprint = this.sprints.get(fromSprintId);
    const toSprint = this.sprints.get(toSprintId);
    const group = this.groups.get(groupId);

    if (!fromSprint) throw new Error(`Sprint ${fromSprintId} not found`);
    if (!toSprint) throw new Error(`Sprint ${toSprintId} not found`);
    if (!group) throw new Error(`Group ${groupId} not found`);

    // Remove from source sprint
    const updatedFromSprint = fromSprint.removeGroup(groupId);
    this.sprints.set(fromSprintId, updatedFromSprint);

    // Add to target sprint
    const updatedToSprint = toSprint.addGroup(groupId);
    this.sprints.set(toSprintId, updatedToSprint);

    // Update work item sprint assignments
    for (const nodeId of group.nodeIds) {
      const workItem = this.workItems.get(nodeId);
      if (workItem) {
        const updatedWorkItem = workItem.updateAssignments(undefined, toSprintId);
        this.workItems.set(nodeId, updatedWorkItem);
      }
    }
  }

  /**
   * Calculate overall sprint readiness
   */
  async calculateSprintReadiness(sprintId: string): Promise<SprintReadinessResult> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const groupReadiness: { groupId: string; readiness: number; status: string }[] = [];
    const blockedGroups: string[] = [];
    let totalReadiness = 0;

    for (const groupId of sprint.plannedGroupIds) {
      const group = this.groups.get(groupId);
      if (group) {
        const readiness = await this.calculateGroupReadiness(group);
        const status = this.getGroupStatus(readiness);

        groupReadiness.push({
          groupId,
          readiness,
          status
        });

        totalReadiness += readiness;

        if (readiness < 50 || group.onTheBubble) {
          blockedGroups.push(groupId);
        }
      }
    }

    const overallReadiness = groupReadiness.length > 0
      ? Math.round(totalReadiness / groupReadiness.length)
      : 0;

    const readyForRelease = overallReadiness >= 80 && blockedGroups.length === 0;

    // Estimate completion date based on current velocity
    const estimatedCompletionDate = this.estimateCompletionDate(sprint, overallReadiness);

    // Assess risk
    let riskAssessment: 'low' | 'medium' | 'high' = 'low';
    if (blockedGroups.length > 2 || overallReadiness < 40) {
      riskAssessment = 'high';
    } else if (blockedGroups.length > 0 || overallReadiness < 70) {
      riskAssessment = 'medium';
    }

    return {
      sprintId,
      overallReadiness,
      groupReadiness,
      blockedGroups,
      readyForRelease,
      estimatedCompletionDate,
      riskAssessment
    };
  }

  /**
   * Identify blockers in a sprint
   */
  async identifyBlockers(sprintId: string): Promise<SprintBlocker[]> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const blockers: SprintBlocker[] = [];

    for (const groupId of sprint.plannedGroupIds) {
      const group = this.groups.get(groupId);
      if (!group) continue;

      // Check for dependency blockers
      const missingDeps = await this.findMissingDependencies(group);
      if (missingDeps.length > 0) {
        blockers.push({
          id: `dep-${groupId}`,
          type: 'dependency',
          severity: 'high',
          description: `Missing dependencies: ${missingDeps.join(', ')}`,
          affectedGroups: [groupId],
          suggestedResolution: 'Complete dependent work items or adjust sprint scope',
          estimatedResolutionTime: 5
        });
      }

      // Check for capacity blockers
      const capacity = await this.calculateSprintCapacity(sprintId);
      if (capacity.isOverCapacity) {
        blockers.push({
          id: `capacity-${sprintId}`,
          type: 'resource',
          severity: 'medium',
          description: `Sprint over capacity: ${capacity.utilizationPercentage}%`,
          affectedGroups: sprint.plannedGroupIds,
          suggestedResolution: 'Move lower priority groups to future sprints',
          estimatedResolutionTime: 2
        });
      }

      // Check for technical blockers
      const workItems = Array.from(this.workItems.values())
        .filter(item => group.nodeIds.includes(item.id));

      const incompleteItems = workItems.filter(item => !item.isReady());
      if (incompleteItems.length > workItems.length * 0.7) {
        blockers.push({
          id: `tech-${groupId}`,
          type: 'technical',
          severity: 'medium',
          description: `High number of incomplete items in ${group.name}`,
          affectedGroups: [groupId],
          suggestedResolution: 'Focus on completing high-priority items first',
          estimatedResolutionTime: 3
        });
      }
    }

    return blockers;
  }

  /**
   * Automatically distribute groups across sprints
   */
  async autoDistributeGroups(
    groupIds: string[],
    sprintIds: string[],
    options: AutoPlanningOptions = {
      maxCapacityUtilization: 80,
      prioritizeCriticalPath: true,
      balanceWorkload: true,
      respectDependencies: true,
      bufferDays: 2
    }
  ): Promise<{ sprintId: string; groupIds: string[] }[]> {
    const sprints = sprintIds.map(id => this.sprints.get(id))
      .filter(sprint => sprint !== undefined) as Sprint[];

    const groups = groupIds.map(id => this.groups.get(id))
      .filter(group => group !== undefined) as ScreenGroup[];

    if (sprints.length === 0 || groups.length === 0) {
      throw new Error('Invalid sprints or groups provided');
    }

    // Calculate effort for each group
    const groupEfforts = groups.map(group => ({
      group,
      effort: this.estimateGroupEffort(group),
      priority: group.onTheBubble ? 'high' : 'medium'
    }));

    // Sort by priority and effort
    groupEfforts.sort((a, b) => {
      if (options.prioritizeCriticalPath) {
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
      }
      return b.effort - a.effort; // Larger efforts first
    });

    const distribution: { sprintId: string; groupIds: string[] }[] = [];
    const sprintCapacities = new Map<string, number>();

    // Initialize sprint capacities
    for (const sprint of sprints) {
      const capacity = await this.calculateSprintCapacity(sprint.id);
      const availableCapacity = capacity.capacity * (options.maxCapacityUtilization / 100);
      sprintCapacities.set(sprint.id, availableCapacity);
      distribution.push({ sprintId: sprint.id, groupIds: [] });
    }

    // Distribute groups
    for (const { group, effort } of groupEfforts) {
      let assigned = false;

      for (const entry of distribution) {
        const availableCapacity = sprintCapacities.get(entry.sprintId) || 0;

        if (availableCapacity >= effort) {
          entry.groupIds.push(group.id);
          sprintCapacities.set(entry.sprintId, availableCapacity - effort);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        // Add to the sprint with most available capacity
        const bestSprint = distribution.reduce((best, current) => {
          const bestCapacity = sprintCapacities.get(best.sprintId) || 0;
          const currentCapacity = sprintCapacities.get(current.sprintId) || 0;
          return currentCapacity > bestCapacity ? current : best;
        });

        bestSprint.groupIds.push(group.id);
        const currentCapacity = sprintCapacities.get(bestSprint.sprintId) || 0;
        sprintCapacities.set(bestSprint.sprintId, Math.max(0, currentCapacity - effort));
      }
    }

    return distribution;
  }

  /**
   * Optimize sprint plan to minimize dependencies and balance workload
   */
  async optimizeSprintPlan(sprintIds: string[]): Promise<SprintOptimizationResult> {
    const originalPlan = sprintIds.map(id => ({
      sprintId: id,
      groupIds: this.sprints.get(id)?.plannedGroupIds || []
    }));

    // For now, return the original plan as "optimized"
    // In a full implementation, this would use optimization algorithms
    return {
      originalPlan,
      optimizedPlan: originalPlan,
      improvements: [],
      risksReduced: [],
      efficiencyGain: 0
    };
  }

  /**
   * Calculate critical path across sprints
   */
  private async calculateCriticalPath(sprints: Sprint[]): Promise<string[]> {
    // Placeholder implementation
    // Would analyze dependencies to find critical path
    return [];
  }

  /**
   * Identify dependencies between groups in timeline
   */
  private async identifyTimelineDependencies(sprints: Sprint[]): Promise<TimelineDependency[]> {
    // Placeholder implementation
    // Would analyze work item dependencies
    return [];
  }

  /**
   * Estimate effort for a group based on its work items
   */
  private estimateGroupEffort(group: ScreenGroup): number {
    const workItems = Array.from(this.workItems.values())
      .filter(item => group.nodeIds.includes(item.id));

    // Simple estimation based on number of items and types
    let effort = 0;
    for (const item of workItems) {
      switch (item.getDeliverableType()) {
        case 'screen':
          effort += 8;
          break;
        case 'service':
          effort += 5;
          break;
        case 'api':
          effort += 3;
          break;
        case 'test':
          effort += 2;
          break;
        default:
          effort += 1;
      }
    }

    return Math.max(effort, workItems.length); // Minimum 1 point per item
  }

  /**
   * Calculate readiness percentage for a group
   */
  private async calculateGroupReadiness(group: ScreenGroup): Promise<number> {
    const workItems = Array.from(this.workItems.values())
      .filter(item => group.nodeIds.includes(item.id));

    if (workItems.length === 0) return 0;

    const totalPercentage = workItems.reduce(
      (sum, item) => sum + item.getCompletionPercentage(),
      0
    );

    return Math.round(totalPercentage / workItems.length);
  }

  /**
   * Get status description for a group based on readiness
   */
  private getGroupStatus(readiness: number): string {
    if (readiness >= 90) return 'Complete';
    if (readiness >= 70) return 'On Track';
    if (readiness >= 50) return 'In Progress';
    if (readiness >= 20) return 'Started';
    return 'Not Started';
  }

  /**
   * Get blockers for a specific group
   */
  private async getGroupBlockers(group: ScreenGroup): Promise<string[]> {
    // Placeholder - would analyze dependencies and readiness states
    return [];
  }

  /**
   * Find missing dependencies for a group
   */
  private async findMissingDependencies(group: ScreenGroup): Promise<string[]> {
    // Placeholder - would analyze graph dependencies
    return [];
  }

  /**
   * Estimate sprint completion date based on current velocity
   */
  private estimateCompletionDate(sprint: Sprint, readinessPercentage: number): Date {
    const remaining = 100 - readinessPercentage;
    const daysLeft = sprint.endDate.getTime() - new Date().getTime();
    const estimatedDays = (remaining / 100) * sprint.getDurationDays();

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

    return estimatedDate;
  }

  // Helper methods for testing and dependency injection
  setSprints(sprints: Map<string, Sprint>): void {
    this.sprints = sprints;
  }

  setGroups(groups: Map<string, ScreenGroup>): void {
    this.groups = groups;
  }

  setWorkItems(workItems: Map<string, WorkItem>): void {
    this.workItems = workItems;
  }

  getSprints(): Map<string, Sprint> {
    return this.sprints;
  }

  getGroups(): Map<string, ScreenGroup> {
    return this.groups;
  }

  getWorkItems(): Map<string, WorkItem> {
    return this.workItems;
  }
}