import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import type { AdminRole } from "../auth/admin-role";
import type { Queryable } from "./queryable";

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pg: Pool;
  readonly clickhouse: ClickHouseClient;

  constructor() {
    this.pg = new Pool({
      connectionString:
        process.env.POSTGRES_URL ??
        "postgres://postgres:postgres@localhost:5432/ab_platform"
    });

    this.clickhouse = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER ?? "default",
      password: process.env.CLICKHOUSE_PASSWORD ?? ""
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pg.end();
    await this.clickhouse.close();
  }

  async withTransaction<T>(callback: (queryable: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pg.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async ensureSchema(): Promise<void> {
    await this.pg.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'owner',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY,
        app_id TEXT NOT NULL,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        feature_key TEXT NOT NULL,
        feature_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        segment_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL,
        traffic_percent INT NOT NULL,
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (app_id, key)
      );

      CREATE TABLE IF NOT EXISTS variants (
        id UUID PRIMARY KEY,
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        weight_percent INT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (experiment_id, key)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        member_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (group_id, member_key)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        actor_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
        actor_email TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        entity_label TEXT,
        before_state JSONB,
        after_state JSONB,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pg.query(`
      ALTER TABLE admins
      ALTER COLUMN password DROP NOT NULL;

      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS password_hash TEXT;

      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';

      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

      ALTER TABLE admins
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

      UPDATE admins
      SET role = 'owner'
      WHERE role IS NULL OR role = '';

      UPDATE admins
      SET is_active = TRUE
      WHERE is_active IS NULL;

      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS feature_key TEXT NOT NULL DEFAULT '';

      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS feature_enabled BOOLEAN NOT NULL DEFAULT TRUE;

      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS segment_rules JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    await this.pg.query(`
      UPDATE experiments
      SET segment_rules = jsonb_set(
        COALESCE(segment_rules, '{}'::jsonb),
        '{includeSubjectKeys}',
        segment_rules->'includeAnonymousIds',
        true
      )
      WHERE segment_rules ? 'includeAnonymousIds'
        AND NOT (segment_rules ? 'includeSubjectKeys');

      UPDATE experiments
      SET segment_rules = segment_rules - 'includeAnonymousIds'
      WHERE segment_rules ? 'includeAnonymousIds';
    `);

    await this.pg.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON audit_logs (created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email
      ON audit_logs (actor_email);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
      ON audit_logs (entity_type);

      CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs (action);
    `);

    await this.clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS events (
          event_id String,
          app_id String,
          subject_key String,
          experiment_key String,
          variant_key String,
          type String,
          ts DateTime64(3),
          meta String
        ) ENGINE = MergeTree
        ORDER BY (experiment_key, ts, event_id)
      `
    });

    await this.clickhouse.command({
      query: `
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS subject_key String
      `
    });

    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const email = process.env.ADMIN_EMAIL ?? "admin@local.test";
    const password = process.env.ADMIN_PASSWORD ?? "admin123";
    const role = this.parseSeedRole(process.env.ADMIN_ROLE);
    const passwordHash = await hash(password, 12);

    await this.pg.query(
      `
      INSERT INTO admins (id, email, password, password_hash, role, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, NULL, $2, $3, TRUE, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
      `,
      [email, passwordHash, role]
    );
  }

  private parseSeedRole(value: string | undefined): AdminRole {
    if (value === "owner" || value === "admin" || value === "editor" || value === "viewer") {
      return value;
    }
    return "owner";
  }
}
