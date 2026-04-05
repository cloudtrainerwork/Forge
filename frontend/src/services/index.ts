'use client';

/**
 * FORGE Frontend Service Layer
 *
 * Barrel export for all services. Import from here:
 *
 *   import { WorkItemService, SpecificationService } from '@/services';
 *
 * Each service encapsulates a single domain concern:
 *
 *   ApiClient            — HTTP client (timeout, retry, dedup, error types)
 *   WorkItemService      — Work item CRUD (backend)
 *   DependencyService    — Graph edge CRUD (backend)
 *   SpecificationService — Spec read/write (localStorage + backend)
 *   ProjectService       — Project management (backend API)
 */

export * as ApiClient from './ApiClient';
export * as WorkItemService from './WorkItemService';
export * as DependencyService from './DependencyService';
export * as SpecificationService from './SpecificationService';
export * as ProjectService from './ProjectService';

// Re-export commonly used types
export type { ApiError, NetworkError, NotFoundError, ValidationError, ServerError, UnauthorizedError } from './ApiClient';
export type { WorkItemDTO, ReadinessState } from './WorkItemService';
export type { DependencyDTO } from './DependencyService';
export type { SpecData, SpecSection, SectionName, NodeReadiness } from './SpecificationService';
export type { Project, ProjectMember } from './ProjectService';
