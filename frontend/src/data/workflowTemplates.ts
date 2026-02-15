'use client';

import { Node, Edge } from 'reactflow';

// Type definitions
interface WorkflowNodeData {
  label: string;
  type: 'SCREEN' | 'SERVICE' | 'DATABASE' | 'COMPONENT' | 'API' | 'INTEGRATION';
  readiness?: {
    requirements: number;
    design: number;
    frontend: number;
    backend: number;
    integration: number;
    test: number;
  };
  status?: 'committed' | 'bubble' | 'deferred';
  description?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'auth' | 'cms' | 'dashboard' | 'social' | 'fintech' | 'saas';
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTimeframe: string;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // E-commerce Application
  {
    id: 'ecommerce-basic',
    name: 'E-commerce Application',
    description: 'Complete online store with product catalog, shopping cart, and payment processing',
    category: 'ecommerce',
    estimatedComplexity: 'high',
    estimatedTimeframe: '12-16 weeks',
    nodes: [
      // User-facing screens
      {
        id: 'product-listing',
        type: 'SCREEN',
        position: { x: 100, y: 100 },
        data: {
          label: 'Product Listing',
          type: 'SCREEN',
          description: 'Browse products with filters',
          readiness: { requirements: 90, design: 80, frontend: 0, backend: 0, integration: 0, test: 0 }
        }
      },
      {
        id: 'product-detail',
        type: 'SCREEN',
        position: { x: 100, y: 250 },
        data: {
          label: 'Product Detail',
          type: 'SCREEN',
          description: 'Product info, reviews, add to cart',
          readiness: { requirements: 85, design: 70, frontend: 0, backend: 0, integration: 0, test: 0 }
        }
      },
      {
        id: 'shopping-cart',
        type: 'SCREEN',
        position: { x: 100, y: 400 },
        data: {
          label: 'Shopping Cart',
          type: 'SCREEN',
          description: 'View cart items, modify quantities',
          readiness: { requirements: 80, design: 60, frontend: 0, backend: 0, integration: 0, test: 0 }
        }
      },
      {
        id: 'checkout',
        type: 'SCREEN',
        position: { x: 100, y: 550 },
        data: {
          label: 'Checkout',
          type: 'SCREEN',
          description: 'Payment & shipping info',
          readiness: { requirements: 75, design: 50, frontend: 0, backend: 0, integration: 0, test: 0 }
        }
      },

      // Services
      {
        id: 'product-service',
        type: 'SERVICE',
        position: { x: 400, y: 175 },
        data: {
          label: 'Product Service',
          type: 'SERVICE',
          description: 'Product CRUD operations',
          readiness: { requirements: 70, design: 60, frontend: 0, backend: 20, integration: 0, test: 0 }
        }
      },
      {
        id: 'cart-service',
        type: 'SERVICE',
        position: { x: 400, y: 325 },
        data: {
          label: 'Cart Service',
          type: 'SERVICE',
          description: 'Session-based cart management',
          readiness: { requirements: 65, design: 40, frontend: 0, backend: 15, integration: 0, test: 0 }
        }
      },
      {
        id: 'payment-service',
        type: 'SERVICE',
        position: { x: 400, y: 475 },
        data: {
          label: 'Payment Service',
          type: 'SERVICE',
          description: 'Stripe/PayPal integration',
          readiness: { requirements: 60, design: 30, frontend: 0, backend: 10, integration: 0, test: 0 }
        }
      },
      {
        id: 'order-service',
        type: 'SERVICE',
        position: { x: 400, y: 625 },
        data: {
          label: 'Order Service',
          type: 'SERVICE',
          description: 'Order processing & fulfillment',
          readiness: { requirements: 55, design: 25, frontend: 0, backend: 5, integration: 0, test: 0 }
        }
      },

      // Databases
      {
        id: 'product-db',
        type: 'DATABASE',
        position: { x: 700, y: 100 },
        data: {
          label: 'Product Database',
          type: 'DATABASE',
          description: 'Product catalog & inventory',
          readiness: { requirements: 80, design: 70, frontend: 0, backend: 50, integration: 30, test: 0 }
        }
      },
      {
        id: 'user-db',
        type: 'DATABASE',
        position: { x: 700, y: 250 },
        data: {
          label: 'User Database',
          type: 'DATABASE',
          description: 'Customer accounts & profiles',
          readiness: { requirements: 75, design: 65, frontend: 0, backend: 40, integration: 20, test: 0 }
        }
      },
      {
        id: 'order-db',
        type: 'DATABASE',
        position: { x: 700, y: 400 },
        data: {
          label: 'Order Database',
          type: 'DATABASE',
          description: 'Transaction & order history',
          readiness: { requirements: 70, design: 60, frontend: 0, backend: 30, integration: 10, test: 0 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'product-listing', target: 'product-service', animated: true },
      { id: 'e2', source: 'product-detail', target: 'product-service', animated: true },
      { id: 'e3', source: 'shopping-cart', target: 'cart-service', animated: true },
      { id: 'e4', source: 'checkout', target: 'payment-service', animated: true },
      { id: 'e5', source: 'checkout', target: 'order-service', animated: true },
      { id: 'e6', source: 'product-service', target: 'product-db' },
      { id: 'e7', source: 'cart-service', target: 'user-db' },
      { id: 'e8', source: 'payment-service', target: 'order-db' },
      { id: 'e9', source: 'order-service', target: 'order-db' }
    ]
  },

  // Authentication System
  {
    id: 'auth-system',
    name: 'Authentication System',
    description: 'Complete user authentication with registration, login, and password reset',
    category: 'auth',
    estimatedComplexity: 'medium',
    estimatedTimeframe: '4-6 weeks',
    nodes: [
      {
        id: 'login-screen',
        type: 'SCREEN',
        position: { x: 100, y: 100 },
        data: {
          label: 'Login Screen',
          type: 'SCREEN',
          description: 'Email/password authentication',
          readiness: { requirements: 95, design: 90, frontend: 60, backend: 40, integration: 20, test: 10 }
        }
      },
      {
        id: 'register-screen',
        type: 'SCREEN',
        position: { x: 100, y: 250 },
        data: {
          label: 'Registration',
          type: 'SCREEN',
          description: 'New user signup form',
          readiness: { requirements: 90, design: 80, frontend: 50, backend: 30, integration: 15, test: 5 }
        }
      },
      {
        id: 'forgot-password',
        type: 'SCREEN',
        position: { x: 100, y: 400 },
        data: {
          label: 'Forgot Password',
          type: 'SCREEN',
          description: 'Password reset request',
          readiness: { requirements: 85, design: 70, frontend: 40, backend: 20, integration: 10, test: 0 }
        }
      },
      {
        id: 'profile-screen',
        type: 'SCREEN',
        position: { x: 100, y: 550 },
        data: {
          label: 'User Profile',
          type: 'SCREEN',
          description: 'Edit user information',
          readiness: { requirements: 80, design: 60, frontend: 30, backend: 15, integration: 5, test: 0 }
        }
      },

      // Services
      {
        id: 'auth-service',
        type: 'SERVICE',
        position: { x: 400, y: 200 },
        data: {
          label: 'Auth Service',
          type: 'SERVICE',
          description: 'JWT token management',
          readiness: { requirements: 85, design: 70, frontend: 0, backend: 50, integration: 30, test: 15 }
        }
      },
      {
        id: 'email-service',
        type: 'SERVICE',
        position: { x: 400, y: 350 },
        data: {
          label: 'Email Service',
          type: 'SERVICE',
          description: 'Send verification & reset emails',
          readiness: { requirements: 75, design: 60, frontend: 0, backend: 40, integration: 20, test: 5 }
        }
      },
      {
        id: 'user-service',
        type: 'SERVICE',
        position: { x: 400, y: 500 },
        data: {
          label: 'User Service',
          type: 'SERVICE',
          description: 'User CRUD operations',
          readiness: { requirements: 80, design: 65, frontend: 0, backend: 45, integration: 25, test: 10 }
        }
      },

      // Database
      {
        id: 'user-db',
        type: 'DATABASE',
        position: { x: 700, y: 300 },
        data: {
          label: 'User Database',
          type: 'DATABASE',
          description: 'User accounts & sessions',
          readiness: { requirements: 90, design: 80, frontend: 0, backend: 70, integration: 50, test: 30 }
        }
      },

      // External integrations
      {
        id: 'email-provider',
        type: 'INTEGRATION',
        position: { x: 700, y: 450 },
        data: {
          label: 'Email Provider',
          type: 'INTEGRATION',
          description: 'SendGrid/SES integration',
          readiness: { requirements: 70, design: 50, frontend: 0, backend: 30, integration: 15, test: 0 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'login-screen', target: 'auth-service', animated: true },
      { id: 'e2', source: 'register-screen', target: 'auth-service', animated: true },
      { id: 'e3', source: 'forgot-password', target: 'email-service', animated: true },
      { id: 'e4', source: 'profile-screen', target: 'user-service', animated: true },
      { id: 'e5', source: 'auth-service', target: 'user-db' },
      { id: 'e6', source: 'user-service', target: 'user-db' },
      { id: 'e7', source: 'email-service', target: 'email-provider' },
      { id: 'e8', source: 'email-service', target: 'user-db' }
    ]
  },

  // Content Management System
  {
    id: 'cms-basic',
    name: 'Content Management System',
    description: 'Blog/CMS with article creation, editing, and publication',
    category: 'cms',
    estimatedComplexity: 'medium',
    estimatedTimeframe: '6-8 weeks',
    nodes: [
      // Public screens
      {
        id: 'blog-listing',
        type: 'SCREEN',
        position: { x: 100, y: 100 },
        data: {
          label: 'Blog Listing',
          type: 'SCREEN',
          description: 'Public article list',
          readiness: { requirements: 85, design: 75, frontend: 40, backend: 25, integration: 10, test: 0 }
        }
      },
      {
        id: 'article-detail',
        type: 'SCREEN',
        position: { x: 100, y: 250 },
        data: {
          label: 'Article Detail',
          type: 'SCREEN',
          description: 'Full article view with comments',
          readiness: { requirements: 80, design: 70, frontend: 35, backend: 20, integration: 5, test: 0 }
        }
      },

      // Admin screens
      {
        id: 'admin-dashboard',
        type: 'SCREEN',
        position: { x: 100, y: 400 },
        data: {
          label: 'Admin Dashboard',
          type: 'SCREEN',
          description: 'Content management overview',
          readiness: { requirements: 75, design: 60, frontend: 30, backend: 15, integration: 0, test: 0 }
        }
      },
      {
        id: 'article-editor',
        type: 'SCREEN',
        position: { x: 100, y: 550 },
        data: {
          label: 'Article Editor',
          type: 'SCREEN',
          description: 'Rich text editor for articles',
          readiness: { requirements: 70, design: 50, frontend: 25, backend: 10, integration: 0, test: 0 }
        }
      },

      // Services
      {
        id: 'content-service',
        type: 'SERVICE',
        position: { x: 400, y: 200 },
        data: {
          label: 'Content Service',
          type: 'SERVICE',
          description: 'Article CRUD operations',
          readiness: { requirements: 75, design: 60, frontend: 0, backend: 40, integration: 20, test: 5 }
        }
      },
      {
        id: 'media-service',
        type: 'SERVICE',
        position: { x: 400, y: 350 },
        data: {
          label: 'Media Service',
          type: 'SERVICE',
          description: 'Image upload & processing',
          readiness: { requirements: 65, design: 45, frontend: 0, backend: 25, integration: 10, test: 0 }
        }
      },
      {
        id: 'search-service',
        type: 'SERVICE',
        position: { x: 400, y: 500 },
        data: {
          label: 'Search Service',
          type: 'SERVICE',
          description: 'Full-text article search',
          readiness: { requirements: 60, design: 40, frontend: 0, backend: 20, integration: 5, test: 0 }
        }
      },

      // Storage
      {
        id: 'content-db',
        type: 'DATABASE',
        position: { x: 700, y: 150 },
        data: {
          label: 'Content Database',
          type: 'DATABASE',
          description: 'Articles, authors, categories',
          readiness: { requirements: 80, design: 70, frontend: 0, backend: 50, integration: 30, test: 10 }
        }
      },
      {
        id: 'media-storage',
        type: 'INTEGRATION',
        position: { x: 700, y: 350 },
        data: {
          label: 'Media Storage',
          type: 'INTEGRATION',
          description: 'S3/CloudFlare for images',
          readiness: { requirements: 70, design: 50, frontend: 0, backend: 30, integration: 15, test: 0 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'blog-listing', target: 'content-service', animated: true },
      { id: 'e2', source: 'article-detail', target: 'content-service', animated: true },
      { id: 'e3', source: 'admin-dashboard', target: 'content-service', animated: true },
      { id: 'e4', source: 'article-editor', target: 'content-service', animated: true },
      { id: 'e5', source: 'article-editor', target: 'media-service', animated: true },
      { id: 'e6', source: 'content-service', target: 'content-db' },
      { id: 'e7', source: 'media-service', target: 'media-storage' },
      { id: 'e8', source: 'search-service', target: 'content-db' }
    ]
  },

  // Analytics Dashboard
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Real-time data visualization and reporting dashboard',
    category: 'dashboard',
    estimatedComplexity: 'high',
    estimatedTimeframe: '8-10 weeks',
    nodes: [
      // Dashboard screens
      {
        id: 'overview-dashboard',
        type: 'SCREEN',
        position: { x: 100, y: 100 },
        data: {
          label: 'Overview Dashboard',
          type: 'SCREEN',
          description: 'Key metrics & KPIs',
          readiness: { requirements: 80, design: 65, frontend: 30, backend: 15, integration: 5, test: 0 }
        }
      },
      {
        id: 'detailed-reports',
        type: 'SCREEN',
        position: { x: 100, y: 250 },
        data: {
          label: 'Detailed Reports',
          type: 'SCREEN',
          description: 'Filterable data tables',
          readiness: { requirements: 75, design: 60, frontend: 25, backend: 10, integration: 0, test: 0 }
        }
      },
      {
        id: 'chart-builder',
        type: 'SCREEN',
        position: { x: 100, y: 400 },
        data: {
          label: 'Chart Builder',
          type: 'SCREEN',
          description: 'Custom visualization creator',
          readiness: { requirements: 70, design: 50, frontend: 20, backend: 5, integration: 0, test: 0 }
        }
      },

      // Services
      {
        id: 'analytics-service',
        type: 'SERVICE',
        position: { x: 400, y: 150 },
        data: {
          label: 'Analytics Service',
          type: 'SERVICE',
          description: 'Data aggregation & processing',
          readiness: { requirements: 70, design: 55, frontend: 0, backend: 35, integration: 15, test: 0 }
        }
      },
      {
        id: 'data-pipeline',
        type: 'SERVICE',
        position: { x: 400, y: 300 },
        data: {
          label: 'Data Pipeline',
          type: 'SERVICE',
          description: 'ETL data processing',
          readiness: { requirements: 65, design: 45, frontend: 0, backend: 25, integration: 10, test: 0 }
        }
      },
      {
        id: 'report-service',
        type: 'SERVICE',
        position: { x: 400, y: 450 },
        data: {
          label: 'Report Service',
          type: 'SERVICE',
          description: 'PDF/Excel export generation',
          readiness: { requirements: 60, design: 40, frontend: 0, backend: 20, integration: 5, test: 0 }
        }
      },

      // Storage
      {
        id: 'metrics-db',
        type: 'DATABASE',
        position: { x: 700, y: 100 },
        data: {
          label: 'Metrics Database',
          type: 'DATABASE',
          description: 'Time-series analytics data',
          readiness: { requirements: 75, design: 60, frontend: 0, backend: 40, integration: 20, test: 5 }
        }
      },
      {
        id: 'warehouse-db',
        type: 'DATABASE',
        position: { x: 700, y: 250 },
        data: {
          label: 'Data Warehouse',
          type: 'DATABASE',
          description: 'Historical data storage',
          readiness: { requirements: 70, design: 55, frontend: 0, backend: 35, integration: 15, test: 0 }
        }
      },

      // External sources
      {
        id: 'data-sources',
        type: 'INTEGRATION',
        position: { x: 700, y: 400 },
        data: {
          label: 'Data Sources',
          type: 'INTEGRATION',
          description: 'APIs, databases, log files',
          readiness: { requirements: 65, design: 45, frontend: 0, backend: 25, integration: 10, test: 0 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'overview-dashboard', target: 'analytics-service', animated: true },
      { id: 'e2', source: 'detailed-reports', target: 'analytics-service', animated: true },
      { id: 'e3', source: 'chart-builder', target: 'analytics-service', animated: true },
      { id: 'e4', source: 'detailed-reports', target: 'report-service', animated: true },
      { id: 'e5', source: 'analytics-service', target: 'metrics-db' },
      { id: 'e6', source: 'data-pipeline', target: 'warehouse-db' },
      { id: 'e7', source: 'data-pipeline', target: 'data-sources' },
      { id: 'e8', source: 'analytics-service', target: 'warehouse-db' }
    ]
  },

  // SaaS Application
  {
    id: 'saas-basic',
    name: 'SaaS Application',
    description: 'Multi-tenant SaaS with subscription billing and team management',
    category: 'saas',
    estimatedComplexity: 'high',
    estimatedTimeframe: '16-20 weeks',
    nodes: [
      // User screens
      {
        id: 'landing-page',
        type: 'SCREEN',
        position: { x: 50, y: 100 },
        data: {
          label: 'Landing Page',
          type: 'SCREEN',
          description: 'Marketing & signup',
          readiness: { requirements: 85, design: 80, frontend: 60, backend: 20, integration: 10, test: 5 }
        }
      },
      {
        id: 'app-dashboard',
        type: 'SCREEN',
        position: { x: 50, y: 250 },
        data: {
          label: 'App Dashboard',
          type: 'SCREEN',
          description: 'Main application interface',
          readiness: { requirements: 80, design: 70, frontend: 40, backend: 25, integration: 15, test: 0 }
        }
      },
      {
        id: 'team-management',
        type: 'SCREEN',
        position: { x: 50, y: 400 },
        data: {
          label: 'Team Management',
          type: 'SCREEN',
          description: 'Invite & manage team members',
          readiness: { requirements: 75, design: 60, frontend: 30, backend: 15, integration: 5, test: 0 }
        }
      },
      {
        id: 'billing-screen',
        type: 'SCREEN',
        position: { x: 50, y: 550 },
        data: {
          label: 'Billing & Plans',
          type: 'SCREEN',
          description: 'Subscription management',
          readiness: { requirements: 70, design: 50, frontend: 20, backend: 10, integration: 0, test: 0 }
        }
      },

      // Core services
      {
        id: 'tenant-service',
        type: 'SERVICE',
        position: { x: 350, y: 150 },
        data: {
          label: 'Tenant Service',
          type: 'SERVICE',
          description: 'Multi-tenant data isolation',
          readiness: { requirements: 75, design: 60, frontend: 0, backend: 40, integration: 20, test: 5 }
        }
      },
      {
        id: 'subscription-service',
        type: 'SERVICE',
        position: { x: 350, y: 300 },
        data: {
          label: 'Subscription Service',
          type: 'SERVICE',
          description: 'Billing & plan management',
          readiness: { requirements: 70, design: 55, frontend: 0, backend: 35, integration: 15, test: 0 }
        }
      },
      {
        id: 'notification-service',
        type: 'SERVICE',
        position: { x: 350, y: 450 },
        data: {
          label: 'Notification Service',
          type: 'SERVICE',
          description: 'Email & in-app notifications',
          readiness: { requirements: 65, design: 45, frontend: 0, backend: 25, integration: 10, test: 0 }
        }
      },

      // Storage
      {
        id: 'tenant-db',
        type: 'DATABASE',
        position: { x: 650, y: 100 },
        data: {
          label: 'Tenant Database',
          type: 'DATABASE',
          description: 'Multi-tenant data store',
          readiness: { requirements: 80, design: 70, frontend: 0, backend: 50, integration: 30, test: 10 }
        }
      },
      {
        id: 'billing-db',
        type: 'DATABASE',
        position: { x: 650, y: 250 },
        data: {
          label: 'Billing Database',
          type: 'DATABASE',
          description: 'Subscription & payment data',
          readiness: { requirements: 75, design: 65, frontend: 0, backend: 45, integration: 25, test: 5 }
        }
      },

      // Integrations
      {
        id: 'payment-gateway',
        type: 'INTEGRATION',
        position: { x: 650, y: 400 },
        data: {
          label: 'Payment Gateway',
          type: 'INTEGRATION',
          description: 'Stripe subscription billing',
          readiness: { requirements: 70, design: 50, frontend: 0, backend: 30, integration: 15, test: 0 }
        }
      },
      {
        id: 'email-platform',
        type: 'INTEGRATION',
        position: { x: 650, y: 550 },
        data: {
          label: 'Email Platform',
          type: 'INTEGRATION',
          description: 'Transactional emails',
          readiness: { requirements: 65, design: 45, frontend: 0, backend: 25, integration: 10, test: 0 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'landing-page', target: 'tenant-service', animated: true },
      { id: 'e2', source: 'app-dashboard', target: 'tenant-service', animated: true },
      { id: 'e3', source: 'team-management', target: 'tenant-service', animated: true },
      { id: 'e4', source: 'billing-screen', target: 'subscription-service', animated: true },
      { id: 'e5', source: 'tenant-service', target: 'tenant-db' },
      { id: 'e6', source: 'subscription-service', target: 'billing-db' },
      { id: 'e7', source: 'subscription-service', target: 'payment-gateway' },
      { id: 'e8', source: 'notification-service', target: 'email-platform' },
      { id: 'e9', source: 'tenant-service', target: 'notification-service', style: { strokeDasharray: '5 5' } }
    ]
  }
];

export const TEMPLATE_CATEGORIES = {
  ecommerce: { name: 'E-commerce', icon: '🛒', color: '#10b981' },
  auth: { name: 'Authentication', icon: '🔐', color: '#3b82f6' },
  cms: { name: 'Content Management', icon: '📝', color: '#8b5cf6' },
  dashboard: { name: 'Analytics & Dashboards', icon: '📊', color: '#f59e0b' },
  social: { name: 'Social Media', icon: '👥', color: '#ec4899' },
  fintech: { name: 'Financial', icon: '💳', color: '#06b6d4' },
  saas: { name: 'SaaS Platform', icon: '🚀', color: '#ef4444' }
};