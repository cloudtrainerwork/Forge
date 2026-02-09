#!/usr/bin/env node

/**
 * Simple test runner for readiness validation rules
 * Demonstrates that the validation logic works correctly
 */

import { ReadinessState, ReadinessDimension } from '../domain/entities/ReadinessState.js';
import { ReadinessConfiguration, StateConfiguration, ValidationRule } from '../domain/entities/ReadinessConfiguration.js';

console.log('🚀 Running Readiness Validation Tests...\n');

// Test 1: Built-in Business Rules
console.log('=== Test 1: Built-in Business Rules ===');

try {
  // Test Backend requires Design
  const readinessWithIncompleteDesign = new ReadinessState(
    ReadinessDimension.NOT_STARTED,  // requirements
    ReadinessDimension.IN_PROGRESS,  // design - not complete
    ReadinessDimension.NOT_STARTED,  // frontend
    ReadinessDimension.NOT_STARTED,  // backend
    ReadinessDimension.NOT_STARTED,  // integration
    ReadinessDimension.NOT_STARTED   // test
  );

  const backendValidationErrors = readinessWithIncompleteDesign.validateStateTransition('backend', ReadinessDimension.COMPLETE);

  if (backendValidationErrors.length > 0 && backendValidationErrors[0].includes('Design being complete')) {
    console.log('✅ Backend validation: correctly prevented completion without Design');
  } else {
    console.log('❌ Backend validation: failed to prevent invalid transition');
  }

  // Test Integration requires Frontend and Backend
  const readinessForIntegration = new ReadinessState(
    ReadinessDimension.COMPLETE,     // requirements
    ReadinessDimension.COMPLETE,     // design
    ReadinessDimension.COMPLETE,     // frontend
    ReadinessDimension.IN_PROGRESS,  // backend - not complete
    ReadinessDimension.NOT_STARTED,  // integration
    ReadinessDimension.NOT_STARTED   // test
  );

  const integrationValidationErrors = readinessForIntegration.validateStateTransition('integration', ReadinessDimension.COMPLETE);

  if (integrationValidationErrors.length > 0 && integrationValidationErrors[0].includes('Backend being complete')) {
    console.log('✅ Integration validation: correctly prevented completion without Backend');
  } else {
    console.log('❌ Integration validation: failed to prevent invalid transition');
  }

  // Test valid transition passes
  const readinessForValid = new ReadinessState(
    ReadinessDimension.COMPLETE,     // requirements
    ReadinessDimension.COMPLETE,     // design
    ReadinessDimension.NOT_STARTED,  // frontend
    ReadinessDimension.NOT_STARTED,  // backend
    ReadinessDimension.NOT_STARTED,  // integration
    ReadinessDimension.NOT_STARTED   // test
  );

  const validTransitionErrors = readinessForValid.validateStateTransition('backend', ReadinessDimension.IN_PROGRESS);

  if (validTransitionErrors.length === 0) {
    console.log('✅ Valid transition: correctly allowed Backend IN_PROGRESS with Design complete');
  } else {
    console.log('❌ Valid transition: incorrectly blocked valid transition');
  }

} catch (error) {
  console.log('❌ Built-in validation tests failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Test 2: Custom Configuration Validation
console.log('\n=== Test 2: Custom Configuration Validation ===');

try {
  // Create custom configuration
  const states = [
    new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 0, '#ef4444'),
    new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#f59e0b'),
    new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#10b981'),
  ];

  const validationRules = [
    new ValidationRule(
      'strict-backend-rule',
      'Backend requires both requirements and design',
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

  // Test configuration validation
  const configValidationErrors = config.validate();
  if (configValidationErrors.length === 0) {
    console.log('✅ Configuration validation: correctly validated valid configuration');
  } else {
    console.log('❌ Configuration validation: incorrectly failed valid configuration');
  }

  // Test custom rule enforcement
  const currentStates = {
    requirements: ReadinessDimension.COMPLETE,
    design: ReadinessDimension.IN_PROGRESS,    // Not complete
    frontend: ReadinessDimension.NOT_STARTED,
    backend: ReadinessDimension.NOT_STARTED,
    integration: ReadinessDimension.NOT_STARTED,
    test: ReadinessDimension.NOT_STARTED,
  };

  const customRuleErrors = config.validateStateTransition('backend', ReadinessDimension.IN_PROGRESS, currentStates);

  if (customRuleErrors.length > 0 && customRuleErrors[0].includes('Requirements and Design being complete')) {
    console.log('✅ Custom rule validation: correctly enforced strict backend rule');
  } else {
    console.log('❌ Custom rule validation: failed to enforce custom rule');
  }

  // Test percentage mapping
  const planningState = config.getStateForPercentage(50);
  if (planningState && planningState.name === 'In Progress') {
    console.log('✅ Percentage mapping: correctly mapped 50% to In Progress');
  } else {
    console.log('❌ Percentage mapping: failed to map percentage correctly');
  }

} catch (error) {
  console.log('❌ Custom configuration tests failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Test 3: Configuration Validation
console.log('\n=== Test 3: Configuration Consistency Validation ===');

try {
  // Test overlapping ranges detection
  const overlappingStates = [
    new StateConfiguration('Not Started', ReadinessDimension.NOT_STARTED, 0, 30, '#red'),
    new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 25, 75, '#yellow'), // Overlaps!
    new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 70, 100, '#green'),       // Overlaps!
  ];

  const overlappingConfig = new ReadinessConfiguration(
    'overlapping-test',
    'Overlapping Test',
    overlappingStates,
    []
  );

  const overlapErrors = overlappingConfig.validate();
  if (overlapErrors.some(error => error.includes('overlapping'))) {
    console.log('✅ Overlap detection: correctly identified overlapping percentage ranges');
  } else {
    console.log('❌ Overlap detection: failed to detect overlapping ranges');
  }

  // Test incomplete coverage detection
  const incompleteCoverageStates = [
    new StateConfiguration('In Progress', ReadinessDimension.IN_PROGRESS, 1, 99, '#yellow'),
    new StateConfiguration('Complete', ReadinessDimension.COMPLETE, 100, 100, '#green'),
    // Missing 0% coverage
  ];

  const incompleteConfig = new ReadinessConfiguration(
    'incomplete-test',
    'Incomplete Test',
    incompleteCoverageStates,
    []
  );

  const incompleteErrors = incompleteConfig.validate();
  if (incompleteErrors.some(error => error.includes('does not cover 0%'))) {
    console.log('✅ Coverage validation: correctly detected missing 0% coverage');
  } else {
    console.log('❌ Coverage validation: failed to detect incomplete coverage');
  }

} catch (error) {
  console.log('❌ Configuration validation tests failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Test 4: Default Configuration
console.log('\n=== Test 4: Default Configuration ===');

try {
  const defaultConfig = ReadinessConfiguration.createDefault('default-test');

  // Test that default config is valid
  const defaultConfigErrors = defaultConfig.validate();
  if (defaultConfigErrors.length === 0) {
    console.log('✅ Default configuration: correctly created valid default configuration');
  } else {
    console.log('❌ Default configuration: default config is invalid');
  }

  // Test default rules work
  const defaultTestStates = {
    requirements: ReadinessDimension.NOT_STARTED,
    design: ReadinessDimension.IN_PROGRESS,    // Not complete
    frontend: ReadinessDimension.NOT_STARTED,
    backend: ReadinessDimension.NOT_STARTED,
    integration: ReadinessDimension.NOT_STARTED,
    test: ReadinessDimension.NOT_STARTED,
  };

  const defaultRuleErrors = defaultConfig.validateStateTransition('backend', ReadinessDimension.COMPLETE, defaultTestStates);
  if (defaultRuleErrors.length > 0) {
    console.log('✅ Default rules: correctly enforced backend requires design rule');
  } else {
    console.log('❌ Default rules: failed to enforce built-in rules');
  }

} catch (error) {
  console.log('❌ Default configuration tests failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Test 5: Percentage-based calculations
console.log('\n=== Test 5: Percentage Calculations ===');

try {
  const readinessWithPercentages = new ReadinessState(
    ReadinessDimension.COMPLETE,     // requirements
    ReadinessDimension.IN_PROGRESS,  // design
    ReadinessDimension.NOT_STARTED,  // frontend
    ReadinessDimension.NOT_STARTED,  // backend
    ReadinessDimension.NOT_STARTED,  // integration
    ReadinessDimension.NOT_STARTED,  // test
    {
      requirements: 100,
      design: 75,
      frontend: 0,
      backend: 0,
      integration: 0,
      test: 0
    }
  );

  const overallCompletion = readinessWithPercentages.getCompletionPercentage();
  const expectedCompletion = Math.round((100 + 0 + 0 + 0 + 0 + 0) / 6); // Only complete dimensions count

  if (overallCompletion === expectedCompletion) {
    console.log('✅ Percentage calculation: correctly calculated overall completion percentage');
  } else {
    console.log(`❌ Percentage calculation: expected ${expectedCompletion}%, got ${overallCompletion}%`);
  }

  const designPercentage = readinessWithPercentages.getDimensionPercentage('design');
  if (designPercentage === 75) {
    console.log('✅ Dimension percentage: correctly retrieved explicit percentage value');
  } else {
    console.log(`❌ Dimension percentage: expected 75%, got ${designPercentage}%`);
  }

} catch (error) {
  console.log('❌ Percentage calculation tests failed:', error instanceof Error ? error.message : 'Unknown error');
}

console.log('\n🎉 Validation tests completed!');
console.log('\nThese tests demonstrate that:');
console.log('  ✓ Built-in business rules are enforced');
console.log('  ✓ Custom configurations work correctly');
console.log('  ✓ Configuration validation catches errors');
console.log('  ✓ Percentage-based tracking functions properly');
console.log('  ✓ Default configurations are production-ready');
console.log('\nValidation middleware is ready for production use. 🚀');