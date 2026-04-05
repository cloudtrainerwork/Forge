# FORGE — Project Conventions & Best Practices

## Architecture Overview

FORGE is a graph-native execution system with a hybrid Neo4j/PostgreSQL backend and ReactFlow frontend.

- **Backend**: Express.js REST API on port 3001, InversifyJS IoC container
- **Frontend**: Next.js 14 App Router on port 3000, ReactFlow canvas
- **Databases**: PostgreSQL (documents, audit trail), Neo4j (graph relationships)

## NO FAKES

This is a cardinal rule. Every feature must be backed by real data and real services. No fake data, no mock endpoints, no in-memory fallbacks that silently lose data, no hardcoded seed values masquerading as real state. If a backend service isn't ready, the frontend should show an honest empty state or error — never synthetic placeholder data. Template readiness starts at zero. Dev auth hits the real backend. Repositories talk to real databases or fail loudly. If it looks like real data but isn't persisted, it's a bug.

## Service Layer Best Practices

These conventions apply to both the TypeScript backend and the frontend service layer.

### 1. Keep services focused on use cases

Service functions should orchestrate business actions like `createWorkItem`, `updateReadiness`, or `exportToGSD`. They should NOT contain HTTP concerns, ORM model wiring, or raw SQL details. Controllers/route handlers stay thin — the core logic lives in the service layer so it can be tested and reused independently.

### 2. Use typed request/response contracts at the boundary

Use TypeScript interfaces and Zod schemas broadly. For external input/output, validate at the API boundary (route handlers) before passing data to services. Services should receive and return typed DTOs, not raw `any` objects.

### 3. Do not let ORM/Prisma objects leak into the service API

Pass DTOs, commands, or domain objects into the service layer rather than exposing Prisma models everywhere. This avoids tight coupling between business logic and persistence details.

### 4. One request = one transaction scope

Prisma transactions and Neo4j sessions should be scoped to a single request. Do not share database sessions across requests or async tasks. Use `prisma.$transaction()` for multi-step writes.

### 5. Inject dependencies via the IoC container

Services receive repositories, gateways, and other services through InversifyJS constructor injection. Do NOT import global database instances directly in service files — always go through the ServiceFactory container.

Backend example:
```typescript
@injectable()
export class WorkItemService {
  constructor(
    @inject('IWorkItemRepository') private repo: IWorkItemRepository,
    @inject('IGraphRepository') private graph: IGraphRepository,
    @inject('AuditTrailService') private audit: AuditTrailService,
  ) {}
}
```

### 6. Repository + adapter pattern for persistence

Repositories hide persistence details behind interfaces (`IWorkItemRepository`, `IGraphRepository`). Services depend on the interface, not the implementation. This keeps service methods readable:
1. Validate input
2. Load entities
3. Apply business rules
4. Persist
5. Emit domain events

### 7. Layered validation

Use three layers:
- **Boundary validation** — shape/type/format (Zod schemas in route handlers)
- **Domain validation** — business rules (service layer)
- **Database constraints** — integrity (Prisma schema, Neo4j constraints)

Do not rely on only one layer. Zod is great for boundary validation, but business invariants still belong in service logic.

### 8. Make side effects explicit

Sending email, publishing events, calling external APIs, or logging audit trails should happen through dedicated adapters/services. Side effects are explicit in the service orchestration, not hidden inside repositories or entities.

### 9. Frontend service layer structure

The frontend uses a parallel service architecture:

```
frontend/src/services/
  ApiClient.ts            — HTTP client (timeout, retry, dedup, typed errors)
  WorkItemService.ts      — Work item CRUD (backend REST)
  DependencyService.ts    — Graph edge CRUD (backend REST)
  SpecificationService.ts — Spec read/write (localStorage + backend)
  ProjectService.ts       — Project persistence (localStorage)
  index.ts                — Barrel exports
```

All HTTP calls go through `ApiClient`. Components never use `fetch()` directly. React hooks (`useSpecification`) wrap services to provide reactive state.

### 10. Test mostly against the service layer

Write unit tests for service logic with fake/mock repositories. Integration tests exercise the full stack. Component tests should mock the service layer.

## Anti-patterns to Avoid

- Fat route handlers that contain business logic
- Service methods returning raw Prisma/ORM entities
- Sharing database sessions globally
- Hidden commits/side-effects inside repository methods
- Raw `fetch()` calls scattered across React components
- Using Prisma models as your entire domain model
- Mixing localStorage and backend concerns in component code

## Folder Structure

```
src/
  api/routes/           — Express route handlers (thin)
  auth/                 — JWT service, auth types
  middleware/            — Auth middleware chain, validation
  services/             — Business logic layer (AuthService, ProjectService, PermissionService)
  domain/               — Domain types, value objects, and role definitions
  adapters/             — Repository/service interfaces (IAuthRepository, IProjectRepository)
  infrastructure/
    postgresql/         — Prisma-based repository implementations (AuthRepository, ProjectRepository)
    neo4j/              — Neo4j-based repository implementations
  factories/            — IoC container configuration
  config/               — Environment config (incl. auth vars)

frontend/src/
  auth/                 — AuthContext, AuthProvider
  services/             — API client + domain services
  hooks/                — React hooks wrapping services
  components/           — UI components (incl. auth/)
  app/auth/             — Sign-in, tenant selection, tenant creation pages
  app/t/[slug]/         — Tenant-scoped app routes
  app/t/[slug]/projects — Project browser + project canvas
  app/t/[slug]/admin    — Admin suite (members, projects, roles, audit, settings)
  stores/               — Zustand state management
  utils/                — Legacy API utils (being migrated to services/)
  data/                 — Static data (templates, etc.)
```

## Database Configuration

| Variable            | Value      |
| ------------------- | ---------- |
| `NEO4J_AUTH`        | `neo4j/password` |
| Neo4j HTTP          | port 7474  |
| Neo4j Bolt          | port 7687  |
| `POSTGRES_USER`     | `postgres` |
| `POSTGRES_PASSWORD` | `password` |
| `POSTGRES_DB`       | `appdb`    |

## Multi-Tenant SaaS Architecture

FORGE is designed as a true multi-tenant SaaS platform. Every tenant-owned row carries a `tenant_id` and PostgreSQL Row-Level Security (RLS) enforces isolation at the database level.

### Authentication — External IdP Only

FORGE does not store passwords. All authentication is delegated to external identity providers: Google OIDC, Microsoft Entra ID (Azure AD), and GitHub OAuth. The backend issues a FORGE JWT after OAuth callback, which carries `sub` (user ID), `tid` (tenant ID), and `role`. The JWT is signed with HS256 using Node's built-in `crypto` module.

### Tenant Model

Three core tables: `tenants` (id, slug, name, status, plan_tier), `users` (id, email, name, image), and `tenant_memberships` (tenant_id, user_id, role, status). Membership roles are OWNER, ADMIN, MEMBER, VIEWER with a defined hierarchy.

### Tenant Context Flow (Defense in Depth)

1. **URL selects context**: Path-based routing `/t/{slug}/*` identifies the tenant
2. **JWT carries tenant**: Token contains `tid` (tenant ID) and `role`
3. **Middleware verifies**: `authMiddleware.ts` validates JWT, checks membership, confirms URL slug matches JWT tenant
4. **RLS enforces isolation**: `SET LOCAL app.current_tenant_id` is set per-request; PostgreSQL policies filter all queries

### Database Roles

- `forge_admin` — BYPASSRLS, owns tables, runs migrations. Used by Prisma for schema changes.
- `forge_app` — NOBYPASSRLS, minimal CRUD grants, subject to RLS. Used at runtime.

### Row-Level Security Policies

RLS is enabled on: `work_items`, `readiness_configurations`, `audit_logs`, `tenant_memberships`. Each table has a policy: `tenant_id = current_setting('app.current_tenant_id', true)`. The auth tables (`tenants`, `users`, `accounts`, `sessions`) are NOT subject to RLS since they're accessed before tenant context is established.

### Adding a New Identity Provider

1. Add provider credentials to `src/config/environment.ts` and `.env`
2. Add the OAuth redirect URL builder in `frontend/src/app/auth/signin/page.tsx`
3. The backend callback route (`POST /api/v1/auth/callback`) is provider-agnostic — it accepts any `provider` string and stores it in the `accounts` table

### Tenant-Aware Service Pattern

Services are singletons in the IoC container. Tenant context flows through method parameters (not constructor injection). For reads, RLS filters automatically. For writes, `tenantId` is included explicitly in INSERT data via the entity or method parameter.

```typescript
// Route handler extracts tenantId from authenticated request
const tenantId = (req as AuthenticatedRequest).tenant.tenantId;
await workItemService.createWorkItem(tenantId, id, title, spec);
```

### Frontend Auth Architecture

The frontend uses a custom AuthContext (not next-auth) that manages JWT tokens in localStorage. The `ApiClient` automatically: injects `Authorization: Bearer <jwt>` headers, resolves tenant-scoped API paths (`/t/{slug}/...`), and redirects to `/auth/signin` on 401 responses.

### Folder Structure (Auth)

```
src/
  auth/
    types.ts              — AuthUser, TenantContext, ForgeJwtPayload, error classes
    JwtService.ts         — JWT sign/verify using Node crypto (HS256)
  middleware/
    authMiddleware.ts     — extractToken, requireAuth, requireTenant, authErrorHandler
  services/
    AuthService.ts        — signIn, createTenant, verifyMembership, switchTenant
  adapters/
    IAuthRepository.ts    — auth repository interface
  infrastructure/
    postgresql/
      AuthRepository.ts   — Prisma implementation of IAuthRepository

frontend/src/
  auth/
    AuthContext.tsx        — React context + provider for auth state
  app/
    auth/signin/          — OAuth provider selection
    auth/select-tenant/   — Tenant picker (multi-tenant users)
    auth/create-tenant/   — New workspace creation
    t/[slug]/             — Tenant-scoped app routes
  components/auth/
    UserMenu.tsx          — User avatar, tenant switcher, sign-out
```

### Environment Variables (Auth)

| Variable                         | Required | Description                    |
| -------------------------------- | -------- | ------------------------------ |
| `JWT_SECRET`                     | Yes      | Min 32 chars, HS256 signing    |
| `JWT_EXPIRY_SECONDS`             | No       | Default 86400 (24h)            |
| `GOOGLE_CLIENT_ID`               | No       | Google OAuth client ID         |
| `GOOGLE_CLIENT_SECRET`           | No       | Google OAuth client secret     |
| `AZURE_AD_CLIENT_ID`             | No       | Entra ID client ID             |
| `AZURE_AD_CLIENT_SECRET`         | No       | Entra ID client secret         |
| `AZURE_AD_TENANT_ID`             | No       | Entra ID tenant (or 'common')  |
| `GITHUB_CLIENT_ID`               | No       | GitHub OAuth app client ID     |
| `GITHUB_CLIENT_SECRET`           | No       | GitHub OAuth app client secret |

## Project Model & Role System

### Projects (Tenant-Scoped)

Projects are the primary organizational unit within a tenant. Each project has a name, optional description, status (active/archived), and is scoped to a single tenant. The `projects` table has RLS enabled with the same tenant isolation pattern as other scoped tables.

Work items can optionally belong to a project via the nullable `project_id` column. Existing work items without a project remain accessible for backward compatibility.

### Two-Level Role System

FORGE uses tenant-level roles for workspace-wide access and project-level roles for fine-grained per-project control.

**Tenant roles** (OWNER, ADMIN, MEMBER, VIEWER): Defined in `src/auth/types.ts`. Control workspace-wide access including admin settings, member management, and billing.

**Project roles** (PM, PJM, BA, EA, SA, DEV, QA, MEMBER, VIEWER): Defined in `src/domain/roles.ts`. Control per-project permissions. Each role has a hierarchy level, display metadata (title, description, color), and permission semantics.

**Role resolution** (implemented in `PermissionService`):
1. Tenant OWNER/ADMIN → automatic PM-level access on ALL projects
2. Explicit project membership role → used when assigned
3. No project membership → no project access

### Project API Endpoints

All endpoints are tenant-scoped (prefixed with `/api/v1/t/{slug}/`):

- `GET /projects` — list projects (optional `?status=active|archived`)
- `POST /projects` — create project (auto-adds creator as PM)
- `GET /projects/:id` — get project details
- `PUT /projects/:id` — update name/description
- `DELETE /projects/:id` — archive project
- `POST /projects/:id/restore` — restore archived project
- `GET /projects/:id/members` — list project members
- `POST /projects/:id/members` — add member with role
- `PUT /projects/:id/members/:userId` — update member role
- `DELETE /projects/:id/members/:userId` — remove member

### Admin API Endpoints

Admin endpoints require OWNER or ADMIN tenant role:

- `GET /admin/members` — list tenant members
- `POST /admin/members/invite` — invite user by email
- `PUT /admin/members/:userId/role` — change tenant role
- `DELETE /admin/members/:userId` — remove from tenant
- `GET /admin/audit-logs` — paginated audit log
- `GET /admin/settings` — tenant settings
- `PUT /admin/settings` — update tenant settings

### Frontend Navigation

After login, users land on the **project browser** (`/t/{slug}/projects`) — a file-explorer-style grid of project cards. Clicking a project opens the ReactFlow canvas (`/t/{slug}/projects/{id}`). The user menu includes an "Admin" link (visible to OWNER/ADMIN) leading to the admin suite at `/t/{slug}/admin/*`.
