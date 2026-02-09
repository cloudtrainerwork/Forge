import { IsString, IsArray, IsOptional, IsNotEmpty, IsNumber, IsEnum, validateOrReject } from 'class-validator';
import { Expose, Transform } from 'class-transformer';

export enum SprintStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETE = 'complete',
  CANCELLED = 'cancelled'
}

/**
 * Sprint domain entity represents a time-boxed development cycle
 * for organizing screen groups and tracking delivery progress
 */
export class Sprint {
  @IsString()
  @IsNotEmpty()
  @Expose()
  id: string;

  @IsNumber()
  @Expose()
  number: number; // Sprint sequence number (e.g., Sprint 5, 6, 7)

  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  startDate: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  endDate: Date;

  @IsArray()
  @IsString({ each: true })
  @Expose()
  plannedGroupIds: string[]; // Screen groups assigned to this sprint

  @IsEnum(SprintStatus)
  @Expose()
  status: SprintStatus;

  @IsString()
  @IsOptional()
  @Expose()
  goal?: string; // Sprint goal or objective

  @IsString()
  @IsOptional()
  @Expose()
  acceptanceCriteria?: string; // Sprint completion criteria

  @IsNumber()
  @IsOptional()
  @Expose()
  plannedVelocity?: number; // Estimated story points or effort

  @IsNumber()
  @IsOptional()
  @Expose()
  actualVelocity?: number; // Actual completed effort

  @IsNumber()
  @IsOptional()
  @Expose()
  capacity?: number; // Team capacity (person-days, story points, etc.)

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    id: string,
    number: number,
    name: string,
    startDate: Date,
    endDate: Date,
    plannedGroupIds: string[] = [],
    status: SprintStatus = SprintStatus.PLANNING,
    description?: string,
    goal?: string,
    acceptanceCriteria?: string,
    plannedVelocity?: number,
    actualVelocity?: number,
    capacity?: number,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id;
    this.number = number;
    this.name = name;
    this.description = description;
    this.startDate = startDate;
    this.endDate = endDate;
    this.plannedGroupIds = plannedGroupIds;
    this.status = status;
    this.goal = goal;
    this.acceptanceCriteria = acceptanceCriteria;
    this.plannedVelocity = plannedVelocity;
    this.actualVelocity = actualVelocity;
    this.capacity = capacity;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Validate the sprint instance
   * Throws ValidationError if invalid
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
  }

  /**
   * Get sprint duration in days
   */
  getDurationDays(): number {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if sprint is currently active
   */
  isActive(): boolean {
    return this.status === SprintStatus.ACTIVE;
  }

  /**
   * Check if sprint is in planning phase
   */
  isPlanning(): boolean {
    return this.status === SprintStatus.PLANNING;
  }

  /**
   * Check if sprint is completed
   */
  isComplete(): boolean {
    return this.status === SprintStatus.COMPLETE;
  }

  /**
   * Check if current date is within sprint dates
   */
  isCurrentSprint(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * Get number of groups assigned to sprint
   */
  getGroupCount(): number {
    return this.plannedGroupIds.length;
  }

  /**
   * Check if sprint is over capacity (if capacity is set)
   */
  isOverCapacity(): boolean {
    if (!this.capacity || !this.plannedVelocity) return false;
    return this.plannedVelocity > this.capacity;
  }

  /**
   * Get capacity utilization percentage
   */
  getCapacityUtilization(): number {
    if (!this.capacity || !this.plannedVelocity) return 0;
    return Math.round((this.plannedVelocity / this.capacity) * 100);
  }

  /**
   * Add group to sprint
   * Returns new instance to maintain immutability
   */
  addGroup(groupId: string): Sprint {
    if (this.plannedGroupIds.includes(groupId)) {
      return this; // Already included
    }

    return new Sprint(
      this.id,
      this.number,
      this.name,
      this.startDate,
      this.endDate,
      [...this.plannedGroupIds, groupId],
      this.status,
      this.description,
      this.goal,
      this.acceptanceCriteria,
      this.plannedVelocity,
      this.actualVelocity,
      this.capacity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Remove group from sprint
   * Returns new instance to maintain immutability
   */
  removeGroup(groupId: string): Sprint {
    const updatedGroupIds = this.plannedGroupIds.filter(id => id !== groupId);

    return new Sprint(
      this.id,
      this.number,
      this.name,
      this.startDate,
      this.endDate,
      updatedGroupIds,
      this.status,
      this.description,
      this.goal,
      this.acceptanceCriteria,
      this.plannedVelocity,
      this.actualVelocity,
      this.capacity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update sprint status
   * Returns new instance to maintain immutability
   */
  updateStatus(status: SprintStatus): Sprint {
    return new Sprint(
      this.id,
      this.number,
      this.name,
      this.startDate,
      this.endDate,
      this.plannedGroupIds,
      status,
      this.description,
      this.goal,
      this.acceptanceCriteria,
      this.plannedVelocity,
      this.actualVelocity,
      this.capacity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update sprint velocity
   * Returns new instance to maintain immutability
   */
  updateVelocity(plannedVelocity?: number, actualVelocity?: number): Sprint {
    return new Sprint(
      this.id,
      this.number,
      this.name,
      this.startDate,
      this.endDate,
      this.plannedGroupIds,
      this.status,
      this.description,
      this.goal,
      this.acceptanceCriteria,
      plannedVelocity ?? this.plannedVelocity,
      actualVelocity ?? this.actualVelocity,
      this.capacity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update sprint dates
   * Returns new instance to maintain immutability
   */
  updateDates(startDate: Date, endDate: Date): Sprint {
    return new Sprint(
      this.id,
      this.number,
      this.name,
      startDate,
      endDate,
      this.plannedGroupIds,
      this.status,
      this.description,
      this.goal,
      this.acceptanceCriteria,
      this.plannedVelocity,
      this.actualVelocity,
      this.capacity,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update sprint information
   * Returns new instance to maintain immutability
   */
  updateInfo(
    name?: string,
    description?: string,
    goal?: string,
    acceptanceCriteria?: string,
    capacity?: number
  ): Sprint {
    return new Sprint(
      this.id,
      this.number,
      name ?? this.name,
      this.startDate,
      this.endDate,
      this.plannedGroupIds,
      this.status,
      description ?? this.description,
      goal ?? this.goal,
      acceptanceCriteria ?? this.acceptanceCriteria,
      this.plannedVelocity,
      this.actualVelocity,
      capacity ?? this.capacity,
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
      number: this.number,
      name: this.name,
      description: this.description,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      plannedGroupIds: this.plannedGroupIds,
      status: this.status,
      goal: this.goal,
      acceptanceCriteria: this.acceptanceCriteria,
      plannedVelocity: this.plannedVelocity,
      actualVelocity: this.actualVelocity,
      capacity: this.capacity,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create Sprint instance from plain object
   */
  static fromJSON(data: any): Sprint {
    return new Sprint(
      data.id,
      data.number,
      data.name,
      new Date(data.startDate),
      new Date(data.endDate),
      data.plannedGroupIds || [],
      data.status || SprintStatus.PLANNING,
      data.description,
      data.goal,
      data.acceptanceCriteria,
      data.plannedVelocity,
      data.actualVelocity,
      data.capacity,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  /**
   * Create a new sprint with minimal required data
   */
  static create(
    id: string,
    number: number,
    name: string,
    startDate: Date,
    endDate: Date,
    goal?: string
  ): Sprint {
    return new Sprint(id, number, name, startDate, endDate, [], SprintStatus.PLANNING, undefined, goal);
  }

  /**
   * Validate business rules for sprint
   */
  static async validateBusinessRules(sprint: Sprint): Promise<string[]> {
    const errors: string[] = [];

    // Must have a name
    if (!sprint.name || sprint.name.trim().length === 0) {
      errors.push('Sprint must have a non-empty name');
    }

    // Start date must be before end date
    if (sprint.startDate >= sprint.endDate) {
      errors.push('Sprint start date must be before end date');
    }

    // Sprint number must be positive
    if (sprint.number <= 0) {
      errors.push('Sprint number must be positive');
    }

    // Velocity values must be non-negative if provided
    if (sprint.plannedVelocity !== undefined && sprint.plannedVelocity < 0) {
      errors.push('Planned velocity cannot be negative');
    }

    if (sprint.actualVelocity !== undefined && sprint.actualVelocity < 0) {
      errors.push('Actual velocity cannot be negative');
    }

    // Capacity must be positive if provided
    if (sprint.capacity !== undefined && sprint.capacity <= 0) {
      errors.push('Sprint capacity must be positive');
    }

    // Sprint duration should be reasonable (between 1 and 30 days)
    const durationDays = sprint.getDurationDays();
    if (durationDays < 1 || durationDays > 30) {
      errors.push('Sprint duration should be between 1 and 30 days');
    }

    // Validate sprint instance
    try {
      await sprint.validate();
    } catch (validationErrors: any) {
      const messages = Array.isArray(validationErrors)
        ? validationErrors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ')
        : validationErrors.message;
      errors.push(`Validation errors: ${messages}`);
    }

    return errors;
  }
}