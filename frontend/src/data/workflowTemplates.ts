'use client';

/**
 * Hierarchical workflow templates — reference architectures with 3-level decomposition.
 *
 * Each template is a best-practice starting point that teaches real-world
 * service decomposition through its structure. Children are nested inline
 * and flattened with parentId during template load.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TemplateNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  x?: number;
  y?: number;
  children?: TemplateNode[];
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'auth' | 'cms' | 'dashboard' | 'social' | 'fintech' | 'saas';
  rootNodes: TemplateNode[];
  edges: TemplateEdge[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedTimeframe: string;
}

// ── Helper: flatten nested template into flat list with parentId ─────────────

export interface FlatTemplateNode {
  id: string;
  label: string;
  type: string;
  description: string;
  x: number;
  y: number;
  parentId: string | null;
  childCount: number;
}

export function flattenTemplate(template: WorkflowTemplate): FlatTemplateNode[] {
  const flat: FlatTemplateNode[] = [];

  function walk(nodes: TemplateNode[], parentId: string | null, depth: number) {
    nodes.forEach((node, i) => {
      flat.push({
        id: node.id,
        label: node.label,
        type: node.type,
        description: node.description || '',
        x: node.x ?? 100 + i * 280,
        y: node.y ?? 100 + i * 180,
        parentId,
        childCount: node.children?.length ?? 0,
      });
      if (node.children) {
        walk(node.children, node.id, depth + 1);
      }
    });
  }

  walk(template.rootNodes, null, 0);
  return flat;
}

// ── Templates ────────────────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // E-COMMERCE APPLICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ecommerce-basic',
    name: 'E-commerce Application',
    description: 'Complete online store with product catalog, shopping cart, payment processing, and authentication',
    category: 'ecommerce',
    estimatedComplexity: 'high',
    estimatedTimeframe: '12-16 weeks',
    rootNodes: [
      {
        id: 'product-listing', label: 'Product Listing', type: 'FEATURE', x: 80, y: 60,
        description: 'Browse and search product catalog',
        children: [
          { id: 'pl-search-bar', label: 'Search Bar', type: 'COMPONENT', description: 'Full-text product search with autocomplete' },
          { id: 'pl-filter-sidebar', label: 'Filter Sidebar', type: 'COMPONENT', description: 'Category, price range, brand filters' },
          { id: 'pl-product-grid', label: 'Product Grid', type: 'COMPONENT', description: 'Responsive card grid with pagination' },
          { id: 'pl-product-api', label: 'Product API', type: 'API', description: 'GET /products with query params for search, filter, sort' },
        ],
      },
      {
        id: 'product-detail', label: 'Product Detail', type: 'FEATURE', x: 380, y: 60,
        description: 'Product information, reviews, and purchase',
        children: [
          { id: 'pd-image-gallery', label: 'Image Gallery', type: 'COMPONENT', description: 'Zoomable product images with thumbnails' },
          { id: 'pd-review-system', label: 'Review System', type: 'COMPONENT', description: 'Star ratings, written reviews, helpful votes' },
          { id: 'pd-add-to-cart', label: 'Add to Cart', type: 'COMPONENT', description: 'Quantity selector, size/variant picker, cart button' },
          { id: 'pd-related-products', label: 'Related Products', type: 'COMPONENT', description: 'ML-based product recommendations' },
        ],
      },
      {
        id: 'shopping-cart', label: 'Shopping Cart', type: 'FEATURE', x: 680, y: 60,
        description: 'Cart management and checkout preparation',
        children: [
          { id: 'sc-cart-items', label: 'Cart Items List', type: 'COMPONENT', description: 'Line items with quantity controls and remove' },
          { id: 'sc-price-calc', label: 'Price Calculator', type: 'SERVICE', description: 'Subtotal, tax, shipping, discounts, promo codes' },
          { id: 'sc-cart-storage', label: 'Cart Storage', type: 'DATABASE', description: 'Session-based cart with guest merge on login' },
        ],
      },
      {
        id: 'checkout', label: 'Checkout', type: 'FEATURE', x: 80, y: 320,
        description: 'Payment, shipping, and order placement',
        children: [
          { id: 'co-shipping-form', label: 'Shipping Form', type: 'COMPONENT', description: 'Address autocomplete, shipping method selection' },
          { id: 'co-payment-form', label: 'Payment Form', type: 'COMPONENT', description: 'Credit card, Apple Pay, Google Pay inputs' },
          { id: 'co-order-summary', label: 'Order Summary', type: 'COMPONENT', description: 'Final review before purchase confirmation' },
        ],
      },
      {
        id: 'auth-service', label: 'Auth Service', type: 'SERVICE', x: 380, y: 320,
        description: 'Authentication and identity management',
        children: [
          {
            id: 'as-oauth-client', label: 'OAuth Client', type: 'INTEGRATION',
            description: 'External identity provider integration',
            children: [
              { id: 'as-google', label: 'Google Provider', type: 'INTEGRATION', description: 'Google OIDC sign-in flow' },
              { id: 'as-microsoft', label: 'Microsoft Provider', type: 'INTEGRATION', description: 'Microsoft Entra ID (Azure AD) flow' },
              { id: 'as-github', label: 'GitHub Provider', type: 'INTEGRATION', description: 'GitHub OAuth app authorization' },
            ],
          },
          {
            id: 'as-jwt-handler', label: 'JWT Handler', type: 'SERVICE',
            description: 'Token lifecycle management',
            children: [
              { id: 'as-token-validator', label: 'Token Validator', type: 'COMPONENT', description: 'Signature verification and expiry check' },
              { id: 'as-refresh-logic', label: 'Refresh Logic', type: 'COMPONENT', description: 'Refresh token rotation and revocation' },
            ],
          },
          { id: 'as-session-store', label: 'Session Store', type: 'DATABASE', description: 'Redis-backed session and token storage' },
        ],
      },
      {
        id: 'order-service', label: 'Order Service', type: 'SERVICE', x: 680, y: 320,
        description: 'Order processing, payment, and fulfillment',
        children: [
          { id: 'os-order-processor', label: 'Order Processor', type: 'SERVICE', description: 'Order state machine: placed → paid → shipped → delivered' },
          {
            id: 'os-payment-gw', label: 'Payment Gateway', type: 'INTEGRATION',
            description: 'Payment provider abstraction layer',
            children: [
              { id: 'os-stripe', label: 'Stripe Integration', type: 'INTEGRATION', description: 'Stripe Checkout and Payment Intents API' },
              { id: 'os-paypal', label: 'PayPal Integration', type: 'INTEGRATION', description: 'PayPal REST API and Express Checkout' },
            ],
          },
          { id: 'os-email-notify', label: 'Email Notifications', type: 'SERVICE', description: 'Order confirmation, shipping updates, receipts' },
          { id: 'os-order-db', label: 'Order Database', type: 'DATABASE', description: 'Orders, line items, payment records, shipping' },
        ],
      },
    ],
    edges: [
      { id: 'e1', source: 'product-listing', target: 'product-detail' },
      { id: 'e2', source: 'product-detail', target: 'shopping-cart' },
      { id: 'e3', source: 'shopping-cart', target: 'checkout' },
      { id: 'e4', source: 'checkout', target: 'order-service' },
      { id: 'e5', source: 'checkout', target: 'auth-service' },
      { id: 'e6', source: 'order-service', target: 'auth-service' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'auth-system',
    name: 'Authentication System',
    description: 'Complete identity management with OAuth, JWT, password reset, and role-based access',
    category: 'auth',
    estimatedComplexity: 'medium',
    estimatedTimeframe: '4-6 weeks',
    rootNodes: [
      {
        id: 'login-screen', label: 'Login Screen', type: 'SCREEN', x: 80, y: 60,
        description: 'User sign-in with multiple methods',
        children: [
          { id: 'ls-email-form', label: 'Email/Password Form', type: 'COMPONENT', description: 'Email + password inputs with validation' },
          { id: 'ls-oauth-buttons', label: 'OAuth Buttons', type: 'COMPONENT', description: 'Google, Microsoft, GitHub sign-in buttons' },
          { id: 'ls-remember-me', label: 'Remember Me', type: 'COMPONENT', description: 'Persistent session toggle with secure cookie' },
        ],
      },
      {
        id: 'registration', label: 'Registration', type: 'SCREEN', x: 380, y: 60,
        description: 'New user account creation',
        children: [
          { id: 'rg-signup-form', label: 'Signup Form', type: 'COMPONENT', description: 'Name, email, password with strength meter' },
          { id: 'rg-email-verify', label: 'Email Verification', type: 'SERVICE', description: 'Send verification link, confirm token' },
          { id: 'rg-terms', label: 'Terms Acceptance', type: 'COMPONENT', description: 'ToS and privacy policy consent checkbox' },
        ],
      },
      {
        id: 'password-reset', label: 'Password Reset', type: 'SCREEN', x: 680, y: 60,
        description: 'Forgot password and recovery flow',
        children: [
          { id: 'pr-request-form', label: 'Reset Request Form', type: 'COMPONENT', description: 'Email input to request password reset' },
          { id: 'pr-token-service', label: 'Reset Token Service', type: 'SERVICE', description: 'Generate, validate, expire reset tokens' },
          { id: 'pr-new-pw-form', label: 'New Password Form', type: 'COMPONENT', description: 'Set new password with confirmation field' },
        ],
      },
      {
        id: 'auth-core', label: 'Auth Service', type: 'SERVICE', x: 80, y: 320,
        description: 'Core authentication and authorization engine',
        children: [
          {
            id: 'ac-oauth', label: 'OAuth Provider', type: 'INTEGRATION',
            description: 'External identity provider management',
            children: [
              { id: 'ac-google', label: 'Google OIDC', type: 'INTEGRATION', description: 'OpenID Connect with Google Identity' },
              { id: 'ac-microsoft', label: 'Microsoft Entra', type: 'INTEGRATION', description: 'Azure AD / Entra ID integration' },
              { id: 'ac-github', label: 'GitHub OAuth', type: 'INTEGRATION', description: 'GitHub OAuth app for developer sign-in' },
            ],
          },
          {
            id: 'ac-jwt', label: 'JWT Service', type: 'SERVICE',
            description: 'JSON Web Token management',
            children: [
              { id: 'ac-token-gen', label: 'Token Generation', type: 'COMPONENT', description: 'HS256/RS256 signing with claims' },
              { id: 'ac-token-val', label: 'Token Validation', type: 'COMPONENT', description: 'Signature verify, expiry, issuer check' },
              { id: 'ac-refresh', label: 'Refresh Rotation', type: 'COMPONENT', description: 'Refresh token rotation with family tracking' },
            ],
          },
          { id: 'ac-hasher', label: 'Password Hasher', type: 'SERVICE', description: 'bcrypt/argon2 hashing with salt rounds' },
          { id: 'ac-session', label: 'Session Manager', type: 'SERVICE', description: 'Server-side session with Redis backing' },
        ],
      },
      {
        id: 'user-service', label: 'User Service', type: 'SERVICE', x: 480, y: 320,
        description: 'User profile and access management',
        children: [
          { id: 'us-profile', label: 'Profile Manager', type: 'SERVICE', description: 'User CRUD, avatar upload, preferences' },
          { id: 'us-roles', label: 'Role & Permissions', type: 'SERVICE', description: 'RBAC with hierarchical role inheritance' },
          { id: 'us-db', label: 'User Database', type: 'DATABASE', description: 'Users, accounts, sessions, roles tables' },
          { id: 'us-email', label: 'Email Provider', type: 'INTEGRATION', description: 'SendGrid/SES for transactional emails' },
        ],
      },
    ],
    edges: [
      { id: 'e1', source: 'login-screen', target: 'auth-core' },
      { id: 'e2', source: 'registration', target: 'auth-core' },
      { id: 'e3', source: 'registration', target: 'user-service' },
      { id: 'e4', source: 'password-reset', target: 'auth-core' },
      { id: 'e5', source: 'auth-core', target: 'user-service' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT MANAGEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cms-basic',
    name: 'Content Management System',
    description: 'Blog/CMS with rich editing, media management, and SEO optimization',
    category: 'cms',
    estimatedComplexity: 'medium',
    estimatedTimeframe: '6-8 weeks',
    rootNodes: [
      {
        id: 'blog-listing', label: 'Blog Listing', type: 'SCREEN', x: 80, y: 60,
        description: 'Public article feed with discovery',
        children: [
          { id: 'bl-article-cards', label: 'Article Cards', type: 'COMPONENT', description: 'Thumbnail, title, excerpt, author, date' },
          { id: 'bl-category-filter', label: 'Category Filter', type: 'COMPONENT', description: 'Tag-based and category-based filtering' },
          { id: 'bl-search', label: 'Search Bar', type: 'COMPONENT', description: 'Full-text article search with highlighting' },
        ],
      },
      {
        id: 'article-editor', label: 'Article Editor', type: 'SCREEN', x: 380, y: 60,
        description: 'Rich content authoring experience',
        children: [
          { id: 'ae-rich-text', label: 'Rich Text Editor', type: 'COMPONENT', description: 'TipTap/ProseMirror with markdown shortcuts' },
          { id: 'ae-image-upload', label: 'Image Uploader', type: 'COMPONENT', description: 'Drag-drop with resize, crop, alt text' },
          { id: 'ae-seo', label: 'SEO Settings', type: 'COMPONENT', description: 'Meta title, description, OG tags, slug editor' },
          { id: 'ae-publish', label: 'Publish Workflow', type: 'SERVICE', description: 'Draft → Review → Scheduled → Published states' },
        ],
      },
      {
        id: 'content-service', label: 'Content Service', type: 'SERVICE', x: 680, y: 60,
        description: 'Content storage and retrieval engine',
        children: [
          { id: 'cs-crud', label: 'Article CRUD', type: 'API', description: 'REST endpoints for create, read, update, delete' },
          { id: 'cs-versioning', label: 'Version Control', type: 'SERVICE', description: 'Article revision history with diff and restore' },
          { id: 'cs-db', label: 'Content Database', type: 'DATABASE', description: 'Articles, authors, categories, tags tables' },
          { id: 'cs-search-idx', label: 'Search Index', type: 'DATABASE', description: 'Elasticsearch/Meilisearch for full-text search' },
        ],
      },
      {
        id: 'media-service', label: 'Media Service', type: 'SERVICE', x: 80, y: 320,
        description: 'Image and file management pipeline',
        children: [
          { id: 'ms-processor', label: 'Image Processor', type: 'SERVICE', description: 'Resize, compress, generate thumbnails, WebP' },
          { id: 'ms-cdn', label: 'CDN Upload', type: 'INTEGRATION', description: 'CloudFlare R2 / AWS S3 with signed URLs' },
          { id: 'ms-storage', label: 'Media Storage', type: 'DATABASE', description: 'File metadata, dimensions, MIME types' },
        ],
      },
      {
        id: 'admin-dashboard', label: 'Admin Dashboard', type: 'SCREEN', x: 480, y: 320,
        description: 'Content operations and moderation',
        children: [
          { id: 'ad-analytics', label: 'Content Analytics', type: 'COMPONENT', description: 'Views, read time, engagement metrics' },
          { id: 'ad-users', label: 'User Management', type: 'COMPONENT', description: 'Author roles, permissions, activity log' },
          { id: 'ad-comments', label: 'Comment Moderation', type: 'COMPONENT', description: 'Approve, reject, flag, bulk actions' },
        ],
      },
    ],
    edges: [
      { id: 'e1', source: 'blog-listing', target: 'content-service' },
      { id: 'e2', source: 'article-editor', target: 'content-service' },
      { id: 'e3', source: 'article-editor', target: 'media-service' },
      { id: 'e4', source: 'admin-dashboard', target: 'content-service' },
      { id: 'e5', source: 'content-service', target: 'media-service' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Real-time data visualization with ETL pipeline and alerting',
    category: 'dashboard',
    estimatedComplexity: 'high',
    estimatedTimeframe: '8-10 weeks',
    rootNodes: [
      {
        id: 'overview-dashboard', label: 'Overview Dashboard', type: 'SCREEN', x: 80, y: 60,
        description: 'Executive summary with key metrics',
        children: [
          { id: 'od-kpi-cards', label: 'KPI Cards', type: 'COMPONENT', description: 'Revenue, users, conversion rate, churn' },
          { id: 'od-trend-charts', label: 'Trend Charts', type: 'COMPONENT', description: 'Line/area charts with period comparison' },
          { id: 'od-alert-panel', label: 'Alert Panel', type: 'COMPONENT', description: 'Active alerts with severity and actions' },
          { id: 'od-date-picker', label: 'Date Range Picker', type: 'COMPONENT', description: 'Preset ranges and custom date selection' },
        ],
      },
      {
        id: 'report-builder', label: 'Report Builder', type: 'SCREEN', x: 480, y: 60,
        description: 'Custom report creation and export',
        children: [
          { id: 'rb-query', label: 'Query Builder', type: 'COMPONENT', description: 'Visual filter/group/aggregate builder' },
          { id: 'rb-charts', label: 'Chart Renderer', type: 'COMPONENT', description: 'Bar, line, pie, scatter, heatmap rendering' },
          { id: 'rb-export', label: 'Export Engine', type: 'SERVICE', description: 'PDF, Excel, CSV export generation' },
          { id: 'rb-scheduled', label: 'Scheduled Reports', type: 'SERVICE', description: 'Cron-based report generation and email delivery' },
        ],
      },
      {
        id: 'data-pipeline', label: 'Data Pipeline', type: 'SERVICE', x: 80, y: 320,
        description: 'Extract, transform, load data processing',
        children: [
          { id: 'dp-etl', label: 'ETL Processor', type: 'SERVICE', description: 'Batch and streaming data transformation jobs' },
          { id: 'dp-validator', label: 'Data Validator', type: 'COMPONENT', description: 'Schema validation, null checks, type coercion' },
          {
            id: 'dp-connectors', label: 'Source Connectors', type: 'INTEGRATION',
            description: 'Data source adapters',
            children: [
              { id: 'dp-db-conn', label: 'Database Connector', type: 'INTEGRATION', description: 'PostgreSQL, MySQL, MongoDB adapters' },
              { id: 'dp-api-conn', label: 'API Connector', type: 'INTEGRATION', description: 'REST/GraphQL polling with auth' },
              { id: 'dp-file-conn', label: 'File Connector', type: 'INTEGRATION', description: 'CSV, JSON, Parquet file ingestion' },
            ],
          },
          { id: 'dp-warehouse', label: 'Data Warehouse', type: 'DATABASE', description: 'Columnar storage for analytical queries' },
        ],
      },
      {
        id: 'analytics-engine', label: 'Analytics Engine', type: 'SERVICE', x: 380, y: 320,
        description: 'Metric computation and caching',
        children: [
          { id: 'an-aggregation', label: 'Aggregation Service', type: 'SERVICE', description: 'Pre-computed rollups: hourly, daily, weekly' },
          { id: 'an-cache', label: 'Cache Layer', type: 'SERVICE', description: 'Redis-backed query result cache with TTL' },
          { id: 'an-metrics-db', label: 'Metrics Database', type: 'DATABASE', description: 'TimescaleDB / InfluxDB for time-series data' },
        ],
      },
      {
        id: 'alert-system', label: 'Alert System', type: 'SERVICE', x: 680, y: 320,
        description: 'Threshold monitoring and notifications',
        children: [
          { id: 'al-monitor', label: 'Threshold Monitor', type: 'SERVICE', description: 'Rule engine with anomaly detection' },
          { id: 'al-dispatch', label: 'Notification Dispatcher', type: 'SERVICE', description: 'Email, Slack, PagerDuty alert routing' },
          { id: 'al-history', label: 'Alert History', type: 'DATABASE', description: 'Alert log with acknowledgment tracking' },
        ],
      },
    ],
    edges: [
      { id: 'e1', source: 'overview-dashboard', target: 'analytics-engine' },
      { id: 'e2', source: 'report-builder', target: 'analytics-engine' },
      { id: 'e3', source: 'data-pipeline', target: 'analytics-engine' },
      { id: 'e4', source: 'analytics-engine', target: 'alert-system' },
      { id: 'e5', source: 'overview-dashboard', target: 'alert-system' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAAS PLATFORM
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'saas-basic',
    name: 'SaaS Platform',
    description: 'Multi-tenant SaaS with subscription billing, team management, and notifications',
    category: 'saas',
    estimatedComplexity: 'high',
    estimatedTimeframe: '16-20 weeks',
    rootNodes: [
      {
        id: 'landing-page', label: 'Landing Page', type: 'SCREEN', x: 80, y: 60,
        description: 'Marketing site and signup funnel',
        children: [
          { id: 'lp-hero', label: 'Hero Section', type: 'COMPONENT', description: 'Value proposition with demo CTA' },
          { id: 'lp-pricing', label: 'Pricing Table', type: 'COMPONENT', description: 'Plan comparison with feature matrix' },
          { id: 'lp-features', label: 'Feature Showcase', type: 'COMPONENT', description: 'Animated feature highlights with screenshots' },
          { id: 'lp-signup', label: 'Signup CTA', type: 'COMPONENT', description: 'Email capture with plan pre-selection' },
        ],
      },
      {
        id: 'app-dashboard', label: 'App Dashboard', type: 'SCREEN', x: 480, y: 60,
        description: 'Main application workspace',
        children: [
          { id: 'da-activity', label: 'Activity Feed', type: 'COMPONENT', description: 'Team activity stream with real-time updates' },
          { id: 'da-quick-actions', label: 'Quick Actions', type: 'COMPONENT', description: 'Frequent tasks, shortcuts, recent items' },
          { id: 'da-stats', label: 'Stats Overview', type: 'COMPONENT', description: 'Usage metrics, storage, team size' },
        ],
      },
      {
        id: 'tenant-service', label: 'Tenant Service', type: 'SERVICE', x: 80, y: 320,
        description: 'Multi-tenant isolation and provisioning',
        children: [
          { id: 'ts-provision', label: 'Tenant Provisioning', type: 'SERVICE', description: 'Workspace creation, subdomain setup, defaults' },
          {
            id: 'ts-isolation', label: 'Data Isolation', type: 'SERVICE',
            description: 'Tenant data boundary enforcement',
            children: [
              { id: 'ts-rls', label: 'Row-Level Security', type: 'COMPONENT', description: 'PostgreSQL RLS policies per tenant' },
              { id: 'ts-schema-sep', label: 'Schema Separation', type: 'COMPONENT', description: 'Tenant-scoped schema or database strategy' },
            ],
          },
          { id: 'ts-db', label: 'Tenant Database', type: 'DATABASE', description: 'Tenants, memberships, settings, quotas' },
          { id: 'ts-config', label: 'Tenant Config Store', type: 'DATABASE', description: 'Feature flags, branding, custom fields' },
        ],
      },
      {
        id: 'billing-service', label: 'Billing Service', type: 'SERVICE', x: 380, y: 320,
        description: 'Subscription and payment management',
        children: [
          { id: 'bs-sub-mgr', label: 'Subscription Manager', type: 'SERVICE', description: 'Plan changes, trials, cancellation, reactivation' },
          { id: 'bs-invoices', label: 'Invoice Generator', type: 'SERVICE', description: 'Monthly invoices with line items and tax' },
          {
            id: 'bs-payment-gw', label: 'Payment Gateway', type: 'INTEGRATION',
            description: 'Payment processing integration',
            children: [
              { id: 'bs-stripe', label: 'Stripe Integration', type: 'INTEGRATION', description: 'Stripe Billing API with webhook handling' },
              { id: 'bs-metering', label: 'Usage Metering', type: 'SERVICE', description: 'Track API calls, storage, seats for billing' },
            ],
          },
          { id: 'bs-db', label: 'Billing Database', type: 'DATABASE', description: 'Subscriptions, invoices, payments, credits' },
        ],
      },
      {
        id: 'team-management', label: 'Team Management', type: 'SCREEN', x: 680, y: 60,
        description: 'Workspace member administration',
        children: [
          { id: 'tm-invite', label: 'Member Invite', type: 'COMPONENT', description: 'Email invite with role selection and link sharing' },
          { id: 'tm-roles', label: 'Role Assignment', type: 'COMPONENT', description: 'Owner, Admin, Member, Viewer role management' },
          { id: 'tm-access', label: 'Access Control', type: 'SERVICE', description: 'Permission checks, resource-level authorization' },
        ],
      },
      {
        id: 'notification-service', label: 'Notification Service', type: 'SERVICE', x: 680, y: 320,
        description: 'Multi-channel notification delivery',
        children: [
          { id: 'ns-email', label: 'Email Sender', type: 'SERVICE', description: 'Templated transactional emails via SendGrid/SES' },
          { id: 'ns-in-app', label: 'In-App Notifications', type: 'SERVICE', description: 'Real-time notification bell with WebSocket push' },
          { id: 'ns-webhooks', label: 'Webhook Dispatcher', type: 'SERVICE', description: 'Outbound webhooks with retry and signing' },
          { id: 'ns-email-provider', label: 'Email Provider', type: 'INTEGRATION', description: 'SendGrid / AWS SES API integration' },
        ],
      },
    ],
    edges: [
      { id: 'e1', source: 'landing-page', target: 'tenant-service' },
      { id: 'e2', source: 'app-dashboard', target: 'tenant-service' },
      { id: 'e3', source: 'team-management', target: 'tenant-service' },
      { id: 'e4', source: 'tenant-service', target: 'billing-service' },
      { id: 'e5', source: 'billing-service', target: 'notification-service' },
      { id: 'e6', source: 'team-management', target: 'notification-service' },
    ],
  },
];

export const TEMPLATE_CATEGORIES = {
  ecommerce: { name: 'E-commerce', icon: '🛒', color: '#10b981' },
  auth: { name: 'Authentication', icon: '🔐', color: '#3b82f6' },
  cms: { name: 'Content Management', icon: '📝', color: '#8b5cf6' },
  dashboard: { name: 'Analytics & Dashboards', icon: '📊', color: '#f59e0b' },
  social: { name: 'Social Media', icon: '👥', color: '#ec4899' },
  fintech: { name: 'Financial', icon: '💳', color: '#06b6d4' },
  saas: { name: 'SaaS Platform', icon: '🚀', color: '#ef4444' },
};
