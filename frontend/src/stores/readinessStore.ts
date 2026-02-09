import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Types from backend API
export interface ReadinessState {
  nodeId: string;
  design: number;
  backend: number;
  frontend: number;
  integration: number;
  test: number;
  deployment: number;
}

export interface ReadinessConfig {
  id: string;
  name: string;
  states: ReadinessStateConfig[];
  colorMapping: ColorMapping;
  validationRules: ValidationRule[];
}

export interface ReadinessStateConfig {
  value: number;
  label: string;
  color: string;
}

export interface ColorMapping {
  [threshold: number]: string;
}

export interface ValidationRule {
  dimension: string;
  requires: string[];
  message: string;
}

// Store state interface
export interface ReadinessStoreState {
  // Core data
  readinessData: Map<string, ReadinessState>;
  configurations: ReadinessConfig[];
  selectedConfiguration: string;

  // UI state
  displayMode: 'percentage' | 'states';
  selectedNodes: Set<string>;
  panelOpen: boolean;
  loading: Map<string, boolean>;
  errors: Map<string, string>;

  // Optimistic updates tracking
  pendingUpdates: Map<string, ReadinessState>;

  // Actions
  updateReadiness: (nodeId: string, updates: Partial<ReadinessState>) => void;
  bulkUpdateReadiness: (updates: Array<{ nodeId: string; readiness: Partial<ReadinessState> }>) => void;
  rollbackUpdate: (nodeId: string) => void;
  setDisplayMode: (mode: 'percentage' | 'states') => void;
  toggleNodeSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setPanelOpen: (open: boolean) => void;
  setError: (nodeId: string, error: string) => void;
  clearError: (nodeId: string) => void;
  setLoading: (nodeId: string, loading: boolean) => void;

  // Configuration
  loadConfigurations: (configs: ReadinessConfig[]) => void;
  setSelectedConfiguration: (configId: string) => void;

  // Batch operations
  loadReadinessData: (data: ReadinessState[]) => void;
  getSelectedReadiness: () => ReadinessState[];
}

// Helper functions
export const calculatePercentage = (state: ReadinessState): number => {
  const total = state.design + state.backend + state.frontend +
                state.integration + state.test + state.deployment;
  return Math.round(total / 6);
};

export const getColorForReadiness = (percentage: number, config?: ReadinessConfig): string => {
  if (config && config.colorMapping) {
    const thresholds = Object.keys(config.colorMapping).map(Number).sort((a, b) => b - a);
    for (const threshold of thresholds) {
      if (percentage >= threshold) {
        return config.colorMapping[threshold];
      }
    }
  }

  // Default color scheme
  if (percentage >= 80) return '#10B981'; // green-500
  if (percentage >= 40) return '#F59E0B'; // yellow-500
  return '#EF4444'; // red-500
};

export const aggregateChildReadiness = (children: ReadinessState[]): ReadinessState => {
  if (children.length === 0) {
    return {
      nodeId: '',
      design: 0,
      backend: 0,
      frontend: 0,
      integration: 0,
      test: 0,
      deployment: 0,
    };
  }

  const totals = children.reduce(
    (acc, child) => ({
      design: acc.design + child.design,
      backend: acc.backend + child.backend,
      frontend: acc.frontend + child.frontend,
      integration: acc.integration + child.integration,
      test: acc.test + child.test,
      deployment: acc.deployment + child.deployment,
    }),
    { design: 0, backend: 0, frontend: 0, integration: 0, test: 0, deployment: 0 }
  );

  const count = children.length;
  return {
    nodeId: '',
    design: Math.round(totals.design / count),
    backend: Math.round(totals.backend / count),
    frontend: Math.round(totals.frontend / count),
    integration: Math.round(totals.integration / count),
    test: Math.round(totals.test / count),
    deployment: Math.round(totals.deployment / count),
  };
};

export const validateTransition = (
  current: ReadinessState,
  updates: Partial<ReadinessState>,
  config?: ReadinessConfig
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const newState = { ...current, ...updates };

  // Apply default validation rules if no config provided
  const rules = config?.validationRules || [
    {
      dimension: 'backend',
      requires: ['design'],
      message: 'Backend requires Design to be started first'
    },
    {
      dimension: 'frontend',
      requires: ['design'],
      message: 'Frontend requires Design to be started first'
    },
    {
      dimension: 'integration',
      requires: ['backend', 'frontend'],
      message: 'Integration requires both Backend and Frontend'
    },
    {
      dimension: 'test',
      requires: ['integration'],
      message: 'Test requires Integration to be complete'
    },
  ];

  for (const rule of rules) {
    const dimensionValue = newState[rule.dimension as keyof ReadinessState];
    if (typeof dimensionValue === 'number' && dimensionValue > 0) {
      for (const required of rule.requires) {
        const requiredValue = newState[required as keyof ReadinessState];
        if (typeof requiredValue === 'number' && requiredValue === 0) {
          errors.push(rule.message);
          break;
        }
      }
    }
  }

  // Validate percentage ranges
  const dimensions = ['design', 'backend', 'frontend', 'integration', 'test', 'deployment'] as const;
  for (const dim of dimensions) {
    const value = newState[dim];
    if (typeof value === 'number' && (value < 0 || value > 100)) {
      errors.push(`${dim} must be between 0 and 100`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Create the store
export const useReadinessStore = create<ReadinessStoreState>()(
  immer((set, get) => ({
    // Initial state
    readinessData: new Map(),
    configurations: [],
    selectedConfiguration: 'default',
    displayMode: 'percentage',
    selectedNodes: new Set(),
    panelOpen: false,
    loading: new Map(),
    errors: new Map(),
    pendingUpdates: new Map(),

    // Actions
    updateReadiness: (nodeId: string, updates: Partial<ReadinessState>) => {
      set((state) => {
        const current = state.readinessData.get(nodeId);
        if (!current) return;

        const config = state.configurations.find(c => c.id === state.selectedConfiguration);
        const validation = validateTransition(current, updates, config);

        if (!validation.valid) {
          state.errors.set(nodeId, validation.errors.join(', '));
          return;
        }

        // Store current state for potential rollback
        state.pendingUpdates.set(nodeId, current);

        // Apply optimistic update
        const newState = { ...current, ...updates };
        state.readinessData.set(nodeId, newState);
        state.errors.delete(nodeId);
      });
    },

    bulkUpdateReadiness: (updates) => {
      set((state) => {
        const validUpdates: Array<{ nodeId: string; newState: ReadinessState }> = [];
        const errors: string[] = [];

        // Validate all updates first
        for (const update of updates) {
          const current = state.readinessData.get(update.nodeId);
          if (!current) continue;

          const config = state.configurations.find(c => c.id === state.selectedConfiguration);
          const validation = validateTransition(current, update.readiness, config);

          if (validation.valid) {
            validUpdates.push({
              nodeId: update.nodeId,
              newState: { ...current, ...update.readiness }
            });
            // Store for rollback
            state.pendingUpdates.set(update.nodeId, current);
          } else {
            errors.push(`${update.nodeId}: ${validation.errors.join(', ')}`);
          }
        }

        if (errors.length > 0) {
          state.errors.set('bulk', errors.join('\n'));
          return;
        }

        // Apply all valid updates
        for (const { nodeId, newState } of validUpdates) {
          state.readinessData.set(nodeId, newState);
          state.errors.delete(nodeId);
        }
        state.errors.delete('bulk');
      });
    },

    rollbackUpdate: (nodeId: string) => {
      set((state) => {
        const previousState = state.pendingUpdates.get(nodeId);
        if (previousState) {
          state.readinessData.set(nodeId, previousState);
          state.pendingUpdates.delete(nodeId);
          state.errors.delete(nodeId);
        }
      });
    },

    setDisplayMode: (mode) => {
      set((state) => {
        state.displayMode = mode;
      });
    },

    toggleNodeSelection: (nodeId: string) => {
      set((state) => {
        if (state.selectedNodes.has(nodeId)) {
          state.selectedNodes.delete(nodeId);
        } else {
          state.selectedNodes.add(nodeId);
        }
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedNodes.clear();
      });
    },

    setPanelOpen: (open: boolean) => {
      set((state) => {
        state.panelOpen = open;
      });
    },

    setError: (nodeId: string, error: string) => {
      set((state) => {
        state.errors.set(nodeId, error);
      });
    },

    clearError: (nodeId: string) => {
      set((state) => {
        state.errors.delete(nodeId);
      });
    },

    setLoading: (nodeId: string, loading: boolean) => {
      set((state) => {
        if (loading) {
          state.loading.set(nodeId, true);
        } else {
          state.loading.delete(nodeId);
        }
      });
    },

    loadConfigurations: (configs: ReadinessConfig[]) => {
      set((state) => {
        state.configurations = configs;
        if (configs.length > 0 && !state.selectedConfiguration) {
          state.selectedConfiguration = configs[0].id;
        }
      });
    },

    setSelectedConfiguration: (configId: string) => {
      set((state) => {
        state.selectedConfiguration = configId;
      });
    },

    loadReadinessData: (data: ReadinessState[]) => {
      set((state) => {
        state.readinessData.clear();
        for (const item of data) {
          state.readinessData.set(item.nodeId, item);
        }
      });
    },

    getSelectedReadiness: () => {
      const state = get();
      return Array.from(state.selectedNodes)
        .map(nodeId => state.readinessData.get(nodeId))
        .filter((readiness): readiness is ReadinessState => readiness !== undefined);
    },
  }))
);