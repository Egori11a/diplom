import { Injectable } from "@nestjs/common";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { DbService } from "../db/db.service";
import type { Queryable } from "../db/queryable";

interface AuditLogInput {
  actor: AuthenticatedAdmin;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  meta?: Record<string, unknown>;
}

interface AuditLogRow {
  id: string;
  actor_admin_id: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

interface AuditLogView {
  id: string;
  actorAdminId?: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  async log(entry: AuditLogInput, queryable: Queryable = this.db.pg): Promise<void> {
    await queryable.query(
      `
      INSERT INTO audit_logs (
        id,
        actor_admin_id,
        actor_email,
        actor_role,
        action,
        entity_type,
        entity_id,
        entity_label,
        before_state,
        after_state,
        meta
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::jsonb,
        $9::jsonb,
        $10::jsonb
      )
      `,
      [
        entry.actor.userId,
        entry.actor.email,
        entry.actor.role,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.entityLabel ?? null,
        JSON.stringify(entry.beforeState ?? null),
        JSON.stringify(entry.afterState ?? null),
        JSON.stringify(entry.meta ?? {})
      ]
    );
  }

  async list(filters: {
    actorEmail?: string;
    action?: string;
    entityType?: string;
    limit?: number;
  }): Promise<{ logs: AuditLogView[] }> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters.actorEmail) {
      values.push(filters.actorEmail);
      where.push(`actor_email = $${values.length}`);
    }

    if (filters.action) {
      values.push(filters.action);
      where.push(`action = $${values.length}`);
    }

    if (filters.entityType) {
      values.push(filters.entityType);
      where.push(`entity_type = $${values.length}`);
    }

    const limit = filters.limit ?? 100;
    values.push(limit);

    const result = await this.db.pg.query<AuditLogRow>(
      `
      SELECT
        id,
        actor_admin_id,
        actor_email,
        actor_role,
        action,
        entity_type,
        entity_id,
        entity_label,
        before_state,
        after_state,
        meta,
        created_at
      FROM audit_logs
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC
      LIMIT $${values.length}
      `,
      values
    );

    return {
      logs: result.rows.map((row) => ({
        id: row.id,
        actorAdminId: row.actor_admin_id,
        actorEmail: row.actor_email,
        actorRole: row.actor_role,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityLabel: row.entity_label,
        beforeState: row.before_state,
        afterState: row.after_state,
        meta: row.meta ?? {},
        createdAt: row.created_at
      }))
    };
  }
}
