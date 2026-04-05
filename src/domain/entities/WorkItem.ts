import { IsString, IsOptional, IsObject, IsNotEmpty, IsEnum, validateOrReject } from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { ReadinessState, ReadinessDimension, ReadinessDimensionKey } from './ReadinessState.js';

export enum DeliverableType {
  GENERIC = 'generic',
  FEATURE = 'feature',
  SCREEN = 'screen',
  SERVICE = 'service',
  INTEGRATION = 'integration',
  DTO = 'dto',
  TEST = 'test',
  COMPONENT = 'component',
  API = 'api',
  DATABASE = 'database',
  DOCUMENTATION = 'documentation',
  CONFIG = 'config',
  VIEWMODEL = 'viewmodel',
  MANAGER = 'manager',
}

/**
 * Implementation status tracks how "built" a work item is (Harvey ball levels).
 * Independent of the 6-dimensional planning readiness.
 */
export enum ImplementationStatus {
  NOT_STARTED = 'NOT_STARTED',
  STUBBED = 'STUBBED',
  PARTIAL = 'PARTIAL',
  FUNCTIONAL = 'FUNCTIONAL',
  PRODUCTION = 'PRODUCTION',
}

/**
 * WorkItem domain entity represents a unit of work with flexible specifications
 * and enforced 6-dimensional readiness tracking
 */
export class WorkItem {
  @IsString()
  @IsNotEmpty()
  @Expose()
  id: string;

  @IsString()
  @IsOptional()
  @Expose()
  tenantId?: string;

  @IsString()
  @IsOptional()
  @Expose()
  title?: string;

  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  @Expose()
  spec: Record<string, any>; // Flexible work item specifications

  @Type(() => ReadinessState)
  @IsNotEmpty()
  @Expose()
  readiness: ReadinessState;

  @IsString()
  @IsOptional()
  @Expose()
  groupId?: string; // Screen group this work item belongs to

  @IsString()
  @IsOptional()
  @Expose()
  sprintId?: string; // Sprint this work item is assigned to

  @IsString()
  @IsOptional()
  @Expose()
  parentId?: string; // Parent work item for hierarchical relationships

  @IsEnum(DeliverableType)
  @IsOptional()
  @Expose()
  deliverableType?: DeliverableType; // Type of deliverable this work item represents

  @IsEnum(ImplementationStatus)
  @IsOptional()
  @Expose()
  implementationStatus: ImplementationStatus; // Harvey ball: how "built" is this item

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    id: string,
    spec: Record<string, any>,
    title?: string,
    description?: string,
    readiness?: ReadinessState,
    groupId?: string,
    sprintId?: string,
    parentId?: string,
    deliverableType?: DeliverableType,
    createdAt?: Date,
    updatedAt?: Date,
    tenantId?: string,
    implementationStatus?: ImplementationStatus,
  ) {
    this.id = id;
    this.tenantId = tenantId;
    this.title = title;
    this.description = description;
    this.spec = spec || {};
    this.readiness = readiness || new ReadinessState();
    this.groupId = groupId;
    this.sprintId = sprintId;
    this.parentId = parentId;
    this.deliverableType = deliverableType;
    this.implementationStatus = implementationStatus || ImplementationStatus.NOT_STARTED;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate the work item instance
   * Throws ValidationError if invalid
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
    await validateOrReject(this.readiness);
  }

  /**
   * Check if work item is ready for execution
   * Prevents incomplete nodes from entering ready state
   */
  isReady(): boolean {
    return this.readiness.isComplete();
  }

  /**
   * Check if work item has any progress
   */
  hasStarted(): boolean {
    return this.readiness.hasStarted();
  }

  /**
   * Get overall completion percentage
   */
  getCompletionPercentage(): number {
    return this.readiness.getCompletionPercentage();
  }

  /**
   * Get list of incomplete readiness dimensions
   */
  getBlockingDimensions(): string[] {
    return this.readiness.getIncompleteDimensions();
  }

  /**
   * Update a specific readiness dimension
   * Returns new instance to maintain immutability
   */
  updateReadiness(dimension: ReadinessDimensionKey, value: ReadinessDimension): WorkItem {
    const updatedReadiness = this.readiness.updateDimension(dimension, value);
    return new WorkItem(
      this.id,
      this.spec,
      this.title,
      this.description,
      updatedReadiness,
      this.groupId,
      this.sprintId,
      this.parentId,
      this.deliverableType,
      this.createdAt,
      new Date(),
      this.tenantId,
      this.implementationStatus,
    );
  }

  /**
   * Update work item specifications
   * Returns new instance to maintain immutability
   */
  updateSpec(newSpec: Record<string, any>): WorkItem {
    return new WorkItem(
      this.id,
      { ...this.spec, ...newSpec },
      this.title,
      this.description,
      this.readiness,
      this.groupId,
      this.sprintId,
      this.parentId,
      this.deliverableType,
      this.createdAt,
      new Date(),
      this.tenantId,
      this.implementationStatus,
    );
  }

  /**
   * Update basic properties
   * Returns new instance to maintain immutability
   */
  updateInfo(title?: string, description?: string): WorkItem {
    return new WorkItem(
      this.id,
      this.spec,
      title ?? this.title,
      description ?? this.description,
      this.readiness,
      this.groupId,
      this.sprintId,
      this.parentId,
      this.deliverableType,
      this.createdAt,
      new Date(),
      this.tenantId,
      this.implementationStatus,
    );
  }

  /**
   * Update grouping and sprint assignment
   * Returns new instance to maintain immutability
   */
  updateAssignments(
    groupId?: string,
    sprintId?: string,
    parentId?: string,
    deliverableType?: DeliverableType
  ): WorkItem {
    return new WorkItem(
      this.id,
      this.spec,
      this.title,
      this.description,
      this.readiness,
      groupId ?? this.groupId,
      sprintId ?? this.sprintId,
      parentId ?? this.parentId,
      deliverableType ?? this.deliverableType,
      this.createdAt,
      new Date(),
      this.tenantId,
      this.implementationStatus,
    );
  }

  /**
   * Update implementation status (Harvey ball level)
   * Returns new instance to maintain immutability
   */
  updateImplementationStatus(status: ImplementationStatus): WorkItem {
    return new WorkItem(
      this.id,
      this.spec,
      this.title,
      this.description,
      this.readiness,
      this.groupId,
      this.sprintId,
      this.parentId,
      this.deliverableType,
      this.createdAt,
      new Date(),
      this.tenantId,
      status,
    );
  }

  /**
   * Check if work item is assigned to a group
   */
  isGrouped(): boolean {
    return !!this.groupId;
  }

  /**
   * Check if work item is assigned to a sprint
   */
  isScheduled(): boolean {
    return !!this.sprintId;
  }

  /**
   * Check if work item has a parent (is a child item)
   */
  isChildItem(): boolean {
    return !!this.parentId;
  }

  /**
   * Get deliverable type or default to component
   */
  getDeliverableType(): DeliverableType {
    return this.deliverableType || DeliverableType.COMPONENT;
  }

  /**
   * Convert to plain object for storage/serialization
   */
  toJSON() {
    const pos = this.spec?._position as { x?: number; y?: number } | undefined;
    return {
      id: this.id,
      tenantId: this.tenantId,
      title: this.title,
      description: this.description,
      spec: this.spec,
      x: pos?.x ?? null,
      y: pos?.y ?? null,
      readiness: this.readiness.toJSON(),
      type: this.deliverableType ? this.deliverableType.toUpperCase() : null,
      groupId: this.groupId,
      sprintId: this.sprintId,
      parentId: this.parentId || null,
      deliverableType: this.deliverableType,
      implementationStatus: this.implementationStatus,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create WorkItem instance from plain object
   */
  static fromJSON(data: any): WorkItem {
    return new WorkItem(
      data.id,
      data.spec,
      data.title,
      data.description,
      ReadinessState.fromJSON(data.readiness),
      data.groupId,
      data.sprintId,
      data.parentId,
      data.deliverableType,
      new Date(data.createdAt),
      new Date(data.updatedAt),
      data.tenantId,
      data.implementationStatus as ImplementationStatus || ImplementationStatus.NOT_STARTED,
    );
  }

  /**
   * Create a new work item with minimal required data
   */
  static create(
    id: string,
    title: string,
    spec: Record<string, any> = {},
    description?: string,
    deliverableType?: DeliverableType,
    tenantId?: string,
    implementationStatus?: ImplementationStatus,
  ): WorkItem {
    return new WorkItem(id, spec, title, description, undefined, undefined, undefined, undefined, deliverableType, undefined, undefined, tenantId, implementationStatus);
  }

  /**
   * Validate business rules for work item creation
   */
  static async validateBusinessRules(workItem: WorkItem): Promise<string[]> {
    const errors: string[] = [];

    // Must have either title or meaningful spec
    if (!workItem.title && (!workItem.spec || Object.keys(workItem.spec).length === 0)) {
      errors.push('Work item must have either a title or meaningful specifications');
    }

    // Spec must be a valid object if provided
    if (workItem.spec && typeof workItem.spec !== 'object') {
      errors.push('Work item specifications must be a valid object');
    }

    // Validate readiness state
    try {
      await workItem.validate();
    } catch (validationErrors: any) {
      const messages = Array.isArray(validationErrors)
        ? validationErrors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ')
        : validationErrors.message;
      errors.push(`Validation errors: ${messages}`);
    }

    return errors;
  }
}