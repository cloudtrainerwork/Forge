neo4j is setup locally with docker
Variable: NEO4J_AUTH
Value: neo4j/password
---
7474 (HTTP browser)
7687 (Bolt)
---
| Variable            | Value      |
| ------------------- | ---------- |
| `POSTGRES_USER`     | `postgres` |
| `POSTGRES_PASSWORD` | `password` |
| `POSTGRES_DB`       | `appdb`    |
-----
Building a SaaS application
1) The three common tenancy/storage patterns
A) Shared DB, shared tables (tenant_id column)
How it works
One database (or a few), same tables for everyone
Every row has tenant_id, and every query enforces it
Pros
Cheapest + simplest to operate early
Easy to onboard tenants
Great for “100 clients / 1000 users” stage
Cons
Harder to guarantee noisy-neighbor isolation
Big tenants can create hotspots
Schema changes affect everyone (but that’s also a pro)
Used when
Early + mid scale, or when you have strong logical isolation controls
B) Shared DB, separate schema per tenant
How it works
Same database engine/cluster
Each tenant gets its own schema (or database in same cluster)
Pros
Better isolation
Easier tenant-level backups/restore
Some per-tenant tuning is possible
Cons
Too many tenants becomes ops heavy (migrations, connections, tooling)
Still shares compute/storage underneath
Used when
You want more isolation without full “DB per tenant”