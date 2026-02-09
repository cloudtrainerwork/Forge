import { IsString, IsArray, IsOptional, IsNotEmpty, IsBoolean, IsObject, validateOrReject } from 'class-validator';
import { Expose, Transform } from 'class-transformer';

/**
 * ScreenGroup domain entity represents a logical grouping of work items
 * organized by screen/feature for deliverable tracking and sprint planning
 */
export class ScreenGroup {
  @IsString()
  @IsNotEmpty()
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @Expose()
  nodeIds: string[]; // Work item IDs grouped in this screen

  @IsString()
  @IsOptional()
  @Expose()
  parentGroupId?: string; // For hierarchical group organization

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  childGroupIds: string[]; // Sub-groups under this group

  @IsBoolean()
  @Expose()
  onTheBubble: boolean; // Flag for at-risk groups that may not make release

  @IsObject()
  @IsOptional()
  @Expose()
  colorConfig: {
    primary: string;
    border: string;
    background: string;
  };

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    nodeIds: string[] = [],
    description?: string,
    parentGroupId?: string,
    childGroupIds: string[] = [],
    onTheBubble: boolean = false,
    colorConfig?: { primary: string; border: string; background: string },
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.nodeIds = nodeIds;
    this.parentGroupId = parentGroupId;
    this.childGroupIds = childGroupIds;
    this.onTheBubble = onTheBubble;
    this.colorConfig = colorConfig || {
      primary: '#3B82F6',
      border: '#1D4ED8',
      background: '#EFF6FF'
    };
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate the screen group instance
   * Throws ValidationError if invalid
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
  }

  /**
   * Check if this group has any child groups
   */
  hasChildGroups(): boolean {
    return this.childGroupIds.length > 0;
  }

  /**
   * Check if this group is a child of another group
   */
  isChildGroup(): boolean {
    return !!this.parentGroupId;
  }

  /**
   * Get total number of nodes including child groups
   * Note: This requires loading child group data separately
   */
  getTotalNodeCount(): number {
    return this.nodeIds.length;
  }

  /**
   * Add node to group
   * Returns new instance to maintain immutability
   */
  addNode(nodeId: string): ScreenGroup {
    if (this.nodeIds.includes(nodeId)) {
      return this; // Already included
    }

    return new ScreenGroup(
      this.id,
      this.name,
      [...this.nodeIds, nodeId],
      this.description,
      this.parentGroupId,
      this.childGroupIds,
      this.onTheBubble,
      this.colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Remove node from group
   * Returns new instance to maintain immutability
   */
  removeNode(nodeId: string): ScreenGroup {
    const updatedNodeIds = this.nodeIds.filter(id => id !== nodeId);

    return new ScreenGroup(
      this.id,
      this.name,
      updatedNodeIds,
      this.description,
      this.parentGroupId,
      this.childGroupIds,
      this.onTheBubble,
      this.colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Add child group
   * Returns new instance to maintain immutability
   */
  addChildGroup(childGroupId: string): ScreenGroup {
    if (this.childGroupIds.includes(childGroupId)) {
      return this; // Already included
    }

    return new ScreenGroup(
      this.id,
      this.name,
      this.nodeIds,
      this.description,
      this.parentGroupId,
      [...this.childGroupIds, childGroupId],
      this.onTheBubble,
      this.colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Mark group as "on the bubble" (at risk)
   * Returns new instance to maintain immutability
   */
  markOnBubble(onBubble: boolean): ScreenGroup {
    return new ScreenGroup(
      this.id,
      this.name,
      this.nodeIds,
      this.description,
      this.parentGroupId,
      this.childGroupIds,
      onBubble,
      this.colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update group information
   * Returns new instance to maintain immutability
   */
  updateInfo(name?: string, description?: string): ScreenGroup {
    return new ScreenGroup(
      this.id,
      name ?? this.name,
      this.nodeIds,
      description ?? this.description,
      this.parentGroupId,
      this.childGroupIds,
      this.onTheBubble,
      this.colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update color configuration
   * Returns new instance to maintain immutability
   */
  updateColorConfig(colorConfig: { primary: string; border: string; background: string }): ScreenGroup {
    return new ScreenGroup(
      this.id,
      this.name,
      this.nodeIds,
      this.description,
      this.parentGroupId,
      this.childGroupIds,
      this.onTheBubble,
      colorConfig,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Convert to plain object for storage/serialization
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodeIds: this.nodeIds,
      parentGroupId: this.parentGroupId,
      childGroupIds: this.childGroupIds,
      onTheBubble: this.onTheBubble,
      colorConfig: this.colorConfig,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create ScreenGroup instance from plain object
   */
  static fromJSON(data: any): ScreenGroup {
    return new ScreenGroup(
      data.id,
      data.name,
      data.nodeIds || [],
      data.description,
      data.parentGroupId,
      data.childGroupIds || [],
      data.onTheBubble || false,
      data.colorConfig,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  /**
   * Create a new screen group with minimal required data
   */
  static create(
    id: string,
    name: string,
    description?: string,
    parentGroupId?: string
  ): ScreenGroup {
    return new ScreenGroup(id, name, [], description, parentGroupId);
  }

  /**
   * Validate business rules for screen group
   */
  static async validateBusinessRules(screenGroup: ScreenGroup): Promise<string[]> {
    const errors: string[] = [];

    // Must have a name
    if (!screenGroup.name || screenGroup.name.trim().length === 0) {
      errors.push('Screen group must have a non-empty name');
    }

    // Cannot be parent of itself
    if (screenGroup.parentGroupId === screenGroup.id) {
      errors.push('Screen group cannot be parent of itself');
    }

    // Cannot have itself as child
    if (screenGroup.childGroupIds.includes(screenGroup.id)) {
      errors.push('Screen group cannot contain itself as a child');
    }

    // Validate group instance
    try {
      await screenGroup.validate();
    } catch (validationErrors: any) {
      const messages = Array.isArray(validationErrors)
        ? validationErrors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ')
        : validationErrors.message;
      errors.push(`Validation errors: ${messages}`);
    }

    return errors;
  }
}