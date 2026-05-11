import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { hash } from "bcryptjs";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import type { AdminRole } from "../auth/admin-role";
import { AuditService } from "../audit/audit.service";
import { DbService } from "../db/db.service";
import type { Queryable } from "../db/queryable";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";

interface AdminRow {
  id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

interface AdminView {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AdminsService {
  constructor(
    private readonly db: DbService,
    private readonly auditService: AuditService
  ) {}

  async list(): Promise<{ admins: AdminView[] }> {
    const result = await this.db.pg.query<AdminRow>(
      `
      SELECT id, email, role, is_active, created_at, updated_at, last_login_at
      FROM admins
      ORDER BY created_at ASC
      `
    );

    return {
      admins: result.rows.map((row) => this.mapAdminRow(row))
    };
  }

  async create(dto: CreateAdminDto, actor: AuthenticatedAdmin): Promise<{ id: string }> {
    const passwordHash = await hash(dto.password, PASSWORD_SALT_ROUNDS);

    return this.db.withTransaction(async (queryable) => {
      let result;

      try {
        result = await queryable.query<{ id: string }>(
          `
          INSERT INTO admins (
            id,
            email,
            password_hash,
            password,
            role,
            is_active,
            created_at,
            updated_at
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            NULL,
            $3,
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING id
          `,
          [dto.email, passwordHash, dto.role]
        );
      } catch (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new ConflictException(`Admin "${dto.email}" already exists`);
        }
        throw error;
      }

      const created = await this.getAdminSnapshot(result.rows[0].id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "admin.created",
          entityType: "admin",
          entityId: created.id,
          entityLabel: created.email,
          afterState: created
        },
        queryable
      );

      return { id: created.id };
    });
  }

  async update(
    id: string,
    dto: UpdateAdminDto,
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    return this.db.withTransaction(async (queryable) => {
      const before = await this.getAdminSnapshot(id, queryable);

      if (actor.userId === id && dto.role && dto.role !== before.role) {
        throw new BadRequestException("You cannot change your own role");
      }

      if (dto.role && dto.role !== before.role && before.role === "owner") {
        await this.ensureOwnerReductionAllowed(id, queryable);
      }

      await queryable.query(
        `
        UPDATE admins
        SET role = COALESCE($1, role),
            updated_at = NOW()
        WHERE id = $2
        `,
        [dto.role ?? null, id]
      );

      const after = await this.getAdminSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "admin.role_changed",
          entityType: "admin",
          entityId: after.id,
          entityLabel: after.email,
          beforeState: before,
          afterState: after
        },
        queryable
      );

      return { id };
    });
  }

  async resetPassword(
    id: string,
    password: string,
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    const passwordHash = await hash(password, PASSWORD_SALT_ROUNDS);

    return this.db.withTransaction(async (queryable) => {
      const before = await this.getAdminSnapshot(id, queryable);

      await queryable.query(
        `
        UPDATE admins
        SET password_hash = $1,
            password = NULL,
            updated_at = NOW()
        WHERE id = $2
        `,
        [passwordHash, id]
      );

      const after = await this.getAdminSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "admin.password_reset",
          entityType: "admin",
          entityId: after.id,
          entityLabel: after.email,
          beforeState: before,
          afterState: after
        },
        queryable
      );

      return { id };
    });
  }

  async activate(id: string, actor: AuthenticatedAdmin): Promise<{ id: string }> {
    return this.setActiveState(id, true, actor);
  }

  async deactivate(id: string, actor: AuthenticatedAdmin): Promise<{ id: string }> {
    if (actor.userId === id) {
      throw new BadRequestException("You cannot deactivate your own account");
    }

    return this.setActiveState(id, false, actor);
  }

  private async setActiveState(
    id: string,
    isActive: boolean,
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    return this.db.withTransaction(async (queryable) => {
      const before = await this.getAdminSnapshot(id, queryable);

      if (!isActive && before.role === "owner") {
        await this.ensureOwnerReductionAllowed(id, queryable);
      }

      await queryable.query(
        `
        UPDATE admins
        SET is_active = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [isActive, id]
      );

      const after = await this.getAdminSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: isActive ? "admin.activated" : "admin.deactivated",
          entityType: "admin",
          entityId: after.id,
          entityLabel: after.email,
          beforeState: before,
          afterState: after
        },
        queryable
      );

      return { id };
    });
  }

  private async ensureOwnerReductionAllowed(
    adminId: string,
    queryable: Queryable
  ): Promise<void> {
    const target = await this.getAdminSnapshot(adminId, queryable);
    if (target.role !== "owner" || !target.isActive) {
      return;
    }

    const result = await queryable.query<{ count: string }>(
      `
      SELECT COUNT(*)::text AS count
      FROM admins
      WHERE role = 'owner'
        AND is_active = TRUE
      `
    );

    const ownerCount = Number(result.rows[0]?.count ?? 0);
    if (ownerCount <= 1) {
      throw new BadRequestException("At least one active owner must remain");
    }
  }

  private async getAdminSnapshot(id: string, queryable: Queryable): Promise<AdminView> {
    const result = await queryable.query<AdminRow>(
      `
      SELECT id, email, role, is_active, created_at, updated_at, last_login_at
      FROM admins
      WHERE id = $1
      `,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Admin not found");
    }

    return this.mapAdminRow(row);
  }

  private mapAdminRow(row: AdminRow): AdminView {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  }
}
