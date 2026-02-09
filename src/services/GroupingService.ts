import { ScreenGroup } from '../domain/entities/ScreenGroup.js';
import { WorkItem, DeliverableType } from '../domain/entities/WorkItem.js';

export interface IGroupingService {
  createScreenGroup(
    id: string,
    name: string,
    description?: string,
    parentGroupId?: string
  ): Promise<ScreenGroup>;

  addNodesToGroup(groupId: string, nodeIds: string[]): Promise<ScreenGroup>;
  removeNodesFromGroup(groupId: string, nodeIds: string[]): Promise<ScreenGroup>;
  calculateGroupReadiness(groupId: string, workItems: WorkItem[]): Promise<GroupReadinessResult>;
  markGroupOnBubble(groupId: string, onBubble: boolean): Promise<ScreenGroup>;
  getGroupHierarchy(groupId: string): Promise<GroupHierarchy>;
  breakScreenIntoComponents(screenGroupId: string, screenName: string): Promise<ComponentBreakdownResult>;
}

export interface GroupReadinessResult {
  groupId: string;
  totalNodes: number;
  readyNodes: number;
  inProgressNodes: number;
  notStartedNodes: number;
  overallPercentage: number;
  blockingDimensions: string[];
  criticalItems: string[];
  onTheBubble: boolean;
}

export interface GroupHierarchy {
  group: ScreenGroup;
  children: GroupHierarchy[];
  parent?: ScreenGroup;
  totalNodeCount: number;
  aggregatedReadiness: number;
}

export interface ComponentBreakdownResult {
  screenGroup: ScreenGroup;
  generatedComponents: ComponentSuggestion[];
  missingComponents: string[];
  estimatedEffort: number;
}

export interface ComponentSuggestion {
  id: string;
  name: string;
  deliverableType: DeliverableType;
  description: string;
  dependencies: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  priority: 'must-have' | 'should-have' | 'could-have';
}

/**
 * Service for managing screen groups and organizing work items by features/screens
 * Supports hierarchical organization and automated component breakdown
 */
export class GroupingService implements IGroupingService {
  private groups: Map<string, ScreenGroup> = new Map();
  private workItems: Map<string, WorkItem> = new Map();

  constructor() {}

  /**
   * Create a new screen group
   */
  async createScreenGroup(
    id: string,
    name: string,
    description?: string,
    parentGroupId?: string
  ): Promise<ScreenGroup> {
    // Validate parent group exists if specified
    if (parentGroupId && !this.groups.has(parentGroupId)) {
      throw new Error(`Parent group ${parentGroupId} not found`);
    }

    const group = ScreenGroup.create(id, name, description, parentGroupId);

    // Validate business rules
    const errors = await ScreenGroup.validateBusinessRules(group);
    if (errors.length > 0) {
      throw new Error(`Group validation failed: ${errors.join(', ')}`);
    }

    this.groups.set(id, group);

    // Update parent group if specified
    if (parentGroupId) {
      const parentGroup = this.groups.get(parentGroupId)!;
      const updatedParent = parentGroup.addChildGroup(id);
      this.groups.set(parentGroupId, updatedParent);
    }

    return group;
  }

  /**
   * Add work item nodes to a group
   */
  async addNodesToGroup(groupId: string, nodeIds: string[]): Promise<ScreenGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    // Validate all nodes exist
    for (const nodeId of nodeIds) {
      if (!this.workItems.has(nodeId)) {
        throw new Error(`Work item ${nodeId} not found`);
      }
    }

    let updatedGroup = group;
    for (const nodeId of nodeIds) {
      updatedGroup = updatedGroup.addNode(nodeId);

      // Update work item with group assignment
      const workItem = this.workItems.get(nodeId)!;
      const updatedWorkItem = workItem.updateAssignments(groupId);
      this.workItems.set(nodeId, updatedWorkItem);
    }

    this.groups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  /**
   * Remove work item nodes from a group
   */
  async removeNodesFromGroup(groupId: string, nodeIds: string[]): Promise<ScreenGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    let updatedGroup = group;
    for (const nodeId of nodeIds) {
      updatedGroup = updatedGroup.removeNode(nodeId);

      // Update work item to remove group assignment
      const workItem = this.workItems.get(nodeId);
      if (workItem) {
        const updatedWorkItem = workItem.updateAssignments(undefined);
        this.workItems.set(nodeId, updatedWorkItem);
      }
    }

    this.groups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  /**
   * Calculate aggregated readiness for a group
   */
  async calculateGroupReadiness(groupId: string, workItems: WorkItem[]): Promise<GroupReadinessResult> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const groupWorkItems = workItems.filter(item => group.nodeIds.includes(item.id));

    let readyNodes = 0;
    let inProgressNodes = 0;
    let notStartedNodes = 0;
    const blockingDimensions = new Set<string>();
    const criticalItems: string[] = [];

    let totalPercentage = 0;

    for (const item of groupWorkItems) {
      const percentage = item.getCompletionPercentage();
      totalPercentage += percentage;

      if (item.isReady()) {
        readyNodes++;
      } else if (item.hasStarted()) {
        inProgressNodes++;
      } else {
        notStartedNodes++;
      }

      // Collect blocking dimensions
      item.getBlockingDimensions().forEach(dim => blockingDimensions.add(dim));

      // Identify critical items (low completion, high importance)
      if (percentage < 50 && item.getDeliverableType() === DeliverableType.SCREEN) {
        criticalItems.push(item.id);
      }
    }

    const overallPercentage = groupWorkItems.length > 0
      ? Math.round(totalPercentage / groupWorkItems.length)
      : 0;

    // Determine if group is "on the bubble" based on risk factors
    const onTheBubble = this.assessGroupRisk(overallPercentage, criticalItems.length, groupWorkItems.length);

    return {
      groupId,
      totalNodes: groupWorkItems.length,
      readyNodes,
      inProgressNodes,
      notStartedNodes,
      overallPercentage,
      blockingDimensions: Array.from(blockingDimensions),
      criticalItems,
      onTheBubble
    };
  }

  /**
   * Mark a group as "on the bubble" (at risk)
   */
  async markGroupOnBubble(groupId: string, onBubble: boolean): Promise<ScreenGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const updatedGroup = group.markOnBubble(onBubble);
    this.groups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  /**
   * Get hierarchical structure of a group and its children
   */
  async getGroupHierarchy(groupId: string): Promise<GroupHierarchy> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const children: GroupHierarchy[] = [];
    for (const childId of group.childGroupIds) {
      const childHierarchy = await this.getGroupHierarchy(childId);
      children.push(childHierarchy);
    }

    const parent = group.parentGroupId ? this.groups.get(group.parentGroupId) : undefined;

    // Calculate total node count including children
    let totalNodeCount = group.nodeIds.length;
    let totalPercentage = 0;
    let totalItems = 0;

    for (const child of children) {
      totalNodeCount += child.totalNodeCount;
      totalPercentage += child.aggregatedReadiness * child.totalNodeCount;
      totalItems += child.totalNodeCount;
    }

    // Add this group's contribution
    const groupItems = Array.from(this.workItems.values()).filter(item =>
      group.nodeIds.includes(item.id)
    );

    if (groupItems.length > 0) {
      const groupPercentage = groupItems.reduce((sum, item) =>
        sum + item.getCompletionPercentage(), 0
      ) / groupItems.length;

      totalPercentage += groupPercentage * groupItems.length;
      totalItems += groupItems.length;
    }

    const aggregatedReadiness = totalItems > 0 ? totalPercentage / totalItems : 0;

    return {
      group,
      children,
      parent,
      totalNodeCount,
      aggregatedReadiness
    };
  }

  /**
   * Break a screen into component work items
   */
  async breakScreenIntoComponents(
    screenGroupId: string,
    screenName: string
  ): Promise<ComponentBreakdownResult> {
    const group = this.groups.get(screenGroupId);
    if (!group) {
      throw new Error(`Group ${screenGroupId} not found`);
    }

    // Generate component suggestions based on screen name and common patterns
    const components = this.suggestComponentsForScreen(screenName);

    // Identify missing components
    const existingTypes = new Set<DeliverableType>();
    for (const nodeId of group.nodeIds) {
      const workItem = this.workItems.get(nodeId);
      if (workItem) {
        existingTypes.add(workItem.getDeliverableType());
      }
    }

    const missingComponents: string[] = [];
    let estimatedEffort = 0;

    for (const component of components) {
      if (!existingTypes.has(component.deliverableType)) {
        missingComponents.push(component.name);
      }

      // Estimate effort based on complexity
      const effortMap = { low: 1, medium: 3, high: 8 };
      estimatedEffort += effortMap[component.estimatedComplexity];
    }

    return {
      screenGroup: group,
      generatedComponents: components,
      missingComponents,
      estimatedEffort
    };
  }

  /**
   * AI-assisted component suggestions for a screen
   */
  private suggestComponentsForScreen(screenName: string): ComponentSuggestion[] {
    const screenType = this.inferScreenType(screenName);
    const baseComponents: ComponentSuggestion[] = [];

    // Common components for all screens
    baseComponents.push(
      {
        id: `${screenName.toLowerCase()}-screen-component`,
        name: `${screenName} Screen Component`,
        deliverableType: DeliverableType.COMPONENT,
        description: `React component for ${screenName} screen UI`,
        dependencies: [],
        estimatedComplexity: 'medium',
        priority: 'must-have'
      },
      {
        id: `${screenName.toLowerCase()}-types`,
        name: `${screenName} Types`,
        deliverableType: DeliverableType.DTO,
        description: `TypeScript interfaces and types for ${screenName}`,
        dependencies: [],
        estimatedComplexity: 'low',
        priority: 'must-have'
      },
      {
        id: `${screenName.toLowerCase()}-service`,
        name: `${screenName} Service`,
        deliverableType: DeliverableType.SERVICE,
        description: `Business logic service for ${screenName}`,
        dependencies: [`${screenName.toLowerCase()}-types`],
        estimatedComplexity: 'medium',
        priority: 'must-have'
      },
      {
        id: `${screenName.toLowerCase()}-api`,
        name: `${screenName} API Endpoints`,
        deliverableType: DeliverableType.API,
        description: `REST API endpoints for ${screenName}`,
        dependencies: [`${screenName.toLowerCase()}-service`],
        estimatedComplexity: 'medium',
        priority: 'must-have'
      },
      {
        id: `${screenName.toLowerCase()}-tests`,
        name: `${screenName} Tests`,
        deliverableType: DeliverableType.TEST,
        description: `Unit and integration tests for ${screenName}`,
        dependencies: [
          `${screenName.toLowerCase()}-screen-component`,
          `${screenName.toLowerCase()}-service`
        ],
        estimatedComplexity: 'medium',
        priority: 'should-have'
      }
    );

    // Add type-specific components
    if (screenType === 'list' || screenType === 'dashboard') {
      baseComponents.push({
        id: `${screenName.toLowerCase()}-table-component`,
        name: `${screenName} Table Component`,
        deliverableType: DeliverableType.COMPONENT,
        description: `Data table component with sorting and filtering`,
        dependencies: [`${screenName.toLowerCase()}-types`],
        estimatedComplexity: 'high',
        priority: 'must-have'
      });
    }

    if (screenType === 'form' || screenType === 'create' || screenType === 'edit') {
      baseComponents.push(
        {
          id: `${screenName.toLowerCase()}-form-component`,
          name: `${screenName} Form Component`,
          deliverableType: DeliverableType.COMPONENT,
          description: `Form component with validation`,
          dependencies: [`${screenName.toLowerCase()}-types`],
          estimatedComplexity: 'high',
          priority: 'must-have'
        },
        {
          id: `${screenName.toLowerCase()}-validation`,
          name: `${screenName} Validation`,
          deliverableType: DeliverableType.SERVICE,
          description: `Form validation logic and rules`,
          dependencies: [`${screenName.toLowerCase()}-types`],
          estimatedComplexity: 'medium',
          priority: 'must-have'
        }
      );
    }

    if (this.requiresDatabase(screenType)) {
      baseComponents.push({
        id: `${screenName.toLowerCase()}-database`,
        name: `${screenName} Database Schema`,
        deliverableType: DeliverableType.DATABASE,
        description: `Database tables and relationships`,
        dependencies: [],
        estimatedComplexity: 'medium',
        priority: 'must-have'
      });
    }

    return baseComponents;
  }

  /**
   * Infer screen type from name for component suggestions
   */
  private inferScreenType(screenName: string): string {
    const name = screenName.toLowerCase();

    if (name.includes('list') || name.includes('index') || name.includes('dashboard')) {
      return 'list';
    }
    if (name.includes('create') || name.includes('new') || name.includes('add')) {
      return 'create';
    }
    if (name.includes('edit') || name.includes('update') || name.includes('modify')) {
      return 'edit';
    }
    if (name.includes('form') || name.includes('input')) {
      return 'form';
    }
    if (name.includes('detail') || name.includes('view') || name.includes('show')) {
      return 'detail';
    }

    return 'generic';
  }

  /**
   * Check if screen type typically requires database operations
   */
  private requiresDatabase(screenType: string): boolean {
    return ['list', 'create', 'edit', 'detail'].includes(screenType);
  }

  /**
   * Assess if a group is at risk ("on the bubble")
   */
  private assessGroupRisk(
    overallPercentage: number,
    criticalItemCount: number,
    totalItems: number
  ): boolean {
    // Risk factors:
    // - Low overall completion percentage
    // - High number of critical items
    // - Large scope with many incomplete items

    if (overallPercentage < 30) return true;
    if (criticalItemCount > 0 && overallPercentage < 60) return true;
    if (totalItems > 10 && overallPercentage < 50) return true;

    return false;
  }

  /**
   * Validate group completeness - check for missing components
   */
  async validateGroupCompleteness(groupId: string): Promise<{
    isComplete: boolean;
    missingComponents: string[];
    recommendations: string[];
  }> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const workItems = Array.from(this.workItems.values())
      .filter(item => group.nodeIds.includes(item.id));

    const presentTypes = new Set(
      workItems.map(item => item.getDeliverableType())
    );

    const missingComponents: string[] = [];
    const recommendations: string[] = [];

    // Check for essential components
    if (!presentTypes.has(DeliverableType.COMPONENT)) {
      missingComponents.push('UI Component');
      recommendations.push('Add React component for the screen');
    }

    if (!presentTypes.has(DeliverableType.SERVICE)) {
      missingComponents.push('Business Logic Service');
      recommendations.push('Add service layer for business logic');
    }

    if (!presentTypes.has(DeliverableType.API)) {
      missingComponents.push('API Endpoints');
      recommendations.push('Add REST API endpoints');
    }

    if (!presentTypes.has(DeliverableType.TEST)) {
      missingComponents.push('Tests');
      recommendations.push('Add unit and integration tests');
    }

    const isComplete = missingComponents.length === 0;

    return {
      isComplete,
      missingComponents,
      recommendations
    };
  }

  /**
   * Find dependencies missing from the group
   */
  async identifyMissingDependencies(groupId: string): Promise<{
    missingDependencies: string[];
    externalDependencies: string[];
    blockedItems: string[];
  }> {
    // This would integrate with the graph repository to analyze dependencies
    // For now, returning empty results as placeholder
    return {
      missingDependencies: [],
      externalDependencies: [],
      blockedItems: []
    };
  }

  /**
   * Calculate release risk for a group
   */
  async calculateReleaseRisk(groupId: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    mitigationSuggestions: string[];
  }> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const riskFactors: string[] = [];
    const mitigationSuggestions: string[] = [];

    // Analyze completion status
    const workItems = Array.from(this.workItems.values())
      .filter(item => group.nodeIds.includes(item.id));

    const avgCompletion = workItems.length > 0
      ? workItems.reduce((sum, item) => sum + item.getCompletionPercentage(), 0) / workItems.length
      : 0;

    if (avgCompletion < 50) {
      riskFactors.push('Low overall completion percentage');
      mitigationSuggestions.push('Focus on completing critical path items first');
    }

    if (group.onTheBubble) {
      riskFactors.push('Group marked as "on the bubble"');
      mitigationSuggestions.push('Review scope and consider de-scoping non-essential features');
    }

    // Check for missing critical components
    const validation = await this.validateGroupCompleteness(groupId);
    if (!validation.isComplete) {
      riskFactors.push('Missing critical components');
      mitigationSuggestions.push('Add missing components to ensure deliverable completeness');
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3) riskLevel = 'high';
    else if (riskFactors.length >= 1) riskLevel = 'medium';

    return {
      riskLevel,
      riskFactors,
      mitigationSuggestions
    };
  }

  // Helper methods for testing and dependency injection
  setGroups(groups: Map<string, ScreenGroup>): void {
    this.groups = groups;
  }

  setWorkItems(workItems: Map<string, WorkItem>): void {
    this.workItems = workItems;
  }

  getGroups(): Map<string, ScreenGroup> {
    return this.groups;
  }

  getWorkItems(): Map<string, WorkItem> {
    return this.workItems;
  }
}