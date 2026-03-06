import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * Enum representing the completion state of each readiness dimension
 */
export enum ReadinessDimension {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE'
}

/**
 * Type representing all readiness dimension keys
 */
export type ReadinessDimensionKey = 'requirements' | 'design' | 'frontend' | 'backend' | 'integration' | 'test';

/**
 * Type mapping dimension keys to their percentage property keys
 */
type DimensionPercentageKey<T extends ReadinessDimensionKey> = `${T}Percentage`;

/**
 * ReadinessState enforces the 6-dimensional readiness structure
 * Each dimension tracks progress and completion state with both discrete states and percentage
 * Required for determining if work items are ready for execution
 */
export class ReadinessState {
  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  requirements: ReadinessDimension;

  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  design: ReadinessDimension;

  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  frontend: ReadinessDimension;

  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  backend: ReadinessDimension;

  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  integration: ReadinessDimension;

  @IsEnum(ReadinessDimension)
  @IsNotEmpty()
  @Expose()
  test: ReadinessDimension;

  // Percentage-based tracking (0-100) for fine-grained progress
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  requirementsPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  designPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  frontendPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  backendPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  integrationPercentage?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Expose()
  testPercentage?: number;

  constructor(
    requirements: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    design: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    frontend: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    backend: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    integration: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    test: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    percentages?: {
      requirements?: number;
      design?: number;
      frontend?: number;
      backend?: number;
      integration?: number;
      test?: number;
    }
  ) {
    this.requirements = requirements;
    this.design = design;
    this.frontend = frontend;
    this.backend = backend;
    this.integration = integration;
    this.test = test;

    // Set percentages if provided
    if (percentages) {
      this.requirementsPercentage = percentages.requirements;
      this.designPercentage = percentages.design;
      this.frontendPercentage = percentages.frontend;
      this.backendPercentage = percentages.backend;
      this.integrationPercentage = percentages.integration;
      this.testPercentage = percentages.test;
    }
  }

  /**
   * Validate that all dimensions are complete before marking work item as ready
   * Prevents incomplete nodes from entering ready state
   */
  isComplete(): boolean {
    return (
      this.requirements === ReadinessDimension.COMPLETE &&
      this.design === ReadinessDimension.COMPLETE &&
      this.frontend === ReadinessDimension.COMPLETE &&
      this.backend === ReadinessDimension.COMPLETE &&
      this.integration === ReadinessDimension.COMPLETE &&
      this.test === ReadinessDimension.COMPLETE
    );
  }

  /**
   * Check if any dimension has started (not all NOT_STARTED)
   */
  hasStarted(): boolean {
    return (
      this.requirements !== ReadinessDimension.NOT_STARTED ||
      this.design !== ReadinessDimension.NOT_STARTED ||
      this.frontend !== ReadinessDimension.NOT_STARTED ||
      this.backend !== ReadinessDimension.NOT_STARTED ||
      this.integration !== ReadinessDimension.NOT_STARTED ||
      this.test !== ReadinessDimension.NOT_STARTED
    );
  }

  /**
   * Get completion percentage (0-100)
   */
  getCompletionPercentage(): number {
    const dimensions = [
      this.requirements,
      this.design,
      this.frontend,
      this.backend,
      this.integration,
      this.test,
    ];

    const completedCount = dimensions.filter(
      (dimension) => dimension === ReadinessDimension.COMPLETE
    ).length;

    return Math.round((completedCount / dimensions.length) * 100);
  }

  /**
   * Get array of incomplete dimensions
   */
  getIncompleteDimensions(): string[] {
    const incomplete: string[] = [];

    if (this.requirements !== ReadinessDimension.COMPLETE) incomplete.push('requirements');
    if (this.design !== ReadinessDimension.COMPLETE) incomplete.push('design');
    if (this.frontend !== ReadinessDimension.COMPLETE) incomplete.push('frontend');
    if (this.backend !== ReadinessDimension.COMPLETE) incomplete.push('backend');
    if (this.integration !== ReadinessDimension.COMPLETE) incomplete.push('integration');
    if (this.test !== ReadinessDimension.COMPLETE) incomplete.push('test');

    return incomplete;
  }

  /**
   * Create a copy with updated dimension
   */
  updateDimension(dimension: ReadinessDimensionKey, value: ReadinessDimension, percentage?: number): ReadinessState {
    const updated = new ReadinessState(
      this.requirements,
      this.design,
      this.frontend,
      this.backend,
      this.integration,
      this.test,
      {
        requirements: this.requirementsPercentage,
        design: this.designPercentage,
        frontend: this.frontendPercentage,
        backend: this.backendPercentage,
        integration: this.integrationPercentage,
        test: this.testPercentage,
      }
    );

    // Type-safe dimension update
    switch (dimension) {
      case 'requirements':
        updated.requirements = value;
        if (percentage !== undefined) updated.requirementsPercentage = percentage;
        break;
      case 'design':
        updated.design = value;
        if (percentage !== undefined) updated.designPercentage = percentage;
        break;
      case 'frontend':
        updated.frontend = value;
        if (percentage !== undefined) updated.frontendPercentage = percentage;
        break;
      case 'backend':
        updated.backend = value;
        if (percentage !== undefined) updated.backendPercentage = percentage;
        break;
      case 'integration':
        updated.integration = value;
        if (percentage !== undefined) updated.integrationPercentage = percentage;
        break;
      case 'test':
        updated.test = value;
        if (percentage !== undefined) updated.testPercentage = percentage;
        break;
    }

    return updated;
  }

  /**
   * Validate state transition based on business rules
   * Returns validation errors if transition is invalid
   */
  validateStateTransition(dimension: ReadinessDimensionKey, newValue: ReadinessDimension): string[] {
    const errors: string[] = [];

    // Business rule: Backend cannot be COMPLETE without Design COMPLETE
    if (dimension === 'backend' && newValue === ReadinessDimension.COMPLETE && this.design !== ReadinessDimension.COMPLETE) {
      errors.push('Backend cannot be marked complete without Design being complete');
    }

    // Business rule: Integration requires Frontend and Backend COMPLETE
    if (dimension === 'integration' && newValue === ReadinessDimension.COMPLETE) {
      if (this.frontend !== ReadinessDimension.COMPLETE) {
        errors.push('Integration cannot be marked complete without Frontend being complete');
      }
      if (this.backend !== ReadinessDimension.COMPLETE) {
        errors.push('Integration cannot be marked complete without Backend being complete');
      }
    }

    // Business rule: Test requires Integration COMPLETE
    if (dimension === 'test' && newValue === ReadinessDimension.COMPLETE && this.integration !== ReadinessDimension.COMPLETE) {
      errors.push('Test cannot be marked complete without Integration being complete');
    }

    return errors;
  }

  /**
   * Get percentage for specific dimension with fallback to state-based calculation
   */
  getDimensionPercentage(dimension: ReadinessDimensionKey): number {
    const stateValue = this[dimension];
    const percentageValue = this[`${dimension}Percentage` as keyof ReadinessState] as number | undefined;

    // Return percentage if explicitly set
    if (percentageValue !== undefined) {
      return percentageValue;
    }

    // Fallback to state-based calculation
    switch (stateValue) {
      case ReadinessDimension.NOT_STARTED:
        return 0;
      case ReadinessDimension.IN_PROGRESS:
        return 50;
      case ReadinessDimension.COMPLETE:
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Calculate aggregate readiness for child nodes
   */
  static aggregateChildReadiness(childStates: ReadinessState[]): ReadinessState {
    if (childStates.length === 0) {
      return new ReadinessState();
    }

    const aggregated = new ReadinessState();
    const dimensions: ReadinessDimensionKey[] = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    for (const dimension of dimensions) {
      const totalPercentage = childStates.reduce((sum, state) => sum + state.getDimensionPercentage(dimension), 0);
      const avgPercentage = Math.round(totalPercentage / childStates.length);

      // Set percentage
      (aggregated as any)[`${dimension}Percentage`] = avgPercentage;

      // Calculate state from percentage
      if (avgPercentage === 0) {
        aggregated[dimension] = ReadinessDimension.NOT_STARTED;
      } else if (avgPercentage === 100) {
        aggregated[dimension] = ReadinessDimension.COMPLETE;
      } else {
        aggregated[dimension] = ReadinessDimension.IN_PROGRESS;
      }
    }

    return aggregated;
  }

  /**
   * Convert to plain object for storage
   */
  toJSON() {
    return {
      requirements: this.requirements,
      design: this.design,
      frontend: this.frontend,
      backend: this.backend,
      integration: this.integration,
      test: this.test,
      requirementsPercentage: this.requirementsPercentage,
      designPercentage: this.designPercentage,
      frontendPercentage: this.frontendPercentage,
      backendPercentage: this.backendPercentage,
      integrationPercentage: this.integrationPercentage,
      testPercentage: this.testPercentage,
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: any): ReadinessState {
    return new ReadinessState(
      data.requirements,
      data.design,
      data.frontend,
      data.backend,
      data.integration,
      data.test,
      {
        requirements: data.requirementsPercentage,
        design: data.designPercentage,
        frontend: data.frontendPercentage,
        backend: data.backendPercentage,
        integration: data.integrationPercentage,
        test: data.testPercentage,
      }
    );
  }
}