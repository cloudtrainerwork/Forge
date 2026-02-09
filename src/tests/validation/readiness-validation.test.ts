import { ReadinessState, ReadinessDimension, ReadinessDimensionKey } from '../../domain/entities/ReadinessState.js';
import { ReadinessConfiguration, StateConfiguration, ValidationRule } from '../../domain/entities/ReadinessConfiguration.js';

/**
 * Unit tests for readiness validation rules
 * Tests business logic enforcement and dependency validation
 */
describe('Readiness Validation Rules', () => {

  describe('Built-in Business Rules', () => {

    test('Backend cannot be COMPLETE without Design COMPLETE', () => {
      // Arrange: Design is IN_PROGRESS, try to complete Backend
      const readiness = new ReadinessState(
        ReadinessDimension.NOT_STARTED,  // requirements
        ReadinessDimension.IN_PROGRESS,  // design - not complete
        ReadinessDimension.NOT_STARTED,  // frontend
        ReadinessDimension.NOT_STARTED,  // backend
        ReadinessDimension.NOT_STARTED,  // integration
        ReadinessDimension.NOT_STARTED   // test
      );

      // Act: Try to mark Backend as COMPLETE
      const validationErrors = readiness.validateStateTransition('backend', ReadinessDimension.COMPLETE);

      // Assert: Should fail with specific error
      expect(validationErrors).toContain('Backend cannot be marked complete without Design being complete');
    });

    test('Backend can be COMPLETE when Design is COMPLETE', () => {
      // Arrange: Design is COMPLETE
      const readiness = new ReadinessState(
        ReadinessDimension.NOT_STARTED,  // requirements
        ReadinessDimension.COMPLETE,     // design - complete
        ReadinessDimension.NOT_STARTED,  // frontend
        ReadinessDimension.NOT_STARTED,  // backend
        ReadinessDimension.NOT_STARTED,  // integration
        ReadinessDimension.NOT_STARTED   // test
      );

      // Act: Try to mark Backend as COMPLETE
      const validationErrors = readiness.validateStateTransition('backend', ReadinessDimension.COMPLETE);

      // Assert: Should succeed
      expect(validationErrors).toHaveLength(0);
    });

    test('Integration requires Frontend and Backend COMPLETE', () => {
      // Arrange: Frontend complete, Backend not complete
      const readiness = new ReadinessState(
        ReadinessDimension.NOT_STARTED,  // requirements
        ReadinessDimension.COMPLETE,     // design
        ReadinessDimension.COMPLETE,     // frontend - complete
        ReadinessDimension.IN_PROGRESS,  // backend - not complete
        ReadinessDimension.NOT_STARTED,  // integration
        ReadinessDimension.NOT_STARTED   // test
      );

      // Act: Try to mark Integration as COMPLETE
      const validationErrors = readiness.validateStateTransition('integration', ReadinessDimension.COMPLETE);

      // Assert: Should fail
      expect(validationErrors).toContain('Integration cannot be marked complete without Backend being complete');
    });

    test('Test requires Integration COMPLETE', () => {
      // Arrange: Integration is IN_PROGRESS
      const readiness = new ReadinessState(
        ReadinessDimension.COMPLETE,     // requirements
        ReadinessDimension.COMPLETE,     // design
        ReadinessDimension.COMPLETE,     // frontend
        ReadinessDimension.COMPLETE,     // backend
        ReadinessDimension.IN_PROGRESS,  // integration - not complete
        ReadinessDimension.NOT_STARTED   // test
      );

      // Act: Try to mark Test as COMPLETE
      const validationErrors = readiness.validateStateTransition('test', ReadinessDimension.COMPLETE);

      // Assert: Should fail
      expect(validationErrors).toContain('Test cannot be marked complete without Integration being complete');
    });

    test('Valid state transitions pass validation', () => {
      // Arrange: Proper sequence - Design complete, try to start Backend
      const readiness = new ReadinessState(
        ReadinessDimension.COMPLETE,     // requirements
        ReadinessDimension.COMPLETE,     // design
        ReadinessDimension.NOT_STARTED,  // frontend
        ReadinessDimension.NOT_STARTED,  // backend
        ReadinessDimension.NOT_STARTED,  // integration
        ReadinessDimension.NOT_STARTED   // test
      );

      // Act: Mark Backend as IN_PROGRESS (valid transition)
      const validationErrors = readiness.validateStateTransition('backend', ReadinessDimension.IN_PROGRESS);

      // Assert: Should succeed
      expect(validationErrors).toHaveLength(0);
    });

  });

  describe('Custom Configuration Validation', () => {

    test('Configuration validates state transitions using custom rules', () => {
      // Arrange: Create custom configuration with strict rule
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#red'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
      ];

      const validationRules = [
        new ValidationRule(
          'backend-requires-requirements-and-design',
          'Backend development requires both requirements and design completion',
          'backend',
          ['requirements', 'design'],
          ReadinessDimension.COMPLETE,
          'Backend cannot start without both Requirements and Design being complete'
        )
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        validationRules
      );

      // Create current state with only Requirements complete
      const currentStates = {
        requirements: ReadinessDimension.COMPLETE,
        design: ReadinessDimension.IN_PROGRESS,    // Not complete
        frontend: ReadinessDimension.NOT_STARTED,
        backend: ReadinessDimension.NOT_STARTED,
        integration: ReadinessDimension.NOT_STARTED,
        test: ReadinessDimension.NOT_STARTED,
      };

      // Act: Try to start Backend work
      const validationErrors = config.validateStateTransition(
        'backend',
        ReadinessDimension.IN_PROGRESS,
        currentStates
      );

      // Assert: Should fail because Design is not complete
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0]).toContain('Requirements and Design being complete');
    });

    test('Configuration allows valid transitions', () => {
      // Arrange: Same configuration as above
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#red'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
      ];

      const validationRules = [
        new ValidationRule(
          'backend-requires-requirements-and-design',
          'Backend development requires both requirements and design completion',
          'backend',
          ['requirements', 'design'],
          ReadinessDimension.COMPLETE
        )
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        validationRules
      );

      // Create current state with both Requirements and Design complete
      const currentStates = {
        requirements: ReadinessDimension.COMPLETE,
        design: ReadinessDimension.COMPLETE,       // Complete
        frontend: ReadinessDimension.NOT_STARTED,
        backend: ReadinessDimension.NOT_STARTED,
        integration: ReadinessDimension.NOT_STARTED,
        test: ReadinessDimension.NOT_STARTED,
      };

      // Act: Try to start Backend work
      const validationErrors = config.validateStateTransition(
        'backend',
        ReadinessDimension.IN_PROGRESS,
        currentStates
      );

      // Assert: Should succeed
      expect(validationErrors).toHaveLength(0);
    });

  });

  describe('Configuration Consistency Validation', () => {

    test('Detects overlapping percentage ranges', () => {
      // Arrange: Create states with overlapping percentage ranges
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 30, '#red'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 25, 75, '#yellow'), // Overlaps with previous
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 70, 100, '#green'),       // Overlaps with previous
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act: Validate configuration
      const validationErrors = config.validate();

      // Assert: Should detect overlapping ranges
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors.some(error => error.includes('overlapping percentage ranges'))).toBe(true);
    });

    test('Detects incomplete coverage (missing 0%)', () => {
      // Arrange: Create states that don't cover 0%
      const states = [
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act: Validate configuration
      const validationErrors = config.validate();

      // Assert: Should detect missing 0% coverage
      expect(validationErrors.some(error => error.includes('does not cover 0%'))).toBe(true);
    });

    test('Detects incomplete coverage (missing 100%)', () => {
      // Arrange: Create states that don't cover 100%
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#red'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act: Validate configuration
      const validationErrors = config.validate();

      // Assert: Should detect missing 100% coverage
      expect(validationErrors.some(error => error.includes('does not cover 100%'))).toBe(true);
    });

    test('Valid configuration passes validation', () => {
      // Arrange: Create valid configuration
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#red'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act: Validate configuration
      const validationErrors = config.validate();

      // Assert: Should pass validation
      expect(validationErrors).toHaveLength(0);
    });

  });

  describe('Percentage-Based State Mapping', () => {

    test('Maps percentage to correct state', () => {
      // Arrange
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#red'),
        new StateConfiguration('Planning', 'PLANNING', 1, 25, '#orange'),
        new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 26, 75, '#yellow'),
        new StateConfiguration('Review', 'REVIEW', 76, 99, '#blue'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act & Assert: Test various percentages
      expect(config.getStateForPercentage(0)?.name).toBe('Not Started');
      expect(config.getStateForPercentage(15)?.name).toBe('Planning');
      expect(config.getStateForPercentage(50)?.name).toBe('In Progress');
      expect(config.getStateForPercentage(80)?.name).toBe('Review');
      expect(config.getStateForPercentage(100)?.name).toBe('Complete');
    });

    test('Returns null for percentage outside any range', () => {
      // Arrange: Create states with gap
      const states = [
        new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 25, '#red'),
        new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 75, 100, '#green'),
        // Gap: 26-74 not covered
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        states,
        []
      );

      // Act: Try percentage in the gap
      const state = config.getStateForPercentage(50);

      // Assert: Should return null
      expect(state).toBeNull();
    });

  });

  describe('Default Configuration', () => {

    test('Creates valid default configuration', () => {
      // Act: Create default configuration
      const config = ReadinessConfiguration.createDefault('default-test');

      // Assert: Should be valid and functional
      expect(config.name).toBe('Default 3-State Configuration');
      expect(config.states).toHaveLength(3);
      expect(config.validationRules.length).toBeGreaterThan(0);

      // Validate it passes consistency checks
      const validationErrors = config.validate();
      expect(validationErrors).toHaveLength(0);

      // Test built-in rules work
      const currentStates = {
        requirements: ReadinessDimension.NOT_STARTED,
        design: ReadinessDimension.IN_PROGRESS,    // Not complete
        frontend: ReadinessDimension.NOT_STARTED,
        backend: ReadinessDimension.NOT_STARTED,
        integration: ReadinessDimension.NOT_STARTED,
        test: ReadinessDimension.NOT_STARTED,
      };

      const errors = config.validateStateTransition('backend', ReadinessDimension.COMPLETE, currentStates);
      expect(errors.length).toBeGreaterThan(0);
    });

  });

  describe('Error Message Customization', () => {

    test('Uses custom error messages when provided', () => {
      // Arrange: Create rule with custom error message
      const validationRules = [
        new ValidationRule(
          'test-rule',
          'Test rule',
          'backend',
          ['design'],
          ReadinessDimension.COMPLETE,
          'Custom error: Backend work requires design approval first!'
        )
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        [],
        validationRules
      );

      const currentStates = {
        requirements: ReadinessDimension.NOT_STARTED,
        design: ReadinessDimension.IN_PROGRESS,    // Not complete
        frontend: ReadinessDimension.NOT_STARTED,
        backend: ReadinessDimension.NOT_STARTED,
        integration: ReadinessDimension.NOT_STARTED,
        test: ReadinessDimension.NOT_STARTED,
      };

      // Act: Trigger validation error
      const errors = config.validateStateTransition('backend', ReadinessDimension.COMPLETE, currentStates);

      // Assert: Should use custom error message
      expect(errors).toContain('Custom error: Backend work requires design approval first!');
    });

    test('Falls back to default error message when none provided', () => {
      // Arrange: Create rule without custom error message
      const validationRules = [
        new ValidationRule(
          'test-rule',
          'Test rule',
          'backend',
          ['design'],
          ReadinessDimension.COMPLETE
          // No custom error message
        )
      ];

      const config = new ReadinessConfiguration(
        'test-config',
        'Test Configuration',
        [],
        validationRules
      );

      const currentStates = {
        requirements: ReadinessDimension.NOT_STARTED,
        design: ReadinessDimension.IN_PROGRESS,    // Not complete
        frontend: ReadinessDimension.NOT_STARTED,
        backend: ReadinessDimension.NOT_STARTED,
        integration: ReadinessDimension.NOT_STARTED,
        test: ReadinessDimension.NOT_STARTED,
      };

      // Act: Trigger validation error
      const errors = config.validateStateTransition('backend', ReadinessDimension.COMPLETE, currentStates);

      // Assert: Should use default error format
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toMatch(/backend cannot be set to .* without design being .*/i);
    });

  });

});

/**
 * Mock implementations for testing
 * Jest setup would be required for actual test execution
 */
const expect = {
  toContain: (expected: string) => (actual: string[]) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected array to contain "${expected}", but got: ${JSON.stringify(actual)}`);
    }
  },
  toHaveLength: (expectedLength: number) => (actual: any[]) => {
    if (actual.length !== expectedLength) {
      throw new Error(`Expected array to have length ${expectedLength}, but got: ${actual.length}`);
    }
  },
  toBeGreaterThan: (expected: number) => (actual: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBe: (expected: any) => (actual: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toBeNull: () => (actual: any) => {
    if (actual !== null) {
      throw new Error(`Expected ${actual} to be null`);
    }
  },
  toMatch: (pattern: RegExp) => (actual: string) => {
    if (!pattern.test(actual)) {
      throw new Error(`Expected "${actual}" to match pattern ${pattern}`);
    }
  }
};

const describe = (name: string, fn: () => void) => {
  console.log(`\n=== ${name} ===`);
  fn();
};

const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};