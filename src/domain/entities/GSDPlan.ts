import { IsString, IsOptional, IsEnum, IsNotEmpty, IsArray, IsBoolean, IsObject, validateOrReject } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

/**
 * Task types supported in GSD XML structure
 */
export enum GSDTaskType {
  AUTO = 'auto',
  CHECKPOINT_HUMAN_VERIFY = 'checkpoint:human-verify',
  CHECKPOINT_DECISION = 'checkpoint:decision',
  CHECKPOINT_HUMAN_ACTION = 'checkpoint:human-action'
}

/**
 * Zod schema for GSDTaskType
 */
export const GSDTaskTypeSchema = z.enum(['auto', 'checkpoint:human-verify', 'checkpoint:decision', 'checkpoint:human-action']);

/**
 * GSD Task verification configuration
 */
export class GSDTaskVerification {
  @IsString()
  @Expose()
  automated: string;

  @IsString()
  @IsOptional()
  @Expose()
  manual?: string;

  constructor(automated: string, manual?: string) {
    this.automated = automated;
    this.manual = manual;
  }

  toJSON() {
    return {
      automated: this.automated,
      manual: this.manual
    };
  }

  static fromJSON(data: any): GSDTaskVerification {
    return new GSDTaskVerification(data.automated, data.manual);
  }
}

/**
 * Zod schema for GSDTaskVerification
 */
export const GSDTaskVerificationSchema = z.object({
  automated: z.string(),
  manual: z.string().optional()
});

/**
 * Individual GSD task with execution metadata
 */
export class GSDTask {
  @IsString()
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsEnum(GSDTaskType)
  @Expose()
  type: GSDTaskType;

  @IsArray()
  @IsString({ each: true })
  @Expose()
  files: string[];

  @IsString()
  @IsNotEmpty()
  @Expose()
  description: string;

  @IsObject()
  @Expose()
  verification: GSDTaskVerification;

  @IsString()
  @Expose()
  done: string;

  constructor(
    name: string,
    description: string,
    files: string[] = [],
    type: GSDTaskType = GSDTaskType.AUTO,
    verification?: GSDTaskVerification,
    done?: string,
    id?: string
  ) {
    this.id = id || uuidv4();
    this.name = name;
    this.type = type;
    this.files = files;
    this.description = description;
    this.verification = verification || new GSDTaskVerification('Task completed successfully');
    this.done = done || 'Task objectives met and verified';
  }

  /**
   * Validate the task
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
    await validateOrReject(this.verification);
  }

  /**
   * Convert to JSON for storage/serialization
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      files: this.files,
      description: this.description,
      verification: this.verification.toJSON(),
      done: this.done
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): GSDTask {
    return new GSDTask(
      data.name,
      data.description,
      data.files || [],
      data.type || GSDTaskType.AUTO,
      data.verification ? GSDTaskVerification.fromJSON(data.verification) : undefined,
      data.done,
      data.id
    );
  }
}

/**
 * Zod schema for GSDTask
 */
export const GSDTaskSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  name: z.string().min(1),
  type: GSDTaskTypeSchema.default('auto'),
  files: z.array(z.string()).default([]),
  description: z.string().min(1),
  verification: GSDTaskVerificationSchema.default({ automated: 'Task completed successfully' }),
  done: z.string().default('Task objectives met and verified')
});

/**
 * GSD Wave for organizing tasks with execution dependencies
 */
export class GSDWave {
  @IsString()
  @Expose()
  id: string;

  @IsBoolean()
  @Expose()
  parallel: boolean;

  @IsArray()
  @Expose()
  tasks: GSDTask[];

  @IsArray()
  @IsString({ each: true })
  @Expose()
  dependencies: string[];

  constructor(
    tasks: GSDTask[] = [],
    parallel: boolean = false,
    dependencies: string[] = [],
    id?: string
  ) {
    this.id = id || uuidv4();
    this.parallel = parallel;
    this.tasks = tasks;
    this.dependencies = dependencies;
  }

  /**
   * Add a task to this wave
   */
  addTask(task: GSDTask): void {
    if (this.tasks.length >= 3) {
      throw new Error('GSD Wave cannot contain more than 3 tasks (atomic constraint)');
    }
    this.tasks.push(task);
  }

  /**
   * Remove a task from this wave
   */
  removeTask(taskId: string): boolean {
    const index = this.tasks.findIndex(task => task.id === taskId);
    if (index >= 0) {
      this.tasks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.length;
  }

  /**
   * Check if wave is at maximum capacity
   */
  isAtMaxCapacity(): boolean {
    return this.tasks.length >= 3;
  }

  /**
   * Validate the wave
   */
  async validate(): Promise<void> {
    await validateOrReject(this);

    // Validate atomic constraint
    if (this.tasks.length > 3) {
      throw new Error('GSD Wave cannot contain more than 3 tasks (atomic constraint)');
    }

    // Validate all tasks
    for (const task of this.tasks) {
      await task.validate();
    }
  }

  /**
   * Convert to JSON for storage/serialization
   */
  toJSON() {
    return {
      id: this.id,
      parallel: this.parallel,
      tasks: this.tasks.map(task => task.toJSON()),
      dependencies: this.dependencies
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): GSDWave {
    const tasks = data.tasks ? data.tasks.map((taskData: any) => GSDTask.fromJSON(taskData)) : [];
    return new GSDWave(
      tasks,
      data.parallel || false,
      data.dependencies || [],
      data.id
    );
  }
}

/**
 * Zod schema for GSDWave
 */
export const GSDWaveSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  parallel: z.boolean().default(false),
  tasks: z.array(GSDTaskSchema).max(3, 'GSD Wave cannot contain more than 3 tasks (atomic constraint)').default([]),
  dependencies: z.array(z.string()).default([])
});

/**
 * GSD Plan metadata
 */
export class GSDPlanMetadata {
  @IsString()
  @Expose()
  phase: string;

  @IsString()
  @Expose()
  plan: string;

  @IsString()
  @Expose()
  type: string;

  @IsString()
  @Expose()
  subsystem: string;

  @IsArray()
  @IsString({ each: true })
  @Expose()
  tags: string[];

  constructor(
    phase: string,
    plan: string,
    type: string = 'execute',
    subsystem: string = 'export-engine',
    tags: string[] = []
  ) {
    this.phase = phase;
    this.plan = plan;
    this.type = type;
    this.subsystem = subsystem;
    this.tags = tags;
  }

  toJSON() {
    return {
      phase: this.phase,
      plan: this.plan,
      type: this.type,
      subsystem: this.subsystem,
      tags: this.tags
    };
  }

  static fromJSON(data: any): GSDPlanMetadata {
    return new GSDPlanMetadata(
      data.phase,
      data.plan,
      data.type || 'execute',
      data.subsystem || 'export-engine',
      data.tags || []
    );
  }
}

/**
 * Zod schema for GSDPlanMetadata
 */
export const GSDPlanMetadataSchema = z.object({
  phase: z.string(),
  plan: z.string(),
  type: z.string().default('execute'),
  subsystem: z.string().default('export-engine'),
  tags: z.array(z.string()).default([])
});

/**
 * Complete GSD Plan with wave-based execution structure
 * Enforces atomic task constraints (maximum 3 tasks total)
 */
export class GSDPlan {
  @IsString()
  @Expose()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  title: string;

  @IsArray()
  @Expose()
  waves: GSDWave[];

  @IsObject()
  @Expose()
  metadata: GSDPlanMetadata;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    title: string,
    waves: GSDWave[] = [],
    metadata?: GSDPlanMetadata,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id || uuidv4();
    this.title = title;
    this.waves = waves;
    this.metadata = metadata || new GSDPlanMetadata('06', '01');
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Add a wave to the plan
   */
  addWave(wave: GSDWave): void {
    // Check atomic constraint: total tasks across all waves <= 3
    const currentTaskCount = this.getTotalTaskCount();
    const newTaskCount = wave.getTaskCount();

    if (currentTaskCount + newTaskCount > 3) {
      throw new Error(`GSD Plan atomic constraint violated: total tasks would be ${currentTaskCount + newTaskCount}, maximum allowed is 3`);
    }

    this.waves.push(wave);
    this.updatedAt = new Date();
  }

  /**
   * Remove a wave from the plan
   */
  removeWave(waveId: string): boolean {
    const index = this.waves.findIndex(wave => wave.id === waveId);
    if (index >= 0) {
      this.waves.splice(index, 1);
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get total task count across all waves
   */
  getTotalTaskCount(): number {
    return this.waves.reduce((total, wave) => total + wave.getTaskCount(), 0);
  }

  /**
   * Check if plan is at maximum task capacity
   */
  isAtMaxTaskCapacity(): boolean {
    return this.getTotalTaskCount() >= 3;
  }

  /**
   * Get all tasks from all waves
   */
  getAllTasks(): GSDTask[] {
    return this.waves.flatMap(wave => wave.tasks);
  }

  /**
   * Find a task by ID
   */
  findTask(taskId: string): GSDTask | undefined {
    for (const wave of this.waves) {
      const task = wave.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  /**
   * Validate the plan and enforce atomic constraints
   */
  async validate(): Promise<void> {
    await validateOrReject(this);
    await validateOrReject(this.metadata);

    // Validate atomic constraint
    const totalTasks = this.getTotalTaskCount();
    if (totalTasks > 3) {
      throw new Error(`GSD Plan atomic constraint violated: ${totalTasks} tasks found, maximum allowed is 3`);
    }

    // Validate all waves
    for (const wave of this.waves) {
      await wave.validate();
    }
  }

  /**
   * Convert to JSON for storage/serialization
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      waves: this.waves.map(wave => wave.toJSON()),
      metadata: this.metadata.toJSON(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }

  /**
   * Create from JSON data
   */
  static fromJSON(data: any): GSDPlan {
    const waves = data.waves ? data.waves.map((waveData: any) => GSDWave.fromJSON(waveData)) : [];
    return new GSDPlan(
      data.title,
      waves,
      data.metadata ? GSDPlanMetadata.fromJSON(data.metadata) : undefined,
      data.id,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }

  /**
   * Create a new empty GSD plan
   */
  static createEmpty(title: string = 'Untitled GSD Plan'): GSDPlan {
    return new GSDPlan(title);
  }

  /**
   * Validate business rules for GSD plan
   */
  static async validateBusinessRules(plan: GSDPlan): Promise<string[]> {
    const errors: string[] = [];

    // Title must be present
    if (!plan.title || plan.title.trim().length === 0) {
      errors.push('Plan title is required');
    }

    // Atomic constraint validation
    const totalTasks = plan.getTotalTaskCount();
    if (totalTasks > 3) {
      errors.push(`Plan violates atomic constraint: ${totalTasks} tasks found, maximum allowed is 3`);
    }

    // Each wave must not exceed 3 tasks
    for (let i = 0; i < plan.waves.length; i++) {
      const wave = plan.waves[i];
      if (wave.getTaskCount() > 3) {
        errors.push(`Wave ${i + 1} violates atomic constraint: ${wave.getTaskCount()} tasks found, maximum allowed is 3`);
      }
    }

    // Validate each component
    try {
      await plan.validate();
    } catch (validationErrors: any) {
      const messages = Array.isArray(validationErrors)
        ? validationErrors.map((error: any) => Object.values(error.constraints || {}).join(', ')).join('; ')
        : validationErrors.message;
      errors.push(`Plan validation errors: ${messages}`);
    }

    return errors;
  }
}

/**
 * Zod schema for complete GSDPlan
 */
export const GSDPlanSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  title: z.string().min(1),
  waves: z.array(GSDWaveSchema).default([]),
  metadata: GSDPlanMetadataSchema.default(() => ({ phase: '06', plan: '01', type: 'execute', subsystem: 'export-engine', tags: [] })),
  createdAt: z.string().datetime().or(z.date()).transform(val =>
    typeof val === 'string' ? val : val.toISOString()
  ).default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().or(z.date()).transform(val =>
    typeof val === 'string' ? val : val.toISOString()
  ).default(() => new Date().toISOString())
}).transform(data => {
  // Transform the plain object into a GSDPlan instance
  return GSDPlan.fromJSON(data);
}).refine(plan => plan.getTotalTaskCount() <= 3, {
  message: 'GSD Plan atomic constraint violated: maximum 3 tasks allowed across all waves'
});