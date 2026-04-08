import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, validateOrReject } from 'class-validator';
import { Expose, Transform } from 'class-transformer';

export enum ReleaseStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

/**
 * Release entity — a versioned deliverable within a project.
 * Releases group work items for scope management and executive reporting.
 */
export class Release {
  @IsString()
  @IsNotEmpty()
  @Expose()
  id: string;

  @IsString()
  @Expose()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  version: string;

  @IsString()
  @IsNotEmpty()
  @Expose()
  name: string;

  @IsOptional()
  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : value ? new Date(value) : null)
  targetDate: Date | null;

  @IsEnum(ReleaseStatus)
  @Expose()
  status: ReleaseStatus;

  @IsBoolean()
  @Expose()
  isFuture: boolean;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value instanceof Date ? value : new Date(value))
  updatedAt: Date;

  constructor(
    id: string,
    tenantId: string,
    projectId: string,
    version: string,
    name: string,
    targetDate?: Date | null,
    status?: ReleaseStatus,
    isFuture?: boolean,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.tenantId = tenantId;
    this.projectId = projectId;
    this.version = version;
    this.name = name;
    this.targetDate = targetDate ?? null;
    this.status = status ?? ReleaseStatus.PLANNING;
    this.isFuture = isFuture ?? false;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
  }

  async validate(): Promise<void> {
    await validateOrReject(this);
  }

  isEditable(): boolean {
    return this.status === ReleaseStatus.PLANNING || this.status === ReleaseStatus.IN_PROGRESS;
  }

  canAssignWorkItems(): boolean {
    return this.status !== ReleaseStatus.RELEASED && this.status !== ReleaseStatus.CANCELLED;
  }

  updateStatus(status: ReleaseStatus): Release {
    return new Release(
      this.id, this.tenantId, this.projectId, this.version, this.name,
      this.targetDate, status, this.isFuture, this.createdAt, new Date(),
    );
  }

  updateInfo(name?: string, version?: string, targetDate?: Date | null): Release {
    return new Release(
      this.id, this.tenantId, this.projectId,
      version ?? this.version, name ?? this.name,
      targetDate !== undefined ? targetDate : this.targetDate,
      this.status, this.isFuture, this.createdAt, new Date(),
    );
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      projectId: this.projectId,
      version: this.version,
      name: this.name,
      targetDate: this.targetDate?.toISOString() ?? null,
      status: this.status,
      isFuture: this.isFuture,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  static fromJSON(data: any): Release {
    return new Release(
      data.id,
      data.tenantId,
      data.projectId,
      data.version,
      data.name,
      data.targetDate ? new Date(data.targetDate) : null,
      data.status as ReleaseStatus,
      data.isFuture ?? false,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
    );
  }

  static async validateBusinessRules(release: Release): Promise<string[]> {
    const errors: string[] = [];
    if (!release.name?.trim()) errors.push('Release name is required');
    if (!release.version?.trim()) errors.push('Release version is required');
    if (release.isFuture && release.status !== ReleaseStatus.PLANNING) {
      errors.push('Future release must stay in PLANNING status');
    }
    return errors;
  }
}
