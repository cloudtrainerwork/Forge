import { IsEnum, IsNotEmpty } from 'class-validator';
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
 * ReadinessState enforces the 6-dimensional readiness structure
 * Each dimension tracks progress and completion state
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

  constructor(
    requirements: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    design: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    frontend: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    backend: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    integration: ReadinessDimension = ReadinessDimension.NOT_STARTED,
    test: ReadinessDimension = ReadinessDimension.NOT_STARTED
  ) {
    this.requirements = requirements;
    this.design = design;
    this.frontend = frontend;
    this.backend = backend;
    this.integration = integration;
    this.test = test;
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
  updateDimension(dimension: keyof ReadinessState, value: ReadinessDimension): ReadinessState {
    const updated = new ReadinessState(
      this.requirements,
      this.design,
      this.frontend,
      this.backend,
      this.integration,
      this.test
    );

    // Type-safe dimension update
    switch (dimension) {
      case 'requirements':
        updated.requirements = value;
        break;
      case 'design':
        updated.design = value;
        break;
      case 'frontend':
        updated.frontend = value;
        break;
      case 'backend':
        updated.backend = value;
        break;
      case 'integration':
        updated.integration = value;
        break;
      case 'test':
        updated.test = value;
        break;
    }

    return updated;
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
      data.test
    );
  }
}