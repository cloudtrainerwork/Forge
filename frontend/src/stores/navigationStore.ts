import { create } from 'zustand';

export type ViewLevel = 'project' | 'category' | 'detail';
export type Category = 'screens' | 'services' | 'database' | 'integrations';

interface NavigationState {
  currentLevel: ViewLevel;
  currentCategory: Category | null;
  currentNodeId: string | null;
  breadcrumbs: Array<{
    level: ViewLevel;
    label: string;
    nodeId?: string;
    category?: Category;
  }>;

  // Actions
  navigateToProject: () => void;
  navigateToCategory: (category: Category) => void;
  navigateToDetail: (nodeId: string, nodeLabel: string) => void;
  navigateToBreadcrumb: (index: number) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentLevel: 'project',
  currentCategory: null,
  currentNodeId: null,
  breadcrumbs: [{ level: 'project', label: 'Project Overview' }],

  navigateToProject: () =>
    set({
      currentLevel: 'project',
      currentCategory: null,
      currentNodeId: null,
      breadcrumbs: [{ level: 'project', label: 'Project Overview' }],
    }),

  navigateToCategory: (category) =>
    set((state) => ({
      currentLevel: 'category',
      currentCategory: category,
      currentNodeId: null,
      breadcrumbs: [
        { level: 'project', label: 'Project Overview' },
        { level: 'category', label: category.charAt(0).toUpperCase() + category.slice(1), category },
      ],
    })),

  navigateToDetail: (nodeId, nodeLabel) =>
    set((state) => ({
      currentLevel: 'detail',
      currentNodeId: nodeId,
      breadcrumbs: [
        ...state.breadcrumbs.slice(0, 2),
        { level: 'detail', label: nodeLabel, nodeId },
      ],
    })),

  navigateToBreadcrumb: (index) =>
    set((state) => {
      const breadcrumb = state.breadcrumbs[index];
      if (!breadcrumb) return state;

      return {
        currentLevel: breadcrumb.level,
        currentCategory: breadcrumb.category || null,
        currentNodeId: breadcrumb.nodeId || null,
        breadcrumbs: state.breadcrumbs.slice(0, index + 1),
      };
    }),
}));