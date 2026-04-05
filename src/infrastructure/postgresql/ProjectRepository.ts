import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'inversify';
import type {
  IProjectRepository,
  ProjectRecord,
  ProjectWithMemberCount,
  ProjectMembershipRecord,
  ProjectMemberDetail,
} from '../../adapters/IProjectRepository.js';
import type { ProjectRole } from '../../domain/roles.js';

/**
 * ProjectRepository — Prisma-based implementation.
 *
 * NO IN-MEMORY FALLBACK. If prisma.project is missing, the app must fail
 * with a clear error directing the developer to run migrations.
 * Data loss from silent in-memory mode is unacceptable.
 */
@injectable()
export class ProjectRepository implements IProjectRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    if (!(prisma as any).project) {
      throw new Error(
        '[ProjectRepository] prisma.project not found. ' +
        'Run `npx prisma generate && npx prisma migrate dev` before starting the server.'
      );
    }
  }

  // ── Project CRUD ──────────────────────────────────────────────────────────

  async findById(id: string): Promise<ProjectRecord | null> {
    const row = await (this.prisma as any).project.findUnique({ where: { id } });
    return row ? this.toRecord(row) : null;
  }

  async listByTenant(tenantId: string, status?: string): Promise<ProjectWithMemberCount[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    const rows = await (this.prisma as any).project.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r: any) => ({
      ...this.toRecord(r),
      memberCount: r._count.members,
    }));
  }

  async create(data: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    createdById: string;
  }): Promise<ProjectRecord> {
    const row = await (this.prisma as any).project.create({ data });
    return this.toRecord(row);
  }

  async update(id: string, data: { name?: string; description?: string; status?: string }): Promise<ProjectRecord> {
    const row = await (this.prisma as any).project.update({ where: { id }, data });
    return this.toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).project.delete({ where: { id } });
  }

  // ── Membership ────────────────────────────────────────────────────────────

  async findMembership(projectId: string, userId: string): Promise<ProjectMembershipRecord | null> {
    const row = await (this.prisma as any).projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return row ? this.toMembershipRecord(row) : null;
  }

  async listMembers(projectId: string): Promise<ProjectMemberDetail[]> {
    const rows = await (this.prisma as any).projectMembership.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((r: any) => ({
      ...this.toMembershipRecord(r),
      userName: r.user.name,
      userEmail: r.user.email,
      userImage: r.user.image,
    }));
  }

  async addMember(data: {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
  }): Promise<ProjectMembershipRecord> {
    const row = await (this.prisma as any).projectMembership.create({ data });
    return this.toMembershipRecord(row);
  }

  async updateMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMembershipRecord> {
    const row = await (this.prisma as any).projectMembership.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
    });
    return this.toMembershipRecord(row);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await (this.prisma as any).projectMembership.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async listUserProjects(userId: string, tenantId: string): Promise<Array<ProjectRecord & { role: ProjectRole }>> {
    const memberships = await (this.prisma as any).projectMembership.findMany({
      where: { userId, project: { tenantId } },
      include: { project: true },
      orderBy: { project: { createdAt: 'desc' } },
    });

    return memberships.map((m: any) => ({
      ...this.toRecord(m.project),
      role: m.role as ProjectRole,
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toRecord(row: any): ProjectRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      status: row.status,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toMembershipRecord(row: any): ProjectMembershipRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      role: row.role as ProjectRole,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
