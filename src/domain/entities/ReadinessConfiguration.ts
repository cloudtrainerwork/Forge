import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { ReadinessDimension, ReadinessDimensionKey } from './ReadinessState.js';

/**
 * Configuration for a custom readiness state
 */
export class StateConfiguration {
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  value: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Expose()
  minPercentage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Expose()
  maxPercentage: number;

  @IsString()
  @IsOptional()
  @Expose()
  color?: string;

  @IsString()
  @IsOptional()
  @Expose()
  description?: string;

  constructor(
    name: string,
    value: string,
    minPercentage: number,
    maxPercentage: number,
    color?: string,
    description?: string
  ) {
    this.name = name;
    this.value = value;
    this.minPercentage = minPercentage;
    this.maxPercentage = maxPercentage;
    this.color = color;
    this.description = description;
  }

  /**
   * Check if a percentage value falls within this state's range
   */
  containsPercentage(percentage: number): boolean {
    return percentage >= this.minPercentage && percentage <= this.maxPercentage;
  }
}

/**
 * Validation rule between readiness dimensions
 */
export class ValidationRule {
  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  description: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  dependentDimension: ReadinessDimensionKey;

  @IsArray()
  @IsString({ each: true })
  @Expose()
  requiredDimensions: ReadinessDimensionKey[];

  @IsString()
  @IsNotEmpty()
  @Expose()
  requiredState: string;

  @IsString()
  @IsOptional()
  @Expose()
  errorMessage?: string;

  constructor(
    name: string,
    description: string,
    dependentDimension: ReadinessDimensionKey,
    requiredDimensions: ReadinessDimensionKey[],
    requiredState: string,
    errorMessage?: string
  ) {
    this.name = name;
    this.description = description;
    this.dependentDimension = dependentDimension;
    this.requiredDimensions = requiredDimensions;
    this.requiredState = requiredState;
    this.errorMessage = errorMessage;
  }
}

/**
 * ReadinessConfiguration defines custom states and validation rules for readiness tracking
 * Supports both percentage-based and discrete state configurations
 */
export class ReadinessConfiguration {
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
  @ValidateNested({ each: true })
  @Type(() => StateConfiguration)
  @Expose()
  states: StateConfiguration[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationRule)
  @Expose()
  validationRules: ValidationRule[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(
    id: string,
    name: string,
    states: StateConfiguration[] = [],
    validationRules: ValidationRule[] = [],
    description?: string
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.states = states;
    this.validationRules = validationRules;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Get state for a given percentage value
   */
  getStateForPercentage(percentage: number): StateConfiguration | null {
    return this.states.find(state => state.containsPercentage(percentage)) || null;
  }

  /**
   * Validate state transition based on configured rules
   */
  validateStateTransition(
    dimension: ReadinessDimensionKey,
    newState: string,
    currentReadiness: Record<ReadinessDimensionKey, string>
  ): string[] {
    const errors: string[] = [];

    // Find rules that apply to this dimension
    const applicableRules = this.validationRules.filter(rule => rule.dependentDimension === dimension);

    for (const rule of applicableRules) {
      // Check if all required dimensions meet the required state
      for (const requiredDimension of rule.requiredDimensions) {
        const currentState = currentReadiness[requiredDimension];
        if (currentState !== rule.requiredState) {
          const message = rule.errorMessage ||
            `${dimension} cannot be set to ${newState} without ${requiredDimension} being ${rule.requiredState}`;
          errors.push(message);
        }
      }
    }

    return errors;
  }

  /**
   * Get color for a given percentage or state value
   */
  getColorForValue(percentageOrState: number | string): string {
    let state: StateConfiguration | null = null;

    if (typeof percentageOrState === 'number') {
      state = this.getStateForPercentage(percentageOrState);
    } else {
      state = this.states.find(s => s.value === percentageOrState) || null;
    }

    return state?.color || '#gray';
  }

  /**
   * Validate configuration consistency
   */
  validate(): string[] {
    const errors: string[] = [];

    // Check for overlapping percentage ranges
    for (let i = 0; i < this.states.length; i++) {
      for (let j = i + 1; j < this.states.length; j++) {
        const state1 = this.states[i];
        const state2 = this.states[j];

        if (state1.maxPercentage >= state2.minPercentage && state2.maxPercentage >= state1.minPercentage) {
          errors.push(`States "${state1.name}" and "${state2.name}" have overlapping percentage ranges`);
        }
      }
    }

    // Check that percentage ranges cover 0-100
    const sortedStates = [...this.states].sort((a, b) => a.minPercentage - b.minPercentage);
    if (sortedStates.length > 0) {
      if (sortedStates[0].minPercentage > 0) {
        errors.push('State configuration does not cover 0% (no state defined for 0%)');
      }
      if (sortedStates[sortedStates.length - 1].maxPercentage < 100) {
        errors.push('State configuration does not cover 100% (no state defined for 100%)');
      }
    }

    return errors;
  }

  /**
   * Create default configuration with standard 3-state setup
   */
  static createDefault(id: string): ReadinessConfiguration {
    const states = [
      new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#ef4444', 'Work has not begun'),
      new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#f59e0b', 'Work is ongoing'),
      new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#10b981', 'Work is finished'),
    ];

    const validationRules = [
      new ValidationRule(
        'backend-requires-design',
        'Backend development requires design completion',
        'backend',
        ['design'],
        ReadinessDimension.COMPLETE,
        'Backend cannot be marked complete without Design being complete'
      ),
      new ValidationRule(
        'integration-requires-frontend-backend',
        'Integration requires both frontend and backend completion',
        'integration',
        ['frontend', 'backend'],
        ReadinessDimension.COMPLETE,
        'Integration cannot be marked complete without Frontend and Backend being complete'
      ),
      new ValidationRule(
        'test-requires-integration',
        'Testing requires integration completion',
        'test',
        ['integration'],
        ReadinessDimension.COMPLETE,
        'Test cannot be marked complete without Integration being complete'
      ),
    ];

    return new ReadinessConfiguration(
      id,
      'Default 3-State Configuration',
      states,
      validationRules,
      'Standard three-state readiness tracking: Not Started, In Progress, Complete'
    );
  }

  /**
   * Convert to plain object for storage
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      states: this.states.map(state => ({
        name: state.name,
        value: state.value,
        minPercentage: state.minPercentage,
        maxPercentage: state.maxPercentage,
        color: state.color,
        description: state.description,
      })),
      validationRules: this.validationRules.map(rule => ({
        name: rule.name,
        description: rule.description,
        dependentDimension: rule.dependentDimension,
        requiredDimensions: rule.requiredDimensions,
        requiredState: rule.requiredState,
        errorMessage: rule.errorMessage,
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: any): ReadinessConfiguration {
    const states = data.states?.map((s: any) => new StateConfiguration(
      s.name,
      s.value,
      s.minPercentage,
      s.maxPercentage,
      s.color,
      s.description
    )) || [];

    const validationRules = data.validationRules?.map((r: any) => new ValidationRule(
      r.name,
      r.description,
      r.dependentDimension,
      r.requiredDimensions,
      r.requiredState,
      r.errorMessage
    )) || [];

    const config = new ReadinessConfiguration(
      data.id,
      data.name,
      states,
      validationRules,
      data.description
    );

    if (data.createdAt) config.createdAt = new Date(data.createdAt);
    if (data.updatedAt) config.updatedAt = new Date(data.updatedAt);

    return config;
  }
}