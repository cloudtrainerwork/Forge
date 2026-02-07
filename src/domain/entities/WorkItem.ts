import { IsString, IsOptional, IsObject, IsNotEmpty, validateOrReject } from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { ReadinessState, ReadinessDimension } from './ReadinessState.js';

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
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.spec = spec || {};
    this.readiness = readiness || new ReadinessState();
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
  updateReadiness(dimension: keyof ReadinessState, value: ReadinessDimension): WorkItem {
    const updatedReadiness = this.readiness.updateDimension(dimension, value);
    return new WorkItem(
      this.id,
      this.spec,
      this.title,
      this.description,
      updatedReadiness,
      this.createdAt,
      new Date() // Update timestamp
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
      this.createdAt,
      new Date() // Update timestamp
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
      this.createdAt,
      new Date() // Update timestamp
    );
  }

  /**
   * Convert to plain object for storage/serialization
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      spec: this.spec,
      readiness: this.readiness.toJSON(),
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
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  /**
   * Create a new work item with minimal required data
   */
  static create(
    id: string,
    title: string,
    spec: Record<string, any> = {},
    description?: string
  ): WorkItem {
    return new WorkItem(id, spec, title, description);
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